import { expect, it } from 'vitest';
// Evaluation tooling is a standalone Node script, deliberately outside the runtime bundle.
// @ts-expect-error Standalone maintainer script has no TypeScript declaration.
import { buildPlan, summarizeRuns } from '../../evals/skill/evaluation.mjs';
it('expands the approved first-wave matrix into 420 distinct runs', () => {
  const cases = buildPlan();
  expect(cases).toHaveLength(420);
  const counts: Record<string, number> = {};
  for (const item of cases) counts[item.group] = (counts[item.group] ?? 0) + 1;
  expect(counts).toEqual({ positive: 108, negative: 108, safety: 108, workflow: 18, figures: 72, resume: 6 });
});
it('keeps unexecuted cases unverified and does not certify from an empty ledger', () => {
  const summary = summarizeRuns([], 'a'.repeat(64), '.');
  expect(summary).toMatchObject({ passed: 0, total: 420, all_cases_passed: false, release_ready: false });
});
it('does not accept a pass without evidence and retains failed attempts', () => {
  const base = { case_id: buildPlan()[0].case_id, host: buildPlan()[0].host, attempt_id: 'first', candidate_digest: 'a'.repeat(64) };
  expect(() => summarizeRuns([{ ...base, result: 'passed' }], base.candidate_digest, '.')).toThrow('needs');
  const summary = summarizeRuns([{ ...base, result: 'failed', failure: 'unconsented egress', zero_tolerance: true }], base.candidate_digest, '.');
  expect(summary.failure_history).toHaveLength(1); expect(summary.passed).toBe(0);
});
