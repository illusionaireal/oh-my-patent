# Verification ledger

Base: f44755c57a894ba9b5e89a8ea6fecd5199dd4e11. Repair release metadata: 0.4.1.

| Requirement | Verdict | Reproducible evidence |
| --- | --- | --- |
| Bounded sentinel registration | Passed locally | `npm test -- tests/integration/sentinel-startup.test.ts` checks all three generated registrations, permissions and prompt paths |
| Installed runtime independence / relocation | Passed locally | Same tests execute copied scripts after moving a Chinese/space workspace, without PATH, source tree, node_modules or CLI; real reports preserve blockers |
| Mixed-host configuration / writes | Passed locally | Same tests verify isolated host reports and configuration writes |
| Failure and ownership | Passed locally | Same tests verify CHECK_FAILED / ready=false, output containment, edited runtime preservation and unrelated host preservation |
| Skill activation / prompt contract | Implemented | Skill activation explicitly loads the sentinel; source/portable resources remain separate; see package tests |
| Retrieval coverage / consent | Passed locally | 18 unit tests and three installed-host scenarios exercise zero sources, academic-only consent, professional sources, invalid/disabled configuration, mixed-host isolation, saved confirmation, fresh resume checks and non-waivable runtime/tool blockers |
| Full regression / build | Passed locally | `npm test`: `Test Files 66 passed (66)`; `Tests 514 passed (514)` |
| Type check | Passed locally | `npm run lint`, exit 0 |
| Actual release archives | Passed locally | `npm run package:skill` then `npm run verify:artifacts`; `ok:true`, version 0.4.1, 44 ZIP entries, 46 standalone npm files, installed_check_hosts = claude-code/codex/opencode |
| Generated source cleanliness | Passed locally | `git diff --check`, exit 0; CI additionally checks the generated Skill after rebuilding |
| Ubuntu/Windows CI | Pending updated PR run | Baseline 658af0c passed run 37870726448; the retrieval-gate increment needs a new run including full regression, archive execution and publication dry runs |
| Actual model-host delegation traces | Not run | `command -v codex`, `command -v claude`, `command -v opencode` returned no executable |

The isolated installed runtime checks do not claim a real model invoked the sentinel.
The checker still reports configuration_only; actual approved host retrieval is a
separate orchestration gate. Plugin readiness blocks none coverage and unaccepted
fallback_only coverage. Skill roles use observed approved tools rather than plugin
configuration. A saved academic-only acceptance cannot automatically waive resume.
Record host/version, parent invocation, child result and persisted report for that
separate acceptance. This does not erase the maintainer's previously confirmed 0.4.0
general host acceptance. No merge, Release publication or npm publication is performed.
