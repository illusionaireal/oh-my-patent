import { readFileSync, existsSync } from 'fs';
import { join, sep } from 'path';
import { atomicWriteFileSync } from './atomic-write.js';
import { PatentState, validateState } from './state.js';
import { assertLegacyWriter } from './legacy-write-guard.js';
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
    assertLegacyWriter(projectDir);
    if (state.schema_version !== undefined) throw new Error('Versioned state requires ProjectStore');
    const patentDir = join(projectDir, '.patent');

    ensurePathInsideBase(this.baseDir, projectDir);
    const statePath = join(patentDir, 'state.json');
    // REQ-016: temp file + rename with NO unlink of the target. The previous
    // unlink-then-rename left a window where state.json did not exist; a
    // crash there lost the file. rename over an existing file replaces it
    // without that window.
    atomicWriteFileSync(statePath, JSON.stringify(state, null, 2));
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
