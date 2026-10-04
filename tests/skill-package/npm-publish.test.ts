import { afterEach, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
// @ts-expect-error Standalone maintainer script has no TypeScript declaration.
import { standalonePublishPlan } from '../../scripts/standalone-skill-package.mjs';

const roots: string[] = [];
const commit = 'a'.repeat(40);
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function fixture(version = '0.4.0-alpha.0', verified = false) {
  const root = mkdtempSync(join(tmpdir(), 'omp-npm-skill-')); roots.push(root);
  const distribution = join(root, 'distribution'); const artifacts = join(root, 'release-artifacts');
  mkdirSync(distribution); mkdirSync(artifacts);
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'oh-my-patent', version }));
  writeFileSync(join(distribution, 'skill-package.json'), JSON.stringify({ name: 'oh-my-patent-skill' }));
  writeFileSync(join(distribution, 'targets.json'), JSON.stringify({ targets: ['claude-code', 'codex', 'opencode'].map(id => ({ id, wave: 1, install_verified: verified, workflow_verified: verified })) }));
  const tarball = `oh-my-patent-skill-${version}.tgz`; const bytes = Buffer.from('verified Skill tarball fixture');
  writeFileSync(join(artifacts, tarball), bytes);
  const release = { version, source_commit: commit, npm_packages: { plugin: { name: 'oh-my-patent', tarball: `oh-my-patent-${version}.tgz` }, skill: { name: 'oh-my-patent-skill', version, tarball, tag: version.includes('-') ? 'next' : 'latest' } }, artifact_checksums: { [tarball]: createHash('sha256').update(bytes).digest('hex') } };
  writeFileSync(join(artifacts, 'release-manifest.json'), JSON.stringify(release));
  return { root, artifacts, release, tarball };
}

it('publishes the immutable standalone alpha through next with lifecycle scripts disabled', () => {
  const { root, artifacts, tarball } = fixture();
  const plan = standalonePublishPlan(root, artifacts, commit);
  expect(plan).toMatchObject({ name: 'oh-my-patent-skill', version: '0.4.0-alpha.0', tag: 'next', tarball: join(artifacts, tarball) });
  expect(plan.args).toContain('--ignore-scripts');
  expect(plan.args).not.toContain('latest');
  expect(plan.args).not.toContain(join(artifacts, 'oh-my-patent-0.4.0-alpha.0.tgz'));
});
it('blocks a stable Skill package until first-wave host installation and workflow acceptance pass', () => {
  const { root, artifacts } = fixture('0.4.0');
  expect(() => standalonePublishPlan(root, artifacts, commit)).toThrow('real host verification');
  const file = join(root, 'distribution/targets.json'); const targets = JSON.parse(readFileSync(file, 'utf8'));
  for (const target of targets.targets) target.install_verified = true;
  writeFileSync(file, JSON.stringify(targets));
  expect(() => standalonePublishPlan(root, artifacts, commit)).toThrow('real host verification');
  for (const target of targets.targets) target.workflow_verified = true;
  writeFileSync(file, JSON.stringify(targets));
  expect(standalonePublishPlan(root, artifacts, commit).tag).toBe('latest');
});
it('rejects modified tarball bytes and artifacts from another commit', () => {
  const { root, artifacts, tarball } = fixture();
  expect(() => standalonePublishPlan(root, artifacts, 'b'.repeat(40))).toThrow('different commit');
  writeFileSync(join(artifacts, tarball), 'altered after verification');
  expect(() => standalonePublishPlan(root, artifacts, commit)).toThrow('checksum');
});
it.each(['plugin', 'version', 'path', 'tag'])('rejects a tampered %s publication selection', change => {
  const { root, artifacts, release } = fixture();
  if (change === 'plugin') release.npm_packages.skill.name = 'oh-my-patent';
  if (change === 'version') release.npm_packages.skill.version = '0.3.3';
  if (change === 'path') release.npm_packages.skill.tarball = '../other-package.tgz';
  if (change === 'tag') release.npm_packages.skill.tag = 'latest';
  writeFileSync(join(artifacts, 'release-manifest.json'), JSON.stringify(release));
  expect(() => standalonePublishPlan(root, artifacts, commit)).toThrow();
});
