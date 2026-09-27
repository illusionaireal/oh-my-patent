# Verification ledger

Commands run from repository root on Windows / Node 24.16.0, 2026-09-27.

- [x] A29: `npx vitest run tests/unit/init-checker.test.ts` — 5 passed.
- [x] A13/A28/A14/A11: `npx vitest run tests/integration/install-safety.test.ts` — 15 passed.
  Covers user instructions, edits, shared marketplace metadata, invalid/conflicting
  registration, adapter and legacy-generator links, global copy links, reinstall and binary backups.
- [x] A15/A24/A27: `npx vitest run tests/integration/path-record-safety.test.ts` — 16 passed.
  Bad input retains existing node/snapshot/path bytes; skipped rounds create no state.
- [x] A12: `npx vitest run tests/unit/opencode-adapter.test.ts` — 6 passed.
- [x] A08/A09/A10: `npx vitest run tests/unit/router.test.ts tests/unit/diagram-specs-path.test.ts tests/unit/loader-input-sources.test.ts` — 29 passed.
- [x] Final `npm run lint` succeeded; `npm test` rebuilt TypeScript and reported 361 tests
  passed across 53 files. `node dist/cli.js --help` and `git diff --check` succeeded.

## Independent behavioral evidence

- The external 30-case audit runner now reports 20 PASS / 10 FAIL. It is a targeted
  suspicion list, not a coverage or quality score. A24 was corrected to accept either
  safe rejection without state or a valid graph; its old assertion incorrectly required
  CLI success even after rejection became the intended behavior. The committed 16-case
  path regression suite independently covers that rejection policy.
- Remaining failures: A17/A21 integration-scope questions; A18 state shape; A19/A20
  manifests; A22 remote headers; A23 NaN thresholds; A25 dot slug; A26 shell assumptions;
  A30 repeated graph edge ID. A31 TUI lifecycle remains separately deferred.
- OpenCode 1.18.32, isolated home/config/workspace, `opencode --pure debug agent audit-no-mcp`:
  exit 0; parsed permissions included `{permission:"*_*",action:"deny",pattern:"*"}`.
  This proves native configuration loading, not actual MCP tool execution. The fixture
  generated an agent with MCP disabled and no external server or credentials.
- Manually reviewed file ownership decisions, malformed shared configuration behavior,
  link checks at each mutation entry point and migration documentation against the diff.

## Remaining risks / not checked

No real MCP authentication or tool call, complete Claude/Codex native session, interactive
Ink terminal, POSIX permissions/Windows ACL matrix, concurrent hostile filesystem swaps,
multi-file crash transaction, dependency upgrade or human-gate acceptance was performed.
Claude's non-MCP/shared global file ownership remains a separate limitation documented in
the usage guides. Existing user files skipped during installation may need manual integration.
Passing tests do not close these review items or establish release readiness.
