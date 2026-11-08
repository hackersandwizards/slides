---
kind: work
status: open
priority: 2
order: 435
owner: Agent (slides session)
evidence: "slides e383ac9 (v0.27.0): the print page by communication job, with search; no entry carries a text yet"
---

# Give every catalog entry its "when to use" text

The print page (`/slides/catalog/print/`) shows every slide type, variant and content block under
the 13 communication jobs, with a search and a 1440 px view per entry. A deck author still has to
guess which entry fits: no entry says when to use it.

Left:

1. Per entry, beside its slide in the specimen deck: one sentence "when to use", a do and a don't,
   and the number of deck slides using it, which each consumer counts in its own gate (the
   public engine reads no client deck). `test/specimen-coverage.test.ts` then requires the fields.
2. A blind panel on the finished page: a trainer looking for a slide and a designer, with search
   tasks ("a slide for a schedule"), time to the right entry measured, today's page against the
   new one.
