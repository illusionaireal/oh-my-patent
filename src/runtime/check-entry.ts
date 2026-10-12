/** Bundled installed checker. Smoke: node dist/runtime/check.mjs --json --workspace-dir . */
import { dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runRuntime } from './entry.js';
import { runCheck } from '../commands/check.js';
import { INIT_CHECK_HOSTS, type InitCheckHost } from '../core/init-checker.js';

try {
  const directory = dirname(fileURLToPath(import.meta.url));
  const installed = INIT_CHECK_HOSTS.includes(basename(directory) as InitCheckHost);
  if (!installed && !process.argv.includes('--workspace-dir')) throw new Error('Uninstalled checker requires --workspace-dir <directory>');
  if (process.argv[2] === '--runtime') {
    if (!installed) throw new Error('Use the installed checker for --runtime');
    await runRuntime(process.argv.slice(3), dirname(dirname(dirname(directory))));
  } else await runCheck(process.argv.slice(2), {
    workspaceDir: installed ? dirname(dirname(dirname(directory))) : process.cwd(),
    host: installed ? basename(directory) as InitCheckHost : undefined,
  });
} catch (error) {
  console.log(JSON.stringify({ ok: false, ready: false, error: {
    code: 'CHECK_FAILED', message: error instanceof Error ? error.message : String(error),
  } }));
  process.exitCode = 1;
}
