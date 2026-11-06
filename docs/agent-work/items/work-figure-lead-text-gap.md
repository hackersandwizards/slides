---
kind: work
status: open
priority: 3
order: 630
owner: Agent (slides session)
evidence: "slides v1.1.1 session of 06.11.2026: `pdftotext -raw` over the print page's frames.html"
---

# A figure's leading words glue to the figure in a PDF's text: "about4"

`Figure` in `components/slides/Visuals.tsx` draws "about 4" as two spans, the gap a margin
(`--slide-figure-unit-gap`, 0.2em of the small size, 10.5 px at 1920), so the text a PDF, a search
or a screen reader takes reads "about4". Measured: a plain space in place of the margin reads
"about 4" but draws 29 px instead of 10.5 px; a clipped zero-width no-break space and a zero-size
space keep the drawing and still extract as "about4". Fixing it changes the drawn gap, which is
brand's token: a visual choice for a blind panel, or a brand-owned gap expressed as a space.
