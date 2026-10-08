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
