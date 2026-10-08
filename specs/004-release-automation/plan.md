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

No runtime dependencies, governance changes, or marketplace submissions are needed.
