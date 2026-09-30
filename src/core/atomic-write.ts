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

import { mkdirSync, renameSync, unlinkSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { randomBytes } from 'crypto';

export type RenameFn = typeof renameSync;

/** Options for {@link atomicWriteFileSync}. */
export interface AtomicWriteOptions {
  /** Flush temporary file contents before the rename commit. */
  flush?: boolean;
  /** Replacement for the final rename step (crash simulation). */
  rename?: RenameFn;
  /** Skip parent-directory creation when the caller already did it. */
  mkdir?: boolean;
  /** Permissions of the replacement file, for configuration containing secrets. */
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
  content: string | Uint8Array,
  options: AtomicWriteOptions = {},
): void {
  if (options.mkdir !== false) {
    mkdirSync(dirname(filePath), { recursive: true });
  }

  const tempPath = tempPathFor(filePath);
  const rename = options.rename ?? renameSync;

  try {
    writeFileSync(tempPath, content, { encoding: 'utf-8', flag: 'wx', mode: options.mode, flush: options.flush });
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
