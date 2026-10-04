# Plugin and optional Skill distribution contract

Implementation baseline: `fc40901943e2ffb742167ea4848de7a0c321b77e` (0.3.3).
Source: the 2026-09-30 execution plan, corrected by the user on 2026-10-04 to add
Skill mode alongside the original plugin. This specification records implementation
decisions; it does not certify host behavior or a release.

## Boundaries

The original Archimedes plugin remains the default: 14 agents, 6 skills, 9 commands,
existing adapters and original prompts. `--mode plugin` selects it explicitly;
`--legacy` remains a compatibility alias. `--mode skill` opts into the additional
portable package. Neither installer takes ownership of the other mode.

The Skill mode provides one portable `oh-my-patent` Skill, Archimedes persona, English routing and bilingual
discovery, existing Chinese role sources. Resources resolve from the installation;
outputs resolve from the explicit project. Node 22 is required for persistence.
Skill mode adds no global rules files, nested agent CLIs, provider SDKs, or mandatory
network service. The runtime/figure/disclosure contract below describes Skill mode;
original plugin projects retain their existing CLI workflow until explicit migration.
Keep the ten existing stages and existing path algorithms. Independent search and
review tasks never fabricate completion of the full workflow.

Defaults retain CN and `projects/`; output language auto, figure backend auto.
Task options > project > workspace > bundled defaults. Configuration is not consent.

## Confidentiality

Treat unspecified material as unpublished. All content-bearing remote calls default
to denied, including search, render, image generation/editing, retries and redirects.
Before consent, show the exact local payload preview, recipient/provider and endpoint,
purpose, expiry and reuse scope. Consent binds SHA-256 of actual content and recipient;
changing either requires new consent. Keys, tool availability and generic requests
do not authorize disclosure. Subagents inherit restrictions and cannot grant consent.

Persist approval and attempted event before sending. If audit persistence fails,
do not send. Reject redirects; do not automatically retry ambiguous failures.
Events in `.patent/disclosures/` use operation IDs, consent references, tool, purpose,
recipient, UTC time, content digest/reference, and blocked/attempted/acknowledged/
uncertain outcomes; never raw invention content or credentials. Timeout is uncertain.
Runtime enforcement covers its own network operations. Host tools without an actual
permission interception layer are `instruction_only` and disabled in confidential
mode. Model-provider processing is a separate boundary, never described as local.

## State and machine interface

Interface version 1; schema version 1; package version independent. Missing schema is
legacy 0. Future schemas permit raw inspection only. Migration is explicit, supports
dry-run, validates before mutation, and retains an exact backup. Project root comes
from the request, persisted project.path becomes `.`. Relative artifacts reject
traversal, links, drive/UNC paths and alternate streams. An ambiguous external legacy
reference blocks migration; no basename guessing. Unmodified old binaries cannot be
constrained by this version and are unsupported after migration.

Requests use stdin or a JSON file, never invention text interpolated into shell code.
Each mutation requires an operation ID and expected revision/state digest; creation
requires expected state absent. stdout is one JSON object: ok, data, artifacts,
warnings, error {code,message}. stderr is diagnostic only. Exit 0 success, 2 invalid
input/unknown operation/state, 3 conflict/lock/recovery, 4 missing capability/file,
5 disclosure denied/render failed, 1 unexpected I/O/internal failure.

## Coordination and recovery

Only one project writer. Exclusive `.patent/write.lock` contains UUID owner token,
PID, hostname and acquisition UTC. Re-read state and input digests after locking.
Never steal by age; explicit recovery checks token, same host and dead owner.
Release only the matching token. Local trusted filesystems only; no distributed
lock or protection against hostile concurrent directory replacement is claimed.

Transaction records live under `.patent/transactions/<operation-id>/`. Record request
digest, before/after bytes, file digests, result, and status. Prepare all changes
before the durable journal; apply non-state files first, state last. A committed
journal is the commit point. Interrupted prepared transactions are rolled back before
new work; committed journals return the original result for an identical retry.
Same operation ID with different input fails. Recovery refuses files matching neither
before nor after digests. Journals/backups persist until explicit user maintenance;
no automatic time-based deletion. Directory fsync capability and filesystem limits
must be reported, not overstated as power-loss guarantees.

## Figures

Independent spec schema 1: stable figure ID, purpose, MAIN sections, parts with stable
IDs and numbers, directed connections, required features, forbidden inventions,
layout constraints, language, backend, formats and review criteria. Store under
`figures/<id>/figure-spec.json`, alongside editable source, original result and
provenance. Provenance binds current spec/result/source hashes, tool/backend, observed
provider/model, parameters, time, consent/audit references and reviewer identity/type.
Changed spec, source, result or MAIN invalidates review. XML checks never imply visual
approval. Final completion requires current technical and visual review or explicit
recorded omission of optional figures. Raster wrapped in SVG is not editable vector.

SVG is a size/depth/count-limited whitelist of self-contained geometry and text.
Reject DTD/entities, scripts, events, foreignObject, URL resources, CSS, fonts,
animation and processing instructions. Validate before preview. Local rendering never
falls back to public servers. Image tools are optional, host-owned and initially
unverified; mocks certify only handoff behavior.

## Installation and release

Plugin source of truth: `plugin.jsonc`, `src/agents`, `src/skills`, existing commands
and adapters. Skill source: `src/skill-entry`, `src/skill-resources` portable overrides,
shared role/capability sources and core. Overrides do not replace plugin prompts. Generated portable
folder: `skills/oh-my-patent`, exactly one SKILL.md, no symlinks. esbuild Node 22 ESM,
all non-builtin dependencies bundled; no CLI/TUI/React/Ink/adapters in dependency graph.
Runtime <=2 MiB, ZIP <=8 MiB; deterministic source/resource hashes and license inventory.

Five shared-scan hosts use one `.agents/skills` copy; Claude isolated outside shared
roots. No host discovery/installation/workflow certification from filesystem tests.
Skill installation must preserve all original plugin files and user edits, including
workspace instructions, MCP and marketplace configuration. No automatic replacement
or project-state migration. Skill updates/uninstall/rollback manage only their own
registered files, with backups outside discovery roots and dry-run previews. Plugin
pruning must preserve portable Skill resources even when they contain agent markers.
Generate outputs are separate: `plugins/<host>` and `skill-installations/<host>`.
Combined host activation is unverified; select an entry and runtime explicitly.

Build/test/package once; publish the same verified tarball with --ignore-scripts.
Track artifact_ready, install_verified, workflow_verified, catalog_status independently.
No stable release until real host evaluations, zero-tolerance safety checks and manual
artifact review pass. Paid tests and publication are separate execution decisions.

Every substantive patent deliverable includes technical-assistance/not-legal-advice
and qualified-professional-review notice. Scores are workflow signals, not grant odds.
