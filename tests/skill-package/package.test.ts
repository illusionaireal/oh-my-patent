import { afterEach, expect, it } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { digest } from '../../src/core/project-store.js';
const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
it('runs a relocated package with Chinese/spaces and no repository or node_modules', () => {
  const root = mkdtempSync(join(tmpdir(), 'omp 包 space-')); roots.push(root);
  const skill = join(root, 'installed skill');
  const copy = (from: string, to: string) => {
    mkdirSync(to, { recursive: true });
    for (const entry of readdirSync(from, { withFileTypes: true })) {
      if (entry.isDirectory()) copy(join(from, entry.name), join(to, entry.name));
      else writeFileSync(join(to, entry.name), readFileSync(join(from, entry.name)));
    }
  };
  copy(resolve('skills/oh-my-patent'), skill);
  const script = join(skill, 'scripts/runtime.mjs'); const project = join(root, 'project');
  const request = { interface_version: 1, operation: 'project.create', project, operation_id: 'create', expected: { revision: null }, params: { topic: 'Synthetic', topic_slug: 'test' } };
  const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP };
  const result = spawnSync(process.execPath, [script], { cwd: root, input: JSON.stringify(request), encoding: 'utf8', env });
  expect(result.stderr).toBe(''); expect(result.status).toBe(0); expect(JSON.parse(result.stdout).ok).toBe(true);
  expect(existsSync(join(project, '.patent/state.json'))).toBe(true); expect(existsSync(join(skill, '.patent'))).toBe(false);
  const inspect = spawnSync(process.execPath, [script], { cwd: root, input: JSON.stringify({ interface_version: 1, operation: 'project.inspect', project }), encoding: 'utf8', env });
  expect(JSON.parse(inspect.stdout).data.state.project.path).toBe('.');
});
it('contains exactly one entry, complete resources and a consistent checksum manifest', () => {
  const root = resolve('skills/oh-my-patent');
  const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
  expect(walk(root).filter(n => n.endsWith('SKILL.md'))).toHaveLength(1);
  const entry = readFileSync(join(root, 'SKILL.md'), 'utf8'); expect(entry.split('\n').length).toBeLessThan(500);
  for (const match of entry.matchAll(/\]\(([^)]+)\)/g)) expect(existsSync(join(root, match[1]))).toBe(true);
  const manifest = JSON.parse(readFileSync(join(root, 'scripts/manifest.json'), 'utf8'));
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  expect(manifest.package_version).toBe(pkg.version);
  const targets = JSON.parse(readFileSync('distribution/targets.json', 'utf8')).targets;
  for (const host of targets) {
    const reference = readFileSync(join(root, `references/host-${host.id}.md`), 'utf8');
    if (host.install_verified && host.workflow_verified) {
      expect(reference).toContain(`passed (source: ${host.verification_source}; confirmation: ${host.acceptance_confirmed_at})`);
    } else {
      expect(reference).toContain('Installation and workflow status: unverified.');
    }
  }
  for (const [name, hash] of Object.entries(manifest.files)) expect(digest(readFileSync(join(root, name)))).toBe(hash);
  expect(manifest.runtime_bytes).toBeLessThanOrEqual(2 * 1024 * 1024);
  expect(manifest.inputs.some((name: string) => /src\/(cli|tui|adapters)|node_modules\/(ink|react)/.test(name))).toBe(false);
});
it('keeps portable runtime instructions separate from original plugin prompts', () => {
  const original = readFileSync('src/agents/patent-init-sentinel.md', 'utf8');
  const portable = readFileSync('skills/oh-my-patent/references/role-patent-init-sentinel.md', 'utf8');
  expect(original).not.toContain('node dist/cli.js');
  expect(original).toContain('{{PATENT_CHECK_SCRIPT}}');
  expect(original).toContain('Role: subagent');
  expect(portable).toContain('scripts/runtime.mjs --doctor');
  expect(portable).not.toBe(original);
  const manifest = JSON.parse(readFileSync('skills/oh-my-patent/scripts/manifest.json', 'utf8'));
  expect(manifest.sources['src/skill-resources/agents/patent-init-sentinel.md']).toBeDefined();
});
