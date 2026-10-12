/** Shared plugin/Skill figure selection. Smoke: npm test tests/skill-package/figure-selection.test.ts */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { digest, json, projectFile, ProjectError, type Preconditions, type WritePlan } from '../core/project-store.js';
import { effectiveConfig } from '../core/project-config.js';
import { validateFigureSpec } from '../core/figures.js';
import { validateFigureCapabilities, planFigure, offerFigure, chooseFigure, figureFormats, FIGURE_RENDER_TIMEOUT_MS,
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
    || !['user', 'timeout_default', 'immediate_default', 'failure_default'].includes(previous.source) || !Number.isFinite(Date.parse(previous.selected_at)))) throw new ProjectError('INVALID_INPUT', 'Invalid saved figure selection');
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
  const pending: FigureOffer | undefined = existsSync(projectFile(root, data.offerPath))
    ? JSON.parse(readFileSync(projectFile(root, data.offerPath), 'utf8')) : undefined;
  if (operation === 'figure.offer') {
    const offer = offerFigure(data.plan, Date.now(), pending);
    return { files: { [data.offerPath]: json(offer) }, data: { offer, plan: data.plan } };
  }
  const choice = operation === 'figure.fallback' ? fallback(root, params, expected, data)
    : chooseFigure(data.plan, data.capabilities, params.mode, params.backend, params.decision_reference,
      params.mode === 'timeout' ? pending : undefined, data.previous);
  const formats = figureFormats(choice.backend, data.spec.formats);
  const changed = choice.backend !== data.spec.backend || JSON.stringify(formats) !== JSON.stringify(data.spec.formats);
  const nextSpec = changed ? json({ ...data.spec, backend: choice.backend, formats }) : data.specText;
  if (JSON.stringify(formats) !== JSON.stringify(data.spec.formats)) choice.reasons.push(`Output formats adjusted for ${choice.backend}: ${formats.join(', ')}`);
  choice.spec_digest = digest(nextSpec);
  const saved = { ...choice, main_digest: data.mainDigest };
  return { files: { [data.choicePath]: json(saved), [params.spec_path as string]: nextSpec,
    ...(existsSync(projectFile(root, data.offerPath)) ? { [data.offerPath]: null } : {}) }, data: saved };
}

/** A host-reported local failure permits one SVG fallback, never an external retry. */
function fallback(root: string, params: Record<string, unknown>, expected: Preconditions, data: ReturnType<typeof load>): FigureChoice {
  const selected = assertFigureSelection(root, params.spec_path as string, expected);
  if (selected.execution !== 'local' || selected.backend === 'svg' || selected.source === 'failure_default'
    || data.capabilities.backends.svg.status !== 'available') throw new ProjectError('RENDER_FAILED', 'Automatic local fallback unavailable; stop this figure and report the failure');
  const path = `${data.base}/render-failure.json`;
  if (params.failure_path !== path) throw new ProjectError('INVALID_INPUT', 'Use the canonical render-failure.json path');
  requiredInput(expected, path);
  const failure = JSON.parse(readFileSync(projectFile(root, path), 'utf8'));
  if (!failure || typeof failure !== 'object' || Array.isArray(failure)) throw new ProjectError('INVALID_INPUT', 'Local failure evidence must be an object');
  const start = Date.parse(failure.started_at), end = Date.parse(failure.finished_at), deadline = Date.parse(failure.deadline_at);
  if (failure.schema_version !== 1 || failure.figure_id !== selected.figure_id || failure.backend !== selected.backend
    || failure.selection_digest !== digest(readFileSync(projectFile(root, data.choicePath))) || failure.spec_digest !== selected.spec_digest
    || failure.main_digest !== selected.main_digest || failure.execution !== 'local' || failure.tool !== data.capabilities.backends[selected.backend].tool
    || typeof failure.evidence !== 'string' || !failure.evidence.trim() || !['failed', 'timeout'].includes(failure.outcome)
    || !Number.isFinite(start) || !Number.isFinite(end) || end < start || end > Date.now()
    || start < Date.parse(selected.revalidated_at ?? selected.selected_at) || deadline !== start + FIGURE_RENDER_TIMEOUT_MS
    || failure.outcome === 'timeout' && end < deadline) throw new ProjectError('INVALID_INPUT', 'Record the actual local failure with current input/choice hashes and a 60-second deadline');
  const choice = chooseFigure(data.plan, data.capabilities, 'user', 'svg', 'system fallback');
  return { ...choice, source: 'failure_default', decision_reference: null, failure_reference: path,
    failure_digest: digest(readFileSync(projectFile(root, path))),
    reasons: [...choice.reasons, `Local ${selected.backend} ${failure.outcome}; one direct SVG fallback, no automatic retries`] };
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
