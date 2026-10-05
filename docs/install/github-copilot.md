# github-copilot optional Skill candidate installation

Use the complete portable folder and the candidate project path in
[the target registry](../../distribution/targets.json). Follow the
[installation modes and optional migration procedure](../skill.md).

Host activation, fixed-version third-party installation, model/tool behavior, and
marketplace listing have not been verified for this candidate. Do not install both
a shared and a host-specific copy. Preserve existing workspace rules and other skills.

Select `adapt install --mode skill --tool github-copilot --workspace-dir <workspace>`
for this optional mode. It preserves the original Archimedes plugin. Original plugin
mode remains the default for Claude Code, Codex and OpenCode. Combined activation
of both entry types in the same host remains unverified.
