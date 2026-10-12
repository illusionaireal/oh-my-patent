# Verification ledger

Base: master `d7f17e951d8792e826e9991142871049e0cd928d`. Version: 0.4.2.

| Check | Status | Reproduction / evidence |
| --- | --- | --- |
| Short Skills CLI source | Passed | Linux / Node 24.19.0, Skills CLI 1.7.2: `npx skills add illusionaireal/oh-my-patent --list` discovers one skill, oh-my-patent |
| Version and dependency consistency | Passed locally | package.json, both root lockfile versions, plugin.jsonc, generated manifest and packaged npm versions are 0.4.2; `git diff -- package-lock.json` changes only the two root versions |
| README and local links | Passed locally | Bilingual instructions reviewed; all 104 relative file targets in changed README/docs/changelog resolve; `git diff --check` passes |
| Type checking | Passed locally | `npm run lint`, exit 0 |
| Full regression and build | Passed locally | `npm test` (includes build): 550 tests in 68 files pass on Linux / Node 24.19.0 |
| Deterministic generated Skill | Passed locally | All 45 generated file SHA-256 values unchanged across a repeat `npm run build:skill` |
| Release archives | Passed locally | `npm run package:skill` and `npm run verify:artifacts`, ok:true; 45 ZIP entries, 47 standalone npm files, relocated installed checks for Claude Code/Codex/OpenCode |
| Publication dry-runs | Passed locally | `npm run publish:skill -- --dry-run`; `npm run publish:release -- plugin --dry-run`; `npm run publish:release -- assets --dry-run`, all exit 0 |
| Ubuntu / Windows CI | Pending submission | Submitted PR checks are authoritative for its commit |

No real host drawing, timer UI, tool cancellation or remote provider calls are claimed.
This PR prepares a version; it does not merge, tag or publish it.
