// Smoke: npm run build:check; node dist/runtime/check.mjs --json --workspace-dir .
import { build } from 'esbuild';
import { builtinModules } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const result = await build({ absWorkingDir: root, entryPoints: ['src/runtime/check-entry.ts'],
  outfile: 'check.mjs', write: false, bundle: true, platform: 'node', target: 'node22',
  format: 'esm', metafile: true, legalComments: 'inline', charset: 'utf8' });
const builtins = new Set([...builtinModules, ...builtinModules.map(name => `node:${name}`)]);
for (const output of Object.values(result.metafile.outputs)) {
  for (const item of output.imports) if (item.external && !builtins.has(item.path)) throw new Error(`Unbundled check dependency: ${item.path}`);
}
mkdirSync(resolve(root, 'dist/runtime'), { recursive: true });
writeFileSync(resolve(root, 'dist/runtime/check.mjs'), result.outputFiles[0].contents);
