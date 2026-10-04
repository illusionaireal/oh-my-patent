# Runtime interface 1

Prerequisite: Node.js >=22. No npm install/global package needed in the copied Skill.
Smoke check: `node "<skill-directory>/scripts/runtime.mjs" --doctor`.
Call with stdin or `--input <request.json>`. stdout is exactly one JSON envelope.
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

Input digests are SHA-256 over exact file bytes, including raster images. Registration
requires spec/result/MAIN digests and a source digest when source_path is supplied.
An imagegen handoff additionally requires payload_path (the complete approved payload
preview), provider, consent_reference under `.patent/disclosures/consents/` and an
acknowledged disclosure_reference under `.patent/disclosures/events/`; hash all three.
The saved event must match the consent's payload, recipient, purpose, tool, operation
and approval period. This validates saved evidence, not the host tool's execution.

For DONE with no figures, pass figures_not_required=true and human_decision=true.
To omit an optional figure, pass omitted_figures=[{figure_id,reason}], the specification
digest and human_decision=true. Required figures cannot be omitted. The runtime saves
the final decision under `.patent/decisions/<operation_id>.json` for later inspection.

Installing this optional Skill leaves original plugin files and project state intact.
An unmigrated plugin project can continue with its existing CLI. Migration is a separate
explicit operation; after migration use this runtime for the project, not old writers.
