import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const readJson = file => JSON.parse(readFileSync(file, 'utf8'));

/** Pack only the generated portable Skill; never publish the staging directory. */
export function packStandaloneSkill(root, skill, out, names) {
  if (!process.env.npm_execpath) throw new Error('Run through npm run package:skill');
  const pkg = readJson(join(root, 'package.json'));
  const definition = readJson(join(root, 'distribution/skill-package.json'));
  if (definition.name === pkg.name) throw new Error('Standalone Skill needs a separate npm package name');
  const metadata = {
    ...definition, version: pkg.version, type: 'module', license: pkg.license,
    author: pkg.author, engines: pkg.engines,
    repository: { ...pkg.repository, directory: 'skills/oh-my-patent' },
    homepage: pkg.homepage, bugs: pkg.bugs,
    files: [...names, 'README.md'],
    publishConfig: { access: 'public', tag: pkg.version.includes('-') ? 'next' : 'latest' },
  };
  const stage = mkdtempSync(join(tmpdir(), 'omp-skill-npm-'));
  try {
    cpSync(skill, stage, { recursive: true });
    writeFileSync(join(stage, 'package.json'), JSON.stringify(metadata, null, 2) + '\n');
    const readme = readFileSync(join(root, 'distribution/skill-package-README.md'), 'utf8').replace(/\r\n/g, '\n').replaceAll('__VERSION__', pkg.version);
    writeFileSync(join(stage, 'README.md'), readme);
    const packed = JSON.parse(execFileSync(process.execPath, [process.env.npm_execpath, 'pack', '--ignore-scripts', '--json', '--pack-destination', out], { cwd: stage, encoding: 'utf8' }));
    return { name: metadata.name, version: pkg.version, tarball: packed[0].filename, tag: metadata.publishConfig.tag };
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}

/** Select the verified Skill tarball and enforce the existing stable host gate. */
export function standalonePublishPlan(root, artifacts, expectedCommit) {
  const release = readJson(join(artifacts, 'release-manifest.json'));
  const pkg = readJson(join(root, 'package.json'));
  const definition = readJson(join(root, 'distribution/skill-package.json'));
  const skill = release.npm_packages?.skill;
  if (!skill || skill.name !== definition.name || skill.name === pkg.name || skill.version !== pkg.version || release.version !== pkg.version) throw new Error('Standalone package identity/version mismatch');
  if (expectedCommit && release.source_commit !== expectedCommit) throw new Error('Verified artifacts belong to a different commit');
  const filename = `${skill.name.replace(/^@/, '').replace('/', '-')}-${skill.version}.tgz`;
  if (skill.tarball !== filename || !/^[a-z0-9._-]+-\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?\.tgz$/.test(filename)) throw new Error('Invalid Skill tarball path');
  const tarball = resolve(artifacts, filename);
  const checksum = release.artifact_checksums[filename];
  if (!checksum || sha(readFileSync(tarball)) !== checksum) throw new Error('Standalone Skill checksum mismatch');
  const tag = skill.version.includes('-') ? 'next' : 'latest';
  if (skill.tag !== tag) throw new Error('Standalone Skill dist-tag mismatch');
  if (tag === 'latest') {
    const targets = readJson(join(root, 'distribution/targets.json')).targets.filter(target => target.wave === 1);
    if (targets.length !== 3 || targets.some(target => !target.install_verified || !target.workflow_verified)) throw new Error('Stable release requires real host verification');
  }
  return { name: skill.name, version: skill.version, tag, tarball, args: ['publish', tarball, '--tag', tag, '--access', 'public', '--ignore-scripts', '--registry', 'https://registry.npmjs.org/'] };
}
