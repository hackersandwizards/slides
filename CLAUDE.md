# CLAUDE.md

The hackers&wizards slide engine as one package, `@hackersandwizards/slides`: the slide components,
the deck types, the slide stylesheet and the PDF renderer. Three repos run it and keep only their
decks: `talks` and `hycle-private/talks` on Next.js, `trainer-hub` on Astro. The reasoning is in os
`docs/tracking/2026-10-30-repo-coupling.md`.

This repo is public on GitHub (`github.com/hackersandwizards/slides`). Consumers install it as a Git dependency pinned to a tag,
`git+https://github.com/hackersandwizards/slides.git#v<version>`, which needs no GitHub access. `"private": true` stays:
nothing is ever published. A release is a tag `v<version>` matching `package.json`. Nothing here
writes into another repo.

**Anyone can read this whole repo, its history included.** Nothing goes in that the public may
not see: no customer deck, price, rate, client
term, personal data or secret. Decks live in the consumers, except the fictional specimen deck.

## Layout

- `components/slides/`: one component per slide type, plus the shared parts in `primitives.tsx`.
  A part used by a second slide type moves there.
- `components/ui/`: effects and `image.tsx`, the engine's image.
- `lib/`: hooks, navigation, presenter sync, the edit mode, themes and section styles.
  `lib/adapter.tsx` is the one seam to a consumer's framework: `SlidesAdapterProvider` takes an
  `Image` component and a `navigate(href, replace)`. Without a provider the engine renders a plain
  `<img>` and moves with `history` inside one island (the trainer hub). `lib/next-adapter.tsx` is that
  provider for the Next consumers, `next/image` and the router, and each wraps its root layout in it.
- `types/slide.ts`: the slide types and content blocks a deck may use.
- `styles/slides.css`: the slide scale, the type table and every slide length, read by the
  components by name, never as a literal size. It imports Tailwind and the brand tokens and fonts
  from `@hackersandwizards/brand` through the package, never a sibling path, and names its own
  `components/` and `lib/` as Tailwind sources, since Tailwind never scans `node_modules`.
  `styles/sources.css` names the same sources for a consumer stylesheet that renders the
  components without importing `slides.css`.
- `scripts/render-pdf.ts`: prints a deck's print route to a PDF; each consumer's `export-pdf.ts`
  resolves deck, URL and file name and calls it.
- `scripts/density.ts`: the `slides-density` command each consumer runs in its gate: fails on a
  slide the fit guard shrinks below 0.8, lists those below 0.9. The engine's own regression decks
  are covered where talks runs it over the specimen deck.
- `scripts/render-pptx.ts`: the `slides-pptx` command, a deck JSON to a native PowerPoint file in
  the h&w design with pptxgenjs, post-processed with JSZip for the font kinds and bullet colour.
  Its lengths and sizes are measured off the print route at 1920x1080.
- `specimen/`: `slide-catalogue.ts`, the specimen deck, every slide type and variant with fictional
  content, its images, and the specimen page `index.html` with its compiled `build/slides.css`, one slide per slide
  type and one per content block in print mode, which the brand kit links. `bun run specimen` (`scripts/specimen.ts`)
  writes the page, and `bun run check` fails while it differs from a fresh build.
- `test/`: the engine's unit tests.

`exports` in `package.json` is the whole public surface: every component, the `lib/` modules a
consumer imports, `types/slide`, both stylesheets, `scripts/render-pdf`, the specimen deck and its
images, and the `slides-density` and `slides-pptx` commands in `bin`. Moving or renaming one of them, or adding one, is
a release. Consumers import by those names, `@hackersandwizards/slides/types/slide`, and ship the source: Next lists
the package in `transpilePackages`, Astro in `vite.ssr.noExternal`, each vitest config in
`server.deps.inline`. React, motion, lucide-react, recharts, shiki, Tailwind and the brand package
are peer dependencies, so each consumer holds one copy of each. `pptxgenjs` and `jszip`, which only
`slides-pptx` imports, are optional peers like `puppeteer`: a consumer installs them to run it.

## Commands

- `bun run check`: format, lint, typecheck, unique function names, tests, the brand colour scan
  (`brand-colours.json` holds the exceptions). No hook runs it:
  `.githooks/pre-commit` runs `bun run check:staged`: `gitleaks` over the staged changes,
  `prettier --check` and `eslint` on the staged files. `bun install` points `core.hooksPath` at `.githooks/`.
- `bun run fix`: `eslint --fix`, then `prettier --write`.
- One test file: `bun run test <file>`.
- `bun run dev`: serve the checkout on port 4327 for `http://slides.localhost` (Caddy, as for
  `os.localhost`); the specimen's header links the brand catalogue and the document specimen at
  `brand.localhost` and `documents.localhost`.

## Releasing a change

1. Change the engine here, `bun run check` green, raise `version`, commit, tag `v<version>`, push
   with the tag.
2. In each consumer, raise the tag in `package.json`, `bun install`, run its gate. The regression
   decks are this repo's `specimen/slide-catalogue.ts`, which talks shows and tests, and
   trainer-hub's `slide-master`; a new slide type or variant lands in the specimen deck first.

## Behavioral rules

Project rules live in `.claude/rules/*.md` (relative to this file). Files with no YAML frontmatter
are always-on: read and apply them this session. Files with a `paths:` frontmatter list apply only
when editing files matching those globs. Claude loads these natively and excludes the global
`~/.claude/rules` here via `claudeMdExcludes`. Codex and pi must read `.claude/rules/` themselves
and ignore the global set. These project rules supersede it.
