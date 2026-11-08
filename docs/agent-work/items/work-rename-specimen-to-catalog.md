---
kind: work
status: open
priority: 3
order: 950
owner: Agent (slides session)
evidence: "os `docs/agent-work/2026-11-08-repo-structure-audit.md`, finding 9; left by the cleanup of 08.11.2026"
---

# Rename the specimen deck from `slide-catalogue` to `slide-catalog`

Code, scaffolding's preset and brand's elements say `catalog`; the specimen deck still says
`catalogue`, so a search for one spelling misses half. The cleanup of 08.11.2026 renamed the
report, the page test and the items; the rest is an exported path, so it is a release:

- `specimen/slide-catalogue.ts` and `specimen/slide-catalogue/` to `slide-catalog`, the exports in
  `package.json`, `slideCatalogue` and `slideCatalogueBrandDark` to `slideCatalog…`, the deck name
  "Slide Catalogue", the storage key `slide-catalogue-question`, and every import in `catalog/`
  and `test/`, `README.md` and `CLAUDE.md`.
- In the print page `catalog/pages/catalog/print/index.astro`: the `#catalogue` anchor and the
  `.catalogue` class.
- Consumer briefs in the release: talks (`data/presentations/index.ts`, `CLAUDE.md`, the deck slug
  `slide-catalogue` with a redirect from the old URL), trainer-hub (`slide-master.ts`,
  `deck-assets.test.ts`, the ContentSlide story, `.gitignore`, `CLAUDE.md`).

Run it when no other session edits the specimen deck: it moves the file every new slide type
lands in. English prose may keep "catalogue".
