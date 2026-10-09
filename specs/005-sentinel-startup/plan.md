# Implementation plan

- Bundle a dependency-free check entry with esbuild, reusing the core init checker
  and CLI check handler. Distribute one owned script per host under
  `.oh-my-patent/runtime/<host>/check.mjs`.
- Derive workspace/host from the installed script location, never package cache or cwd.
  Generate deterministic prompt paths and preserve edited scripts at uninstall.
- Extract the CLI check handler so public CLI and installed runtime share behavior,
  including JSON report saving and explicit host selection.
- Fix sentinel metadata; replace source-tree CLI examples; require real capability
  observations and persisted reports before research/resume.
- Load the portable sentinel explicitly from the Skill activation gate.
- Build and verify archives, test relocation without dependencies, and record CI.
  Real Claude Code/Codex/OpenCode model traces require their host sessions; none
  are available in this execution environment.
