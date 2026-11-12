---
kind: work
status: open
priority: 3
order: 1962
owner: Ada
area: software-engineering
evidence: "Checked 12.11. on the v3.8.2 build: wheel-slide/specimen 10 px past at 360 and 50 at 320, specimen2 4 to 6 px at 320, profiles-slide/specimen2 21 px at 320, regular-slide/specimen 5 to 6 px at 320; all fit at 390. Visible on phones narrower than 390 px."
---

# Slides whose text runs past a screen narrower than 390 px

Ada briefs a slides session to make the four slides below fit at 360 and 320 px and sweep at those widths.

| Story                      | Past the edge                             |
| -------------------------- | ----------------------------------------- |
| `wheel-slide/specimen`     | a number, 10 px at 360, 50 px at 320      |
| `wheel-slide/specimen2`    | numbers, 4 to 6 px at 320                 |
| `profiles-slide/specimen2` | the company's one long word, 21 px at 320 |
| `regular-slide/specimen`   | a role and a handle, 5 to 6 px at 320     |

The cause of the wheel's run is not yet explained. Done when each row fits at 360 and at 320 px, with
the sweep in `phone-grids.test.ts` run at those widths too.
