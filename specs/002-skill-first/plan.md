# Implementation sequence

1. PR1: freeze contracts, synthetic fixtures, baseline and acceptance ledger.
2. PR2: portable source, templates, deterministic complete package and six-host registry.
3. PR3: versioned runtime, coordinated mutations/recovery, egress and figure checks.
4. PR4: shared portable adapter outputs, additive opt-in Skill installation and independent rollback.
5. PR5: deterministic regression tests plus separately recorded real-host evaluation.
6. PR6: verified release artifacts, CI, bilingual installation and compatibility docs.
7. PR7: second-wave host evaluations; keep unobserved outcomes unverified.

Preserve existing workspace and data; work from baseline on feat/skill-first.
Run `npm run lint`, `npm test`, `npm run build` before review.
Package checks must execute the copied runtime without repository/node_modules access.
Do not infer paid-test authorization from the suggested budget in the upstream plan.

2026-10-04 correction: preserve the original plugin as the default. Add `--mode skill`
without collapsing or replacing its 14 agents, 6 skills or 9 commands. Keep portable
prompt overrides separate; test installation, pruning and removal in both directions.
