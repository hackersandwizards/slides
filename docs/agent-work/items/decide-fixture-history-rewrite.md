---
kind: decision
status: open
priority: 3
order: 900
area: security
owner: Benedikt
recommended: leave
evidence: "slides bd66c48 (fixture added), 8c99e8c (names replaced); this repository is public"
options:
  - key: leave
    label: Leave the history as it is
    detail: "The current files carry neutral names. The old commit stays readable on GitHub to anyone who looks for it."
  - key: rewrite
    label: Rewrite the history
    detail: "Remove the two names from every commit since bd66c48 and force-push. Every tag from then on moves, so each consumer's pin (talks, trainer-hub, hycle-private and others) must be re-pointed, and existing clones keep the old history."
---

# Remove two client project names from the public slides history?

`test/fixtures/team-topology.ts` named two stream-aligned teams after a client's projects ("Advisor
Portal Frankreich", "One Frontstage Checkout") from commit `bd66c48` on. The slides-deck-fixes run
replaced them with neutral names in `8c99e8c`, so the current files are clean. Neither name states
the client's company name, but someone who knows the engagements could recognise it.

The recommendation is to leave the history: a rewrite moves every tag that consumers pin, and
clones made since then keep the names anyway.
