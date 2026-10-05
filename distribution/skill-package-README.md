# oh-my-patent-skill

Archimedes, your Eureka-to-patent guide. The standalone portable Agent Skill from
[oh-my-patent](https://github.com/illusionaireal/oh-my-patent).

This npm package contains one SKILL.md, role/capability references, templates and a
self-contained Node.js >=22 runtime. It has no runtime npm dependencies or install
scripts. The `oh-my-patent` package provides the CLI and plugin mode with 14 agents,
6 skills and 9 commands. Both packages belong to the same patent workflow toolkit.

## Obtain the package

Install in your patent workspace:

```sh
npm install --save-dev --ignore-scripts oh-my-patent-skill@__VERSION__
node node_modules/oh-my-patent-skill/scripts/runtime.mjs --doctor
```

Copy the complete `node_modules/oh-my-patent-skill` directory to the selected host's
Skill location, then select the `oh-my-patent` entry:

| Host | Skill location in your workspace |
| --- | --- |
| Claude Code | `.claude/skills/oh-my-patent` |
| Codex | `.agents/skills/oh-my-patent` |
| OpenCode | `.agents/skills/oh-my-patent` |

Use one Skill discovery location and choose the entry for your project. See the
[installation guide](https://github.com/illusionaireal/oh-my-patent/blob/master/docs/skill.md)
for updates, removal and project migration, and
[compatibility](https://github.com/illusionaireal/oh-my-patent/blob/master/docs/compatibility.md)
for host-specific requirements.

Start with:

```text
Use oh-my-patent to create a patent project about homomorphic encryption in privacy-preserving computing.
```

## Runtime

Read SKILL.md and references/runtime.md before persisted operations. Call
`node <skill-directory>/scripts/runtime.mjs --input <request.json>` with an explicit
project root. Keep all references, assets and scripts together when moving the Skill.

Version __VERSION__ uses the same release version as `oh-my-patent`.
Technical drafting assistance, not legal advice; obtain qualified patent
professional review before reliance or filing.

MIT license; bundled third-party licenses are under scripts/licenses/.
