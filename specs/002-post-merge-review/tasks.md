# Verification ledger

Baseline: `npm test` — 48 files passed, 308 tests passed.

## Remediation cycle

Environment: Windows, Node v24.16.0, npm 11.13.0.

Before fixes, `npx vitest run tests/integration/post-merge-review.test.ts`:

```text
Test Files  1 failed (1)
     Tests  11 failed (11)
```

The initial regressions reproduced invalid Claude output, wrong MCP setup
location, deletion through three directory-link placements, four invalid index
cases, branch overwrite on stale counters, and incomplete branch creation.

After fixes, with additional install/uninstall and failed-write coverage:

```text
npm run build                 # exit 0
npm run lint                  # exit 0
npm test
Test Files  50 passed (50)
     Tests  323 passed (323)
node dist/cli.js --help        # exit 0; command help printed
```

| Criterion | Verdict | Evidence |
| --- | --- | --- |
| Native Claude output and delegation | PASS | post-merge-review: generated MCP, skills, main-agent tools; Claude adapter unit tests |
| MCP setup and preservation | PASS | post-merge-review: repeated CLI install/uninstall and settings preservation; post-merge-atomic: failed rename preserves original |
| Pruning boundaries | PASS | post-merge-review: escaping path rejection and ancestor/managed/nested junction tests |
| Branch integrity | PASS | post-merge-review: invalid indexes, collision, missing source; post-merge-atomic: failed index replacement rollback |

Review notes: fixes retain human workflow gates and source-generated adapter
outputs. The spec remains a proposal for review in the PR. Native Claude sessions
and external MCP connectivity were not exercised. Pruning checks existing links;
it is not a filesystem sandbox against concurrent hostile directory replacement.
Branch writes are atomic per file, not a general multi-process transaction system.
