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
 * - Rejects absolute paths
 * - Rejects any segment that is '..'
 * - Rejects empty or non-string
 *
 * Allows normal relative paths like '.claude/agents/archimedes.md'
 */
export function isSafeRelPath(relPath: string): boolean {
  if (!relPath || typeof relPath !== 'string') return false;
  if (path.isAbsolute(relPath)) return false;
  // Reject paths starting with / or \ (absolute on POSIX/Windows)
  if (relPath.startsWith('/') || relPath.startsWith('\\')) return false;

  // Split by both separators to be cross-platform
  const segments = relPath.split(/[\\/]/);
  // Any '..' segment is unsafe
  if (segments.includes('..')) return false;
  // Also reject if contains '..' as substring in a segment that is exactly '..'
  // (already covered) but also reject empty segments that could be '//' ?
  // Allow '.' and normal names.

  // Additionally, resolve check: if resolve(relPath) === relPath, it's absolute (already handled)
  // But also check for drive letter on Windows like 'C:'
  if (/^[a-zA-Z]:/.test(relPath)) return false;

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

  // Any '..' segment means escaping
  if (relative.split(/[\\/]/).includes('..')) {
    throw new Error(`Path traversal blocked: ${targetPath} escapes ${baseDir}`);
  }

  // Parent directory prefix check (covers '..', '../x', '..\x')
  if (relative === '..' || relative.startsWith('..' + path.sep) || relative.startsWith('../') || relative.startsWith('..\\')) {
    throw new Error(`Path traversal blocked: ${targetPath} escapes ${baseDir}`);
  }
}

/**
 * Alias for ensureInside with more descriptive name for baseDir checks
 */
export const ensurePathInsideBase = ensureInside;
export const ensureBranchPathInside = ensureInside;
