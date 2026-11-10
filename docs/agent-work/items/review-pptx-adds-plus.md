---
kind: review
status: open
priority: 3
order: 1300
owner: Benedikt
area: software-engineering
evidence: "slides v2.13.0 draws the plus as the character + in Inter bold, teal, between the two cards (scripts/render-pptx.ts, beforeAfter); LibreOffice, the only renderer an agent had, drew it as a four-pointed star, so how PowerPoint draws it is not established"
---

# Does PowerPoint draw the plus between an `adds` slide's two cards as a plus?

Open the one-slide deck below in PowerPoint and answer "plus" or "not a plus".

A before-after slide with `adds: true` shows a plus between its cards instead of an arrow: the right
side is added to the left one, which stays. No agent may open PowerPoint, and LibreOffice drew this
plus as a four-pointed star.

In Terminal, run:

```sh
cd ~/dev/hackersandwizards/engines/slides && bun -e 'import { slideCatalog as d } from "./specimen/slide-catalog"; console.log(JSON.stringify({ name: "adds", slides: [d.slides.find((s) => s.type === "comparison" && s.adds)] }))' | bun scripts/render-pptx.ts - /tmp/adds.pptx && open -a "Microsoft PowerPoint" /tmp/adds.pptx
```

It writes `/tmp/adds.pptx`, one slide from the specimen deck ("What stays, what needs building"),
and opens it in PowerPoint.

Correct looks like this: between the card "Stays" on the left and the tinted card "Needs building"
on the right stands one plus sign in teal, two strokes of equal length crossing at right angles,
about as tall as the slide's headline letters. Wrong is a star, a cross with pointed or tapering
arms, a box, or no sign.

Answer on the admin page with "plus" or "not a plus", and for "not a plus" what you see. Then
delete `/tmp/adds.pptx`.
