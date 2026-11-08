---
kind: work
status: open
priority: 3
order: 1560
owner: an agent
evidence: "v2.7.0 specimen deck story at 1280: with the shortcut dialog open, ArrowRight moved the deck to /specimen/1 and the dialog closed. The other cases below are read from the code by a review and not reproduced"
---

# The deck's shortcut dialog does not hold the input while it is open

`components/slides/SlideNavigation.tsx`, unchanged by v2.7.0:

- `handleKeyDown` never asks whether the dialog is open, so an arrow, Space, PageDown, F or S acts
  on the deck behind it and in the deck's other windows. Reproduced for ArrowRight. The slides' own
  capture-phase key handlers run first, so a guard in `handleKeyDown` alone does not cover them.
- `handleTouchEnd` steps the deck on a horizontal swipe made on the dialog (not reproduced).
- A text selection that starts in the panel and ends on the backdrop closes the dialog, since the
  backdrop test reads only the click's coordinates (not reproduced).
- The inline `ref` calls `showModal` on any render while the dialog is closed, which can reopen it
  between Esc and the queued `close` event (not reproduced).
- `?` is the only way to open the dialog, so a phone without a keyboard never reaches it.

Done when each case above is reproduced and fixed, or ruled out with its measurement.
