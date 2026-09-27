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
