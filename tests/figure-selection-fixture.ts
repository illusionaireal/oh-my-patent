/** Synthetic observations only; no model, renderer or remote service was called. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { digest, inspectProject, json } from '../src/core/project-store.js';
import { runOperation, type RuntimeRequest } from '../src/runtime/operations.js';
import type { FigureBackend, FigureCapabilities } from '../src/core/figure-selection.js';

export function capabilityFixture(timed = false): FigureCapabilities {
  const o = { status: 'available' as const, tool: 'synthetic-tool', evidence: 'Synthetic test observation; no real invocation' };
  return { schema_version: 1, host: 'synthetic-host', session_id: 'synthetic-session', observed_at: new Date(Date.now()).toISOString(),
    backends: { svg: { ...o, execution: 'local' }, mermaid: { ...o, execution: 'local' },
      plantuml: { ...o, execution: 'remote' }, imagegen: { ...o, execution: 'remote' } },
    preview: o, timed_selection: { ...o, status: timed ? 'available' : 'unavailable' } };
}
export function saveCapabilities(root: string, capabilities = capabilityFixture()): void {
  mkdirSync(join(root, '.patent'), { recursive: true });
  writeFileSync(join(root, '.patent/figure-capabilities.json'), json(capabilities));
}
export function selectionInputs(root: string, id = 'fig1'): string[] {
  return ['MAIN.md', '.patent/config.json', '.patent/figure-capabilities.json', `figures/${id}/figure-spec.json`,
    `figures/${id}/selection.json`, `figures/${id}/choice-offer.json`].filter(p => existsSync(join(root, p)));
}
export function mutation(root: string, operation: string, id: string, params: Record<string, unknown>, inputs = selectionInputs(root)): RuntimeRequest {
  const current = inspectProject(root);
  return { interface_version: 1, operation, project: root, operation_id: id, params,
    expected: { revision: current.state!.revision!, state_digest: current.state_digest!,
      inputs: Object.fromEntries(inputs.map(p => [p, digest(readFileSync(join(root, p)))])) } };
}
export async function ensureSelection(root: string, backend?: FigureBackend): Promise<void> {
  if (!existsSync(join(root, '.patent/figure-capabilities.json'))) saveCapabilities(root);
  const specPath = 'figures/fig1/figure-spec.json';
  const spec = JSON.parse(readFileSync(join(root, specPath), 'utf8'));
  const path = join(root, 'figures/fig1/selection.json');
  if (existsSync(path)) {
    const old = JSON.parse(readFileSync(path, 'utf8'));
    if (old.spec_digest === digest(readFileSync(join(root, specPath))) && old.main_digest === digest(readFileSync(join(root, 'MAIN.md')))
      && old.capabilities_digest === digest(readFileSync(join(root, '.patent/figure-capabilities.json')))) return;
  }
  await runOperation(mutation(root, 'figure.select', `select-${inspectProject(root).state!.revision}`, {
    spec_path: specPath, mode: 'user', backend: backend ?? spec.backend, decision_reference: 'Synthetic user choice for test fixture',
  }));
}
