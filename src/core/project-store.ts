/** Versioned project transactions. Smoke: npm test tests/skill-package/store.test.ts */
import { createHash, randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { atomicWriteFileSync } from './atomic-write.js';
import { ensureUnlinkedPath, isSafeRelPath } from './path-safety.js';
import { validateState, type PatentState } from './state.js';

export class ProjectError extends Error {
  constructor(public code: string, message: string) { super(message); }
}
export const digest = (data: string | Buffer): string => createHash('sha256').update(data).digest('hex');
export const json = (value: unknown): string => JSON.stringify(value, null, 2) + '\n';
export interface Preconditions { revision: number | null; state_digest?: string; inputs?: Record<string, string>; }
export interface Mutation { operation_id: string; expected: Preconditions; [key: string]: unknown; }
export interface WritePlan { files: Record<string, string | null>; data: unknown; }
interface Journal { request_digest: string; status: 'prepared' | 'committed' | 'rolled_back'; before: Record<string, string | null>; after: Record<string, string | null>; data: unknown; }
interface Lock { token: string; pid: number; host: string; acquired_at: string; }

export function projectFile(root: string, relative: string): string {
  if (!isSafeRelPath(relative) || relative.includes(':') || relative.includes('\\') || relative.split('/').some(p => !p || p === '.' || /[. ]$/.test(p))) {
    throw new ProjectError('INVALID_INPUT', `Unsafe project path: ${relative}`);
  }
  const file = resolve(root, relative);
  ensureUnlinkedPath(root, file);
  return file;
}
function readOrNull(file: string): string | null {
  try { return readFileSync(file, 'utf8'); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}
function durableWrite(file: string, value: string): void {
  atomicWriteFileSync(file, value, { flush: true });
}
export function inspectProject(root: string): { state: PatentState | null; state_digest: string | null; coordination: { locked: boolean; recovery_required: boolean } } {
  const text = readOrNull(projectFile(root, '.patent/state.json'));
  const directory = projectFile(root, '.patent/transactions');
  const recoveryRequired = existsSync(directory) && readdirSync(directory).some(id => {
    const file = projectFile(root, `.patent/transactions/${id}/journal.json`);
    const journal = readOrNull(file);
    // No project files are applied until the prepared journal has been renamed into place.
    // A directory/temp left before that point is not a prepared transaction.
    return journal !== null && JSON.parse(journal).status === 'prepared';
  });
  return { state: text === null ? null : JSON.parse(text), state_digest: text === null ? null : digest(text), coordination: { locked: existsSync(projectFile(root, '.patent/write.lock')), recovery_required: recoveryRequired } };
}
export function requireCurrentState(state: PatentState | null): asserts state is PatentState & { schema_version: 1; revision: number } {
  if (!state) throw new ProjectError('MISSING_FILE', 'Project state is absent');
  if (state.schema_version !== 1) throw new ProjectError('INVALID_STATE', 'Explicit migration required; future schemas are read-only');
  const result = validateState(state);
  if (!result.valid) throw new ProjectError('INVALID_STATE', result.errors.join('; '));
}

export class ProjectStore {
  readonly root: string;
  constructor(root: string) { this.root = resolve(root); }
  private lockPath(): string { return projectFile(this.root, '.patent/write.lock'); }
  private lock(): Lock {
    const file = this.lockPath();
    mkdirSync(dirname(file), { recursive: true });
    const lock: Lock = { token: randomUUID(), pid: process.pid, host: hostname(), acquired_at: new Date().toISOString() };
    try {
      const fd = openSync(file, 'wx', 0o600);
      try { writeFileSync(fd, json(lock)); fsyncSync(fd); } finally { closeSync(fd); }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new ProjectError('LOCKED', 'Project is locked; inspect owner before explicit recovery');
      throw error;
    }
    return lock;
  }
  private unlock(lock: Lock): void {
    const file = this.lockPath();
    if (JSON.parse(readFileSync(file, 'utf8')).token !== lock.token) throw new ProjectError('LOCKED', 'Lock owner changed');
    unlinkSync(file);
  }
  /** No age-based recovery. PID reuse intentionally fails closed. */
  recoverLock(token: string): void {
    const file = this.lockPath();
    const owner = JSON.parse(readFileSync(file, 'utf8')) as Lock;
    if (owner.token !== token || owner.host !== hostname()) throw new ProjectError('LOCKED', 'Owner token/host mismatch');
    try { process.kill(owner.pid, 0); } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') {
        if (JSON.parse(readFileSync(file, 'utf8')).token !== token) throw new ProjectError('LOCKED', 'Owner changed');
        unlinkSync(file); return;
      }
      throw new ProjectError('LOCKED', 'Cannot verify owner is dead');
    }
    throw new ProjectError('LOCKED', 'Owner is still alive');
  }
  private apply(files: Record<string, string | null>): void {
    // State is applied last, but readers must still reject pending transactions.
    for (const name of Object.keys(files).sort((a, b) => Number(a === '.patent/state.json') - Number(b === '.patent/state.json') || a.localeCompare(b))) {
      const file = projectFile(this.root, name);
      const value = files[name];
      if (value === null) { if (existsSync(file)) unlinkSync(file); }
      else durableWrite(file, value);
    }
  }
  private recoverPending(): void {
    const directory = projectFile(this.root, '.patent/transactions');
    if (!existsSync(directory)) return;
    for (const id of readdirSync(directory).sort()) {
      const file = projectFile(this.root, `.patent/transactions/${id}/journal.json`);
      const text = readOrNull(file);
      if (text === null) continue; // Interrupted before preparation; retain any temp evidence.
      const journal = JSON.parse(text) as Journal;
      if (journal.status !== 'prepared') continue;
      for (const name of Object.keys(journal.after)) {
        const value = readOrNull(projectFile(this.root, name));
        if (value !== journal.before[name] && value !== journal.after[name]) throw new ProjectError('RECOVERY_REQUIRED', `External modification prevents recovery: ${name}`);
      }
      this.apply(journal.before);
      journal.status = 'rolled_back';
      durableWrite(file, json(journal));
    }
  }
  /** Build the complete plan under the same exclusive lock as validation/commit. */
  async mutate(request: Mutation, build: (state: PatentState | null) => WritePlan | Promise<WritePlan>, options: { migrate?: boolean; fault?: (boundary: string) => void } = {}): Promise<unknown> {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(request.operation_id)) throw new ProjectError('INVALID_INPUT', 'Invalid operation_id');
    if (!request.expected || !(request.expected.revision === null || Number.isSafeInteger(request.expected.revision) && request.expected.revision >= 0)) throw new ProjectError('INVALID_INPUT', 'Expected revision required');
    const requestDigest = digest(JSON.stringify(request));
    const lock = this.lock();
    try {
      this.recoverPending();
      const journalPath = projectFile(this.root, `.patent/transactions/${request.operation_id}/journal.json`);
      const prior = readOrNull(journalPath);
      if (prior) {
        const journal = JSON.parse(prior) as Journal;
        if (journal.request_digest !== requestDigest) throw new ProjectError('CONFLICT', 'Operation ID already used with different input');
        if (journal.status === 'committed') return journal.data;
      }
      const current = inspectProject(this.root);
      if (current.state && current.state.schema_version !== undefined && current.state.schema_version !== 1) throw new ProjectError('INVALID_STATE', 'Unknown schema is read-only');
      if (current.state && !options.migrate) requireCurrentState(current.state);
      const revision = current.state ? current.state.revision ?? 0 : null;
      if (revision !== request.expected.revision || (request.expected.state_digest !== undefined && current.state_digest !== request.expected.state_digest)) throw new ProjectError('CONFLICT', 'Project changed since inspection');
      for (const [name, expected] of Object.entries(request.expected.inputs ?? {})) {
        const file = projectFile(this.root, name);
        if (!existsSync(file) || digest(readFileSync(file)) !== expected) throw new ProjectError('CONFLICT', `Input changed: ${name}`);
      }
      const plan = await build(current.state);
      const stateText = plan.files['.patent/state.json'];
      if (!stateText) throw new ProjectError('INVALID_STATE', 'Every mutation must commit its revision');
      const next = JSON.parse(stateText) as PatentState;
      next.schema_version = 1;
      next.revision = (revision ?? -1) + 1;
      next.project.path = '.';
      next.last_modified = new Date().toISOString();
      requireCurrentState(next);
      plan.files['.patent/state.json'] = json(next);
      const before: Record<string, string | null> = Object.create(null);
      for (const name of Object.keys(plan.files)) {
        if (name.startsWith('.patent/transactions/') || name === '.patent/write.lock') throw new ProjectError('INVALID_INPUT', 'Reserved transaction path');
        before[name] = readOrNull(projectFile(this.root, name));
      }
      const data = { result: plan.data, revision: next.revision, state_digest: digest(plan.files['.patent/state.json']!) };
      const journal: Journal = { request_digest: requestDigest, status: 'prepared', before, after: plan.files, data };
      options.fault?.('before_prepare');
      durableWrite(journalPath, json(journal));
      options.fault?.('after_prepare');
      this.apply(plan.files);
      options.fault?.('after_apply');
      journal.status = 'committed';
      durableWrite(journalPath, json(journal));
      options.fault?.('after_commit');
      return data;
    } finally { this.unlock(lock); }
  }
}
