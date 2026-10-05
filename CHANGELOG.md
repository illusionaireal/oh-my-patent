# Changelog

All notable changes to this project are documented here.

## [0.4.0] - 2026-10-05

### Added

- Add an opt-in portable Agent Skill installation mode alongside the original Archimedes plugin.
- Bundle role/capability resources, templates and a self-contained Node.js >=22 runtime in one portable Skill.
- Add the independent `oh-my-patent-skill` npm package and manual publication workflow; its version inherits `oh-my-patent`.
- Verify plugin/Skill npm tarballs and Skill ZIPs, their inventories, checksums and relocated runtimes in CI.

### Changed

- Set package, lockfile, plugin and generated Skill versions to `0.4.0`.
- Trigger the original npm workflow on `release.published`, including a Release published from a draft.
- Record first-wave host acceptance as maintainer-confirmed and retain the stable publication gate.

### Fixed

- Preserve original plugin files and user customizations during Skill installation, removal, rollback and plugin pruning.
- Recover interrupted Skill installation transactions without leaving partial writes or discarding later user edits.
- Coordinate portable project writes, enforce confidentiality consent and audit boundaries, and invalidate stale figure reviews.

### Compatibility and release scope

- The original plugin remains the default with all 14 agents, 6 skills and 9 commands.
- First-wave acceptance is based on the maintainer's 2026-10-05 confirmation; no host versions or scenario traces are invented.
- Wave-two hosts, combined plugin/Skill activation, optional image providers and third-party Skill installers remain unverified.
- See [bilingual release notes](docs/releases/0.4.0.md) and [compatibility](docs/compatibility.md). Release preparation does not publish npm packages.

## [0.3.3] - 2026-09-27

### Fixed

- Generate native Claude MCP configuration, skills and main-thread delegation permissions.
- Preserve Codex user instructions, modified files and unrelated marketplace registrations.
- Reject linked adapter destinations and prevent readiness checks from deleting existing directories.
- Validate nodes and rounds before persistence; protect branch history from malformed indexes, missing nodes and collisions.
- Enforce OpenCode MCP restrictions and retain backups when upgrading generated prompts.
- Correct jurisdiction matching, final diagram specification defaults and generated version metadata.

### Compatibility and remaining review scope

- Codex preserves an existing root `AGENTS.md`; integrate plugin instructions manually when needed.
- OpenCode upgrades marked generated files and retains their previous contents in `.opencode/.oh-my-patent-backups/`.
- Deferred findings and unverified host, concurrency and permission scenarios remain documented in
  [the review ledger](specs/003-audit-safety-fixes/tasks.md). This version does not claim all audit findings are resolved.
- Version 0.3.2 is skipped because that repository tag already exists, although its package manifest still declares 0.3.1.

## [0.3.1] - 2026-09-16

### Added

- Added the project logo system under `assets/brand/`: the primary lockup (1900x600), the 512x512 primary mark, and a multi-size favicon, with usage guidance in `assets/brand/README.md`.

### Changed

- Branded the English and Chinese README headers with the primary lockup.
- Published `assets/` in the npm package so the README images resolve on the package page.
- Bumped the package version to 0.3.1.

### Verification

- `npm run build` passing.
- `npm run lint` passing.
- 132 tests passing.
- `npm pack --dry-run` passing, including `assets/brand/`.

## [0.3.0] - 2026-09-01

### Added

- Added a native OpenCode adapter.
- Added OpenCode agent generation under `.opencode/agent/`.
- Added OpenCode slash-command generation under `.opencode/command/`.
- Added OpenCode skill generation under `.opencode/skills/`.

### Changed

- Preserved existing OpenCode files during installation.
- Preserved modified or user-owned OpenCode files during uninstall.
- Updated documentation for Claude Code, Codex, and OpenCode support.
- Corrected repository metadata and documentation links.

### Verification

- `npm run build` passing.
- `npm run lint` passing.
- 132 tests passing.
- `npm pack --dry-run` passing.

## [0.2.1] - 2026-08-26

### Fixed

- Added portable skill frontmatter for Codex and OpenCode compatibility.
- Corrected Claude Code agent tool permissions and YAML generation.
- Prevented Codex agent and command skill name collisions.

### Verification

- `npm run build` passing.
- `npm run lint` passing.

## [0.2.0] - 2026-07-22

### Added

- Added structured schemas for landscape search results, feature matrices, and problem maps.
- Added initialization checks and a patent-init sentinel for resumable workflows.
- Added MCP configuration support for Claude Code, Codex, and OpenCode adapters.
- Added retrieval workflow commands and fallback routing behavior.
- Added unit and integration coverage for the new retrieval and initialization behavior.

### Changed

- Improved patent search query extraction and output validation.
- Updated the Archimedes workflow and retrieval-related agent and skill definitions.
- Removed tracked dependency artifacts from the repository; dependencies are installed from the lockfile.

### Verification

- 123 tests passing.
- `npm run build` passing.
- `npm run lint` passing.
