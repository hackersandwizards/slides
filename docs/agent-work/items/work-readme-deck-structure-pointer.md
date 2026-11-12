---
kind: work
status: open
priority: 3
order: 2040
area: software-engineering
owner: Ada
evidence: "talks d474ca7 (12.11.): CLAUDE.md line 150 links docs/deck-structure.md; git grep for the old wording or the README anchor in trainer-hub, os, hycle-private, brand, website and documents at origin/main finds nothing, with talks d3c7b06 line 149 as the control that hits. slides v3.7.3 (7849548): the README keeps the heading Deck structure as a one-line pointer to docs/deck-structure.md. Brand origin/main links docs/deck-structure.md directly (applications/slide-visuals/sketch-prompt.txt line 3, catalog/portal.ts line 385; read 11.11. 20:35)."
---

# Drop the README's Deck structure pointer: no reference to it is left

Ada has a slides session delete the README's Deck structure pointer heading and release it as a patch.

The heading stayed only so the old references kept working. Brand links the new file already, and
talks' `CLAUDE.md` names `docs/deck-structure.md` since d474ca7 (12.11.); no other repository
refers to the README section. The README change is a patch release, since the package ships the
README.
