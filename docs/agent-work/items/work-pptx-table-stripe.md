---
kind: work
status: open
priority: 3
owner: Ada
area: brand
evidence: "scripts/render-pptx.ts fills every body cell c.card and only the head c.tint, under a comment calling it the web's table; the web table keeps its stripes after the blind review in docs/agent-work/2026-11-12-table-stripe.md"
---

# The PowerPoint export draws the slide table without its stripes

Ada briefs a slides session to tint every second body row in `slides-pptx`'s tables, as the web does, and release it.

The blind review of 12.11.2026 kept the web table's stripes, since the tint holds a row where a
projected or streamed hairline fades. A deck exported with `slides-pptx` and projected in the same
room shows the body rows untinted. The change ships, so it is a release with the consumers raised.
