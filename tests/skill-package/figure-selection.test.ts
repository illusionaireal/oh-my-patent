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
function put(root: string, path: string, text: string | Buffer) { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); }
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5t0AAAAASUVORK5CYII=', 'base64');
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
it('recomputes an available local default at expiry without restarting the offered deadline', async () => {
  const start = Date.now(); vi.spyOn(Date, 'now').mockReturnValue(start);
  const root = await setup(true);
  await runOperation(mutation(root, 'figure.offer', 'offer', params));
  vi.mocked(Date.now).mockReturnValue(start + 30_000);
  const caps = capabilityFixture(true); caps.backends.svg.status = 'unavailable'; saveCapabilities(root, caps);
  expect(await select(root, 'timeout')).toMatchObject({ result: { backend: 'mermaid', source: 'timeout_default' } });
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
  put(root, 'figures/fig1/result.png', png);
  await expect(runOperation(mutation(root, 'figure.register', 'unauthorized', { ...params, result_path: 'figures/fig1/result.png', tool: 'synthetic-tool' }, [...selectionInputs(root), 'figures/fig1/result.png'])))
    .rejects.toMatchObject({ code: 'INVALID_INPUT' });
});

it('preserves passed review across capability refresh and reuse of the same execution choice', async () => {
  const root = await setup(); await select(root); put(root, 'figures/fig1/result.svg', svg);
  await runOperation(mutation(root, 'figure.register', 'review-before-resume', { ...params,
    result_path: 'figures/fig1/result.svg', tool: 'synthetic-tool',
    review: { status: 'passed', reviewer_type: 'model', reviewer: 'synthetic', technical: true, visual: true, findings: [] },
  }, [...selectionInputs(root), 'figures/fig1/result.svg']));
  const caps = capabilityFixture(); caps.session_id = 'new-session'; caps.backends.imagegen.status = 'unavailable'; saveCapabilities(root, caps);
  await select(root, 'reuse');
  expect(inspectFigure(root, 'fig1')).toMatchObject({ review_current: true, review: { status: 'passed' } });
  put(root, 'MAIN.md', readFileSync(join(root, 'MAIN.md'), 'utf8') + '\nChanged technical content.');
  await select(root, 'reuse');
  expect(inspectFigure(root, 'fig1')).toMatchObject({ review_current: false, review: { status: 'pending' } });
});

it('keeps the first deadline across repeated offers and a timestamp-only observation refresh', async () => {
  const start = Date.now(); vi.spyOn(Date, 'now').mockReturnValue(start);
  const root = await setup(true);
  const first = await runOperation(mutation(root, 'figure.offer', 'initial-offer', params));
  vi.mocked(Date.now).mockReturnValue(start + 15_000); saveCapabilities(root, capabilityFixture(true));
  expect(await runOperation(mutation(root, 'figure.offer', 'reoffered', params))).toMatchObject({ result: { offer: (first as { result: { offer: unknown } }).result.offer } });
  vi.mocked(Date.now).mockReturnValue(start + 30_000); saveCapabilities(root, capabilityFixture(true));
  expect(await select(root, 'timeout')).toMatchObject({ result: { backend: 'svg', source: 'timeout_default' } });
});

it('refreshes observations before a nearly expired offer and retains its deadline after later expiry', async () => {
  const start = Date.now(); vi.spyOn(Date, 'now').mockReturnValue(start);
  const root = await setup(true); const caps = capabilityFixture(true);
  caps.observed_at = new Date(start - 29 * 60_000 - 50_000).toISOString(); saveCapabilities(root, caps);
  expect(await runOperation({ interface_version: 1, operation: 'figure.plan', project: root, params })).toMatchObject({ refresh_before_offer: true });
  await expect(runOperation(mutation(root, 'figure.offer', 'stale-offer', params))).rejects.toMatchObject({ code: 'MISSING_CAPABILITY' });
  saveCapabilities(root, capabilityFixture(true)); await runOperation(mutation(root, 'figure.offer', 'fresh-offer', params));
  vi.mocked(Date.now).mockReturnValue(start + 31 * 60_000);
  await expect(select(root, 'timeout')).rejects.toMatchObject({ code: 'MISSING_CAPABILITY' });
  saveCapabilities(root, capabilityFixture(true));
  expect(await select(root, 'timeout')).toMatchObject({ result: { source: 'timeout_default' } });
});

it.each(['MAIN.md', 'session'] as const)('rejects an expired offer after a real %s context change', async changed => {
  const start = Date.now(); vi.spyOn(Date, 'now').mockReturnValue(start);
  const root = await setup(true); await runOperation(mutation(root, 'figure.offer', 'offer', params));
  vi.mocked(Date.now).mockReturnValue(start + 30_000);
  if (changed === 'MAIN.md') put(root, changed, 'Changed technical direction');
  else { const caps = capabilityFixture(true); caps.session_id = 'different-session'; saveCapabilities(root, caps); }
  await expect(select(root, 'timeout')).rejects.toMatchObject({ code: 'CONFLICT' });
});

it('normalizes raster and SVG formats when selecting a different backend or repairing the same one', async () => {
  const root = await setup();
  await select(root, 'user', { backend: 'imagegen', decision_reference: 'Synthetic image choice' });
  expect(JSON.parse(readFileSync(join(root, params.spec_path), 'utf8'))).toMatchObject({ backend: 'imagegen', formats: ['png'] });
  await select(root, 'user', { backend: 'svg', decision_reference: 'Synthetic SVG choice' });
  expect(JSON.parse(readFileSync(join(root, params.spec_path), 'utf8'))).toMatchObject({ backend: 'svg', formats: ['svg'] });
  put(root, params.spec_path, json({ ...spec, formats: ['png'] })); await select(root, 'reuse');
  expect(JSON.parse(readFileSync(join(root, params.spec_path), 'utf8')).formats).toEqual(['svg']);
});

function failure(root: string, outcome = 'failed', start = Date.now(), end = Date.now()) {
  const selected = JSON.parse(readFileSync(join(root, 'figures/fig1/selection.json'), 'utf8'));
  const record = { schema_version: 1, figure_id: 'fig1', backend: selected.backend, execution: selected.execution,
    selection_digest: digest(readFileSync(join(root, 'figures/fig1/selection.json'))), spec_digest: selected.spec_digest,
    main_digest: selected.main_digest, tool: 'synthetic-tool', outcome, evidence: 'Synthetic failure; no renderer was called',
    started_at: new Date(start).toISOString(), finished_at: new Date(end).toISOString(), deadline_at: new Date(start + 60_000).toISOString() };
  put(root, 'figures/fig1/render-failure.json', json(record)); return record;
}
const fallback = (root: string) => runOperation(mutation(root, 'figure.fallback', `fallback-${inspectProject(root).state!.revision}`,
  { ...params, failure_path: 'figures/fig1/render-failure.json' }, [...selectionInputs(root), 'figures/fig1/render-failure.json']));

it('permits one local SVG fallback after a recorded failure without another selection wait', async () => {
  const root = await setup(true); await select(root, 'user', { backend: 'mermaid', decision_reference: 'Synthetic renderer choice' });
  failure(root);
  expect(await fallback(root)).toMatchObject({ result: { backend: 'svg', source: 'failure_default', decision_reference: null } });
  failure(root);
  await expect(fallback(root)).rejects.toMatchObject({ code: 'RENDER_FAILED' });
});

it('validates a real local render deadline before allowing a timeout fallback', async () => {
  const root = await setup(); await select(root, 'user', { backend: 'mermaid', decision_reference: 'Synthetic renderer choice' });
  const start = Date.now(); vi.spyOn(Date, 'now').mockReturnValue(start + 59_000); failure(root, 'timeout', start, start + 59_000);
  await expect(fallback(root)).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  vi.mocked(Date.now).mockReturnValue(start + 60_000); failure(root, 'timeout', start, start + 60_000);
  expect(await fallback(root)).toMatchObject({ result: { backend: 'svg', source: 'failure_default' } });
});

it('rejects failure evidence bound to a different choice and never automatically retries a remote service', async () => {
  const root = await setup(); await select(root, 'user', { backend: 'mermaid', decision_reference: 'Synthetic renderer choice' });
  const record = failure(root); put(root, 'figures/fig1/render-failure.json', json({ ...record, selection_digest: 'different' }));
  await expect(fallback(root)).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  await select(root, 'user', { backend: 'imagegen', decision_reference: 'Synthetic remote choice' }); failure(root);
  await expect(fallback(root)).rejects.toMatchObject({ code: 'RENDER_FAILED' });
});

it('rejects malformed failure records and unavailable SVG instead of manufacturing a fallback', async () => {
  const root = await setup(); await select(root, 'user', { backend: 'mermaid', decision_reference: 'Synthetic renderer choice' });
  put(root, 'figures/fig1/render-failure.json', 'null');
  await expect(fallback(root)).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  const caps = capabilityFixture(); caps.backends.svg.status = 'unavailable'; saveCapabilities(root, caps);
  await select(root, 'reuse'); failure(root);
  await expect(fallback(root)).rejects.toMatchObject({ code: 'RENDER_FAILED' });
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
