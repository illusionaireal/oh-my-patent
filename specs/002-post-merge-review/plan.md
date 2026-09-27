# Implementation plan

Review each acceptance criterion against its affected entry points. Add
regressions that fail on the merged baseline, then fix adapter generation,
MCP setup, pruning, and branch persistence. Preserve portable definitions and
generated directory contracts except for the documented Claude MCP correction.
Do not edit generated integration trees.

Run targeted tests, then the full suite, build, lint, and CLI smoke check.
Record results in tasks.md and submit one Conventional Commit for review.
