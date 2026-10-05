/** stdin / --input JSON file protocol. Smoke: node scripts/runtime.mjs --version */
import { readFileSync } from 'node:fs';
import { runOperation } from './operations.js';
import { ProjectError } from '../core/project-store.js';

try {
  if (Number(process.versions.node.split('.')[0]) < 22) throw new ProjectError('MISSING_CAPABILITY', 'Node.js 22 or newer is required');
  const args = process.argv.slice(2);
  let request;
  if (args.length === 1 && ['--version', '--doctor'].includes(args[0])) request = { interface_version: 1 as const, operation: args[0].slice(2) };
  else if (args.length === 0) request = JSON.parse(readFileSync(0, 'utf8').replace(/^\uFEFF/, ''));
  else if (args.length === 2 && args[0] === '--input') request = JSON.parse(readFileSync(args[1], 'utf8').replace(/^\uFEFF/, ''));
  else throw new ProjectError('INVALID_INPUT', 'Use stdin, --input <JSON file>, --version or --doctor');
  const data = await runOperation(request);
  process.stdout.write(JSON.stringify({ ok: true, data, artifacts: [], warnings: [] }) + '\n');
} catch (error) {
  const code = error instanceof ProjectError ? error.code : error instanceof SyntaxError ? 'INVALID_INPUT' : (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'MISSING_FILE' : 'INTERNAL_ERROR';
  const exit = ['CONFLICT', 'LOCKED', 'RECOVERY_REQUIRED'].includes(code) ? 3 : ['MISSING_FILE', 'MISSING_CAPABILITY'].includes(code) ? 4 : ['DISCLOSURE_DENIED', 'RENDER_FAILED'].includes(code) ? 5 : code === 'INTERNAL_ERROR' ? 1 : 2;
  process.stdout.write(JSON.stringify({ ok: false, data: null, artifacts: [], warnings: [], error: { code, message: error instanceof Error ? error.message : String(error) } }) + '\n');
  process.exitCode = exit;
}
