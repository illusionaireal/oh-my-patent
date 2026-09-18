import { describe, it, expect } from 'vitest';
import { ensureInside, isSafeRelPath } from '../../src/core/path-safety';

describe('CLI path safety', () => {
  it('should reject traversal in relPath', () => {
    expect(isSafeRelPath('../../etc/passwd')).toBe(false);
    expect(isSafeRelPath('/etc/passwd')).toBe(false);
    expect(isSafeRelPath('a/../b')).toBe(false);
    expect(isSafeRelPath('/absolute/path')).toBe(false);
    expect(isSafeRelPath('C:\\Windows\\file')).toBe(false);
  });

  it('should accept safe relPath', () => {
    expect(isSafeRelPath('.claude/agents/archimedes.md')).toBe(true);
    expect(isSafeRelPath('plugins/claude-code/file.txt')).toBe(true);
    expect(isSafeRelPath('a/b/c.txt')).toBe(true);
  });

  it('should block escape from baseDir', () => {
    expect(() => ensureInside('/tmp/project', '/tmp/project/../etc/passwd')).toThrow(/traversal/);
    expect(() => ensureInside('/tmp/project', '/etc/passwd')).toThrow(/traversal/);
    expect(() => ensureInside('/tmp/project', '/tmp/other')).toThrow(/traversal/);
  });

  it('should allow inside paths', () => {
    expect(() => ensureInside('/tmp/project', '/tmp/project/.claude/agents/a.md')).not.toThrow();
    expect(() => ensureInside('/tmp/project', '/tmp/project')).not.toThrow();
    expect(() => ensureInside('/tmp/project', '/tmp/project/subdir/file.txt')).not.toThrow();
  });

  it('should handle Windows-style paths on POSIX (cross-platform safety)', () => {
    // Simulate Windows paths via path.win32 if needed, but ensure our logic uses path.sep correctly
    // On POSIX, backslash is not separator, but isSafeRelPath should still reject '..' segments
    expect(isSafeRelPath('a\\..\\b')).toBe(false);
    expect(isSafeRelPath('..\\evil')).toBe(false);
  });
});
