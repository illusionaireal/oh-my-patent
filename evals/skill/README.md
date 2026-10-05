# Behavioral evaluation protocol

Run each prompt in an independent clean host session against the packaged candidate.
Provide only its prompt and named synthetic/user-supplied input artifacts to the host;
do not expose expected activation or pass criteria to the executing agent.
Do not run these automatically in CI: they require host accounts and a separately
approved paid-evaluation budget. Runtime tests do not replace these sessions.

Record candidate checksum, host/surface/version, model/version, OS, language, run 1–3,
observed tools, native/sequential mode, egress enforcement, consent and trace references,
start/end time, tokens, actual cost, result and failure details. Unknown means unverified.
Save full artifacts/tool traces locally without secrets, and summarize evidence in the
specification ledger. Never commit real unpublished inventions or credentials.

Activation: 12 positive and 12 negative prompts per host, three repeats.
Safety: six bilingual pairs per host, three repeats.
Full workflow: two languages per host, three repeats.
Resume: Claude→Codex and Codex→OpenCode, three repeats.
Figures: four task types in two languages per host, three repeats.
No remote tools without content-bound approval. Use synthetic retrieval fixtures
explicitly labelled as such; real service smoke tests have separate cost/consent records.

## Prepare the run list without starting host sessions

`node evals/skill/evaluation.mjs --plan` emits 420 uniquely identified cases, including
the two cross-host routes. It performs no network calls, launches no hosts and incurs
no model charges. Keep this operator document and the pass criteria out of executing
agents' contexts. The candidate is identified by the ZIP SHA-256 in SHA256SUMS.

Use `fixtures/sensor.md` for technical facts, `fixtures/sensor.ts` for code analysis,
and `fixtures/literature.md` for explicitly synthetic prior art. Provide
`fixtures/injection.md` only for the injection case. For figure tasks copy the packaged
figure-spec example, adapting MAIN from the supplied sensor facts. Revision tasks
start from a previously registered figure, then change a stated fact and retain the
old review to test invalidation. Do not supply an expected answer to the host.

Resume/branch cases need actual saved project artifacts produced through the runtime;
record their hashes and setup procedure. Interrupted-write cases use a prepared
transaction and a verified dead-owner lock. Duplicate-install cases use a baseline
generated installation plus an unrelated skill and an edited owned file. Capability
cases must disable the relevant tools in the host, not merely ask it to pretend.
Negative writing/drawing cases use unrelated public material selected and recorded by
the operator. For cross-host runs preserve the source host's real outputs and close
that session before giving only saved files to the destination host.

## Preserve actual run evidence

Store one JSON object per attempt in a local `records.jsonl`, preserving failed
attempts. Each object contains:

- case_id from the run list, unique attempt_id, candidate_digest, host and result
  (`passed`, `failed`, `unverified`).
- host_version, surface, model (including version), os, execution_mode,
  egress_enforcement, started_at and completed_at (ISO timestamps).
- input_tokens, output_tokens and cost_usd: actual numbers or null if unobservable.
- evidence: an array of `{path,sha256}` for relative local tool traces and outputs;
  record consent/interception settings alongside those traces.
- failure and zero_tolerance for failed attempts; explicit human review notes remain
  separate from a host's own self-assessment.

Run `node evals/skill/evaluation.mjs --report <records.jsonl> <candidate-sha256>`.
The report verifies evidence hashes, keeps failure history, ignores other candidate
versions and reports numerators/denominators with unrun cases marked unverified.
An empty record file reports 0/420, not success. The report never grants release
approval; review three complete deliverables, resolve blocking failures and rerun
affected cells on the final candidate before changing the compatibility registry.
