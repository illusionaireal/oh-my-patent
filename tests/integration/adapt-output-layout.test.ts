import { describe, expect, test, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, mkdtempSync, readdirSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

/**
 * REQ-007: `adapt generate --output <dir>` pointed every adapter at the same
 * directory, so the three of them overwrote one another's root-level files
 * (`CLAUDE.md`, `AGENTS.md`, `codex.json`) and only the last adapter survived.
 *
 * The temp root lives under `os.tmpdir()`, not in the repository: a directory inside
 * the repo gets picked up by the test runner's own glob and leaves residue behind.
 *
 * ⚠️ 这里**不做** `afterAll` 递归清理（REQ-044）。本机实测删除成本约
 * **47 ms/文件**（300 文件 = 14.0 s，与删除守卫无关，清空注入后同量级），
 * 而本用例生成的产物树有数百个文件 —— 递归删除必然撞上钩子预算，
 * 把一个「清理卫生」动作变成文件级失败。目录在 `os.tmpdir()` 下，
 * 交给操作系统回收即可。
 */

const cliPath = resolve(process.cwd(), 'dist/cli.js');
const TOOLS = ['claude-code', 'codex', 'opencode'];

describe('adapt generate --output layout (REQ-007)', () => {
  let outDir = '';

  beforeAll(() => {
    if (!existsSync(cliPath)) {
      throw new Error('CLI not built. Run `npm run build` first.');
    }
    outDir = mkdtempSync(join(tmpdir(), 'oh-my-patent-out-'));
  });

  test('each adapter gets its own subdirectory', () => {
    const output = execSync(`node "${cliPath}" adapt generate --output "${outDir}"`, {
      encoding: 'utf-8',
    });
    const lines = output
      .trim()
      .split('\n')
      .filter((line) => line.startsWith('{'))
      .map((line) => JSON.parse(line));

    expect(lines.length).toBe(TOOLS.length);
    for (const tool of TOOLS) {
      expect(existsSync(join(outDir, tool)), `${tool}/ was not created`).toBe(true);
    }
    // Reported paths must match the directories actually created.
    expect(lines.map((entry) => entry.output).sort()).toEqual(
      TOOLS.map((tool) => join(outDir, tool)).sort(),
    );
  });

  test('root-level files stay inside their own adapter directory', () => {
    // Each of these exists in exactly one adapter's output; before the fix they
    // all landed directly in <dir> and overwrote each other.
    expect(existsSync(join(outDir, 'claude-code', 'CLAUDE.md'))).toBe(true);
    expect(existsSync(join(outDir, 'codex', 'AGENTS.md'))).toBe(true);
    expect(existsSync(join(outDir, 'codex', 'codex.json'))).toBe(true);

    for (const leaked of ['CLAUDE.md', 'AGENTS.md', 'codex.json']) {
      expect(existsSync(join(outDir, leaked)), `${leaked} leaked into the output root`).toBe(false);
    }
  });

  test("no adapter directory contains another adapter's files", () => {
    // `.claude/` is claude-code only, `.codex/` is codex only, `.opencode/` is opencode only.
    const ownership: Record<string, string> = {
      '.claude': 'claude-code',
      '.codex': 'codex',
      '.opencode': 'opencode',
    };
    for (const tool of TOOLS) {
      const entries = readdirSync(join(outDir, tool));
      for (const [marker, owner] of Object.entries(ownership)) {
        if (owner !== tool) {
          expect(entries, `${marker} from ${owner} found under ${tool}`).not.toContain(marker);
        }
      }
    }
  });
});
