# Verification ledger

Baseline: fc409019 (0.3.3), fetched and checked against the execution plan.
Local original master was 4c6b9b9; implementation uses an isolated worktree from the
specified baseline. Its 232-file upstream difference is not part of this change.

Results and open release gates are recorded here as checks actually execute.
No host/model sessions, paid generation, market submission or publishing has run.

## Local candidate — 2026-09-30

Version `0.4.0-alpha.0`, branch `feat/skill-first`. PR numbers below refer to stages
in the execution plan; separate GitHub pull requests have not been opened.

| Stage | Implemented and checked | Remaining acceptance |
| --- | --- | --- |
| PR1 | Schema/interface 1, disclosure, coordinated writes/recovery, ownership and figure contracts | Human implementation review before release |
| PR2 | One entry, 44 resources, bundled runtime, templates, six host paths | Actual host discovery |
| PR3 | Migration/moved paths, transactions, byte digests, workflow gates, branch/restore, figure provenance and review invalidation | Real-host traces and deliverable review |
| PR4 | Selected-host install, shared ownership, dry-run, backup, locked rollback and interrupted-install recovery | Host discovery, plugin coexistence, third-party installer tests |
| PR5 | 420-case first-wave run list, synthetic fixtures, evidence-hash report tool, deterministic tests | 0/420 real-host runs; human review of three complete deliverables |
| PR6 | Verified ZIP/tarball, CI matrix, bilingual README/migration docs, release pipeline | Linux CI, release review, publication and catalog submission |
| PR7 | Cursor/Copilot VS Code/Gemini candidate paths | Real-host and channel certification |

## Reproducible checks

Run in the implementation checkout with dependencies installed.

| Command/check | Observed result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run build` | Passed; runtime 130,512 bytes, under 2 MiB |
| `npx --yes --package=node@22 --call "node --version && npm test"` | Node 22.23.3, 60 files, 424/424 tests; final run 20.68 seconds |
| Repeat `npm run build:skill`, compare manifest SHA-256 | Identical; generated files use exact-byte Git attributes |
| `npm run package:skill` | ZIP 258,118 bytes, under 8 MiB; tarball and checksums generated |
| `npx --yes --package=node@22 node scripts/verify-artifacts.mjs` | Actual archives: 44 files, exact content/version/hash agreement, ZIP CRC/central directory, doctor and project creation from both copies |
| `python -m zipfile -t release-artifacts/oh-my-patent-skill-0.4.0-alpha.0.zip` | Independent ZIP validation passed |
| skill-creator `quick_validate.py skills/oh-my-patent`, Python UTF-8 mode | Passed |
| `node evals/skill/evaluation.mjs --plan` | 420 distinct cases, no host sessions started |
| Report over an empty evaluation record set | 0/420, unverified, release_ready=false |
| Workflow YAML parsing; `git diff --check` | Passed locally; not a GitHub Actions run |

Archive hashes and source commit/dirty status are recorded in the local ignored
`release-artifacts/SHA256SUMS` and `release-manifest.json`. These are candidate
artifacts, not published releases. The release job passes the verified tarball to
publication without rebuilding it.

## Corrections and retained failure history

- Raster input checks decoded UTF-8 instead of hashing bytes; a PNG handoff test now
  checks the fix without claiming visual review.
- Innovation restore updated nodes but left stale snapshots; both now commit together
  and branch copies retain their consistency.
- Missing figure IDs passed regex coercion. Explicit type/schema checks reject them;
  SVG validation also rejects escaped/commented CSS URL forms before preview.
- Migration now normalizes saved role output paths, retains exact backups and rejects
  external or missing references as well as checking stage artifacts.
- Installer rollback now shares the lock, pending installs require recovery, and
  registry preconditions retain the initially inspected bytes against concurrent edits.
- ZIP verification now checks CRCs, duplicates, central offsets and the end record.
- Windows Python defaulted to GBK; the unchanged bilingual Skill validator passed with
  `python -X utf8`.
- One intermediate Node 22 run was 423/424: inherited `npx --call` settings broke the
  old shell-based compiler test. The test now invokes the installed TypeScript compiler
  with process.execPath. The final complete rerun passed 424/424.

## Remaining decision

Windows was exercised. Default Node was 24.14.0; the final full suite and archive
checks explicitly used 22.23.3. Linux CI, macOS and network filesystems are unverified.
Read-only checks found Claude Code 2.1.174, Codex CLI 0.155.1 and OpenCode 1.18.33.
Their presence does not establish authenticated accounts, models, discovery, tool
permissions or egress interception. No real retrieval/image service was certified.
Host/model tokens and test costs are unobserved, not measured as zero.

Original plan section 10.3 proposes US$50 for a pilot and US$300 overall but explicitly
does not authorize paid execution. Before launching host sessions, obtain a concrete
pilot budget and confirm accounts/models/rates, then run prepared cases against the
exact candidate. Preserve failures/traces, review three complete deliverables and
rerun affected cells. Unit tests, mocked handoffs and host self-review cannot grant
stable release readiness.
