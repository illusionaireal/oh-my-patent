/**
 * OpenCode Adapter
 *
 * Generates native OpenCode agents, commands, and skills from the portable
 * oh-my-patent definitions.
 */

import { join, resolve } from 'path';
import { existsSync, readFileSync, readdirSync, rmdirSync, rmSync } from 'fs';
import {
  AgentDef,
  CommandDef,
  PortableDef,
  SkillDef,
  ToolAdapter,
  GenerateResult,
} from '../types.js';

export class OpenCodeAdapter implements ToolAdapter {
  readonly name = 'opencode';

  async generate(def: PortableDef, _config: Record<string, unknown>): Promise<GenerateResult> {
    const files = new Map<string, string>();

    for (const agent of def.agents) {
      files.set(join('.opencode', 'agent', `${agent.id}.md`), this.generateAgent(agent));
    }

    for (const command of def.commands) {
      files.set(join('.opencode', 'command', `${command.id}.md`), this.generateCommand(command));
    }

    for (const skill of def.skills) {
      files.set(join('.opencode', 'skills', skill.id, 'SKILL.md'), this.generateSkill(skill));
    }

    return {
      files,
      instructions: [
        'OpenCode configuration files generated:',
        '  - .opencode/agent/ → native agents',
        '  - .opencode/command/ → slash commands',
        '  - .opencode/skills/ → on-demand skills',
        '',
        'Then run OpenCode in the workspace and use /archimedes to start the workflow.',
      ],
    };
  }

  getGeneratedFilePaths(def: PortableDef): string[] {
    return [
      ...def.agents.map((agent) => join('.opencode', 'agent', `${agent.id}.md`)),
      ...def.commands.map((command) => join('.opencode', 'command', `${command.id}.md`)),
      ...def.skills.map((skill) => join('.opencode', 'skills', skill.id, 'SKILL.md')),
    ];
  }

  async uninstall(
    def: PortableDef,
    workspaceDir: string,
  ): Promise<{ filesRemoved: string[]; filesSkipped: string[]; success: boolean; message: string }> {
    const filesRemoved: string[] = [];
    const filesSkipped: string[] = [];

    for (const relPath of this.getGeneratedFilePaths(def)) {
      const fullPath = resolve(workspaceDir, relPath);
      try {
        if (existsSync(fullPath) && readFileSync(fullPath, 'utf-8') === this.fileContent(def, relPath)) {
          rmSync(fullPath, { force: true });
          filesRemoved.push(relPath);
        } else if (existsSync(fullPath)) {
          filesSkipped.push(relPath);
        }
      } catch {
        filesSkipped.push(relPath);
      }
    }

    const directories = [
      join(workspaceDir, '.opencode', 'agent'),
      join(workspaceDir, '.opencode', 'command'),
      ...def.skills.map((skill) => join(workspaceDir, '.opencode', 'skills', skill.id)),
      join(workspaceDir, '.opencode', 'skills'),
      join(workspaceDir, '.opencode'),
    ];
    for (const directory of directories) {
      try {
        if (existsSync(directory) && readdirSync(directory).length === 0) {
          rmdirSync(directory);
          filesRemoved.push(directory.slice(workspaceDir.length + 1));
        }
      } catch {
        filesSkipped.push(directory);
      }
    }

    return {
      filesRemoved,
      filesSkipped,
      success: filesSkipped.length === 0,
      message: `Uninstalled ${this.name}. Removed ${filesRemoved.length}, skipped ${filesSkipped.length}.`,
    };
  }

  private generateAgent(agent: AgentDef): string {
    const lines = [
      '---',
      `description: ${JSON.stringify(agent.description || agent.name)}`,
      `mode: ${agent.role}`,
      'permission:',
      `  edit: ${agent.permissions.write || agent.permissions.edit ? 'allow' : 'deny'}`,
      `  bash: ${agent.permissions.bash ? 'allow' : 'deny'}`,
      `  task: ${agent.role === 'primary' ? 'allow' : 'deny'}`,
      '  skill: allow',
    ];
    if (agent.model) lines.push(`model: ${JSON.stringify(agent.model)}`);
    if (agent.temperature !== undefined) lines.push(`temperature: ${agent.temperature}`);
    lines.push('---', '', agent.promptContent.trim() || agent.description || agent.name, '');
    return lines.join('\n');
  }

  private fileContent(def: PortableDef, relPath: string): string {
    const agent = def.agents.find((item) => relPath === join('.opencode', 'agent', `${item.id}.md`));
    if (agent) return this.generateAgent(agent);

    const command = def.commands.find((item) => relPath === join('.opencode', 'command', `${item.id}.md`));
    if (command) return this.generateCommand(command);

    const skill = def.skills.find((item) => relPath === join('.opencode', 'skills', item.id, 'SKILL.md'));
    if (skill) return this.generateSkill(skill);

    return '';
  }

  private generateCommand(command: CommandDef): string {
    const prompt = command.promptContent?.trim() || `Execute the ${command.name} workflow.`;
    return [
      '---',
      `description: ${JSON.stringify(command.description)}`,
      'agent: archimedes',
      '---',
      '',
      prompt,
      '',
      '## User Input',
      '',
      '$ARGUMENTS',
      '',
    ].join('\n');
  }

  private generateSkill(skill: SkillDef): string {
    const content = skill.promptContent?.trim() || `# ${skill.name}\n\n${skill.description || skill.name}`;
    if (/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(content)) return `${content}\n`;

    return [
      '---',
      `name: ${skill.id}`,
      `description: ${JSON.stringify(skill.description || `Use when the patent workflow needs ${skill.name}.`)}`,
      '---',
      '',
      content,
      '',
    ].join('\n');
  }
}
