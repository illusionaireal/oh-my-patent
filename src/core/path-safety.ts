/**
 * Path safety utilities - cross-platform directory boundary checks
 *
 * Provides safe path validation to prevent directory traversal (CWE-22).
 * Works on both POSIX and Windows.
 */

import * as path from 'path';

/**
 * Check if a relative path is safe (no traversal, no absolute).
 *
 * - Rejects absolute paths, including Windows drive and UNC forms
 * - Rejects any segment that is '..'
 * - Rejects empty or non-string
 *
 * Allows normal relative paths like '.claude/agents/archimedes.md'
 */
export function isSafeRelPath(relPath: string): boolean {
  if (!relPath || typeof relPath !== 'string') return false;
  if (path.isAbsolute(relPath)) return false;
  // A single leading separator is absolute (`/etc`, `\Windows`). Two leading
  // backslashes are a UNC path (`\\server\share`). Reject both on every host:
  // `path.isAbsolute` only understands the platform this process is running on.
  if (relPath.startsWith('/') || relPath.startsWith('\\')) return false;
  // Drive-letter paths (`C:`, `C:\...`) are absolute on Windows.
  if (/^[a-zA-Z]:/.test(relPath)) return false;

  const segments = relPath.split(/[\\/]/);
  if (segments.includes('..')) return false;

  return true;
}

/**
 * Ensure targetPath is inside baseDir (or equal to baseDir).
 * Cross-platform implementation using path.relative().
 *
 * NOTE: This is a lexical check only (like resolve/relative).
 * It does NOT resolve symlinks or Windows junctions. A junction
 * inside baseDir pointing outside will pass this check but write
 * outside. This is an existing risk not covered by current fix.
 * If untrusted workdirs are supported, need realpath + lstat strategy
 * or explicit symlink policy. Otherwise document as lexical check only.
 *
 * Throws if target escapes baseDir.
 */
export function ensureInside(baseDir: string, targetPath: string): void {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetPath);

  if (resolvedBase === resolvedTarget) {
    return;
  }

  const relative = path.relative(resolvedBase, resolvedTarget);

  // Different drive on Windows or absolute relative means outside
  if (path.isAbsolute(relative)) {
    throw new Error(`Path traversal blocked: ${targetPath} escapes ${baseDir}`);
  }

  const escaped =
    relative.split(/[\\/]/).includes('..') ||
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    relative.startsWith('../') ||
    relative.startsWith('..\\');
  if (escaped) {
    throw new Error(`Path traversal blocked: ${targetPath} escapes ${baseDir}`);
  }
}

/**
 * Alias for ensureInside with more descriptive name for baseDir checks
 */
export const ensurePathInsideBase = ensureInside;
export const ensureBranchPathInside = ensureInside;
