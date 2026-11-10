---
kind: decision
status: open
priority: 3
order: 1350
owner: Benedikt
area: software-engineering
evidence: "git grep on origin/main of talks, trainer-hub and hycle-private (Next seam) and of os, talks, trainer-hub, hycle-private, brand, scaffolding, admin and documents (exports), Fable 5.2 review of 10.11.2026, findings F29 and F34"
recommended: drop-next-and-lib
options:
  - key: drop-next-and-lib
    label: Drop the Next seam and the three unused lib exports, keep tokens.css
    detail: "Removes lib/next-adapter.tsx, SlidesAdapterProvider in lib/adapter.tsx, the navigate parameter, next from peer and dev dependencies (206 MB installed), the README's Next lines, and the exports ./lib/navigate, ./lib/print-context and ./lib/deck-edit-mode. tokens.css stays exported for a design-system page. A minor release; no consumer changes."
  - key: drop-next-only
    label: Drop the Next seam, keep every export
    detail: "The same removal for Next; ./lib/navigate, ./lib/print-context and ./lib/deck-edit-mode stay public."
  - key: keep
    label: Keep both, a Next consumer is planned
    detail: "Nothing is removed. The deck island still reads import.meta.env.DEV in DeckView and PresenterView, which a Next app does not set, so a Next consumer needs that fixed first."
---

# Drop the public surface no consumer uses?

Pick whether the Next adapter and three unused exports go in the next release.

All three consumers run on Astro and none imports `next-adapter`, `SlidesAdapterProvider`,
`./lib/navigate`, `./lib/print-context` or `./lib/deck-edit-mode`. `CLAUDE.md` describes the Next
seam as part of the design, so whether a Next consumer is coming is your call, not a cleanup. Each
removal is a release, and adding an export back later is one too.
