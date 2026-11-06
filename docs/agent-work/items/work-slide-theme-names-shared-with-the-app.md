---
kind: work
status: open
priority: 3
order: 540
owner: Agent (slides session)
evidence: "slides v1.8.0 session of 06.11.2026: trainer-hub catalog build with the v1.8.0 engine, computed styles of 61 app stories in light and dark with and without its slide stylesheet; code review of the v1.8.0 diff"
---

# The slide stylesheet still shares theme names with an app stylesheet

v1.8.0 renamed the accent and dropped `--color-warning`, so no colour name tokens.css sets clashes
with brand's `expert.css` any more. Two engine-owned names are still shared and take the slide's
value at `:root`: `--radius-brand` (the slide corner, against brand's 20px 5px) and the `--text-*`
steps (scaled by `--slide-stage`). On trainer-hub's catalog neither showed in the measurement (no
`border-radius` or `font-size` difference on any app story), so they are latent and depend on the
order the two stylesheets load in.

The fix this suggests: set the engine's values for shared names in a block scoped to
`[data-hw-scale="stage"]`, which `SlideShell` puts on every slide, as the night block already is.
Done when the print frames stay byte-identical and the trainer-hub measurement shows no radius or
type difference with the slide stylesheet loaded.
