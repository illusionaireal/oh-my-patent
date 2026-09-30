// Smoke: node evals/skill/evaluation.mjs --plan
// This prepares/aggregates records only; it never launches a host or paid service.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const directory = dirname(fileURLToPath(import.meta.url));
const scenarios = JSON.parse(readFileSync(join(directory, 'scenarios.json'), 'utf8'));

export function buildPlan() {
  const cases = [];
  for (const scenario of scenarios.scenarios) for (const host of scenarios.wave1_hosts) for (let repeat = 1; repeat <= scenario.repeats; repeat++) {
    cases.push({ case_id: `${scenario.id}--${host}--${repeat}`, scenario: scenario.id, group: scenario.group, language: scenario.language, host, repeat, prompt: scenario.prompt });
  }
  for (const route of scenarios.resume_routes) for (let repeat = 1; repeat <= route.repeats; repeat++) {
    cases.push({ case_id: `resume--${route.from}--${route.to}--${repeat}`, scenario: `${route.from}-to-${route.to}`, group: 'resume', host: route.to, source_host: route.from, language: 'recorded-project', repeat });
  }
  if (new Set(cases.map(item => item.case_id)).size !== cases.length) throw new Error('Duplicate evaluation case');
  return cases;
}

export function summarizeRuns(records, candidateDigest, evidenceRoot) {
  if (!/^[a-f0-9]{64}$/.test(candidateDigest)) throw new Error('An exact candidate SHA-256 is required');
  const plan = buildPlan();
  const known = new Map(plan.map(item => [item.case_id, item]));
  const results = new Map(), attempts = new Set(), failures = [];
  for (const record of records) {
    if (!known.has(record.case_id) || !record.attempt_id || attempts.has(record.attempt_id)) throw new Error('Unknown case or duplicate attempt ID');
    attempts.add(record.attempt_id);
    if (record.candidate_digest !== candidateDigest) continue;
    if (!['passed', 'failed', 'unverified'].includes(record.result)) throw new Error('Invalid evaluation result');
    if (record.result === 'failed') failures.push({ case_id: record.case_id, attempt_id: record.attempt_id, failure: record.failure ?? 'unspecified', zero_tolerance: record.zero_tolerance === true });
    if (record.result === 'passed') {
      if (record.host !== known.get(record.case_id).host || record.zero_tolerance === true) throw new Error('Passed run has a host mismatch or blocking failure');
      for (const key of ['host_version', 'surface', 'model', 'os', 'execution_mode', 'egress_enforcement', 'started_at', 'completed_at']) if (typeof record[key] !== 'string' || !record[key]) throw new Error(`Passed run needs ${key}`);
      if (!(Date.parse(record.completed_at) >= Date.parse(record.started_at))) throw new Error('Invalid run timestamps');
      for (const key of ['input_tokens', 'output_tokens', 'cost_usd']) if (record[key] !== null && !(typeof record[key] === 'number' && Number.isFinite(record[key]) && record[key] >= 0)) throw new Error(`Record actual ${key} or null when unknown`);
      if (!Array.isArray(record.evidence) || !record.evidence.length) throw new Error('Passed run needs evidence');
      for (const entry of record.evidence) {
        if (typeof entry.path !== 'string' || !entry.path || /^[\\/]|:|(^|[\\/])\.\.([\\/]|$)/.test(entry.path)) throw new Error('Evidence path must be local and relative');
        const file = resolve(evidenceRoot, entry.path);
        if (!existsSync(file) || createHash('sha256').update(readFileSync(file)).digest('hex') !== entry.sha256) throw new Error('Missing or changed evaluation evidence');
      }
    }
    results.set(record.case_id, record.result);
  }
  const groups = {};
  for (const item of plan) {
    const group = groups[item.group] ??= { passed: 0, failed: 0, unverified: 0, total: 0 };
    group.total++; group[results.get(item.case_id) ?? 'unverified']++;
  }
  const passed = Object.values(groups).reduce((sum, item) => sum + item.passed, 0);
  return { candidate_digest: candidateDigest, passed, total: plan.length, groups, failure_history: failures, all_cases_passed: passed === plan.length, release_ready: false, remaining_review: 'Human review of at least three complete deliverables and adjudication of failure history are separate gates.' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, input, checksum] = process.argv.slice(2);
  if (mode === '--plan') console.log(JSON.stringify({ paid_sessions_started: 0, cases: buildPlan() }, null, 2));
  else if (mode === '--report' && input && checksum) {
    const records = readFileSync(input, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
    console.log(JSON.stringify(summarizeRuns(records, checksum, dirname(resolve(input))), null, 2));
  } else throw new Error('Use --plan or --report <records.jsonl> <candidate-sha256>');
}
