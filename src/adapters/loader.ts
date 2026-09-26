/**
 * Loader - reads oh-my-patent source definitions and produces PortableDef
 *
 * Parses:
 * - plugin.jsonc (agents, skills, commands, config schema)
 * - .opencode/agent/*.md (extended agent definitions with OpenCode frontmatter)
 * - opencode.jsonc (MCP server definitions)
 *
 * The loader normalizes OpenCode-specific frontmatter into the portable format
 * so that adapters don't need to know about OpenCode internals.
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { parseJsonc as parseJsoncContent } from '../core/jsonc.js';
import { isDangerousKey } from '../core/cli-args.js';
import {
  PortableDef, AgentDef, AgentRole, AgentPermissions,
  SkillDef, CommandDef, MCPServerDef, PluginConfig
} from './types.js';
import { GENERATED_MARKER } from './generated-marker.js';

// ============================================================================
// Frontmatter parser
// ============================================================================

interface OpenCodeFrontmatter {
  description?: string;
  mode?: string;
  model?: string;
  temperature?: number;
  tools?: Record<string, boolean>;
}

function parseFrontmatter(content: string): { frontmatter: OpenCodeFrontmatter; body: string } {
  // Try YAML frontmatter first (--- ... ---)
  const yamlMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (yamlMatch) {
    const fm = parseYamlFrontmatter(yamlMatch[1]);
    return { frontmatter: fm, body: yamlMatch[2] };
  }

  // Try HTML comment frontmatter (<!-- ... -->)
  const htmlFm = parseHtmlCommentFrontmatter(content);
  if (Object.keys(htmlFm.fm).length > 0) {
    return { frontmatter: htmlFm.fm, body: htmlFm.body };
  }

  return { frontmatter: {}, body: content };
}

/**
 * Strip one layer of YAML quoting from a scalar value.
 *
 * The adapters write strings with `JSON.stringify`, so `description: "x"` is
 * the normal on-disk form. Returning the raw text would make every reload add
 * a quoting layer (`"x"` → `"\"x\""` → …), which is both unbounded growth and
 * the reason `adapt uninstall` could no longer match its own output (REQ-050).
 */
function unquoteYamlScalar(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed) as string;
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
}

function parseYamlFrontmatter(raw: string): OpenCodeFrontmatter {
  const fm: OpenCodeFrontmatter = {};

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('description:')) {
      fm.description = unquoteYamlScalar(trimmed.slice('description:'.length));
    } else if (trimmed.startsWith('mode:')) {
      fm.mode = trimmed.slice('mode:'.length).trim();
    } else if (trimmed.startsWith('model:')) {
      fm.model = unquoteYamlScalar(trimmed.slice('model:'.length));
    } else if (trimmed.startsWith('temperature:')) {
      fm.temperature = parseFloat(trimmed.slice('temperature:'.length).trim());
    }
  }

  // Parse tools section — allow keys like "mcp*" (with asterisk)
  const toolsMatch = raw.match(/tools:\s*\n((?:\s+[\w*][\w*-]*:\s+\w+\n?)*)/);
  if (toolsMatch) {
    fm.tools = Object.create(null) as Record<string, boolean>;
    for (const tLine of toolsMatch[1].split('\n')) {
      const tMatch = tLine.trim().match(/^([\w][\w*-]*):\s*(\w+)$/);
      if (tMatch) {
        const k = tMatch[1];
        if (isDangerousKey(k)) continue;
        (fm.tools as Record<string, boolean>)[k] = tMatch[2] === 'true';
      }
    }
  }

  // Parse the OpenCode-native `permission:` block, which is what the opencode
  // adapter emits (`edit` / `bash` unchanged, and a folded `write`). Without
  // this the loader silently dropped every permission on reload (REQ-050).
  const permissionMatch = raw.match(/^permission[s]?:\s*\n((?:[ \t]+[\w*][\w*-]*:[ \t]*\w+[ \t]*\n?)*)/m);
  if (permissionMatch) {
    for (const pLine of permissionMatch[1].split('\n')) {
      const pMatch = pLine.trim().match(/^([\w][\w*-]*):\s*(\w+)$/);
      if (!pMatch) {
        continue;
      }
      const [, key, value] = pMatch;
      // `task` and `skill` have no portable counterpart: the agent's role and
      // the workflow definition own those decisions, not the workspace file.
      if (key === 'task' || key === 'skill' || isDangerousKey(key)) {
        continue;
      }
      fm.tools = fm.tools ?? (Object.create(null) as Record<string, boolean>);
      fm.tools[key] = value === 'allow' || value === 'true';
      if (key === 'mcp') {
        fm.tools['mcp*'] = fm.tools[key];
      }
    }
  }

  return fm;
}

/**
 * Parse HTML comment frontmatter used in plugin agent .md files.
 *
 * Supported comment patterns:
 *   <!-- Agent: <id> | Role: primary|subagent -->
 *   <!-- Permissions: write, edit, bash, mcp -->
 *   <!-- description: <text> -->
 *   <!-- model: <model-name> -->
 *   <!-- temperature: <number> -->
 *
 * The body is everything after the last leading comment block.
 */
function parseHtmlCommentFrontmatter(content: string): { fm: OpenCodeFrontmatter; body: string } {
  const fm: OpenCodeFrontmatter = {};
  const lines = content.split('\n');
  let lastCommentLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const commentMatch = trimmed.match(/^<!--\s*(.+?)\s*-->$/);
    if (!commentMatch) {
      // Stop scanning at the first non-comment, non-blank line
      if (trimmed !== '') break;
      continue;
    }

    lastCommentLine = i;
    const inner = commentMatch[1];

    // Agent: <id> | Role: primary|subagent
    const roleMatch = inner.match(/Role:\s*(primary|subagent)/i);
    if (roleMatch) {
      fm.mode = roleMatch[1].toLowerCase();
    }

    // Permissions: write, edit, bash, mcp
    const permMatch = inner.match(/^Permissions:\s*(.+)$/i);
    if (permMatch) {
      const perms = permMatch[1].split(',').map(p => p.trim().toLowerCase());
      fm.tools = fm.tools ?? Object.create(null) as Record<string, boolean>;
      for (const p of perms) {
        if (isDangerousKey(p)) continue;
        if (['write', 'edit', 'bash', 'mcp', 'mcp*', 'task', 'skill'].includes(p)) {
          (fm.tools as Record<string, boolean>)[p] = true;
        }
      }
    }

    // description: <text>
    const descMatch = inner.match(/^description:\s*(.+)$/i);
    if (descMatch) {
      fm.description = descMatch[1].trim();
    }

    // model: <name>
    const modelMatch = inner.match(/^model:\s*(.+)$/i);
    if (modelMatch) {
      fm.model = modelMatch[1].trim();
    }

    // temperature: <number>
    const tempMatch = inner.match(/^temperature:\s*([\d.]+)$/i);
    if (tempMatch) {
      fm.temperature = parseFloat(tempMatch[1]);
    }
  }

  // Body = everything after the last comment line (skip blank lines immediately following)
  let bodyStart = lastCommentLine + 1;
  while (bodyStart < lines.length && lines[bodyStart].trim() === '') {
    bodyStart++;
  }
  const body = bodyStart < lines.length ? lines.slice(bodyStart).join('\n') : '';

  return { fm, body };
}

// ============================================================================
// Plugin.jsonc parser (strip comments while respecting strings)
// ============================================================================

// The comment-stripping state machine itself lives in src/core/jsonc.ts —
// the single implementation shared with init-checker and the e2e suite
// (REQ-015). This wrapper keeps the historical file-path signature.
function parseJsoncFile(filePath: string): unknown {
  return parseJsoncContent(readFileSync(filePath, 'utf-8'));
}

// ============================================================================
// Load agents
// ============================================================================

interface PluginAgentEntry {
  id: string;
  name: string;
  description: string;
  file: string;
}

/**
 * List the `.md` files in an agent directory.
 *
 * Returns an empty list when the directory is absent or unreadable. Both mean
 * "no workspace-level agent overrides" — the expected state on a clean clone —
 * so they are a normal condition rather than an error.
 */
function listAgentFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  try {
    return readdirSync(dir).filter((f: string) => f.endsWith('.md'));
  } catch {
    return [];
  }
}

/**
 * Load agent definitions from two sources, in priority order:
 *
 * 1. `<workspaceDir>/.opencode/agent/*.md` — hand-authored workspace overrides
 *    with YAML frontmatter. These win when present, because they carry the full
 *    OpenCode tool and permission surface.
 * 2. `plugin.jsonc` + `src/agents/*.md` — the portable, tracked source of truth,
 *    and the authoritative source for this repository. The `.opencode/` tree is
 *    a workspace-level artifact and is deliberately not committed, so a clean
 *    clone always takes this path and must still produce every agent declared
 *    in `plugin.jsonc`.
 *
 * Files carrying `GENERATED_MARKER` are skipped in step 1. That is deliberate:
 * `adapt install --tool opencode` writes its generated agents into exactly this
 * directory, so on any installed workspace most — or all — of these files are
 * our own output rather than a user override. Reading them back made the
 * definition drift on every install/uninstall cycle (REQ-050): descriptions
 * gained a quoting layer, permissions collapsed to `false`, and
 * `adapt uninstall` could no longer recognise the files it had written. A file
 * the user wrote by hand has no marker, so it still wins exactly as before.
 *
 * Falling back to source 2 is silent by design: a missing `.opencode/agent/`
 * is not an error.
 */
function loadAgents(pluginDir: string, workspaceDir: string, pluginAgents: PluginAgentEntry[]): AgentDef[] {
  const agents: AgentDef[] = [];
  const seenIds = new Set<string>();

  // 1. Load hand-authored overrides from .opencode/agent/ (when present)
  const opencodeAgentDir = resolve(workspaceDir, '.opencode', 'agent');
  const opencodeAgentFiles = listAgentFiles(opencodeAgentDir);
  if (opencodeAgentFiles.length > 0) {
    for (const file of opencodeAgentFiles) {
      const filePath = join(opencodeAgentDir, file);
      const content = readFileSync(filePath, 'utf-8');
      if (content.includes(GENERATED_MARKER)) {
        continue;
      }
      const { frontmatter, body } = parseFrontmatter(content);

      const agentId = file.replace('.md', '');
      seenIds.add(agentId);

      // plugin.jsonc entries sharing this ID are already covered — the
      // workspace file wins (step 2 below skips them via seenIds).
      const pluginEntry = pluginAgents.find(a => a.id === agentId);

      let role: AgentRole = 'subagent';
      if (frontmatter.mode === 'primary') {
        role = 'primary';
      }

      const permissions: AgentPermissions = {
        write: frontmatter.tools?.write ?? false,
        edit: frontmatter.tools?.edit ?? false,
        bash: frontmatter.tools?.bash ?? false,
        mcp: frontmatter.tools?.['mcp*'] ?? false,
      };

      agents.push({
        id: agentId,
        name: pluginEntry?.name ?? agentId,
        description: frontmatter.description ?? pluginEntry?.description ?? '',
        role,
        permissions,
        promptFile: pluginEntry?.file ?? `src/agents/${file}`,
        promptContent: body,
        model: frontmatter.model,
        temperature: frontmatter.temperature,
      });
    }
  }

  // 2. Add plugin.jsonc agents NOT covered by .opencode/agent/
  for (const a of pluginAgents) {
    // Skip if the ID was already loaded from a workspace file
    if (seenIds.has(a.id)) continue;

    // Try to read prompt content from the plugin's own agent files
    const promptPath = join(pluginDir, a.file);
    let promptContent = '';
    let sourceFrontmatter: OpenCodeFrontmatter = {};
    if (existsSync(promptPath)) {
      const raw = readFileSync(promptPath, 'utf-8');
      const { frontmatter, body } = parseFrontmatter(raw);
      sourceFrontmatter = frontmatter;
      promptContent = body;
    }

    const permissions: AgentPermissions = {
      write: sourceFrontmatter.tools?.write ?? false,
      edit: sourceFrontmatter.tools?.edit ?? false,
      bash: sourceFrontmatter.tools?.bash ?? false,
      mcp: sourceFrontmatter.tools?.mcp ?? sourceFrontmatter.tools?.['mcp*'] ?? false,
    };

    agents.push({
      id: a.id,
      name: a.name,
      description: a.description,
      role: sourceFrontmatter.mode === 'primary' ? 'primary' : 'subagent',
      permissions,
      promptFile: a.file,
      promptContent,
      model: sourceFrontmatter.model,
      temperature: sourceFrontmatter.temperature,
    });
  }

  return agents;
}

// ============================================================================
// Load MCP servers from opencode.jsonc
// ============================================================================

/**
 * Candidate file names for the MCP definition, in priority order.
 *
 * The repository tracks only `opencode.jsonc.example` — a portable template
 * whose commands use placeholders instead of machine paths. A real
 * `opencode.jsonc` (the user's own, with local paths filled in) always wins
 * when present.
 */
export const MCP_CONFIG_CANDIDATES = ['opencode.jsonc', 'opencode.jsonc.example'] as const;

/**
 * Resolve which MCP definition file to read.
 *
 * Real configuration beats the template: every candidate name is searched
 * across all directories before moving to the next name. Within one name,
 * directories are tried in the order given (workspace before plugin root, so a
 * user's own config overrides the one shipped inside the package).
 *
 * @param dirs Directories to search, most specific first
 * @returns    The first existing path, or null when nothing matches
 */
export function resolveMCPConfigPath(dirs: string[]): string | null {
  for (const name of MCP_CONFIG_CANDIDATES) {
    for (const dir of dirs) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) {
        return candidate;
      }
    }
  }
  return null;
}

function loadMCPServers(configPath: string | null): MCPServerDef[] {
  if (!configPath) {
    return [];
  }

  const config = parseJsoncFile(configPath) as { mcp?: Record<string, unknown> };
  const servers: MCPServerDef[] = [];

  if (config.mcp) {
    for (const [id, serverRaw] of Object.entries(config.mcp)) {
      if (isDangerousKey(id)) continue;
      const s = serverRaw as Record<string, unknown>;

      let transport: 'local' | 'remote' = 'local';
      if (s.type === 'remote' || (s.url && !s.command)) {
        transport = 'remote';
      }

      servers.push({
        id,
        transport,
        command: Array.isArray(s.command) ? s.command.map(String) : undefined,
        url: typeof s.url === 'string' ? s.url : undefined,
        environment: (s.environment as Record<string, string>) ?? undefined,
        enabled: s.enabled !== false,
      });
    }
  }

  return servers;
}

// ============================================================================
// Main loader
// ============================================================================

export interface LoaderOptions {
  /** Root directory of the oh-my-patent project (contains plugin.jsonc) */
  pluginDir: string;
  /** Root directory of the patents workspace (contains opencode.jsonc, .opencode/) */
  workspaceDir?: string;
}

/**
 * Package version is the single source (DEC-6). `plugin.jsonc` is a fallback
 * for fixtures that ship a definition without a package manifest.
 */
function readPackageVersion(pluginDir: string, fallback: string): string {
  const pkgPath = join(pluginDir, 'package.json');
  if (!existsSync(pkgPath)) return fallback;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version?: unknown };
    return typeof pkg.version === 'string' && pkg.version.length > 0 ? pkg.version : fallback;
  } catch {
    return fallback;
  }
}

export async function loadPortableDef(options: LoaderOptions): Promise<PortableDef> {
  const { pluginDir } = options;
  // Never default to the package parent. A global install's parent is
  // `node_modules`, and files would be resolved there (REQ-008). Callers that
  // have a patent workspace pass it explicitly; otherwise stay inside pluginDir.
  const workspaceDir = options.workspaceDir ?? pluginDir;

  // 1. Parse plugin.jsonc
  const pluginJsoncPath = join(pluginDir, 'plugin.jsonc');
  const plugin = parseJsoncFile(pluginJsoncPath) as {
    name: string;
    version: string;
    agents?: PluginAgentEntry[];
    skills?: { id: string; name: string; file: string }[];
    commands?: { id: string; command: string; description: string; file: string }[];
    config?: Record<string, unknown>;
  };

  // 2. Load agents (workspace .opencode/agent/ overrides, plugin.jsonc fills)
  const agents = loadAgents(pluginDir, workspaceDir, plugin.agents ?? []);

  // 3. Load skills
  const skills: SkillDef[] = (plugin.skills ?? []).map(s => {
    const skillPath = join(pluginDir, s.file);
    return {
      id: s.id,
      name: s.name,
      promptFile: s.file,
      promptContent: existsSync(skillPath) ? readFileSync(skillPath, 'utf-8') : undefined,
    };
  });

  // 4. Load commands
  const commands: CommandDef[] = (plugin.commands ?? []).map(c => {
    const commandPath = join(pluginDir, c.file);
    return {
      id: c.id,
      name: c.command,
      description: c.description,
      promptFile: c.file,
      promptContent: existsSync(commandPath) ? readFileSync(commandPath, 'utf-8') : undefined,
    };
  });

  // 5. Load MCP servers — a real opencode.jsonc anywhere beats the shipped
  //    .example template, so a clean clone yields the template's servers
  //    instead of an empty list.
  const mcpConfigPath = resolveMCPConfigPath([workspaceDir, pluginDir]);
  const mcpServers = loadMCPServers(mcpConfigPath);

  // 6. Config schema - use null-prototype and filter dangerous keys to prevent pollution
  const config: PluginConfig = Object.create(null);
  if (plugin.config) {
    for (const [key, value] of Object.entries(plugin.config)) {
      if (isDangerousKey(key)) continue;
      const v = value as Record<string, unknown>;
      (config as Record<string, unknown>)[key] = {
        type: (v.type as 'string' | 'number' | 'boolean') ?? 'string',
        default: v.default,
        enum: v.enum as string[] | undefined,
        description: (v.description as string) ?? '',
      };
    }
  }

  return {
    name: plugin.name,
    version: readPackageVersion(pluginDir, plugin.version),
    agents,
    skills,
    commands,
    mcpServers,
    config,
  };
}
