// Smoke: node scripts/build-legacy-fixtures.mjs && npm test -- tests/skill-package/legacy-upgrade.test.ts
// Requires the pinned baseline Git object locally; tests use the committed fixture, not Git/network.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { brotliCompressSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const baseline = 'fc40901943e2ffb742167ea4848de7a0c321b77e';
// A child of the checkout resolves the already installed compiler dependencies on every OS.
const staging = mkdtempSync(join(root, '.test-legacy-baseline-'));
const snapshot = join(staging, 'snapshot');
const variants = {};
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function setSourceEndings(directory, ending) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) setSourceEndings(file, ending);
    else writeFileSync(file, readFileSync(file, 'utf8').replace(/\r?\n/g, ending));
  }
}
try {
  mkdirSync(snapshot);
  const archive = join(staging, 'baseline.tar');
  execFileSync('git', ['archive', '--format=tar', '--output', archive, baseline], { cwd: root });
  execFileSync('tar', ['-xf', archive, '-C', snapshot]);
  execFileSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '-p', join(snapshot, 'tsconfig.json')]);
  const { loadPortableDef } = await import(pathToFileURL(join(snapshot, 'dist/adapters/loader.js')).href);
  const adapters = [
    ['claude-code', 'claude', 'ClaudeCodeAdapter'],
    ['codex', 'codex', 'CodexAdapter'],
    ['opencode', 'opencode', 'OpenCodeAdapter'],
  ];
  for (const [variant, ending] of [['lf', '\n'], ['crlf', '\r\n']]) {
    setSourceEndings(join(snapshot, 'src'), ending);
    const def = await loadPortableDef({ pluginDir: snapshot, workspaceDir: join(staging, 'empty-workspace') });
    const config = Object.fromEntries(Object.entries(def.config).map(([key, field]) => [key, field.default]));
    variants[variant] = {};
    for (const [host, directory, exportName] of adapters) {
      const module = await import(pathToFileURL(join(snapshot, `dist/adapters/${directory}/index.js`)).href);
      const generated = await new module[exportName]().generate(def, config);
      const files = Object.fromEntries([...generated.files].map(([name, content]) => [name.replace(/\\/g, '/'), content]));
      variants[variant][host] = files;
    }
  }
  const fixture = brotliCompressSync(JSON.stringify({ baseline, variants }) + '\n');
  const destination = join(root, 'tests/fixtures/legacy-installations');
  mkdirSync(destination, { recursive: true });
  writeFileSync(join(destination, '0.3.3.json.br'), fixture);
  console.log(JSON.stringify({ baseline, variants: Object.keys(variants), fixture_bytes: fixture.length, fixture_sha256: sha(fixture) }));
} finally {
  rmSync(staging, { recursive: true, force: true });
}
