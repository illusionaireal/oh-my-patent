import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { ensureInside, isSafeRelPath } from '../../src/core/path-safety';

describe('path-safety shared module', () => {
  describe('isSafeRelPath', () => {
    it('rejects absolute and traversal', () => {
      expect(isSafeRelPath('')).toBe(false);
      expect(isSafeRelPath('../../etc')).toBe(false);
      expect(isSafeRelPath('/etc/passwd')).toBe(false);
      expect(isSafeRelPath('C:\\Windows')).toBe(false);
      expect(isSafeRelPath('a/../b')).toBe(false);
    });
    it('accepts safe relative', () => {
      expect(isSafeRelPath('a/b/c')).toBe(true);
      expect(isSafeRelPath('.claude/agents/test.md')).toBe(true);
    });
  });

  describe('ensureInside', () => {
    it('allows inside', () => {
      expect(() => ensureInside('/tmp/base', '/tmp/base/file.txt')).not.toThrow();
      expect(() => ensureInside('/tmp/base', '/tmp/base')).not.toThrow();
    });
    it('blocks outside', () => {
      expect(() => ensureInside('/tmp/base', '/tmp/base/../other')).toThrow(/traversal/);
      expect(() => ensureInside('/tmp/base', '/etc/passwd')).toThrow(/traversal/);
    });
    it('blocks sibling', () => {
      expect(() => ensureInside('/tmp/base', '/tmp/base2/file')).toThrow(/traversal/);
    });
    it('allows root base', () => {
      // Base is root, file inside root should be allowed
      expect(() => ensureInside('/', '/file.txt')).not.toThrow();
      expect(() => ensureInside('/', '/a/b/c')).not.toThrow();
    });
    it('handles case sensitivity (platform-dependent)', () => {
      // On POSIX, case matters, so different case is outside.
      // On Windows, file system is case-insensitive, so same folder different case is inside.
      if (process.platform === 'win32') {
        expect(() => ensureInside('/tmp/project', '/tmp/PROJECT/file')).not.toThrow();
      } else {
        expect(() => ensureInside('/tmp/project', '/tmp/PROJECT/file')).toThrow(/traversal/);
      }
    });
    it('handles Windows path semantics via path.win32', () => {
      const winBase = 'C:\\Users\\test\\project';
      const winInside = 'C:\\Users\\test\\project\\.claude\\agents\\a.md';
      const winOutside = 'C:\\Users\\test\\other\\file.txt';
      const relInside = path.win32.relative(path.win32.resolve(winBase), path.win32.resolve(winInside));
      const relOutside = path.win32.relative(path.win32.resolve(winBase), path.win32.resolve(winOutside));
      expect(relInside).toBe('.claude\\agents\\a.md');
      expect(relOutside.startsWith('..')).toBe(true);

      // Simulate ensureInside logic with win32
      function ensureInsideWin32(base: string, target: string) {
        const resolvedBase = path.win32.resolve(base);
        const resolvedTarget = path.win32.resolve(target);
        if (resolvedBase === resolvedTarget) return;
        const rel = path.win32.relative(resolvedBase, resolvedTarget);
        if (path.win32.isAbsolute(rel)) throw new Error('traversal');
        if (rel.split(/[\\/]/).includes('..')) throw new Error('traversal');
        if (rel === '..' || rel.startsWith('..' + path.win32.sep)) throw new Error('traversal');
      }

      expect(() => ensureInsideWin32(winBase, winInside)).not.toThrow();
      expect(() => ensureInsideWin32(winBase, winOutside)).toThrow(/traversal/);
      // Cross-drive on Windows
      expect(() => ensureInsideWin32('C:\\project', 'D:\\other\\file')).toThrow(/traversal/);
    });
  });
});
