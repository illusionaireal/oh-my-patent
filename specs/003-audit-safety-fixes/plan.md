# Implementation plan

1. Fix each ownership, boundary, validation or permission issue with a focused regression.
2. Use conservative preservation for unknown/modified files and malformed shared configuration.
3. Preflight generated destinations and recheck immediately before mutation; document that
   portable path checks do not make concurrent hostile filesystem swaps race-free.
4. Integrate the three independently verified correctness fixes without merging conflicting implementations.
5. Run build, lint, complete tests and the external audit fixtures; inspect behavioral evidence.
6. Append separate commits to PR #6 and update its review scope and residual limitations.
