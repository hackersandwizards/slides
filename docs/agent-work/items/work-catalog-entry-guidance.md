---
kind: work
status: open
priority: 2
order: 720
owner: Agent (slides session)
evidence: "every print-page entry carries its when, do and don't since this commit (`catalog/guidance.ts`, a page test); blind panel 08.11.2026 on the page with and without them: 8.00 to 5.38, noise 0.12, two personas, Claude and Codex, two runs; screenshots taken before seven entries' text was corrected against the real slide types"
---

# Give every catalog entry the number of deck slides using it

The print page shows each entry's when, do and don't. Left:

1. The number of deck slides using each entry, which each consumer counts in its own gate: the
   public engine reads no client deck, so this ships as a `slides-usage` command in `bin` (a
   release) that a consumer runs and publishes.
2. The time to the right entry, measured with people on real search tasks. The panel gave the nine
   search words as hit counts; it measured no time.
