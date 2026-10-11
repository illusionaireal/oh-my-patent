# Sentinel startup repair

Approved scope: the maintainer requested execution of the sentinel repair plan on
2026-10-09. Preserve the 14-agent / 6-skill / 9-command plugin and standalone Skill.

1. Register the plugin sentinel as a read/Bash subagent, without delegation or MCP access.
2. Install an independent, host-specific check runtime from the npm artifact. It must
   run after relocation without the source repository, node_modules, global CLI or npx cache.
3. Explicitly select the active host's MCP configuration in mixed installations.
   Configuration presence never establishes a live MCP connection.
4. Require the orchestrator to inspect environment readiness before first RESEARCH
   and on resume. Save real results and unknown capabilities; distinguish native
   delegation from sequential checks. Zero retrieval sources block RESEARCH; academic
   fallback-only coverage requires explicit user acceptance and a recorded limitation;
   at least one professional patent source passes the coverage gate. Configured sources
   do not prove actual host tool access. Runtime/tool blockers cannot be waived.
5. Skill activation loads the sentinel reference and uses its own runtime doctor.
6. Cover installed archives, host routing, relocation, failure output and ownership
   in Ubuntu/Windows CI. Record real model-host calls separately, never infer them
   from configuration or from a successful doctor command.

This changes generated integrations; reinstall plugin mode to update an existing
workspace. Formal project state/schema and human quality gates remain compatible.

Host delegation remains a model/host operation, not a background process started by
this CLI. These checks do not certify an actual model delegation trace.
