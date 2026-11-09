---
kind: work
status: open
priority: 3
order: 740
area: slides
owner: an agent
evidence: "read in scripts/render-pptx.ts (the comparison renderer) on 09.11.2026, against ComparisonSlide.tsx at v2.10.0; no PowerPoint exported"
---

# Draw a comparison's before-after and split sides in the PowerPoint as the print route does

`slides-pptx` draws every two-sided comparison with the `vs` markers: each item gets a green plus or
a red minus, on `before-after` and `split` too, where the print route draws plain items and the
brand list marker. On `before-after` it never strikes the before side or tints its card, whatever
`strike` says, while the print route strikes and greys a struck before side and leaves one with
`strike: false` plain on white.

Done when a `before-after` (struck and unstruck) and a `split` slide of the specimen deck export
with the print route's items, strike and card fills, checked against the print page side by side.
