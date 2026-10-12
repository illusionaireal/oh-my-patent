import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DEFAULT_PROJECT_CONFIG } from '../../src/core/project-config.js';
import { chooseFigure, offerFigure, planFigure, validateFigureCapabilities, FIGURE_CHOICE_TIMEOUT_MS } from '../../src/core/figure-selection.js';
import { capabilityFixture } from '../figure-selection-fixture.js';

const spec = JSON.parse(readFileSync('src/skill-entry/assets/figure-spec.example.json', 'utf8'));
it('defaults to direct SVG and reads a ready local preference', () => {
  const caps = capabilityFixture();
  expect(planFigure(spec, 'spec', DEFAULT_PROJECT_CONFIG, caps, 'caps').default_backend).toBe('svg');
  expect(planFigure(spec, 'spec', { ...DEFAULT_PROJECT_CONFIG, figures: { preferredBackend: 'mermaid' } }, caps, 'caps').default_backend).toBe('mermaid');
});
it.each(['imagegen', 'plantuml'] as const)('does not default to remote %s even when it is preferred and available', backend => {
  const plan = planFigure(spec, 'spec', { ...DEFAULT_PROJECT_CONFIG, figures: { preferredBackend: backend } }, capabilityFixture(), 'caps');
  expect(plan.default_backend).toBe('svg');
  expect(plan.reasons.join(' ')).toContain('scoped external approval');
});
it('falls back from an unavailable preference and blocks when no local backend can run', () => {
  const caps = capabilityFixture(); caps.backends.mermaid.status = 'unavailable';
  const config = { ...DEFAULT_PROJECT_CONFIG, figures: { preferredBackend: 'mermaid' as const } };
  expect(planFigure(spec, 'spec', config, caps, 'caps').default_backend).toBe('svg');
  caps.backends.svg.status = 'unknown';
  const plan = planFigure(spec, 'spec', config, caps, 'caps');
  expect(plan.default_backend).toBeNull();
  expect(() => chooseFigure(plan, caps, 'default', undefined, undefined)).toThrow(/not available/);
});
it('allows draft generation without preview but records review pending', () => {
  const caps = capabilityFixture(); caps.preview.status = 'unavailable';
  const plan = planFigure(spec, 'spec', DEFAULT_PROJECT_CONFIG, caps, 'caps');
  expect(chooseFigure(plan, caps, 'default', undefined, undefined)).toMatchObject({ backend: 'svg', review_ready: false,
    source: 'immediate_default', decision_reference: null });
});
it('requires a real offer deadline and labels the timeout default as a system decision', () => {
  const caps = capabilityFixture(true), start = Date.now();
  const plan = planFigure(spec, 'spec', DEFAULT_PROJECT_CONFIG, caps, 'caps');
  const offer = offerFigure(plan, start);
  expect(() => chooseFigure(plan, caps, 'timeout', undefined, undefined, offer, undefined, start + FIGURE_CHOICE_TIMEOUT_MS - 1)).toThrow(/not expired/);
  expect(chooseFigure(plan, caps, 'timeout', undefined, undefined, offer, undefined, start + FIGURE_CHOICE_TIMEOUT_MS))
    .toMatchObject({ backend: 'svg', source: 'timeout_default', decision_reference: null });
  expect(() => chooseFigure(plan, caps, 'default', undefined, undefined)).toThrow(/Timed host/);
  expect(() => chooseFigure({ ...plan, fingerprint: 'changed' }, caps, 'timeout', undefined, undefined, offer)).toThrow(/changed/);
});
it('does not fabricate timeout when timed interaction is absent', () => {
  const caps = capabilityFixture(), plan = planFigure(spec, 'spec', DEFAULT_PROJECT_CONFIG, caps, 'caps');
  expect(() => offerFigure(plan)).toThrow(/no observed timed/);
  expect(() => chooseFigure(plan, caps, 'timeout', undefined, undefined)).toThrow(/absent/);
  expect(chooseFigure(plan, caps, 'default', undefined, undefined).source).toBe('immediate_default');
});
it('requires an available explicit choice and a real decision reference', () => {
  const caps = capabilityFixture(), plan = planFigure(spec, 'spec', DEFAULT_PROJECT_CONFIG, caps, 'caps');
  expect(() => chooseFigure(plan, caps, 'user', 'svg', undefined)).toThrow(/decision_reference/);
  caps.backends.svg.status = 'unavailable';
  const next = planFigure(spec, 'spec', DEFAULT_PROJECT_CONFIG, caps, 'caps');
  expect(() => chooseFigure(next, caps, 'user', 'svg', 'decision')).toThrow(/not available/);
});
it('reuses an executable saved per-figure choice without claiming a new user decision', () => {
  const caps = capabilityFixture();
  const initial = planFigure(spec, 'spec', DEFAULT_PROJECT_CONFIG, caps, 'caps');
  const previous = chooseFigure(initial, caps, 'user', 'mermaid', 'decision #7');
  const plan = planFigure(spec, 'spec', DEFAULT_PROJECT_CONFIG, caps, 'caps-refreshed', previous);
  expect(chooseFigure(plan, caps, 'reuse', undefined, undefined, undefined, previous))
    .toMatchObject({ backend: 'mermaid', source: 'user', decision_reference: 'decision #7', capabilities_digest: 'caps-refreshed' });
  caps.backends.mermaid.status = 'unavailable';
  expect(planFigure(spec, 'spec', DEFAULT_PROJECT_CONFIG, caps, 'new', previous).default_backend).toBe('svg');
});
it('rejects stale, future and unsupported observations', () => {
  const caps = capabilityFixture(), now = Date.now();
  expect(validateFigureCapabilities(caps, now).schema_version).toBe(1);
  expect(() => validateFigureCapabilities({ ...caps, observed_at: new Date(now - 31 * 60_000).toISOString() }, now)).toThrow(/Refresh/);
  expect(() => validateFigureCapabilities({ ...caps, observed_at: new Date(now + 1000).toISOString() }, now)).toThrow(/Refresh/);
  expect(() => validateFigureCapabilities({ ...caps, preview: { status: 'available', tool: null, evidence: 'claim' } }, now)).toThrow(/actual tool/);
});
