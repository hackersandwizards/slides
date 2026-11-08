---
kind: decision
status: assumed
priority: 2
order: 430
area: slides
owner: Benedikt
assumption: "Every deck, by a codemod per repo, following the decisions in the merge rows."
---

# Phase 4 converts every deck, including those already delivered

A type that drops out of the engine breaks the typecheck of every deck that uses it. So phase 4 moves all 52 decks in talks, trainer-hub and hycle, deliveries and client decks included, just as delivered decks have followed the engine since slides v0.4.6. PDFs already sent stay as they are.
