---
kind: decision
status: assumed
priority: 3
order: 490
owner: Benedikt
evidence: "grep of the talks, trainer-hub and hycle-private decks on origin/main, 06.11.2026: no deck uses chart `cycle` or `graph`"
recommended: keep
options:
  - key: keep
    label: Keep both
    detail: They stay in the catalogue and draw in like the other charts since v1.1.0.
  - key: drop
    label: Drop both
    detail: Removes their specimen slides, stories and pptx code; a release, no deck changes.
assumption: "Keep both: the review round asked to animate cycle, so it was animated rather than removed."
---

# Should the chart variants `cycle` and `graph` stay, though no deck uses them?

Only the specimen deck shows them. The catalogue is smaller without them, and a future deck that
needs a cycle or a curve would have to draw it another way.
