# Architecture and development

[Documentation](./README-en.md) · [中文](./architecture.md)

## Four layers

| Layer | Responsibility | Implementation |
|---|---|---|
| Portable definitions | Register agents, skills, commands, and defaults | [plugin.jsonc](../plugin.jsonc), `src/agents/`, `src/skills/`, Markdown command definitions |
| Host adapters | Generate Claude Code, Codex, and OpenCode integrations | [src/adapters/](../src/adapters/) |
| Runtime core | Manage workflow state, decision paths, thresholds, validation, and figure rendering | [src/core/](../src/core/) |
| User interfaces | Expose runtime operations through CLI commands and a terminal UI | [src/cli.ts](../src/cli.ts), [src/commands/](../src/commands/), [src/tui/](../src/tui/) |

The host executes the agent instructions. Runtime modules supply operations invoked
during that work; the workflow machine validates stage transitions.
Adapter generation alone does not execute the patent workflow.

## Repository layout

| Path | Contents |
|---|---|
| `src/agents/` | Specialist and orchestrator instructions |
| `src/skills/` | Portable skill definitions |
| `src/commands/` | Command prompts and TypeScript command handlers |
| `src/adapters/claude/` | Claude Code adapter |
| `src/adapters/codex/` | Codex adapter |
| `src/adapters/opencode/` | OpenCode adapter |
| `src/core/` | Workflow, persistence, scoring, validation, and diagrams |
| `src/tui/` | Ink/React terminal interface |
| `plugins/` | Adapter output. Gitignored (see `.gitignore`); not a committed source tree |
| `tests/` | Unit, integration, and end-to-end tests |
| `docs/` | Guides, workflow references, and design documents |
| `assets/brand/` | Brand artwork and usage rules |
| `plugin.jsonc` | Portable registry and default configuration |
| `dist/` | TypeScript build output |

Workspace files such as `.opencode/` are produced by setup. They are distinct from
adapter source directories. The tracked repository does not contain a root
`opencode.jsonc`; generated paths are listed in the [installation guide](./usage-en.md#installation).

## Project files

A patent workspace contains host configuration and a `projects/` directory by
default. Each topic uses a project directory such as `projects/01-private-computing/`.
Paths below are relative to that project.

| Path | Role |
|---|---|
| `MAIN.md` | Patent disclosure |
| `conversation.md` | Conversation record maintained by the workflow |
| `references/` | Prior-art evidence, specialist outputs, reviews, and figure specifications |
| `.patent/state.json` | Workflow state |
| `.brainstorm/path.json` | Main decision-path index |
| `.brainstorm/nodes/round-N.json` | Saved outputs, innovations, scores, and decision for a round |
| `.brainstorm/snapshots/round-N-innovations.json` | Innovation snapshots |
| `.brainstorm/branches/` | Branch metadata and path records |
| `figures/` | Diagram source, SVG, PNG, and `figures-manifest.json` |

These files are created as their corresponding operations run; installing an adapter
does not create a complete patent project. `path init` initializes the decision-path
store only. The default `projectDir` is `./projects`; the default jurisdiction is `CN`.

## Decision history

The path index points to recorded rounds and evolution edges. Each round stores
agent-output references, innovation snapshots, scores, and a decision. Branches
retain their origin so alternative directions remain traceable.
See [path types](../src/core/brainstorm-path.ts),
[persistence](../src/core/path-persistence.ts), and
[branch operations](../src/commands/path-branch.ts).

Workflow state and decision paths are separate stores. Neither is a backup of every
project file. Continuing work uses the saved state together with the disclosure
and supporting documents.

## Development

From a full repository checkout:

```bash
npm install
npm test
npm run build
npm run lint
node dist/cli.js --help
```

Use `npm run test:watch` during development, or target an existing suite with
`npm test -- tests/unit/workflow.test.ts`.
The CLI uses TypeScript ESM; `build` compiles to `dist/`, and `lint` runs
TypeScript checking without emitting files.

Follow [AGENTS.md](../AGENTS.md) and [CONTRIBUTING.md](../CONTRIBUTING.md).
Run test, build, and lint before requesting review. Test results belong in the
verification report; avoid manually maintained passing-test counts in README badges.
