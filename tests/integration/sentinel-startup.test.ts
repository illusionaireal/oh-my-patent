import { afterEach, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { loadPortableDef } from '../../src/adapters/loader.js';
import { ClaudeCodeAdapter } from '../../src/adapters/claude/index.js';
import { CodexAdapter } from '../../src/adapters/codex/index.js';
import { OpenCodeAdapter } from '../../src/adapters/opencode/index.js';
import { checkRuntimePath } from '../../src/adapters/check-runtime.js';
import { getMcpStatuses, writeMcpConfig, type InitCheckHost } from '../../src/core/init-checker.js';

const roots: string[] = [];
const hosts = ['claude-code', 'codex', 'opencode'] as const;
const adapters = [new ClaudeCodeAdapter(), new CodexAdapter(), new OpenCodeAdapter()];
function root(): string { const dir = mkdtempSync(join(tmpdir(), 'omp 哨兵 space-')); roots.push(dir); return dir; }
afterEach(() => { for (const dir of roots.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function execute(script: string, cwd: string, args: string[] = [], noPath = false) {
  return spawnSync(process.execPath, [script, '--json', ...args], {
    cwd, encoding: 'utf8', env: { ...process.env, ...(noPath ? { PATH: '' } : {}) },
  });
}
function mixedConfigs(workspace: string) {
  writeFileSync(join(workspace, '.mcp.json'), JSON.stringify({ mcpServers: { google_scholar: { command: 'fixture-claude' } } }));
  writeFileSync(join(workspace, 'codex.json'), JSON.stringify({ mcpServers: { uspto_patent: { command: 'fixture-codex' } } }));
  writeFileSync(join(workspace, 'opencode.jsonc'), JSON.stringify({ mcp: { semantic_scholar: { type: 'local', command: ['fixture-opencode'] } } }));
}

it.each(hosts)('runs the installed %s checker after relocation without a CLI or package tree', async host => {
  const workspace = root();
  const def = await loadPortableDef({ pluginDir: resolve('.'), workspaceDir: workspace });
  const adapter = adapters[hosts.indexOf(host)];
  const output = await adapter.generate(def, {});
  const path = checkRuntimePath(host);
  mkdirSync(dirname(join(workspace, path)), { recursive: true });
  writeFileSync(join(workspace, path), output.files.get(path)!);
  mixedConfigs(workspace);
  const moved = workspace + ' moved 中文'; renameSync(workspace, moved); roots.push(moved);
  const unrelated = root();
  const result = execute(join(moved, path), unrelated, ['--output', 'projects/example/references/init-report.json'], true);
  expect(result.status).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.workspaceDir ?? report.adapter).toBeDefined();
  expect(report.adapter).toBe({ 'claude-code': 'Claude Code', codex: 'Codex', opencode: 'OpenCode' }[host]);
  expect(report.mcpVerification).toBe('configuration_only');
  expect(report.timestamp).toMatch(/^\d{4}-/);
  expect(report.mcpStatuses.filter((item: { configured: boolean }) => item.configured).map((item: { id: string }) => item.id))
    .toEqual([{ 'claude-code': 'google_scholar', codex: 'uspto_patent', opencode: 'semantic_scholar' }[host]]);
  expect(report.ready).toBe(false); // Empty PATH cannot be treated as environment readiness.
  expect(report.blockingCount).toBeGreaterThan(0);
  expect(JSON.parse(readFileSync(join(moved, 'projects/example/references/init-report.json'), 'utf8'))).toEqual(report);
  expect(existsSync(join(unrelated, 'projects'))).toBe(false);
  expect(existsSync(join(moved, 'dist'))).toBe(false);
  expect(existsSync(join(moved, 'node_modules'))).toBe(false);
});

it('registers a bounded sentinel and resolves every installed check prompt', async () => {
  const workspace = root();
  const def = await loadPortableDef({ pluginDir: resolve('.'), workspaceDir: workspace });
  const sentinel = def.agents.find(agent => agent.id === 'patent-init-sentinel')!;
  expect(sentinel.role).toBe('subagent');
  expect(sentinel.permissions).toMatchObject({ write: false, edit: false, bash: true, mcp: false });
  for (const adapter of adapters) {
    const output = await adapter.generate(def, {});
    expect(new Set(adapter.getGeneratedFilePaths(def))).toEqual(new Set(output.files.keys()));
    for (const [path, text] of output.files) {
      expect(text).not.toContain('{{PATENT_CHECK_SCRIPT}}');
      if (path.endsWith('patent-init-sentinel.md')) {
        expect(text).not.toContain('node dist/cli.js');
        expect(text).toContain(`.oh-my-patent/runtime/${adapter.name}/check.mjs`);
        if (adapter.name === 'opencode') { expect(text).toContain('mode: subagent'); expect(text).toContain('task: deny'); }
        if (adapter.name === 'claude-code') expect(text.split('---')[1]).not.toContain('Agent');
      }
    }
  }
});

it('reports failed execution honestly and refuses another host or an escaping report path', async () => {
  const workspace = root(); const path = checkRuntimePath('codex');
  const def = await loadPortableDef({ pluginDir: resolve('.'), workspaceDir: workspace });
  const generated = await new CodexAdapter().generate(def, {});
  mkdirSync(dirname(join(workspace, path)), { recursive: true }); writeFileSync(join(workspace, path), generated.files.get(path)!);
  for (const args of [['--tool', 'claude-code'], ['--output', '../outside-report.json']]) {
    const result = execute(join(workspace, path), workspace, args);
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({ ok: false, ready: false, error: { code: 'CHECK_FAILED' } });
  }
});

it('reads and updates only the explicitly selected MCP configuration', () => {
  const workspace = root(); mixedConfigs(workspace);
  const claude = readFileSync(join(workspace, '.mcp.json'), 'utf8');
  const codex = readFileSync(join(workspace, 'codex.json'), 'utf8');
  writeMcpConfig(workspace, 'google_scholar', { command: 'fixture-installed' }, 'opencode');
  expect(readFileSync(join(workspace, '.mcp.json'), 'utf8')).toBe(claude);
  expect(readFileSync(join(workspace, 'codex.json'), 'utf8')).toBe(codex);
  expect(getMcpStatuses(workspace, 'opencode').find(item => item.id === 'google_scholar')?.configured).toBe(true);
});

it.each([new OpenCodeAdapter(), new CodexAdapter()])('preserves another host and an edited checker on %s uninstall', async adapter => {
  const workspace = root();
  const def = await loadPortableDef({ pluginDir: resolve('.'), workspaceDir: workspace });
  const generated = await adapter.generate(def, {});
  for (const [path, content] of generated.files) { mkdirSync(dirname(join(workspace, path)), { recursive: true }); writeFileSync(join(workspace, path), content); }
  const other = join(workspace, checkRuntimePath('claude-code'));
  mkdirSync(dirname(other), { recursive: true }); writeFileSync(other, 'another host');
  const script = join(workspace, checkRuntimePath(adapter.name as InitCheckHost));
  const edited = readFileSync(script, 'utf8') + '\n// user edit\n'; writeFileSync(script, edited);
  const result = await adapter.uninstall(def, workspace);
  expect(result.filesSkipped).toContain(checkRuntimePath(adapter.name as InitCheckHost));
  expect(readFileSync(script, 'utf8')).toBe(edited);
  expect(readFileSync(other, 'utf8')).toBe('another host');
});
