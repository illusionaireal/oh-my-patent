# oh-my-patent-skill

Archimedes, your Eureka-to-patent guide. The standalone portable Agent Skill from
[oh-my-patent](https://github.com/illusionaireal/oh-my-patent).

This npm package contains one SKILL.md, role/capability references, templates and a
self-contained Node.js >=22 runtime. It has no runtime npm dependencies or install
scripts. The `oh-my-patent` package provides the CLI and plugin mode with 14 agents,
6 skills and 9 commands. Both packages belong to the same patent workflow toolkit.

## Install into your host

The portable runtime requires Node.js >=22 and supports Claude Code, Codex and
OpenCode. Choose one installation method and the command or location for your host:

### Skills CLI (recommended)

With Git and Node.js >=22.20, run this in your patent workspace:

```sh
npx skills@latest add https://github.com/illusionaireal/oh-my-patent/tree/master/skills/oh-my-patent --skill oh-my-patent --copy
```

The installer detects hosts and offers selection when needed. Choose Claude Code,
Codex or OpenCode, and choose Project for a complete copy in the current workspace.
Append `--global` for user-level installation across projects, or `--agent <host>`
to select a host explicitly (`claude-code`, `codex` or `opencode`).
No global oh-my-patent CLI is required.

### ZIP or npm archive

Download and extract the [repository ZIP](https://github.com/illusionaireal/oh-my-patent/archive/refs/heads/master.zip),
then copy its complete `skills/oh-my-patent` directory to one destination below.
To obtain this npm package instead, run `npm pack oh-my-patent-skill --ignore-scripts`
in a temporary directory, extract the archive and copy its complete `package` directory.

| Host | Skill location in your workspace |
| --- | --- |
| Claude Code | `.claude/skills/oh-my-patent` |
| Codex | `.agents/skills/oh-my-patent` |
| OpenCode | `.agents/skills/oh-my-patent` |

### Project CLI

For the project's installation backups and rollback support, run only the command for your host:

**Claude Code**

```sh
npx oh-my-patent@latest adapt install --mode skill --tool claude-code --workspace-dir .
```

**Codex**

```sh
npx oh-my-patent@latest adapt install --mode skill --tool codex --workspace-dir .
```

**OpenCode**

```sh
npx oh-my-patent@latest adapt install --mode skill --tool opencode --workspace-dir .
```

Use the same installation method for updates and removal; see the
[installation guide](https://github.com/illusionaireal/oh-my-patent/blob/master/docs/skill.md)
and [compatibility](https://github.com/illusionaireal/oh-my-patent/blob/master/docs/compatibility.md).

Open the workspace in your host, select `oh-my-patent`, then describe your topic:

```text
Create a patent project about homomorphic encryption in privacy-preserving computing.
```

## Runtime

Read SKILL.md and references/runtime.md before persisted operations. Call
`node <skill-directory>/scripts/runtime.mjs --input <request.json>` with an explicit
project root. Keep all references, assets and scripts together when moving the Skill.

Version __VERSION__ uses the same release version as `oh-my-patent`.
Technical drafting assistance, not legal advice; obtain qualified patent
professional review before reliance or filing.

MIT license; bundled third-party licenses are under scripts/licenses/.
