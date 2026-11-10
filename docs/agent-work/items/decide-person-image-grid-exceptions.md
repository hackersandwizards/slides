---
kind: decision
status: assumed
priority: 3
order: 1295
owner: Benedikt
evidence: "blind panel 08.11.2026: 3 personas (L&D lead, engineer attending a training, brand designer) x Claude and Codex x 2 runs, 9 surfaces, each as rendered today and with every person image round; noise 0.40 on a 10-point scale"
recommended: keep-frame-on-grids
assumption: "The two card grids keep the square portrait with the brand corner: the frame won on both, in both runs and with both models, by more than the noise. Every other person image goes round."
options:
  - key: keep-frame-on-grids
    label: Keep the brand-corner frame on the two card grids
    detail: The website's team grid and the practitioners list keep square portraits with the brand corner, as exceptions to the round person image. Every other person image goes round (slides since v2.5.0, the website's profile page and the practitioners entry by a brief to each repository).
  - key: round-everywhere
    label: Round everywhere
    detail: The two grids go round too. One shape on every surface, against a lead for the frame that stood outside the noise on both grids.
---

# Should the website's team grid and the practitioners list keep their square portraits?

Veto this if the two card grids should drop their square portraits and go round like the rest.

Blocks nothing; the blind review settled it.

Brand has a round person image (`hw-avatar`) since v1.49.0. A blind panel compared, on nine
surfaces, each surface as it is today with the same surface where every person image is round.
Round won on all five slide surfaces, and slides draw every portrait round since v2.5.0. On the
website's profile page and the practitioners entry the two versions tied, so round wins there too.

On two surfaces the frame won in both runs and with both models, by more than the noise:

| Surface                     | Claude run 1 | Claude run 2 | Codex run 1 | Codex run 2 |
| --------------------------- | ------------ | ------------ | ----------- | ----------- |
| Website team grid           | 8.33 : 6.67  | 8.00 : 6.67  | 9.00 : 8.00 | 9.00 : 8.00 |
| Practitioners list of cards | 8.33 : 6.67  | 7.67 : 7.00  | 9.00 : 8.00 | 9.00 : 8.00 |

Mean overall score, frame : round, per model and run. Reviewers named the reason: in a grid of
cards a square photo fills the card's top, and a circle leaves corners empty inside the card's
square shape.

Across all nine surfaces as one system, round scored 7.83 and the frame 7.67, inside the noise.
