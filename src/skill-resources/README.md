# Portable Skill prompt overrides

The original plugin reads `src/agents` and `src/skills` through `plugin.jsonc`.
These files adapt selected roles and capabilities to the optional Skill's bundled
runtime. `scripts/build-skill.mjs` uses an override when present and otherwise reads
the shared original role/capability. Plugin generation never reads these overrides.

Keep original plugin entry points and CLI instructions independent from portable
runtime instructions. Generated references in `skills/oh-my-patent` are build outputs.
