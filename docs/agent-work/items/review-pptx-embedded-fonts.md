---
kind: review
status: open
priority: 2
order: 1310
owner: Benedikt
area: software-engineering
evidence: "slides-pptx --embed-fonts (scripts/pptx-fonts.ts) writes Inter and JetBrains Mono, regular and bold, as uncompressed Embedded OpenType parts (ppt/fonts/*.fntdata, application/x-fontdata, p:embeddedFontLst), as MS-OI29500 §15.2.13 says PowerPoint stores them; fontTools reads each wrapped font, but LibreOffice 7.4, the only renderer an agent has, ignores embedded fonts, so whether PowerPoint takes these parts is not established"
---

# Does PowerPoint draw the brand fonts from inside the file?

Open the two files below in PowerPoint on a Mac without Inter and JetBrains Mono, and answer
"embedded fonts work", "no difference" or "repair prompt".

The export can now carry Inter and JetBrains Mono inside the `.pptx` (`--embed-fonts`), about
50 kB more. Your question of 10.11. was whether that is possible or too large: size is no issue,
but no agent may open PowerPoint, and LibreOffice ignores embedded fonts.

1. Make the fonts absent: in Font Book, right-click Inter and choose "Deactivate", then the same
   for JetBrains Mono. A Mac that never had them works too.
2. Open both files in PowerPoint:
   - `~/dev/hackersandwizards/engines/slides/node_modules/.cache/slides-pptx-fonts/specimen.pptx` (without the fonts)
   - `~/dev/hackersandwizards/engines/slides/node_modules/.cache/slides-pptx-fonts/specimen-embedded.pptx` (with them)
3. Compare a slide with a headline and body text, such as slide 4, "Agenda".

It works when the embedded file shows the headlines in JetBrains Mono, every letter the same
width, and bold where the plain file shows them bold too, and the body text in Inter, while the
plain file shows stand-ins: a monospace such as Menlo or Courier for the headlines and a sans
such as Helvetica or Arial for the body. Bold headlines that look smeared or thickened are the
regular face made bold by PowerPoint, which counts as "no difference" for bold.

A prompt that PowerPoint "found a problem with content" and offers to repair means it rejected
the font parts: answer "repair prompt". Both files the same, with stand-ins, means PowerPoint
ignored them: answer "no difference".

Then reactivate both fonts in Font Book and answer on the admin page.
