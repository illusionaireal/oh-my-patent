# Usage and CLI reference

[Documentation](./README-en.md) · [中文](./usage.md)

## Installation

You need Node.js 22+, npm, and a configured AI coding host. Run setup in a dedicated
patent workspace, or back up existing instruction and configuration files first.

```bash
npm install -g oh-my-patent
oh-my-patent adapt setup --workspace-dir .
oh-my-patent check --workspace-dir .
```

Setup installs generated configuration for all three adapters. To select one:

```bash
oh-my-patent adapt setup --tool claude-code --workspace-dir .
oh-my-patent adapt setup --tool codex --workspace-dir .
oh-my-patent adapt setup --tool opencode --workspace-dir .
```

Run only the command for the host you want. `setup` is `install` with an additional
completion hint; installation is an explicit step after npm installation.

| Adapter | Files written in the workspace |
|---|---|
| Claude Code | `.claude/agents/`, `.claude/commands/`, `.claude/settings.json`, `CLAUDE.md` |
| Codex | `.codex/agents/`, `.codex/commands/`, `.codex/skills/`, `AGENTS.md`, `codex.json`, `plugins/oh-my-patent/`, `.agents/plugins/marketplace.json` |
| OpenCode | `.opencode/agent/`, `.opencode/command/`, `.opencode/skills/` |

Claude Code and Codex overwrite files at generated paths, including workspace
instruction files. OpenCode skips existing files during installation.
Claude Code also copies Markdown files from the workspace's agent and command
directories into `~/.claude-best/agents/` and `~/.claude-best/commands/`,
overwriting matching names. This includes existing Markdown files in those directories.

## Platform notes

Open the same workspace in your host and load its generated integration before using
`/archimedes`. The adapter output differs by platform:

- **Claude Code:** workspace agent and command definitions plus `CLAUDE.md`.
- **Codex:** instruction files and a prompt catalog, plus a local plugin in
  `plugins/oh-my-patent/` and a marketplace manifest. Enable the local plugin using
  the plugin support in your installed Codex version. `codex.json` is a manifest
  for wrappers; it does not make every catalog entry a native callable subagent.
- **OpenCode:** agent, command, and skill definitions under `.opencode/`.

If a command is missing, confirm the workspace path, inspect the generated files,
and reload the host integration. Specialist dispatch requires the host's actual
agent capabilities; writing an agent name into a terminal does not invoke it.

Start with a topic, then use `/patent-status` to inspect progress or
`/brainstorm-resume` to revisit recorded ideas. See the
[full command catalog](./agents-en.md#commands).

## Environment checks

```bash
oh-my-patent check --workspace-dir .
oh-my-patent check --workspace-dir . --json
oh-my-patent check --workspace-dir . --mcp-status
oh-my-patent check --workspace-dir . --output readiness.md
```

Checks inspect the runtime, external tools, project state, and MCP configuration.
MCP configuration status does not establish a successful live connection.

`--mcp-add <template-id>` writes an MCP configuration template;
`--mcp-key <key=value,...>` supplies template values. Supported template IDs are
`patsnap_search`, `google_scholar`, `uspto_patent`, `cnipa_patent`, and
`semantic_scholar`. Use one check mode at a time; `--output` saves the formatted
default report, not the `--json` or `--mcp-status` result.

Mermaid rendering requires the `mmdc` executable. The PlantUML renderer sends
diagram source to its configured server; the default in
[renderer configuration](../src/core/diagram-types.ts) is
`https://www.plantuml.com/plantuml`. Retrieval availability depends on the services
configured in the host.

## CLI reference

The executable is `oh-my-patent`. In the tables below, `<project>` means one
patent project directory, such as `./projects/01-private-computing`;
`<workspace>` is the parent workspace holding host configuration and projects.
Replace angle-bracket placeholders before running a command.
`@file` reads input from a local file.

### Adapters

| Command after `oh-my-patent` | Purpose |
|---|---|
| `adapt setup --workspace-dir <workspace> [--tool <name>]` | Install workspace integration with a completion hint |
| `adapt install --workspace-dir <workspace> [--tool <name>]` | Install workspace integration |
| `adapt generate [--tool <name>] [--output <dir>] [--workspace-dir <workspace>]` | Write generated files to an output directory |
| `adapt uninstall --workspace-dir <workspace> [--tool <name>]` | Remove adapter files; see uninstall behavior below |

Names are `claude-code`, `codex`, and `opencode`; omitting `--tool` selects all.
Setup, install, and uninstall default to the current working directory.
Generate defaults to `plugins/<tool>/` inside the installed package; use an explicit
output directory to inspect files before installation:

```bash
oh-my-patent adapt generate --tool codex --workspace-dir . --output ./adapter-preview
```

Advanced usage can select a different definition package with `--plugin-dir <dir>`.

With `--output`, generated files are placed under `<dir>/<tool>/`.
Use `adapt install --prune` (or `adapt setup --prune`) to remove stale files
carrying the generator's ownership marker; unmarked files are preserved.
Set `PLANTUML_SERVER_URL` to use a private PlantUML server.

### Decision paths

| Command after `oh-my-patent path` | Purpose |
|---|---|
| `init <project>` | Initialize `.brainstorm/` and its path index |
| `record <project> --round <N> --data <json\|@file>` | Save a round's outputs, innovations, scores, and decision |
| `overview <project>` | Read the path overview |
| `node <project> <node-id>` | Read a recorded round |
| `innovation <project> <innovation-id>` | Read one innovation's history |
| `innovations <project>` | List all innovations |
| `branch <project> --from-node <id> --reason <text>` | Create an alternative path from a recorded node |
| `branches <project>` | List branches |
| `restore <project> --node <id> --innovation <id>` | Restore a recorded innovation |
| `threshold <project> --round <N>` | Evaluate the round's saved scores |
| `visualize <project> [--mode <mode>] [--target <id>] [--output <file>]` | Render a terminal-oriented visualization |
| `markdown <project> [--mode <mode>] [--target <id>] [--output <file>]` | Render a Markdown report |

Both render commands support `overview` (default), `node`, `innovation`, and
`branch`; only `visualize` supports `dashboard`. Detail modes require `--target`.
`path init` does not initialize workflow state or create a disclosure.

```bash
oh-my-patent path overview ./projects/01-private-computing
oh-my-patent path node ./projects/01-private-computing round-1
oh-my-patent path branch ./projects/01-private-computing --from-node round-1 --reason "Explore a hardware implementation"
oh-my-patent path markdown ./projects/01-private-computing --output path-report.md
```

The node in the branch example must already exist. For an interactive view, run
`oh-my-patent tui` from inside the patent project directory.

### Diagrams

| Command after `oh-my-patent diagram` | Purpose |
|---|---|
| `render <project> [--specs <json\|@file>] [--phase draft\|final]` | Render specifications to SVG/PNG and update available `MAIN.md` references |
| `status <project>` | Read the figure manifest |
| `rerender <project> --figure <id> --source <text\|@file> [--engine mermaid\|plantuml]` | Re-render one figure. With no engine, use the manifest, then the source extension, then Mermaid |

Supply an array of [FigureSpec](../src/core/diagram-types.ts) objects. Each includes
`figureId`, `figureNumber`, `title`, `description`, `diagramType`, `engine`,
`source`, and `phase`. The agent prepares these specifications; the rendering CLI
does not derive them from prose by itself.

```bash
oh-my-patent diagram render ./projects/01-private-computing --specs @./projects/01-private-computing/references/diagram-specs-draft.json --phase draft
oh-my-patent diagram status ./projects/01-private-computing
```

Without `--specs`, the CLI reads `references/diagram-specs-<phase>.json`
(`draft` when `--phase` is omitted). `--phase final` does not fall back to the
draft file; a missing file is an error. Set each specification's `phase` as well:
the CLI flag labels the result, while the manifest uses the specification value.

## Uninstallation

Back up edits made to generated files before uninstalling. Keep the CLI installed
until workspace cleanup is complete.

```bash
oh-my-patent adapt uninstall --workspace-dir .
npm uninstall -g oh-my-patent
```

Add `--tool claude-code`, `--tool codex`, or `--tool opencode` to remove one
integration. The adapters target their enumerated file paths:

- **Claude Code and Codex** delete files at those paths without comparing their
  contents. Edits to generated files, `CLAUDE.md`, `AGENTS.md`, or shared
  configuration paths can therefore be deleted.
- **Claude Code** also removes registered agent and command files from
  `~/.claude-best/`. Those files may be shared by other workspaces.
- **OpenCode** deletes a file only if it matches the current generated content;
  modified or older differing files are skipped. Review the reported skipped files.

Project deliverables such as `MAIN.md`, `references/`, `.brainstorm/`, and
`.patent/` are outside the adapters' removal lists.

Implementation: [CLI](../src/cli.ts), [Claude adapter](../src/adapters/claude/index.ts),
[Codex adapter](../src/adapters/codex/index.ts), [OpenCode adapter](../src/adapters/opencode/index.ts).
