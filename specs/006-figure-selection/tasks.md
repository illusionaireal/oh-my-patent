# Verification ledger

Base: c814a413c2474119b9adffcf95361b90278898e0 (PR #12). Version: 0.4.1.

| Requirement | Verdict | Evidence |
| --- | --- | --- |
| Optional startup Mermaid | Passed locally | tests/unit/retrieval-gate.test.ts: missing mmdc leaves a professional-source workspace ready; git/node remain blockers |
| Preference and per-figure selection | Passed locally | tests/unit/figure-selection.test.ts and tests/skill-package/figure-selection.test.ts exercise default SVG, local preferences, per-figure user choices, reuse and unavailable paths |
| Real 30-second deadline / honest immediate default | Passed locally | Same tests cover persisted offers, early-timeout rejection, expiry, changed plan conflicts, immediate default without a timed tool, source labels and retry idempotency; tests advance a synthetic runtime clock |
| Disclosure boundary | Passed locally | Remote imagegen/PlantUML are excluded from system defaults; explicit remote handoffs still need matched disclosure evidence; no service is called by these tests |
| Draft/final stage and review | Passed locally | Runtime tests cover required path readiness, preview absence allowing drafts but blocking final stage/visual pass, choice/spec/source/MAIN freshness and human direction/final acceptance |
| Independent plugin runtime | Passed locally | tests/integration/sentinel-startup.test.ts executes all three installed bundles without PATH/package CLI, creates a project, plans/selects SVG, and rejects workspace escape |
| Plugin and Skill prompt alignment | Implemented / generated | Shared operation contract and SVG-first prompts; npm test package checks verify deterministic generated resources |
| Full regression / build | Passed locally | npm test: 68 test files / 537 tests passed; TypeScript/build:check/build:skill complete |
| Type check | Passed locally | npm run lint, exit 0 |
| Real archives | Passed locally | package:skill / verify:artifacts, ok:true; 45 ZIP entries, 47 standalone files, all three packed installed runtimes perform figure planning/selection after the package location is removed |
| Publication dry runs | Passed locally | publish:skill -- --dry-run and publish:release -- plugin/assets --dry-run all exit 0 |
| Ubuntu / Windows CI | Pending PR run | CI must repeat regression, generated-resource checks, archives and dry runs |
| Real host timer / drawing tools | Not run | Native Claude Code/Codex/OpenCode sessions and real image/renderer calls are not available here; host-reported observations do not certify actual tool execution |

No merge or publication is performed. Existing registered figures remain inspectable;
new registration needs selection. Legacy projects require explicit migration before
using versioned mutations; all writers then use the shared runtime. Reinstall plugin
integrations or update the complete Skill to receive these changes.
