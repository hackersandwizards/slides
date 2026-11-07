---
kind: work
status: open
priority: 3
order: 560
owner: Agent (slides session)
evidence: "headless at 375x667, 07.11.2026: catalog story Types/content-slide/prose opened alone"
---

# Corner mark over a phone slide's scrolling text

Below `md` a slide is one column that scrolls (`slides.css`), while the corner row (page counter and
lockup, `SlideContainer`) stays `position: fixed` at the bottom right with no ground of its own. On a
375 px phone the lockup sits over the body text as it scrolls past (prose specimen: over the second
paragraph). The content's bottom padding clears it only at the end of the scroll. This holds in every
consumer's deck, not only in the catalog. The story frame's own 375 px defect (a phone-width 16:9
window, corner over the title) is fixed in v1.16.0.

A second phone defect, seen in the same run: a framed flow (`flow` with `frame`, specimen story
Types/content-slide/visual-flow-framed) at 375 px leaves its steps a 20 px column beside the frame's
notes, so the step tiles stack on one another, the titles overprint and a path in a step breaks
letter by letter. The flow without a frame lays out correctly at the same width. The flow code is
unchanged since v1.15.1, so this predates v1.16.0.

Open: how the corner should behave on a phone (in the flow after the content, a ground behind it, or
hidden while scrolling). That is a visual choice for all three consumers: build the variants, run a
blind review with readers who open a deck link on a phone, then ship.
