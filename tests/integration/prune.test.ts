import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';

const repoRoot = process.cwd();
const cliPath = resolve(repoRoot, 'dist/cli.js');

/**
 * Agents that were declared by an earlier version of plugin.jsonc and are
 * still present in some workspaces. `generate()` only writes and `uninstall()`
 * derives its list from the current definition, so neither removes them —
 * `adapt install --prune` is the fix under test here.
 */
const LEGACY_AGENTS = [
  'patent-architect',
  'patent-evaluator',
  'patent-reviewer',
  'patent-scout',
  'patent-writer',
];

/** Agent files a current definition produces, counted without pruning. */
const CURRENT_AGENT_COUNT = 14;

describe('adapt install --prune', () => {
  let workspaceDir: string;
  let fakeHome: string;

  beforeAll(() => {
    if (!existsSync(cliPath)) {
      throw new Error('CLI not built. Run `npm run build` first.');
    }
    workspaceDir = mkdtempSync(join(tmpdir(), 'omp-prune-ws-'));
    // `install` also mirrors agents into ~/.claude-best for Claude Code;
    // redirect HOME so the suite never writes to the real user profile.
    fakeHome = mkdtempSync(join(tmpdir(), 'omp-prune-home-'));

    const agentsDir = join(workspaceDir, '.claude', 'agents');
    mkdirSync(agentsDir, { recursive: true });
    for (const id of LEGACY_AGENTS) {
      writeFileSync(
        join(agentsDir, `${id}.md`),
        `---\nname: "${id}"\n---\n\n<!-- Agent: ${id} | Role: subagent -->\n\n# ${id}\n`,
        'utf-8',
      );
    }

    const commandsDir = join(workspaceDir, '.claude', 'commands');
    mkdirSync(commandsDir, { recursive: true });
    writeFileSync(join(commandsDir, 'my-own-command.md'), '# My own command\n', 'utf-8');
  });

  afterAll(() => {
    for (const dir of [workspaceDir, fakeHome]) {
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  const install = (extraArgs: string) => execSync(
    `node "${cliPath}" adapt install --tool claude-code --workspace-dir "${workspaceDir}" ${extraArgs}`,
    { encoding: 'utf-8', env: { ...process.env, USERPROFILE: fakeHome, HOME: fakeHome } },
  );

  test('should keep legacy output in place when run without --prune', () => {
    install('');

    const agents = readdirSync(join(workspaceDir, '.claude', 'agents'));
    expect(agents).toHaveLength(CURRENT_AGENT_COUNT + LEGACY_AGENTS.length);
    for (const id of LEGACY_AGENTS) {
      expect(agents).toContain(`${id}.md`);
    }
  });

  test('should delete generated files the definition no longer produces', () => {
    const output = install('--prune');

    const agents = readdirSync(join(workspaceDir, '.claude', 'agents'));
    expect(agents).toHaveLength(CURRENT_AGENT_COUNT);
    for (const id of LEGACY_AGENTS) {
      expect(agents).not.toContain(`${id}.md`);
    }

    const result = JSON.parse(output.trim().split('\n').pop() ?? '{}');
    expect(result.pruned).toBe(LEGACY_AGENTS.length);
  });

  test('should never delete a file that carries no generated marker', () => {
    install('--prune');

    // Written by the user, so it is not ours to remove even though it lives in
    // a managed directory and is absent from the generated file list.
    expect(existsSync(join(workspaceDir, '.claude', 'commands', 'my-own-command.md'))).toBe(true);
  });
});
