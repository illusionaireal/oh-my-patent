import { describe, expect, test, beforeAll, afterAll } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { loadPortableDef } from '../../src/adapters/loader';
import { OpenCodeAdapter } from '../../src/adapters/opencode/index';
import { ClaudeCodeAdapter } from '../../src/adapters/claude/index';
import { CodexAdapter } from '../../src/adapters/codex/index';
import { GENERATED_MARKER, stampGenerated } from '../../src/adapters/generated-marker';

/**
 * REQ-050: generated output must not be re-ingested as input.
 *
 * `loadAgents()` reads `<workspaceDir>/.opencode/agent/*.md` as a workspace
 * override, and `adapt install --tool opencode` writes its generated agents
 * into that same directory. Before the fix the second load therefore read the
 * adapter's own output back:
 *
 *   - `description: "x"` re-read as `"\"x\""`, one more quoting layer per cycle;
 *   - every permission collapsed to `false`, because the generated frontmatter
 *     uses an OpenCode `permission:` block that the parser did not understand;
 *   - consequently `adapt uninstall` skipped all 14 agent files, since it
 *     compares the file on disk with freshly generated content.
 *
 * These tests pin the two halves of the fix: the parser understands the format
 * the adapters actually write, and the loader refuses to treat marked files as
 * overrides.
 */

const pluginDir = resolve(fileURLToPath(import.meta.url), '../../..');

/** Write a file, creating parent directories as needed. */
function write(workspaceDir: string, relPath: string, content: string): void {
  const full = resolve(workspaceDir, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf-8');
}

const agentPath = (id: string) => join('.opencode', 'agent', `${id}.md`);

describe('generated output is never re-ingested (REQ-050)', () => {
  let workspaceDir = '';

  beforeAll(() => {
    workspaceDir = mkdtempSync(join(tmpdir(), 'omp-req050-'));
  });

  afterAll(() => {
    rmSync(workspaceDir, { recursive: true, force: true });
  });

  test('parses the OpenCode permission block and unquotes scalars', async () => {
    write(workspaceDir, agentPath('hand-written'), [
      '---',
      'description: "A hand-authored override."',
      'mode: subagent',
      'permission:',
      '  edit: allow',
      '  bash: allow',
      '  task: deny',
      '  skill: allow',
      '  mcp: allow',
      '---',
      '',
      'Override body.',
      '',
    ].join('\n'));

    const def = await loadPortableDef({ pluginDir, workspaceDir });
    const agent = def.agents.find((item) => item.id === 'hand-written');

    expect(agent).toBeDefined();
    // Quoting is stripped instead of accumulating.
    expect(agent?.description).toBe('A hand-authored override.');
    // `permission:` is the format OpenCode agents actually use; `task` / `skill`
    // have no portable counterpart and are ignored.
    expect(agent?.permissions).toMatchObject({ edit: true, bash: true, mcp: true });
    expect(agent?.permissions.write).toBe(false);
    expect(agent?.promptContent).toBe('\nOverride body.\n');
  });

  test('skips a generated agent file instead of treating it as an override', async () => {
    const generated = stampGenerated([
      '---',
      'description: "WRONG - this text only exists in generated output"',
      'mode: subagent',
      'permission:',
      '  edit: deny',
      '  bash: deny',
      '---',
      '',
      'Generated body.',
      '',
    ].join('\n'));
    expect(generated).toContain(GENERATED_MARKER);
    write(workspaceDir, agentPath('archimedes'), generated);

    const def = await loadPortableDef({ pluginDir, workspaceDir });
    const archimedes = def.agents.find((item) => item.id === 'archimedes');

    // The plugin.jsonc definition wins, with its real permissions intact.
    expect(archimedes?.description).not.toContain('WRONG');
    expect(archimedes?.role).toBe('primary');
    expect(archimedes?.permissions).toMatchObject({ write: true, edit: true, bash: true, mcp: true });
  });

  test('generation is a fixed point: generate(load(generate(def))) equals generate(def)', async () => {
    const fresh = mkdtempSync(join(tmpdir(), 'omp-req050-fp-'));
    try {
      const adapter = new OpenCodeAdapter();

      const def0 = await loadPortableDef({ pluginDir, workspaceDir: fresh });
      const first = await adapter.generate(def0, {});
      for (const [relPath, content] of first.files) {
        write(fresh, relPath, content);
      }

      // Second load sees only generated files, so it must reproduce def0.
      const def1 = await loadPortableDef({ pluginDir, workspaceDir: fresh });
      const second = (await adapter.generate(def1, {})).files;

      expect([...second.keys()]).toEqual([...first.files.keys()]);
      for (const [relPath, content] of first.files) {
        expect(second.get(relPath), `${relPath} drifted on regeneration`).toBe(content);
      }

      // Metadata equality is the part that silently degraded before.
      const meta = (def2: typeof def0) => def2.agents.map((a) => ({
        id: a.id, description: a.description, role: a.role, ...a.permissions,
      }));
      expect(meta(def1)).toEqual(meta(def0));
    } finally {
      rmSync(fresh, { recursive: true, force: true });
    }
  });

  test('a reload no longer contaminates the claude-code and codex output', async () => {
    const fresh = mkdtempSync(join(tmpdir(), 'omp-req050-x-'));
    try {
      const def0 = await loadPortableDef({ pluginDir, workspaceDir: fresh });
      const opencode = new OpenCodeAdapter();
      for (const [relPath, content] of (await opencode.generate(def0, {})).files) {
        write(fresh, relPath, content);
      }

      const def1 = await loadPortableDef({ pluginDir, workspaceDir: fresh });

      for (const adapter of [new ClaudeCodeAdapter(), new CodexAdapter()]) {
        const before = (await adapter.generate(def0, {})).files;
        const after = (await adapter.generate(def1, {})).files;
        for (const [relPath, content] of before) {
          expect(after.get(relPath), `${adapter.name}: ${relPath}`).toBe(content);
        }
      }
    } finally {
      rmSync(fresh, { recursive: true, force: true });
    }
  });
});
