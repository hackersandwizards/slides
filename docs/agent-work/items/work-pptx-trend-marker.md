---
kind: work
status: open
priority: 3
order: 1540
owner: an agent
evidence: "slides-pptx at a371a37 on the specimen trend slide with currentMarker Q2: chart1.xml carries one marker, symbol none, and five prstDash solid, no c:dPt; the web slide draws the Q2 dot and two dashed planned paths (12 10)"
---

# The PowerPoint export draws a marked trend chart as if every point were measured

A trend chart with `currentMarker` draws a dot on that point on the web slide, and the line after
it dashed, as planned. `slides-pptx` draws neither: `scripts/render-pptx.ts` adds a plain line
chart with `lineDataSymbol: "none"` and writes only `futureNote` into the note line. In the
exported deck the planned quarters read as measured ones.

Measured on 08.11.2026 at `a371a37`, with the specimen's trend slide ("Every quarter measures
against the first", `currentMarker: "Q2"`) as a one-slide deck: `ppt/charts/chart1.xml` holds
`<c:symbol val="none"/>`, five `prstDash val="solid"`, no `<c:dPt>`. The web slide at
`/slides/stories/Types/chart-slide/trend-marked/` draws the dot and two paths with
`stroke-dasharray="12 10"`.

It matters where a deck goes out as `.pptx`: talks' `pitch-assessment` carries a marked trend,
and hycle-private exports through `slides-pptx`.

Do: in the trend branch, split each series at the marked point into a measured series and a
planned series with a dashed line (`lineDash`), and mark the point (a data point marker or a
drawn ellipse with its name, as the graph variant does). Done when the exported chart XML for the
specimen slide holds a dashed series from Q2 on and a marker at Q2, and `test/render-pptx.test.ts`
asserts both.
