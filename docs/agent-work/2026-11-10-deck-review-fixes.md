# Fixes from a client deck's review, 10.11.2026

Ten blind rounds on a client talk raised four engine defects. The talk's content stays in its
consumer; this repository carries fictional specimen slides of the same shape (a full team-topology
proposal, a decision with a label and a hyphenated compound, bars from 10 to 11,175).

## Panel

Blind, shuffled letters per reviewer, the current state scored alongside, full-resolution
screenshots at 1366, 1440 and 390 px. Overall scores 1 to 10, mean per version. Noise was not
measured by repeat runs; a lead under 0.5 counts as a tie.

Round 1, specimen content. Claude: CIO on a laptop call, presentation designer, information
designer; Codex: CIO, presentation designer.

| Set                       | Current | B                  | C                       |
| ------------------------- | ------- | ------------------ | ----------------------- |
| Team topology             | 7.66    | 6.46 (type +2)     | 6.80 (names +1 step)    |
| Bars 10 to 11,175         | 6.36    | 6.06 (min width)   | **8.20** (value at end) |
| Decision: label, compound | 7.08    | **7.60** (fixed)   |                         |
| Deck controls, position   | 6.26    | **8.52** (no pill) | 8.46 (corner hidden)    |

Round 2, the talk's own team-topology content. Claude: team lead on a call, designer; Codex: CIO,
designer. Current 7.58; D, larger type with chips, 7.15; E, larger type with the roles as one line,
7.68. E read larger for three of four (legibility 8 against 7), but on a phone it split a role
across lines and on a laptop it ended a line on its separator.

Round 3, current against E2 (E with each role whole behind a bullet, balanced lines, one role per
row on a phone): E2 won with all three reviewers, 8 : 7, 7 : 6 and 8.3 : 7.3.

## Shipped

- Team topology: E2. Team names, descriptions and experts at the body step the decision slide
  uses; roles as one balanced line instead of chips.
- Bars without a named scale: the value follows its bar's end; a bar keeps a minimum width of one spacing step.
  Three reviewers asked for true widths over a larger minimum, so the minimum is the smallest
  visible one.
- A hyphenated compound up to 24 characters stays on one line from `md` up.
- `sectionLabel` on decision, team-topology, process, wheel, profiles and chart.
- Deck controls: from `md`, where the slide's corner counts the slides, the bar keeps its buttons
  and the count only for screen readers; a phone and a title slide keep the pill. Round 1 tied B
  and C; B won as the calmer one, since nothing on the slide changes when the mouse moves.

## One reviewer prompt, verbatim (round 1, Claude, CIO)

> You are a CIO at a mid-sized company, attending a 30-minute leadership talk partly in the room
> and partly on a video call from your 14-inch laptop.
>
> Medium: slides of a talk, shown full screen in a browser. Real display sizes: a 1366 px or 1440 px
> wide laptop screen (the shared screen on a video call looks the same or smaller), and a 390 px
> wide phone where a participant scrolls the deck. Audience: leaders and team leads in a company
> workshop.
>
> Read every image file in /tmp/claude-sdf/review/claude-leader (PNG). File names are
> <set>-<version>-<width>.png. Each set shows several renderings of the same content; versions are
> letters. […] Score every version of every set on each criterion from 1 (poor) to 10
> (excellent): 1. Legibility at the real display size. 2. Understood within five seconds. 3. Breathing room and visual calm, not cramped. 4. s2 only: proportions stay honest and every
> value can be read and matched to its bar. 5. s4 only: the reader can tell where in the deck they
> are without reading the same fact twice. Then an overall score per version, and one sentence per
> version naming what keeps it below 10.

Review: medium, because a slide type every deck uses changes for a talk on 10.11.
