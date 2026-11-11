---
kind: work
status: open
priority: 3
order: 2040
area: software-engineering
owner: Ada
evidence: "slides v3.7.3 (7849548): the README keeps the heading Deck structure as a one-line pointer to docs/deck-structure.md. Brand origin/main links docs/deck-structure.md directly (applications/slide-visuals/sketch-prompt.txt line 3, catalog/portal.ts line 385; read 11.11. 20:35). talks origin/main CLAUDE.md line 149 still says the slides README tells which field a statement goes into (os item work-talks-trainer-hub-raise-after-11-11, from 12.11.)."
---

# Drop the README's Deck structure pointer once talks names docs/deck-structure.md

Ada has a slides session delete the pointer heading once talks' CLAUDE.md names docs/deck-structure.md.

The heading stays only so the old references keep working. Brand links the new file already; the
one left is talks' `CLAUDE.md` line 149, held until 12.11. Check it at talks' `origin/main`
(`git grep -n "slides README"`) before deleting; the README change is a patch release, since the
package ships the README.
