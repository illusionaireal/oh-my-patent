---
name: brainstorm-path
description: Use when recording, querying, branching or restoring patent brainstorm decision paths.
---

# Brainstorm decision paths

Use the installed scripts/runtime.mjs JSON interface. The package owns its runtime;
no source checkout, global CLI or dist directory is required. Never hand-write formal
state/path files. The main orchestrator commits; subagents return independent artifacts.

Requests include interface_version=1, operation, explicit project, params; writes also
include operation_id and expected.revision/state_digest. Input artifact hashes belong
in expected.inputs. Use stdin or a JSON file, not shell-interpolated invention text.

- project.create initializes state and path together; require expected.revision=null.
- path.record takes params.node. The next round and round-N ID must be consecutive.
- path.query returns the saved path and associated node/branch records.
- path.branch takes node_id and reason, preserving the original path and copied snapshots.
- path.restore takes node_id and innovation_id; only abandoned innovations can be restored.

A node records id, round, agentOutputs, innovations, scores, decision and timestamp.
agentOutputs identify real saved role outputs using project-relative outputFile paths.
Innovations retain stable IDs, title, problem, coreSolution, differences and status.
Scores record innovationId, novelty, creativity, practicality, businessValue and weightedScore.
Decision records action PASS/ITERATE/REJECT, reason and recommendations. Scores are internal
screening signals, never grant probabilities. An empty initial round has empty arrays and
an ITERATE decision; do not fabricate completed reviews or search evidence.

Identical retries return the committed result; changing input requires a new operation ID.
A stale revision or lock is an error to inspect, not permission to overwrite or delete.
Migration is explicit, with a dry-run and exact backup; future schema is read-only.
After migration, old CLI path writers are unsupported. Read actual state on host resume;
private chat history from another tool is not a persisted artifact.
