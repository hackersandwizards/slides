---
kind: work
status: open
priority: 3
order: 1400
owner: Ada
area: software-engineering
evidence: "Checked 12.11.: DeckView still takes the whole presentation as props (components/deck/DeckView.tsx:18, 34). Internal: build size, about 7 % of a first load."
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
