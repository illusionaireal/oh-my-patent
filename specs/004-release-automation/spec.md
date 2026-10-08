# Automatic Release publication

Publishing a GitHub Release currently publishes only the plugin npm package. The
standalone Skill requires a second manual workflow, and verified archives remain
temporary Actions artifacts rather than Release downloads.

## Acceptance criteria

1. `release.published` builds and verifies one set of archives, then independently
   publishes the plugin, publishes the standalone Skill, and attaches all five
   release files. A failed publication can be retried without rebuilding successful jobs.
2. Formal publication requires a clean tagged build. The tag is the package version
   or that version prefixed with `v`; commit and tag must match the release manifest.
3. Stable publication retains the existing first-wave host acceptance gate and
   `PRE` environment. Prerelease npm versions use `next`; stable versions use `latest`.
4. npm retries skip an existing version only when its published archive integrity
   matches. Authentication/network errors and different bytes fail. Skipping an old
   version does not change dist-tags.
5. Release attachment retries compare existing bytes, upload only missing files,
   and never replace a different existing asset. Only the attachment job receives
   `contents: write`; npm jobs use the existing `NPM_TOKEN`.
6. The standalone workflow remains a manual Skill-only entry. Manual workflows
   default to dry-run; dry-runs make no Release mutations or npm publications.
7. All Actions used by CI and publication are pinned to official stable release
   commits that declare `runs.using: node24`. Project build/test/publication commands
   still use Node 22. Build caches remain explicit; publication jobs disable the
   newer setup-node automatic package-manager cache. CI verifies a five-file
   artifact upload/download round trip on Ubuntu and Windows.

## Scope and compatibility

This changes maintainer release automation, not patent workflows, Skill runtime or
prompt resources, package names, or the current version. The generated manifest
is refreshed to record the package.json command change. Publishing a Release remains the
human release decision. The already published `0.4.0` tag is not moved; automation
applies to new tags containing these changes.
