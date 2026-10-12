# Figure specification, source and review

Use ../assets/figure-spec.example.json as a structural example only; replace every
technical fact with the user's actual evidence. MAIN sections, stable part IDs/numbers,
directed connections, mandatory features, forbidden inventions and review criteria
are the common input across SVG/imagegen/Mermaid/PlantUML.

Write a small self-contained SVG using only svg/g/rect/circle/ellipse/line/polyline/
polygon/path/text/tspan/title/desc. Use the SVG namespace, generic local fonts, simple
black/white/hex paint and explicit coordinates. Avoid XML declarations, DTD/entities,
CSS, scripts, events, external URLs, images, fonts, foreignObject and animations.
Max 1 MiB, 10,000 elements, depth 32. Validate before preview; do not open active SVG.
The whitelist is deliberately narrower than the complete SVG standard.

Required files: figures/<id>/figure-spec.json, source/result, provenance.json.
Registration requires current SHA-256 for spec/result/MAIN in expected.inputs.
Review object: status pending/passed/failed, reviewer_type model/human, reviewer,
technical boolean, visual boolean, findings string array. A pass requires both review
types to have happened. Matching hashes only establish freshness, never correctness.

For a host image tool, first establish actual availability and disclosed recipient.
Save complete prompt/reference preview; obtain scoped approval, persist consent and
attempt before the call, record observed result/timeout without automatic retry.
Preserve bitmap original, provider/model when available, parameters, time and ledger
references. Missing tool/consent/budget means use SVG or deliver the specification.
Do not describe any real provider as verified on the strength of mock handoff tests.

Before generation run figure.plan, then figure.offer/select as documented in runtime.md.
Save actual observations from assets/figure-capabilities.example.json. Prefer an executable
saved local choice or preference, else SVG. Timed interaction defaults after a persisted
30-second deadline; no timed interaction defaults immediately. Save selection.json and
its true source. Never infer consent from default/timeout. New registration binds selection
and capabilities; changed selection invalidates prior review. No preview permits drafting
but prevents visual pass/final required-figure completion.
