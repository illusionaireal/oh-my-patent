import { describe, expect, test, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { loadPortableDef } from '../../src/adapters/loader';
import { ClaudeCodeAdapter } from '../../src/adapters/claude/index';
import { CodexAdapter } from '../../src/adapters/codex/index';
import { OpenCodeAdapter } from '../../src/adapters/opencode/index';
import { isGeneratedFile } from '../../src/adapters/prune';
import type { ToolAdapter } from '../../src/adapters/types';

/**
 * REQ-051: only codex used to write a generation fingerprint. opencode output
 * and claude command files carried none, so `adapt install --prune` could
 * never recognise them — and the original REQ-013 test wrote its own marker
 * into the fixture, testing the fixture instead of the implementation.
 *
 * Here the fixtures are real adapter output. Nothing in this file hand-writes
 * a generation marker: the "stale" file that prune must remove is a copy of a
 * file the adapter itself produced, renamed so the current definition no
 * longer lists it. Before the fix both tests fail: the marker was missing.
 */

const pluginDir = resolve(fileURLToPath(import.meta.url), '../../..');
const cliPath = resolve(pluginDir, 'dist/cli.js');

const toPosix = (p: string) => p.split('\\').join('/');

describe('every adapter stamps its managed markdown output (REQ-051)', () => {
  test('all managed .md products satisfy isGeneratedFile()', async () => {
    const workspaceDir = mkdtempSync(join(tmpdir(), 'omp-fp-stamp-'));
    try {
      const def = await loadPortableDef({ pluginDir, workspaceDir });
      const adapters: ToolAdapter[] = [
        new ClaudeCodeAdapter(),
        new CodexAdapter(),
        new OpenCodeAdapter(),
      ];

      for (const adapter of adapters) {
        const managedDirs = adapter
          .getManagedDirectories()
          .map((dir) => `${toPosix(dir)}/`);
        const { files } = await adapter.generate(def, {});

        let checked = 0;
        for (const [relPath, content] of files) {
          const posix = toPosix(relPath);
          const underManaged = managedDirs.some((dir) => posix.startsWith(dir));
          if (!underManaged || !posix.endsWith('.md')) {
            continue; // JSON/YAML manifests carry no marker by design.
          }
          expect(
            isGeneratedFile(content),
            `${adapter.name}: ${relPath} carries no generated marker`,
          ).toBe(true);
          checked++;
        }
        expect(
          checked,
          `${adapter.name} produced no managed markdown to check`,
        ).toBeGreaterThan(0);
      }
    } finally {
      rmSync(workspaceDir, { recursive: true, force: true });
    }
  });
});

describe('prune removes real generated output it no longer produces (REQ-051)', () => {
  const cases = [
    { tool: 'claude-code', commandDir: join('.claude', 'commands') },
    { tool: 'opencode', commandDir: join('.opencode', 'command') },
  ];

  beforeAll(() => {
    if (!existsSync(cliPath)) {
      throw new Error('CLI not built. Run `npm run build` first.');
    }
  });

  for (const { tool, commandDir } of cases) {
    test(`${tool}: a renamed real product is pruned, a marker-less file survives`, async () => {
      const workspaceDir = mkdtempSync(join(tmpdir(), `omp-fp-prune-${tool}-`));
      // claude-code mirrors agents into ~/.claude-best; keep that off the real profile.
      const fakeHome = mkdtempSync(join(tmpdir(), `omp-fp-home-${tool}-`));
      try {
        const def = await loadPortableDef({ pluginDir, workspaceDir });
        const commandId = def.commands[0]?.id;
        expect(commandId, 'definition has at least one command').toBeTruthy();

        const firstInstall = execSync(
          `node "${cliPath}" adapt install --tool ${tool} --workspace-dir "${workspaceDir}"`,
          { encoding: 'utf-8', env: { ...process.env, HOME: fakeHome, USERPROFILE: fakeHome } },
        );
        expect(firstInstall).toContain('"ok":true');

        // Fixture hygiene: what install wrote must be recognisably generated.
        const producedPath = join(commandDir, `${commandId}.md`);
        const producedFull = resolve(workspaceDir, producedPath);
        expect(existsSync(producedFull), `${producedPath} was installed`).toBe(true);
        expect(
          isGeneratedFile(readFileSync(producedFull, 'utf-8')),
          `${tool} install output carries no marker (this is the REQ-051 bug)`,
        ).toBe(true);

        // Stale product = the adapter's own bytes, renamed out of the produced set.
        const stalePath = join(commandDir, `legacy-${commandId}.md`);
        const { copyFileSync } = await import('fs');
        copyFileSync(producedFull, resolve(workspaceDir, stalePath));

        // User-owned file: no marker anywhere, so prune must preserve it.
        const ownPath = join(commandDir, 'my-own-command.md');
        writeFileSync(resolve(workspaceDir, ownPath), '# My own command\n', 'utf-8');

        const secondInstall = execSync(
          `node "${cliPath}" adapt install --tool ${tool} --workspace-dir "${workspaceDir}" --prune`,
          { encoding: 'utf-8', env: { ...process.env, HOME: fakeHome, USERPROFILE: fakeHome } },
        );
        const lastJsonLine = secondInstall
          .trim()
          .split('\n')
          .filter((line) => line.startsWith('{'))
          .pop();
        const result = JSON.parse(lastJsonLine ?? '{}') as { pruned?: number };
        expect(result.pruned, 'prune removed at least the stale product').toBeGreaterThanOrEqual(1);

        expect(existsSync(resolve(workspaceDir, stalePath)), `${stalePath} pruned`).toBe(false);
        expect(existsSync(resolve(workspaceDir, ownPath)), `${ownPath} preserved`).toBe(true);
        expect(existsSync(producedFull), `${producedPath} still produced`).toBe(true);
      } finally {
        rmSync(workspaceDir, { recursive: true, force: true });
        rmSync(fakeHome, { recursive: true, force: true });
      }
    });
  }
});

describe('clean install followed by clean uninstall (REQ-050)', () => {
  test('opencode: uninstall removes what install wrote — skipped 0, no residue', () => {
    const workspaceDir = mkdtempSync(join(tmpdir(), 'omp-fp-uninst-'));
    try {
      const installOut = execSync(
        `node "${cliPath}" adapt install --tool opencode --workspace-dir "${workspaceDir}"`,
        { encoding: 'utf-8' },
      );
      expect(installOut).toContain('"ok":true');
      expect(existsSync(join(workspaceDir, '.opencode', 'agent', 'archimedes.md'))).toBe(true);

      const uninstallOut = execSync(
        `node "${cliPath}" adapt uninstall --tool opencode --workspace-dir "${workspaceDir}"`,
        { encoding: 'utf-8' },
      );
      const result = JSON.parse(
        uninstallOut
          .trim()
          .split('\n')
          .filter((line) => line.startsWith('{'))
          .pop() ?? '{}',
      ) as { ok: boolean; removed: number; skipped: number };

      expect(result.ok).toBe(true);
      expect(result.removed, 'uninstall actually removed files').toBeGreaterThan(0);
      // Before REQ-050 the re-ingested definitions drifted from what install
      // writes, so uninstall skipped all 14 agent files.
      expect(result.skipped, 'nothing may be skipped').toBe(0);
      expect(existsSync(join(workspaceDir, '.opencode')), 'no .opencode residue').toBe(false);
    } finally {
      rmSync(workspaceDir, { recursive: true, force: true });
    }
  });
});
