import { afterEach, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { loadPortableDef } from '../../src/adapters/loader.js';

const roots: string[] = [];
const cli = resolve('dist/cli.js');
function temp(): string {
  const root = mkdtempSync(join(tmpdir(), 'omp-install-modes-')); roots.push(root); return root;
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function run(root: string, home: string, args: string[]) {
  return spawnSync(process.execPath, [cli, 'adapt', ...args], {
    cwd: root, encoding: 'utf8', env: { ...process.env, HOME: home, USERPROFILE: home },
  });
}
function snapshot(root: string): Record<string, string> {
  return Object.fromEntries(readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const path = join(root, entry.name);
    return entry.isDirectory()
      ? Object.entries(snapshot(path)).map(([name, bytes]) => [join(entry.name, name), bytes])
      : [[entry.name, readFileSync(path).toString('base64')]];
  }));
}

it.each(['claude-code', 'codex', 'opencode'])('%s retains the full default plugin and independently manages the optional Skill', async host => {
  const root = temp(); const home = temp();
  const def = await loadPortableDef({ pluginDir: resolve('.'), workspaceDir: root });
  expect(def.agents).toHaveLength(14); expect(def.skills).toHaveLength(6); expect(def.commands).toHaveLength(9);
  const installed = run(root, home, ['install', '--tool', host]);
  expect(installed.status, installed.stderr).toBe(0);
  const plugin = snapshot(root);
  const agent = join(host === 'claude-code' ? '.claude/agents' : host === 'codex' ? '.codex/agents' : '.opencode/agent', 'archimedes.md');
  expect(plugin[agent]).toBeDefined();
  const skillPath = join(root, host === 'claude-code' ? '.claude' : '.agents', 'skills/oh-my-patent');
  expect(existsSync(skillPath)).toBe(false);
  const added = run(root, home, ['install', '--mode', 'skill', '--tool', host]);
  expect(added.status, added.stderr).toBe(0);
  for (const [name, bytes] of Object.entries(plugin)) expect(readFileSync(join(root, name)).toString('base64'), name).toBe(bytes);
  const skill = snapshot(skillPath);
  const reinstalled = run(root, home, ['install', '--mode', 'plugin', '--tool', host, '--prune']);
  expect(reinstalled.status, reinstalled.stderr).toBe(0);
  expect(snapshot(skillPath)).toEqual(skill);
  const removed = run(root, home, ['uninstall', '--tool', host]);
  expect(removed.status, removed.stderr).toBe(0);
  expect(existsSync(join(root, agent))).toBe(false);
  expect(snapshot(skillPath)).toEqual(skill);
  const skillRemoved = run(root, home, ['uninstall', '--mode', 'skill', '--tool', host]);
  expect(skillRemoved.status, skillRemoved.stderr).toBe(0);
  expect(existsSync(join(skillPath, 'SKILL.md'))).toBe(false);
});

it('rejects unknown or conflicting installation modes and unsupported dry-run before writing', () => {
  const root = temp(); const home = temp();
  for (const args of [
    ['install', '--mode', 'typo'],
    ['install', '--mode', 'skill', '--legacy', '--tool', 'codex'],
    ['install', '--mode', 'skill'],
    ['install', '--tool', 'codex', '--dry-run'],
  ]) {
    expect(run(root, home, args).status).not.toBe(0);
    expect(readdirSync(root)).toEqual([]);
  }
});

it('keeps default plugin and Skill generation in separate output directories', () => {
  const packageRoot = temp(); const home = temp(); const workspace = temp();
  for (const name of ['src', 'skills', 'distribution', 'plugin.jsonc']) cpSync(resolve(name), join(packageRoot, name), { recursive: true });
  const plugin = run(workspace, home, ['generate', '--tool', 'codex', '--plugin-dir', packageRoot]);
  expect(plugin.status, plugin.stderr).toBe(0);
  const generated = join(packageRoot, 'plugins/codex'); const before = snapshot(generated);
  const skill = run(workspace, home, ['generate', '--mode', 'skill', '--tool', 'codex', '--plugin-dir', packageRoot]);
  expect(skill.status, skill.stderr).toBe(0);
  expect(existsSync(join(packageRoot, 'skill-installations/codex/.agents/skills/oh-my-patent/SKILL.md'))).toBe(true);
  expect(snapshot(generated)).toEqual(before);
});

it('retains --legacy as a compatibility alias for explicit plugin mode', () => {
  const root = temp(); const home = temp();
  const result = run(root, home, ['install', '--legacy', '--tool', 'opencode']);
  expect(result.status, result.stderr).toBe(0);
  expect(existsSync(join(root, '.opencode/agent/archimedes.md'))).toBe(true);
  expect(existsSync(join(root, '.agents/skills/oh-my-patent/SKILL.md'))).toBe(false);
});
