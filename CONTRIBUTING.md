# Contributing to oh-my-patent

Thank you for considering contributing to oh-my-patent! This document provides guidelines for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Spec-First Changes](#spec-first-changes)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)
- [Generated Plugin Artifacts](#generated-plugin-artifacts)
- [Questions?](#questions)
- [License](#license)

---

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, discrimination, or personal attacks
- Publishing others' private information
- Trolling or insulting/derogatory comments
- Other conduct that could reasonably be considered inappropriate

---

## Getting Started

### Prerequisites

- Node.js 22+ and npm 9+ (`package.json` declares `engines.node >= 22`, and CI runs on Node 22. The floor is 22 rather than 18 because the runtime dependency `ink@^7`, used by the `tui` domain, itself requires Node >= 22)
- Git
- TypeScript knowledge (the project is ESM with `strict` mode enabled)
- Familiarity with patent drafting workflows (helpful but not required)

### First Contribution

Good first issues are tagged with `good first issue` (GitHub's default label, spelled with spaces). These are great for getting familiar with the codebase.

Areas where contributions are especially welcome:
- Agent prompt improvements (`src/agents/*.md`)
- Skill improvements (`src/skills/*/SKILL.md`)
- Test expansion under `tests/` — no coverage tooling is configured yet, so there is real headroom
- Documentation improvements
- Bug fixes, especially in the adapters and the generated output under `plugins/`

> **Note on jurisdictions.** The supported set is currently `CN`, `US`, and `PCT` only. Adding JP/EP/KR is not a drop-in task: it requires extending `VALID_JURISDICTIONS` in `src/core/state.ts` and the `config.jurisdiction.enum` list in `plugin.jsonc`. Note that `src/core/router.ts` already recognises `欧洲`/`EP` and `日本`/`JP` and returns those codes, which `validateState()` then rejects — that mismatch is a known bug, and correcting it is a valuable contribution in itself.

### Related Documents

- [AGENTS.md](AGENTS.md) — repository guidelines for AI coding agents (structure, style, and PR expectations)
- [CONSTITUTION.md](CONSTITUTION.md) — governing principles for repository boundaries, evidence, security, and naming
- [specs/](specs/) — specifications live here (see [Spec-First Changes](#spec-first-changes))
- [docs/README.md](docs/README.md) — documentation index, including the historical [docs/specs/](docs/specs/) snapshot

---

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub first, then:
git clone https://github.com/YOUR_USERNAME/oh-my-patent.git
cd oh-my-patent
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build

```bash
npm run build
```

### 4. Run Tests

```bash
npm test
```

### 5. Try CLI Locally

```bash
node dist/cli.js --help
```

### 6. Familiarise Yourself With the Generated Artifacts

`plugins/` holds generated output for Claude Code, Codex, and OpenCode. It is not versioned — `.gitignore` lists it, so the tree exists only in your working copy. Read [Generated Plugin Artifacts](#generated-plugin-artifacts) before regenerating it.

---

## Project Structure

```
oh-my-patent/
├── src/
│   ├── agents/           # Agent role definitions: 14 prompts (.md) + archimedes.ts (routing)
│   ├── commands/         # 9 slash-command prompts (.md) + 6 handler modules (.ts)
│   ├── core/             # Engine: workflow, state, validation, path graph/persistence,
│   │                     #   diagram rendering/insertion, threshold config, schemas
│   ├── adapters/         # Portable-def loader + Claude Code / Codex / OpenCode generators
│   ├── skills/           # 6 skills, each a <id>/SKILL.md plus optional <id>.ts
│   └── tui/              # Terminal UI (Ink + React): app.tsx, cli.ts
├── tests/
│   ├── unit/             # Unit tests (including unit/core/ for schema parsers)
│   ├── integration/      # Integration tests
│   └── e2e/              # End-to-end tests
├── specs/                # CANONICAL specifications — one directory per feature (Spec Kit convention)
│   └── 001-review-remediation/   # spec.md (what/why), plan.md (how), tasks.md (verdict ledger)
├── docs/                 # Documentation: README, workflow diagrams, historical specs
│   └── specs/            # ⚠️ v0.1.0 historical snapshot (frozen 2026-06-17) — do not extend
├── plugins/              # GENERATED artifacts (claude-code/, codex/, opencode/) — gitignored
├── scripts/hooks/        # Git hook installers
├── .github/workflows/    # CI
├── plugin.jsonc          # Portable definition (agents / skills / commands / config) — source of truth
├── CONSTITUTION.md       # Governing principles for this repository
├── AGENTS.md             # Guidelines for AI coding agents
└── tsconfig.json
```

### Key Modules

- **core/brainstorm-path.ts**: Decision-path (DAG) data structures and validation guards
- **core/workflow.ts**: Workflow state machine — `WorkflowStage` and the `VALID_TRANSITIONS` table
- **core/state-manager.ts**: Persistence of `.patent/state.json` (`saveState` / `loadState`) — *not* the state machine itself
- **core/threshold-config.ts**: Score thresholds and the `ITERATE` / `PASS_TO_DRAFT` / `FORCE_PASS` decisions
- **core/diagram-renderer.ts**: Mermaid rendering via local `mmdc`, PlantUML via a remote server
- **core/init-checker.ts**: Environment readiness checks (MCP servers, external tools, runtime)
- **adapters/loader.ts**: Loads `plugin.jsonc` and `.opencode/` into the portable definition
- **adapters/**: Cross-tool configuration generation for Claude Code, Codex, and OpenCode
- **agents/archimedes.md**: Main orchestrator agent prompt

---

## Spec-First Changes

Substantive changes to this repository start from a written specification, not from code. The
specification is what makes a change reviewable: it states the problem, the acceptance criteria,
and — in the same repository — the evidence that the criteria were met.

Specifications live in the **repository-root `specs/` directory**, one directory per feature,
named `{NNN}-{slug}` (Spec Kit convention, so the directories sort chronologically):

```
specs/
└── 001-review-remediation/     # example: the repository remediation effort
    ├── spec.md                 # WHAT and WHY — requirements, acceptance criteria, decisions
    ├── plan.md                 # HOW — per-cycle technical approach, file-level changes
    └── tasks.md                # evidence ledger — per-requirement verdicts, cycle records
```

The flow is `spec.md` → `plan.md` → `tasks.md` → implementation. Each step is reviewed before
the next one starts, and `tasks.md` is a ledger rather than a to-do list: every requirement
carries an explicit verdict backed by pasted command output, and every remediation cycle is
recorded with its own commit so it can be reverted on its own.

- **`specs/{NNN}-{slug}/` is the canonical location.** New specifications go here and nowhere
  else. This is a governance rule, not a preference — see [CONSTITUTION.md](CONSTITUTION.md)
  (Operational Constraints).
- **`docs/specs/` is a historical snapshot.** It holds the v0.1.0 product specs, frozen on
  2026-06-17, and is marked as such. Do not add new specifications there; read it as background
  only. The current implementation is `src/` and `plugin.jsonc`, not that directory.
- **Unverifiable numbers get deleted, not estimated.** If a figure cannot be reproduced from a
  stated command, remove it ([CONSTITUTION.md](CONSTITUTION.md), Principle II).
- **Say what is true today.** No document may claim a gate that does not exist: anything
  asserted as CI-enforced must first exist in [`.github/workflows/`](.github/workflows/)
  (Constitution, Operational Constraints).

---

## Making Changes

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation only
- `test/` - Test improvements
- `refactor/` - Code refactoring
- `chore/` - Maintenance, dependency bumps, and release preparation (e.g. `chore/release-0.3.0`)

Examples:
- `feature/add-kr-jurisdiction`
- `fix/codex-command-skill-uninstall`
- `docs/improve-skill-examples`

### Code Style

We use TypeScript strict mode. Key conventions:

```typescript
// ✅ Good: Explicit types, clear naming
export function createInnovationScore(
  novelty: number,
  creativity: number
): InnovationScore {
  return { novelty, creativity, timestamp: Date.now() };
}

// ❌ Avoid: Implicit any, unclear naming
export function create(n, c) {
  return { n, c, t: Date.now() };
}
```

**Conventions**:
- Two-space indentation
- Use camelCase for variables/functions
- Use PascalCase for types/interfaces/classes
- Use `UPPER_SNAKE_CASE` for module-level constants
- Prefer `const` over `let`
- Always specify function return types
- Use `.js` extensions in ESM imports (the project compiles to ESM)
- Add JSDoc comments for public APIs

> **Tooling note.** There is no ESLint, Prettier, or other formatter/linter configured. `npm run lint` runs `npx tsc --noEmit` — a **type check**, not a lint. Match the formatting of the surrounding file; that is the only style gate. The `style` commit type is therefore rarely applicable.

### Adding a New Agent

1. Create `src/agents/your-agent.md`. The loader accepts two frontmatter styles —
   `src/adapters/loader.ts` tries YAML first, then falls back to HTML comments — and
   **13 of the 14 existing agents use the HTML-comment style**, so prefer it:

```markdown
<!-- Agent: your-agent | Role: subagent -->

<!-- Permissions: write, edit -->

<!-- Sub-agent — invoked via Agent tool with subagent_type="your-agent" -->


You are [Agent Name], responsible for...

## Responsibilities
- Task 1
- Task 2

## Constraints
- Must call real sub-agents
- Must persist results to references/

## Example
[Show usage example]
```

   `Role` is `primary` or `subagent`; `Permissions` is a comma-separated list drawn from
   `write`, `edit`, `bash`, `mcp`, `task`, `skill`. (For reference, YAML frontmatter is
   also parsed — see `src/agents/patent-diagram-generator.md` for the one existing example.)

2. Register in `plugin.jsonc`:

```json
{
  "agents": [
    {
      "id": "your-agent",
      "name": "Your Agent",
      "description": "Brief description",
      "file": "src/agents/your-agent.md"
    }
  ]
}
```

3. Add or extend a test. Agent *prompts* have no dedicated unit test today, so if your
   agent adds runtime behaviour in `src/agents/*.ts`, test it under `tests/unit/`. Verify
   registration end-to-end with `npx vitest run tests/e2e/plugin-load.test.ts`.

4. Regenerate the output locally (`npm run build && node dist/cli.js adapt generate`) and
   review the diff — see [Generated Plugin Artifacts](#generated-plugin-artifacts).

### Adding a New Skill

1. Create `src/skills/your-skill/SKILL.md`. The **YAML frontmatter is mandatory and
   CI-enforced** — `tests/unit/skill-frontmatter.test.ts` asserts that every registered
   skill's prompt starts with `---\nname: <id>\ndescription: ...\n---\n`:

```markdown
---
name: your-skill
description: Brief description
---

## Overview
## Usage Examples
## Input / Output Format
## Integration Notes
```

2. Optionally implement runtime helpers in `src/skills/your-skill.ts`. Only 2 of the 6
   existing skills have a companion module (`jurisdiction.ts`, `quality-gate.ts`); the
   rest are prompt-only:

```typescript
export interface YourSkillInput {
  // Define inputs
}

export interface YourSkillOutput {
  // Define outputs
}

export function yourSkill(input: YourSkillInput): YourSkillOutput {
  // Implementation
}
```

3. Register in `plugin.jsonc` (`{ "id": "your-skill", "name": "Your Skill", "file": "src/skills/your-skill/SKILL.md" }`)

4. Run `npm test` — the frontmatter test will fail if step 1 is malformed

---

## Testing

### Running Tests

```bash
# All tests
npm test

# Specific test file
npm test tests/unit/workflow.test.ts

# Watch mode
npm run test:watch
```

### Test Categories

1. **Unit Tests** (`tests/unit/`)
   - Test individual functions/modules
   - Mock external dependencies
   - Fast execution (<100ms per test)

2. **Integration Tests** (`tests/integration/`)
   - Test module interactions
   - May use real file system
   - Moderate execution (100-500ms)

3. **E2E Tests** (`tests/e2e/`)
   - Test complete workflows
   - Real CLI execution
   - Slower (>1s)

### Writing Good Tests

```typescript
// ✅ Good: Descriptive name, clear arrange/act/assert
test('should merge innovation nodes with weighted average scores', () => {
  // Arrange
  const node1 = createNode({ novelty: 8, creativity: 7 });
  const node2 = createNode({ novelty: 6, creativity: 9 });
  
  // Act
  const merged = mergeNodes([node1, node2]);
  
  // Assert
  expect(merged.scores.novelty).toBe(7);
  expect(merged.scores.creativity).toBe(8);
});

// ❌ Avoid: Vague name, no clear structure
test('test merge', () => {
  const result = mergeNodes([n1, n2]);
  expect(result).toBeDefined();
});
```

### Test Coverage Goals

These are **review targets, not CI gates**. No coverage tooling is configured
(`@vitest/coverage-*` is not a dependency, and there is no `vitest.config` or
`test:coverage` script), so coverage cannot currently be measured or enforced —
treat the numbers as guidance for where to focus new tests.

- Core modules: >80%
- Adapters: >70%
- CLI commands: >60%
- Overall: >70%

---

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Add/update tests
- `chore`: Build, dependencies, tooling

### Examples

```bash
feat(jurisdiction): add Korea (KR) jurisdiction rules

- Add KR to VALID_JURISDICTIONS in src/core/state.ts
- Add KR to config.jurisdiction.enum in plugin.jsonc
- Add KR examination process and claim format templates to the jurisdiction skill
- Update jurisdiction.test.ts with KR cases

Closes #42

---

fix(adapters): normalize cross-platform skill generation

Generated skill paths used POSIX separators, which produced invalid paths on
Windows. Emit them with `path.join` so both platforms resolve identically.

Fixes #1

---

fix(state-manager): close the save window in saveState

`unlinkSync` followed by `renameSync` leaves a brief interval on Windows where
`state.json` does not exist. Replace the pair with an atomic move.

Closes #12

---

docs(skill): improve prior-art-search examples

Add 3 practical examples with real query patterns
```

### Commit Message Rules

- Subject line: ≤72 characters
- Use imperative mood ("add" not "added")
- No period at end of subject
- Body: wrap at 72 characters
- Reference issues with `Closes #123` or `Fixes #456`

---

## Pull Request Process

### Before Submitting

1. ✅ All tests pass (`npm test`)
2. ✅ TypeScript compiles (`npm run build`)
3. ✅ Type check passes (`npm run lint` — this runs `tsc --noEmit`; there is no separate linter)
4. ✅ Code formatted consistently with surrounding files
5. ✅ Documentation updated if needed
6. ✅ Added tests for new features
7. ✅ Changes to workflow logic or orchestration definitions reviewed against [CONSTITUTION.md](CONSTITUTION.md)
8. ✅ If `plugin.jsonc`, `src/agents/`, `src/commands/`, or `src/adapters/` changed, the output was regenerated locally and the diff reviewed — see [Generated Plugin Artifacts](#generated-plugin-artifacts)

> Note: `.github/` currently contains only the workflow files (`ci.yml`, `npm-publish.yml`), so GitHub does **not** auto-populate a PR template. Copy the template below into your PR description.

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings introduced
```

### Review Process

1. Maintainer reviews code
2. Address feedback with new commits
3. Maintainer approves and merges

> **Automated checks run on every pull request.** `.github/workflows/ci.yml` is
> triggered by `pull_request` and by pushes to `master`; it runs `npm ci`,
> `npm run lint`, and `npm test` (which builds via its `pretest` hook) on Node 22.
> You can see the run under the PR's **Checks** tab.
>
> CI is a safety net, not a substitute: `npm test`, `npm run build`, and
> `npm run lint` locally are still the fastest feedback loop.

**Review turnaround**: best effort, typically within 48 hours

---

## Release Process

Releases follow [Semantic Versioning](https://semver.org/):

- **Major** (1.0.0 → 2.0.0): Breaking changes
- **Minor** (1.0.0 → 1.1.0): New features, backward compatible
- **Patch** (1.0.0 → 1.0.1): Bug fixes

### Release Checklist (Maintainers)

Publishing is **automated by CI** — do not run `npm publish` by hand.

1. Update the version in `package.json`, `package-lock.json` and `plugin.jsonc`
2. Update `CHANGELOG.md`
3. Run the full suite locally: `npm test`, `npm run build`, `npm run lint`
4. Commit the changes and regenerated Skill manifest, then merge after CI passes
5. Create and push a tag matching the package version (`VERSION` or `vVERSION`)
6. Publish a GitHub Release from the tag

Step 6 triggers **Publish Release** (`.github/workflows/npm-publish.yml`) on
`release.published`, including publication of a draft Release. One build verifies
both npm archives and the Skill ZIP. Three independent jobs publish the plugin,
publish `oh-my-patent-skill`, and attach the two TGZs, ZIP, `SHA256SUMS`, and release
manifest. The npm jobs retain the `PRE` environment and `NPM_TOKEN`; only the
attachment job has `contents: write` and uses GitHub's built-in token.

Publication uses verified tarballs with `--ignore-scripts`. Retries skip only
byte-identical published packages/assets; different existing bytes fail without
replacement. See [automatic Release publication](docs/skill.md#automatic-release-publication)
for dry-runs, retained artifacts, and recovery steps.

> **OIDC / provenance is not enabled yet.** Publishing still uses a long-lived
> `secrets.NPM_TOKEN`. Migrating to [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers)
> requires configuring a trusted publisher on npmjs.com — an out-of-repo action. Adding
> `id-token: write` + `--provenance` before that configuration exists would break the
> release, so it is deliberately deferred.

> **Supply chain.** All Actions are pinned to commit SHAs (a moving tag can be
> repointed), and each workflow declares an explicit least-privilege `permissions` block.
> See the README's *Dependency audit* section for the current `npm audit` numbers.

For a trial, use manual `workflow_dispatch` with the default `dry_run: true`.
Formal manual runs require a version tag and an existing Release. The standalone
Skill workflow remains available for Skill-only publication or retry.

> **Version drift check.** Generated manifests under `plugins/` used to carry their own version string, and they did drift — the Codex plugin manifest shipped `0.1.0` while `package.json` was at `0.3.0`. They are no longer committed, so it cannot drift in the repository any more; before tagging, just confirm `plugin.jsonc` and `package.json` agree.

---

## Generated Plugin Artifacts

`plugins/` holds **generated output**, not hand-written source. It contains the
Claude Code (`.claude/`), Codex (`.codex/`, `plugins/oh-my-patent/`), and OpenCode
(`.opencode/`) configuration produced by the CLI from `plugin.jsonc`, the MCP template
`opencode.jsonc.example`, and the prompt files in `src/agents/`, `src/commands/`, and
`src/skills/`.

**It is not versioned.** `.gitignore` lists `plugins/`, so this tree exists only in
your working copy. That is deliberate: committing output whose inputs are not
committed makes the repository unreproducible, and this repository lived through the
consequences — the committed tree had been generated once and never regenerated, so
it still carried five agents that `plugin.jsonc` no longer declared. See
[`specs/001-review-remediation/`](specs/001-review-remediation/) (DEC-1) for the record.

To produce it:

```bash
npm run build
node dist/cli.js adapt generate          # writes plugins/<tool>/ per adapter
```

### Inputs

Generation reads three tracked sources, so a clean clone produces a complete tree:

| Input | Provides |
|---|---|
| `plugin.jsonc` | agents, skills, commands, config schema |
| `src/agents/`, `src/commands/`, `src/skills/` | prompt text |
| `opencode.jsonc.example` | the 8 MCP server definitions (a real `opencode.jsonc` in your workspace wins over the template) |

`<workspace>/.opencode/agent/*.md` is an optional override. When present it takes
precedence over `plugin.jsonc` for the agents it defines; when absent — the normal
case on a clean clone — the loader falls back silently to the tracked sources. That
directory is intentionally not committed either.

### Stale output

`generate()` only writes, so output produced by an earlier definition lingers until
it is pruned:

```bash
node dist/cli.js adapt install --workspace-dir <dir> --prune
```

A file is deleted only when it is both absent from the current output list *and*
carries an oh-my-patent generated marker. Files you wrote yourself are reported and
left alone.

### Known limitation: `adapt generate --output`

`adapt generate --output <dir>` makes all three adapters write into `<dir>` instead of
into separate `plugins/<tool>/` subdirectories, so whichever adapter runs last wins.
Omit `--output` to get the per-tool layout.

`plugins/` is also excluded from the published npm package (`package.json` `files`
uses an allow-list that omits it), so none of this affects consumers.

---

## Questions?

- **Issues**: Open an issue on GitHub — this is the supported channel
- **Discussions**: GitHub Discussions is **not enabled** on this repository
- **Wiki**: Enabled on GitHub, but unused; prefer `docs/` in the repository

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to oh-my-patent! 🎉
