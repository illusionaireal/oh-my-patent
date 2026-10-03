/** Existing adapt CLI's portable package path; no global configuration mutation. */
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync, unlinkSync, openSync, closeSync, fsyncSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { homedir, hostname } from 'node:os';
import { atomicWriteFileSync } from '../core/atomic-write.js';
import { digest, json, projectFile, ProjectError } from '../core/project-store.js';

interface Target { id: string; project_path: string; }
interface Installation { hosts: string[]; version: string; files: Record<string, string>; }
type Registry = Record<string, Installation>;
interface Change { path: string; before: string | null; after: string | null; }
interface Journal { id: string; status: 'prepared' | 'committed' | 'rolled_back'; changes: Change[]; }
const REGISTRY = '.oh-my-patent/installations.json';
const LOCK = '.oh-my-patent/install.lock';
function withInstallerLock<T>(root: string, action: () => T): T {
  const file = projectFile(root, LOCK); mkdirSync(dirname(file), { recursive: true });
  const owner = { token: randomUUID(), pid: process.pid, host: hostname(), acquired_at: new Date().toISOString() };
  let fd: number;
  try { fd = openSync(file, 'wx', 0o600); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new ProjectError('LOCKED', 'Installer is locked; inspect owner before explicit recovery');
    throw error;
  }
  try { writeFileSync(fd, json(owner)); fsyncSync(fd); } finally { closeSync(fd); }
  try { return action(); }
  finally {
    if (JSON.parse(readFileSync(file, 'utf8')).token !== owner.token) throw new ProjectError('LOCKED', 'Installer lock owner changed');
    unlinkSync(file);
  }
}
function assertNoPending(root: string, except?: string): void {
  for (const name of list(root, '.oh-my-patent/backups').filter(name => name.endsWith('/journal.json'))) {
    const journal = JSON.parse(readFileSync(projectFile(root, name), 'utf8')) as Journal;
    if (journal.status === 'prepared' && journal.id !== except) throw new ProjectError('RECOVERY_REQUIRED', `Roll back interrupted installation ${journal.id} before continuing`);
  }
}
/** Explicit same-host dead-owner recovery; never infer staleness from age. */
export function recoverPortableLock(root: string, token: string): void {
  const file = projectFile(root, LOCK);
  const owner = JSON.parse(readFileSync(file, 'utf8'));
  if (!token || owner.token !== token || owner.host !== hostname() || !Number.isSafeInteger(owner.pid) || owner.pid <= 0) throw new ProjectError('LOCKED', 'Cannot verify installer lock owner');
  try { process.kill(owner.pid, 0); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw new ProjectError('LOCKED', 'Cannot verify owner is dead');
    if (JSON.parse(readFileSync(file, 'utf8')).token !== token) throw new ProjectError('LOCKED', 'Installer lock owner changed');
    unlinkSync(file); return;
  }
  throw new ProjectError('LOCKED', 'Installer owner is still alive');
}
function read(root: string, name: string): string | null {
  const file = projectFile(root, name); return existsSync(file) ? readFileSync(file, 'utf8') : null;
}
function list(root: string, name: string): string[] {
  const dir = projectFile(root, name);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const file = `${name}/${e.name}`; projectFile(root, file);
    return e.isDirectory() ? list(root, file) : [file];
  });
}
function apply(root: string, changes: Change[], reverse = false): void {
  for (const change of changes) {
    const file = projectFile(root, change.path); const value = reverse ? change.before : change.after;
    if (value === null) { if (existsSync(file)) unlinkSync(file); }
    else atomicWriteFileSync(file, Buffer.from(value, 'base64'), { flush: true });
  }
}
function bytes(root: string, name: string): string | null {
  const file = projectFile(root, name); return existsSync(file) ? readFileSync(file).toString('base64') : null;
}
/** Explicit rollback also repairs a process interrupted between individual files. */
export function rollbackPortable(root: string, id: string): void {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new ProjectError('INVALID_INPUT', 'Invalid backup ID');
  withInstallerLock(root, () => {
    assertNoPending(root, id);
    const file = projectFile(root, `.oh-my-patent/backups/${id}/journal.json`);
    const journal = JSON.parse(readFileSync(file, 'utf8')) as Journal;
    for (const change of journal.changes) {
      const current = bytes(root, change.path);
      if (current !== change.before && current !== change.after) throw new ProjectError('CONFLICT', `User modified ${change.path}; rollback preserved it`);
    }
    apply(root, journal.changes, true); journal.status = 'rolled_back'; atomicWriteFileSync(file, json(journal), { flush: true });
  });
}

export function managePortable(pluginRoot: string, workspace: string, host: string, action: 'install' | 'uninstall' | 'generate', dryRun: boolean): unknown {
  if (!host) throw new ProjectError('INVALID_INPUT', 'Select one host with --tool; installation never defaults to all hosts');
  assertNoPending(workspace);
  const targets = JSON.parse(readFileSync(join(pluginRoot, 'distribution/targets.json'), 'utf8')).targets as Target[];
  const target = targets.find(t => t.id === host);
  if (!target) throw new ProjectError('INVALID_INPUT', `Unknown host: ${host}`);
  const source = join(pluginRoot, 'skills/oh-my-patent');
  const manifest = JSON.parse(readFileSync(join(source, 'scripts/manifest.json'), 'utf8'));
  const registryBefore = bytes(workspace, REGISTRY);
  const registry: Registry = JSON.parse(registryBefore === null ? '{}' : Buffer.from(registryBefore, 'base64').toString('utf8'));
  const prior = registry[target.project_path];
  const incoming: Record<string, string> = Object.create(null);
  for (const name of list(source, 'references').concat(list(source, 'assets'), list(source, 'scripts'), list(source, 'agents'), ['SKILL.md', 'LICENSE'])) {
    const data = readFileSync(projectFile(source, name));
    if (name !== 'scripts/manifest.json' && manifest.files[name] !== digest(data)) throw new ProjectError('INVALID_STATE', `Package checksum mismatch: ${name}`);
    incoming[`${target.project_path}/${name}`] = data.toString('base64');
  }
  const changes = new Map<string, Change>();
  const conflicts: string[] = [];
  const legacy = JSON.parse(readFileSync(join(pluginRoot, 'distribution/legacy-fingerprints.json'), 'utf8')).targets[host] as Record<string, string[]> | undefined;
  if (action !== 'uninstall') {
    // A canonical/shared copy must not be silently duplicated in alternate scopes.
    for (const name of ['.agents/skills/oh-my-patent', '.claude/skills/oh-my-patent', '.opencode/skills/oh-my-patent', '.cursor/skills/oh-my-patent', '.github/skills/oh-my-patent', '.gemini/skills/oh-my-patent']) {
      if (name !== target.project_path && existsSync(projectFile(workspace, `${name}/SKILL.md`))) conflicts.push(`${name}/SKILL.md (duplicate discovery scope)`);
    }
    // Inventory observed ancestor/user scopes; do not modify those scopes.
    for (const external of new Set([dirname(resolve(workspace)), homedir()])) {
      if (external === resolve(workspace)) continue;
      for (const name of ['.agents/skills/oh-my-patent/SKILL.md', '.claude/skills/oh-my-patent/SKILL.md', '.codex/skills/oh-my-patent/SKILL.md']) if (existsSync(join(external, name))) conflicts.push(`ancestor/user ${name} (resolve duplicate before installation)`);
    }
    for (const [name, expected] of Object.entries(legacy ?? {})) {
      if (name.startsWith(target.project_path + '/')) continue;
      const current = bytes(workspace, name);
      if (current === null) continue;
      // Exact baseline outputs from both LF and CRLF sources; never normalize user bytes.
      if (!expected.includes(digest(Buffer.from(current, 'base64')))) {
        // Unrelated workspace rules/configuration are not managed artifacts.
        if (['AGENTS.md', 'CLAUDE.md', '.mcp.json'].includes(name) && !Buffer.from(current, 'base64').toString('utf8').includes('oh-my-patent')) continue;
        conflicts.push(`${name} (legacy file modified or ownership unknown)`); continue;
      }
      changes.set(name, { path: name, before: current, after: null });
    }
    for (const [name, after] of Object.entries(incoming)) {
      const before = bytes(workspace, name);
      if (before === after) continue;
      if (before !== null && prior?.files[name] !== digest(Buffer.from(before, 'base64'))) { conflicts.push(`${name} (unmanaged or modified)`); continue; }
      changes.set(name, { path: name, before, after });
    }
    for (const name of Object.keys(prior?.files ?? {})) if (!(name in incoming)) {
      const before = bytes(workspace, name);
      if (before !== null && digest(Buffer.from(before, 'base64')) !== prior.files[name]) conflicts.push(`${name} (modified obsolete file)`);
      else if (before !== null) changes.set(name, { path: name, before, after: null });
    }
    registry[target.project_path] = { hosts: [...new Set([...(prior?.hosts ?? []), host])].sort(), version: manifest.package_version, files: Object.fromEntries(Object.entries(incoming).map(([name, data]) => [name, digest(Buffer.from(data, 'base64'))])) };
  } else if (prior) {
    const hosts = prior.hosts.filter(h => h !== host);
    if (hosts.length) registry[target.project_path] = { ...prior, hosts };
    else {
      for (const [name, hash] of Object.entries(prior.files)) {
        const before = bytes(workspace, name);
        if (before !== null && digest(Buffer.from(before, 'base64')) !== hash) conflicts.push(`${name} (modified; retained)`);
        else if (before !== null) changes.set(name, { path: name, before, after: null });
      }
      delete registry[target.project_path];
    }
  }
  const registryAfter = Buffer.from(json(registry)).toString('base64');
  if (registryBefore !== registryAfter) changes.set(REGISTRY, { path: REGISTRY, before: registryBefore, after: registryAfter });
  const preview = { action, host, dry_run: dryRun, package_version: manifest.package_version, changes: [...changes.values()].map(c => ({ path: c.path, action: c.after === null ? 'remove_with_backup' : 'write' })), conflicts, host_discovery_verified: false };
  if (dryRun) return preview;
  if (conflicts.length) throw new ProjectError('CONFLICT', `Installation preserved all files: ${conflicts.join('; ')}`);
  if (!changes.size) return { ...preview, backup_id: null };
  return withInstallerLock(workspace, () => {
    assertNoPending(workspace);
    // Revalidate all inspected bytes while holding the installer lock.
    for (const c of changes.values()) if (bytes(workspace, c.path) !== c.before) throw new ProjectError('CONFLICT', `Concurrent modification: ${c.path}`);
    const id = randomUUID(); const journal: Journal = { id, status: 'prepared', changes: [...changes.values()] };
    const backup = projectFile(workspace, `.oh-my-patent/backups/${id}/journal.json`);
    atomicWriteFileSync(backup, json(journal), { flush: true, mode: 0o600 });
    apply(workspace, journal.changes);
    journal.status = 'committed'; atomicWriteFileSync(backup, json(journal), { flush: true, mode: 0o600 });
    return { ...preview, backup_id: id };
  });
}
