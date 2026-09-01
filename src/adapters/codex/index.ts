/**
 * Codex Adapter (OpenAI Codex CLI)
 *
 * Generates configuration files for OpenAI Codex CLI from
 * the portable oh-my-patent definitions.
 *
 * Key differences from Claude Code:
 * - AGENTS.md is the primary Codex entrypoint
 * - Per-agent, per-command, and skill markdown files are generated under .codex/
 *   as a prompt catalog for manual invocation and future Codex agent support
 * - No portable native sub-agent tool — orchestration is flattened into AGENTS.md
 * - Permissions map to approvalMode (suggest / auto-edit / full-auto)
 * - MCP server format is nearly identical, just in a different file
 *
 * Outputs:
 * - AGENTS.md              → Combined project instructions (routing + workflow rules)
 * - codex.json             → Machine-readable manifest for wrappers/tooling
 * - .codex/agents/*.md     → Specialist prompt catalog
 * - .codex/commands/*.md   → Slash-command prompt catalog
 * - .codex/skills/<skill-id>/SKILL.md → Skill prompt catalog
 */

import { join, resolve } from 'path';
import {
  existsSync, readdirSync, rmdirSync, rmSync,
} from 'fs';
import {
  PortableDef, AgentDef, CommandDef, SkillDef, ToolAdapter, GenerateResult
} from '../types.js';

// ============================================================================
// Codex adapter
// ============================================================================

export class CodexAdapter implements ToolAdapter {
  readonly name = 'codex';
  private readonly pluginName = 'oh-my-patent';

  async generate(def: PortableDef, config: Record<string, unknown>): Promise<GenerateResult> {
    const files = new Map<string, string>();
    const instructions: string[] = [];
    const pluginRoot = join('plugins', this.pluginName);

    // 1. Generate prompt catalogs first so Codex users can inspect/copy exact prompts.
    for (const agent of def.agents) {
      files.set(join('.codex', 'agents', `${agent.id}.md`), this.generateAgentPrompt(agent));
      files.set(join(pluginRoot, 'skills', agent.id, 'SKILL.md'), this.generateAgentSkill(agent));
    }

    for (const command of def.commands) {
      files.set(join('.codex', 'commands', `${command.id}.md`), this.generateCommandPrompt(command));
      const skillId = def.agents.some(agent => agent.id === command.id)
        ? `${command.id}-command`
        : command.id;
      files.set(join(pluginRoot, 'skills', skillId, 'SKILL.md'), this.generateCommandSkill(command, skillId));
    }

    for (const skill of def.skills) {
      files.set(join('.codex', 'skills', skill.id, 'SKILL.md'), this.generateSkillPrompt(skill));
      files.set(join(pluginRoot, 'skills', skill.id, 'SKILL.md'), this.generateSkillPrompt(skill));
    }

    files.set(join(pluginRoot, 'skills', this.pluginName, 'SKILL.md'), this.generateOverviewSkill(def));
    files.set(join(pluginRoot, '.codex-plugin', 'plugin.json'), this.generatePluginJson(def));
    files.set(join(pluginRoot, 'agents', 'openai.yaml'), this.generatePluginAgentYaml());
    files.set(join('.agents', 'plugins', 'marketplace.json'), this.generateMarketplaceJson());

    // 2. Generate codex.json
    const codexJsonContent = this.generateCodexJson(def, config);
    files.set('codex.json', codexJsonContent);
    files.set(join(pluginRoot, 'codex.json'), codexJsonContent);

    // 3. Generate AGENTS.md
    const agentsMdContent = this.generateAgentsMd(def, config);
    files.set('AGENTS.md', agentsMdContent);
    files.set(join(pluginRoot, 'AGENTS.md'), agentsMdContent);

    instructions.push(
      'Copy the generated files to your project root directory:',
      '  - AGENTS.md  → <project-root>/AGENTS.md',
      '  - codex.json → <project-root>/codex.json',
      '  - .codex/    → <project-root>/.codex/',
      '  - .agents/plugins/marketplace.json → <project-root>/.agents/plugins/marketplace.json',
      `  - plugins/${this.pluginName}/ → <project-root>/plugins/${this.pluginName}/`,
      '',
      'Register the local Codex marketplace:',
      '  codex plugin marketplace add <project-root>',
      '',
      'Then run Codex CLI in the project directory:',
      '  codex',
      '',
      'Use natural language or slash-command text such as /patent-new, /patent-search, etc.',
      'Specialist prompts are available in .codex/agents/<agent-id>.md.',
      '',
      'Note: Codex CLI does not expose a portable native sub-agent API across versions.',
      'The orchestration logic is embedded in AGENTS.md, and codex.json is a manifest for wrappers.',
    );

    return { files, instructions };
  }

  // ==========================================================================
  // Prompt catalog generation
  // ==========================================================================

  private generateAgentPrompt(agent: AgentDef): string {
    const lines: string[] = [];
    lines.push(`# ${agent.name}`);
    lines.push('');
    lines.push('<!-- Generated for Codex by oh-my-patent. -->');
    lines.push(`<!-- Agent: ${agent.id} | Role: ${agent.role} -->`);
    lines.push(`<!-- Permissions: ${formatPermissions(agent.permissions)} -->`);
    if (agent.model) lines.push(`<!-- model: ${agent.model} -->`);
    if (agent.temperature !== undefined) lines.push(`<!-- temperature: ${agent.temperature} -->`);
    lines.push('');
    lines.push('## Description');
    lines.push('');
    lines.push(agent.description || agent.name);
    lines.push('');
    lines.push('## Codex Invocation');
    lines.push('');
    if (agent.role === 'primary') {
      lines.push('Use this prompt as the primary workflow orchestrator. In Codex, prefer starting from natural language in the workspace root so AGENTS.md can route the request.');
    } else {
      lines.push('Use this prompt as a specialist context block when Codex cannot invoke a named sub-agent directly. The orchestrator must persist any specialist output under `references/` before moving to the next workflow phase.');
    }
    lines.push('');
    lines.push('## Instructions');
    lines.push('');
    lines.push(agent.promptContent.trim() || agent.description || agent.name);
    lines.push('');
    return lines.join('\n');
  }

  private generateCommandPrompt(command: CommandDef): string {
    const lines: string[] = [];
    lines.push(`# ${command.name}`);
    lines.push('');
    lines.push('<!-- Generated for Codex by oh-my-patent. -->');
    lines.push(`<!-- Command: ${command.id} -->`);
    lines.push('');
    lines.push(command.description);
    lines.push('');
    lines.push('## Usage In Codex');
    lines.push('');
    lines.push(`When the user writes \`${command.name}\`, follow this command prompt in the current workspace and obey AGENTS.md.`);
    lines.push('');
    lines.push('## Prompt');
    lines.push('');
    lines.push(command.promptContent?.trim() || command.description);
    lines.push('');
    return lines.join('\n');
  }

  private generateSkillPrompt(skill: SkillDef): string {
    const content = skill.promptContent?.trim() || [
      `# ${skill.name}`,
      '',
      '<!-- Generated fallback skill file for Codex by oh-my-patent. -->',
      '',
      skill.description || skill.name,
    ].join('\n');

    if (/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(content)) {
      return content + '\n';
    }

    const description = skill.description || `Use when the patent workflow needs the ${skill.name} capability.`;
    return [
      '---',
      `name: ${skill.id}`,
      `description: ${JSON.stringify(description)}`,
      '---',
      '',
      content,
      '',
    ].join('\n');
  }

  private generateCommandSkill(command: CommandDef, skillId = command.id): string {
    return [
      '---',
      `name: ${skillId}`,
      `description: Use when the user invokes ${command.name} or asks to ${command.description}.`,
      '---',
      '',
      `# ${command.name}`,
      '',
      'Follow AGENTS.md and execute this oh-my-patent slash-command workflow in the current workspace.',
      '',
      command.promptContent?.trim() || command.description,
      '',
    ].join('\n');
  }

  private generateAgentSkill(agent: AgentDef): string {
    return [
      '---',
      `name: ${agent.id}`,
      `description: Use when the patent workflow needs the ${agent.name} specialist role: ${agent.description}`,
      '---',
      '',
      `# ${agent.name}`,
      '',
      'Act as this oh-my-patent specialist role. Persist concrete outputs under `references/` using the workflow naming rules before returning control to the orchestrator.',
      '',
      agent.promptContent.trim() || agent.description || agent.name,
      '',
    ].join('\n');
  }

  private generateOverviewSkill(def: PortableDef): string {
    const commands = def.commands.map(c => `- \`${c.name}\`: ${c.description}`).join('\n');
    const agents = def.agents.map(a => `- \`${a.id}\`: ${a.description}`).join('\n');
    return [
      '---',
      'name: oh-my-patent',
      'description: Use for patent disclosure drafting workflows, including /patent-new, /patent-search, brainstorming, drafting, review, and patent diagrams.',
      '---',
      '',
      '# oh-my-patent',
      '',
      'Use this skill when the user wants to run the patent disclosure drafting workflow in Codex.',
      '',
      '## Commands',
      '',
      commands,
      '',
      '## Specialist Roles',
      '',
      agents,
      '',
      '## Runtime Rules',
      '',
      '- Read `AGENTS.md` first and follow the project workflow state machine.',
      '- Store project deliverables under `projects/{NN}-{topic_slug}/`, not in the core repository root.',
      '- Persist specialist outputs in `references/` with standardized filenames.',
      '- Do not simulate unavailable specialists; when native agent delegation is unavailable, explicitly execute the matching specialist skill context and persist the result.',
      '',
    ].join('\n');
  }

  private generatePluginJson(def: PortableDef): string {
    const pluginJson = {
      name: this.pluginName,
      version: def.version,
      description: 'Patent disclosure drafting workflow with specialist prompts, commands, and brainstorm path tracking for Codex.',
      author: {
        name: 'oh-my-patent',
      },
      homepage: 'https://github.com/illusionaireal/oh-my-patent',
      repository: 'https://github.com/illusionaireal/oh-my-patent',
      license: 'MIT',
      keywords: ['patent', 'disclosure', 'workflow', 'codex'],
      skills: './skills/',
      interface: {
        displayName: 'oh-my-patent',
        shortDescription: 'Patent disclosure drafting workflow for Codex',
        longDescription: 'Generate patent disclosure projects with prior-art search, brainstorming, drafting, review, QA loops, and diagram generation.',
        developerName: 'oh-my-patent',
        category: 'Productivity',
        capabilities: ['Interactive', 'Write'],
        defaultPrompt: [
          '新建一个专利交底书项目',
          '执行专利检索并生成交底书',
          '审核当前专利交底书',
        ],
        brandColor: '#0F766E',
      },
    };

    return JSON.stringify(pluginJson, null, 2) + '\n';
  }

  private generatePluginAgentYaml(): string {
    return [
      'interface:',
      '  display_name: "oh-my-patent"',
      '  short_description: "Patent disclosure drafting workflow"',
      '',
    ].join('\n');
  }

  private generateMarketplaceJson(): string {
    const marketplace = {
      name: 'oh-my-patent-local',
      interface: {
        displayName: 'oh-my-patent Local',
      },
      plugins: [
        {
          name: this.pluginName,
          source: {
            source: 'local',
            path: `./plugins/${this.pluginName}`,
          },
          policy: {
            installation: 'AVAILABLE',
            authentication: 'ON_INSTALL',
          },
          category: 'Productivity',
        },
      ],
    };

    return JSON.stringify(marketplace, null, 2) + '\n';
  }

  // ==========================================================================
  // codex.json generation
  // ==========================================================================

  private generateCodexJson(def: PortableDef, config: Record<string, unknown>): string {
    const jurisdiction = (config.jurisdiction as string) ?? 'CN';

    // Agents section — inline instructions from promptContent
    const agentsConfig: Record<string, unknown> = {};
    for (const agent of def.agents) {
      const agentEntry: Record<string, unknown> = {
        name: agent.name,
        instructions: agent.promptContent?.trim() || agent.description,
        promptFile: codexPath('.codex', 'agents', `${agent.id}.md`),
        role: agent.role,
        approvalMode: mapPermissionsToApprovalMode(agent.permissions),
      };
      if (agent.model) {
        agentEntry.model = agent.model;
      }
      agentsConfig[agent.id] = agentEntry;
    }

    // MCP servers — nearly identical format to Claude Code
    const mcpServersConfig: Record<string, unknown> = {};
    for (const server of def.mcpServers) {
      if (!server.enabled) continue;

      if (server.transport === 'local' && server.command) {
        mcpServersConfig[server.id] = {
          command: server.command[0],
          args: server.command.slice(1),
          ...(server.environment && { env: server.environment }),
        };
      } else if (server.transport === 'remote' && server.url) {
        mcpServersConfig[server.id] = {
          type: 'url',
          url: server.url,
        };
      }
    }

    const codexJson: Record<string, unknown> = {
      $schema: 'https://oh-my-patent.local/schemas/codex-adapter.json',
      generatedBy: 'oh-my-patent',
      adapter: 'codex',
      model: 'o4-mini',
      provider: 'openai',
      approvalMode: 'suggest',
      sandbox: false,
      instructionsFile: 'AGENTS.md',
      promptCatalog: {
        agentsDir: '.codex/agents',
        commandsDir: '.codex/commands',
        skillsDir: '.codex/skills',
      },
      mcpServers: mcpServersConfig,
      agents: agentsConfig,
      commands: Object.fromEntries(def.commands.map(command => [command.id, {
        name: command.name,
        description: command.description,
        promptFile: codexPath('.codex', 'commands', `${command.id}.md`),
      }])),
      skills: Object.fromEntries(def.skills.map(skill => [skill.id, {
        name: skill.name,
        promptFile: codexPath('.codex', 'skills', skill.id, 'SKILL.md'),
      }])),
    };

    return JSON.stringify(codexJson, null, 2);
  }

  // ==========================================================================
  // AGENTS.md generation
  // ==========================================================================

  private generateAgentsMd(def: PortableDef, config: Record<string, unknown>): string {
    const jurisdiction = (config.jurisdiction as string) ?? 'CN';
    const projectDir = (config.projectDir as string) ?? './projects';

    const lines: string[] = [];

    lines.push('# AGENTS.md');
    lines.push('');
    lines.push('Project instructions for OpenAI Codex CLI — patent disclosure drafting workflow (专利交底书撰写工作流).');
    lines.push('');

    // --- Project Overview ---
    lines.push('## Project Overview');
    lines.push('');
    lines.push('This is a patent disclosure drafting workflow system that orchestrates');
    lines.push('multi-agent collaboration to generate patent disclosure documents.');
    lines.push('The system uses a core repository for workflow configuration and separate project');
    lines.push('repositories for each patent topic.');
    lines.push('');

    // --- Commands ---
    lines.push('## Commands');
    lines.push('');
    lines.push('### Workflow Execution');
    lines.push('- Start a patent workflow by describing your intent in natural language');
    lines.push('- The orchestrator agent will route your request automatically');
    lines.push('- Codex reads `AGENTS.md` as the primary instruction file');
    lines.push('- Specialist prompts are generated in `.codex/agents/<agent-id>.md` for manual or wrapper-driven invocation');
    lines.push('- `codex.json` is a machine-readable manifest for wrappers; do not assume every Codex CLI version supports `codex --agent`');
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
    lines.push('Codex uses `AGENTS.md` as the primary project instruction file.');
    lines.push('oh-my-patent also generates a `.codex/` prompt catalog and `codex.json` manifest');
    lines.push('so wrappers or newer Codex builds can locate specialist prompts without losing');
    lines.push('the portable workflow definition.');
    lines.push('');
    lines.push('Codex version compatibility rule: do not rely on a portable native sub-agent');
    lines.push('API being available. If the active Codex session supports delegation, use it.');
    lines.push('If it does not, execute the specialist role in the current session using the');
    lines.push('matching prompt from `.codex/agents/`, persist its output to `references/`,');
    lines.push('and clearly label which specialist role produced the material.');
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
      lines.push('**Specialist Agents** (prompt files in `.codex/agents/`, manifest entries in `codex.json`):');
      for (const a of subAgents) {
        lines.push(`- \`${a.id}\` - ${a.description}`);
      }
      lines.push('');
    }

    // --- Agent Routing Rules ---
    lines.push('### Agent Routing Rules');
    lines.push('');
    lines.push('When acting as the archimedes orchestrator, follow these routing rules:');
    lines.push('');
    lines.push('| User Intent | Route To |');
    lines.push('|-------------|----------|');
    lines.push('| New patent project | Create project dir + use `patent-landscape-analyst` prompt |');
    lines.push('| Search prior art | Use `patent-landscape-analyst` prompt |');
    lines.push('| Generate innovation points | Use `patent-innovation-architect` prompt |');
    lines.push('| Evaluate patentability | Use `patentability-evaluator` prompt |');
    lines.push('| Draft disclosure | Use `patent-disclosure-writer` prompt |');
    lines.push('| Review disclosure | Use `patent-disclosure-reviewer` prompt |');
    lines.push('| Security review | Use `patent-security-engineer` prompt |');
    lines.push('| Compliance review | Use `patent-product-compliance-analyst` prompt |');
    lines.push('| Continue workflow | Read `.patent/state.json` and route to current stage |');
    lines.push('');

    // --- Workflow ---
    lines.push('### Workflow State Machine');
    lines.push('');
    lines.push('```');
    lines.push('INIT → RESEARCH → BRAINSTORM_R1 → BRAINSTORM_R2 → DRAFT → QA_LOOP → FINAL_REVIEW → DIAGRAM → DONE');
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
        lines.push(`- \`${s.id}\` - ${s.name} (\`.codex/skills/${s.id}/SKILL.md\`)`);
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
    lines.push('- **No simulation**: Agents must produce real outputs, not simulate what other agents would say');
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
    lines.push('Configured MCP servers (in `codex.json`):');
    for (const server of def.mcpServers.filter(s => s.enabled)) {
      lines.push(`- \`${server.id}\``);
    }
    lines.push('');

    // --- Codex generated files ---
    lines.push('### Codex Generated Files');
    lines.push('');
    lines.push('- `AGENTS.md`: primary Codex project instructions');
    lines.push('- `codex.json`: machine-readable oh-my-patent manifest for adapters/wrappers');
    lines.push('- `.codex/agents/*.md`: specialist role prompts');
    lines.push('- `.codex/commands/*.md`: slash-command prompt definitions');
    lines.push('- `.codex/skills/*/SKILL.md`: skill instructions available to Codex sessions');
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
    const pluginRoot = join('plugins', this.pluginName);

    for (const agent of def.agents) {
      paths.push(join('.codex', 'agents', `${agent.id}.md`));
      paths.push(join(pluginRoot, 'skills', agent.id, 'SKILL.md'));
    }
    for (const command of def.commands) {
      paths.push(join('.codex', 'commands', `${command.id}.md`));
      paths.push(join(pluginRoot, 'skills', command.id, 'SKILL.md'));
    }
    for (const skill of def.skills) {
      paths.push(join('.codex', 'skills', skill.id, 'SKILL.md'));
      paths.push(join(pluginRoot, 'skills', skill.id, 'SKILL.md'));
    }
    paths.push(join(pluginRoot, 'skills', this.pluginName, 'SKILL.md'));
    paths.push(join(pluginRoot, '.codex-plugin', 'plugin.json'));
    paths.push(join(pluginRoot, 'agents', 'openai.yaml'));
    paths.push(join('.agents', 'plugins', 'marketplace.json'));
    paths.push('codex.json');
    paths.push(join(pluginRoot, 'codex.json'));
    paths.push('AGENTS.md');
    paths.push(join(pluginRoot, 'AGENTS.md'));
    return paths;
  }

  async uninstall(def: PortableDef, workspaceDir: string): Promise<{ filesRemoved: string[]; filesSkipped: string[]; success: boolean; message: string }> {
    const filesRemoved: string[] = [];
    const filesSkipped: string[] = [];

    const removeExact = (fullPath: string, label: string) => {
      try {
        if (existsSync(fullPath)) {
          rmSync(fullPath, { force: true });
          filesRemoved.push(label);
        }
      } catch {
        filesSkipped.push(label);
      }
    };

    // 1. Remove exact generated files only
    for (const relPath of this.getGeneratedFilePaths(def)) {
      removeExact(resolve(workspaceDir, relPath), relPath);
    }

    // 2. Safe empty-dir cleanup (only if empty)
    const tryRmdir = (dir: string, label: string) => {
      try {
        if (existsSync(dir) && readdirSync(dir).length === 0) {
          rmdirSync(dir);
          filesRemoved.push(label);
        }
      } catch {
        filesSkipped.push(label);
      }
    };

    const pluginRoot = join('plugins', this.pluginName);
    tryRmdir(resolve(workspaceDir, pluginRoot, 'skills'), `${pluginRoot}/skills/`);
    tryRmdir(resolve(workspaceDir, pluginRoot, '.codex-plugin'), `${pluginRoot}/.codex-plugin/`);
    tryRmdir(resolve(workspaceDir, pluginRoot, 'agents'), `${pluginRoot}/agents/`);
    tryRmdir(resolve(workspaceDir, pluginRoot), `${pluginRoot}/`);
    tryRmdir(resolve(workspaceDir, '.codex', 'agents'), '.codex/agents/');
    tryRmdir(resolve(workspaceDir, '.codex', 'commands'), '.codex/commands/');
    tryRmdir(resolve(workspaceDir, '.codex', 'skills'), '.codex/skills/');
    tryRmdir(resolve(workspaceDir, '.codex'), '.codex/');
    tryRmdir(resolve(workspaceDir, '.agents', 'plugins'), '.agents/plugins/');
    tryRmdir(resolve(workspaceDir, '.agents'), '.agents/');

    return {
      filesRemoved,
      filesSkipped,
      success: filesSkipped.length === 0,
      message: `Uninstalled ${this.name}. Removed ${filesRemoved.length}, skipped ${filesSkipped.length}.`,
    };
  }
}

// ============================================================================
// Helpers
// ============================================================================

function mapPermissionsToApprovalMode(
  permissions: { write: boolean; edit: boolean; bash: boolean }
): string {
  if (permissions.bash) return 'full-auto';
  if (permissions.write || permissions.edit) return 'auto-edit';
  return 'suggest';
}

function formatPermissions(
  permissions: { write: boolean; edit: boolean; bash: boolean; mcp?: boolean }
): string {
  const enabled: string[] = [];
  if (permissions.write) enabled.push('write');
  if (permissions.edit) enabled.push('edit');
  if (permissions.bash) enabled.push('bash');
  if (permissions.mcp) enabled.push('mcp');
  return enabled.length > 0 ? enabled.join(', ') : 'read-only';
}

function codexPath(...parts: string[]): string {
  return parts.join('/');
}
