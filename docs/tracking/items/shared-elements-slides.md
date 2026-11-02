---
kind: decision
status: assumed
priority: 3
order: 80
area: slides
owner: Benedikt
assumption: "Tie goes to brand; what the brand card, label and callout have no hue for (purple, amber, green, red cards and labels, status callouts) stays the slide's own until brand adds a hue setting."
---

# Slides take card, label, pill, callout, link, strip and the play button from brand; ten exceptions

v0.23.0 (decision shared-elements, a + r1). On the slides the brand elements render at the stage scale. Where slides have their own token, its value goes into the element's setting (hairline as a 1px layout border plus overlay, corner, strip, the pill's kicker size). Visible changes: kickers and muted labels take brand's teal-dark and label leading, the primary tinted card's border drops from full teal to 40 %, the info callout gets the purple left rule instead of a 2px frame, the play button takes the stage control size (4.125rem instead of 5rem), and the strip blends in sRGB instead of oklab. Pixels: 50 of 61 specimen frames differ, at most 3.7 %; screenshot noise is 0. Blind panel, 2 personas, Claude Opus and Codex: before 7/7/7 and 8/8.3/8.5, after 7/7/7 and 8/8.5/8.5, noise up to 0.5. That is a tie, and a tie goes to brand. The exceptions and their reasons are in brand-elements.json.
