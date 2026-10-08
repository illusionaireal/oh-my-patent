// Smoke: npm test tests/skill-package/release-publication.test.ts
// After package:skill: npm run publish:release -- plugin --dry-run
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { standalonePublishPlan } from './standalone-skill-package.mjs';

const registry = 'https://registry.npmjs.org/';
const readJson = file => JSON.parse(readFileSync(file, 'utf8'));
const hash = (bytes, algorithm = 'sha256') => createHash(algorithm).update(bytes).digest('hex');

/** Permit branch dry-runs; require a version-matching tag for every real publication. */
export function releaseTag(version, refType, refName, dryRun = false) {
  if (!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(version)) throw new Error('Invalid release version');
  if (refType === 'tag') {
    if (refName !== version && refName !== `v${version}`) throw new Error('Release tag must match package.json version');
    return refName;
  }
  if (!dryRun) throw new Error('Formal publication requires a version tag; dispatch with --ref VERSION');
  return null;
}

/** Check the complete verified artifact set before any external write. */
export function verifiedRelease(root, artifacts, { expectedCommit, expectedTag, dryRun = false } = {}) {
  const pkg = readJson(join(root, 'package.json'));
  const release = readJson(join(artifacts, 'release-manifest.json'));
  if (release.version !== pkg.version) throw new Error('Release/package version mismatch');
  if (expectedCommit && release.source_commit !== expectedCommit) throw new Error('Verified artifacts belong to a different commit');
  if (expectedTag && release.source_tag !== expectedTag) throw new Error('Verified artifacts belong to a different tag');
  if (!dryRun && (release.source_dirty !== false || !expectedTag || !expectedCommit)) throw new Error('Formal publication requires clean tagged artifacts and a commit');
  const skill = standalonePublishPlan(root, artifacts, expectedCommit);
  const plugin = release.npm_packages?.plugin;
  const pluginName = `${pkg.name.replace(/^@/, '').replace('/', '-')}-${pkg.version}.tgz`;
  if (plugin?.name !== pkg.name || plugin.version !== pkg.version || plugin.tarball !== pluginName) throw new Error('Plugin package identity/version mismatch');
  const names = [`oh-my-patent-skill-${pkg.version}.zip`, pluginName, `${skill.name.replace(/^@/, '').replace('/', '-')}-${skill.version}.tgz`];
  if (JSON.stringify(Object.keys(release.artifact_checksums ?? {}).sort()) !== JSON.stringify([...names].sort())) throw new Error('Unexpected release archive inventory');
  for (const name of names) {
    if (!/^[a-z0-9._-]+-\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?\.(?:tgz|zip)$/.test(name)) throw new Error('Unsafe release archive path');
    if (hash(readFileSync(join(artifacts, name))) !== release.artifact_checksums[name]) throw new Error(`Release archive checksum mismatch: ${name}`);
  }
  const sums = readFileSync(join(artifacts, 'SHA256SUMS'), 'utf8').trim().split(/\r?\n/).sort();
  const expectedSums = names.map(name => `${release.artifact_checksums[name]}  ${name}`).sort();
  if (JSON.stringify(sums) !== JSON.stringify(expectedSums)) throw new Error('SHA256SUMS differs from release manifest');
  return { release, skill, plugin, files: [...names, 'SHA256SUMS', 'release-manifest.json'].map(name => join(artifacts, name)) };
}

/** Select one npm package; the other archive is never passed to npm publish. */
export function releasePublishPlan(root, artifacts, kind, context) {
  if (kind !== 'plugin' && kind !== 'skill') throw new Error('Choose plugin or skill');
  const verified = verifiedRelease(root, artifacts, context);
  if (kind === 'skill') return verified.skill;
  const { plugin, release } = verified;
  const tarball = join(artifacts, plugin.tarball);
  const tag = release.version.includes('-') ? 'next' : 'latest';
  return { name: plugin.name, version: plugin.version, tag, tarball, args: ['publish', tarball, '--tag', tag, '--access', 'public', '--ignore-scripts', '--registry', registry] };
}

function npmErrorCode(error) {
  for (const output of [error.stdout, error.stderr]) {
    try { const code = JSON.parse(String(output)).error?.code; if (code) return code; } catch { /* npm stderr can also contain human-readable diagnostics. */ }
  }
  return null;
}

/** Skip only byte-identical published versions. Dry-runs never need a registry lookup. */
export function publishVerifiedPackage(plan, { dryRun = false, npm } = {}) {
  if (dryRun) {
    // npm 11 also checks registry versions during --dry-run. Use an empty offline
    // cache so PR checks do not fail merely because this version already exists.
    const cache = mkdtempSync(join(tmpdir(), 'omp-publish-dry-run-'));
    try { npm([...plan.args, '--dry-run', '--offline', '--cache', cache], true); }
    finally { rmSync(cache, { recursive: true, force: true }); }
    return 'dry-run';
  }
  let dist;
  try {
    dist = JSON.parse(String(npm(['view', `${plan.name}@${plan.version}`, 'dist', '--json', '--registry', registry])));
  } catch (error) {
    if (npmErrorCode(error) !== 'E404') throw error;
  }
  if (dist !== undefined) {
    const bytes = readFileSync(plan.tarball);
    const integrity = `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
    const matches = dist?.integrity ? dist.integrity === integrity : /^[a-f0-9]{40}$/.test(dist?.shasum ?? '') && dist.shasum === hash(bytes, 'sha1');
    if (!matches) throw new Error(`Published ${plan.name}@${plan.version} differs from the verified tarball`);
    return 'already-published';
  }
  npm(plan.args, true);
  return 'published';
}

/** Compare all existing Release files before uploading any missing attachment. */
export function uploadVerifiedAssets(tag, repo, files, { dryRun = false, gh } = {}) {
  if (dryRun) return 'dry-run';
  const remote = JSON.parse(String(gh(['release', 'view', tag, '-R', repo, '--json', 'tagName,assets'])));
  if (remote.tagName !== tag) throw new Error('Release tag mismatch');
  const existing = new Set(remote.assets.map(asset => asset.name));
  const missing = [];
  for (const file of files) {
    const name = basename(file);
    if (!existing.has(name)) { missing.push(file); continue; }
    const bytes = gh(['release', 'download', tag, '-R', repo, '--pattern', name, '--output', '-']);
    if (hash(bytes) !== hash(readFileSync(file))) throw new Error(`Existing Release asset differs: ${name}`);
  }
  if (missing.length) gh(['release', 'upload', tag, ...missing, '-R', repo], true);
  return missing.length ? 'uploaded' : 'already-uploaded';
}

/** Context shared by the automatic workflow and manual Skill-only entry. */
export function publicationContext(root, dryRun) {
  return {
    dryRun,
    expectedCommit: process.env.GITHUB_SHA,
    expectedTag: releaseTag(readJson(join(root, 'package.json')).version, process.env.GITHUB_REF_TYPE, process.env.GITHUB_REF_NAME, dryRun),
  };
}

export function npmRunner(root) {
  if (!process.env.npm_execpath) throw new Error('Run through npm run publish:release or npm run publish:skill');
  return (args, inherit = false) => execFileSync(process.execPath, [process.env.npm_execpath, ...args], { cwd: root, stdio: inherit ? 'inherit' : 'pipe', maxBuffer: 32 * 1024 * 1024 });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [kind, ...options] = process.argv.slice(2);
  if (!['validate', 'plugin', 'skill', 'assets'].includes(kind) || options.some(option => option !== '--dry-run')) throw new Error('Usage: publish:release -- validate|plugin|skill|assets [--dry-run]');
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const dryRun = options.includes('--dry-run');
  const context = publicationContext(root, dryRun);
  const artifacts = join(root, 'release-artifacts');
  let status;
  if (kind === 'validate') status = 'context-validated';
  else if (kind === 'assets') {
    const verified = verifiedRelease(root, artifacts, context);
    if (!dryRun && !process.env.GITHUB_REPOSITORY) throw new Error('GITHUB_REPOSITORY is required');
    status = uploadVerifiedAssets(context.expectedTag, process.env.GITHUB_REPOSITORY, verified.files, {
      dryRun,
      gh: (args, inherit = false) => execFileSync('gh', args, { cwd: root, stdio: inherit ? 'inherit' : 'pipe', maxBuffer: 32 * 1024 * 1024 }),
    });
  } else {
    const plan = releasePublishPlan(root, artifacts, kind, context);
    status = publishVerifiedPackage(plan, { dryRun, npm: npmRunner(root) });
  }
  console.log(JSON.stringify({ package: kind, tag: context.expectedTag, dry_run: dryRun, status }));
}
