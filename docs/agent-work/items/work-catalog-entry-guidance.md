---
kind: work
status: open
priority: 3
order: 1066
owner: Poppy
area: software-engineering
evidence: "slides-usage ships in v2.18.0 (scripts/usage.ts, test/usage.test.ts), every entry reachable from a deck; blind panel 08.11.2026 on the print page with and without its when, do and don't: 8.00 to 5.38, noise 0.12, two personas, Claude and Codex, two runs; screenshots taken before seven entries' text was corrected against the real slide types; checked 13.11. on each consumer's origin/main: hycle-private writes talks/slides-usage.json in its usage script (2b5f018), talks and trainer-hub run slides-usage nowhere"
---

# Give every catalog entry the number of deck slides using it

Brief each consumer to commit its slide counts once `decide-slide-usage-location` is decided.

The print page shows each entry's when, do and don't, and `slides-usage` counts a deck's slides per
entry. Left:

1. `talks` and `trainer-hub` run `slides-usage` over their decks in their own gates and commit the
   JSON, as `hycle-private` already does at `talks/slides-usage.json`; where it lives and whether
   the print page shows it waits on `decide-slide-usage-location`. Since v2.21.0 `slides-usage`
   takes an array of decks.
2. The time to the right entry, measured with people on real search tasks. The panel gave the nine
   search words as hit counts; it measured no time. No agent can run this: it is Benedikt's to
   arrange.
