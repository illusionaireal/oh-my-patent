#!/usr/bin/env node
/**
 * oh-my-patent CLI - Runtime bridge for brainstorm path and diagram operations
 *
 * This is the executable entry point that agents invoke via shell commands.
 * It wraps the TypeScript APIs so agents don't need to do file I/O manually.
 *
 * Usage:
 *   node dist/cli.js <domain> <subcommand> [options]
 *
 * Domains:
 *   path     - Brainstorm path operations
 *   diagram  - Patent diagram operations (render, status, rerender)
 *   adapt    - Generate tool-specific config (Claude Code, Codex, etc.)
 *   tui      - Interactive terminal UI for brainstorm paths
 *
 * Path subcommands:
 *   init <project-path>                                    Initialize .brainstorm directory
 *   record <project-path> --round <N> --data <json|@file>  Record a brainstorm round
 *   overview <project-path>                                Show path overview
 *   node <project-path> <node-id>                          Show node detail
 *   innovation <project-path> <innovation-id>              Show innovation history
 *   branch <project-path> --from-node <id> --reason <text> Create a branch
 *   branches <project-path>                                List all branches
 *   restore <project-path> --node <id> --innovation <id>   Restore abandoned innovation
 *   threshold <project-path> --round <N>                   Evaluate threshold for a round
 *   visualize <project-path> [--mode <mode>] [--target <id>] Render visualization
 *   markdown <project-path> [--mode <mode>] [--target <id>]  Render as Markdown
 */

import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { readFileSync, copyFileSync, readdirSync } from 'fs';
import {
  initBrainstormDirectory,
  savePath,
  saveNode,
  loadPath,
  loadNode,
  loadAllNodes,
  saveInnovationSnapshot,
} from './core/path-persistence.js';
import {
  createInitialPath,
  createInitialNode,
  BrainstormPath,
  BrainstormNode,
  InnovationSnapshot,
  InnovationScore,
  isValidBrainstormPath,
  isValidBrainstormNode,
} from './core/brainstorm-path.js';
import { render, RenderMode, RenderOptions } from './commands/render.js';
import {
  renderPathOverview,
  renderNodeDetail,
  renderInnovationHistory,
  renderBranchOverview,
} from './commands/path-visualization.js';
import { getPathOverview, getNodeDetail, getInnovationHistory, listAllInnovations } from './commands/path-query.js';
import { createBranchFromNode, listBranches, getBranchDetail } from './commands/path-branch.js';
import { restoreInnovation } from './commands/path-restore.js';
import {
  evaluateThreshold,
  evaluateAllThresholds,
  generateImprovementSuggestions,
  getTopScoredInnovation,
  DEFAULT_THRESHOLD_CONFIG,
  ThresholdConfig,
} from './core/threshold-config.js';
import { loadPortableDef } from './adapters/loader.js';
import { ClaudeCodeAdapter } from './adapters/claude/index.js';
import { CodexAdapter } from './adapters/codex/index.js';
import { OpenCodeAdapter } from './adapters/opencode/index.js';
import { ToolAdapter, GenerateResult } from './adapters/types.js';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { FigureSpec } from './core/diagram-types.js';
import { DiagramRenderer } from './core/diagram-renderer.js';
import { insertFigureReferences } from './core/diagram-inserter.js';
import { runFullCheck, formatReport, runJsonCheck, getMcpStatuses, buildMcpConfig, writeMcpConfig } from './core/init-checker.js';

// ============================================================================
// Package directory detection (works in global npm installs, dev, and linked modes)
// ============================================================================

function getPluginDir(): string {
  // In ESM, resolve from the current module URL to find the package root (contains plugin.jsonc)
  // This works when the package is:
  // - Globally installed (npm i -g)              → cli.js is a real file in the npm package
  // - Linked (npm link)                         → cli.js is a symlink; realpath resolves it
  // - Run from source (node dist/cli.js)        → cwd is the package root
  // - Published npm tarball                     → cwd is the package root because npm extracts it
  const fromEsm = fileURLToPath(new URL('.', import.meta.url));
  return dirname(fromEsm);
}

function getDefaultWorkspaceDir(): string {
  // When the CLI is run manually (e.g. `oh-my-patent adapt install`), use the user's cwd.
  // We no longer rely on INIT_CWD from postinstall, as the package no longer uses
  // auto-install hooks. This keeps the behavior predictable and explicit.
  return process.cwd();
}

// ============================================================================
// Argument parsing
// ============================================================================

function parseArgs(argv: string[]): Record<string, string> {
  const opts: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        opts[key] = argv[++i];
      } else {
        opts[key] = 'true';
      }
    }
  }
  return opts;
}

function parseJsonInput(input: string): unknown {
  // Support @file syntax for reading JSON from a file
  if (input.startsWith('@')) {
    const filePath = input.slice(1);
    const content = readFileSync(resolve(filePath), 'utf-8');
    return JSON.parse(content);
  }
  return JSON.parse(input);
}

function exitWithError(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

// ============================================================================
// Path subcommands
// ============================================================================

async function pathInit(projectPath: string): Promise<void> {
  await initBrainstormDirectory(projectPath);

  // Check if path.json already exists
  const existing = await loadPath(projectPath);
  if (existing) {
    console.log(JSON.stringify({ ok: true, message: 'Path already initialized', pathId: existing.id }));
    return;
  }

  // Create initial empty path
  const newPath = createInitialPath('', '');
  await savePath(newPath, projectPath);
  console.log(JSON.stringify({ ok: true, pathId: newPath.id, message: 'Initialized brainstorm path' }));
}

async function pathRecord(projectPath: string, opts: Record<string, string>): Promise<void> {
  const round = parseInt(opts.round || '0', 10);
  if (round < 1) exitWithError('--round is required and must be >= 1');

  if (!opts.data) exitWithError('--data is required (JSON string or @file)');

  const data = parseJsonInput(opts.data) as {
    projectId?: string;
    topic?: string;
    agentOutputs?: BrainstormNode['agentOutputs'];
    innovations?: InnovationSnapshot[];
    scores?: InnovationScore[];
    decision?: BrainstormNode['decision'];
  };

  // Load or create path
  let pathData = await loadPath(projectPath);
  if (!pathData) {
    pathData = createInitialPath(
      data.projectId || '',
      data.topic || ''
    );
  }

  // Update metadata if provided
  if (data.projectId && !pathData.projectId) pathData.projectId = data.projectId;
  if (data.topic && !pathData.topic) pathData.topic = data.topic;

  // Create node
  const node = createInitialNode(round);
  if (data.agentOutputs) node.agentOutputs = data.agentOutputs;
  if (data.innovations) node.innovations = data.innovations;
  if (data.scores) node.scores = data.scores;
  if (data.decision) node.decision = data.decision;

  // Save node
  await saveNode(node, projectPath);

  // Save innovation snapshot
  if (data.innovations) {
    await saveInnovationSnapshot(data.innovations, projectPath, round);
  }

  // Update path
  if (!pathData.nodes.includes(node.id)) {
    pathData.nodes.push(node.id);
  }

  // Create edge from previous node
  const prevRound = round - 1;
  if (prevRound >= 1) {
    const prevNodeId = `round-${prevRound}`;
    const alreadyHasEdge = pathData.edges.some(e => e.fromNodeId === prevNodeId && e.toNodeId === node.id);
    if (!alreadyHasEdge) {
      pathData.edges.push({
        id: `edge-${prevNodeId}-to-${node.id}`,
        fromNodeId: prevNodeId,
        toNodeId: node.id,
        transformation: {
          type: 'refine',
          description: `Round ${prevRound} → Round ${round}`,
          changes: [],
        },
      });
    }
  }

  pathData.currentNodeId = node.id;

  // Check for final decision
  if (data.decision && (data.decision.action === 'PASS_TO_DRAFT' || data.decision.action === 'FORCE_PASS')) {
    pathData.status = 'completed';
    const topScored = data.scores && data.scores.length > 0 ? getTopScoredInnovation(data.scores) : null;
    pathData.finalDecision = {
      action: data.decision.action,
      selectedInnovation: topScored?.innovationId || '',
      timestamp: new Date().toISOString(),
    };
  }

  await savePath(pathData, projectPath);

  console.log(JSON.stringify({
    ok: true,
    nodeId: node.id,
    pathId: pathData.id,
    totalNodes: pathData.nodes.length,
    status: pathData.status,
  }));
}

async function pathOverview(projectPath: string): Promise<void> {
  const overview = await getPathOverview(projectPath);
  if (!overview) {
    console.log(JSON.stringify({ ok: false, error: 'No path data found' }));
    return;
  }
  console.log(JSON.stringify({ ok: true, ...overview }));
}

async function pathNode(projectPath: string, nodeId: string): Promise<void> {
  const detail = await getNodeDetail(projectPath, nodeId);
  if (!detail) {
    console.log(JSON.stringify({ ok: false, error: `Node ${nodeId} not found` }));
    return;
  }
  console.log(JSON.stringify({ ok: true, ...detail }));
}

async function pathInnovation(projectPath: string, innovationId: string): Promise<void> {
  const history = await getInnovationHistory(projectPath, innovationId);
  if (!history) {
    console.log(JSON.stringify({ ok: false, error: `Innovation ${innovationId} not found` }));
    return;
  }
  console.log(JSON.stringify({ ok: true, ...history }));
}

async function pathBranch(projectPath: string, opts: Record<string, string>): Promise<void> {
  if (!opts['from-node']) exitWithError('--from-node is required');
  if (!opts.reason) exitWithError('--reason is required');

  const result = await createBranchFromNode(projectPath, opts['from-node'], opts.reason);
  console.log(JSON.stringify({ ok: true, ...result }));
}

async function pathBranches(projectPath: string): Promise<void> {
  const branches = await listBranches(projectPath);
  console.log(JSON.stringify({ ok: true, branches }));
}

async function pathRestore(projectPath: string, opts: Record<string, string>): Promise<void> {
  if (!opts.node) exitWithError('--node is required');
  if (!opts.innovation) exitWithError('--innovation is required');

  const result = await restoreInnovation(projectPath, opts.node, opts.innovation);
  console.log(JSON.stringify({ ok: true, ...result }));
}

async function pathThreshold(projectPath: string, opts: Record<string, string>): Promise<void> {
  const round = parseInt(opts.round || '0', 10);
  if (round < 1) exitWithError('--round is required and must be >= 1');

  const node = await loadNode(projectPath, `round-${round}`);
  if (!node) exitWithError(`Round ${round} not found`);

  if (node.scores.length === 0) exitWithError(`No scores in round ${round}`);

  const results = evaluateAllThresholds(node.scores, DEFAULT_THRESHOLD_CONFIG, round);
  const output: Record<string, unknown> = {};

  for (const [innovationId, decision] of results) {
    const score = node.scores.find(s => s.innovationId === innovationId);
    const suggestions = score ? generateImprovementSuggestions(score, DEFAULT_THRESHOLD_CONFIG, decision) : [];
    output[innovationId] = { ...decision, suggestions };
  }

  const topScored = getTopScoredInnovation(node.scores);
  console.log(JSON.stringify({
    ok: true,
    round,
    topInnovation: topScored?.innovationId || null,
    decisions: output,
  }));
}

async function pathVisualize(projectPath: string, opts: Record<string, string>): Promise<void> {
  const mode = (opts.mode || 'overview') as RenderMode;
  const targetId = opts.target;
  const outputFile = opts.output;

  const renderOpts: RenderOptions = {
    projectPath,
    mode,
    targetId,
    outputFile,
  };

  const output = await render(renderOpts);
  if (!outputFile) {
    console.log(output);
  }
}

async function pathMarkdown(projectPath: string, opts: Record<string, string>): Promise<void> {
  const mode = opts.mode || 'overview';
  const targetId = opts.target;
  let output: string;

  switch (mode) {
    case 'overview':
      output = await renderPathOverview(projectPath);
      break;
    case 'node':
      if (!targetId) exitWithError('--target is required for node mode');
      output = await renderNodeDetail(projectPath, targetId);
      break;
    case 'innovation':
      if (!targetId) exitWithError('--target is required for innovation mode');
      output = await renderInnovationHistory(projectPath, targetId);
      break;
    case 'branch':
      if (!targetId) exitWithError('--target is required for branch mode');
      output = await renderBranchOverview(projectPath, targetId);
      break;
    default:
      exitWithError(`Unknown markdown mode: ${mode}. Use overview|node|innovation|branch`);
  }

  if (opts.output) {
    const { writeFileSync } = await import('fs');
    writeFileSync(resolve(opts.output), output, 'utf-8');
    console.log(JSON.stringify({ ok: true, file: opts.output }));
  } else {
    console.log(output);
  }
}

// ============================================================================
// Adapt subcommands
// ============================================================================

const adapters: ToolAdapter[] = [
  new ClaudeCodeAdapter(),
  new CodexAdapter(),
  new OpenCodeAdapter(),
];
const adapterMap = new Map<string, ToolAdapter>(adapters.map(a => [a.name, a]));

async function adaptGenerate(pluginDir: string, opts: Record<string, string>): Promise<void> {
  const toolName = opts.tool || '';
  const outputDir = opts.output || '';
  const workspaceDir = opts['workspace-dir'] || resolve(pluginDir, '..');

  // If no tool specified, generate for all adapters
  const targets = toolName ? [toolName] : Array.from(adapterMap.keys());

  for (const name of targets) {
    const adapter = adapterMap.get(name);
    if (!adapter) {
      exitWithError(`Unknown adapter: ${name}. Available: ${Array.from(adapterMap.keys()).join(', ')}`);
    }

    const def = await loadPortableDef({ pluginDir, workspaceDir });

    // Resolve config defaults
    const config: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(def.config)) {
      config[key] = field.default;
    }

    const result = await adapter.generate(def, config);

    const targetDir = outputDir || resolve(pluginDir, 'plugins', name);
    let fileCount = 0;
    for (const [relPath, content] of result.files) {
      const fullPath = resolve(targetDir, relPath);
      const dir = resolve(fullPath, '..');
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(fullPath, content, 'utf-8');
      fileCount++;
    }

    console.log(JSON.stringify({ ok: true, adapter: name, files: fileCount, output: targetDir }));
  }
}

async function adaptInstall(pluginDir: string, opts: Record<string, string>): Promise<void> {
  // Install into the workspace (parent dir) that hosts the patents project
  const workspaceDir = opts['workspace-dir'] || resolve(pluginDir, '..');
  const toolName = opts.tool || '';

  const targets = toolName ? [toolName] : Array.from(adapterMap.keys());

  for (const name of targets) {
    const adapter = adapterMap.get(name);
    if (!adapter) {
      exitWithError(`Unknown adapter: ${name}. Available: ${Array.from(adapterMap.keys()).join(', ')}`);
    }

    const def = await loadPortableDef({ pluginDir, workspaceDir });
    const config: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(def.config)) {
      config[key] = field.default;
    }

    const result = await adapter.generate(def, config);

    // Write directly into workspaceDir
    let fileCount = 0;
    for (const [relPath, content] of result.files) {
      const fullPath = resolve(workspaceDir, relPath);
      const dir = resolve(fullPath, '..');
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      if (name === 'opencode' && existsSync(fullPath)) {
        continue;
      }
      writeFileSync(fullPath, content, 'utf-8');
      fileCount++;
    }

    // For ccb (Claude Code Best): also copy agent + command files to ~/.claude-best/
    // so they appear regardless of where ccb was started.
    if (name === 'claude-code') {
      // Copy agents
      const generatedAgentsDir = resolve(workspaceDir, '.claude', 'agents');
      const ccbAgentsDir = join(homedir(), '.claude-best', 'agents');
      if (existsSync(generatedAgentsDir)) {
        if (!existsSync(ccbAgentsDir)) {
          mkdirSync(ccbAgentsDir, { recursive: true });
        }
        for (const file of readdirSync(generatedAgentsDir)) {
          if (file.endsWith('.md')) {
            const src = resolve(generatedAgentsDir, file);
            const dst = resolve(ccbAgentsDir, file);
            copyFileSync(src, dst);
            fileCount++;
          }
        }
      }
      // Copy commands
      const generatedCommandsDir = resolve(workspaceDir, '.claude', 'commands');
      const ccbCommandsDir = join(homedir(), '.claude-best', 'commands');
      if (existsSync(generatedCommandsDir)) {
        if (!existsSync(ccbCommandsDir)) {
          mkdirSync(ccbCommandsDir, { recursive: true });
        }
        for (const file of readdirSync(generatedCommandsDir)) {
          if (file.endsWith('.md')) {
            const src = resolve(generatedCommandsDir, file);
            const dst = resolve(ccbCommandsDir, file);
            copyFileSync(src, dst);
            fileCount++;
          }
        }
      }
    }

    console.log(JSON.stringify({ ok: true, adapter: name, files: fileCount, installed: workspaceDir }));
    if (opts._setupHint) {
      console.error(`\noh-my-patent 已安装到本工作区。\n如需卸载，运行：oh-my-patent adapt uninstall --workspace-dir ${workspaceDir}`);
    }
  }
}

async function adaptUninstall(pluginDir: string, opts: Record<string, string>): Promise<void> {
  const workspaceDir = opts['workspace-dir'] || resolve(pluginDir, '..');
  const toolName = opts.tool || '';

  const targets = toolName ? [toolName] : Array.from(adapterMap.keys());

  for (const name of targets) {
    const adapter = adapterMap.get(name);
    if (!adapter) {
      exitWithError(`Unknown adapter: ${name}. Available: ${Array.from(adapterMap.keys()).join(', ')}`);
    }

    const def = await loadPortableDef({ pluginDir, workspaceDir });
    const result = await adapter.uninstall(def, workspaceDir);
    console.log(JSON.stringify({ ok: result.success, adapter: name, removed: result.filesRemoved.length, skipped: result.filesSkipped.length, message: result.message }));
  }
}

async function pathListInnovations(projectPath: string): Promise<void> {
  const innovations = await listAllInnovations(projectPath);
  console.log(JSON.stringify({ ok: true, innovations }));
}

// ============================================================================
// Diagram subcommands
// ============================================================================

/**
 * 从 @file 或 JSON 字符串读取diagram specs
 */
function parseDiagramSpecs(input: string): FigureSpec[] {
  const data = parseJsonInput(input);
  if (!Array.isArray(data)) {
    throw new Error('Specs must be a JSON array of FigureSpec objects');
  }
  // 基础验证
  for (const spec of data) {
    if (typeof spec !== 'object' || !spec.figureId || !spec.source) {
      throw new Error('Each spec must have figureId and source');
    }
  }
  return data as FigureSpec[];
}

function readMainMd(projectPath: string): string {
  const mainPath = join(projectPath, 'MAIN.md');
  if (!existsSync(mainPath)) {
    throw new Error(`MAIN.md not found at ${mainPath}`);
  }
  return readFileSync(mainPath, 'utf-8');
}

async function diagramRender(projectPath: string, opts: Record<string, string>): Promise<void> {
  if (!opts.specs) {
    // Fallback: read default specs file
    const specsFile = join(projectPath, 'references', 'diagram-specs-draft.json');
    if (!existsSync(specsFile)) {
      exitWithError('No --specs provided and references/diagram-specs-draft.json not found');
    }
    opts.specs = `@${specsFile}`;
  }

  const specs = parseDiagramSpecs(opts.specs);
  if (specs.length === 0) {
    console.log(JSON.stringify({ ok: true, message: 'No diagrams to render', renderCount: 0 }));
    return;
  }

  const phase = opts.phase || 'draft';
  const figuresDir = join(projectPath, 'figures');
  const renderer = new DiagramRenderer();
  const results = await renderer.renderAll(specs, figuresDir);

  const successCount = results.filter(r => r.success).length;
  const failures = results.filter(r => !r.success);

  // Update MAIN.md if there are successful renders
  let updatedMain: string | null = null;
  if (successCount > 0 && existsSync(join(projectPath, 'MAIN.md'))) {
    const mainContent = readMainMd(projectPath);
    updatedMain = insertFigureReferences(mainContent, specs, results);
    writeFileSync(join(projectPath, 'MAIN.md'), updatedMain, 'utf-8');
  }

  const output: Record<string, unknown> = {
    ok: true,
    projectPath,
    phase,
    renderCount: specs.length,
    successCount,
    figuresDir,
    results: results.map(r => ({
      figureId: r.figureId,
      success: r.success,
      svg: r.svgPath,
      png: r.pngPath,
      error: r.error || undefined,
    })),
  };
  if (updatedMain) {
    output.mainUpdated = true;
  }
  if (failures.length > 0) {
    output.failures = failures.map(f => ({ figureId: f.figureId, error: f.error }));
  }

  console.log(JSON.stringify(output, null, 2));
}

async function diagramStatus(projectPath: string): Promise<void> {
  const figuresDir = join(projectPath, 'figures');
  const manifestPath = join(figuresDir, 'figures-manifest.json');

  if (!existsSync(manifestPath)) {
    console.log(JSON.stringify({
      ok: true,
      projectPath,
      figuresDir,
      hasManifest: false,
      figures: [],
      message: 'No figures manifest found. Run diagram render first.',
    }));
    return;
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  console.log(JSON.stringify({
    ok: true,
    projectPath,
    figuresDir,
    hasManifest: true,
    figureCount: manifest.length,
    figures: manifest.map((m: { figureNumber: number; figureId: string; title: string; phase: string; files: { png: string; svg: string; source: string } }) => ({
      figureNumber: m.figureNumber,
      figureId: m.figureId,
      title: m.title,
      phase: m.phase,
      files: m.files,
    })),
  }, null, 2));
}

async function diagramRerender(projectPath: string, opts: Record<string, string>): Promise<void> {
  if (!opts.figure) exitWithError('--figure is required (figureId)');
  if (!opts.source) exitWithError('--source is required (Mermaid/PlantUML source text, or @file)');
  if (!opts.engine) {
    // 自动推断: .mmd 默认 mermaid, .puml 默认 plantuml
    opts.engine = 'mermaid';
  }

  const engine = opts.engine as 'mermaid' | 'plantuml';
  if (engine !== 'mermaid' && engine !== 'plantuml') {
    exitWithError(`--engine must be mermaid or plantuml, got: ${engine}`);
  }

  let sourceText: string;
  if (opts.source.startsWith('@')) {
    sourceText = readFileSync(resolve(opts.source.slice(1)), 'utf-8');
  } else {
    sourceText = opts.source;
  }

  const figuresDir = join(projectPath, 'figures');
  const renderer = new DiagramRenderer();
  const result = await renderer.rerender(opts.figure, sourceText, figuresDir, engine);

  const output: Record<string, unknown> = {
    ok: result.success,
    figureId: opts.figure,
    engine,
    figuresDir,
    files: {
      source: result.sourcePath,
      svg: result.svgPath,
      png: result.pngPath,
    },
  };
  if (!result.success) {
    output.error = result.error;
  }
  console.log(JSON.stringify(output, null, 2));
}

// ============================================================================
// Main dispatcher
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`oh-my-patent CLI - Runtime bridge for brainstorm path and diagram operations

Usage:
  node dist/cli.js <domain> <subcommand> [options]

Domains:
  path      Brainstorm path operations
  diagram   Patent diagram operations
  adapt     Generate tool-specific config (Claude Code, Codex, etc.)
  tui       Interactive terminal UI for brainstorm paths
  check     Environment readiness check (MCP servers, tools, runtime)

Path subcommands:
  init <project-path>                                       Initialize .brainstorm directory
  record <project-path> --round <N> --data <json|@file>     Record a brainstorm round
  overview <project-path>                                   Show path overview (JSON)
  node <project-path> <node-id>                             Show node detail (JSON)
  innovation <project-path> <innovation-id>                 Show innovation history (JSON)
  innovations <project-path>                                List all innovations (JSON)
  branch <project-path> --from-node <id> --reason <text>    Create a branch
  branches <project-path>                                   List all branches (JSON)
  restore <project-path> --node <id> --innovation <id>      Restore abandoned innovation
  threshold <project-path> --round <N>                      Evaluate threshold for a round
  visualize <project-path> [--mode <mode>] [--target <id>]  Render box-drawing visualization
  markdown <project-path> [--mode <mode>] [--target <id>]   Render Markdown report

Diagram subcommands:
  render <project-path> --specs <json|@file> [--phase <draft|final>]
    Render all figure specs, output SVG+PNG, update MAIN.md
  status <project-path>
    Show current diagram manifest and figure list
  rerender <project-path> --figure <id> --source <mmd|@file> [--engine mermaid|plantuml]
    Re-render a single figure with new source, update manifest

Adapt subcommands:
  generate [--tool <name>] [--output <dir>]                 Generate config to plugins/<tool>/
  install [--tool <name>] [--workspace-dir <dir>]           Install config into workspace
  setup  [--tool <name>] [--workspace-dir <dir>]           Alias for install
  uninstall [--tool <name>] [--workspace-dir <dir>]         Uninstall (remove) config from workspace

Options:
  --round <N>           Round number
  --data <json|@file>   JSON data or @file for reading from file
  --from-node <id>      Source node for branch creation
  --reason <text>       Reason for branch or action
  --node <id>           Node ID (e.g. round-1)
  --innovation <id>     Innovation ID (e.g. INN-001)
  --mode <mode>         Visualization mode: overview|node|innovation|branch|dashboard
  --target <id>         Target ID for visualization/detail
  --output <file>       Output file path (optional)
  --tool <name>         Adapter name: claude-code|codex|opencode (default: all)
  --workspace-dir <dir> Workspace directory (default: parent of plugin dir)
  --specs <json|@file>  FigureSpec array (JSON or @file)
  --phase <phase>       Render phase: draft (default) or final
  --figure <id>         Figure ID for re-render
  --source <mmd|@file>  Mermaid/PlantUML source text, or @file
  --engine <engine>     Rendering engine: mermaid (default) or plantuml
`);
    process.exit(0);
  }

  const domain = args[0];
  const subcommand = args[1];
  const rest = args.slice(2);
  const opts = parseArgs(rest);

  if (domain === 'path') {
    switch (subcommand) {
      case 'init': {
        const projectPath = resolve(rest[0] || opts['project-path'] || '.');
        await pathInit(projectPath);
        break;
      }
      case 'record': {
        const projectPath = resolve(rest[0] || opts['project-path'] || '.');
        await pathRecord(projectPath, opts);
        break;
      }
      case 'overview': {
        const projectPath = resolve(rest[0] || opts['project-path'] || '.');
        await pathOverview(projectPath);
        break;
      }
      case 'node': {
        const projectPath = resolve(rest[0] || opts['project-path'] || '.');
        const nodeId = rest[1] || opts.id;
        if (!nodeId) exitWithError('node-id is required');
        await pathNode(projectPath, nodeId);
        break;
      }
      case 'innovation': {
        const projectPath = resolve(rest[0] || opts['project-path'] || '.');
        const innovationId = rest[1] || opts.id;
        if (!innovationId) exitWithError('innovation-id is required');
        await pathInnovation(projectPath, innovationId);
        break;
      }
      case 'innovations': {
        const projectPath = resolve(rest[0] || opts['project-path'] || '.');
        await pathListInnovations(projectPath);
        break;
      }
      case 'branch': {
        const projectPath = resolve(rest[0] || opts['project-path'] || '.');
        await pathBranch(projectPath, opts);
        break;
      }
      case 'branches': {
        const projectPath = resolve(rest[0] || opts['project-path'] || '.');
        await pathBranches(projectPath);
        break;
      }
      case 'restore': {
        const projectPath = resolve(rest[0] || opts['project-path'] || '.');
        await pathRestore(projectPath, opts);
        break;
      }
      case 'threshold': {
        const projectPath = resolve(rest[0] || opts['project-path'] || '.');
        await pathThreshold(projectPath, opts);
        break;
      }
      case 'visualize': {
        const projectPath = resolve(rest[0] || opts['project-path'] || '.');
        await pathVisualize(projectPath, opts);
        break;
      }
      case 'markdown': {
        const projectPath = resolve(rest[0] || opts['project-path'] || '.');
        await pathMarkdown(projectPath, opts);
        break;
      }
      default:
        exitWithError(`Unknown path subcommand: ${subcommand}. Run with --help for usage.`);
    }
  } else if (domain === 'adapt') {
    const pluginDir = opts['plugin-dir'] ? resolve(opts['plugin-dir']) : getPluginDir();
    const workspaceDir = opts['workspace-dir'] ? resolve(opts['workspace-dir']) : getDefaultWorkspaceDir();
    switch (subcommand) {
      case 'generate': {
        await adaptGenerate(pluginDir, opts);
        break;
      }
      case 'install': {
        await adaptInstall(pluginDir, { ...opts, 'workspace-dir': workspaceDir });
        break;
      }
      case 'setup': {
        await adaptInstall(pluginDir, { ...opts, 'workspace-dir': workspaceDir, _setupHint: '1' });
        break;
      }
      case 'uninstall': {
        await adaptUninstall(pluginDir, { ...opts, 'workspace-dir': workspaceDir });
        break;
      }
      default:
        exitWithError(`Unknown adapt subcommand: ${subcommand}. Available: generate, install, setup, uninstall`);
    }
  } else if (domain === 'tui') {
    const projectPath = resolve(rest[0] || opts['project-path'] || '.');
    const { startTUI } = await import('./tui/app.js');
    await startTUI(projectPath);
  } else if (domain === 'diagram') {
    const projectPath = resolve(rest[0] || opts['project-path'] || '.');
    switch (subcommand) {
      case 'render': {
        await diagramRender(projectPath, opts);
        break;
      }
      case 'status': {
        await diagramStatus(projectPath);
        break;
      }
      case 'rerender': {
        await diagramRerender(projectPath, opts);
        break;
      }
      default:
        exitWithError(`Unknown diagram subcommand: ${subcommand}. Available: render, status, rerender`);
    }
  } else if (domain === 'check') {
    const checkOpts = parseArgs(args.slice(1));
    const workspaceDir = checkOpts['workspace-dir'] ? resolve(checkOpts['workspace-dir']) : getDefaultWorkspaceDir();

    if (checkOpts.json) {
      const report = runJsonCheck({ workspaceDir });
      console.log(JSON.stringify(report));
    } else if (checkOpts['mcp-status']) {
      const statuses = getMcpStatuses(workspaceDir);
      console.log(JSON.stringify(statuses));
    } else if (checkOpts['mcp-add']) {
      const mcpId = checkOpts['mcp-add'];
      const userValues: Record<string, string> = {};
      if (checkOpts['mcp-key']) {
        for (const pair of checkOpts['mcp-key'].split(',')) {
          const [k, ...v] = pair.split('=');
          if (k && v.length > 0) userValues[k.trim()] = v.join('=').trim();
        }
      }
      const config = buildMcpConfig(mcpId, userValues);
      if (!config) {
        exitWithError(`Unknown MCP template: ${mcpId}. Available: ${['patsnap_search','google_scholar','uspto_patent','cnipa_patent','semantic_scholar'].join(', ')}`);
      }
      const result = writeMcpConfig(workspaceDir, mcpId, config);
      const safeConfig = JSON.parse(JSON.stringify(config));
      if (safeConfig.url && typeof safeConfig.url === 'string') {
        safeConfig.url = safeConfig.url.replace(/apikey=[^&]+/gi, 'apikey=***');
      }
      console.log(JSON.stringify({ ok: result.success, mcpId, message: result.message, configPath: result.configPath, config: safeConfig }));
    } else {
      const report = runFullCheck({ workspaceDir });
      const formatted = formatReport(report);
      if (checkOpts.output) {
        writeFileSync(resolve(checkOpts.output), formatted, 'utf-8');
        console.log(JSON.stringify({ ok: true, ready: report.ready, blockingCount: report.blockingCount, warningCount: report.warningCount, output: checkOpts.output }));
      } else {
        console.log(formatted);
      }
    }
  } else {
    exitWithError(`Unknown domain: ${domain}. Available: path, adapt, tui, diagram, check`);
  }
}

main().catch(err => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('Fatal:', message);
  process.exit(1);
});
