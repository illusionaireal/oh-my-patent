import { afterEach, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { runOperation } from '../../src/runtime/operations.js';
import { digest, inspectProject, json } from '../../src/core/project-store.js';
import { inspectFigure } from '../../src/core/figures.js';
import { capabilityFixture, mutation, saveCapabilities, selectionInputs } from '../figure-selection-fixture.js';

const roots: string[] = [];
const spec = JSON.parse(readFileSync('src/skill-entry/assets/figure-spec.example.json', 'utf8'));
const svg = readFileSync('src/skill-entry/assets/figure.svg', 'utf8');
afterEach(() => { vi.restoreAllMocks(); for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function put(root: string, path: string, text: string) { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); }
async function setup(timed = false) {
  const root = mkdtempSync(join(tmpdir(), 'omp-figure-choice-')); roots.push(root);
  await runOperation({ interface_version: 1, operation: 'project.create', project: root, operation_id: 'create', expected: { revision: null }, params: { topic: 'Synthetic', topic_slug: 'synthetic' } });
  put(root, 'figures/fig1/figure-spec.json', json(spec)); saveCapabilities(root, capabilityFixture(timed));
  return root;
}
const params = { spec_path: 'figures/fig1/figure-spec.json' };
async function select(root: string, mode = 'default', extra = {}) {
  return runOperation(mutation(root, 'figure.select', `choice-${inspectProject(root).state!.revision}`, { ...params, mode, ...extra }));
}
it('uses a saved preference, persists selection and updates each figure backend', async () => {
  const root = await setup();
  put(root, '.patent/config.json', json({ figures: { preferredBackend: 'mermaid' } }));
  expect(await select(root)).toMatchObject({ result: { backend: 'mermaid', source: 'immediate_default', decision_reference: null } });
  expect(JSON.parse(readFileSync(join(root, params.spec_path), 'utf8')).backend).toBe('mermaid');
  put(root, 'figures/fig2/figure-spec.json', json({ ...spec, figure_id: 'fig2' }));
  await runOperation(mutation(root, 'figure.select', 'second', { spec_path: 'figures/fig2/figure-spec.json', mode: 'user', backend: 'svg', decision_reference: 'Synthetic per-figure decision' }, selectionInputs(root, 'fig2')));
  expect(JSON.parse(readFileSync(join(root, 'figures/fig2/selection.json'), 'utf8')).backend).toBe('svg');
  expect(JSON.parse(readFileSync(join(root, 'figures/fig1/selection.json'), 'utf8')).backend).toBe('mermaid');
});
it('validates the persisted deadline, defaults after 30 seconds and supports idempotent retries', async () => {
  const start = Date.now(); vi.spyOn(Date, 'now').mockReturnValue(start);
  const root = await setup(true);
  await runOperation(mutation(root, 'figure.offer', 'offer', params));
  await expect(select(root, 'timeout')).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  vi.mocked(Date.now).mockReturnValue(start + 30_000);
  const choice = mutation(root, 'figure.select', 'timeout-choice', { ...params, mode: 'timeout' });
  const result = await runOperation(choice);
  expect(result).toMatchObject({ result: { source: 'timeout_default', backend: 'svg', decision_reference: null } });
  expect(await runOperation(choice)).toEqual(result);
});
it('rejects timeout when an offered plan changes', async () => {
  const start = Date.now(); vi.spyOn(Date, 'now').mockReturnValue(start);
  const root = await setup(true);
  await runOperation(mutation(root, 'figure.offer', 'offer', params));
  vi.mocked(Date.now).mockReturnValue(start + 30_000);
  const caps = capabilityFixture(true); caps.backends.svg.status = 'unavailable'; saveCapabilities(root, caps);
  await expect(select(root, 'timeout')).rejects.toMatchObject({ code: 'CONFLICT' });
});
it('refreshes saved choices on resume without repeating an unchanged user selection', async () => {
  const root = await setup(); await select(root, 'user', { backend: 'svg', decision_reference: 'decision #9' });
  const caps = capabilityFixture(); caps.session_id = 'resumed-host-session'; saveCapabilities(root, caps);
  expect(await select(root, 'reuse')).toMatchObject({ result: { source: 'user', decision_reference: 'decision #9', session_id: 'resumed-host-session' } });
  caps.backends.svg.status = 'unavailable'; saveCapabilities(root, caps);
  await expect(select(root, 'reuse')).rejects.toMatchObject({ code: 'MISSING_CAPABILITY' });
  expect(await select(root)).toMatchObject({ result: { backend: 'mermaid', source: 'immediate_default' } });
});
it('keeps remote preferences local on default and still requires disclosure evidence for an explicit imagegen choice', async () => {
  const root = await setup(); put(root, '.patent/config.json', json({ figures: { preferredBackend: 'imagegen' } }));
  expect(await select(root)).toMatchObject({ result: { backend: 'svg', source: 'immediate_default' } });
  await select(root, 'user', { backend: 'imagegen', decision_reference: 'Synthetic backend choice, not disclosure consent' });
  put(root, 'figures/fig1/result.svg', svg);
  await expect(runOperation(mutation(root, 'figure.register', 'unauthorized', { ...params, result_path: 'figures/fig1/result.svg', tool: 'synthetic-tool' }, [...selectionInputs(root), 'figures/fig1/result.svg'])))
    .rejects.toMatchObject({ code: 'INVALID_INPUT' });
});
it('allows drafting without preview but blocks a passing visual review', async () => {
  const root = await setup(); const caps = capabilityFixture(); caps.preview.status = 'unavailable'; saveCapabilities(root, caps);
  expect(await select(root)).toMatchObject({ result: { backend: 'svg', review_ready: false } });
  put(root, 'figures/fig1/result.svg', svg);
  const base = { ...params, result_path: 'figures/fig1/result.svg', tool: 'synthetic-tool' };
  const inputs = [...selectionInputs(root), 'figures/fig1/result.svg'];
  await expect(runOperation(mutation(root, 'figure.register', 'fake-review', { ...base, review: { status: 'passed', reviewer_type: 'model', reviewer: 'synthetic', technical: true, visual: true, findings: [] } }, inputs)))
    .rejects.toMatchObject({ code: 'MISSING_CAPABILITY' });
  expect(await runOperation(mutation(root, 'figure.register', 'draft', base, inputs))).toMatchObject({ result: { review: { status: 'pending', visual: false } } });
});
it('requires selection before registration and rejects stale capabilities or missing observation digests', async () => {
  const root = await setup(); put(root, 'figures/fig1/result.svg', svg);
  const register = () => mutation(root, 'figure.register', 'register', { ...params, result_path: 'figures/fig1/result.svg', tool: 'synthetic-tool' }, [...selectionInputs(root), 'figures/fig1/result.svg']);
  await expect(runOperation(register())).rejects.toMatchObject({ code: 'MISSING_CAPABILITY' });
  await select(root);
  const missing = register(); delete missing.expected!.inputs!['.patent/figure-capabilities.json'];
  await expect(runOperation(missing)).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  const caps = capabilityFixture(); caps.session_id = 'other-session'; saveCapabilities(root, caps);
  await expect(runOperation(register())).rejects.toMatchObject({ code: 'CONFLICT' });
});
it('invalidates review when the backend selection changes', async () => {
  const root = await setup(); await select(root); put(root, 'figures/fig1/result.svg', svg);
  await runOperation(mutation(root, 'figure.register', 'review', { ...params, result_path: 'figures/fig1/result.svg', tool: 'synthetic-tool', review: { status: 'passed', reviewer_type: 'model', reviewer: 'synthetic', technical: true, visual: true, findings: [] } }, [...selectionInputs(root), 'figures/fig1/result.svg']));
  expect(inspectFigure(root, 'fig1').review_current).toBe(true);
  await select(root, 'user', { backend: 'mermaid', decision_reference: 'Synthetic change' });
  expect(inspectFigure(root, 'fig1')).toMatchObject({ review_current: false, review: { status: 'pending' } });
});

it('gates required draft paths and final preview while preserving human direction decisions', async () => {
  const root = await setup(); const caps = capabilityFixture(); caps.preview.status = 'unavailable'; saveCapabilities(root, caps);
  const advance = (target: string) => runOperation(mutation(root, 'workflow.advance', `advance-${target}`, { target, artifacts: ['MAIN.md'], human_decision: true }));
  for (const target of ['RESEARCH', 'BRAINSTORM_R1', 'BRAINSTORM_R2', 'DRAFT']) await advance(target);
  await expect(advance('DIAGRAM_DRAFT')).rejects.toMatchObject({ code: 'MISSING_CAPABILITY' });
  expect(inspectProject(root).state!.current_stage).toBe('DRAFT');
  await select(root);
  for (const target of ['DIAGRAM_DRAFT', 'QA_LOOP', 'FINAL_REVIEW']) await advance(target);
  await expect(advance('DIAGRAM_FINAL')).rejects.toMatchObject({ code: 'MISSING_CAPABILITY' });
  caps.preview.status = 'available'; caps.observed_at = new Date().toISOString(); saveCapabilities(root, caps);
  await select(root, 'reuse');
  await advance('DIAGRAM_FINAL');
  expect(inspectProject(root).state!.current_stage).toBe('DIAGRAM_FINAL');
});

it('requires disclosure evidence for a selected remote PlantUML result too', async () => {
  const root = await setup(); await select(root, 'user', { backend: 'plantuml', decision_reference: 'Synthetic backend choice only' });
  put(root, 'figures/fig1/result.svg', svg);
  await expect(runOperation(mutation(root, 'figure.register', 'remote-plantuml', { ...params, result_path: 'figures/fig1/result.svg', tool: 'synthetic-tool' }, [...selectionInputs(root), 'figures/fig1/result.svg'])))
    .rejects.toMatchObject({ code: 'INVALID_INPUT' });
});
