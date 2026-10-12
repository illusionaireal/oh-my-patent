import { afterEach, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { delimiter, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { loadPortableDef } from '../../src/adapters/loader.js';
import { ClaudeCodeAdapter } from '../../src/adapters/claude/index.js';
import { CodexAdapter } from '../../src/adapters/codex/index.js';
import { OpenCodeAdapter } from '../../src/adapters/opencode/index.js';
import { checkRuntimePath } from '../../src/adapters/check-runtime.js';
import { getMcpStatuses, writeMcpConfig, type InitCheckHost } from '../../src/core/init-checker.js';
import { capabilityFixture } from '../figure-selection-fixture.js';
import { digest } from '../../src/core/project-store.js';

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

it.each(hosts)('enforces retrieval coverage and auditable consent in the installed %s checker', async host => {
  const workspace = root();
  const def = await loadPortableDef({ pluginDir: resolve('.'), workspaceDir: workspace });
  const generated = await adapters[hosts.indexOf(host)].generate(def, {});
  const script = join(workspace, checkRuntimePath(host));
  mkdirSync(dirname(script), { recursive: true });
  writeFileSync(script, generated.files.get(checkRuntimePath(host))!);
  // Real bundled execution; deterministic local tools on both Ubuntu and Windows.
  const bin = join(workspace, 'bin'); mkdirSync(bin);
  for (const tool of ['git', 'mmdc']) {
    writeFileSync(join(bin, tool + (process.platform === 'win32' ? '.cmd' : '')),
      process.platform === 'win32' ? '@echo off\r\necho fixture-v1\r\n' : '#!/bin/sh\necho fixture-v1\n', { mode: 0o755 });
  }
  const env = { ...process.env, PATH: [bin, dirname(process.execPath), process.env.PATH].join(delimiter) };
  const run = (args: string[] = []) => {
    const result = spawnSync(process.execPath, [script, '--json', ...args], { cwd: workspace, env, encoding: 'utf8' });
    expect(result.status, result.stderr).toBe(0);
    return JSON.parse(result.stdout);
  };
  const consent = ['--accept-degraded-retrieval', '--degradation-reason', 'User accepted academic-only coverage (decision #7)'];
  // Other hosts' configured patent sources must not unblock this host.
  for (const other of hosts.filter(h => h !== host)) writeMcpConfig(workspace, 'cnipa_patent', { command: 'fixture' }, other);
  expect(run()).toMatchObject({ ready: false, retrievalCoverage: 'none', blockingCount: 1 });
  expect(run(consent)).toMatchObject({ ready: false, retrievalCoverage: 'none', degradedRetrieval: { accepted: false } });
  writeMcpConfig(workspace, 'google_scholar', { command: 'fixture' }, host);
  expect(run()).toMatchObject({ ready: false, retrievalCoverage: 'fallback_only', blockingCount: 1 });
  const saved = 'projects/example/references/init-report.json';
  const accepted = run([...consent, '--output', saved]);
  expect(accepted).toMatchObject({ ready: true, blockingCount: 0, retrievalCoverage: 'fallback_only',
    mcpVerification: 'configuration_only', degradedRetrieval: { accepted: true, reason: consent[2] } });
  expect(accepted.degradedRetrieval.limitation).toContain('缺少专业专利库覆盖');
  expect(JSON.parse(readFileSync(join(workspace, saved), 'utf8'))).toEqual(accepted);
  expect(run().ready).toBe(false); // A saved accepted report cannot waive the next check.
  for (const id of ['patsnap_search', 'uspto_patent', 'cnipa_patent']) {
    writeMcpConfig(workspace, id, { command: 'fixture' }, host);
    expect(run()).toMatchObject({ ready: true, retrievalCoverage: 'professional', blockingCount: 0 });
  }
  for (const args of [['--accept-degraded-retrieval'], ['--degradation-reason', 'decision'],
    ['--accept-degraded-retrieval', '--degradation-reason'],
    ['--accept-degraded-retrieval', '--degradation-reason', '   '], [...consent, '--mcp-status']]) {
    const result = spawnSync(process.execPath, [script, '--json', ...args], { cwd: workspace, env, encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({ ok: false, ready: false, error: { code: 'CHECK_FAILED' } });
  }
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

it.each(hosts)('shares the bundled figure-selection runtime in the installed %s checker', async host => {
  const workspace = root();
  const def = await loadPortableDef({ pluginDir: resolve('.'), workspaceDir: workspace });
  const generated = await adapters[hosts.indexOf(host)].generate(def, {});
  const script = join(workspace, checkRuntimePath(host));
  mkdirSync(dirname(script), { recursive: true }); writeFileSync(script, generated.files.get(checkRuntimePath(host))!);
  const run = (request: object, expectedStatus = 0) => {
    const result = spawnSync(process.execPath, [script, '--runtime'], { cwd: root(), encoding: 'utf8',
      env: { ...process.env, PATH: '' }, input: JSON.stringify(request) });
    expect(result.status, result.stdout + result.stderr).toBe(expectedStatus);
    return JSON.parse(result.stdout);
  };
  const project = 'projects/01-fixture';
  expect(run({ interface_version: 1, operation: 'project.create', project, operation_id: 'create',
    expected: { revision: null }, params: { topic: 'Synthetic figure', topic_slug: 'fixture' } }).ok).toBe(true);
  const projectRoot = join(workspace, project);
  mkdirSync(join(projectRoot, 'figures/fig1'), { recursive: true });
  writeFileSync(join(projectRoot, 'figures/fig1/figure-spec.json'), readFileSync('src/skill-entry/assets/figure-spec.example.json'));
  writeFileSync(join(projectRoot, '.patent/figure-capabilities.json'), JSON.stringify(capabilityFixture()));
  const params = { spec_path: 'figures/fig1/figure-spec.json' };
  expect(run({ interface_version: 1, operation: 'figure.plan', project, params }).data).toMatchObject({ default_backend: 'svg', verification: 'host_reported' });
  const inputs = ['MAIN.md', '.patent/config.json', '.patent/figure-capabilities.json', params.spec_path];
  const stateText = readFileSync(join(projectRoot, '.patent/state.json'), 'utf8');
  const expected = { revision: JSON.parse(stateText).revision, state_digest: digest(stateText),
    inputs: Object.fromEntries(inputs.map(p => [p, digest(readFileSync(join(projectRoot, p)))])) };
  expect(run({ interface_version: 1, operation: 'figure.select', project, operation_id: 'select', expected,
    params: { ...params, mode: 'default' } }).data.result).toMatchObject({ backend: 'svg', source: 'immediate_default', decision_reference: null });
  expect(JSON.parse(readFileSync(join(projectRoot, 'figures/fig1/selection.json'), 'utf8')).backend).toBe('svg');
  expect(run({ interface_version: 1, operation: 'project.create', project: '../outside', operation_id: 'outside',
    expected: { revision: null }, params: { topic: 'escape', topic_slug: 'escape' } }, 1).ok).toBe(false);
}, 15000);

it.each(hosts)('inherits workspace preferences and honors project/task overrides in installed %s runtime', async host => {
  const workspace = root();
  const def = await loadPortableDef({ pluginDir: resolve('.'), workspaceDir: workspace });
  const generated = await adapters[hosts.indexOf(host)].generate(def, {});
  const script = join(workspace, checkRuntimePath(host));
  mkdirSync(dirname(script), { recursive: true }); writeFileSync(script, generated.files.get(checkRuntimePath(host))!);
  writeFileSync(join(workspace, '.oh-my-patent/config.json'), JSON.stringify({ figures: { preferredBackend: 'mermaid' }, jurisdiction: 'US' }));
  const project = 'projects/02-preference';
  const run = (operation: string, params: object, extra = {}) => {
    const result = spawnSync(process.execPath, [script, '--runtime'], { cwd: root(), input: JSON.stringify({ interface_version: 1, operation, project, params, ...extra }), encoding: 'utf8' });
    expect(result.status, result.stdout + result.stderr).toBe(0); return JSON.parse(result.stdout).data;
  };
  run('project.create', { topic: 'Synthetic inheritance', topic_slug: 'preference' }, { operation_id: 'create', expected: { revision: null } });
  const projectRoot = join(workspace, project);
  expect(JSON.parse(readFileSync(join(projectRoot, '.patent/config.json'), 'utf8'))).toMatchObject({ jurisdiction: 'US', figures: { preferredBackend: 'mermaid' } });
  mkdirSync(join(projectRoot, 'figures/fig1'), { recursive: true });
  writeFileSync(join(projectRoot, 'figures/fig1/figure-spec.json'), readFileSync('src/skill-entry/assets/figure-spec.example.json'));
  writeFileSync(join(projectRoot, '.patent/figure-capabilities.json'), JSON.stringify(capabilityFixture()));
  const params = { spec_path: 'figures/fig1/figure-spec.json' };
  expect(run('figure.plan', params).default_backend).toBe('mermaid');
  writeFileSync(join(projectRoot, '.patent/config.json'), JSON.stringify({ figures: { preferredBackend: 'svg' } }));
  expect(run('figure.plan', params).default_backend).toBe('svg');
  expect(run('figure.plan', { ...params, figures: { preferredBackend: 'mermaid' } }).default_backend).toBe('mermaid');
}, 15000);
