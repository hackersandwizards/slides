---
kind: decision
status: assumed
priority: 3
order: 820
area: slides
owner: Benedikt
recommended: every-deck
options:
  - key: every-deck
    label: Convert every deck, delivered ones included
    detail: A codemod per repo moves every slide, delivered client decks and past talks included, onto the surviving types. The engine then drops the old types. A delivered deck opened again looks like today's engine; the PDF that was sent stays as it was.
  - key: live-decks-only
    label: Convert only decks still in use
    detail: Delivered decks keep their old slide types. The engine keeps every old type as an alias for as long as such a deck exists, so the catalog never gets rid of them and every engine change is tested against both forms.
---

# Do delivered decks move to the new slide types too?

**Context.** The engine merged near-duplicate slide types (for example five card forms into
`cards`). The old forms still draw through the new ones as aliases. Phase 4
(`work-move-deck-slides-to-catalog-entries`) moves every deck slide in talks, trainer-hub and
hycle-private onto the surviving types, so the aliases can go.

**Why it is a question.** Each consumer pins one engine version for all its decks. A type that
leaves the engine breaks the typecheck of every deck that still uses it, delivered or not. So
either delivered decks are converted too, or the engine keeps the old types for them.

**Assumed** (agent, 01.11.2026): every deck, as delivered decks have followed the engine since
slides v0.4.6. Nothing has been converted yet: the codemods run in phase 4.

**What to look at.** Only whether a delivered client deck may change when it is opened again. The
sent PDFs are not touched either way.
