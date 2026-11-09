---
kind: work
status: open
priority: 3
order: 741
area: slides
owner: an agent
evidence: "read in scripts/render-pptx.ts against ContentSlide.tsx at v2.11.0 on 09.11.2026; the specimen exported and rendered with LibreOffice"
---

# Export the content slides the web redraws as the type it redraws them as, and two-column markers in their tone

- The web's `ContentSlide` draws a centered slide that `centeredAsStatement` accepts as a statement;
  `slides-pptx` never calls it, so such a slide (specimen slide 14) exports as centered content.
  v2.11.0 routes `twoColumnAsSplit` the same way; one function in `lib/slide-utils.ts` deciding
  what a content slide draws as, called by both, would keep the next route from being missed.
- A toned `two-column` block draws the brand marker in its tone on the web (`TWO_COL_VARIANTS`);
  the export draws a green `+` or a red `−` instead. The bullet colour is set once per slide in
  the post-processing, so a per-paragraph bullet colour needs a marker in the XML.
- The transform block's paddings and arrow gap are fixed inches while its text scales with the
  block's `k`, so a shrunk transform keeps full-size gaps.

Done when the specimen's centered statement slide and a toned two-column export as the print route
draws them, checked side by side.
