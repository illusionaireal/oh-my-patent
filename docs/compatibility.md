# Compatibility and certification

Do not equate a candidate path, a copied folder, host activation, workflow behavior and
marketplace listing. Each has separate evidence. The maintainer confirmed completion
of release acceptance on 2026-10-05. First-wave installation/workflow status below
uses that confirmation; this release-preparation session did not execute new host
evaluations. Exact host versions, execution dates and scenario traces were not supplied.
No native image provider has been verified.

| Target surface | Wave | Artifact | Host install/discovery | Workflow | Catalog |
| --- | --- | --- | --- | --- | --- |
| Claude Code | 1 | Portable folder | Passed (user confirmation) | Passed (user confirmation) | Not submitted |
| Codex CLI / IDE | 1 | Portable folder | Passed (user confirmation) | Passed (user confirmation) | Not submitted |
| OpenCode | 1 | Portable folder | Passed (user confirmation) | Passed (user confirmation) | Not submitted |
| Cursor local | 2 | Portable folder | Unverified | Unverified | Not submitted |
| GitHub Copilot VS Code | 2 | Portable folder | Unverified | Unverified | Not submitted |
| Gemini CLI | 2 | Portable folder | Unverified | Unverified | Not submitted |

The original plugin retains its 14 agents, 6 skills and 9 commands. The table above
tracks the additional Skill mode only. Filesystem coexistence does not certify
combined host activation or mixed runtimes in one project.

Automated local tests cover relocation, packaging, coordinated persistence, default
egress denial, SVG safety, installer ownership and shared-copy removal. Those tests do
not certify actual host model/tool behavior. Both Ubuntu and Windows passed
[PR #9 CI](https://github.com/illusionaireal/oh-my-patent/actions/runs/37303509468)
on commit `b95e35f`; the release PR requires its own run. macOS and network filesystems are unverified.

The host evaluation protocol in `evals/skill/scenarios.json` defines 216 activation cases,
108 safety/failure cases, 18 full workflows, 6 cross-host resumes and 72 figure tasks
(420 runs before retries). Each scenario/host/language cell requires 3/3 passes.
Zero-tolerance failures: data corruption, fabricated evidence/agents, unconsented egress.
The protocol also requires manual review of at least three complete artifacts.
The maintainer's completion statement is recorded in the
[acceptance ledger](../specs/002-skill-first/verification.md#release-040-acceptance-confirmation).
It does not supply a per-scenario execution ledger, so no new 420-run pass total is claimed.
`distribution/targets.json` records `verification_source: user_confirmation` and
the confirmation date; `tested_version` and actual `test_date` remain null.

Costs and token usage are not inferred. The execution plan's US$50 pilot/US$300 total
are suggestions, not authorization; paid evaluations require an agreed budget and
available host accounts. Synthetic transport tests do not certify live retrieval or
image services. Keep failed runs when rerunning a corrected candidate.
