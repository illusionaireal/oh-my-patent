import { afterEach, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { brotliDecompressSync } from 'node:zlib';
import { managePortable, rollbackPortable } from '../../src/adapters/portable-install.js';

const fixture = JSON.parse(brotliDecompressSync(readFileSync('tests/fixtures/legacy-installations/0.3.3.json.br')).toString('utf8')) as {
  baseline: string; variants: Record<string, Record<string, Record<string, string>>>;
};
const cases = Object.entries(fixture.variants).flatMap(([variant, hosts]) =>
  Object.entries(hosts).map(([host, files]) => ({ variant, host, files })));
const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function installLegacy(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'omp-legacy-upgrade-')); roots.push(root);
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, name)), { recursive: true }); writeFileSync(join(root, name), content);
  }
  return root;
}
function skillEntry(host: string): string {
  return `${host === 'claude-code' ? '.claude' : '.agents'}/skills/oh-my-patent/SKILL.md`;
}

function expectPluginUnchanged(root: string, files: Record<string, string>): void {
  for (const [name, content] of Object.entries(files)) expect(readFileSync(join(root, name)).equals(Buffer.from(content)), name).toBe(true);
}

it.each(cases)('adds the Skill alongside the complete $variant $host plugin and rolls back only the Skill', ({ host, files }) => {
  const root = installLegacy(files);
  const unrelated = join(root, 'user-notes.md'); writeFileSync(unrelated, 'Keep these notes.');
  const preview = managePortable(resolve('.'), root, host, 'install', true) as { conflicts: string[] };
  expect(preview.conflicts).toEqual([]);
  expect(existsSync(join(root, skillEntry(host)))).toBe(false);
  const installed = managePortable(resolve('.'), root, host, 'install', false) as { backup_id: string };
  expect(existsSync(join(root, skillEntry(host)))).toBe(true);
  expectPluginUnchanged(root, files);
  rollbackPortable(root, installed.backup_id);
  expectPluginUnchanged(root, files);
  expect(existsSync(join(root, skillEntry(host)))).toBe(false);
  expect(readFileSync(unrelated, 'utf8')).toBe('Keep these notes.');
});

it.each(cases)('preserves an edited $variant $host plugin through Skill install and uninstall', ({ host, files }) => {
  const root = installLegacy(files);
  const name = Object.keys(files).find(path => path.endsWith('/archimedes.md'))!;
  const edited = files[name] + '\nUser customization.\n'; writeFileSync(join(root, name), edited);
  const expected = { ...files, [name]: edited };
  managePortable(resolve('.'), root, host, 'install', false);
  expectPluginUnchanged(root, expected);
  expect(existsSync(join(root, skillEntry(host)))).toBe(true);
  managePortable(resolve('.'), root, host, 'uninstall', false);
  expectPluginUnchanged(root, expected);
  expect(existsSync(join(root, skillEntry(host)))).toBe(false);
  expect(JSON.parse(readFileSync(join(root, '.oh-my-patent/installations.json'), 'utf8'))).toEqual({});
});
