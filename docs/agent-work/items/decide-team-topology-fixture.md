---
kind: decision
status: open
priority: 2
order: 200
owner: Benedikt
evidence: "test/fixtures/team-topology.ts, in the tree and in public history since bd66c48 (30.10.2026); counted against talks' origin/main on 10.11.2026"
recommended: replace-keep-history
options:
  - key: replace-keep-history
    label: Replace the fixture with invented text now and leave history as it is
    detail: The test's fixture takes invented team names and descriptions of the same shape, as the specimen's team-topology slides already use. One commit, no effect on consumers. The current strings stay readable in this public repository's history.
  - key: replace-rewrite-history
    label: Replace the fixture and rewrite the public history
    detail: The same replacement, plus a history rewrite (git-filter-repo) and a force push to the public repository. Every commit hash from bd66c48 onward changes, so every release tag the consumers pin moves and each consumer reinstalls. The rewrite could also drop the older commits the review lists under F14, which name a client-named theme class and two of talks' deck slugs. Commit 547329a records that Benedikt decided on 10.11. to leave the history for the two client project names this fixture carried until 8c99e8c; this option reopens that.
  - key: leave
    label: Leave the fixture as it is
    detail: The strings carry no client name; the fixture stays the densest real picture the test renders.
---

# Does the team-topology test fixture stay in this public repository?

Decide whether the test fixture that matches a client deck is replaced, and whether history is rewritten.

`test/fixtures/team-topology.ts` is the densest picture the team-topology test renders: three
stream teams, two platform teams, three enabling teams and three complicated-subsystem teams. It is
the target team picture of one client enablement deck in talks (`data/presentations/` on
`origin/main`), copied into this repository on 30.10.2026.

What it shares with that deck, without quoting it: of 19 strings taken from the fixture, 14 stand
verbatim in that deck file (the review of 10.11. counted 11 of its own 15). The 14 are both
platform team names with their descriptions and one role line, the three enabling team names, and
the three complicated-subsystem names (two vendor products and one name for the surrounding
systems) with their descriptions. The five that miss are the headline, the subtitle and the three
stream-team names. The fixture names no client.
`CLAUDE.md` rules out a customer deck and a client term in this repository, and anyone can read
its history.

The history question for this fixture's two former project names is settled: commit 547329a
records that Benedikt decided on 10.11. to leave it. This item asks about the strings the fixture
still holds today.

The recommendation follows from the strings carrying no client name: replacing them ends the match
at no cost to anyone, while a rewrite moves every release tag the three consumers pin. Source: the
whole-repository review of 10.11.2026, finding F03, with F14 for the older history entries.
