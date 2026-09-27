# Post-merge review

Status: proposed for human review in the remediation PR.

Baseline: master `c8af139`, including integration merges `f2630d0` and
`7719ef6`. The baseline passes 308 tests; these findings need new coverage.

## Acceptance criteria

1. Claude generates project MCP configuration in `.mcp.json`, uses `http`
   for remote servers, installs every portable skill, and allows the primary
   agent to delegate when launched as the main agent.
2. MCP setup reads/writes the same Claude configuration and preserves settings.
   Failed replacement must leave the previous configuration intact.
3. Pruning rejects escaping managed paths and skips symlinks/junctions,
   including linked ancestors of managed directories.
4. Branch creation rejects malformed indexes and missing source nodes, never
   overwrites an existing branch on identifier collision, and persists JSON
   through the shared atomic writer.

## Compatibility

Claude MCP moves from the unsupported `.claude/settings.json` location to
`.mcp.json`. Existing settings are left intact; users can move their old
`mcpServers` entries into `.mcp.json`. Generated skills use `.claude/skills/`.
Patent direction and final acceptance gates are unchanged. No governance
amendment, release, or automatic merge is included.

## Framework references

- https://code.claude.com/docs/en/mcp#project-scope
- https://code.claude.com/docs/en/skills
- https://code.claude.com/docs/en/sub-agents#restrict-which-subagents-can-be-spawned
