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
    detail: The same replacement, plus a history rewrite (git-filter-repo) and a force push to the public repository. Every commit hash from bd66c48 onward changes, so every release tag the consumers pin moves and each consumer reinstalls. The rewrite could also drop the older commits the review lists under F14, which name a client-named theme class and two of talks' deck slugs.
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

What it shares with that deck, without quoting it: of 15 strings taken from the fixture, 12 stand
verbatim in that deck file (the review of 10.11. counted 11 of its own 15). They are the platform
and enabling team names, their descriptions, the named vendor systems and the description of the
country interfaces. The three strings that miss are stream-team names. The fixture names no client.
`CLAUDE.md` rules out a customer deck and a client term in this repository, and anyone can read
its history.

The recommendation follows from the strings carrying no client name: replacing them ends the match
at no cost to anyone, while a rewrite moves every release tag the three consumers pin. Source: the
whole-repository review of 10.11.2026, finding F03, with F14 for the older history entries.
