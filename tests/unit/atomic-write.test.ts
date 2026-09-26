import { describe, test, expect, afterAll } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { atomicWriteFileSync, tempPathFor } from '../../src/core/atomic-write';

/**
 * REQ-016: one atomic write strategy. The old state-manager wrote a temp file,
 * `unlinkSync`ed the target and only then renamed — a crash inside that window
 * lost state.json on Windows. The shared implementation never unlinks the
 * target: it is either the old file or the new file.
 */
describe('atomicWriteFileSync (REQ-016)', () => {
  const dirs: string[] = [];
  const tempDir = () => {
    const dir = mkdtempSync(join(tmpdir(), 'omp-atomic-'));
    dirs.push(dir);
    return dir;
  };

  afterAll(() => {
    for (const dir of dirs) {
      if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    }
  });

  test('creates the file and leaves no temp residue', () => {
    const dir = tempDir();
    const file = join(dir, 'nested', 'data.json');

    atomicWriteFileSync(file, '{"a":1}');

    expect(readFileSync(file, 'utf-8')).toBe('{"a":1}');
    expect(readdirSync(join(dir, 'nested'))).toEqual(['data.json']);
  });

  test('replacing an existing file always leaves valid JSON (repeated writes)', () => {
    const dir = tempDir();
    const file = join(dir, 'state.json');

    for (let round = 1; round <= 3; round++) {
      atomicWriteFileSync(file, JSON.stringify({ round, payload: 'x'.repeat(round * 1000) }));
      // Every read must see complete, parseable JSON — never a truncated file.
      const parsed = JSON.parse(readFileSync(file, 'utf-8')) as { round: number };
      expect(parsed.round).toBe(round);
      expect(readdirSync(dir)).toEqual(['state.json']);
    }
  });

  test('a crash before rename leaves the old content intact (no unlink window)', () => {
    const dir = tempDir();
    const file = join(dir, 'state.json');
    atomicWriteFileSync(file, '{"version":"old"}');

    expect(() =>
      atomicWriteFileSync(file, '{"version":"new"}', {
        // Simulate the process dying between "temp written" and "rename applied".
        rename: () => {
          throw new Error('simulated crash');
        },
      }),
    ).toThrow('simulated crash');

    // The target still holds the OLD, complete content — it was never unlinked
    // and never partially written.
    expect(readFileSync(file, 'utf-8')).toBe('{"version":"old"}');
    // The temp file was cleaned up by the error path.
    expect(readdirSync(dir)).toEqual(['state.json']);
  });

  test('applies mode to the temp file before rename, never unlinking the target', () => {
    const dir = tempDir();
    const file = join(dir, 'mcp.json');
    atomicWriteFileSync(file, '{"token":"old"}', { mode: 0o600 });
    atomicWriteFileSync(file, '{"token":"new"}', { mode: 0o600 });

    expect(readFileSync(file, 'utf-8')).toBe('{"token":"new"}');
    if (process.platform !== 'win32') {
      expect(statSync(file).mode & 0o777).toBe(0o600);
    }
    expect(readdirSync(dir)).toEqual(['mcp.json']);
  });

  test('tempPathFor produces a sibling path with a .tmp suffix', () => {
    const dir = tempDir();
    const file = join(dir, 'state.json');
    const temp = tempPathFor(file);
    expect(temp.startsWith(file)).toBe(true);
    expect(temp.endsWith('.tmp')).toBe(true);
    expect(temp).not.toBe(file);
  });
});
