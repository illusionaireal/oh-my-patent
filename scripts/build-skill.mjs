// Smoke: npm run build:skill. Deterministic, no source-tree runtime dependency.
import { build } from 'esbuild';
import { builtinModules } from 'node:module';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_PROJECT_CONFIG } from '../dist/core/project-config.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destination = join(root, 'skills/oh-my-patent');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const sha = data => createHash('sha256').update(data).digest('hex');
const files = new Map();
const sources = {};
function source(name) {
  const data = Buffer.from(readFileSync(join(root, name), 'utf8').replace(/\r\n/g, '\n')); sources[name] = sha(data); return data;
}
function walk(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name, 'en')).flatMap(entry => {
    if (entry.isSymbolicLink()) throw new Error(`Symlink forbidden: ${entry.name}`);
    const name = prefix + entry.name;
    return entry.isDirectory() ? walk(join(directory, entry.name), name + '/') : [name];
  });
}
for (const name of walk(join(root, 'src/skill-entry'))) files.set(name, source(`src/skill-entry/${name}`));
files.set('assets/config.defaults.json', Buffer.from(JSON.stringify(DEFAULT_PROJECT_CONFIG, null, 2) + '\n'));
const resources = [];
for (const name of walk(join(root, 'src/agents')).filter(n => n.endsWith('.md'))) {
  const target = `references/role-${name}`;
  const override = `src/skill-resources/agents/${name}`;
  const body = source(existsSync(join(root, override)) ? override : `src/agents/${name}`).toString('utf8').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').replace(/\r\n/g, '\n');
  files.set(target, Buffer.from(body)); resources.push(`- [${name.slice(0,-3)}](${target}) — load only for this role's current task.`);
}
for (const name of walk(join(root, 'src/skills')).filter(n => n.endsWith('/SKILL.md'))) {
  const id = name.split('/')[0];
  const target = `references/capability-${id}.md`;
  const override = `src/skill-resources/capabilities/${id}.md`;
  files.set(target, Buffer.from(source(existsSync(join(root, override)) ? override : `src/skills/${name}`).toString('utf8').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').replace(/\r\n/g, '\n')));
  if (['disclosure-template', 'evidence-card'].includes(id)) {
    const template = files.get(target).toString('utf8').match(/```markdown\n([\s\S]*?)```/);
    if (!template) throw new Error(`Template source missing: ${id}`);
    files.set(`assets/${id}.md`, Buffer.from(template[1]));
  }
  resources.push(`- [${id}](${target}) — load when this capability is needed.`);
}
const targets = JSON.parse(source('distribution/targets.json'));
for (const host of targets.targets) {
  const name = `references/host-${host.id}.md`;
  files.set(name, Buffer.from(`# ${host.name}\n\nCandidate project path: \`${host.project_path}\`. ${host.note}\n\nInstallation and workflow status: unverified. Inspect actual tools/permissions;\nno native subagent or remote-tool capability is implied by the host name.\nUse the shared runtime interface and one canonical package copy.\n`));
  resources.push(`- [${host.name}](${name}) — read only on this host.`);
}
files.set('SKILL.md', Buffer.from(files.get('SKILL.md').toString('utf8').replace('<!-- RESOURCE_INDEX -->', resources.join('\n')).replace(/\r\n/g, '\n')));
const result = await build({ absWorkingDir: root, entryPoints: ['src/runtime/skill-entry.ts'], outfile: 'runtime.mjs', write: false, bundle: true, platform: 'node', target: 'node22', format: 'esm', metafile: true, legalComments: 'inline', charset: 'utf8' });
const runtime = result.outputFiles[0].contents;
if (runtime.length > 2 * 1024 * 1024) throw new Error('Runtime exceeds 2 MiB');
const inputs = Object.keys(result.metafile.inputs).sort();
if (inputs.some(n => /(?:src\/(?:cli\.ts|adapters\/|tui\/)|node_modules\/(?:react|ink)\/)/.test(n))) throw new Error('Forbidden runtime dependency');
const builtins = new Set([...builtinModules, ...builtinModules.map(n => `node:${n}`)]);
for (const output of Object.values(result.metafile.outputs)) for (const dep of output.imports) if (dep.external && !builtins.has(dep.path)) throw new Error(`Unbundled dependency: ${dep.path}`);
for (const input of inputs) source(input);
source('package.json'); source('package-lock.json'); source('scripts/build-skill.mjs');
files.set('scripts/runtime.mjs', runtime);
files.set('LICENSE', source('LICENSE'));
const licenses = [];
for (const dependency of ['saxes', 'xmlchars']) {
  const info = JSON.parse(source(`node_modules/${dependency}/package.json`));
  const licenseName = walk(join(root, `node_modules/${dependency}`)).find(n => /^LICENSE(?:\.txt)?$/i.test(n));
  files.set(`scripts/licenses/${dependency}.txt`, source(licenseName ? `node_modules/${dependency}/${licenseName}` : `scripts/licenses/${dependency}.txt`));
  licenses.push({ name: dependency, version: info.version, license: info.license });
}
files.set('scripts/manifest.json', Buffer.from(JSON.stringify({ package_version: pkg.version, interface_version: 1, state_schema_version: 1, node: '>=22', runtime_bytes: runtime.length, inputs, dependencies: licenses, sources, files: Object.fromEntries([...files].sort(([a],[b]) => a.localeCompare(b, 'en')).map(([name,data]) => [name,sha(data)])) }, null, 2) + '\n'));
if (files.get('SKILL.md').toString().split('\n').length >= 500) throw new Error('Skill entry exceeds line budget');
// Remove only obsolete files in this exact generated tree, never arbitrary parents.
if (existsSync(destination)) for (const name of walk(destination)) if (!files.has(name)) rmSync(join(destination, name));
for (const [name, data] of files) { const out = join(destination, name); mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, data); }
console.log(JSON.stringify({ output: relative(root, destination), files: files.size, runtime_bytes: runtime.length }));
