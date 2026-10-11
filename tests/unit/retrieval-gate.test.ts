import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'child_process';
import { formatReport, runJsonCheck } from '../../src/core/init-checker.js';

vi.mock('child_process', () => ({ execSync: vi.fn() }));
let workspace: string;
beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'omp-retrieval-'));
  vi.mocked(execSync).mockImplementation(() => 'v22.0.0');
});
afterEach(() => { rmSync(workspace, { recursive: true, force: true }); vi.resetAllMocks(); });
function configure(servers: Record<string, unknown>) {
  writeFileSync(join(workspace, 'codex.json'), JSON.stringify({ mcpServers: servers }));
}
function report(consent?: string) {
  return runJsonCheck({ workspaceDir: workspace, host: 'codex', degradedRetrievalConsent: consent });
}

it.each([undefined, 'user accepted academic limitations'])('blocks zero sources even with consent=%s', consent => {
  const result = report(consent);
  expect(result).toMatchObject({ ready: false, retrievalCoverage: 'none', configuredCount: 0,
    blockingCount: 1, warningCount: 5, mcpVerification: 'configuration_only',
    degradedRetrieval: { accepted: false } });
  expect(result.summary).toContain('检索能力缺失');
  expect(result.results.find(r => r.name === 'retrieval-coverage')).toMatchObject({ status: 'missing', blocking: true });
  expect(result.results.filter(r => r.status === 'warning')).toHaveLength(result.warningCount);
});

it.each([
  { unrelated: { command: 'other-search' } },
  { google_scholar: null },
  { uspto_patent: { command: 'fixture', enabled: false } },
  { google_scholar: [] },
  { google_scholar: 'fixture' },
])('does not count unrelated, disabled or non-object entries: %j', servers => {
  configure(servers);
  expect(report()).toMatchObject({ ready: false, configuredCount: 0, retrievalCoverage: 'none' });
});

it('blocks unreadable or invalid configuration as zero coverage', () => {
  writeFileSync(join(workspace, 'codex.json'), '{invalid');
  expect(report()).toMatchObject({ ready: false, retrievalCoverage: 'none' });
});

it.each(['google_scholar', 'semantic_scholar'])('requires explicit acceptance for %s only', id => {
  configure({ [id]: { command: 'fixture' } });
  expect(report()).toMatchObject({ ready: false, retrievalCoverage: 'fallback_only', blockingCount: 1,
    degradedRetrieval: { requested: false, accepted: false, reason: null } });
  expect(report('  ')).toMatchObject({ ready: false, degradedRetrieval: { accepted: false } });
  const accepted = report('  user decision #7  ');
  expect(accepted).toMatchObject({ ready: true, blockingCount: 0, configuredCount: 1,
    retrievalCoverage: 'fallback_only', degradedRetrieval: { requested: true, accepted: true, reason: 'user decision #7' } });
  expect(accepted.degradedRetrieval.limitation).toContain('缺少专业专利库覆盖');
  expect(formatReport(accepted)).toContain('user decision #7');
  expect(report().ready).toBe(false); // Consent is invocation-scoped, never persisted globally.
});

it('still requires consent when both academic fallback sources are configured', () => {
  configure({ google_scholar: {}, semantic_scholar: {} });
  expect(report()).toMatchObject({ ready: false, retrievalCoverage: 'fallback_only', configuredCount: 2 });
});

it.each(['patsnap_search', 'uspto_patent', 'cnipa_patent'])('passes with %s without requiring Google Scholar', id => {
  configure({ [id]: { command: 'fixture' } });
  const result = report();
  expect(result).toMatchObject({ ready: true, blockingCount: 0, warningCount: 4,
    retrievalCoverage: 'professional', configuredCount: 1, degradedRetrieval: { accepted: false } });
  expect(result.mcpStatuses.find(s => s.id === id)).toMatchObject({ configured: true, retrievalRole: 'professional' });
  expect(result.mcpStatuses.find(s => s.id === 'google_scholar')?.priority).toBe('recommended');
});

it('passes mixed coverage and does not record an academic downgrade as accepted', () => {
  configure({ google_scholar: {}, cnipa_patent: {} });
  expect(report('decision')).toMatchObject({ ready: true, retrievalCoverage: 'professional', configuredCount: 2,
    degradedRetrieval: { requested: true, accepted: false, limitation: null } });
});

it.each(['mmdc --version', 'git --version', 'node --version'])('consent cannot waive missing %s', command => {
  configure({ google_scholar: {} });
  vi.mocked(execSync).mockImplementation(input => { if (input === command) throw new Error('missing'); return 'v22.0.0'; });
  expect(report('user decision')).toMatchObject({ ready: false, blockingCount: 1,
    degradedRetrieval: { accepted: true }, retrievalCoverage: 'fallback_only' });
});
