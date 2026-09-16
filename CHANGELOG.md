# Changelog

All notable changes to this project are documented here.

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
