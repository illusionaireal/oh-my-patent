import { afterEach, expect, test } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, symlinkSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { CodexAdapter } from '../../src/adapters/codex/index.js';
import { loadPortableDef } from '../../src/adapters/loader.js';

const fixtures: string[] = [];
const links: string[] = [];
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
  for (const link of links.splice(0)) unlinkSync(link);
  for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true, force: true });
});

test.each([
  ['codex', '.codex', join('agents', 'archimedes.md')],
  ['codex', join('.agents', 'plugins'), 'marketplace.json'],
  ['claude-code', '.claude', join('agents', 'archimedes.md')],
  ['opencode', '.opencode', join('agent', 'archimedes.md')],
])('install rejects linked %s destination %s before writing', (tool, relative, target) => {
  const dir = workspace(), outside = workspace();
  const link = join(dir, relative);
  mkdirSync(dirname(link), { recursive: true });
  put(join(outside, target), 'EXTERNAL USER DATA');
  symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
  links.push(link);
  const result = cli(dir, 'adapt', 'install', '--tool', tool);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Linked destination blocked');
  expect(readFileSync(join(outside, target), 'utf8')).toBe('EXTERNAL USER DATA');
  expect(existsSync(join(dir, 'AGENTS.md'))).toBe(false);
});

test('Codex uninstall preserves even matching generated files through a directory link', async () => {
  const dir = workspace(), outside = workspace();
  const def = await loadPortableDef({ pluginDir: process.cwd(), workspaceDir: dir });
  const adapter = new CodexAdapter();
  const generated = await adapter.generate(def, {});
  const file = join(outside, 'agents', 'archimedes.md');
  const content = generated.files.get(join('.codex', 'agents', 'archimedes.md'))!;
  put(file, content);
  const link = join(dir, '.codex');
  symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
  links.push(link);
  const result = await adapter.uninstall(def, dir);
  expect(result.filesSkipped).toContain(join('.codex', 'agents', 'archimedes.md'));
  expect(readFileSync(file, 'utf8')).toBe(content);
});

test('standalone generation rejects a linked adapter output directory', () => {
  const dir = workspace(), outside = workspace(), output = workspace();
  const link = join(output, 'codex');
  symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
  links.push(link);
  const result = cli(dir, 'adapt', 'generate', '--tool', 'codex', '--output', output);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Linked destination blocked');
  expect(existsSync(join(outside, '.codex'))).toBe(false);
});

test('Claude rejects linked global copy destinations before writing workspace files', () => {
  const dir = workspace(), home = workspace(), outside = workspace();
  const link = join(home, '.claude-best');
  put(join(outside, 'agents', 'archimedes.md'), 'GLOBAL USER DATA');
  symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
  links.push(link);
  const result = spawnSync(process.execPath, [resolve('dist/cli.js'), 'adapt', 'install',
    '--tool', 'claude-code', '--workspace-dir', dir], {
    encoding: 'utf8', env: { ...process.env, HOME: home, USERPROFILE: home }, timeout: 20000,
  });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Linked destination blocked');
  expect(readFileSync(join(outside, 'agents', 'archimedes.md'), 'utf8')).toBe('GLOBAL USER DATA');
  expect(existsSync(join(dir, '.claude'))).toBe(false);
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
