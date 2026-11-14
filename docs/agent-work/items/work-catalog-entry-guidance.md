---
kind: work
status: open
priority: 3
order: 1066
owner: Benedikt
area: software-engineering
evidence: "slides-usage ships in v2.18.0 (scripts/usage.ts, test/usage.test.ts), every entry reachable from a deck; blind panel 08.11.2026 on the print page with and without its when, do and don't: 8.00 to 5.38, noise 0.12, two personas, Claude and Codex, two runs; screenshots taken before seven entries' text was corrected against the real slide types; v3.10.0 shows the counts on the dev server only, its build test red when a build reads the files, and the README says how to start it since bce2269; checked 14.11. on each consumer's origin/main: talks drops 134 sectionTheme fields that drew nothing (198bce4) and commits slides-usage.json at its root with check:usage in its gate (9de8c73), trainer-hub the same with 177 fields (4eb96eba, 5cebd3d7), hycle-private writes talks/slides-usage.json (2b5f018) and runs check:usage too"
images:
  - src: print-page-with-counts.jpg
    caption: "The print page started with two invented count files: a count per entry, 0 in outline, and a warning for a name no entry matches."
---

# Time how fast people find the right catalog entry

Arrange a session where people look up the catalog entry for real search tasks, and time each one.

The print page shows each entry's when, do and don't, and how many deck slides use it when the
catalog is started with `SLIDES_USAGE=<path>[,<path>] bun run dev`; no build reads those files
(`test/pages/astro.test.ts`). talks, trainer-hub and hycle-private commit their counts and check
them in their gates.

Left is the time to the right entry, measured with people. The panel gave the nine search words as
hit counts; it measured no time. No agent can run this.
