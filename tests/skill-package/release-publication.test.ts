import { afterEach, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { createHash } from 'node:crypto';
// @ts-expect-error Maintainer script has no TypeScript declaration.
import { publishVerifiedPackage, releasePublishPlan, releaseTag, uploadVerifiedAssets, verifiedRelease } from '../../scripts/release-publication.mjs';

const roots: string[] = [];
const commit = 'a'.repeat(40);
const repo = 'illusionaireal/oh-my-patent';
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

function fixture(version = '0.4.1') {
  const root = mkdtempSync(join(tmpdir(), 'omp-release-')); roots.push(root);
  const artifacts = join(root, 'release-artifacts'); mkdirSync(artifacts);
  const distribution = join(root, 'distribution'); mkdirSync(distribution);
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'oh-my-patent', version }));
  writeFileSync(join(distribution, 'skill-package.json'), JSON.stringify({ name: 'oh-my-patent-skill' }));
  writeFileSync(join(distribution, 'targets.json'), JSON.stringify({ targets: ['claude-code', 'codex', 'opencode'].map(id => ({ id, wave: 1, install_verified: true, workflow_verified: true })) }));
  const tag = `v${version}`;
  const plugin = { name: 'oh-my-patent', version, tarball: `oh-my-patent-${version}.tgz` };
  const skill = { name: 'oh-my-patent-skill', version, tarball: `oh-my-patent-skill-${version}.tgz`, tag: version.includes('-') ? 'next' : 'latest' };
  const names = [`oh-my-patent-skill-${version}.zip`, plugin.tarball, skill.tarball];
  const checksums = Object.fromEntries(names.map(name => {
    const bytes = Buffer.from(`verified fixture: ${name}`);
    writeFileSync(join(artifacts, name), bytes);
    return [name, sha(bytes)];
  }));
  const release = { version, source_commit: commit, source_dirty: false, source_tag: tag, npm_packages: { plugin, skill }, artifact_checksums: checksums };
  writeFileSync(join(artifacts, 'release-manifest.json'), JSON.stringify(release));
  writeFileSync(join(artifacts, 'SHA256SUMS'), names.map(name => `${checksums[name]}  ${name}\n`).join(''));
  const context = { expectedCommit: commit, expectedTag: tag };
  const files = [...names, 'SHA256SUMS', 'release-manifest.json'].map(name => join(artifacts, name));
  return { root, artifacts, release, context, files, tag };
}

function npmFailure(code: string) {
  return Object.assign(new Error(`npm failed: ${code}`), { stdout: Buffer.from(JSON.stringify({ error: { code } })) });
}

it.each(['0.4.1', 'v0.4.1'])('accepts a version-matching release tag %s', tag => {
  expect(releaseTag('0.4.1', 'tag', tag)).toBe(tag);
});
it('allows branch dry-runs but rejects formal branch publication and mismatched tags', () => {
  expect(releaseTag('0.4.1', 'branch', 'master', true)).toBeNull();
  expect(() => releaseTag('0.4.1', 'branch', 'master')).toThrow('requires a version tag');
  expect(() => releaseTag('0.4.1', 'tag', '0.4.0', true)).toThrow('must match');
});
it('selects each verified npm archive independently with lifecycle scripts disabled', () => {
  const { root, artifacts, context } = fixture();
  const plugin = releasePublishPlan(root, artifacts, 'plugin', context);
  const skill = releasePublishPlan(root, artifacts, 'skill', context);
  expect(plugin).toMatchObject({ name: 'oh-my-patent', version: '0.4.1', tag: 'latest' });
  expect(skill).toMatchObject({ name: 'oh-my-patent-skill', version: '0.4.1', tag: 'latest' });
  for (const plan of [plugin, skill]) expect(plan.args).toContain('--ignore-scripts');
  expect(plugin.args).not.toContain(skill.tarball);
  expect(skill.args).not.toContain(plugin.tarball);
});
it('routes both prerelease packages through next', () => {
  const { root, artifacts, context } = fixture('0.4.1-alpha.0');
  for (const kind of ['plugin', 'skill']) expect(releasePublishPlan(root, artifacts, kind, context).tag).toBe('next');
});
it('retains the stable host acceptance gate for both packages', () => {
  const { root, artifacts, context } = fixture();
  writeFileSync(join(root, 'distribution/targets.json'), JSON.stringify({ targets: [] }));
  for (const kind of ['plugin', 'skill']) expect(() => releasePublishPlan(root, artifacts, kind, context)).toThrow('real host verification');
});
it.each(['commit', 'tag', 'dirty'])('rejects %s provenance mismatches before publication', change => {
  const { root, artifacts, context, release } = fixture();
  if (change === 'commit') release.source_commit = 'b'.repeat(40);
  if (change === 'tag') release.source_tag = '0.4.0';
  if (change === 'dirty') release.source_dirty = true;
  writeFileSync(join(artifacts, 'release-manifest.json'), JSON.stringify(release));
  expect(() => verifiedRelease(root, artifacts, context)).toThrow();
});
it.each(['.zip', 'oh-my-patent-0.4.1.tgz', 'oh-my-patent-skill-0.4.1.tgz'])('rejects changed archive %s', suffix => {
  const { root, artifacts, context, files } = fixture();
  const file = files.find(file => file.endsWith(suffix))!;
  writeFileSync(file, 'changed after verification');
  expect(() => verifiedRelease(root, artifacts, context)).toThrow(/checksum/i);
});
it('rejects a changed checksum file and unsafe/unexpected manifest entries', () => {
  const { root, artifacts, context, release } = fixture();
  writeFileSync(join(artifacts, 'SHA256SUMS'), 'changed checksum list');
  expect(() => verifiedRelease(root, artifacts, context)).toThrow('SHA256SUMS');
  release.artifact_checksums['../another.tgz'] = 'b'.repeat(64);
  writeFileSync(join(artifacts, 'release-manifest.json'), JSON.stringify(release));
  expect(() => verifiedRelease(root, artifacts, context)).toThrow('inventory');
});

it('publishes a missing npm version using only the selected verified archive', () => {
  const { root, artifacts, context } = fixture();
  const plan = releasePublishPlan(root, artifacts, 'skill', context);
  const npm = vi.fn((args: string[]) => { if (args[0] === 'view') throw npmFailure('E404'); return ''; });
  expect(publishVerifiedPackage(plan, { npm })).toBe('published');
  expect(npm.mock.calls.map(call => call[0][0])).toEqual(['view', 'publish']);
  expect(npm.mock.calls[1][0]).toEqual(plan.args);
});
it('skips an identical published npm version without moving any dist-tag', () => {
  const { root, artifacts, context } = fixture();
  const plan = releasePublishPlan(root, artifacts, 'plugin', context);
  const integrity = `sha512-${createHash('sha512').update(readFileSync(plan.tarball)).digest('base64')}`;
  const npm = vi.fn(() => JSON.stringify({ integrity }));
  expect(publishVerifiedPackage(plan, { npm })).toBe('already-published');
  expect(npm).toHaveBeenCalledTimes(1);
  expect(npm.mock.calls[0]?.length).toBe(1);
});
it('supports published archives with legacy shasum metadata', () => {
  const { root, artifacts, context } = fixture();
  const plan = releasePublishPlan(root, artifacts, 'skill', context);
  const npm = vi.fn(() => JSON.stringify({ shasum: createHash('sha1').update(readFileSync(plan.tarball)).digest('hex') }));
  expect(publishVerifiedPackage(plan, { npm })).toBe('already-published');
});
it('fails on different published bytes rather than attempting to overwrite a version', () => {
  const { root, artifacts, context } = fixture();
  const plan = releasePublishPlan(root, artifacts, 'skill', context);
  const npm = vi.fn(() => JSON.stringify({ integrity: 'sha512-different' }));
  expect(() => publishVerifiedPackage(plan, { npm })).toThrow('differs');
  expect(npm).toHaveBeenCalledTimes(1);
});
it.each(['E401', 'E403', 'ENOTFOUND', 'ETIMEDOUT'])('fails closed on registry error %s', code => {
  const { root, artifacts, context } = fixture();
  const plan = releasePublishPlan(root, artifacts, 'plugin', context);
  const npm = vi.fn(() => { throw npmFailure(code); });
  expect(() => publishVerifiedPackage(plan, { npm })).toThrow(code);
  expect(npm).toHaveBeenCalledTimes(1);
});
it.each(['not JSON', 'null', '{}'])('does not treat malformed/missing dist metadata %s as an unpublished version', metadata => {
  const { root, artifacts, context } = fixture();
  const npm = vi.fn(() => metadata);
  expect(() => publishVerifiedPackage(releasePublishPlan(root, artifacts, 'plugin', context), { npm })).toThrow();
  expect(npm).toHaveBeenCalledTimes(1);
});
it('npm dry-run avoids registry lookups and cleans its isolated offline cache', () => {
  const { root, artifacts, context } = fixture();
  const plan = releasePublishPlan(root, artifacts, 'skill', context);
  let cache = '';
  const npm = vi.fn((args: string[]) => {
    cache = args[args.indexOf('--cache') + 1];
    expect(existsSync(cache)).toBe(true);
    return '';
  });
  expect(publishVerifiedPackage(plan, { dryRun: true, npm })).toBe('dry-run');
  expect(npm).toHaveBeenCalledExactlyOnceWith([...plan.args, '--dry-run', '--offline', '--cache', cache], true);
  expect(existsSync(cache)).toBe(false);
});
it('cleans the dry-run cache even if npm rejects the local archive', () => {
  const { root, artifacts, context } = fixture();
  let cache = '';
  const npm = vi.fn((args: string[]) => { cache = args[args.indexOf('--cache') + 1]; throw new Error('invalid archive'); });
  expect(() => publishVerifiedPackage(releasePublishPlan(root, artifacts, 'plugin', context), { dryRun: true, npm })).toThrow('invalid archive');
  expect(existsSync(cache)).toBe(false);
});

it('attaches all five verified files to an existing empty Release', () => {
  const { tag, files } = fixture();
  const gh = vi.fn((args: string[]) => args[1] === 'view' ? JSON.stringify({ tagName: tag, assets: [] }) : '');
  expect(uploadVerifiedAssets(tag, repo, files, { gh })).toBe('uploaded');
  expect(gh.mock.calls[1][0]).toEqual(['release', 'upload', tag, ...files, '-R', repo]);
});
it('checks existing attachments and uploads only missing files after partial success', () => {
  const { tag, files } = fixture();
  const present = files.slice(0, 3);
  const gh = vi.fn((args: string[]) => {
    if (args[1] === 'view') return JSON.stringify({ tagName: tag, assets: present.map(file => ({ name: basename(file) })) });
    if (args[1] === 'download') return readFileSync(present.find(file => basename(file) === args[args.indexOf('--pattern') + 1])!);
    return '';
  });
  expect(uploadVerifiedAssets(tag, repo, files, { gh })).toBe('uploaded');
  expect(gh.mock.calls.map(call => call[0][1])).toEqual(['view', 'download', 'download', 'download', 'upload']);
  expect(gh.mock.calls[4][0]).toEqual(['release', 'upload', tag, ...files.slice(3), '-R', repo]);
});
it('skips an entirely identical Release on retry', () => {
  const { tag, files } = fixture();
  const gh = vi.fn((args: string[]) => args[1] === 'view'
    ? JSON.stringify({ tagName: tag, assets: files.map(file => ({ name: basename(file) })) })
    : readFileSync(files.find(file => basename(file) === args[args.indexOf('--pattern') + 1])!));
  expect(uploadVerifiedAssets(tag, repo, files, { gh })).toBe('already-uploaded');
  expect(gh.mock.calls.every(call => call[0][1] !== 'upload')).toBe(true);
});
it('fails before any upload if an existing asset differs, even with other files missing', () => {
  const { tag, files } = fixture();
  const gh = vi.fn((args: string[]) => args[1] === 'view'
    ? JSON.stringify({ tagName: tag, assets: [{ name: basename(files[4]) }] })
    : Buffer.from('different release manifest'));
  expect(() => uploadVerifiedAssets(tag, repo, files, { gh })).toThrow('differs');
  expect(gh.mock.calls.every(call => call[0][1] !== 'upload')).toBe(true);
});
it('does not mask Release access failures or create a new Release on failure', () => {
  const { tag, files } = fixture();
  const gh = vi.fn(() => { throw new Error('HTTP 403'); });
  expect(() => uploadVerifiedAssets(tag, repo, files, { gh })).toThrow('HTTP 403');
  expect(gh).toHaveBeenCalledTimes(1);
});
it('Release dry-run never invokes gh', () => {
  const { tag, files } = fixture();
  const gh = vi.fn();
  expect(uploadVerifiedAssets(tag, repo, files, { dryRun: true, gh })).toBe('dry-run');
  expect(gh).not.toHaveBeenCalled();
});
