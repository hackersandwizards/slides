---
kind: work
status: open
priority: 3
order: 1400
owner: Ada
area: software-engineering
evidence: "talks build of 10.11.2026 12:12, specimen deck slide-catalog (126 slides), page /slide-catalog/5/: 111,263 B of HTML, 20,961 B gzipped, 90% of it island props; the deck's folder 14 MB; one cold load at 390x844, 150 ms latency, 9 Mbit/s, CPU 4x slower, three runs: 277,563 B gzipped over 13 resources, DOMContentLoaded 565 to 574 ms, every island hydrated 1,146 to 1,185 ms"
---

# Every slide page embeds its whole deck

Ada briefs a slides session to serve each deck once as a shared asset, if the build size is worth a day or two.

Every slide page of a deck carries the deck as the `DeckView` island's props, so a 126-slide deck
writes 126 copies: 14 MB in talks' build. For the audience the cost is smaller: the props are
about 19 KB gzipped of a 278 KB first load (7%), and moving between slides stays inside the
island and loads no page.

The fix changes `DeckView`'s props (a deck URL instead of `presentation`), has the server render
keep the slide it shows, has the island fetch the deck before it hydrates, and moves each
consumer's deck page and build to emit one JSON per deck: a release and a change in talks,
trainer-hub and hycle-private. Estimate: one to two days, my judgement from the files it touches
(`components/deck/DeckView.tsx`, the presenter view, three consumers' deck routes), not
cross-checked against a measured velocity.
