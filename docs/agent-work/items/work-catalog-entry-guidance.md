---
kind: work
status: open
priority: 3
order: 1066
owner: Poppy
area: software-engineering
evidence: "slides-usage ships in v2.18.0 (scripts/usage.ts, test/usage.test.ts), every entry reachable from a deck; blind panel 08.11.2026 on the print page with and without its when, do and don't: 8.00 to 5.38, noise 0.12, two personas, Claude and Codex, two runs; screenshots taken before seven entries' text was corrected against the real slide types; checked 13.11. on each consumer's origin/main: hycle-private writes talks/slides-usage.json in its usage script (2b5f018), talks and trainer-hub run slides-usage nowhere; v3.10.0 shows the counts on the dev server only, its build test red when a build reads the files"
---

# Give every catalog entry the number of deck slides using it

Brief talks and trainer-hub to commit their slide counts, and measure the time to the right entry.

The print page shows each entry's when, do and don't, and since v3.10.0 how many slides use it
when the catalog is started with `SLIDES_USAGE=<path>[,<path>] bun run dev`; no build reads those
files (`test/pages/astro.test.ts`). Left:

1. Decided on 14.11.: each consumer commits its counts, and the print page shows them only when
   started locally. `talks` and `trainer-hub` run `slides-usage` over their decks in their own
   gates and commit `slides-usage.json` at the repository root, as `hycle-private` already does at
   `talks/slides-usage.json`. Since v2.21.0 `slides-usage` takes an array of decks.
2. The time to the right entry, measured with people on real search tasks. The panel gave the nine
   search words as hit counts; it measured no time. No agent can run this: it is Benedikt's to
   arrange.
