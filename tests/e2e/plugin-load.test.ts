import { describe, test, expect } from 'vitest';
import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
// REQ-015: use the shared stateful stripper. The previous regex-based copy
// truncated any string literal containing `//` (e.g. an `https://` URL).
import { stripJsonComments } from '../../src/core/jsonc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('E2E: Plugin Load', () => {
  test('plugin.jsonc is valid JSON', () => {
    const pluginPath = join(__dirname, '../../plugin.jsonc');
    expect(existsSync(pluginPath)).toBe(true);
    const content = readFileSync(pluginPath, 'utf-8');
    const jsonContent = stripJsonComments(content);
    expect(() => JSON.parse(jsonContent)).not.toThrow();
  });

  test('all agent files exist', () => {
    const pluginPath = join(__dirname, '../../plugin.jsonc');
    const content = readFileSync(pluginPath, 'utf-8');
    const jsonContent = stripJsonComments(content);
    const plugin = JSON.parse(jsonContent);

    const missingAgents: string[] = [];
    for (const agent of plugin.agents || []) {
      const agentPath = join(__dirname, '../..', agent.file);
      if (!existsSync(agentPath)) {
        missingAgents.push(agent.file);
      }
    }

    expect(missingAgents).toHaveLength(0);
  });

  test('all skill files exist', () => {
    const pluginPath = join(__dirname, '../../plugin.jsonc');
    const content = readFileSync(pluginPath, 'utf-8');
    const jsonContent = stripJsonComments(content);
    const plugin = JSON.parse(jsonContent);

    const missingSkills: string[] = [];
    for (const skill of plugin.skills || []) {
      const skillPath = join(__dirname, '../..', skill.file);
      if (!existsSync(skillPath)) {
        missingSkills.push(skill.file);
      }
    }

    expect(missingSkills).toHaveLength(0);
  });

  test('all command files exist', () => {
    const pluginPath = join(__dirname, '../../plugin.jsonc');
    const content = readFileSync(pluginPath, 'utf-8');
    const jsonContent = stripJsonComments(content);
    const plugin = JSON.parse(jsonContent);

    const missingCommands: string[] = [];
    for (const cmd of plugin.commands || []) {
      const cmdPath = join(__dirname, '../..', cmd.file);
      if (!existsSync(cmdPath)) {
        missingCommands.push(cmd.file);
      }
    }

    expect(missingCommands).toHaveLength(0);
  });

  test('package.json has required fields', () => {
    const pkgPath = join(__dirname, '../../package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    expect(pkg.name).toBe('oh-my-patent');
    expect(pkg.version).toBeDefined();
    expect(pkg.main).toBeDefined();
  });

  test('source TypeScript compiles without errors', { timeout: 30000 }, () => {
    const result = execFileSync(process.execPath, [join(__dirname, '../../node_modules/typescript/bin/tsc'), '--noEmit'], {
      cwd: join(__dirname, '../..'),
      stdio: 'pipe',
      encoding: 'utf-8'
    });
    expect(result).toBeDefined();
  });
});
