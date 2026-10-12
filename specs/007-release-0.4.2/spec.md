# Release 0.4.2 and README refresh

Prepare a separate PR on `master` after merged PRs #12 and #13.

- Set package, root lockfile entries, plugin and generated Skill metadata to 0.4.2.
  The standalone package must inherit the same version through the existing builder.
- Use the concise GitHub Skills CLI source in English/Chinese and standalone READMEs
  and the installation guide; explain Copy, host selection and repository versus npm versions.
- Remove the fixed README ZIP download assumption, link published Releases, and add
  bilingual release notes covering retrieval/drawing readiness and upgrade steps.
- Document the implemented 30-second choice default and host-enforced 60-second local
  render deadline accurately. Retain explicit external consent and human acceptance.
- Regenerate tracked Skill metadata and run repository/packaging checks. Create the PR;
  merging, tagging and actual publication are outside this change.

No runtime behavior, dependencies, project schemas or host acceptance claims change.
