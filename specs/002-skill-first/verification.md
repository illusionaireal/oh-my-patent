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

The follow-up PR CI run `37150114027` on `f22583b` passed Ubuntu and Windows,
including all 439 tests and both archive checks. This is automated CI evidence;
host and human acceptance remain open.

## Additive installation correction — 2026-10-04

The user clarified that Skill mode supplements the original Archimedes plugin;
it must not collapse or replace its 14 agents, 6 skills and 9 commands. This
supersedes the earlier plugin-removal migration design and fingerprint allowlist.

- `adapt` defaults to the original plugin. `--mode plugin` is explicit selection;
  `--legacy` remains a compatibility alias. `--mode skill` selects the additional
  portable package and still requires one host. Unsupported mode/flag combinations
  fail before writing; plugin and Skill generation use separate output directories.
- Original plugin prompts are restored. Portable adaptations live under
  `src/skill-resources` and are read only by the Skill builder. All original entry
  points remain packaged; archive verification checks the full 14/6/9 inventory.
- Skill install, update, uninstall and rollback leave original plugin files and
  user edits intact. The unused deletion allowlist is removed. Full LF/CRLF 0.3.3
  fixtures now verify additive preservation instead of replacement/rejection.
- Real CLI tests cover all three original hosts: default plugin installation,
  additive Skill installation, plugin reinstall with pruning, independent plugin
  uninstall and Skill uninstall. Plugin pruning preserves portable role resources
  even when those references contain historical generated-agent markers.
- The interrupted-transaction journal fix and its process-exit regressions remain.
  Installing the Skill does not migrate project state; explicit project migration
  retains its existing review/dry-run/backup contract.

Linux / Node 22.23.3: lint/build passed, 446/446 tests passed in 62 files, and
packed tarball/ZIP checks passed. The Skill still has 44 files, runtime 130,601
bytes, ZIP 258,843 bytes. A repeated Skill build retained manifest SHA-256
`4d3dcd822f6acb69f0936ae876283384a1e3b35038e476257656c54564876e01`.

Version remains `0.4.0-alpha.0`; host-verification flags remain false. Revised PR
CI is required for this correction. Filesystem coexistence does not certify combined
host activation or mixed runtimes in one project. No merging or publication was run.

## Independent npm Skill workflow — 2026-10-05 (Asia/Shanghai)

The user requested a workflow to publish the portable Skill separately on npm.
The proposed package is `oh-my-patent-skill`; the original `oh-my-patent` package,
plugin default, entry points and existing publication workflow remain available.

- Packaging now emits three artifacts: plugin tarball, Skill ZIP and standalone
  Skill tarball. The latter contains the same 44 Skill resources plus npm metadata
  and README (46 files), without runtime npm dependencies or install scripts.
- The independent manual workflow builds/tests/verifies the selected commit, then
  transfers immutable artifacts to its publish job. Publication selects only the
  standalone tarball and checks package/version/commit identity, SHA-256 and dist-tag.
  It uses `--ignore-scripts`, the existing PRE environment and NPM_TOKEN secret.
- `dry_run` defaults to true. Alpha uses `next`; stable remains blocked until all
  first-wave host installation and workflow verification flags pass. The helper
  also rejects modified bytes, other commits, plugin selection, path traversal,
  version changes and a tampered alpha dist-tag.
- CI verifies both npm archives and ZIP, executes each copied runtime without its
  source repository/dependencies, and dry-runs standalone npm publication.
- npm dependency installation is separate from host Skill registration. A local
  directory example based on the skills CLI documentation is included, but that
  third-party installer and host activation remain unverified for this candidate.

Linux / Node 22.23.3: lint/build passed, 453/453 tests passed in 63 files; archive
verification and npm publish dry-run passed. The final targeted publication-helper
rerun passed all seven checks. Standalone tarball: 76,895 bytes, 46 files. Rebuilt
Skill manifest SHA-256: `02fca8990e1442c97738cda242416f73281f6a4066c564d34d8ffe59b520effe`.
Workflow YAML parsed, and git diff whitespace checks passed.

Actual workflow dispatch/publication, registry package ownership and token permission
for the new package were not tested. npm dry-run succeeded without registry login;
that does not prove publication access. Version is still `0.4.0-alpha.0`, host flags
remain false, and no npm upload or marketplace submission occurred. Revised PR CI
must pass independently of these local checks.

## Release 0.4.0 acceptance confirmation

Confirmation received on 2026-10-05 (Asia/Shanghai): the repository maintainer stated
“验收已经完成了。” (“Acceptance has already completed.”) while requesting the
`chore/release-0.4.0` release PR. This supersedes the earlier requirement to retain
`0.4.0-alpha.0` until release host acceptance completes.

The release PR starts from merged PR #9, master commit
`0cc939396894593852f61aafef03c877f933dc60`. First-wave Skill installation and workflow
acceptance for Claude Code, Codex and OpenCode is recorded as passed, with
`verification_source: user_confirmation` and `acceptance_confirmed_at: 2026-10-05`
in `distribution/targets.json`. The confirmation date is not an asserted execution
date; actual host versions and test dates remain null. No new host evaluation
traces were provided or executed in this release-preparation session, and no
420-run pass total is inferred. Earlier failed/pending records remain historical.

Wave-two hosts, mixed plugin/Skill host activation, optional image providers,
third-party installers and catalogs retain their prior unverified/not-submitted
status. Both stable publication workflows retain their first-wave acceptance gates.
Generated host references and the release manifest derive their current status
from the registry and preserve the confirmation source.

Release preparation updates all package/plugin versions to `0.4.0`, rebuilds the
portable Skill, updates bilingual documentation/release notes and changes the
original npm workflow trigger to `release.published`. This PR does not merge itself,
create a tag/Release or upload either npm package.

Release-preparation validation on Linux / Node 22.23.3:

- `npm run lint` and `npm test` (including the pretest build) passed: 453/453 tests in 63 files.
- `npm run package:skill` and `npm run verify:artifacts` passed for the plugin tarball,
  standalone Skill tarball and ZIP. Original plugin inventory remains 14/6/9;
  Skill resources remain 44 files and standalone npm inventory remains 46 files.
- `npm run publish:skill -- --dry-run` passed for `oh-my-patent-skill@0.4.0`
  with `latest`, using the existing first-wave host gate. No npm upload occurred.
- A repeated `npm run build:skill` preserved manifest SHA-256
  `c6194bc194754504fcaf3d985e59d0c9e3f2d934ded69cd89c57103d1a50b34d`.
  Runtime remains 130,601 bytes; ZIP is 259,099 bytes.
- Package, root lockfile metadata, plugin, generated Skill and both archive versions
  were checked as `0.4.0`; workflow YAML and `git diff --check` passed.

GitHub Ubuntu/Windows CI must validate the submitted release commit separately.

## Skills CLI and repository ZIP installation

2026-10-06 (Asia/Shanghai), Linux / Node 24.19.0, Skills CLI 1.7.0 from npm.
The README offers Skills CLI, manual ZIP and project CLI installation choices.
The direct repository directory selects the complete generated Skill rather than
plugin capabilities or source templates elsewhere in the repository.

The Skills CLI entry point was run in three separate temporary workspaces with
the following arguments (replace `<host>` with `claude-code`, `codex` or `opencode`):

```sh
npx --yes skills@1.7.0 add https://github.com/illusionaireal/oh-my-patent/tree/7bc685c7179d8af6d143a9bd5821732758917e54/skills/oh-my-patent --skill oh-my-patent --agent <host> --copy --yes
```

- All three installations succeeded. Claude Code used `.claude/skills/oh-my-patent`;
  Codex and OpenCode used `.agents/skills/oh-my-patent` in their respective workspaces.
- Each installed directory contained exactly 44 files, all byte-identical to the
  candidate's `skills/oh-my-patent` directory. The installer lock recorded the exact
  source commit and `skills/oh-my-patent/SKILL.md` path.
- All three copied runtimes passed `--doctor` and a synthetic `project.create`
  request in separate fixture projects, without repository runtime dependencies.
- `skills list --agent codex` and `skills remove oh-my-patent --agent codex --yes`
  succeeded; removal deleted the installed Skill directory.
- Downloading `https://github.com/illusionaireal/oh-my-patent/archive/7bc685c7179d8af6d143a9bd5821732758917e54.zip`
  succeeded. Its `skills/oh-my-patent` subtree matched all 44 candidate files;
  copying that subtree to a manual installation and running `--doctor` passed.

The user-facing commands follow `master`; these checks pin the candidate commit
for reproduction. Skills CLI 1.7.0 requires Node.js >=22.20 and Git for this source;
the portable runtime itself retains Node.js >=22 support. Telemetry was disabled
during checks. No global installation or actual host model session was run here.
This result supersedes the earlier unverified third-party installer status for
this specific project-local copy workflow. Other installers and scopes remain
outside the tested scope.


## Skills CLI without an explicit host

2026-10-06, Linux / Node 24.19.0, Skills CLI 1.7.0. The concise README entry
was checked without `--agent` and without the installer's `--yes` option:

```sh
npx --yes skills@1.7.0 add https://github.com/illusionaireal/oh-my-patent/tree/300fced4eb064afa0693c30f7d4dee27efe264ac/skills/oh-my-patent --skill oh-my-patent --copy
```

The npm-level `--yes` only accepts fetching the installer. Skills CLI detected its
Codex execution environment and installed non-interactively. The installed copy
contained the exact 44 generated resources; its lock recorded the frozen commit
and complete source directory. This host selection comes from the environment,
not a Codex flag in the README command.

A second check used the byte-identical local generated directory in an isolated
workspace with coding-agent detection variables unset. It detected the installed
Codex CLI, offered Project/Global scope and installation confirmation, then copied
all 44 exact resources into `.agents/skills/oh-my-patent` after Project was selected.
The installed runtime passed `--doctor`. The optional find-skills installation
was declined. These checks add neither global installation nor host model acceptance.

The first check's login shell changed its working directory to its startup
location. That test copy caused the package's ancestor/user duplicate guard to
reject 20 local test cases. The fixture copy and lock were retained outside
user discovery locations, and subsequent installer checks used a shell that kept
the specified workspace. The complete test suite and artifact checks were rerun
after correcting the fixture placement.
