# Figure capability and selection

Approved by the maintainer on 2026-10-12, including a non-blocking default after
30 seconds, and immediate default when the host has no timed interaction.

- Share the figure specification, planning and selection runtime across plugin and Skill.
- Observe actual host tools, preview and timed interaction. Configuration/version checks
  alone never establish successful rendering or image generation.
- Mermaid CLI is optional at startup; missing git/runtime and retrieval blockers remain.
- Read effective preferredBackend. Select per figure, defaulting to executable saved
  local preference, then SVG, then another available local renderer. Automated defaults
  never authorize remote disclosure or spending. No available backend blocks that figure.
- Offer a persisted 30-second deadline where timed interaction is available. Early timeout
  is rejected. Otherwise select immediately with a distinct system-default source.
- Save the selection source, reasons, capability snapshot and spec binding. Reuse a saved
  choice only when still executable; resume refreshes observations. Changes invalidate
  dependent selection/review. Never label a system default as human confirmation.
- Record generation and require current technical and visual review for delivery.
  Unavailable preview permits drafting but not a passing visual review.
- Preserve independent human innovation/final acceptance and content-bound disclosure.

Follow-up approved on 2026-10-12:

- Separate observation freshness from content/execution review freshness. Refresh/reuse
  preserves passed review; technical content or execution boundary changes still invalidate it.
- Keep the original offered deadline across observation refresh and repeated offers. At
  expiry re-evaluate local availability; spec/MAIN/preference or host/session changes conflict.
  Nearly expiring observations require refresh before offering; expired ones are refreshed
  without resetting an existing offer. No stale capability is accepted.
- Normalize output formats when selecting the backend, including same-backend repairs.
- Installed runtimes supply their workspace context for configuration inheritance, then
  retain task > saved project > workspace > defaults precedence.
- Report runtime/research-configuration/drawing/visual readiness separately. Retrieval
  gaps gate RESEARCH or new evidence collection; they do not block independent later work.
- Bound host local rendering to 60 seconds, require actual failure evidence, and permit
  one recorded local SVG fallback. SVG/remote/unavailable fallback paths stop that figure;
  no automatic external call or retry. Host execution remains separately verified.

Existing registered figures remain inspectable. New registration requires a recorded
selection; existing unregistered projects need selection before rendering/registration.
Reinstall plugin integrations or update the complete Skill to receive runtime/prompt changes.
