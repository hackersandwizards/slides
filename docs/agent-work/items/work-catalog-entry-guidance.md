---
kind: work
status: open
priority: 2
order: 600
owner: Agent (slides session)
evidence: "`slides-usage` ships in v2.18.0 (`scripts/usage.ts`, `test/usage.test.ts`), every entry reachable from a deck; blind panel 08.11.2026 on the print page with and without its when, do and don't: 8.00 to 5.38, noise 0.12, two personas, Claude and Codex, two runs; screenshots taken before seven entries' text was corrected against the real slide types"
---

# Give every catalog entry the number of deck slides using it

The print page shows each entry's when, do and don't, and `slides-usage` counts a deck's slides per
entry. Left:

1. Each consumer (`talks`, `trainer-hub`, `hycle-private`) runs `slides-usage` over its decks in its
   own gate and publishes the JSON. The public engine reads no client deck, so the print page can
   show the numbers only from what the consumers publish.
2. The time to the right entry, measured with people on real search tasks. The panel gave the nine
   search words as hit counts; it measured no time. No agent can run this.
