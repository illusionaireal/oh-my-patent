/**
 * Claude Code Adapter
 *
 * Generates configuration files for Anthropic's Claude Code CLI from
 * the portable oh-my-patent definitions.
 *
 * Outputs:
 * - CLAUDE.md              → Project instructions with agent routing, commands, workflow rules
 * - .claude/agents/*.md    → Per-agent prompt files (full prompt content, no OpenCode frontmatter)
 * - .mcp.json             → Project MCP server configuration
 * - .claude/skills/<id>/SKILL.md → Portable workflow skills
 */

import { join, resolve } from 'path';
import {
  existsSync, readFileSync, readdirSync, rmdirSync, rmSync,
} from 'fs';
import {
  PortableDef, AgentDef, CommandDef, SkillDef, MCPServerDef, ToolAdapter, GenerateResult, UninstallResult
} from '../types.js';
import { WORKFLOW_STAGE_ORDER } from '../../core/workflow.js';
import { stampGenerated } from '../generated-marker.js';
import { ensureUnlinkedPath } from '../../core/path-safety.js';

// ============================================================================
// Claude Code adapter
// ============================================================================

export class ClaudeCodeAdapter implements ToolAdapter {
  readonly name = 'claude-code';

  async generate(def: PortableDef, config: Record<string, unknown>): Promise<GenerateResult> {
    const files = new Map<string, string>();
    const instructions: string[] = [];

    // 1. Generate per-agent prompt files under .claude/agents/
    const enabledMcpServerIds = def.mcpServers.filter(s => s.enabled).map(s => s.id);
    for (const agent of def.agents) {
      const promptContent = this.generateAgentPrompt(agent, enabledMcpServerIds);
      const agentFileName = `${agent.id}.md`;
      files.set(join('.claude', 'agents', agentFileName), promptContent);
    }

    // 2. Generate project-scoped MCP configuration.
    const settingsContent = this.generateSettings(def.mcpServers);
    files.set('.mcp.json', settingsContent);

    for (const skill of def.skills) {
      files.set(join('.claude', 'skills', skill.id, 'SKILL.md'), this.generateSkill(skill));
    }

    // 3. Generate per-command files under .claude/commands/
    for (const cmd of def.commands) {
      const commandContent = this.generateCommandFile(cmd, config);
      const commandFileName = `${cmd.id}.md`;
      files.set(join('.claude', 'commands', commandFileName), commandContent);
    }

    // 4. Generate CLAUDE.md
    const claudeMdContent = this.generateClaudeMd(def, config);
    files.set('CLAUDE.md', claudeMdContent);

    instructions.push(
      'Copy the generated files to your project root directory:',
      '  - CLAUDE.md → <project-root>/CLAUDE.md',
      '  - .claude/ → <project-root>/.claude/',
      '  - .mcp.json → <project-root>/.mcp.json (merge with existing servers)',
      '',
      'Then run Claude Code in the project directory:',
      '  claude --agent archimedes',
      '',
      'Use slash commands like /patent-new, /patent-search, etc.',
      'Or describe your intent in natural language (Chinese or English).',
    );

    return { files, instructions };
  }

  // ==========================================================================
  // Agent prompt generation
  // ==========================================================================

  private generateAgentPrompt(agent: AgentDef, enabledMcpServerIds: string[] = []): string {
    const parts: string[] = [];

    // Build YAML frontmatter as first thing in the file (Claude Code requirement)
    const fm = this.buildAgentFrontmatter(agent, enabledMcpServerIds);
    parts.push('---');
    for (const [key, value] of Object.entries(fm)) {
      parts.push(`${key}: ${typeof value === 'string' ? JSON.stringify(value) : value}`);
    }
    parts.push('---');
    parts.push('');

    // Use the full prompt content if available (from .opencode/agent/ or plugin agent .md)
    if (agent.promptContent.trim()) {
      // Add HTML comment hints after the YAML frontmatter (for human readability)
      parts.push(this.buildAgentCommentHeader(agent));
      parts.push('');
      parts.push(agent.promptContent.trim());
    } else {
      // Fallback: generate from metadata only
      parts.push(`# Agent: ${agent.name}`);
      parts.push('');
      parts.push('## Role');
      parts.push('');
      parts.push(agent.description);
      parts.push('');
      parts.push('## Permissions');
      parts.push('');
      const perms: string[] = [];
      if (agent.permissions.write) perms.push('Can write files');
      if (agent.permissions.edit) perms.push('Can edit files');
      if (agent.permissions.bash) perms.push('Can execute shell commands');
      if (agent.permissions.mcp) perms.push('Can use MCP tools');
      if (perms.length === 0) perms.push('Read-only (no file write/edit/bash)');
      parts.push(`- ${perms.join('; ')}`);
      parts.push('');

      if (agent.role === 'primary') {
        parts.push('## Invocation');
        parts.push('');
        parts.push('This is the primary orchestrator agent. It coordinates sub-agents via the Agent tool.');
      } else {
        parts.push('## Invocation');
        parts.push('');
        parts.push('This agent is invoked as a sub-agent by the orchestrator via the Agent tool.');
        parts.push(`Use: Agent with subagent_type matching "${agent.id}"`);
      }
    }

    return stampGenerated(parts.join('\n'));
  }

  /**
   * Build YAML frontmatter for Claude Code agent recognition.
   * Must appear at the very top of the .md file as `--- ... ---`.
   *
   * Verified against the official Claude Code sub-agents documentation
   * (code.claude.com/docs/en/sub-agents, REQ-030):
   * - `name` IS an official required frontmatter field (with `description`);
   *   identity comes only from `name`, "the filename doesn't have to match".
   * - `tools` is a comma-separated allowlist; omitting it inherits every
   *   tool, and `mcp__<server>` / `mcp__<server>__*` patterns grant every
   *   tool of a named MCP server.
   *
   * The tools list is therefore derived precisely from `permissions` —
   * never `"*"`, which handed every agent the full tool surface (REQ-030).
   */
  private buildAgentFrontmatter(agent: AgentDef, enabledMcpServerIds: string[]): Record<string, string | boolean> {
    const fm: Record<string, string | boolean> = {};
    fm.name = agent.id;
    fm.description = agent.description;

    const tools = ['Read', 'Glob', 'Grep'];
    // Delegation is available when the primary agent is the main thread
    // (claude --agent archimedes), not when invoked as a nested subagent.
    if (agent.role === 'primary') tools.push('Agent');
    if (agent.permissions.write) tools.push('Write');
    if (agent.permissions.edit) tools.push('Edit');
    if (agent.permissions.bash) tools.push('Bash');
    // Official wildcard pattern: one entry per enabled MCP server covers all
    // of that server's tools without inheriting the rest of the session.
    if (agent.permissions.mcp) {
      for (const serverId of enabledMcpServerIds) {
        tools.push(`mcp__${serverId}`);
      }
    }
    fm.tools = tools.join(', ');

    if (agent.model) {
      fm.model = agent.model;
    }

    return fm;
  }

  /**
   * Build a concise HTML comment header for human readability.
   * This appears after the YAML frontmatter, not as frontmatter itself.
   */
  private buildAgentCommentHeader(agent: AgentDef): string {
    const lines: string[] = [];

    lines.push(`<!-- Agent: ${agent.id} | Role: ${agent.role} -->`);

    const permHints: string[] = [];
    if (agent.permissions.write) permHints.push('write');
    if (agent.permissions.edit) permHints.push('edit');
    if (agent.permissions.bash) permHints.push('bash');
    if (agent.permissions.mcp) permHints.push('mcp');
    if (permHints.length > 0) {
      lines.push(`<!-- Permissions: ${permHints.join(', ')} -->`);
    }

    if (agent.role === 'primary') {
      lines.push('<!-- Primary orchestrator — coordinates sub-agents via the Agent tool -->');
    } else {
      lines.push(`<!-- Sub-agent — invoked via Agent tool with subagent_type="${agent.id}" -->`);
    }

    return lines.join('\n');
  }

  // ==========================================================================
  // Command file generation
  // ==========================================================================

  private generateCommandFile(cmd: CommandDef, config: Record<string, unknown>): string {
    const jurisdiction = (config.jurisdiction as string) ?? 'CN';
    const projectDir = (config.projectDir as string) ?? 'projects';
    const parts: string[] = [];

    // YAML frontmatter for ccb command discovery
    parts.push('---');
    parts.push(`description: ${JSON.stringify(cmd.description)}`);
    parts.push('---');
    parts.push('');
    // Use the original command prompt content if available
    if (cmd.promptContent?.trim()) {
      parts.push(cmd.promptContent.trim());
    } else {
      parts.push(`Execute the \`${cmd.name}\` workflow step.`);
      parts.push('');
      parts.push('## Steps');
      parts.push('');
      parts.push(`1. Identify the current project or prompt the user to select one from \`${projectDir}/\`.`);
      parts.push('2. Load the workflow state and determine the next appropriate action.');
      parts.push('3. Invoke the relevant patent agents to complete the task.');
      parts.push('4. Save all outputs to the project `references/` directory.');
      parts.push('');
      parts.push('## Output');
      parts.push('');
      parts.push('- Confirmation of the action taken.');
      parts.push('- Any generated files or updated state.');
    }

    return stampGenerated(parts.join('\n'));
  }

  // ==========================================================================
  // Settings (MCP) generation
  // ==========================================================================
  private generateSettings(mcpServers: MCPServerDef[]): string {
    const mcpServersConfig: Record<string, unknown> = {};

    for (const server of mcpServers) {
      if (!server.enabled) continue;

      if (server.transport === 'local' && server.command) {
        mcpServersConfig[server.id] = {
          command: server.command[0],
          args: server.command.slice(1),
          ...(server.environment && { env: server.environment }),
        };
      } else if (server.transport === 'remote' && server.url) {
        mcpServersConfig[server.id] = {
          type: 'http',
          url: server.url,
        };
      }
    }

    const settings = {
      mcpServers: mcpServersConfig,
    };

    return JSON.stringify(settings, null, 2);
  }

  // ==========================================================================
  // CLAUDE.md generation
  // ==========================================================================

  private generateClaudeMd(def: PortableDef, config: Record<string, unknown>): string {
    const jurisdiction = (config.jurisdiction as string) ?? 'CN';
    const projectDir = (config.projectDir as string) ?? './projects';

    const lines: string[] = [];

    lines.push('# CLAUDE.md');
    lines.push('');
    lines.push('This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.');
    lines.push('');

    // --- Project Overview ---
    lines.push('## Project Overview');
    lines.push('');
    lines.push('This is a patent disclosure drafting workflow system (专利交底书撰写工作流)');
    lines.push('that orchestrates multi-agent collaboration to generate patent disclosure documents.');
    lines.push('The system uses a core repository for workflow configuration and separate project');
    lines.push('repositories for each patent topic.');
    lines.push('');

    // --- Commands ---
    lines.push('## Commands');
    lines.push('');
    lines.push('### Workflow Execution');
    lines.push('- Start a patent workflow by describing your intent in natural language');
    lines.push('- The orchestrator agent will route your request automatically');
    lines.push('');
    lines.push('### Slash Commands');
    lines.push('');

    for (const cmd of def.commands) {
      lines.push(`- \`${cmd.name}\` - ${cmd.description}`);
    }
    lines.push('');

    lines.push('### Development Workflow');
    lines.push("- Create new projects via the workflow (don't manually create project directories)");
    lines.push(`- Projects follow the naming pattern: \`${projectDir}/{NN}-{topic_slug}/\` where NN is a 2-digit incrementing number`);
    lines.push('- Each project directory is an independent Git repository');
    lines.push('');

    // --- Architecture ---
    lines.push('## Architecture');
    lines.push('');
    lines.push('### Repository Structure');
    lines.push('- **Core repository** (`/patents`): Contains workflow configuration, agent definitions, templates - does not store project deliverables');
    lines.push(`- **Project repositories** (\`${projectDir}/{NN}-{topic_slug}/\`): Each patent topic has its own Git repo containing MAIN.md, conversation.md, references/, figures/`);
    lines.push('');

    // --- Agent System ---
    lines.push('### Multi-Agent System');
    lines.push('');
    lines.push('The workflow uses specialized agents defined in `.claude/agents/`:');
    lines.push('');

    const primaryAgents = def.agents.filter(a => a.role === 'primary');
    const subAgents = def.agents.filter(a => a.role === 'subagent');

    if (primaryAgents.length > 0) {
      lines.push('**Orchestration**:');
      for (const a of primaryAgents) {
        lines.push(`- \`${a.id}\` - ${a.description}`);
      }
      lines.push('');
    }

    if (subAgents.length > 0) {
      lines.push('**Specialist Agents** (invoked via Agent tool):');
      for (const a of subAgents) {
        lines.push(`- \`${a.id}\` - ${a.description}`);
      }
      lines.push('');
    }

    // --- Sub-agent invocation ---
    lines.push('### Sub-Agent Invocation');
    lines.push('');
    lines.push('To invoke a specialist agent, use the Agent tool:');
    lines.push('```');
    lines.push('Agent(');
    lines.push('  description: "3-5 word summary",');
    lines.push('  prompt: "Full task description for the agent",');
    lines.push('  subagent_type: "<agent-id>"');
    lines.push(')');
    lines.push('```');
    lines.push('');

    // --- Workflow ---
    lines.push('### Workflow State Machine');
    lines.push('');
    lines.push('```');
    // 由 WorkflowStage 派生，避免与状态机漂移（REQ-012）
    lines.push(WORKFLOW_STAGE_ORDER.join(' → '));
    lines.push('```');
    lines.push('');
    lines.push('- QA_LOOP can transition back to DRAFT');
    lines.push('- FINAL_REVIEW can transition back to QA_LOOP');
    lines.push('- State is persisted in `<project>/.patent/state.json`');
    lines.push('');

    // --- Skills ---
    if (def.skills.length > 0) {
      lines.push('### Skills');
      lines.push('');
      for (const s of def.skills) {
        lines.push(`- \`${s.id}\` - ${s.name}`);
      }
      lines.push('');
    }

    // --- Writing Standards ---
    lines.push('## Writing Standards');
    lines.push('');
    lines.push('When working with patent disclosure Markdown files:');
    lines.push('');
    lines.push('- **Headings**: Use `#` for document title only, `##` for main sections, `###` for subsections');
    lines.push('- **Paragraphs**: Leave blank lines between paragraphs, avoid merging multiple paragraphs');
    lines.push('- **Formulas**: Use Word-compatible linear format: `$S_(load)$` not `$S_{\\mathrm{load}}$`');
    lines.push('- **Avoid**: `\\operatorname`, `\\mathrm`, `\\left`, `\\right`, `\\!` in formulas');
    lines.push('- **Figures**: Keep image tags and captions on separate lines');
    lines.push('- **Section structure**: Follow the standard patent disclosure template (零 through 十一)');
    lines.push('- **References**: Use `[R#]` notation with References section at end');
    lines.push('');

    // --- Agent Constraints ---
    lines.push('## Agent Constraints');
    lines.push('');
    lines.push('- **No simulation**: Agents must invoke real sub-agents via the Agent tool, not simulate their outputs');
    lines.push('- **Output persistence**: All agent outputs must be saved to `references/` with standardized filenames');
    lines.push('- **Workflow phases**: Strict sequence - brainstorm → draft → QA/argue loop → finalize');
    lines.push('- **Exit conditions**: QA/argue loop requires 2 consecutive rounds with no new issues');
    lines.push('- **File naming**: `references/brainstorm_round{r}_{agent-id}.md`, `references/argue_round{r}_{agent-id}.md`');
    lines.push('');

    // --- Path System ---
    lines.push('### Path System');
    lines.push('');
    lines.push('The system includes a decision path tracking mechanism (`.brainstorm/` directory in projects):');
    lines.push('- Records brainstorming decisions for auditability and backtracking');
    lines.push('- Supports branching to explore alternative innovation directions');
    lines.push('- Enables session recovery from historical nodes');
    lines.push('- Main path file: `.brainstorm/path.json`');
    lines.push('- Node files: `.brainstorm/nodes/round-{n}.json`');
    lines.push('');

    // --- MCP ---
    lines.push('### MCP Integration');
    lines.push('');
    lines.push('Configured MCP servers (in `.mcp.json`):');
    for (const server of def.mcpServers.filter(s => s.enabled)) {
      lines.push(`- \`${server.id}\``);
    }
    lines.push('');

    // --- Jurisdiction config ---
    lines.push('### Jurisdiction Configuration');
    lines.push('');
    lines.push(`- Default jurisdiction: **${jurisdiction}**`);
    lines.push('- Supported: CN (中国), US (United States), PCT (International)');
    lines.push('');

    // --- Commit Style ---
    lines.push('## Commit Style');
    lines.push('');
    lines.push('Use Conventional Commits:');
    lines.push('- `feat: ...` for new features');
    lines.push('- `docs: ...` for documentation changes');
    lines.push('- `chore: ...` for maintenance tasks');
    lines.push('- `init: ...` for initializations');
    lines.push('');

    return lines.join('\n');
  }

  getGeneratedFilePaths(def: PortableDef): string[] {
    const paths: string[] = [];
    for (const agent of def.agents) {
      paths.push(join('.claude', 'agents', `${agent.id}.md`));
    }
    paths.push('.mcp.json');
    for (const skill of def.skills) {
      paths.push(join('.claude', 'skills', skill.id, 'SKILL.md'));
    }
    for (const cmd of def.commands) {
      paths.push(join('.claude', 'commands', `${cmd.id}.md`));
    }
    paths.push('CLAUDE.md');
    return paths;
  }

  /**
   * Directories scanned by `adapt install --prune`.
   *
   * Deliberately independent of `def`: the point is to find files an older
   * definition produced, so the list cannot be derived from the current one.
   * `CLAUDE.md` and `.mcp.json` are single files that every run
   * overwrites, so they need no pruning and are not listed here.
   */
  getManagedDirectories(): string[] {
    return [
      join('.claude', 'agents'),
      join('.claude', 'commands'),
      join('.claude', 'skills'),
    ];
  }

  async uninstall(def: PortableDef, workspaceDir: string): Promise<UninstallResult> {
    const filesRemoved: string[] = [];
    const filesSkipped: string[] = [];
    const { homedir } = await import('os');

    // Remove exact generated files only — never readdir + unlink an entire directory
    const removeExact = (fullPath: string, label: string, baseDir = workspaceDir) => {
      try {
        ensureUnlinkedPath(baseDir, fullPath);
        if (existsSync(fullPath)) {
          rmSync(fullPath, { force: true });
          filesRemoved.push(label);
        }
      } catch {
        filesSkipped.push(label);
      }
    };

    // 1. Workspace files
    for (const relPath of this.getGeneratedFilePaths(def)) {
      try {
        ensureUnlinkedPath(workspaceDir, resolve(workspaceDir, relPath));
      } catch {
        filesSkipped.push(relPath);
        continue;
      }
      // .mcp.json is shared configuration. Remove it only when it is still
      // exactly our generated default; custom servers/credentials belong to
      // the user and must survive uninstall.
      if (relPath === '.mcp.json' && existsSync(resolve(workspaceDir, relPath))) {
        if (readFileSync(resolve(workspaceDir, relPath), 'utf-8') !== this.generateSettings(def.mcpServers)) {
          filesSkipped.push(relPath);
          continue;
        }
      }
      removeExact(resolve(workspaceDir, relPath), relPath);
    }

    // 2. Global ccb files — `~/.claude-best/` is a NON-standard directory:
    //    `adapt install` copies agent/command .md files there so they are
    //    reachable from any cwd when running via ccb (Claude Code Best); see
    //    the "For ccb (Claude Code Best)" block in adaptInstall (src/cli.ts).
    //    Uninstall mirrors that copy — it only removes the exact files this
    //    plugin wrote, and only rmdir's the directories when empty (REQ-031).
    const ccbAgentsDir = resolve(homedir(), '.claude-best', 'agents');
    const ccbCommandsDir = resolve(homedir(), '.claude-best', 'commands');
    for (const agent of def.agents) {
      removeExact(resolve(ccbAgentsDir, `${agent.id}.md`), join('~/.claude-best/agents', `${agent.id}.md`), homedir());
    }
    for (const cmd of def.commands) {
      removeExact(resolve(ccbCommandsDir, `${cmd.id}.md`), join('~/.claude-best/commands', `${cmd.id}.md`), homedir());
    }

    // 3. Safe empty-dir cleanup (only if the directory is now empty)
    const tryRmdir = (dir: string, label: string, baseDir = workspaceDir) => {
      try {
        ensureUnlinkedPath(baseDir, dir);
        if (existsSync(dir) && readdirSync(dir).length === 0) {
          rmdirSync(dir);
          filesRemoved.push(label);
        }
      } catch {
        filesSkipped.push(label);
      }
    };

    tryRmdir(resolve(workspaceDir, '.claude', 'agents'), '.claude/agents/');
    tryRmdir(resolve(workspaceDir, '.claude', 'commands'), '.claude/commands/');
    for (const skill of def.skills) {
      tryRmdir(resolve(workspaceDir, '.claude', 'skills', skill.id), `.claude/skills/${skill.id}/`);
    }
    tryRmdir(resolve(workspaceDir, '.claude', 'skills'), '.claude/skills/');
    tryRmdir(resolve(workspaceDir, '.claude'), '.claude/');
    tryRmdir(resolve(homedir(), '.claude-best', 'agents'), '~/.claude-best/agents/', homedir());
    tryRmdir(resolve(homedir(), '.claude-best', 'commands'), '~/.claude-best/commands/', homedir());

    return {
      filesRemoved,
      filesSkipped,
      success: filesSkipped.length === 0,
      message: `Uninstalled ${this.name}. Removed ${filesRemoved.length}, skipped ${filesSkipped.length}.`,
    };
  }
  private generateSkill(skill: SkillDef): string {
    const content = skill.promptContent?.trim() || skill.description || skill.name;
    if (/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(content)) {
      return stampGenerated(`${content}\n`);
    }
    return stampGenerated([
      '---',
      `name: ${skill.id}`,
      `description: ${JSON.stringify(skill.description || skill.name)}`,
      '---', '', content, '',
    ].join('\n'));
  }
}
