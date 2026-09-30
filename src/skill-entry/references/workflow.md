# Ten-stage workflow

The existing core workflow machine owns valid transitions. Preserve independent task
scope: a review-only or search-only artifact does not establish a ten-stage history.

| Stage | Evidence/artifact and gate |
| --- | --- |
| INIT | User technical facts, scope, selected language/jurisdiction and capabilities |
| RESEARCH | Search plan or actual evidence cards; clearly record missing retrieval |
| BRAINSTORM_R1 | Divergent candidates, supporting facts and explicit assumptions |
| BRAINSTORM_R2 | Adversarial comparison, scores as screening signals, human selection |
| DRAFT | MAIN.md with referenced technical facts and unresolved questions |
| DIAGRAM_DRAFT | Figure specs and editable sources; safety checks before preview |
| QA_LOOP | Reviewer issues, technical responses and revised evidence/draft |
| FINAL_REVIEW | No unresolved blocking issue; human acceptance of substantive content |
| DIAGRAM_FINAL | Current figure technical/visual reviews and provenance |
| DONE | Current artifacts, explicit human acceptance and honest limitations |

Use existing legal feedback loops: BRAINSTORM_R1 -> RESEARCH, QA_LOOP -> DRAFT,
FINAL_REVIEW -> QA_LOOP. Revisions invalidate affected reviews; do not retain a stale
pass merely because the workflow state is later in the sequence. Save decisions in
.brainstorm, artifacts in references/MAIN.md/figures, and formal state through runtime.

Use at most three review rounds as an initial budget unless overridden; save and
escalate unresolved issues at the budget. Separate native independent reviews from
sequential model role checks. Evidence fixtures are synthetic, never actual novelty checks.
