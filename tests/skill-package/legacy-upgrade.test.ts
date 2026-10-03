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

it.each(cases)('upgrades the complete $variant $host baseline and rolls back exact bytes', ({ host, files }) => {
  const root = installLegacy(files);
  const unrelated = join(root, 'user-notes.md'); writeFileSync(unrelated, 'Keep these notes.');
  const preview = managePortable(resolve('.'), root, host, 'install', true) as { conflicts: string[] };
  expect(preview.conflicts).toEqual([]);
  expect(existsSync(join(root, skillEntry(host)))).toBe(false);
  const installed = managePortable(resolve('.'), root, host, 'install', false) as { backup_id: string };
  expect(existsSync(join(root, skillEntry(host)))).toBe(true);
  for (const name of Object.keys(files)) expect(existsSync(join(root, name)), name).toBe(false);
  rollbackPortable(root, installed.backup_id);
  for (const [name, content] of Object.entries(files)) expect(readFileSync(join(root, name)).equals(Buffer.from(content)), name).toBe(true);
  expect(existsSync(join(root, skillEntry(host)))).toBe(false);
  expect(readFileSync(unrelated, 'utf8')).toBe('Keep these notes.');
});

it.each(cases)('preserves every file when a $variant $host legacy prompt was edited', ({ host, files }) => {
  const root = installLegacy(files);
  const name = Object.keys(files).find(path => path.endsWith('/archimedes.md'))!;
  const edited = files[name] + '\nUser customization.\n'; writeFileSync(join(root, name), edited);
  expect(() => managePortable(resolve('.'), root, host, 'install', false)).toThrow('legacy file modified');
  for (const [path, content] of Object.entries(files)) expect(readFileSync(join(root, path), 'utf8')).toBe(path === name ? edited : content);
  expect(existsSync(join(root, skillEntry(host)))).toBe(false);
  expect(existsSync(join(root, '.oh-my-patent/installations.json'))).toBe(false);
});
