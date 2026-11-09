---
kind: work
status: open
priority: 2
order: 730
owner: "Agent in talks"
evidence: "measured 09.11.2026 through the engine's `replacedBy` on slides v2.9.0 (commit aec7bdc), every registered deck but the specimen: talks origin/main a19563b, hycle-private origin/main 87ed1a2, both pinned to v2.8.1; trainer-hub v1.4.0 measured 09.11. by its own session"
---

# Move the last deck slides onto catalog entries

Phase 4 of the slide catalog program. Done in trainer-hub and hycle-private: trainer-hub v1.4.0
holds no replaced form outside `slide-master` (which shows 19 on purpose), across 47 decks;
hycle-private's one deck holds none.

Left: talks, 52 slides in 2 of its 13 decks, both client decks: `regular` to `content` 30,
`grid` to `cards` 11, `regular` to comparison `split` 7, `four-column` to `cards` 4. talks owns
that move in its own work item on those decks' deprecated forms: they wait on their client
PowerPoint export learning the `cards` and `numbers` blocks.

Done when talks' decks hold no replaced form and its gate is green.
