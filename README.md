> **Skill-first preview (0.4.0 alpha):** A portable single-entry package and JSON runtime are available in this branch. See [installation and migration](docs/skill.md) and [actual compatibility status](docs/compatibility.md). Host certification and marketplace publication are pending.

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

An Agent Skill for patent workflows, with **Claude Code, Codex, and OpenCode** as first-wave host candidates.
Archimedes orchestrates specialist agents across research, ideation, drafting,
review, and diagrams—with traceable, forkable decision paths.

## Quick start

Build this preview from the checkout (Node.js >=22), then install into your patent
workspace. Review [installation and migration](docs/skill.md) first.

```bash
npm ci
npm run build
node dist/cli.js adapt install --tool codex --workspace-dir <workspace> --dry-run
node dist/cli.js adapt install --tool codex --workspace-dir <workspace>
```

Open that workspace in your AI coding tool, select the `oh-my-patent` Skill, and start with:

```text
Use oh-my-patent to create a patent project about homomorphic encryption in privacy-preserving computing.
```

Select one host with `--tool claude-code`, `--tool codex`, or `--tool opencode`.
The installer requires an explicit host and installs one complete Skill without changing
global instructions or MCP configuration. Real host discovery and workflow acceptance
remain [unverified](docs/compatibility.md). No alpha release has been published by this work.

<details>
<summary>For AI assistants helping users install this</summary>

Use the built checkout or the exact candidate artifact. Inspect the selected host's
installation plan and respect existing workspace files:

```bash
node dist/cli.js adapt install --tool codex --workspace-dir <workspace> --dry-run
```

Install the reviewed plan, then load `oh-my-patent`. `/archimedes` and the historical
multi-entry plugin layout are available only through explicit `--legacy` adapter use.

</details>

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
