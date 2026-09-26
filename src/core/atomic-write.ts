/**
 * Atomic file writes — the single implementation.
 *
 * Before REQ-016 there were two divergent strategies: `path-persistence.ts`
 * wrote directly with `fs.writeFile` (a crash mid-write leaves a truncated
 * JSON file behind), and `state-manager.ts` used temp file + `unlinkSync`
 * target + `renameSync`. The unlink creates a window — milliseconds during
 * which the target does not exist — and on Windows a crash inside that window
 * loses the file entirely.
 *
 * The strategy here is temp file + `rename` over the target, with no unlink:
 * POSIX rename replaces atomically, and on Windows libuv's implementation uses
 * MoveFileEx with MOVEFILE_REPLACE_EXISTING, so the target is either the old
 * file or the new file, never absent and never half-written.
 *
 * The `rename` implementation is injectable purely so tests can simulate a
 * crash between "temp written" and "rename applied".
 */

import { chmodSync, mkdirSync, renameSync, unlinkSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { randomBytes } from 'crypto';

export type RenameFn = typeof renameSync;

/** Options for {@link atomicWriteFileSync}. `rename` is for tests; `mode` is for secret files. */
export interface AtomicWriteOptions {
  /** Replacement for the final rename step (crash simulation). */
  rename?: RenameFn;
  /** Skip parent-directory creation when the caller already did it. */
  mkdir?: boolean;
  /**
   * POSIX mode applied to the temp file before rename (for example `0o600`).
   * Rename preserves the mode, so the target never appears with the default
   * umask. Callers that store secrets must set this rather than chmod after
   * the file already has its final name.
   */
  mode?: number;
}

/** Build the temp-file path used for the intermediate write. */
export function tempPathFor(filePath: string): string {
  return `${filePath}.${process.pid}.${Date.now()}.${randomBytes(8).toString('hex')}.tmp`;
}

/**
 * Write `content` to `filePath` so that `filePath` always holds either the
 * previous content or the full new content — never a truncated file.
 *
 * Ensures the parent directory exists, writes a sibling temp file, then
 * renames it over the target. On any failure the temp file is removed and the
 * error rethrown; the target is untouched in that case.
 */
export function atomicWriteFileSync(
  filePath: string,
  content: string,
  options: AtomicWriteOptions = {},
): void {
  if (options.mkdir !== false) {
    mkdirSync(dirname(filePath), { recursive: true });
  }

  const tempPath = tempPathFor(filePath);
  const rename = options.rename ?? renameSync;

  try {
    writeFileSync(tempPath, content, { encoding: 'utf-8', flag: 'wx' });
    if (options.mode !== undefined) {
      chmodSync(tempPath, options.mode);
    }
    // Never unlink the target first. A crash between unlink and rename loses
    // the previous file (REQ-016). POSIX rename replaces atomically; Node's
    // Windows implementation uses MoveFileEx(MOVEFILE_REPLACE_EXISTING).
    rename(tempPath, filePath);
  } catch (error) {
    try {
      if (tempPath !== filePath) unlinkSync(tempPath);
    } catch {
      // Cleanup is best-effort; the original error matters more.
    }
    throw error;
  }
}

/**
 * Async flavour for callers that already use promise-based fs APIs.
 * The write itself is sync under the hood — atomicity does not benefit from
 * being interleaved, and the files involved are small JSON documents.
 */
export async function atomicWriteFile(
  filePath: string,
  content: string,
  options: AtomicWriteOptions = {},
): Promise<void> {
  atomicWriteFileSync(filePath, content, options);
}
