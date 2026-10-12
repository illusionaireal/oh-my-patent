# Runtime interface 1

Prerequisite: Node.js >=22. No npm install/global package needed in the copied Skill.
Smoke check: `node "<skill-directory>/scripts/runtime.mjs" --doctor`.
Call with stdin or `--input <request.json>`. stdout is exactly one JSON envelope.
Installed plugins expose the same interface via `node "<installed-checker>" --runtime
--input <request.json>`; project paths resolve inside the installed workspace.
The npm CLI has the same interface: `oh-my-patent runtime --input <request.json>`.

Request fields: interface_version=1, operation, project (explicit root), params.
Mutations also require operation_id (letters/digits/underscore/hyphen, <=100),
expected.revision (null for creation), optional expected.state_digest, and
expected.inputs mapping project-relative input filenames to SHA-256 hashes.
Inputs are rechecked under lock. Figure registration and stage advancement require
input hashes. Keep the complete request when retrying; changed input needs a new ID.

| Operation | Parameters |
| --- | --- |
| version / doctor | No project required |
| project.create | topic, topic_slug, jurisdiction CN/US/PCT, outputLanguage auto/en/zh |
| project.inspect | Raw state and digest, including unknown schemas |
| project.validate / workflow.inspect | Current schema state validation |
| project.migrate | dry_run=true first; then false with revision=0 and current digest |
| project.recoverLock | owner_token; same-host dead owner only |
| workflow.advance | target, artifacts[], human_decision=true at direction/final gates; DONE needs current figure review or documented optional omissions |
| path.record | node with consecutive round and valid core node shape |
| path.query | Saved path and node files |
| path.branch | node_id, reason; isolated branch through existing core algorithm |
| path.restore | node_id, innovation_id; restores an abandoned innovation |
| figure.validateSpec | spec object |
| figure.validateSvg | path of SVG inside project |
| figure.plan | spec_path; optional workspace/figures config override; reads saved actual host observations |
| figure.offer | spec_path; persists a real 30-second deadline on a timed host |
| figure.select | spec_path, mode user/timeout/default/reuse; user mode needs backend and decision_reference |
| figure.fallback | spec_path, failure_path; one local renderer failure may switch to available direct SVG |
| figure.register | spec_path, result_path, tool, optional source_path, provider, model, review |
| figure.inspect | figure_id; stale hashes yield pending review |

Creation example (write this JSON to a file; replace the project path for the user):

```json
{"interface_version":1,"operation":"project.create","project":"projects/01-demo","operation_id":"create-demo","expected":{"revision":null},"params":{"topic":"Synthetic sensor system","topic_slug":"demo","jurisdiction":"CN","outputLanguage":"en"}}
```

Success: ok=true, data, artifacts, warnings. Mutation data contains result, revision,
state_digest. Failure: ok=false and error.code/message. Exit 0 success; 2 invalid
request/state/unknown operation; 3 conflict/lock/recovery; 4 missing file/capability;
5 disclosure/render error; 1 unexpected I/O. Preserve stderr diagnostics if any.

Never hand-edit state to bypass a failed operation. Local filesystem transactions keep
before/after bytes and committed results. Interrupted prepared transactions roll back
on the next coordinated mutation; lock left by a dead process needs explicit recovery.
Locks are never stolen by age. Keep journals/backups; directory fsync/power-loss durability
is not claimed. Do not use network filesystems or simultaneous uncoordinated writers.
Migration also normalizes saved role outputFile references in `.brainstorm` JSON and
retains exact backups of changed files. Missing or external references block migration;
the runtime never resolves an old path by guessing its basename.

Unknown operations, including planned but unimplemented operations, fail explicitly.
The legacy diagram CLI retains source-generation/local-rendering functions; it cannot
write migrated projects. Use direct SVG and registration for the portable figure path.

Before drawing, save fresh host/session observations to .patent/figure-capabilities.json
using assets/figure-capabilities.example.json. Replace every placeholder; available needs
actual tool/evidence, not configured names. Observations expire after 30 minutes.
figure.plan reads preferredBackend (task > project > workspace > defaults) and returns
host_reported candidates. Per-figure saved executable local choices take precedence;
otherwise the executable local preference, then SVG, then another local renderer.
Remote tools are never automatic defaults; choice is not content disclosure or budget approval.
Installed plugins automatically supply the workspace configuration context. Creation saves
the effective initial configuration; later task overrides take precedence over that saved
project configuration, which takes precedence over the workspace. Portable callers supply
workspace explicitly when they want to inherit its configuration.
On a timed host, figure.offer saves choice-offer.json, then figure.select mode=timeout
is accepted only after its actual 30-second deadline with unchanged spec/MAIN/preference
and host/session. Repeated offers retain that deadline. Observation timestamps, evidence
and candidate availability may refresh without restarting the clock; expiry selects the
currently available local default. Refresh before offering when refresh_before_offer=true.
If observations expire during interruption, refresh them and consume the original offer;
never use stale observations or claim a new choice window elapsed. Without a
real timed host interaction, mode=default selects immediately (immediate_default).
Mode=user records a supplied real decision reference; mode=reuse revalidates an existing
local choice without manufacturing a new decision. Saved selection.json records source,
capability/spec/MAIN hashes, host/session, limitations and review readiness. Select updates
spec.backend and compatible output formats atomically (SVG: svg; renderers: svg/png;
image tools: png/jpg/webp). Unavailable choices block the affected figure. Per-figure sources
can differ. Refresh observations on resume; reselect/reuse to update the binding.

Selection mutations need current spec/MAIN/capability/config (if present), prior selection
and pending offer (if present) digests. New figure.register needs a current selection and
capability digests. DIAGRAM_DRAFT checks required selected paths; DIAGRAM_FINAL additionally
requires preview. Missing preview permits drafting, not a passing visual review. Existing
registered legacy figures remain inspectable; unregistered figures need selection.

Input digests are SHA-256 over exact file bytes, including raster images. Registration
requires spec/result/MAIN digests and a source digest when source_path is supplied.
A remote imagegen/PlantUML handoff additionally requires payload_path (the complete approved payload
preview), provider, consent_reference under `.patent/disclosures/consents/` and an
acknowledged disclosure_reference under `.patent/disclosures/events/`; hash all three.
The saved event must match the consent's payload, recipient, purpose, tool, operation
and approval period. This validates saved evidence, not the host tool's execution.

Registration retains the full selection digest for audit and a separate content/execution
digest for review freshness. Reuse after observation/session refresh preserves passed
review when backend/execution/spec/MAIN/source/result are unchanged. Older provenance
without the separate digest keeps its original conservative full-selection hash check.

Local renderer calls have a 60-second host-enforced deadline and no automatic retry.
Persist figures/<id>/render-failure.json with schema_version=1, figure_id, backend,
execution=local, tool, evidence, outcome=failed/timeout, started_at, finished_at,
deadline_at (start+60 seconds), selection_digest, spec_digest, main_digest. Capture start
before the actual call and hash the complete current selection. After observed failure,
figure.fallback requires that file's expected digest plus the usual selection inputs;
it switches once to available SVG with source=failure_default and no human decision claim.
An SVG failure, unavailable SVG or remote failure stops that figure and reports the
limitation. Do not loop or restart a renderer automatically; explicit repair/reselection
starts a new user-directed attempt. A host lacking bounded local execution uses direct
SVG. Runtime validates saved evidence/deadlines; it does not run/cancel host tools or
certify that they were called. Remote consent/attempt/ledger rules still apply separately.

For DONE with no figures, pass figures_not_required=true and human_decision=true.
To omit an optional figure, pass omitted_figures=[{figure_id,reason}], the specification
digest and human_decision=true. Required figures cannot be omitted. The runtime saves
the final decision under `.patent/decisions/<operation_id>.json` for later inspection.

Installing this optional Skill leaves original plugin files and project state intact.
An unmigrated plugin project can continue with its existing CLI. Migration is a separate
explicit operation; after migration use this runtime for the project, not old writers.
