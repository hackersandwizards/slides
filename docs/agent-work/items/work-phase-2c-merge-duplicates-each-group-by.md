---
kind: work
status: open
priority: 2
order: 420
owner: Agent (slides session)
evidence: "slides 2244788, 1232724, b351e31, a7f65fa (released v0.27.0)"
---

# Phase 2c: one engine case left, a pipeline with inner loops or stage logos

Phase 2c merged the groups of `merge-cards`, `merge-numbers`, `merge-comparison`, `merge-flow`, `merge-statement` and `merge-content` in slides v0.27.0; `merge-phased-pills` chose keep. Each merged type keeps its name and draws through its target until phase 4 moves the decks. Left: a pipeline with `showLoops` or a logo on a stage still draws as pipeline, since flow carries neither. The panel of `merge-flow` scored flow above pipeline on such slides even without the loops, so these move to flow and drop loops and stage logos (agent default from that panel, 06.11.; an engine choice, not one for Benedikt). `types/slide.ts` still marks `showLoops` as moving in phase 4.
