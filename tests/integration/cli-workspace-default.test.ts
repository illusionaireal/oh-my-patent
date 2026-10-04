import { describe, expect, test, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

/**
 * REQ-008: `adapt install` / `setup` / `uninstall` defaulted the workspace to the
 * package's *parent* directory. With a global install that is
 * `.../node_modules`, so `oh-my-patent adapt install` wrote editor configs into
 * node_modules and the README had to tell everyone to pass `--workspace-dir .`.
 *
 * The default is now the current working directory. These tests run the real CLI
 * as a subprocess with cwd set to a temp directory and pass no `--workspace-dir`,
 * which is the only way to exercise the default.
 */

const cliPath = resolve(process.cwd(), 'dist/cli.js');

function runCli(args: string, cwd: string): string {
  return execSync(`node "${cliPath}" ${args}`, { encoding: 'utf-8', cwd });
}

describe('adapt workspace default (REQ-008)', () => {
  let workspace = '';

  beforeAll(() => {
    if (!existsSync(cliPath)) {
      throw new Error('CLI not built. Run `npm run build` first.');
    }
    workspace = mkdtempSync(join(tmpdir(), 'oh-my-patent-ws-'));
  });

  afterAll(() => {
    if (workspace && existsSync(workspace)) {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  /** The CLI reports the resolved workspace as `installed` (JSON-escaped path). */
  function installedDir(output: string): string {
    const line = output.split('\n').find((entry) => entry.trim().startsWith('{'));
    expect(line, `no JSON line in: ${output}`).toBeDefined();
    return resolve((JSON.parse(line as string) as { installed: string }).installed);
  }

  test('install without --workspace-dir writes into the current directory', () => {
    const output = runCli('adapt install --tool opencode', workspace);
    expect(installedDir(output)).toBe(resolve(workspace));

    expect(existsSync(join(workspace, '.opencode', 'agent', 'archimedes.md'))).toBe(true);
    expect(existsSync(join(workspace, '.opencode', 'command'))).toBe(true);
  });

  test('the created paths are inside the cwd, not the package parent', () => {
    // `resolve(cliPath, '..', '..')` is the package root; the old default was its
    // parent. Assert nothing was written to either.
    const packageRoot = resolve(cliPath, '..', '..');
    expect(existsSync(join(packageRoot, '..', '.opencode'))).toBe(false);
    expect(existsSync(join(packageRoot, '.opencode'))).toBe(false);
  });

  test('uninstall without --workspace-dir finds what install wrote', () => {
    // Both must resolve the same default, otherwise uninstall would look in the
    // package parent and silently remove nothing.
    const before = runCli('adapt install --tool opencode', workspace);
    expect(installedDir(before)).toBe(resolve(workspace));

    runCli('adapt uninstall --tool opencode', workspace);
    expect(existsSync(join(workspace, '.opencode', 'agent', 'archimedes.md'))).toBe(false);
  });

  test('the help text states the real default', () => {
    const help = runCli('--help', workspace);
    expect(help).toContain('Workspace directory (default: current working directory)');
    expect(help).not.toContain('parent of plugin dir');
  });
});
