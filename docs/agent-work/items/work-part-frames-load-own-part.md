---
kind: work
status: open
priority: 3
order: 900
owner: Agent (slides session)
evidence: "`docs/agent-work/2026-11-08-performance.md`, section Open (commit 31cefea)"
---

# Each part frame in the catalog loads only its own part

`Part.tsx` reads `catalog/parts.ts`, which imports Shiki's `highlightLines` statically for the
CodePanel tile, so every part frame loads `code-highlight.*.js` (462 KB raw, 84 KB gzip), PulseDot
and NumberTile included. Swapping in `CodeLines` would load it lazily, but the print page renders
`PARTS` to static markup that never hydrates, so its CodePanel tile would lose its highlighting.

Do: split `parts.ts` so each part story imports only its own render, then measure the part frames
as the performance report does. Done when a part frame other than CodePanel loads no
`code-highlight` chunk.
