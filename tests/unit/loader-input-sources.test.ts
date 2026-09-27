import { describe, expect, test, beforeAll, afterAll } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { loadPortableDef, resolveMCPConfigPath } from '../../src/adapters/loader';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '../..');

describe('MCP definition source', () => {
  let scratch: string;

  beforeAll(() => {
    scratch = mkdtempSync(join(tmpdir(), 'omp-mcp-src-'));
  });

  afterAll(() => {
    if (existsSync(scratch)) {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  test('should prefer a real opencode.jsonc over the shipped template', () => {
    const workspaceDir = join(scratch, 'ws-real');
    mkdirSync(workspaceDir, { recursive: true });
    writeFileSync(join(workspaceDir, 'opencode.jsonc'), '{"mcp":{}}', 'utf-8');

    expect(resolveMCPConfigPath([workspaceDir, repoRoot])).toBe(join(workspaceDir, 'opencode.jsonc'));
  });

  test('should fall back to the tracked template when no real config exists', () => {
    const workspaceDir = join(scratch, 'ws-empty');
    mkdirSync(workspaceDir, { recursive: true });

    expect(resolveMCPConfigPath([workspaceDir, repoRoot])).toBe(join(repoRoot, 'opencode.jsonc.example'));
  });

  test('should return null when neither a config nor a template exists', () => {
    const workspaceDir = join(scratch, 'ws-none');
    const pluginDir = join(scratch, 'plugin-none');
    mkdirSync(workspaceDir, { recursive: true });
    mkdirSync(pluginDir, { recursive: true });

    expect(resolveMCPConfigPath([workspaceDir, pluginDir])).toBeNull();
  });

  test('should expose all servers from the template and contain no machine path', async () => {
    const workspaceDir = join(scratch, 'ws-default');
    mkdirSync(workspaceDir, { recursive: true });

    const def = await loadPortableDef({ pluginDir: repoRoot, workspaceDir });

    // The regression this guards: before the template existed, a clean clone
    // produced zero MCP servers because opencode.jsonc was never committed.
    expect(def.mcpServers).toHaveLength(8);
    expect(def.mcpServers.map(server => server.id)).toContain('google_scholar');

    // Placeholders only — the release check rejects drive letters.
    expect(JSON.stringify(def.mcpServers)).not.toMatch(/[A-Za-z]:[\\/]/);
  });
});

describe('agent definition source', () => {
  let scratch: string;

  beforeAll(() => {
    scratch = mkdtempSync(join(tmpdir(), 'omp-agent-src-'));
  });

  afterAll(() => {
    if (existsSync(scratch)) {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  test('should load every declared agent when the workspace has no .opencode/agent/', async () => {
    const workspaceDir = join(scratch, 'ws-plain');
    mkdirSync(workspaceDir, { recursive: true });

    const def = await loadPortableDef({ pluginDir: repoRoot, workspaceDir });

    // Degrading to plugin.jsonc + src/agents/*.md is the normal path on a
    // clean clone, and it must still cover the full declaration.
    expect(def.agents).toHaveLength(14);
    expect(def.agents.map(agent => agent.id)).toContain('patent-init-sentinel');
    expect(def.agents.every(agent => agent.promptContent && agent.promptContent.length > 0)).toBe(true);
  });

  test('should let a workspace .opencode/agent/ entry override the tracked source', async () => {
    const workspaceDir = join(scratch, 'ws-override');
    const agentDir = join(workspaceDir, '.opencode', 'agent');
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(
      join(agentDir, 'archimedes.md'),
      '---\ndescription: Workspace override\nmode: primary\n---\n\nOVERRIDE-BODY\n',
      'utf-8',
    );

    const def = await loadPortableDef({ pluginDir: repoRoot, workspaceDir });
    const archimedes = def.agents.find(agent => agent.id === 'archimedes');

    expect(archimedes?.description).toBe('Workspace override');
    expect(archimedes?.promptContent).toContain('OVERRIDE-BODY');
    expect(archimedes?.role).toBe('primary');
    // The override replaces one entry rather than adding a duplicate.
    expect(def.agents).toHaveLength(14);
  });
});

describe('package version source (DEC-6)', () => {
  let scratch: string;

  beforeAll(() => {
    scratch = mkdtempSync(join(tmpdir(), 'omp-ver-src-'));
  });

  afterAll(() => {
    if (existsSync(scratch)) {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  test('package.json wins over a stale plugin.jsonc version', async () => {
    const pluginDir = join(scratch, 'plugin');
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(join(pluginDir, 'plugin.jsonc'), JSON.stringify({
      name: 'oh-my-patent',
      version: '0.0.1',
      agents: [],
      skills: [],
      commands: [],
      config: {},
    }));
    writeFileSync(join(pluginDir, 'package.json'), JSON.stringify({ version: '9.9.9' }));

    const def = await loadPortableDef({ pluginDir, workspaceDir: pluginDir });
    expect(def.version).toBe('9.9.9');
  });

  test('falls back to plugin.jsonc when package.json has no version', async () => {
    const pluginDir = join(scratch, 'plugin-fallback');
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(join(pluginDir, 'plugin.jsonc'), JSON.stringify({
      name: 'oh-my-patent',
      version: '0.3.1',
      agents: [],
      skills: [],
      commands: [],
    }));
    writeFileSync(join(pluginDir, 'package.json'), '{}');

    const def = await loadPortableDef({ pluginDir, workspaceDir: pluginDir });
    expect(def.version).toBe('0.3.1');
  });
});
