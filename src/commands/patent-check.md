# /patent-check

Check environment readiness in the active host before first RESEARCH or project resume.

## Usage

```
/patent-check [project-path]
```

From the installed workspace root, run the bundled checker:

```bash
node "{{PATENT_CHECK_SCRIPT}}" --json
```

From another directory, resolve that installed script and pass its full path. The script
uses its own location to select the workspace and the active host's configuration.
It needs Node.js 22+ but no source checkout, global CLI, node_modules or npx cache.

The public CLI also supports `oh-my-patent check --json --tool <host>`.
`<host>` is claude-code, codex or opencode; specify it in mixed-host workspaces.

## Results and handoff

Return the actual timestamp, adapter, ready, blocking/warning counts, MCP configuration
statuses and runtime/tool/project results. The check reads local configuration and
probes local tools; it does not contact or authenticate MCP services. Observe actual
host tools separately. A configured service has not passed a connectivity check.

Archimedes saves the real report and host capability observations in the selected
project's references/init-report.json. Do not change formal workflow state here.
Missing git/mmdc or runtime capabilities block plugin readiness; missing MCP sources
produce warnings and allow user-approved degraded retrieval. Failed execution and
unknown capabilities must never be recorded as passed.

## Invocation

Archimedes must invoke the sentinel before first RESEARCH and on resume through an
actually exposed native delegation tool. Without one, perform the check sequentially
and label the execution mode. This is an orchestration instruction, not a session-start
hook. Manual /patent-check is available at any time. The check itself does not install
tools or change configuration; setup commands require the user's explicit selection.
