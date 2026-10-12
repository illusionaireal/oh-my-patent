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
Missing git/mmdc or runtime capabilities block plugin readiness. Report retrievalCoverage,
configuredCount and degradedRetrieval: zero configured sources (none) blocks RESEARCH;
academic sources only (google_scholar/semantic_scholar, fallback_only) blocks by default;
at least one patent source (patsnap_search/uspto_patent/cnipa_patent, professional) passes
the configuration gate. Missing individual sources remain warnings. Template priority
is setup advice; retrievalRole determines coverage. No source must be individually required.

Only after explicit user acceptance of academic-only limitations, rerun the same checker
with --accept-degraded-retrieval --degradation-reason "user acceptance reference/reason".
Save the resulting confirmation, timestamp and limitation in the report. Consent applies
to this invocation; recheck on resume. It cannot waive zero sources or runtime/tool blockers.
Observe actual approved host retrieval tools too: none/unknown blocks formal RESEARCH,
and academic-only tools require explicit acceptance even if a patent source is configured.
Failed execution and unknown capabilities must never be recorded as passed. A search plan
or supplied-material analysis is assistance outside the blocked formal workflow.

## Invocation

Archimedes must invoke the sentinel before first RESEARCH and on resume through an
actually exposed native delegation tool. Without one, perform the check sequentially
and label the execution mode. This is an orchestration instruction, not a session-start
hook. Manual /patent-check is available at any time. The check itself does not install
tools or change configuration; setup commands require the user's explicit selection.
