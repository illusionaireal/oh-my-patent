import { afterEach, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { runOperation, type RuntimeRequest } from '../../src/runtime/operations.js';
import { digest, inspectProject, json } from '../../src/core/project-store.js';
import { inspectFigure } from '../../src/core/figures.js';
import { loadNode, loadPath, loadInnovationSnapshot } from '../../src/core/path-persistence.js';
import { createInnovationSnapshot } from '../../src/core/brainstorm-path.js';
import { WORKFLOW_STAGE_ORDER } from '../../src/core/workflow.js';

const roots: string[] = [];
const spec = JSON.parse(readFileSync('src/skill-entry/assets/figure-spec.example.json', 'utf8'));
const svg = readFileSync('src/skill-entry/assets/figure.svg', 'utf8');
const passed = { status: 'passed', reviewer_type: 'model', reviewer: 'synthetic test reviewer', technical: true, visual: true, findings: [] };
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
async function setup(): Promise<string> {
  const root = mkdtempSync(join(tmpdir(), 'omp-runtime-')); roots.push(root);
  await runOperation({ interface_version: 1, operation: 'project.create', project: root, operation_id: 'create', expected: { revision: null }, params: { topic: 'Synthetic sensor', topic_slug: 'sensor' } });
  return root;
}
function put(root: string, name: string, data: string | Buffer): void {
  mkdirSync(dirname(join(root, name)), { recursive: true }); writeFileSync(join(root, name), data);
}
function request(root: string, operation: string, id: string, params: Record<string, unknown>, inputs: string[] = []): RuntimeRequest {
  const current = inspectProject(root);
  return { interface_version: 1, operation, project: root, operation_id: id, params, expected: { revision: current.state!.revision!, state_digest: current.state_digest!, inputs: Object.fromEntries(inputs.map(name => [name, digest(readFileSync(join(root, name)))])) } };
}
async function register(root: string, id: string, extra: Record<string, unknown> = {}): Promise<unknown> {
  return runOperation(request(root, 'figure.register', id, { spec_path: 'figures/fig1/figure-spec.json', result_path: 'figures/fig1/result.svg', source_path: 'figures/fig1/source.svg', tool: 'direct-svg', review: passed, ...extra }, ['MAIN.md', 'figures/fig1/figure-spec.json', 'figures/fig1/result.svg', 'figures/fig1/source.svg']));
}
function figure(root: string): void {
  put(root, 'figures/fig1/figure-spec.json', json(spec));
  put(root, 'figures/fig1/result.svg', svg); put(root, 'figures/fig1/source.svg', svg);
}
async function advance(root: string, target: string, extra: Record<string, unknown> = {}): Promise<unknown> {
  return runOperation(request(root, 'workflow.advance', `advance-${target}`, { target, artifacts: ['MAIN.md'], ...extra }, ['MAIN.md']));
}

it('runs all stages across relocation, preserving human gates and current figure review', async () => {
  let root = await setup(); figure(root);
  for (const target of WORKFLOW_STAGE_ORDER.slice(1, -1)) {
    if (target === 'DRAFT') {
      const before = inspectProject(root);
      await expect(advance(root, target)).rejects.toMatchObject({ code: 'INVALID_STATE' });
      expect(inspectProject(root)).toEqual(before);
    }
    await advance(root, target, { human_decision: true });
    if (target === 'QA_LOOP') {
      const relocated = `${root} 中文 moved`;
      renameSync(root, relocated); roots[roots.indexOf(root)] = relocated; root = relocated;
      expect(await runOperation({ interface_version: 1, operation: 'workflow.inspect', project: root })).toMatchObject({ state: { project: { path: '.' }, current_stage: 'QA_LOOP' } });
    }
  }
  await register(root, 'review');
  const final = request(root, 'workflow.advance', 'final', { target: 'DONE', artifacts: ['MAIN.md'], human_decision: true }, ['MAIN.md']);
  put(root, 'MAIN.md', readFileSync(join(root, 'MAIN.md'), 'utf8') + '\nRevised synthetic topology.');
  await expect(runOperation(final)).rejects.toMatchObject({ code: 'CONFLICT' });
  expect(inspectFigure(root, 'fig1').review_current).toBe(false);
  await expect(advance(root, 'DONE', { human_decision: true })).rejects.toMatchObject({ code: 'INVALID_STATE' });
  await register(root, 'review-current');
  await expect(advance(root, 'DONE')).rejects.toMatchObject({ code: 'INVALID_STATE' });
  await advance(root, 'DONE', { human_decision: true });
  expect(inspectProject(root).state).toMatchObject({ current_stage: 'DONE', stages: { DIAGRAM_FINAL: { status: 'completed' } } });
  expect(JSON.parse(readFileSync(join(root, '.patent/decisions/advance-DONE.json'), 'utf8'))).toMatchObject({ human_decision: true, target: 'DONE' });
});

it.each(['figure-spec.json', 'result.svg', 'source.svg'])('invalidates review when %s changes', async name => {
  const root = await setup(); figure(root); await register(root, 'review');
  expect(inspectFigure(root, 'fig1').review_current).toBe(true);
  const file = join(root, 'figures/fig1', name); writeFileSync(file, readFileSync(file, 'utf8') + '\n');
  expect(inspectFigure(root, 'fig1')).toMatchObject({ review_current: false, review: { status: 'pending' } });
});

it('refuses renumbering stable parts and unperformed visual review', async () => {
  const root = await setup(); figure(root); await register(root, 'review');
  const revision = inspectProject(root).state!.revision;
  await expect(register(root, 'invalid-review', { review: { ...passed, visual: false } })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  const changed = structuredClone(spec); changed.parts[0].number = '999';
  put(root, 'figures/fig1/figure-spec.json', json(changed));
  await expect(register(root, 'renumber')).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  expect(inspectProject(root).state!.revision).toBe(revision);
});

it('hashes a raster result as bytes and records a local-renderer handoff', async () => {
  const root = await setup();
  // A tiny valid PNG; the runtime records bytes, it does not claim visual inspection.
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9WQAAAAASUVORK5CYII=', 'base64');
  put(root, 'figures/fig1/figure-spec.json', json({ ...spec, backend: 'mermaid', formats: ['png'] }));
  put(root, 'figures/fig1/result.png', png); put(root, 'figures/fig1/source.mmd', 'graph LR\n sensor --> processor');
  const params = { spec_path: 'figures/fig1/figure-spec.json', result_path: 'figures/fig1/result.png', source_path: 'figures/fig1/source.mmd', tool: 'synthetic-local-renderer' };
  const result = await runOperation(request(root, 'figure.register', 'raster', params, ['MAIN.md', params.spec_path, params.result_path, params.source_path]));
  expect(result).toMatchObject({ result: { result_digest: digest(png), review: { status: 'pending', visual: false } } });
});

it('records, restores and branches without duplicate nodes or inconsistent snapshots', async () => {
  const root = await setup();
  const innovation = { ...createInnovationSnapshot('sensor-filter', 'Filter', 'Noise', ['Window'], ['Adaptive']), status: 'abandoned' };
  const first = request(root, 'path.record', 'round-one', { node: { innovations: [innovation] } });
  const firstResult = await runOperation(first); expect(await runOperation(first)).toEqual(firstResult);
  await runOperation(request(root, 'path.record', 'round-two', { node: { innovations: [innovation] } }));
  expect((await loadPath(root))!.edges).toHaveLength(1);
  await runOperation(request(root, 'path.restore', 'restore', { node_id: 'round-1', innovation_id: innovation.id }));
  expect((await loadNode(root, 'round-1'))!.innovations[0].status).toBe('active');
  expect((await loadInnovationSnapshot(root, 1))[0].status).toBe('active');
  const branch = request(root, 'path.branch', 'branch', { node_id: 'round-1', reason: 'Synthetic alternate route' });
  const result = await runOperation(branch) as { result: { branchId: string } };
  expect(await runOperation(branch)).toEqual(result);
  const branchRoot = join(root, '.brainstorm/branches', result.result.branchId);
  expect((await loadNode(branchRoot, 'round-1'))!.innovations[0].status).toBe('active');
  expect((await loadInnovationSnapshot(branchRoot, 1))[0].status).toBe('active');
  expect((await loadPath(root))!.nodes).toEqual(['round-1', 'round-2']);
});

it('requires matched disclosure evidence for an imagegen handoff', async () => {
  const root = await setup(); figure(root);
  put(root, 'figures/fig1/figure-spec.json', json({ ...spec, backend: 'imagegen' }));
  const payload = 'Synthetic sensor image request; no real service was called.';
  const payloadPath = '.patent/disclosures/previews/image.txt';
  const consentPath = '.patent/disclosures/consents/image.json';
  const eventPath = '.patent/disclosures/events/image.json';
  const consent = { id: 'image', operation_id: 'generate-image', content_digest: digest(payload), recipient: 'https://example.test/images', purpose: 'figure.generate', tool: 'synthetic-image-tool', approved_at: '2026-09-30T00:00:00Z', expires_at: '2026-09-30T01:00:00Z', reuse: 'one_operation', approval_reference: 'synthetic-test-approval' };
  const event = { operation_id: consent.operation_id, consent_id: consent.id, content_digest: consent.content_digest, recipient: consent.recipient, purpose: consent.purpose, tool: consent.tool, time: '2026-09-30T00:01:00Z', outcome: 'acknowledged' };
  put(root, payloadPath, payload); put(root, consentPath, json(consent)); put(root, eventPath, json(event));
  const params = { spec_path: 'figures/fig1/figure-spec.json', result_path: 'figures/fig1/result.svg', tool: consent.tool, provider: 'synthetic-provider', payload_path: payloadPath, consent_reference: consentPath, disclosure_reference: eventPath };
  const inputs = ['MAIN.md', params.spec_path, params.result_path, payloadPath, consentPath, eventPath];
  put(root, eventPath, json({ ...event, content_digest: digest('different payload') }));
  await expect(runOperation(request(root, 'figure.register', 'bad-evidence', params, inputs))).rejects.toMatchObject({ code: 'DISCLOSURE_DENIED' });
  put(root, eventPath, json(event));
  expect(await runOperation(request(root, 'figure.register', 'handoff', params, inputs))).toMatchObject({ result: { backend: 'imagegen', provider: 'synthetic-provider', review: { status: 'pending' } } });
});

it('records human-approved omission only for an optional figure', async () => {
  const root = await setup(); figure(root);
  for (const target of WORKFLOW_STAGE_ORDER.slice(1, -1)) await advance(root, target, { human_decision: true });
  const params = { target: 'DONE', artifacts: ['MAIN.md'], human_decision: true, omitted_figures: [{ figure_id: 'fig1', reason: 'Optional illustration not needed for the supplied technical explanation' }] };
  const inputs = ['MAIN.md', 'figures/fig1/figure-spec.json'];
  await expect(runOperation(request(root, 'workflow.advance', 'required', params, inputs))).rejects.toMatchObject({ code: 'INVALID_STATE' });
  put(root, 'figures/fig1/figure-spec.json', json({ ...spec, optional: true }));
  await runOperation(request(root, 'workflow.advance', 'optional', params, inputs));
  expect(JSON.parse(readFileSync(join(root, '.patent/decisions/optional.json'), 'utf8')).omitted_figures).toEqual(params.omitted_figures);
});
