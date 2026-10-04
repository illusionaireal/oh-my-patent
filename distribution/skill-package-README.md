# oh-my-patent-skill

Archimedes, your Eureka-to-patent guide. The standalone portable Agent Skill from
[oh-my-patent](https://github.com/illusionaireal/oh-my-patent).

This npm package contains one SKILL.md, role/capability references, templates and a
self-contained Node.js >=22 runtime. It has no runtime npm dependencies or install
scripts. The original `oh-my-patent` plugin remains a separate package with 14 agents,
6 skills and 9 commands.

## Obtain the package

After publication, install the preview in a dedicated evaluation workspace:

```sh
npm install --save-dev --ignore-scripts oh-my-patent-skill@__VERSION__
node node_modules/oh-my-patent-skill/scripts/runtime.mjs --doctor
```

Installing an npm dependency does not register it with an agent host. Copy the
complete package directory into that host's selected Skill location, or use a Skill
installer's local-directory input. For example, the `skills` CLI documents local
paths, `--skill`, `--agent` and `--copy`:

```sh
npx skills add ./node_modules/oh-my-patent-skill --skill oh-my-patent --agent codex --copy
```

This third-party command and actual host activation remain unverified for this
candidate. See the [skills CLI source](https://github.com/vercel-labs/skills) and the
project's [compatibility ledger](https://github.com/illusionaireal/oh-my-patent/blob/feat/skill-first/docs/compatibility.md).
Choose one Skill discovery location; preserve the original plugin and user files.
Select the plugin or portable Skill entry explicitly. Existing project state is not
migrated by installing this package.

## Runtime

Read SKILL.md and references/runtime.md before persisted operations. Call
`node <skill-directory>/scripts/runtime.mjs --input <request.json>` with an explicit
project root. Keep all references, assets and scripts together when moving the Skill.

This is an alpha preview. Host acceptance and full workflow certification remain
pending. Technical drafting assistance, not legal advice; obtain qualified patent
professional review before reliance or filing.

MIT license; bundled third-party licenses are under scripts/licenses/.
