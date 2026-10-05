# oh-my-patent-skill

Archimedes, your Eureka-to-patent guide. The standalone portable Agent Skill from
[oh-my-patent](https://github.com/illusionaireal/oh-my-patent).

This npm package contains one SKILL.md, role/capability references, templates and a
self-contained Node.js >=22 runtime. It has no runtime npm dependencies or install
scripts. The `oh-my-patent` package provides the CLI and plugin mode with 14 agents,
6 skills and 9 commands. Both packages belong to the same patent workflow toolkit.

## Install into your host

Requires Node.js >=22. Download the package in a temporary directory:

```sh
npm pack oh-my-patent-skill --ignore-scripts
```

Extract the resulting `.tgz` archive. Copy its complete `package` directory into
one Skill location in your patent workspace:

| Host | Skill location in your workspace |
| --- | --- |
| Claude Code | `.claude/skills/oh-my-patent` |
| Codex | `.agents/skills/oh-my-patent` |
| OpenCode | `.agents/skills/oh-my-patent` |

Open that workspace in your host, select `oh-my-patent`, then describe your topic:

```text
Create a patent project about homomorphic encryption in privacy-preserving computing.
```

For automatic installation through the `oh-my-patent` CLI, run this in your patent
workspace (Codex example):

```sh
npx oh-my-patent@latest adapt install --mode skill --tool codex --workspace-dir .
```

Use `--tool claude-code` for Claude Code or `--tool opencode` for OpenCode.
See the [installation guide](https://github.com/illusionaireal/oh-my-patent/blob/master/docs/skill.md#standalone-skill-package-installation)
for manual installation, updates and removal, and
[compatibility](https://github.com/illusionaireal/oh-my-patent/blob/master/docs/compatibility.md)
for host-specific requirements.

## Runtime

Read SKILL.md and references/runtime.md before persisted operations. Call
`node <skill-directory>/scripts/runtime.mjs --input <request.json>` with an explicit
project root. Keep all references, assets and scripts together when moving the Skill.

Version __VERSION__ uses the same release version as `oh-my-patent`.
Technical drafting assistance, not legal advice; obtain qualified patent
professional review before reliance or filing.

MIT license; bundled third-party licenses are under scripts/licenses/.
