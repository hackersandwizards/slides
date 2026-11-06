# CLAUDE.md

The hackers&wizards slide engine as one package, `@hackersandwizards/slides`: the slide components,
the deck types, the slide stylesheet and the PDF renderer. Three repos run it and keep only their
decks, all on Astro: `talks`, `trainer-hub` and `hycle-private` (its decks in `talks/`). The reasoning is in os
`docs/agent-work/2026-10-30-repo-coupling.md`.

This repo is public on GitHub (`github.com/hackersandwizards/slides`). Consumers install it as a Git dependency pinned to a tag,
`git+https://github.com/hackersandwizards/slides.git#v<version>`, which needs no GitHub access. `"private": true` stays:
nothing is ever published. A release is a tag `v<version>` matching `package.json`. Nothing here
writes into another repo.

**Anyone can read this whole repo, its history included.** Nothing goes in that the public may
not see: no customer deck, price, rate, client
term, personal data or secret. Decks live in the consumers, except the fictional specimen deck.

## Layout

- `components/slides/`: one component per slide type, composed only from the parts in
  `primitives.tsx` and `SlideChrome.tsx` (`SlideCard`, `DisplayHeading`, `NumberTile`,
  `DashedFrame`, `VideoPlayer` and the rest). A part used by a second slide type moves there; a real
  difference is a variant of the part, never a class string of the type's own. `PrintSlide.tsx` is
  the printed page, strip and corner included, and `PrintDeck` the whole deck a consumer's print
  route renders, which the print page renders too.
- `components/ui/`: effects and `image.tsx`, the engine's image.
- `lib/`: hooks, navigation, presenter sync, the edit mode, themes and section styles.
  `lib/adapter.tsx` is the one seam to a consumer's framework: `SlidesAdapterProvider` takes an
  `Image` component and a `navigate(href, replace)`. Without a provider the engine renders a plain
  `<img>` and moves with `history` inside one island, as every consumer does. `lib/next-adapter.tsx`
  is that provider for a Next app, `next/image` and the router, wrapped round its root layout.
  `lib/deck-edit.ts` is the edit mode's file logic, `lib/deck-edit-server.ts` its write endpoint
  as one Node request handler, which each consumer mounts on its dev server with its own map from
  deck path to file. `lib/vite.ts` is a consumer's Vite `optimizeDeps`, read from the engine's
  imports.
- `types/slide.ts`: the slide types and content blocks a deck may use.
- `styles/tokens.css`: the slide's roles, each a `var()` over brand: it imports the brand tokens,
  brand's `stage.css` (the slide scale, the type table, measures, spacing, rules and marks, every
  literal a slide draws) and `night.css` (night on `data-hw-night`, which a night deck's frame and a
  deep-dive slide's shell carry), and derives the type steps and colours from them; the README
  names the brand version a consumer pins.
  `styles/slides.css` imports Tailwind and `tokens.css` and names tokens only, as do the components;
  `test/tokens.test.ts` fails on a raw length or colour anywhere else. `slides.css` imports the brand list marker (`marker.css`) from `@hackersandwizards/brand`
  through the package, never a sibling path, and the brand's shared elements (`elements.css`)
  and sets their stage scale's settings the engine owns a token for; `SlideShell` puts
  `data-hw-scale="stage"` (and `data-theme="dark"` on night) on every slide. A part that draws a
  brand element renders its `hw-*` class and changes it only through the element's `--hw-*`
  settings (a card's padding is a `card-pad-*` utility); what the brand has no rule for is an
  exception in `brand-elements.json` with its reason. `slides.css` names its own
  `components/` and `lib/` as Tailwind sources, since Tailwind never scans `node_modules`.
  `styles/sources.css` names the same sources for a consumer stylesheet that renders the
  components without importing `slides.css`. `scaffolding.styles` in `package.json` lists both, so a
  consumer's `check-coupling` lets them through.
- `scripts/render-pdf.ts`: prints a deck's print route to a PDF; each consumer's `export-pdf.ts`
  resolves deck, URL and file name and calls it.
- `scripts/pins.ts`: the `slides-pins` command each consumer runs first in its gate: fails when
  `node_modules` holds another version of an `@hackersandwizards/*` package than `package.json` pins.
- `scripts/density.ts`: the `slides-density` command each consumer runs in its gate: fails on a
  slide the fit guard shrinks below 0.8, lists those below 0.9. The engine's own regression decks
  are covered where talks runs it over the specimen deck.
- `scripts/render-pptx.ts`: the `slides-pptx` command, a deck JSON to a native PowerPoint file in
  the h&w design with pptxgenjs, post-processed with JSZip for the font kinds and bullet colour.
  Its lengths and sizes are measured off the print route at 1920x1080.
- `specimen/`: `slide-catalogue.ts`, the specimen deck, every slide type and variant with fictional
  content, and its images (`specimen/slide-catalogue/`, which talks copies into its `public/`).
- `catalog/`: the catalog (decision repo-uniformity-plan, hub-max), one Astro app in scaffolding's
  catalog shell (`catalog({...})` in `catalog/astro.config.ts`), never shipped but for
  `SlideFrame.astro`, the story frame a consumer's catalog takes too: Astrobook, `@astrojs/react`
  and scaffolding are dev dependencies, outside `files` and `exports`. Its base is
  the Pages path `/slides`, so the gate reads the build that ships. It carries two kinds of page:
  - The stories: `stories/Types/` a story file per slide type, each specimen slide of the type a
    state (`state.ts`); `stories/Parts/` one per part, drawing its sheet of variants from
    `parts.ts`. `test/catalog-stories.test.ts` fails on a type, specimen slide or part without its
    story. `Home.astro` renders the shell's home with the foundations.
  - The print pages, `pages/catalog/print/` over `print.ts`: `index.html`, a Parts section (every
    part of `primitives.tsx` and `SlideChrome.tsx` in each variant, with the slide types using it),
    the Shared elements section (each brand element the slides use as a tile, each exception with
    its reason), then the catalogue in print mode: one slide per slide type (anchored by its name,
    which the brand kit links), per further variant and per content block, each under one or two of
    the 13 communication jobs, with a search over all; `frames.html`, every frame inline, since
    `brand-elements` reads no frame; and `build/slides.css`, compiled by Tailwind. The build copies
    each brand file the pages link to `dist/brand/` under its export name and the deck's images beside the pages, so `brand-elements` and
    the page tests (`test/pages/`) read them from `dist/` as files, with no server.
  - The routes `/slides/specimen/` and `/slides/design-system/` forward old links, anchor kept, to the
    print page and the catalog.
- `test/`: the engine's unit tests.

`exports` in `package.json` is the whole public surface: every component, the `lib/` modules a
consumer imports, `types/slide`, the three stylesheets (`slides.css`, `sources.css`, and `tokens.css`, which a consumer's design-system page reads), `scripts/render-pdf`, the specimen deck and its
images, the catalog's `SlideFrame.astro`, and the `slides-density`, `slides-pins` and `slides-pptx` commands in `bin`. Moving or renaming one of them, or adding one, is
a release. Consumers import by those names, `@hackersandwizards/slides/types/slide`, and ship the source: Next lists
the package in `transpilePackages`, Astro in `vite.ssr.noExternal`, each vitest config in
`server.deps.inline`. React, motion, lucide-react, recharts, shiki, Tailwind and the brand package
are peer dependencies, so each consumer holds one copy of each. `pptxgenjs` and `jszip`, which only
`slides-pptx` imports, are optional peers like `puppeteer`: a consumer installs them to run it.
`prettier`, which `lib/deck-edit-server` formats an edited deck with, is optional too, as is
`astro`, which only the exported `catalog/SlideFrame.astro` needs.

## Commands

- `bun run check`: `scaffolding check`, the shared steps side by side (install, format, lint,
  stylelint over `stylelint.config.js`, typecheck, structure, coupling, unique names, confidential, the unit
  tests, the catalog build, the item check `admin`), then the `scaffolding.check` steps in
  `package.json`: `check:pins`, `check:colours` (`brand-colours.json` holds the exceptions) and `check:copies`
  (`brand-copies`), then `check:pages`
  (the tests in `test/pages/` over the built print pages), then `check:elements`
  (`brand-elements` over the print pages, `brand-elements.json`). No hook runs it:
  `.githooks/pre-commit` runs `bun run check:staged`, scaffolding's `check-staged` (`gitleaks`,
  coupling and confidential over the staged changes, `prettier --check` and `eslint` on the staged
  files, `admin-check` when an item is staged); `commit-msg` runs `check-confidential` on the message; the hooks are scaffolding's skeleton. `bun install` points `core.hooksPath` at `.githooks/`.
- `bun run fix`: `eslint --fix`, then `prettier --write`.
- One test file: `bun run test <file>`.
- `bun run dev` (or `bun run catalog`, which opens it): the catalog at
  `http://127.0.0.1:4335/`, the print page at `/catalog/print/`: dev serves without the `/slides` base.
- `bun run build`: the catalog to `dist/`, which the Pages workflow (scaffolding's reusable one)
  publishes at `https://hackersandwizards.github.io/slides/`.

## Releasing a change

1. Change the engine here, `bun run check` green, raise `version`, commit, tag `v<version>`, push
   with the tag.
2. Brief a session in each consumer to raise the tag in its `package.json`, `bun install` and run
   its gate. The regression
   decks are this repo's `specimen/slide-catalogue.ts`, which talks shows and tests, and
   trainer-hub's `slide-master`; a new slide type or variant lands in the specimen deck first.

## Behavioral rules

Project rules live in `.claude/rules/*.md` (relative to this file). Files with no YAML frontmatter
are always-on: read and apply them this session. Files with a `paths:` frontmatter list apply only
when editing files matching those globs. Claude loads these natively and excludes the global
`~/.claude/rules` here via `claudeMdExcludes`. Codex and pi must read `.claude/rules/` themselves
and ignore the global set. These project rules supersede it.
