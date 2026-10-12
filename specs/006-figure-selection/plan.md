# Implementation plan

Add a shared capability/selection core and figure.plan / figure.offer / figure.select
runtime operations. Bind offers to current plan and saved observations, using runtime
clock for deadlines. Store selection in each figure directory via project transactions.
Observe local Mermaid CLI as an optional diagnostic, keeping host tool observations separate.
Expose the same bundled runtime through installed plugin checkers and the Skill runtime.
Unify prompts around direct SVG, per-figure selection and existing provenance/review gates.
Verify synthetic selection/timeout/egress boundaries, installed runtimes, regressions and
actual archives on Ubuntu/Windows; do not claim real model-host image invocation.

Follow-up: use semantic selection review hashes alongside audit hashes; bind offers to
technical/user/host context rather than volatile observations. Preserve repeated-offer
deadlines, preflight observation lifetime, normalize native formats, and propagate installed
workspace context. Add phase-specific startup readiness and an evidence-bound local SVG
fallback operation; actual tool execution remains host-owned. Extend synthetic regressions
and installed bundle configuration tests before repeating archives and CI.
