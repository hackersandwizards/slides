---
kind: work
status: open
priority: 2
order: 430
owner: Agent (slides session)
evidence: "re-measured 07.11.2026 against slides v1.20.0: `docs/agent-work/2026-11-06-review-round.md` (bar kept, media merge), `docs/agent-work/2026-11-01-catalogue-program.md` group 4 (overview), brand `docs/agent-work/2026-11-01-shared-elements.md` (avatar)"
---

# Phase 2e: the media merge, an overview panel and four parts onto brand elements

- **Media slide into the image blocks.** The blind type-list panel of 06.11.2026 scored the media
  slide against the image blocks at 2.67 of 10 distinct, all six runs merge, the image block
  surviving with the media slide's gallery as its form, noise 0. Not built: it needs a gallery form
  of the image block (several pictures in a row or grid, a video among them, the row's heights) and
  a home for the media slide's tags, which content slides lack; both are visual choices for a
  rendered blind round against the current media slide.
- **`overview` against `phased-pills`.** The os overlap matrix judged a merge without a panel; the
  catalogue program keeps `overview` for rework, and `merge-phased-pills` chose keep for its group.
  The pair has had no blind panel of its own: run one (deck author and trainer) before building
  either.
- **Parts onto brand elements**, each a visible change that needs the rendered result scored against
  the current one: the grid `quotes` cards set their own italic quote instead of `hw-quote`
  (`GridSlide.tsx`); the comparison punchline and the process footer set their own takeaway
  instead of `hw-callout` (`ComparisonSlide.tsx`, `ProcessSlide.tsx`); the media slide's tags are
  their own rounded chip instead of `hw-pill` (`MediaSlide.tsx`, goes with the merge);
  `MediaFrame` stays local to `ContentSlide.tsx` while it has one user.
- **Avatar** waits on brand: five slide types frame a portrait five ways (profiles, regular,
  grid quotes, closing, statement); brand lists the portrait frame as a later shared element.
  **Connector** has no brand element and one drawing per type; no part until a second type
  draws the same one.

Settled: chart `bar` stays beside `bars` (v1.1.0 round, kept on purpose); `Kicker` is brand's
`hw-label` through `SectionHeader` on 15 types.
