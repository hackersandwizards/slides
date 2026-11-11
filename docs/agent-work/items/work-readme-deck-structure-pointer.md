---
kind: work
status: open
priority: 3
order: 2040
area: software-engineering
owner: Ada
evidence: "slides v3.7.3 (7849548): the README keeps the heading Deck structure (README.md line 54 at origin/main, read 11.11. 18:00) as a one-line pointer to docs/deck-structure.md. Three links still use it: brand applications/slide-visuals/sketch-prompt.txt line 3 and catalog/portal.ts line 378 (run brand-next, working on both now), talks CLAUDE.md lines 148-149 (os item work-talks-trainer-hub-raise-after-11-11, from 12.11.)."
---

# Drop the README's Deck structure pointer once its three links are repointed

Ada has a slides session delete the pointer heading once brand and talks link docs/deck-structure.md directly.

The heading stays only so the old links keep working. Two are in brand, which run brand-next
repoints now; one is in talks, held until 12.11. Check each at its repository's `origin/main`
(`git grep -n "Deck structure"`) before deleting; the README change is a patch release, since the
package ships the README.
