# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

oh-my-patent is a CLI tool that orchestrates 11 specialized AI agents (defined as markdown prompts in `src/agents/`) to turn a technical idea into a complete patent disclosure document. The CLI itself does **not** run the agents — it manages the state, decision path, diagrams, and adapter configs that the agents (running in the user's editor) read and write.

The agent prompts live in `src/agents/*.md` and are consumed by editors via adapters (`.claude/` for Claude Code, `.codex/` for Codex). The TypeScript code is the runtime bridge those agents call.

## Commands

```bash
npm run build        # tsc → dist/  (required before running the CLI from source)
npm test             # vitest run — full suite
npm test:watch       # vitest in watch mode
npm test tests/unit/        # unit tests only
npm test tests/integration/cli-commands.test.ts   # single test file
npm run lint         # tsc --noEmit (the project uses strict mode, zero errors expected)

node dist/cli.js     # run the CLI from a source build (the published bin is `oh-my-patent`)
npx -p . oh-my-patent  # alternative way to run from local build
```

The CLI has four domains — `path`, `diagram`, `adapt`, `tui` — each with subcommands. See `node dist/cli.js --help` for the full reference.

### Quick Start for Local Development

```bash
git clone https://github.com/illusionaireal/oh-my-patent
cd oh-my-patent
npm install
npm run build
node dist/cli.js adapt setup --workspace-dir /path/to/test/project
```

## Architecture

### Two-layer model: definitions vs. engine

- **Orchestration layer** (`plugin.jsonc`, `opencode.jsonc`, `src/agents/*.md`, `src/skills/*/SKILL.md`, `src/commands/*.md`): tool-agnostic definitions of agents, skills, and commands. Pure data and prompt text.
- **Engine layer** (`src/core/`, `src/cli.ts`, `src/commands/*.ts`): the TypeScript runtime that operates on `.brainstorm/`, `.patent/`, `figures/`, and `references/` directories inside a user's patent project.

The `src/adapters/` layer converts orchestration definitions into tool-specific configs (Claude Code's `.claude/agents/`, Codex's `.codex/skills/`, etc.). `adapters/types.ts` defines the `PortableDef` canonical format; `adapters/loader.ts` parses `plugin.jsonc` + the markdown files into it; `adapters/claude/` and `adapters/codex/` implement `ToolAdapter`.

### Workflow state machine (`src/core/state.ts`, `src/core/workflow.ts`)

10 stages with explicit transitions:

```
INIT → RESEARCH → BRAINSTORM_R1 → BRAINSTORM_R2 → DRAFT → DIAGRAM_DRAFT → QA_LOOP → FINAL_REVIEW → DIAGRAM_FINAL → DONE
```

Notable: `DRAFT → DIAGRAM_DRAFT → QA_LOOP` (figures drafted before QA), `QA_LOOP → FINAL_REVIEW | DRAFT` (QA can loop back to draft), `FINAL_REVIEW → DIAGRAM_FINAL | QA_LOOP`.

State is persisted atomically to `<project>/.patent/state.json` (temp file + rename in `state-manager.ts`). Validation rejects unknown stages and jurisdictions.

### Decision path tracking (`src/core/brainstorm-path.ts`, `src/core/path-persistence.ts`, `src/core/path-graph.ts`)

A DAG of brainstorm rounds stored in `<project>/.brainstorm/`:
- `path.json` — metadata, edges, current node, final decision
- `nodes/round-{n}.json` — per-round scores, innovations, agent outputs, decisions
- `snapshots/round-{n}-innovations.json` — innovation history snapshots
- `branches/{branchId}/` — forked node copies for alternative explorations

Supports forking (`path branch --from-node`), reviving abandoned innovations (`path restore`), and threshold-based exit decisions. Writes are atomic (temp + rename). `path-graph.ts` handles the forking algorithms.

### Threshold model (`src/core/threshold-config.ts`)

Quantitative gates for brainstorm exit. Defaults (in `DEFAULT_THRESHOLD_CONFIG`):
- `passToDraft: 8.5` — minimum weighted composite score
- `redLines.novelty: 6.0`, `redLines.creativity: 6.0` — single-dimension floors
- `forceIteration.maxRounds: 3`, `minImprovement: 0.3`

Note: the README mentions "Novelty ≥ 7" and "max 6 rounds" — the actual code defaults differ. Trust the code.

### Diagram pipeline (`src/core/diagram-renderer.ts`, `src/core/diagram-inserter.ts`)

Renders Mermaid/PlantUML source to SVG+PNG into `<project>/figures/`, then rewrites MAIN.md figure references in place. `diagram-renderer.ts` shells out to the Mermaid CLI and a PlantUML server. `figures-manifest.json` tracks rendered figures.

**External dependencies**: Requires `mmdc` (Mermaid CLI) and a PlantUML server for rendering. These are not bundled — the system shells out to them.

### CLI entry (`src/cli.ts`)

A single dispatcher with four domains. Uses `getPluginDir()` (ESM `import.meta.url` resolution) to locate the package root — this works for global installs, `npm link`, and `node dist/cli.js`. The `adapt install` path also copies agent/command files to `~/.claude-best/` so they load regardless of where Claude Code starts.

## File naming conventions (project runtime)

When a user runs oh-my-patent in their patent project, agents write outputs to `references/` with strict naming:
- `references/landscape_{topic_slug}.md` — prior art search (main landscape)
- `references/landscape_round{r}.md` — multi-round search results
- `references/feature-matrix_{topic_slug}.md` — feature comparison matrix
- `references/problem-map_{topic_slug}.md` — technical problem mapping
- `references/brainstorm_round{r}_{agent-id}.md`
- `references/argue_round{r}_{agent-id}.md`

`.brainstorm/` and `.patent/` are git-tracked; they are the auditable record of decisions.

## Agent invocation

Agents are invoked by the user's editor (via `archimedes` routing), not by the CLI. Archimedes reads `.patent/state.json` and dispatches to the appropriate specialist agent based on `current_stage`. The agent prompts in `src/agents/*.md` are the source of truth for what each agent does.

To invoke a specialist programmatically (in a custom integration), use the Agent tool with `subagent_type: "<agent-id>"`.

## Conventions worth knowing

- **TypeScript strict mode**, ESM (`"type": "module"`), `moduleResolution: "bundler"`. Imports between source files use explicit `.js` extensions (e.g. `from './core/state.js'`) even though the source is `.ts` — this is required by the ESM + bundler-resolution setup.
- **TSX/JSX**: `tui/` uses Ink+React. `tsconfig.json` sets `jsx: "react-jsx"`.
- **Atomic writes**: state and path persistence write to a temp file then rename. Don't bypass this pattern.
- **Safe uninstall**: adapter uninstall reads from manifest files (`.claude/manifest.json`, `.codex/manifest.json`) and removes only the exact paths that were generated — never `readdir + unlink` traversal.
- **Patent disclosure writing style** (when editing MAIN.md or agent prompts that produce disclosure content): headings use `#` for document title only, `##`/`###` for sections; formulas use Word-compatible linear form (`$S_(load)$` not `$S_{\mathrm{load}}$`); avoid `\operatorname`, `\mathrm`, `\left`, `\right`, `\!`; keep image tags and captions on separate lines; follow the standard template (sections 零 through 十一); references use `[R#]` notation.
- **Jurisdiction**: default `CN`; supported `CN`, `US`, `PCT` (see `plugin.jsonc` config and `src/skills/jurisdiction/`).

## Testing Strategy

- Unit tests in `tests/unit/` cover core logic (state, path tracking, thresholds, diagram rendering)
- Integration tests in `tests/integration/` test CLI commands end-to-end
- Run `npm test` before committing — the project expects zero test failures
- Test files mirror source structure: `tests/unit/core/state.test.ts` tests `src/core/state.ts`

## Common Gotchas

- **ESM `.js` imports**: If you add a new TypeScript file, remember to import it with `.js` extension, not `.ts`
- **CLI path resolution**: `getPluginDir()` in `src/cli.ts` uses `import.meta.url` to locate the package root — works for global installs, `npm link`, and local builds
- **Adapter manifest safety**: Never modify adapter uninstall logic to traverse directories. Always use the exact paths from manifest files
- **State transitions**: The workflow state machine has explicit allowed transitions in `src/core/workflow.ts`. Invalid transitions are rejected
- **Threshold discrepancy**: The README mentions "Novelty ≥ 7" but the actual code default in `threshold-config.ts` is `6.0`. Trust the code
