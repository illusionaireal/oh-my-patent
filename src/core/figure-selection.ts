/** Figure planning and system defaults. Smoke: npm test tests/unit/figure-selection.test.ts */
import { ProjectError, digest } from './project-store.js';
import type { FigureSpecification } from './figures.js';
import type { ProjectConfig } from './project-config.js';

export const FIGURE_BACKENDS = ['svg', 'mermaid', 'plantuml', 'imagegen'] as const;
export type FigureBackend = typeof FIGURE_BACKENDS[number];
export const FIGURE_CHOICE_TIMEOUT_MS = 30_000;
export const FIGURE_CAPABILITY_MAX_AGE_MS = 30 * 60_000;
export const FIGURE_RENDER_TIMEOUT_MS = 60_000;
export interface CapabilityObservation {
  status: 'available' | 'unavailable' | 'unknown'; tool: string | null; evidence: string;
}
export interface FigureCapabilities {
  schema_version: 1; host: string; session_id: string; observed_at: string;
  backends: Record<FigureBackend, CapabilityObservation & { execution: 'local' | 'remote' }>;
  preview: CapabilityObservation; timed_selection: CapabilityObservation;
}
export interface FigureChoice {
  schema_version: 1; figure_id: string; status: 'selected'; backend: FigureBackend;
  execution: 'local' | 'remote'; source: 'user' | 'timeout_default' | 'immediate_default' | 'failure_default'; decision_reference: string | null;
  failure_reference?: string;
  failure_digest?: string;
  selected_at: string; revalidated_at?: string; capabilities_digest: string; spec_digest: string;
  host: string; session_id: string; review_ready: boolean; reasons: string[];
}
export interface FigurePlan {
  figure_id: string; preferred_backend: ProjectConfig['figures']['preferredBackend'];
  default_backend: FigureBackend | null; reusable_backend: FigureBackend | null;
  candidates: Array<{ backend: FigureBackend; available: boolean; execution: 'local' | 'remote'; reason: string }>;
  review_ready: boolean; timed_selection: boolean; timeout_ms: number;
  verification: 'host_reported'; capabilities_digest: string; fingerprint: string; reasons: string[];
  refresh_before_offer: boolean;
}
export interface FigureOffer {
  schema_version: 1; figure_id: string; status: 'offered'; offered_at: string;
  deadline_at: string; fingerprint: string;
}
const text = (value: unknown): value is string => typeof value === 'string' && !!value.trim();

/** Bind review to the chosen execution boundary and content, not observation timestamps. */
export function selectionReviewDigest(choice: FigureChoice & { main_digest?: string }): string {
  return digest(JSON.stringify({ figure_id: choice.figure_id, backend: choice.backend,
    execution: choice.execution, spec_digest: choice.spec_digest, main_digest: choice.main_digest }));
}

/** Keep only formats the selected backend produces; choose its native default if needed. */
export function figureFormats(backend: FigureBackend, formats: string[]): string[] {
  const supported = backend === 'svg' ? ['svg'] : backend === 'imagegen' ? ['png', 'jpg', 'webp'] : ['svg', 'png'];
  const compatible = [...new Set(formats.filter(format => supported.includes(format)))];
  return compatible.length ? compatible : [supported[0]];
}

/** This validates host-reported observations, not the host's tool execution itself. */
export function validateFigureCapabilities(input: unknown, now = Date.now()): FigureCapabilities {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ProjectError('INVALID_INPUT', 'Figure capability observations required');
  const c = input as FigureCapabilities;
  const age = now - Date.parse(c.observed_at);
  if (c.schema_version !== 1 || !text(c.host) || !text(c.session_id) || !Number.isFinite(age) || age < 0 || age > FIGURE_CAPABILITY_MAX_AGE_MS) throw new ProjectError('MISSING_CAPABILITY', 'Refresh figure observations for the active host/session (maximum age 30 minutes)');
  const observation = (o: CapabilityObservation): void => {
    if (!o || !['available', 'unavailable', 'unknown'].includes(o.status) || !text(o.evidence)
      || !(o.tool === null || text(o.tool)) || o.status === 'available' && !text(o.tool)) throw new ProjectError('INVALID_INPUT', 'Record status, actual tool and observation evidence');
  };
  if (!c.backends || typeof c.backends !== 'object' || Object.keys(c.backends).some(k => !FIGURE_BACKENDS.includes(k as FigureBackend))) throw new ProjectError('INVALID_INPUT', 'Invalid backend observations');
  for (const backend of FIGURE_BACKENDS) {
    const o = c.backends[backend]; observation(o);
    if (!['local', 'remote'].includes(o.execution) || ['svg', 'mermaid'].includes(backend) && o.execution !== 'local'
      || backend === 'imagegen' && o.execution !== 'remote') throw new ProjectError('INVALID_INPUT', 'Invalid backend execution boundary');
  }
  observation(c.preview); observation(c.timed_selection);
  return c;
}

export function planFigure(spec: FigureSpecification, specDigest: string, config: ProjectConfig,
  capabilities: FigureCapabilities, capabilitiesDigest: string, previous?: FigureChoice): FigurePlan {
  const candidates = FIGURE_BACKENDS.map(backend => ({ backend,
    available: capabilities.backends[backend].status === 'available', execution: capabilities.backends[backend].execution,
    reason: capabilities.backends[backend].evidence }));
  const isLocalReady = (backend: FigureBackend): boolean => candidates.some(c => c.backend === backend && c.available && c.execution === 'local');
  const reusable = previous?.status === 'selected' && FIGURE_BACKENDS.includes(previous.backend) && isLocalReady(previous.backend)
    ? previous.backend : null;
  const preferred = config.figures.preferredBackend;
  const preferredLocal = preferred !== 'auto' && isLocalReady(preferred) ? preferred : null;
  const defaultBackend = reusable ?? preferredLocal ?? FIGURE_BACKENDS.find(isLocalReady) ?? null;
  const reasons: string[] = [];
  if (preferred !== 'auto' && !preferredLocal && reusable === null) reasons.push(`Preferred ${preferred} is unavailable or requires scoped external approval; choosing an available local default`);
  if (previous && reusable === null) reasons.push('Saved backend is unavailable or remote; fresh selection required');
  if (!defaultBackend) reasons.push('No available local default; choose/configure a backend before drawing this figure');
  if (capabilities.preview.status !== 'available') reasons.push('Preview unavailable or unknown; draft allowed, visual review remains pending');
  return { figure_id: spec.figure_id, preferred_backend: preferred, default_backend: defaultBackend, reusable_backend: reusable,
    candidates, review_ready: capabilities.preview.status === 'available', timed_selection: capabilities.timed_selection.status === 'available',
    timeout_ms: FIGURE_CHOICE_TIMEOUT_MS, verification: 'host_reported', capabilities_digest: capabilitiesDigest,
    // Availability is re-evaluated at expiry. Observation refresh must not restart the UI clock.
    fingerprint: digest(JSON.stringify({ specDigest, preferred, previous: previous?.backend ?? null,
      host: capabilities.host, session: capabilities.session_id })), reasons,
    refresh_before_offer: Date.now() - Date.parse(capabilities.observed_at) > FIGURE_CAPABILITY_MAX_AGE_MS - FIGURE_CHOICE_TIMEOUT_MS };
}

export function offerFigure(plan: FigurePlan, now = Date.now(), previous?: FigureOffer): FigureOffer {
  if (!plan.timed_selection) throw new ProjectError('MISSING_CAPABILITY', 'Host has no observed timed selection; use immediate default');
  if (previous?.schema_version === 1 && previous.status === 'offered' && previous.figure_id === plan.figure_id
    && previous.fingerprint === plan.fingerprint && Number.isFinite(Date.parse(previous.offered_at))
    && Date.parse(previous.deadline_at) === Date.parse(previous.offered_at) + FIGURE_CHOICE_TIMEOUT_MS) return previous;
  if (plan.refresh_before_offer) throw new ProjectError('MISSING_CAPABILITY', 'Refresh observations before starting the 30-second choice window');
  return { schema_version: 1, figure_id: plan.figure_id, status: 'offered', offered_at: new Date(now).toISOString(),
    deadline_at: new Date(now + FIGURE_CHOICE_TIMEOUT_MS).toISOString(), fingerprint: plan.fingerprint };
}

/** Timeout consumes a real persisted offer; an immediate default never claims a timeout. */
export function chooseFigure(plan: FigurePlan, capabilities: FigureCapabilities, mode: unknown,
  backend: unknown, decisionReference: unknown, offer?: FigureOffer, previous?: FigureChoice, now = Date.now()): FigureChoice {
  let selected: FigureBackend | null;
  let source: FigureChoice['source'];
  let reference: string | null = null;
  if (mode === 'user') {
    if (!FIGURE_BACKENDS.includes(backend as FigureBackend) || !text(decisionReference)) throw new ProjectError('INVALID_INPUT', 'User selection needs backend and decision_reference');
    selected = backend as FigureBackend; source = 'user'; reference = decisionReference;
  } else if (mode === 'timeout') {
    if (!offer || offer.status !== 'offered' || offer.figure_id !== plan.figure_id || offer.fingerprint !== plan.fingerprint) throw new ProjectError('CONFLICT', 'Offer is absent or changed; refresh the plan');
    const start = Date.parse(offer.offered_at), deadline = Date.parse(offer.deadline_at);
    if (offer.schema_version !== 1 || !Number.isFinite(start) || deadline !== start + FIGURE_CHOICE_TIMEOUT_MS || now < deadline) throw new ProjectError('INVALID_INPUT', 'The observed 30-second choice window has not expired');
    selected = plan.default_backend; source = 'timeout_default';
  } else if (mode === 'default') {
    if (plan.timed_selection) throw new ProjectError('INVALID_INPUT', 'Timed host requires an offer/timeout or a user selection');
    selected = plan.default_backend; source = 'immediate_default';
  } else if (mode === 'reuse') {
    if (!previous || !plan.reusable_backend) throw new ProjectError('MISSING_CAPABILITY', 'Saved choice cannot execute; refresh selection');
    selected = plan.reusable_backend; source = previous.source; reference = previous.decision_reference;
  } else throw new ProjectError('INVALID_INPUT', 'Use selection mode user, timeout, default or reuse');
  if (!selected || !plan.candidates.some(c => c.backend === selected && c.available)) throw new ProjectError('MISSING_CAPABILITY', 'Selected/default backend is not available; configure a tool or choose another backend');
  return { schema_version: 1, figure_id: plan.figure_id, status: 'selected', backend: selected, execution: capabilities.backends[selected].execution, source,
    decision_reference: reference, selected_at: mode === 'reuse' ? previous!.selected_at : new Date(now).toISOString(),
    ...(mode === 'reuse' && previous?.failure_reference ? { failure_reference: previous.failure_reference, failure_digest: previous.failure_digest } : {}),
    ...(mode === 'reuse' ? { revalidated_at: new Date(now).toISOString() } : {}), capabilities_digest: plan.capabilities_digest,
    spec_digest: '', host: capabilities.host, session_id: capabilities.session_id, review_ready: plan.review_ready, reasons: plan.reasons };
}
