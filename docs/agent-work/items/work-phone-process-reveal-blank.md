---
kind: work
status: open
priority: 3
order: 562
owner: Agent (slides session)
evidence: "headless at 375x667, 07.11.2026: talks dev server, two process slides with a progressive reveal (pinned slides v1.15.0), 1.5 s after load"
---

# A process slide that reveals its steps opens empty on a phone

A process slide whose steps appear one by one (`useProgressiveReveal` in `ProcessSlide.tsx`) shows
only its title when opened at 375 px: no step until the reader presses next. Every reviewer in the
phone panel of 07.11.2026 flagged it as a broken slide. "Six stages, static" in the specimen deck
shows all its steps. Not yet explained: whether the reveal is meant to run on a phone, where a
reader scrolls rather than steps, and whether pressing next reveals the steps or moves to the next
slide there.
