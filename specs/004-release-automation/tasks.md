# Verification ledger

Verified locally on 2026-10-08 with Node 24.19.0 and npm 11.9.0.

| Requirement | Verdict | Evidence |
| --- | --- | --- |
| One build, three independent destinations | PASS (configuration) | `actionlint` 1.7.7 passes all workflows; each destination has only `needs: build`. The Release is checked before build publication jobs can run. |
| Tagged, clean, matching artifacts | PASS (local tests) | `release-publication.test.ts` checks tag aliases, branch rejection, commit/tag mismatches, dirty manifests and modified archives/checksum lists. |
| Existing stable host gate and dist-tags | PASS (local tests/configuration) | Both package plans check first-wave acceptance; tests cover stable `latest` and prerelease `next`; npm jobs retain `environment: PRE`. |
| npm retry behavior | PASS (injected runner tests) | Missing versions publish; identical integrity skips without dist-tag writes; different bytes, malformed metadata and E401/E403/network errors fail. |
| Release retry and write permission | PASS (injected runner tests/configuration) | Tests cover five-file upload, partial completion, unchanged retry, byte conflicts and access failures. Only the asset job has `contents: write`; uploads never use `--clobber`. |
| Manual entry and dry-runs | PASS (local archives) | Both npm archive dry-runs and asset validation dry-run succeed; isolated offline cache avoids npm 11's already-published-version check and is cleaned on success/failure. |

Commands and observed output:

```text
npm run build
  generated Skill: 44 files; runtime_bytes: 130601
npm run lint
  exit 0
npm test
  Test Files 64 passed (64)
  Tests 485 passed (485)
npm run package:skill
  generated both TGZs, Skill ZIP, SHA256SUMS and release-manifest.json
npm run verify:artifacts
  ok: true; zip_entries: 44; skill_npm_files: 46
npm run publish:release -- plugin --dry-run
  status: dry-run
npm run publish:skill -- --dry-run
  status: dry-run
npm run publish:release -- assets --dry-run
  status: dry-run
actionlint (1.7.7)
  exit 0; no findings
git diff --cached --check
  exit 0
```

The generated Skill manifest was refreshed by the builder because package.json's
maintainer commands changed. Its runtime bytes and resource inventory are unchanged.
CI now runs actual-archive dry-runs for both packages and attachment validation on
Ubuntu and Windows; remote CI outcomes are recorded by the pull request checks.

No new version, real npm publication, Release asset upload, tag update or merge was
performed to validate this change. Registry credentials and production upload
authorization require an actual release; the dry-runs do not establish them.

## Node 24 Action runtime follow-up

The original PR CI passed, but warned that checkout/setup-node's pinned v4
commits declare Node 20 and are forced to execute on Node 24 by GitHub runners.

| Requirement | Verdict | Evidence |
| --- | --- | --- |
| Official stable Action commits declare Node 24 | PASS (source inspection) | Official GitHub release tags resolve to the commits below; action.yml at each commit declares `runs.using: node24`. The isolated-test follow-up checks all 24 workflow Action references and their input names against this metadata. |
| Project Node 22 and publication behavior retained | PASS (configuration) | Parsed workflow comparison retains Node 22, permissions, triggers, environment gates and publication steps; only pins, explicit cache disabling and CI artifact verification are added. |
| Updated workflows execute successfully | PASS (local checks); remote results in PR checks | actionlint 1.7.7, lint, build via pretest and 485 tests pass. The download-verification command returns `{"status":"verified","files":5}` against a copied set of real archives. [Initial upgrade CI](https://github.com/illusionaireal/oh-my-patent/actions/runs/37720838382) passed actual upload/download and all archive dry-runs on Ubuntu/Windows; the transfer test is now isolated as described below. |

Official stable release pins checked on 2026-10-08:

| Action | Release | Commit |
| --- | --- | --- |
| checkout | [v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1) | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| setup-node | [v7.1.0](https://github.com/actions/setup-node/releases/tag/v7.1.0) | `949feb2413d6458794dcd2491c4babbbce0c15c1` |
| upload-artifact | [v7.0.2](https://github.com/actions/upload-artifact/releases/tag/v7.0.2) | `cf430e030ddbb5b0abf93d22962f4752f3646cd9` |
| download-artifact | [v8.0.2](https://github.com/actions/download-artifact/releases/tag/v8.0.2) | `9000827ccba6bdab643e8b6fd33ac0654aef8333` |

Build steps still request `cache: npm`; publication steps explicitly set
`package-manager-cache: false`. No removed `always-auth` inputs or implicit
NODE_AUTH_TOKEN fallbacks are used. Test artifact names include the matrix OS,
have one-day retention, and are downloaded outside the checkout before verifying
their provenance and checksums with the existing release script. This follow-up
does not publish npm packages or upload production Release assets.

## Isolated artifact test workflow follow-up

Move the three artifact transfer-test steps out of the main CI into
`.github/workflows/test-action-artifacts.yml`. The separate workflow copies the
Node 22 build/package setup, uses the same pinned Actions, and runs on Ubuntu and
Windows. It supports manual dispatch and PRs changing its own file, so ordinary
PRs do not perform this extra transfer test.

| Requirement | Verdict | Evidence |
| --- | --- | --- |
| Main CI transfer-test steps removed | PASS (configuration) | Parsed main CI matches commit `7f554991c12a3ec6144753488193ca843a9cd4f3` after normalizing the two updated Action SHA pins. None of the three transfer-test step IDs remains in main CI. |
| Isolated test uses verified archives without publishing | PASS (configuration/local archives) | All 24 Action references/inputs match the inspected official metadata. The test workflow has explicit step IDs, only contents-read permission, no PRE/secrets/publication commands, and only manual/own-file PR triggers. Its download check returns `{"status":"verified","files":5}` on copied verified archives. |
| Updated workflows pass | PASS (local checks); remote results in PR checks | actionlint 1.7.7, lint, build via pretest, 485 tests, package:skill and verify:artifacts pass. Both workflows run on the updated PR head; their remote results are recorded in PR checks. |
