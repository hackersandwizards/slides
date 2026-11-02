---
kind: decision
status: open
priority: 2
order: 1007
area: slides
owner: Benedikt
recommended: merge
options:
  - key: merge
    label: Merge into content
    detail: A codemod converts the 60 slides; PDFs already sent stay as they are.
  - key: keep
    label: Leave it
    detail: regular stays a type of its own.
images:
  merge: docs/tracking/2026-11-01-catalogue-program/merge-textfolie.jpg
---

# Should regular merge into content?

regular (60 deck slides, 54 of them in talks) sets sections with title, list, text, link and icon, optionally a profile sidebar. content (1,033) builds the same from blocks. The sidebar would become an option of content. The biggest conversion in phase 4, mainly pitch and client decks in talks. Applies only after a tie in the blind panel. Report, group 6.
