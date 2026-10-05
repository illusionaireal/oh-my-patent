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

A patent workflow toolkit for **Claude Code, Codex, and OpenCode**, available as a
plugin or a portable Agent Skill.
Archimedes orchestrates specialist agents across research, ideation, drafting,
review, and diagrams—with traceable, forkable decision paths.

## Quick start

Choose **Plugin** for Archimedes with 14 agents, 6 skills and 9 commands, or
**Skill** for one portable entry with bundled role resources and runtime.
Node.js >=22 is required. Both modes support Claude Code, Codex and OpenCode.
Run installation commands in your patent workspace and choose the command for your host.

### Plugin installation

Run only the command for your host:

**Claude Code**

```bash
npx oh-my-patent@latest adapt install --tool claude-code --workspace-dir .
```

**Codex**

```bash
npx oh-my-patent@latest adapt install --tool codex --workspace-dir .
```

**OpenCode**

```bash
npx oh-my-patent@latest adapt install --tool opencode --workspace-dir .
```

Plugin mode is the CLI default. Open the workspace in your host and select Archimedes;
see the [usage guide](docs/usage-en.md) for enabling its entry point.

### Skill installation

Choose one of these methods:

**1. Skills CLI — recommended**

Use the [Skills CLI](https://github.com/vercel-labs/skills) to install the portable
Skill directly from its repository directory. This method requires Git and
Node.js >=22.20. Run only the command for your host:

**Claude Code**

```bash
npx skills@latest add https://github.com/illusionaireal/oh-my-patent/tree/master/skills/oh-my-patent --skill oh-my-patent --agent claude-code --copy
```

**Codex**

```bash
npx skills@latest add https://github.com/illusionaireal/oh-my-patent/tree/master/skills/oh-my-patent --skill oh-my-patent --agent codex --copy
```

**OpenCode**

```bash
npx skills@latest add https://github.com/illusionaireal/oh-my-patent/tree/master/skills/oh-my-patent --skill oh-my-patent --agent opencode --copy
```

Each command targets the complete portable package and installs a project-local copy
for the selected host.

**2. ZIP download — manual installation**

Download the [repository ZIP](https://github.com/illusionaireal/oh-my-patent/archive/refs/heads/master.zip)
and extract it. Copy the complete `skills/oh-my-patent` directory inside the archive
to the Skill location for your host in the table below. The runtime is included;
no source build is needed.

**3. oh-my-patent CLI — managed installation**

Use this method for the project's installation backups and rollback commands.
Run only the command for your host:

**Claude Code**

```bash
npx oh-my-patent@latest adapt install --mode skill --tool claude-code --workspace-dir .
```

**Codex**

```bash
npx oh-my-patent@latest adapt install --mode skill --tool codex --workspace-dir .
```

**OpenCode**

```bash
npx oh-my-patent@latest adapt install --mode skill --tool opencode --workspace-dir .
```

| Host | Skills CLI `--agent` / project CLI `--tool` | Manual Skill location in the workspace |
| --- | --- | --- |
| Claude Code | `claude-code` | `.claude/skills/oh-my-patent` |
| Codex | `codex` | `.agents/skills/oh-my-patent` |
| OpenCode | `opencode` | `.agents/skills/oh-my-patent` |

Keep `SKILL.md`, `references/`, `assets/` and `scripts/` together. Use the same
installation method for updates and removal; see the [installation guide](docs/skill.md).
The [standalone npm package](docs/skill.md#standalone-skill-package-installation)
is also available for packaging and manual deployment.

### Start a project

Open the same workspace in your selected host. For plugin mode, select Archimedes;
for Skill mode, select `oh-my-patent`. Describe your topic, for example:

```text
Create a patent project about homomorphic encryption in privacy-preserving computing.
```

Archimedes guides you through collecting material, developing ideas, drafting the
disclosure and reviewing it. See [compatibility](docs/compatibility.md) for
host-specific requirements, and the [installation guide](docs/skill.md) for source
builds, version selection, updates and removal.

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
| [Installation modes](./docs/skill.md) | Plugin and Skill setup, updates, removal and migration |
| [Release notes](./docs/releases/0.4.0.md) | Version 0.4.0 changes |
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
