# Verification ledger

Base: f44755c57a894ba9b5e89a8ea6fecd5199dd4e11. Repair release metadata: 0.4.1.

| Requirement | Verdict | Reproducible evidence |
| --- | --- | --- |
| Bounded sentinel registration | Passed locally | `npm test -- tests/integration/sentinel-startup.test.ts` checks all three generated registrations, permissions and prompt paths |
| Installed runtime independence / relocation | Passed locally | Same tests execute copied scripts after moving a Chinese/space workspace, without PATH, source tree, node_modules or CLI; real reports preserve blockers |
| Mixed-host configuration / writes | Passed locally | Same tests verify isolated host reports and configuration writes |
| Failure and ownership | Passed locally | Same tests verify CHECK_FAILED / ready=false, output containment, edited runtime preservation and unrelated host preservation |
| Skill activation / prompt contract | Implemented | Skill activation explicitly loads the sentinel; source/portable resources remain separate; see package tests |
| Full regression / build | Passed locally | `npm test`: `Test Files 65 passed (65)`; `Tests 493 passed (493)` |
| Type check | Passed locally | `npm run lint`, exit 0 |
| Actual release archives | Passed locally | `npm run package:skill` then `npm run verify:artifacts`; `ok:true`, version 0.4.1, 44 ZIP entries, 46 standalone npm files, installed_check_hosts = claude-code/codex/opencode |
| Generated source cleanliness | Passed locally | `git diff --check`, exit 0; CI additionally checks the generated Skill after rebuilding |
| Ubuntu/Windows CI | Pending PR run | CI includes full regression, archive execution and publication dry runs |
| Actual model-host delegation traces | Not run | `command -v codex`, `command -v claude`, `command -v opencode` returned no executable |

The isolated installed runtime checks do not claim a real model invoked the sentinel.
Record host/version, parent invocation, child result and persisted report for that
separate acceptance. This does not erase the maintainer's previously confirmed 0.4.0
general host acceptance. No merge, Release publication or npm publication is performed.
