---
kind: work
status: open
priority: 3
owner: Ada
area: brand
evidence: "Checked 12.11.: scripts/render-pptx.ts:1487 still fills every body cell c.card and only the head c.tint. Visible in an exported deck."
---

# The PowerPoint export draws the slide table without its stripes

Ada briefs a slides session to tint every second body row in `slides-pptx`'s tables, as the web does, and release it.

The blind review of 12.11.2026 kept the web table's stripes, since the tint holds a row where a
projected or streamed hairline fades. A deck exported with `slides-pptx` and projected in the same
room shows the body rows untinted. The change ships, so it is a release with the consumers raised.
