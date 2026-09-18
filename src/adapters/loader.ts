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
import {
  PortableDef, AgentDef, AgentRole, AgentPermissions,
  SkillDef, CommandDef, MCPServerDef, PluginConfig
} from './types.js';

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

function parseYamlFrontmatter(raw: string): OpenCodeFrontmatter {
  const fm: OpenCodeFrontmatter = {};

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('description:')) {
      fm.description = trimmed.slice('description:'.length).trim();
    } else if (trimmed.startsWith('mode:')) {
      fm.mode = trimmed.slice('mode:'.length).trim();
    } else if (trimmed.startsWith('model:')) {
      fm.model = trimmed.slice('model:'.length).trim();
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
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
        (fm.tools as Record<string, boolean>)[k] = tMatch[2] === 'true';
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
        if (p === '__proto__' || p === 'constructor' || p === 'prototype') continue;
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

function parseJsonc(filePath: string): unknown {
  const content = readFileSync(filePath, 'utf-8');

  // Stateful comment removal that respects string literals
  let result = '';
  let i = 0;
  let inString = false;

  while (i < content.length) {
    const ch = content[i];
    const next = content[i + 1];

    if (inString) {
      result += ch;
      if (ch === '\\') {
        i++;
        if (i < content.length) {
          result += content[i];
        }
      } else if (ch === '"') {
        inString = false;
      }
      i++;
    } else if (ch === '"') {
      inString = true;
      result += ch;
      i++;
    } else if (ch === '/' && next === '/') {
      // Single-line comment — skip to end of line
      while (i < content.length && content[i] !== '\n') {
        i++;
      }
    } else if (ch === '/' && next === '*') {
      // Multi-line comment — skip to */
      i += 2;
      while (i < content.length - 1 && !(content[i] === '*' && content[i + 1] === '/')) {
        i++;
      }
      i += 2;
    } else {
      result += ch;
      i++;
    }
  }

  return JSON.parse(result);
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
 * Dedup key: plugin.jsonc agents use short IDs (archimedes, patent-architect)
 * while .opencode/agent/ uses kebab-case (patent-innovation-architect).
 * We treat .opencode/agent/ as the authoritative source; plugin.jsonc
 * agents are only added if they have no counterpart there.
 */
const PLUGIN_TO_OPENCODE_MAP: Record<string, string> = {
  // archimedes is now the canonical ID in both plugin.jsonc and .opencode/agent/
  // patent-architect, patent-scout, patent-evaluator, patent-writer, patent-reviewer
  // from plugin.jsonc have NO exact .opencode/agent/ counterpart by ID,
  // so they'll be added as standalone agents.
};

function loadAgents(pluginDir: string, pluginAgents: PluginAgentEntry[]): AgentDef[] {
  const agents: AgentDef[] = [];
  const seenIds = new Set<string>();

  // 1. Load from .opencode/agent/ (authoritative, has full prompt + frontmatter)
  const opencodeAgentDir = resolve(pluginDir, '..', '.opencode', 'agent');
  if (existsSync(opencodeAgentDir)) {
    const files = readdirSync(opencodeAgentDir).filter((f: string) => f.endsWith('.md'));

    for (const file of files) {
      const filePath = join(opencodeAgentDir, file);
      const content = readFileSync(filePath, 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);

      const agentId = file.replace('.md', '');
      seenIds.add(agentId);

      // Check if this agent maps to a plugin.jsonc entry
      const pluginEntry = pluginAgents.find(a => {
        if (a.id === agentId) return true;
        // Check reverse mapping
        const mapped = PLUGIN_TO_OPENCODE_MAP[a.id];
        return mapped === agentId;
      });

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
    // Skip if the ID was already loaded, or if it maps to an opencode agent
    if (seenIds.has(a.id)) continue;
    const mappedOpencodeId = PLUGIN_TO_OPENCODE_MAP[a.id];
    if (mappedOpencodeId && seenIds.has(mappedOpencodeId)) continue;

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

function loadMCPServers(opencodeConfigPath: string): MCPServerDef[] {
  if (!existsSync(opencodeConfigPath)) {
    return [];
  }

  const config = parseJsonc(opencodeConfigPath) as { mcp?: Record<string, unknown> };
  const servers: MCPServerDef[] = [];

  if (config.mcp) {
    for (const [id, serverRaw] of Object.entries(config.mcp)) {
      if (id === '__proto__' || id === 'constructor' || id === 'prototype') continue;
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

export async function loadPortableDef(options: LoaderOptions): Promise<PortableDef> {
  const { pluginDir } = options;
  const workspaceDir = options.workspaceDir ?? resolve(pluginDir, '..');

  // 1. Parse plugin.jsonc
  const pluginJsoncPath = join(pluginDir, 'plugin.jsonc');
  const plugin = parseJsonc(pluginJsoncPath) as {
    name: string;
    version: string;
    agents?: PluginAgentEntry[];
    skills?: { id: string; name: string; file: string }[];
    commands?: { id: string; command: string; description: string; file: string }[];
    config?: Record<string, unknown>;
  };

  // 2. Load agents (merge plugin.jsonc + .opencode/agent/)
  const agents = loadAgents(pluginDir, plugin.agents ?? []);

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

  // 5. Load MCP servers from workspace opencode.jsonc
  const opencodeConfigPath = join(workspaceDir, 'opencode.jsonc');
  const mcpServers = loadMCPServers(opencodeConfigPath);

  // 6. Config schema - use null-prototype and filter dangerous keys to prevent pollution
  const DANGEROUS = new Set(['__proto__', 'constructor', 'prototype']);
  const config: PluginConfig = Object.create(null);
  if (plugin.config) {
    for (const [key, value] of Object.entries(plugin.config)) {
      if (DANGEROUS.has(key)) continue;
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
    version: plugin.version,
    agents,
    skills,
    commands,
    mcpServers,
    config,
  };
}
