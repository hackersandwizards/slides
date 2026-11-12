---
kind: decision
status: open
priority: 3
order: 1070
owner: Benedikt
area: software-engineering
evidence: "slides v3.0.0 (ecb4a9e) removed GanttBar.theme and GridCard.tone (with its old name accentColor) from types/slide.ts; talks' scripts/export-pptx.py on origin/main still reads both (lines 692-693 and 807) while no deck in talks' data/presentations sets either, read 12.11.2026"
options:
  - key: keep-out
    label: The fields stay out; talks drops its reads
    detail: "slides stays as v3.0.0 left it: no field the web does not draw. talks' PowerPoint exporter stops reading a Gantt bar's theme and a grid card's tone, so every bar takes one colour and a neutral card stays a card in the grid. No deck in talks sets either field today. Nothing changes in slides."
  - key: data-the-web-ignores
    label: The fields come back as data the web ignores
    detail: "slides takes GanttBar.theme and GridCard.tone back into types/slide.ts as fields the web never draws, documented as read by an exporter only, and the types accept them again. talks' exporter keeps its phase colours and its source note under the grid. A slides release, a minor one, since a deck that sets the fields type-checks again."
---

# Does slides keep fields the web never draws, so a PowerPoint exporter can use them?

Decide whether slides keeps a field the web never draws, for an exporter in a consumer to read.

slides v3.0.0 removed two fields because the web never drew them: `GanttBar.theme` and
`GridCard.tone`. talks' PowerPoint exporter for a client template still reads both, where a deck
sets them:

- a Gantt bar's `theme` sets the bar's phase colour;
- a grid card with `tone: "neutral"` leaves the grid and becomes a source note under it.

On the web every Gantt bar takes the one data hue, and a neutral card is drawn as an ordinary card.

No deck in talks sets either field today, so the reads find nothing and the export draws every bar
in one colour and every card in the grid.

The question is direction: whether a slide type is defined by what the web draws, or may carry
data for one export target. Nothing in slides waits on it.
