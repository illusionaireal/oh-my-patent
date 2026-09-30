import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runOperation } from '../../src/runtime/operations.js';
import { ProjectStore, inspectProject, json, projectFile } from '../../src/core/project-store.js';
import { createInitialState } from '../../src/core/state.js';
import { StateManager } from '../../src/core/state-manager.js';

const roots: string[] = [];
function temp() { const root = mkdtempSync(join(tmpdir(), 'omp 中文 space-')); roots.push(root); return root; }
function create(project: string) { return { interface_version: 1 as const, operation: 'project.create', project, operation_id: 'create', expected: { revision: null }, params: { topic: 'Synthetic sensor', topic_slug: 'sensor' } }; }
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe('coordinated state', () => {
  it('creates once and returns the identical persisted result on retry', async () => {
    const root = temp(); const request = create(root);
    const first = await runOperation(request);
    expect(await runOperation(request)).toEqual(first);
    expect(inspectProject(root).state).toMatchObject({ schema_version: 1, revision: 0, project: { path: '.' } });
    await expect(runOperation({ ...request, params: { topic: 'Different', topic_slug: 'sensor' } })).rejects.toMatchObject({ code: 'CONFLICT' });
  });
  it('rejects stale revisions and illegal transitions without changing the state', async () => {
    const root = temp(); await runOperation(create(root)); const before = inspectProject(root);
    await expect(new ProjectStore(root).mutate({ operation_id: 'stale', expected: { revision: 2 } }, () => { throw new Error('must not build'); })).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(runOperation({ interface_version: 1, operation: 'workflow.advance', project: root, operation_id: 'jump', expected: { revision: 0 }, params: { target: 'DONE', artifacts: ['MAIN.md'], human_decision: true } })).rejects.toThrow();
    expect(inspectProject(root)).toEqual(before);
  });
  it.each(['after_prepare', 'after_apply'])('rolls back an interrupted transaction at %s before accepting a retry', async boundary => {
    const root = temp(); await runOperation(create(root));
    const store = new ProjectStore(root); const state = inspectProject(root).state!;
    const request = { operation_id: 'edit', expected: { revision: 0 } };
    const build = () => ({ files: { '.patent/state.json': json(state), 'references/new.md': 'new evidence' }, data: { saved: true } });
    await expect(store.mutate(request, build, { fault: point => { if (point === boundary) throw new Error('crash'); } })).rejects.toThrow('crash');
    const result = await store.mutate(request, build);
    expect(result).toMatchObject({ revision: 1 });
    expect(readFileSync(join(root, 'references/new.md'), 'utf8')).toBe('new evidence');
  });
  it('returns a committed result even when the caller lost the response', async () => {
    const root = temp(); await runOperation(create(root)); const store = new ProjectStore(root);
    const request = { operation_id: 'edit', expected: { revision: 0 } };
    await expect(store.mutate(request, state => ({ files: { '.patent/state.json': json(state) }, data: 'ok' }), { fault: point => { if (point === 'after_commit') throw new Error('lost response'); } })).rejects.toThrow();
    expect(await store.mutate(request, () => { throw new Error('must not rerun'); })).toMatchObject({ result: 'ok', revision: 1 });
  });
  it('excludes a concurrent writer while the first builds its transaction', async () => {
    const root = temp(); await runOperation(create(root)); const store = new ProjectStore(root);
    let release!: () => void;
    const wait = new Promise<void>(r => { release = r; });
    const first = store.mutate({ operation_id: 'first', expected: { revision: 0 } }, async state => { await wait; return { files: { '.patent/state.json': json(state) }, data: true }; });
    await expect(store.mutate({ operation_id: 'second', expected: { revision: 0 } }, () => { throw new Error('must not execute'); })).rejects.toMatchObject({ code: 'LOCKED' });
    release(); await first;
  });
  it('does not overwrite existing documents during creation', async () => {
    const root = temp(); writeFileSync(join(root, 'MAIN.md'), 'user content');
    await expect(runOperation(create(root))).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(readFileSync(join(root, 'MAIN.md'), 'utf8')).toBe('user content');
  });
  it('migrates a moved Windows project with exact backup, then blocks the old writer', async () => {
    const root = temp(); mkdirSync(join(root, '.patent')); writeFileSync(join(root, 'MAIN.md'), 'legacy');
    const legacy = createInitialState({ topic: 'Legacy', topicSlug: 'legacy', jurisdiction: 'CN', projectPath: 'C:\\old\\project' });
    legacy.stages.INIT.artifacts = ['C:\\old\\project\\MAIN.md'];
    const bytes = json(legacy); writeFileSync(join(root, '.patent/state.json'), bytes);
    const request = { interface_version: 1 as const, operation: 'project.migrate', project: root, operation_id: 'migration', expected: { revision: 0, state_digest: inspectProject(root).state_digest! }, params: { dry_run: true } };
    expect(await runOperation(request)).toMatchObject({ writes: false });
    expect(readFileSync(join(root, '.patent/state.json'), 'utf8')).toBe(bytes);
    await runOperation({ ...request, params: { dry_run: false } });
    expect(inspectProject(root).state?.stages.INIT.artifacts).toEqual(['MAIN.md']);
    expect(readFileSync(join(root, '.patent/backups/migration-legacy-state.json'), 'utf8')).toBe(bytes);
    expect(() => new StateManager(join(root, '..')).saveState(root.split(/[\\/]/).pop()!, inspectProject(root).state!)).toThrow();
  });
  it('allows raw future-state inspection but refuses migration or writes', async () => {
    const root = temp(); await runOperation(create(root)); const state = { ...inspectProject(root).state, schema_version: 99 };
    writeFileSync(join(root, '.patent/state.json'), json(state));
    expect(await runOperation({ interface_version: 1, operation: 'project.inspect', project: root })).toMatchObject({ state: { schema_version: 99 } });
    await expect(runOperation({ interface_version: 1, operation: 'project.migrate', project: root, operation_id: 'future', expected: { revision: 0 } })).rejects.toMatchObject({ code: 'INVALID_STATE' });
    await expect(runOperation({ interface_version: 1, operation: 'path.query', project: root })).rejects.toMatchObject({ code: 'INVALID_STATE' });
  });
  it('migrates saved role output paths and refuses ambiguous external references', async () => {
    const root = temp(); mkdirSync(join(root, '.patent')); mkdirSync(join(root, '.brainstorm/nodes'), { recursive: true }); mkdirSync(join(root, 'references'));
    writeFileSync(join(root, 'references/review.md'), 'Synthetic review');
    const legacy = createInitialState({ topic: 'Legacy', topicSlug: 'legacy', jurisdiction: 'CN', projectPath: 'C:\\old\\project' });
    const stateBytes = json(legacy); writeFileSync(join(root, '.patent/state.json'), stateBytes);
    const nodePath = join(root, '.brainstorm/nodes/round-1.json');
    writeFileSync(nodePath, json({ agentOutputs: [{ outputFile: 'C:\\other\\review.md' }] }));
    const request = { interface_version: 1 as const, operation: 'project.migrate', project: root, operation_id: 'migration', expected: { revision: 0, state_digest: inspectProject(root).state_digest! } };
    await expect(runOperation({ ...request, params: { dry_run: true } })).rejects.toThrow();
    expect(readFileSync(join(root, '.patent/state.json'), 'utf8')).toBe(stateBytes);
    const nodeBytes = json({ agentOutputs: [{ outputFile: 'C:\\old\\project\\references\\review.md' }] });
    writeFileSync(nodePath, nodeBytes);
    await runOperation(request);
    expect(JSON.parse(readFileSync(nodePath, 'utf8')).agentOutputs[0].outputFile).toBe('references/review.md');
    expect(readFileSync(join(root, '.patent/backups/migration/.brainstorm/nodes/round-1.json'), 'utf8')).toBe(nodeBytes);
  });
  it.each(['../outside', 'C:/outside', 'file:stream', 'a\\b', '/outside', 'a/../b'])('rejects unsafe path %s', name => {
    expect(() => projectFile(temp(), name)).toThrow();
  });
});
