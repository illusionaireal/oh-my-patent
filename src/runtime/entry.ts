/** Shared JSON runtime entry. Smoke: node dist/cli.js runtime --doctor */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runOperation, type RuntimeRequest } from './operations.js';
import { ProjectError } from '../core/project-store.js';
import { ensureUnlinkedPath } from '../core/path-safety.js';

export async function runRuntime(argv: string[], workspaceDir?: string): Promise<void> {
  try {
    if (Number(process.versions.node.split('.')[0]) < 22) throw new ProjectError('MISSING_CAPABILITY', 'Node.js 22 or newer is required');
    let request: RuntimeRequest;
    if (argv.length === 1 && ['--version', '--doctor'].includes(argv[0])) request = { interface_version: 1, operation: argv[0].slice(2) };
    else if (argv.length === 0) request = JSON.parse(readFileSync(0, 'utf8').replace(/^\uFEFF/, ''));
    else if (argv.length === 2 && argv[0] === '--input') request = JSON.parse(readFileSync(argv[1], 'utf8').replace(/^\uFEFF/, ''));
    else throw new ProjectError('INVALID_INPUT', 'Use stdin, --input <JSON file>, --version or --doctor');
    if (workspaceDir && request.project) {
      request.project = resolve(workspaceDir, request.project);
      ensureUnlinkedPath(workspaceDir, request.project);
      // Installed plugins know their workspace even when invoked from another cwd.
      if (request.params !== undefined && (!request.params || typeof request.params !== 'object' || Array.isArray(request.params))) throw new ProjectError('INVALID_INPUT', 'params must be an object');
      request.params = { ...request.params, workspace: workspaceDir };
    }
    const data = await runOperation(request);
    process.stdout.write(JSON.stringify({ ok: true, data, artifacts: [], warnings: [] }) + '\n');
  } catch (error) {
    const code = error instanceof ProjectError ? error.code : error instanceof SyntaxError ? 'INVALID_INPUT' : (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'MISSING_FILE' : 'INTERNAL_ERROR';
    const exit = ['CONFLICT', 'LOCKED', 'RECOVERY_REQUIRED'].includes(code) ? 3 : ['MISSING_FILE', 'MISSING_CAPABILITY'].includes(code) ? 4 : ['DISCLOSURE_DENIED', 'RENDER_FAILED'].includes(code) ? 5 : code === 'INTERNAL_ERROR' ? 1 : 2;
    process.stdout.write(JSON.stringify({ ok: false, data: null, artifacts: [], warnings: [], error: { code, message: error instanceof Error ? error.message : String(error) } }) + '\n');
    process.exitCode = exit;
  }
}
