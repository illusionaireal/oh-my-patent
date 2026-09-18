import { writeFileSync, readFileSync, mkdirSync, existsSync, renameSync, unlinkSync } from 'fs';
import { join, sep } from 'path';
import { randomBytes } from 'crypto';
import { PatentState, validateState } from './state.js';
import { ensureInside as ensurePathInsideBase } from './path-safety.js';

const PROJECT_SLUG_PATTERN = /^[a-zA-Z0-9._-]+$/;

export function isValidProjectSlug(slug: string): boolean {
  if (typeof slug !== 'string' || slug.length === 0 || slug.length > 128) return false;
  if (slug.includes('..')) return false;
  if (slug.includes('/') || slug.includes('\\') || slug.includes(sep)) return false;
  return PROJECT_SLUG_PATTERN.test(slug);
}

function assertValidProjectSlug(slug: string): void {
  if (!isValidProjectSlug(slug)) {
    throw new Error(`Invalid projectSlug: ${slug}. Must match ${PROJECT_SLUG_PATTERN.source}, 1-128 chars, no path separators`);
  }
}



export class StateManager {
  constructor(private baseDir: string) {}

  saveState(projectSlug: string, state: PatentState): void {
    assertValidProjectSlug(projectSlug);
    const validation = validateState(state);
    if (!validation.valid) {
      throw new Error(`Invalid state: ${validation.errors.join(', ')}`);
    }

    const projectDir = join(this.baseDir, projectSlug);
    const patentDir = join(projectDir, '.patent');

    ensurePathInsideBase(this.baseDir, projectDir);

    mkdirSync(patentDir, { recursive: true });

    const statePath = join(patentDir, 'state.json');
    const tempPath = join(patentDir, `state.json.${Date.now()}.${randomBytes(8).toString('hex')}.tmp`);

    try {
      // Use 'wx' to fail if temp file exists (mitigates symlink race)
      writeFileSync(tempPath, JSON.stringify(state, null, 2), { encoding: 'utf-8', flag: 'wx' });
      try {
        renameSync(tempPath, statePath);
      } catch (renameErr) {
        // On Windows, rename fails if destination exists; unlink and retry
        const code = (renameErr as NodeJS.ErrnoException).code;
        if (code === 'EEXIST' || code === 'EACCES' || code === 'EPERM') {
          try {
            unlinkSync(statePath);
          } catch {
            // ignore unlink errors, will throw on retry if still fails
          }
          renameSync(tempPath, statePath);
        } else {
          throw renameErr;
        }
      }
    } catch (error) {
      if (existsSync(tempPath)) {
        try {
          unlinkSync(tempPath);
        } catch {
          // Ignore cleanup errors
        }
      }
      throw error;
    }
  }

  loadState(projectSlug: string): PatentState | null {
    assertValidProjectSlug(projectSlug);
    const statePath = join(this.baseDir, projectSlug, '.patent', 'state.json');
    ensurePathInsideBase(this.baseDir, statePath);

    if (!existsSync(statePath)) {
      return null;
    }

    try {
      const content = readFileSync(statePath, 'utf-8');
      const parsed = JSON.parse(content) as unknown;
      const validation = validateState(parsed);
      if (!validation.valid) {
        throw new Error(`Corrupted state file: ${validation.errors.join(', ')}`);
      }
      return parsed as PatentState;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Corrupted state file: invalid JSON');
      }
      throw error;
    }
  }
}
