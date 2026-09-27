import { afterEach, expect, test } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { CodexAdapter } from '../../src/adapters/codex/index.js';
import { loadPortableDef } from '../../src/adapters/loader.js';

const fixtures: string[] = [];
function workspace(): string {
  const dir = mkdtempSync(join(tmpdir(), 'omp-install-safety-'));
  fixtures.push(dir);
  return dir;
}
function put(file: string, content: string): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}
function cli(dir: string, ...args: string[]) {
  const home = workspace();
  return spawnSync(process.execPath, [resolve('dist/cli.js'), ...args, '--workspace-dir', dir], {
    encoding: 'utf8', env: { ...process.env, HOME: home, USERPROFILE: home }, timeout: 20000,
  });
}
afterEach(() => {
  for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true, force: true });
});

test('Codex uninstall preserves preexisting instructions and modified generated files', async () => {
  const dir = workspace();
  const instructions = join(dir, 'AGENTS.md');
  put(instructions, 'USER INSTRUCTIONS');
  const def = await loadPortableDef({ pluginDir: process.cwd(), workspaceDir: dir });
  const adapter = new CodexAdapter();
  const first = await adapter.uninstall(def, dir);
  expect(first.filesSkipped).toContain('AGENTS.md');
  expect(readFileSync(instructions, 'utf8')).toBe('USER INSTRUCTIONS');

  const result = cli(dir, 'adapt', 'install', '--tool', 'codex');
  expect(result.status, result.stderr).toBe(0);
  expect(readFileSync(instructions, 'utf8')).toBe('USER INSTRUCTIONS');
  const edited = join(dir, '.codex', 'agents', 'archimedes.md');
  put(edited, readFileSync(edited, 'utf8') + '\nUSER EDIT');
  const removed = await adapter.uninstall(def, dir);
  expect(removed.filesSkipped).toContain(join('.codex', 'agents', 'archimedes.md'));
  expect(readFileSync(edited, 'utf8')).toContain('USER EDIT');
  expect(readFileSync(instructions, 'utf8')).toBe('USER INSTRUCTIONS');
  expect(existsSync(join(dir, 'plugins', 'oh-my-patent', 'AGENTS.md'))).toBe(false);
});

test('Codex install and uninstall retain unrelated marketplace entries and metadata', async () => {
  const dir = workspace();
  const file = join(dir, '.agents', 'plugins', 'marketplace.json');
  const original = { name: 'personal', custom: { keep: true }, plugins: [
    { name: 'other-plugin', source: { source: 'local', path: './other' }, extra: 42 },
  ] };
  put(file, JSON.stringify(original));
  for (let i = 0; i < 2; i++) {
    const result = cli(dir, 'adapt', 'install', '--tool', 'codex');
    expect(result.status, result.stderr).toBe(0);
  }
  const installed = JSON.parse(readFileSync(file, 'utf8'));
  expect(installed.plugins).toHaveLength(2);
  expect(installed.plugins[0]).toEqual(original.plugins[0]);
  expect(installed.custom).toEqual(original.custom);
  const def = await loadPortableDef({ pluginDir: process.cwd(), workspaceDir: dir });
  await new CodexAdapter().uninstall(def, dir);
  expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(original);
});

test.each(['{broken', '{"plugins":{}}', JSON.stringify({ plugins: [
  { name: 'oh-my-patent', source: { source: 'local', path: './user-owned' } },
] })])('Codex refuses invalid or conflicting marketplace without installing files: %s', content => {
  const dir = workspace();
  const file = join(dir, '.agents', 'plugins', 'marketplace.json');
  put(file, content);
  const result = cli(dir, 'adapt', 'install', '--tool', 'codex');
  expect(result.status).not.toBe(0);
  expect(readFileSync(file, 'utf8')).toBe(content);
  expect(existsSync(join(dir, '.codex'))).toBe(false);
});
