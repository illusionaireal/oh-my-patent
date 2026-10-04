> **0.4.0 alpha preview:** Adds an optional portable Skill installation mode. The original Archimedes plugin remains the default with 14 agents, 6 skills, and 9 commands. See [installation modes](docs/skill.md) and [compatibility status](docs/compatibility.md). Host acceptance and publication are pending.

# oh-my-patent

[![npm version](https://img.shields.io/npm/v/oh-my-patent.svg)](https://www.npmjs.com/package/oh-my-patent)
[![npm downloads](https://img.shields.io/npm/dm/oh-my-patent.svg)](https://www.npmjs.com/package/oh-my-patent)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)
[![中文](https://img.shields.io/badge/中文-切换-orange.svg)](./README.zh-CN.md)

<p align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/brand/png/logo-on-dark.png">
  <img src="./assets/brand/png/logo-primary.png" width="720"
       alt="oh-my-patent — Archimedes raising a patent document with a WOW! expression">
</picture>
</p>

**Meet Archimedes. Turn your “Eureka!” into a patent disclosure.**

A patent workflow plugin for **Claude Code, Codex, and OpenCode**, with an additional portable Agent Skill mode.
Archimedes orchestrates specialist agents across research, ideation, drafting,
review, and diagrams—with traceable, forkable decision paths.

## Quick start

Build this preview from the checkout (Node.js >=22), then install the original
Archimedes plugin into your patent workspace:

```bash
npm ci
npm run build
node dist/cli.js adapt install --tool codex --workspace-dir <workspace>
```

The default plugin mode retains all **14 agents, 6 skills, and 9 commands**.
Use `--mode plugin` to select it explicitly. Open the workspace in your AI coding
tool and use Archimedes or the host's plugin commands; see the [usage guide](docs/usage-en.md).

For the additional portable Skill mode, select one host and inspect its plan:

```bash
node dist/cli.js adapt install --mode skill --tool codex --workspace-dir <workspace> --dry-run
node dist/cli.js adapt install --mode skill --tool codex --workspace-dir <workspace>
```

Then select the `oh-my-patent` Skill and start with:

```text
Use oh-my-patent to create a patent project about homomorphic encryption in privacy-preserving computing.
```

| Installation mode | Installed entry points | Selection |
| --- | --- | --- |
| Original plugin (default) | Archimedes + 14 agents, 6 skills, 9 commands | `adapt install [--mode plugin] --tool <host>` |
| Additional Skill | One portable entry with bundled role resources and runtime | `adapt install --mode skill --tool <host>` |

Skill installation preserves existing plugin files, customizations, workspace rules
and MCP configuration. Each mode has its own uninstall command. Choose which entry
you invoke; simultaneous host discovery and mixed use of both modes in one project
remain unverified. Installing the Skill does not migrate existing project state.
See [installation modes and optional migration](docs/skill.md).
The candidate remains `0.4.0-alpha.0`; no alpha publication has run in this work.

## What you can do

| Capability | What it gives you |
|---|---|
| Coordinate specialist agents | Research, ideation, patentability assessment, drafting, review, and technical responses under one orchestrator |
| Keep decisions traceable | Saved rounds, scores, innovation snapshots, and reasons in `.brainstorm/`; branch from a recorded node or restore an idea |
| Resume recorded work | Workflow state in `.patent/state.json` and agent outputs in `references/` provide context for continuing a project |
| Generate patent figures | Specifications and editable SVG, optional local rendering or approved host image tools, with provenance and current review |
| Inspect progress | CLI queries, Markdown reports, a terminal UI, and environment checks |

The project brings the disclosure, its supporting material, and its decision history
together in one project directory. Rendering engines and retrieval services have
their own setup requirements; see the [usage guide](./docs/usage-en.md).

## From idea to disclosure

![Archimedes workflow overview: prepare and research, develop and assess ideas, draft disclosure and figures, review and revise, finalize disclosure and figures; with research and drafting feedback loops](./docs/images/workflow-overview-brand-v1.png)

*Overview of the ten stages, grouped by purpose. Arrows back to research and
drafting show where further work may be needed.*

| Step | Workflow stages |
|---|---|
| Prepare and research | `INIT` → `RESEARCH` |
| Develop and assess ideas | `BRAINSTORM_R1` → `BRAINSTORM_R2` |
| Write and illustrate | `DRAFT` → `DIAGRAM_DRAFT` |
| Review and revise | `QA_LOOP` → `FINAL_REVIEW` |
| Refresh figures and finish | `DIAGRAM_FINAL` → `DONE` |

Review can return to earlier stages. The [workflow reference](./docs/workflow-diagram-en.md)
shows the supported transitions and explains scoring decisions separately from stage changes.

## How the team works

| Pattern | Purpose |
|---|---|
| Orchestration | Archimedes coordinates specialists and carries project context between stages |
| Adversarial brainstorming | Candidate ideas receive examiner-style challenges before selection |
| Parallel evaluation | Security, compliance, and patentability specialists assess different dimensions |
| Review and response | Reviewers raise issues; the technical responder proposes document changes |
| Decision recording | The path recorder preserves rounds for comparison, branching, and recovery |

The [agent reference](./docs/agents-en.md) lists the 14 registered agents, 6 skills,
9 commands, and their roles. Actual dispatch uses the capabilities of the selected host.

## Documentation

| Read next | Contents |
|---|---|
| [Usage and CLI](./docs/usage-en.md) | Installation, platform differences, all CLI domains, and uninstall behavior |
| [Workflow](./docs/workflow-diagram-en.md) | Ten stages, review loops, and threshold behavior |
| [Agents and collaboration](./docs/agents-en.md) | Registered IDs, skills, commands, and collaboration patterns |
| [Architecture and development](./docs/architecture-en.md) | Four layers, repository layout, project files, and development commands |
| [Documentation index](./docs/README-en.md) | Bilingual guides and design references |
| [Brand guide](./assets/brand/README.md) | Archimedes artwork and usage rules |

Contributions are welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md) or
[report an issue](https://github.com/illusionaireal/oh-my-patent/issues).
Licensed under [MIT](./LICENSE).

*With thanks to the* [*LINUX DO Community*](https://linux.do/)
