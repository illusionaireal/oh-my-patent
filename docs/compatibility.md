# Compatibility and certification

Do not equate a candidate path, a copied folder, host activation, workflow behavior and
marketplace listing. Each has separate evidence. No real-host certification has run
for the optional Skill candidate; no native image provider has been verified.

| Target surface | Wave | Artifact | Host install/discovery | Workflow | Catalog |
| --- | --- | --- | --- | --- | --- |
| Claude Code | 1 | Portable folder | Unverified | Unverified | Not submitted |
| Codex CLI / IDE | 1 | Portable folder | Unverified | Unverified | Not submitted |
| OpenCode | 1 | Portable folder | Unverified | Unverified | Not submitted |
| Cursor local | 2 | Portable folder | Unverified | Unverified | Not submitted |
| GitHub Copilot VS Code | 2 | Portable folder | Unverified | Unverified | Not submitted |
| Gemini CLI | 2 | Portable folder | Unverified | Unverified | Not submitted |

The original plugin retains its 14 agents, 6 skills and 9 commands. The table above
tracks the additional Skill mode only. Filesystem coexistence does not certify
combined host activation or mixed runtimes in one project.

Automated local tests cover relocation, packaging, coordinated persistence, default
egress denial, SVG safety, installer ownership and shared-copy removal. Those tests do
not certify actual host model/tool behavior. Both Ubuntu and Windows passed PR CI on commit `f22583b`; subsequent changes
require their own run. macOS and network filesystems are unverified.

Remaining host acceptance uses `evals/skill/scenarios.json`: 216 activation cases,
108 safety/failure cases, 18 full workflows, 6 cross-host resumes and 72 figure tasks
(420 runs before retries). Each scenario/host/language cell requires 3/3 passes.
Zero-tolerance failures: data corruption, fabricated evidence/agents, unconsented egress.
Manual review of at least three complete artifacts remains required.

Costs and token usage are not inferred. The execution plan's US$50 pilot/US$300 total
are suggestions, not authorization; paid evaluations require an agreed budget and
available host accounts. Synthetic transport tests do not certify live retrieval or
image services. Keep failed runs when rerunning a corrected candidate.
