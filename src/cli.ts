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
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'fs';
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
import { runAdaptGenerate } from './adapters/run-generate.js';
import { pruneGeneratedFiles } from './adapters/prune.js';
import { GENERATED_MARKER } from './adapters/generated-marker.js';
import { ClaudeCodeAdapter } from './adapters/claude/index.js';
import { mergeMcpConfig } from './adapters/claude/mcp-config.js';
import { atomicWriteFileSync } from './core/atomic-write.js';
import { CodexAdapter } from './adapters/codex/index.js';
import { mergeMarketplace } from './adapters/codex/marketplace.js';
import { OpenCodeAdapter } from './adapters/opencode/index.js';
import { ToolAdapter, GenerateResult } from './adapters/types.js';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { FigureSpec, defaultDiagramSpecsFile } from './core/diagram-types.js';
import { DiagramRenderer } from './core/diagram-renderer.js';
import { insertFigureReferences } from './core/diagram-inserter.js';
import { runFullCheck, formatReport, runJsonCheck, getMcpStatuses, buildMcpConfig, writeMcpConfig } from './core/init-checker.js';
import { ensureInside, ensureUnlinkedPath, isSafeRelPath } from './core/path-safety.js';
import { parseArgs, isDangerousKey } from './core/cli-args.js';

// ============================================================================
// Package directory detection (works in global npm installs, dev, and linked modes)
// ============================================================================

function getPluginDir(): string {
  // The package root is derived from THIS MODULE'S OWN URL, never from cwd:
  // cli.js lives in `<root>/dist/`, so the parent of this module's directory is
  // the root that holds plugin.jsonc. That makes the answer identical whether
  // the CLI is globally installed, linked, run as `node dist/cli.js` from an
  // unrelated directory, or unpacked from the published tarball.
  //
  // (An earlier comment claimed cwd was used for the last two cases. It was
  // never true, and it is the kind of comment that makes a wrong default look
  // intentional — see REQ-008.)
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
// Argument parsing (parseArgs imported from core/cli-args for testability)
// ============================================================================

function parseJsonInput(input: string): unknown {
  // Support @file syntax for reading JSON from a file
  if (input.startsWith('@')) {
    const filePath = input.slice(1);
    const resolved = resolve(filePath);
    // Limit file size to 10MB to prevent DoS via huge file read
    try {
      const stat = statSync(resolved);
      if (stat.size > 10 * 1024 * 1024) {
        throw new Error(`File too large: ${stat.size} bytes (max 10MB)`);
      }
    } catch (e) {
      if ((e as Error).message.startsWith('File too large')) throw e;
      // If stat fails, let readFileSync throw ENOENT etc.
    }
    const content = readFileSync(resolved, 'utf-8');
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
  const round = Number(opts.round);
  if (!/^\d+$/.test(opts.round ?? '') || !Number.isSafeInteger(round) || round < 1) {
    exitWithError('--round is required and must be a positive safe integer');
  }

  if (!opts.data) exitWithError('--data is required (JSON string or @file)');

  const data = parseJsonInput(opts.data) as {
    projectId?: string;
    topic?: string;
    agentOutputs?: BrainstormNode['agentOutputs'];
    innovations?: InnovationSnapshot[];
    scores?: InnovationScore[];
    decision?: BrainstormNode['decision'];
  };
  if (!data || typeof data !== 'object' || Array.isArray(data) ||
    (data.projectId !== undefined && typeof data.projectId !== 'string') ||
    (data.topic !== undefined && typeof data.topic !== 'string')) {
    exitWithError('--data must be an object with string projectId/topic');
  }

  // Validate the complete node before any files (including snapshots) change.
  const node = createInitialNode(round);
  if (data.agentOutputs !== undefined) node.agentOutputs = data.agentOutputs;
  if (data.innovations !== undefined) node.innovations = data.innovations;
  if (data.scores !== undefined) node.scores = data.scores;
  if (data.decision !== undefined) node.decision = data.decision;
  if (!isValidBrainstormNode(node)) exitWithError('Invalid BrainstormNode data structure');

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

  if (round > 1 && (!pathData.nodes.includes(`round-${round - 1}`) ||
    !await loadNode(projectPath, `round-${round - 1}`))) {
    exitWithError('Previous round must exist before recording the next round');
  }

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
  // Default to the user's cwd, never the package's parent directory: with a
  // global install the latter is `.../node_modules`, and files would be
  // written there (REQ-008).
  const workspaceDir = opts['workspace-dir']
    ? resolve(opts['workspace-dir'])
    : getDefaultWorkspaceDir();

  // Core loop lives in run-generate.ts so the "one loadPortableDef call for
  // every target" guarantee is unit-testable (REQ-027). Unknown adapters are
  // reported with the historical exitWithError wording.
  try {
    await runAdaptGenerate({
      pluginDir,
      workspaceDir,
      toolName: opts.tool || '',
      outputDir: opts.output || '',
      adapters,
    });
  } catch (err) {
    exitWithError(err instanceof Error ? err.message : String(err));
  }
}

async function adaptInstall(pluginDir: string, opts: Record<string, string>): Promise<void> {
  // Install into the workspace (parent dir) that hosts the patents project
  // Default to the user's cwd, never the package's parent directory: with a
  // global install the latter is `.../node_modules`, and files would be
  // written there (REQ-008).
  const workspaceDir = opts['workspace-dir']
    ? resolve(opts['workspace-dir'])
    : getDefaultWorkspaceDir();
  const toolName = opts.tool || '';

  const targets = toolName ? [toolName] : Array.from(adapterMap.keys());

  for (const name of targets) {
    const adapter = adapterMap.get(name);
    if (!adapter) {
      exitWithError(`Unknown adapter: ${name}. Available: ${Array.from(adapterMap.keys()).join(', ')}`);
    }

    const def = await loadPortableDef({ pluginDir, workspaceDir });
    const config: Record<string, unknown> = Object.create(null);
    for (const [key, field] of Object.entries(def.config)) {
      if (isDangerousKey(key)) continue;
      (config as Record<string, unknown>)[key] = field.default;
    }

    const result = await adapter.generate(def, config);

    // Preflight all paths before the first mutation, including shared config.
    const globalCopies = new Map<string, string>();
    for (const [relPath, content] of result.files) {
      if (!isSafeRelPath(relPath)) throw new Error(`Unsafe generated path blocked: ${relPath}`);
      ensureUnlinkedPath(workspaceDir, resolve(workspaceDir, relPath));
      if (name === 'claude-code' &&
        [join('.claude', 'agents'), join('.claude', 'commands')].includes(dirname(relPath))) {
        const globalPath = resolve(homedir(), '.claude-best', relPath.slice('.claude'.length + 1));
        ensureUnlinkedPath(homedir(), globalPath);
        globalCopies.set(globalPath, content);
      }
    }

    // Validate shared configuration before any files are installed.
    const marketplacePath = join('.agents', 'plugins', 'marketplace.json');
    if (name === 'codex' && existsSync(resolve(workspaceDir, marketplacePath))) {
      result.files.set(marketplacePath, mergeMarketplace(
        readFileSync(resolve(workspaceDir, marketplacePath), 'utf8'), result.files.get(marketplacePath)!,
      ));
    }

    // Write directly into workspaceDir
    let fileCount = 0;
    for (const [relPath, content] of result.files) {
      if (!isSafeRelPath(relPath)) {
        exitWithError(`Unsafe generated path blocked: ${relPath}`);
      }
      const fullPath = resolve(workspaceDir, relPath);
      ensureInside(workspaceDir, fullPath);
      ensureUnlinkedPath(workspaceDir, fullPath);
      const dir = resolve(fullPath, '..');
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      if (name === 'opencode' && existsSync(fullPath)) {
        const previousBytes = readFileSync(fullPath);
        const previous = previousBytes.toString('utf8');
        if (!previous.includes(GENERATED_MARKER) || previous === content) continue;
        // Retain the exact previous bytes even if a generated prompt was edited.
        // This also makes security permission upgrades effective on reinstall.
        const digest = createHash('sha256').update(previousBytes).digest('hex');
        const backup = resolve(workspaceDir, '.opencode', '.oh-my-patent-backups', `${digest}.md`);
        ensureUnlinkedPath(workspaceDir, backup);
        if (existsSync(backup) && !readFileSync(backup).equals(previousBytes)) {
          throw new Error('OpenCode backup conflict; existing generated file preserved');
        }
        if (!existsSync(backup)) atomicWriteFileSync(backup, previousBytes, { mode: 0o600 });
        console.error('Updated generated OpenCode file; previous content retained in .opencode/.oh-my-patent-backups/.');
      }
      if (name === 'codex' && relPath === 'AGENTS.md' && existsSync(fullPath)) {
        console.error('Preserved existing AGENTS.md; integrate plugin instructions from plugins/oh-my-patent/AGENTS.md.');
        continue;
      }
      const installedContent = name === 'claude-code' && relPath === '.mcp.json' && existsSync(fullPath)
        ? mergeMcpConfig(readFileSync(fullPath, 'utf-8'), content)
        : content;
      atomicWriteFileSync(fullPath, installedContent,
        name === 'claude-code' && relPath === '.mcp.json' ? { mode: 0o600 } : {});
      fileCount++;
    }

    // Copy only this generation's output, never arbitrary workspace files.
    for (const [destination, content] of globalCopies) {
      ensureUnlinkedPath(homedir(), destination);
      atomicWriteFileSync(destination, content);
      fileCount++;
    }

    // Optional: remove output from a previous definition that this run no
    // longer produces. generate() only writes, and uninstall() derives its
    // deletion list from the current definition, so neither can do this.
    const pruneResult = opts.prune === 'true'
      ? pruneGeneratedFiles(adapter, def, workspaceDir)
      : null;

    console.log(JSON.stringify({
      ok: true,
      adapter: name,
      files: fileCount,
      installed: workspaceDir,
      ...(pruneResult ? { pruned: pruneResult.removed.length } : {}),
    }));
    if (pruneResult) {
      console.error(`oh-my-patent: pruned ${pruneResult.removed.length} stale file(s) for ${name}.`);
      for (const relPath of pruneResult.removed) {
        console.error(`  - ${relPath}`);
      }
    }
    if (opts._setupHint) {
      console.error(`\noh-my-patent 已安装到本工作区。\n如需卸载，运行：oh-my-patent adapt uninstall --workspace-dir ${workspaceDir}`);
    }
  }
}

async function adaptUninstall(pluginDir: string, opts: Record<string, string>): Promise<void> {
  // Default to the user's cwd, never the package's parent directory: with a
  // global install the latter is `.../node_modules`, and files would be
  // written there (REQ-008).
  const workspaceDir = opts['workspace-dir']
    ? resolve(opts['workspace-dir'])
    : getDefaultWorkspaceDir();
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
  const phase = opts.phase || 'draft';
  if (!opts.specs) {
    const specsName = defaultDiagramSpecsFile(phase);
    const specsFile = join(projectPath, 'references', specsName);
    if (!existsSync(specsFile)) {
      exitWithError(`No --specs provided and references/${specsName} not found`);
    }
    opts.specs = `@${specsFile}`;
  }

  const specs = parseDiagramSpecs(opts.specs);
  if (specs.length === 0) {
    console.log(JSON.stringify({ ok: true, message: 'No diagrams to render', renderCount: 0 }));
    return;
  }

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
    // REQ-027: the engine must come from the figure's own record, not a
    // hardcoded default. Previously `!opts.engine` silently forced 'mermaid',
    // so re-rendering a PlantUML figure without --engine rendered it with the
    // wrong engine. Inference order:
    //   1. figures-manifest.json — the engine the figure was rendered with
    //   2. the --source file extension (.puml/.pu/.plantuml → plantuml)
    //   3. mermaid (historical default)
    let inferred: string | undefined;
    const manifestPath = join(projectPath, 'figures', 'figures-manifest.json');
    try {
      if (existsSync(manifestPath)) {
        const manifest: unknown = JSON.parse(readFileSync(manifestPath, 'utf-8'));
        if (Array.isArray(manifest)) {
          const entry = manifest.find(
            (e) => typeof e === 'object' && e !== null &&
              (e as Record<string, unknown>).figureId === opts.figure
          ) as Record<string, unknown> | undefined;
          if (typeof entry?.engine === 'string') {
            inferred = entry.engine;
          }
        }
      }
    } catch {
      // Corrupt manifest: fall through to extension inference.
    }
    if (inferred !== 'mermaid' && inferred !== 'plantuml') {
      inferred = /\.(puml|pu|plantuml)$/i.test(opts.source) ? 'plantuml' : 'mermaid';
    }
    opts.engine = inferred;
  }

  const engine = opts.engine as 'mermaid' | 'plantuml';
  if (engine !== 'mermaid' && engine !== 'plantuml') {
    exitWithError(`--engine must be mermaid or plantuml, got: ${engine}`);
  }

  let sourceText: string;
  if (opts.source.startsWith('@')) {
    const resolved = resolve(opts.source.slice(1));
    try {
      const stat = statSync(resolved);
      if (stat.size > 10 * 1024 * 1024) {
        exitWithError(`Source file too large: ${stat.size} bytes (max 10MB)`);
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('Source file too large')) throw e;
    }
    sourceText = readFileSync(resolved, 'utf-8');
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
  if (process.argv[2] === 'runtime') {
    process.argv.splice(2, 1);
    await import('./runtime/skill-entry.js');
    return;
  }
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
  generate [--mode plugin|skill] [--tool <name>] [--output <dir>]
    Generate plugin config to plugins/<tool>/ (with --output: <dir>/<tool>/)
    Skill mode generates into skill-installations/<tool>/ or the exact --output directory
  install [--mode plugin|skill] [--tool <name>] [--workspace-dir <dir>] [--prune]
    Install the Archimedes plugin (default) or an additional portable Skill
  setup [--mode plugin|skill] [--tool <name>] [--workspace-dir <dir>]
    Alias for install
  uninstall [--mode plugin|skill] [--tool <name>] [--workspace-dir <dir>]
    Remove only the selected installation mode
  rollback --mode skill --backup <id> [--workspace-dir <dir>]
  recover-lock --mode skill --owner-token <token> [--workspace-dir <dir>]

Options:
  --round <N>           Round number
  --data <json|@file>   JSON data or @file for reading from file
  --from-node <id>      Source node for branch creation
  --reason <text>       Reason for branch or action
  --node <id>           Node ID (e.g. round-1)
  --innovation <id>     Innovation ID (e.g. INN-001)
  --mode <mode>         adapt: plugin (default)|skill; path: overview|node|innovation|branch|dashboard
  --target <id>         Target ID for visualization/detail
  --output <file>       Output file path (optional)
  --tool <name>         Plugin: claude-code|codex|opencode (default: all)
                        Skill: one explicit host, also cursor|github-copilot|gemini-cli
  --dry-run             Skill mode: preview without writing
  --legacy              Compatibility alias for --mode plugin
  --workspace-dir <dir> Workspace directory (default: current working directory)
  --specs <json|@file>  FigureSpec array (JSON or @file)
  --phase <phase>       Render phase: draft (default) or final
  --figure <id>         Figure ID for re-render
  --source <mmd|@file>  Mermaid/PlantUML source text, or @file
  --engine <engine>     Rendering engine: mermaid (default) or plantuml
  --prune               install: also delete generated files no longer produced
                        (only files carrying an oh-my-patent marker)
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
    const mode = opts.mode || 'plugin';
    if (!['plugin', 'skill'].includes(mode)) exitWithError('Unknown installation mode. Use --mode plugin|skill');
    if (opts.legacy === 'true' && mode !== 'plugin') exitWithError('--legacy selects plugin mode and cannot be combined with --mode skill');
    if (mode === 'plugin' && opts['dry-run'] === 'true') exitWithError('--dry-run is available only with --mode skill');
    if (mode === 'skill') {
      if (opts.prune === 'true') exitWithError('--prune is available only with --mode plugin');
      const { managePortable, rollbackPortable, recoverPortableLock } = await import('./adapters/portable-install.js');
      if (subcommand === 'rollback') {
        rollbackPortable(workspaceDir, opts.backup || '');
        console.log(JSON.stringify({ ok: true, rolled_back: opts.backup }));
      } else if (subcommand === 'recover-lock') {
        recoverPortableLock(workspaceDir, opts['owner-token'] || '');
        console.log(JSON.stringify({ ok: true, lock_recovered: true }));
      } else {
        if (!['generate', 'install', 'setup', 'uninstall'].includes(subcommand)) exitWithError('Use adapt generate|install|uninstall|rollback|recover-lock');
        const action = subcommand === 'setup' ? 'install' : subcommand as 'install' | 'generate' | 'uninstall';
        const destination = action === 'generate' ? resolve(opts.output || join(pluginDir, 'skill-installations', opts.tool || '')) : workspaceDir;
        const result = managePortable(pluginDir, destination, opts.tool || '', action, opts['dry-run'] === 'true');
        console.log(JSON.stringify({ ok: true, ...result as object }));
      }
      return;
    }
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
      const userValues: Record<string, string> = Object.create(null);
      if (checkOpts['mcp-key']) {
        for (const pair of checkOpts['mcp-key'].split(',')) {
          const [k, ...v] = pair.split('=');
          if (k && v.length > 0) {
            const key = k.trim();
            if (isDangerousKey(key)) continue;
            (userValues as Record<string, string>)[key] = v.join('=').trim();
          }
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
      // The masked copy above only protects the terminal. The file on disk still
      // holds the key, so the plaintext warning goes to stderr where a human
      // cannot miss it (REQ-009).
      console.error(result.warning);
      console.log(JSON.stringify({
        ok: result.success,
        mcpId,
        message: result.message,
        configPath: result.configPath,
        warning: result.warning,
        gitignoreUpdated: result.gitignoreUpdated,
        fileMode: result.fileMode,
        config: safeConfig,
      }));
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
