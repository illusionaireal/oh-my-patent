# Audit safety fixes

The follow-up review found user-data loss and permission gaps still present in
PR #6. The user authorized these fixes and separate commits on its existing branch.

## Acceptance checklist

- A13: Codex uninstall preserves files that differ from generated content; installation preserves existing user instructions.
- A28: Codex marketplace updates retain unrelated entries and metadata; uninstall removes only a matching owned entry.
- A14: adapter installation rejects linked destination components before writing files outside its output root.
- A29: readiness checks only remove an exclusively created temporary directory.
- A15: invalid round/node input is rejected before persistence; readers and writers share validation.
- A12: OpenCode agents with MCP disabled deny MCP tools, including workspace-configured servers.
- A11: reinstall upgrades marked OpenCode output and preserves previous bytes in a content-addressed backup; unmarked custom files stay untouched.
- A08/A09/A10: retain PR #5's jurisdiction boundary, final diagram input and version consistency fixes.

Generated paths stay stable. Unsafe links and malformed input now fail explicitly.
Preserved user files may require manual integration. No change to patent approval gates.

## Deferred review list

- TUI asynchronous request ordering (A31).
- Diagram manifest corruption and engine-switch consistency (A19/A20).
- Portable shell assumptions (A26).
- Branch query and Codex native MCP integration scope (A17/A21).
- Remaining state/threshold/graph validation and remote MCP headers.
- Native host, real MCP authentication, interactive terminal, concurrent crash recovery,
  cross-platform permissions, development dependency upgrade and human-gate acceptance.

These are not asserted safe merely because the existing suite passes.

## OpenCode compatibility

MCP tool names use server prefixes (`<server>_<tool>`). MCP-disabled agents emit
`permission: { "*_*": "deny" }`, including servers configured after generation.
This conservative rule also restricts underscore-named custom tools and safety
guards; it does not grant read, external-directory or MCP permissions when MCP
is enabled. User-written agent overrides remain user-controlled.

Existing marked prompts are refreshed on reinstall; their previous contents are
retained under `.opencode/.oh-my-patent-backups/`. Remove the generated marker to
maintain a fully custom agent instead. Backups survive uninstall.

Contract references: [OpenCode permissions](https://opencode.ai/docs/permissions/)
and [MCP tool prefixes](https://opencode.ai/docs/mcp-servers/).
