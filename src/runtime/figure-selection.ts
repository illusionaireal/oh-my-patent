/** Shared plugin/Skill figure selection. Smoke: npm test tests/skill-package/figure-selection.test.ts */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { digest, json, projectFile, ProjectError, type Preconditions, type WritePlan } from '../core/project-store.js';
import { effectiveConfig } from '../core/project-config.js';
import { validateFigureSpec } from '../core/figures.js';
import { validateFigureCapabilities, planFigure, offerFigure, chooseFigure,
  type FigureChoice, type FigureOffer } from '../core/figure-selection.js';

const CAPABILITIES_PATH = '.patent/figure-capabilities.json';
function requiredInput(expected: Preconditions | undefined, path: string): void {
  if (!expected?.inputs?.[path]) throw new ProjectError('INVALID_INPUT', `Expected input digest required: ${path}`);
}
function load(root: string, params: Record<string, unknown>, expected?: Preconditions) {
  if (typeof params.spec_path !== 'string') throw new ProjectError('INVALID_INPUT', 'spec_path required');
  const specText = readFileSync(projectFile(root, params.spec_path), 'utf8');
  const spec = validateFigureSpec(JSON.parse(specText));
  const base = `figures/${spec.figure_id}`;
  if (params.spec_path !== `${base}/figure-spec.json`) throw new ProjectError('INVALID_INPUT', 'Use the canonical figure specification path');
  const snapshotPath = `${base}/registered-spec.json`;
  if (existsSync(projectFile(root, snapshotPath))) {
    const old = validateFigureSpec(JSON.parse(readFileSync(projectFile(root, snapshotPath), 'utf8')));
    for (const part of spec.parts) if (old.parts.some(p => p.id === part.id && p.number !== part.number)) throw new ProjectError('INVALID_INPUT', 'Existing part numbers must remain stable');
  }
  const capabilitiesText = readFileSync(projectFile(root, CAPABILITIES_PATH), 'utf8');
  const capabilities = validateFigureCapabilities(JSON.parse(capabilitiesText));
  const mainDigest = digest(readFileSync(projectFile(root, 'MAIN.md')));
  const config = effectiveConfig(typeof params.workspace === 'string' ? resolve(params.workspace) : undefined, root, params);
  const choicePath = `${base}/selection.json`, offerPath = `${base}/choice-offer.json`;
  const previous: FigureChoice | undefined = existsSync(projectFile(root, choicePath))
    ? JSON.parse(readFileSync(projectFile(root, choicePath), 'utf8')) : undefined;
  if (previous && (previous.schema_version !== 1 || previous.figure_id !== spec.figure_id || previous.status !== 'selected'
    || !['user', 'timeout_default', 'immediate_default'].includes(previous.source) || !Number.isFinite(Date.parse(previous.selected_at)))) throw new ProjectError('INVALID_INPUT', 'Invalid saved figure selection');
  if (expected) {
    if (existsSync(projectFile(root, offerPath))) requiredInput(expected, offerPath);
    for (const path of [params.spec_path, CAPABILITIES_PATH, 'MAIN.md', ...(previous ? [choicePath] : []),
      ...(existsSync(projectFile(root, '.patent/config.json')) ? ['.patent/config.json'] : [])]) requiredInput(expected, path);
  }
  const plan = planFigure(spec, digest(JSON.stringify({ spec: digest(specText), mainDigest })), config, capabilities, digest(capabilitiesText), previous);
  return { spec, specText, mainDigest, capabilities, plan, previous, base, choicePath, offerPath };
}
export function figurePlan(root: string, params: Record<string, unknown>): unknown { return load(root, params).plan; }
export function figureSelectionMutation(root: string, operation: string, params: Record<string, unknown>, expected: Preconditions): WritePlan {
  const data = load(root, params, expected);
  if (operation === 'figure.offer') {
    const offer = offerFigure(data.plan);
    return { files: { [data.offerPath]: json(offer) }, data: { offer, plan: data.plan } };
  }
  const offer: FigureOffer | undefined = params.mode === 'timeout' && existsSync(projectFile(root, data.offerPath))
    ? JSON.parse(readFileSync(projectFile(root, data.offerPath), 'utf8')) : undefined;
  if (offer) requiredInput(expected, data.offerPath);
  const choice = chooseFigure(data.plan, data.capabilities, params.mode, params.backend, params.decision_reference, offer, data.previous);
  const nextSpec = choice.backend === data.spec.backend ? data.specText : json({ ...data.spec, backend: choice.backend, formats: choice.backend === 'svg' && !data.spec.formats.includes('svg') ? [...data.spec.formats, 'svg'] : data.spec.formats });
  choice.spec_digest = digest(nextSpec);
  const saved = { ...choice, main_digest: data.mainDigest };
  return { files: { [data.choicePath]: json(saved), [params.spec_path as string]: nextSpec,
    ...(existsSync(projectFile(root, data.offerPath)) ? { [data.offerPath]: null } : {}) }, data: saved };
}

/** Validate current capability/spec/MAIN binding before generation or new registration. */
export function assertFigureSelection(root: string, specPath: string, expected?: Preconditions, visual = false): FigureChoice & { main_digest: string } {
  const { spec, specText, mainDigest, capabilities, plan, choicePath, previous } = load(root, { spec_path: specPath });
  if (!previous) throw new ProjectError('MISSING_CAPABILITY', 'Select a figure backend before generation/registration');
  const selected = previous as FigureChoice & { main_digest: string };
  if (selected.capabilities_digest !== plan.capabilities_digest || selected.spec_digest !== digest(specText)
    || selected.main_digest !== mainDigest || selected.backend !== spec.backend || selected.host !== capabilities.host
    || selected.session_id !== capabilities.session_id || selected.execution !== capabilities.backends[spec.backend].execution) throw new ProjectError('CONFLICT', 'Figure selection is stale; refresh observations and reselect/reuse');
  if (!plan.candidates.some(c => c.backend === selected.backend && c.available)) throw new ProjectError('MISSING_CAPABILITY', 'Selected figure backend is unavailable');
  if (expected) for (const path of [choicePath, CAPABILITIES_PATH]) requiredInput(expected, path);
  if (visual && capabilities.preview.status !== 'available') throw new ProjectError('MISSING_CAPABILITY', 'Actual preview is required before visual review/final figures');
  return selected;
}
