# Implementation plan

- Reuse the existing build/package/archive verification pipeline.
- Add a standard-library maintainer script to validate tag/artifact identity and
  perform npm/Release retries with byte comparisons. Keep the existing Skill-only
  command as a wrapper around the same publication rules.
- Add independent Skill publication and Release attachment jobs to
  `npm-publish.yml`; use shared per-package concurrency groups across workflows.
- Keep `npm-publish-skill.yml` manually dispatched and require tags for formal runs.
- Exercise retries, mismatches, dry-runs and registry failures with injected npm/gh
  runners; validate workflow syntax and run the repository checks.
- Update maintainer instructions and fixed-version ZIP download links.
- Resolve official stable tags for checkout, setup-node, upload-artifact and
  download-artifact to commits and inspect their action.yml runtime and inputs.
  Update release and CI workflows together, retaining full SHA pins, Node 22 project
  commands, existing permissions and artifact paths. Disable automatic npm caching
  where publication jobs did not previously request a cache. Validate workflow
  syntax and run CI plus an independent artifact upload/download test on both
  platforms. Copy the build/package setup into `test-action-artifacts.yml`; keep
  transfer-test steps out of the main CI. The test workflow runs manually or on
  PR changes to its own file and uses no publication commands or environment secrets.

No runtime dependencies, governance changes, or marketplace submissions are needed.
