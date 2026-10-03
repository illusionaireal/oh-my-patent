# Verification ledger

Baseline: fc409019 (0.3.3), fetched and checked against the execution plan.
Local original master was 4c6b9b9; implementation uses an isolated worktree from the
specified baseline. Its 232-file upstream difference is not part of this change.

Results and open release gates are recorded here as checks actually execute.
The initial local checks below preceded host/model execution. A supplemental real-host
pilot is recorded at the end; no market submission or publishing has run.

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
At that checkpoint, host/model tokens and test costs were unobserved, not measured as zero.

Original plan section 10.3 proposes US$50 for a pilot and US$300 overall but explicitly
does not authorize paid execution. Before launching host sessions, obtain a concrete
pilot budget and confirm accounts/models/rates, then run prepared cases against the
exact candidate. Preserve failures/traces, review three complete deliverables and
rerun affected cells. Unit tests, mocked handoffs and host self-review cannot grant
stable release readiness.

## Supplemental Codex/OpenCode pilot — 2026-09-30

The user explicitly requested one initial run with Codex `gpt-6-luna` and an OpenCode
free model. Both used ZIP SHA-256
`033b8b7fee6841066e71383287aea97546c20ffc284c1c7b0f66c52620253959`, synthetic sensor
input and an explicit Skill invocation. These assisted smoke attempts do not count as
unchanged cases in the 420-case matrix, which remains unverified.

- Codex CLI 0.155.1 completed in approximately 3m12s, saved a disclosure draft and
  three supporting documents, and used bundled runtime project creation/advancement.
  Independent runtime validation succeeded: revision 1, RESEARCH pending, no lock or
  recovery required. No actual retrieval or external upload tool call was observed.
  Follow-up findings: draft text was embedded in a PowerShell command body despite
  the Skill's command-line-content restriction; the source fixture remains outside
  the project, so moving the project alone does not preserve that source reference.
- OpenCode CLI 1.18.33 first encountered MiMo rate limiting and Ling HTTP 404. Its
  default paid title-model request was rejected for insufficient funds; the local
  configuration was then corrected to pin both primary and small models to free
  Nemotron. An ancestor-repository exploration attempt was stopped; the final attempt
  used an independent Git workspace with task/external-directory permissions denied.
- The final `opencode/nemotron-3.5-lightning-free` run read the installed Skill but
  encountered an upstream 504 idle timeout and retries. It ended naturally with
  exit 0 after about 8m19s, leaving an empty MAIN.md and no runtime project state.
  Validation returned MISSING_FILE. This run failed the requested output criterion;
  provider problems prevent attributing the failure solely to the Skill or model.
- Codex reported 391,230 input tokens (353,280 cached) and 7,860 output tokens.
  Its actual monetary charge is unknown. The final OpenCode attempt reported zero
  per-step cost; account billing was not independently checked. US$50 is not a
  measured spend or a CLI-enforced budget limit.

Full synthetic traces, exact prompts, metrics, validation results, integrity checks
and evidence hashes remain in ignored `.audit-reports/host-smoke-20260930/`.
See its `REPORT.md` and `setup.md`. Both 44-file installed copies match the ZIP.
No candidate code or packaged Skill was changed during this pilot. The standard
matrix, human acceptance and release gates remain open.

## Review fixes — 2026-10-04

Two defects were reproduced against `67e4210` and corrected without changing the
`0.4.0-alpha.0` designation or any host-verification flag:

- The legacy allowlist now accepts exact adapter outputs from both LF and CRLF source
  checkouts of the pinned 0.3.3 baseline. All original hashes remain accepted. Full
  installation fixtures cover Claude Code, Codex and OpenCode; six upgrade/rollback
  cases preserve exact original bytes, and six edited-file cases block all mutation.
  `node scripts/build-legacy-fixtures.mjs` regenerates the fixture and fingerprints
  from the baseline Git object. Tests use the committed fixture without fetching history.
- Inspection and recovery ignore transaction directories whose journal was never
  published. The writer applies no project files before publishing the prepared
  journal. Real child-process exits before temporary-file writing and before journal
  rename verify explicit dead-owner lock recovery, unchanged state, and idempotent
  retry. Temporary evidence is retained; an existing malformed journal still fails
  closed. Existing prepared-transaction rollback checks remain in place.

Linux / Node 22.23.3: lint and build passed; the full suite passed 439/439 tests in
61 files; ZIP and tarball verification passed with 44 Skill resources. The rebuilt
runtime is 130,601 bytes and Skill ZIP is 258,207 bytes. These local checks do not
certify real host discovery or workflow acceptance. The PR's Windows/Linux CI and
the existing host/human acceptance gates remain separate; no publication was run.

The first PR CI run (`37149905055`, commit `40261a8`) passed all 439 tests on both
Ubuntu and Windows, and Ubuntu passed artifact verification. Windows artifact
verification exposed a system-tar argument encoding failure for the Chinese temporary
directory (`omp ?? space-...`). The verifier now supplies gzip bytes on stdin and lets
Node set the Unicode working directory, retaining Unicode/space relocation coverage
without passing those paths through tar's argument decoder. This follow-up is checked
by the same archive verification step on the next CI run.
