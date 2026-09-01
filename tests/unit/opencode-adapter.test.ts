import { describe, expect, test } from 'vitest';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { OpenCodeAdapter } from '../../src/adapters/opencode/index';
import { loadPortableDef } from '../../src/adapters/loader';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pluginDir = join(__dirname, '../..');
const workspaceDir = join(pluginDir, '..');

describe('OpenCodeAdapter', () => {
  test('generates native agents, commands, and skills', async () => {
    const def = await loadPortableDef({ pluginDir, workspaceDir });
    const result = await new OpenCodeAdapter().generate(def, {});

    expect(result.files.has(join('.opencode', 'agent', 'archimedes.md'))).toBe(true);
    expect(result.files.has(join('.opencode', 'command', 'archimedes.md'))).toBe(true);
    expect(result.files.has(join('.opencode', 'command', 'patent-new.md'))).toBe(true);
    expect(result.files.has(join('.opencode', 'skills', 'brainstorm-path', 'SKILL.md'))).toBe(true);
    expect(result.files.has('opencode.json')).toBe(false);
    expect(result.files.has('opencode.jsonc')).toBe(false);
    expect(result.files.has('AGENTS.md')).toBe(false);
  });

  test('writes valid OpenCode frontmatter and routes commands to Archimedes', async () => {
    const def = await loadPortableDef({ pluginDir, workspaceDir });
    const result = await new OpenCodeAdapter().generate(def, {});
    const archimedes = result.files.get(join('.opencode', 'agent', 'archimedes.md')) ?? '';
    const command = result.files.get(join('.opencode', 'command', 'patent-new.md')) ?? '';

    expect(archimedes).toMatch(/^---\ndescription: .+\nmode: primary\npermission:/);
    expect(archimedes).toContain('task: allow');
    expect(command).toMatch(/^---\ndescription: .+\nagent: archimedes\n---\n/);
    expect(command).toContain('/patent-new');
    expect(command).toContain('$ARGUMENTS');
  });

  test('tracks exactly the generated files', async () => {
    const def = await loadPortableDef({ pluginDir, workspaceDir });
    const adapter = new OpenCodeAdapter();
    const result = await adapter.generate(def, {});

    expect(adapter.getGeneratedFilePaths(def)).toEqual([...result.files.keys()]);
  });

  test('uninstalls only generated files and preserves custom OpenCode config', async () => {
    const def = await loadPortableDef({ pluginDir, workspaceDir });
    const adapter = new OpenCodeAdapter();
    const generated = await adapter.generate(def, {});
    const target = mkdtempSync(join(tmpdir(), 'oh-my-patent-opencode-'));
    const customAgent = join(target, '.opencode', 'agent', 'custom-agent.md');

    try {
      for (const [relPath, content] of generated.files) {
        const fullPath = join(target, relPath);
        mkdirSync(dirname(fullPath), { recursive: true });
        writeFileSync(fullPath, content, 'utf-8');
      }
      writeFileSync(customAgent, '# Custom agent\n', 'utf-8');

      const result = await adapter.uninstall(def, target);

      expect(result.success).toBe(true);
      expect(existsSync(join(target, '.opencode', 'agent', 'archimedes.md'))).toBe(false);
      expect(existsSync(customAgent)).toBe(true);
      expect(existsSync(join(target, '.opencode', 'command'))).toBe(false);
      expect(existsSync(join(target, '.opencode', 'skills'))).toBe(false);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  test('preserves a modified generated file during uninstall', async () => {
    const def = await loadPortableDef({ pluginDir, workspaceDir });
    const adapter = new OpenCodeAdapter();
    const target = mkdtempSync(join(tmpdir(), 'oh-my-patent-opencode-'));
    const agentPath = join(target, '.opencode', 'agent', 'archimedes.md');

    try {
      mkdirSync(dirname(agentPath), { recursive: true });
      writeFileSync(agentPath, 'user-owned content\n', 'utf-8');

      const result = await adapter.uninstall(def, target);

      expect(result.success).toBe(false);
      expect(result.filesSkipped).toContain(join('.opencode', 'agent', 'archimedes.md'));
      expect(existsSync(agentPath)).toBe(true);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });
});
