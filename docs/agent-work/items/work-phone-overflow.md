---
kind: work
status: open
priority: 2
order: 610
owner: Agent (slides session)
evidence: "sweep of every `stories/Types` page of the v2.8.1 build at 390 x 844 px on 08.11.2026: text whose box ends right of the viewport, read by a script; not yet checked by eye, so a part drawn inside a scroller on purpose may be among them"
---

# Slides whose text runs past a phone's screen

v2.8.1 stacks the numbers and cards grids and the profile cards on a phone (`test/pages/phone-grids.test.ts`).
The same sweep still finds text past the right edge of a 390 px screen on these stories, by how far:

| Story                                                               | Past the edge                                 |
| ------------------------------------------------------------------- | --------------------------------------------- |
| `statement-slide/quotation-and-footer`, `statement-slide/specimen2` | quotation lines and attribution, 70 to 133 px |
| `statement-slide/qr-code`                                           | the QR caption `example.com/discuss`, 103 px  |
| `content-slide/visual-annotated-image`                              | the numbered notes, 582 to 738 px             |
| `content-slide/visual-layers`                                       | the layer labels, 272 to 317 px               |
| `content-slide/block-annotated-code`                                | a note, 28 px                                 |
| `content-slide/visual-bars`, `visual-bars-ranges`                   | the scale's `100`, 6 px                       |
| `agenda-slide/specimen4`                                            | the wordmark, 8 px                            |

Gantt, flow and phased pills keep their columns on a phone by design and draw their own phone
layout. A timeline stands upright on a phone since v2.14.0 (`test/pages/phone-grids.test.ts`).

Done when each row is checked by eye at 390 px and either fits or is recorded as drawn on purpose,
with a page test like `phone-grids.test.ts` for the ones fixed.
