# Ten-stage workflow

The existing core workflow machine owns valid transitions. Preserve independent task
scope: a review-only or search-only artifact does not establish a ten-stage history.

| Stage | Evidence/artifact and gate |
| --- | --- |
| INIT | User technical facts, scope, selected language/jurisdiction and capabilities |
| RESEARCH | Approved retrieval available; academic-only requires explicit acceptance; record actual evidence cards and limitations |
| BRAINSTORM_R1 | Divergent candidates, supporting facts and explicit assumptions |
| BRAINSTORM_R2 | Adversarial comparison, scores as screening signals, human selection |
| DRAFT | MAIN.md with referenced technical facts and unresolved questions |
| DIAGRAM_DRAFT | Fresh capabilities and per-figure selection; 30-second timed default or immediate default; specs and editable sources |
| QA_LOOP | Reviewer issues, technical responses and revised evidence/draft |
| FINAL_REVIEW | No unresolved blocking issue; human acceptance of substantive content |
| DIAGRAM_FINAL | Required selected paths and preview ready; current technical/visual reviews before final completion |
| DONE | Current artifacts, explicit human acceptance and honest limitations |

Use existing legal feedback loops: BRAINSTORM_R1 -> RESEARCH, QA_LOOP -> DRAFT,
FINAL_REVIEW -> QA_LOOP. Revisions invalidate affected reviews; do not retain a stale
pass merely because the workflow state is later in the sequence. Save decisions in
.brainstorm, artifacts in references/MAIN.md/figures, and formal state through runtime.

Use at most three review rounds as an initial budget unless overridden; save and
escalate unresolved issues at the budget. Separate native independent reviews from
sequential model role checks. Evidence fixtures are synthetic, never actual novelty checks.
