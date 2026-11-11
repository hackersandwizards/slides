---
kind: work
status: open
priority: 3
order: 1962
owner: Ada
area: software-engineering
evidence: "sweep of every stories/Types page of the v2.18.0 build at 360 and 320 x 844 px on 09.11.2026, text whose box ends past the viewport, read by a script; at 390 px all of them fit (test/pages/phone-grids.test.ts)"
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
