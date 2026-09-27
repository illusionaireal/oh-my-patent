import { afterEach, describe, expect, test } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { checkRuntime, getMcpStatuses, writeMcpConfig } from '../../src/core/init-checker.js';

describe('init checker MCP configuration', () => {
  const tempDirs: string[] = [];

  function createWorkspace(): string {
    const workspace = mkdtempSync(join(tmpdir(), 'oh-my-patent-init-'));
    tempDirs.push(workspace);
    return workspace;
  }

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('preserves an existing temporary-name directory and cleans only its own probe', () => {
    const workspace = createWorkspace();
    const existing = join(workspace, '.init-check-tmp');
    mkdirSync(existing);
    writeFileSync(join(existing, 'user.txt'), 'user data');
    const result = checkRuntime(workspace);
    expect(result.find(check => check.name === 'workspace-writable')?.status).toBe('ready');
    expect(readFileSync(join(existing, 'user.txt'), 'utf8')).toBe('user data');
    expect(readdirSync(workspace)).toEqual(['.init-check-tmp']);
  });

  test('updates codex.json in a Codex workspace and preserves existing settings', () => {
    const workspace = createWorkspace();
    mkdirSync(join(workspace, '.codex'));
    writeFileSync(join(workspace, 'codex.json'), JSON.stringify({
      model: 'gpt-5',
      mcpServers: { existing: { command: 'existing-server', args: [] } },
    }));

    const result = writeMcpConfig(workspace, 'google_scholar', {
      command: 'mcp-google-scholar',
      args: [],
    });
    const saved = JSON.parse(readFileSync(join(workspace, 'codex.json'), 'utf-8'));

    expect(result.configPath).toBe(join(workspace, 'codex.json'));
    expect(saved.model).toBe('gpt-5');
    expect(saved.mcpServers.existing.command).toBe('existing-server');
    expect(saved.mcpServers.google_scholar.command).toBe('mcp-google-scholar');
    expect(existsSync(join(workspace, 'opencode.jsonc'))).toBe(false);
    expect(getMcpStatuses(workspace).find(status => status.id === 'google_scholar')?.configured).toBe(true);
  });

  test('parses URLs safely and writes OpenCode MCP format under the mcp key', () => {
    const workspace = createWorkspace();
    const configPath = join(workspace, 'opencode.jsonc');
    writeFileSync(configPath, `{
      // Existing remote service must survive the update.
      "theme": "dark",
      "mcp": {
        "existing": { "type": "remote", "url": "https://example.com/mcp" }
      }
    }`);

    writeMcpConfig(workspace, 'patsnap_search', {
      type: 'streamableHttp',
      url: 'https://connect.example/mcp?apikey=test',
    });
    const saved = JSON.parse(readFileSync(configPath, 'utf-8'));

    expect(saved.theme).toBe('dark');
    expect(saved.mcp.existing.url).toBe('https://example.com/mcp');
    expect(saved.mcp.patsnap_search).toEqual({
      type: 'remote',
      url: 'https://connect.example/mcp?apikey=test',
    });
    expect(getMcpStatuses(workspace).find(status => status.id === 'patsnap_search')?.configured).toBe(true);
  });

  test('refuses to overwrite invalid existing configuration', () => {
    const workspace = createWorkspace();
    const configPath = join(workspace, 'opencode.jsonc');
    const invalidConfig = '{ "mcp": { invalid } }';
    writeFileSync(configPath, invalidConfig);

    expect(() => writeMcpConfig(workspace, 'google_scholar', {
      command: 'mcp-google-scholar',
      args: [],
    })).toThrow(/Cannot update invalid configuration/);
    expect(readFileSync(configPath, 'utf-8')).toBe(invalidConfig);
  });

  test('writes Claude MCP settings without changing unrelated fields', () => {
    const workspace = createWorkspace();
    const settingsDir = join(workspace, '.claude');
    mkdirSync(settingsDir);
    writeFileSync(join(settingsDir, 'settings.json'), JSON.stringify({ permissions: { allow: ['Read'] } }));

    writeMcpConfig(workspace, 'google_scholar', {
      command: 'mcp-google-scholar',
      args: [],
    });
    const saved = JSON.parse(readFileSync(join(settingsDir, 'settings.json'), 'utf-8'));

    expect(saved.permissions).toEqual({ allow: ['Read'] });
    const mcp = JSON.parse(readFileSync(join(workspace, '.mcp.json'), 'utf-8'));
    expect(mcp.mcpServers.google_scholar.command).toBe('mcp-google-scholar');
  });
});
