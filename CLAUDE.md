# CLAUDE.md

The hackers&wizards slide engine as one package, `@hackersandwizards/slides`: the slide components,
the deck types, the slide stylesheet and the PDF renderer. Three repos run it and keep only their
decks, all on Astro: `talks`, `trainer-hub` and `hycle-private` (its decks in `talks/`). The reasoning is in os's
history, removed there on 06.11.: `git log --all -- '*2026-10-30-repo-coupling.md'`.

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
  route renders, which the print page renders too. A CSS rule one component owns lives in a `.css`
  beside it, which `slides.css` imports where the rule stands in the cascade, never the component
  itself: trainer-hub's hub pages render components without `slides.css`.
- `components/deck/`: what a deck site draws round the slides, `DeckView` (a deck page's one
  island) and `DeckTile` (one deck on a deck list); the list itself stays each site's.
- `components/ui/`: effects and `image.tsx`, the engine's image.
- `lib/`: hooks, navigation, presenter sync, the edit mode, themes and section styles.
  `lib/brand-logos.ts` is the h&w marks as `?url` imports of brand's exports, which `Image` draws
  for the root paths a deck names them by (`HW_LOGO`, `/hw-lockup.svg`), and their sizes from brand's
  `logos.json`.
  The engine draws a plain `<img>` and moves with `history` inside one island, as every consumer,
  all on Astro, needs.
  `lib/deck-edit-mode.tsx` is the edit mode, which a tab opened with `?edit` starts with E,
  `lib/deck-edit.ts` its file logic, `lib/deck-edit-server.ts` its write endpoint
  as one Node request handler, which each consumer mounts on its dev server with its own map from
  deck path to file. `lib/vite.ts` is a consumer's Vite `optimizeDeps`, read from the engine's
  imports.
- `types/slide.ts`: the slide types and content blocks a deck may use. `types/url-imports.d.ts`
  declares the `?url` imports for a consumer's own typecheck.
- `styles/tokens.css`: the slide's roles, each a `var()` over brand: it imports the brand tokens,
  brand's `stage.css` (the slide scale, the type table, measures, spacing, rules and marks, every
  literal a slide draws) and `night.css` (night on `data-hw-night`, which a night deck's frame and a
  deep-dive slide's shell carry), and derives the type steps and colours from them; the README
  names the brand version a consumer pins.
  `styles/slides.css` imports Tailwind and `tokens.css` and names tokens only, as do the components;
  `test/tokens.test.ts` fails on a raw length or colour anywhere else. `slides.css` imports the brand list marker (`marker.css`) from `@hackersandwizards/brand`
  through the package, never a sibling path, the brand elements a slide draws, one
  `elements/<name>.css` each (`test/brand-elements.test.ts` holds the list to the classes
  `components/` and `lib/` use; the print page links the few only it draws), and its
  text base (`text-base.css`: heading faces and weights, balanced headings, pretty paragraphs)
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
- `scripts/pins.ts`, `density.ts`, `usage.ts` and `render-pptx.ts`: the four commands in `bin`,
  whose behaviour `docs/commands.md` owns. `slides-density --site` serves through
  `scripts/serve-dir.ts`, which the page tests use too; the engine's own regression decks are
  covered where talks runs it over the specimen deck. `slides-usage` counts per anchor of
  `catalog/guidance.ts` and the consumer publishes it: the public engine reads no client deck; its lint of fields that change nothing drawn is
  `ignoredFields`, proven by `test/ignored-fields.test.tsx`.
  `slides-pptx` writes with pptxgenjs, post-processed with JSZip for the font kinds and bullet colour.
  `scripts/pptx-text.ts` measures its text with the brand faces' metrics and finds text past its
  box, which `--strict` fails on; `scripts/pptx-fonts.ts` embeds the faces under `--embed-fonts`.
  Its lengths and sizes are measured off the print route at 1920x1080.
- `specimen/`: `slide-catalog.ts`, the specimen deck, every slide type and variant with fictional
  content, and its images (`specimen/slide-catalog/`), which it imports as `?url` like brand's
  logos, so a consumer's bundler serves them and `specimenImages` names them.
  `test/specimen-coverage.test.ts` fails on a slide type, content block or variant it does not show.
- `catalog/`: the catalog (decision repo-uniformity-plan, hub-max), one Astro app in scaffolding's
  catalog shell (`catalog({...})` in `catalog/astro.config.ts`), never shipped but for
  `guidance.ts`, which `slides-usage` reads, and `SlideFrame.astro`, the story frame a consumer's catalog takes too, which imports its own page
  size and card and below 40rem offers the slide enlarged across the turned phone: Astrobook, `@astrojs/react`
  and scaffolding are dev dependencies, outside `files` and `exports`. Its base is
  the Pages path `/slides`, so the gate reads the build that ships. The catalog's `css` is brand's
  tokens, `homeCss` adds its faces and elements, `dashboardCss` its faces and focus ring; each state hands
  `slides.css` to `SlideFrame` as a `?url`, linked on the slide's page alone. It carries two kinds of page:
  - The stories: `stories/Types/` a story file per slide type, each specimen slide of the type a
    state (`state.ts`), drawn by `StorySlide.tsx` as its deck shows it, strip, corner mark and
    page counter included, and entering as a slide reached from the one before; `stories/Parts/`
    one per part, drawing its sheet of variants from `parts.ts`; `stories/Deck/` one per
    component of `components/deck/`. `test/catalog-stories.test.ts` fails on a type, part or
    deck component without its story, and on a specimen slide of a type other than an alias without its state. `Home.astro` renders the shell's home with the foundations.
  - The print pages, `pages/catalog/print/` over `print.ts`: `index.html`, a Parts section (every
    part of `primitives.tsx` and `SlideChrome.tsx`, and the chart's `AxisTick`, in each variant, with the slide types using it),
    the Shared elements section (each brand element the slides use as a tile, each exception with
    its reason), then the catalogue in print mode: one slide per slide type (anchored by its name,
    which the brand kit links), per further variant and per content block, each under one or two of
    the 13 communication jobs with its when, do and don't from `catalog/guidance.ts`, with a search
    over all (a trend or bar tile frames its story page, since recharts draws no static plot); `frames.html`, every frame inline, since
    `brand-elements` reads no frame; and `build/slides.css`, compiled by Tailwind. The build copies
    each brand file the pages link to `dist/brand/` under its export name, and the pages name the
    deck's images by the bundler's files relative to them, so `brand-elements` reads them from `dist/` as files, with no server. The page tests
    (`test/pages/`) read them as files too, or through `test/pages/serve-dist.ts`, which serves `dist/`
    under the `/slides` base the story pages load their assets from.
  - The routes `/slides/specimen/` and `/slides/design-system/` forward old links, anchor kept, to the
    print page and the catalog.
- `docs/`: what a consumer reads beside the README: `setup.md`, `commands.md` and
  `deck-structure.md`; `agent-work/` holds dated reports.
- `test/`: the engine's unit tests.

`exports` in `package.json` is the whole public surface: every component, the `lib/` modules a
consumer imports (the other modules stay internal), `types/slide`, the three stylesheets (`slides.css`, `sources.css`, and `tokens.css`, for a consumer's design-system page, which none imports yet), `scripts/render-pdf`, the specimen deck and its
images, the catalog's `SlideFrame.astro`, and the `slides-density`, `slides-pins`, `slides-usage` and `slides-pptx` commands in `bin`. Moving or renaming one of them, or adding one, is
a release. Consumers import by those names, `@hackersandwizards/slides/types/slide`, and ship the source: Astro lists
the package in `vite.ssr.noExternal`, each vitest config in
`server.deps.inline`. React, motion, lucide-react, recharts, shiki, Tailwind and the brand package
are peer dependencies, so each consumer holds one copy of each. `pptxgenjs` and `jszip`, which only
`slides-pptx` imports, are optional peers like `puppeteer`: a consumer installs them to run it,
and `fonteditor-core` too for `--embed-fonts`.
`prettier`, which `lib/deck-edit-server` formats an edited deck with, is optional too, as is
`astro`, which only the exported `catalog/SlideFrame.astro` needs, and scaffolding, whose `serve`
only `slides-density --serve` imports. The brand peer is optional so
that bun never looks it up on the public npm registry; a consumer still pins it.

## Commands

- `bun run check`: `scaffolding check`, the shared steps side by side (it prints each; stylelint
  reads `stylelint.config.js`), then the `scaffolding.check` steps in
  `package.json`: `check:pins`, `check:colours` (`brand-colours.json` holds the exceptions), `check:copies`
  (`brand-copies`) and `check:retired` (`brand-retired` over `dist`), then `check:pages`
  (the tests in `test/pages/` over the build: the print pages, the story pages and `bun run
preview`), then `check:elements`
  (`brand-elements` over the print pages, `brand-elements.json`). The pre-push
  hook runs it over the pushed commits (`--changed`), whole but for a push of the hub's rules and
  skill prose alone, since `package.json` names no `scaffolding.changed`; the hooks are
  scaffolding's skeleton, listed in `.githooks/README.md`.
- `bun run check:markers`, by hand after a brand raise and after a change to how lists are styled,
  outside the gate: `brand-markers` over `frames.html` and every story page at 1920, the stage
  width, and at 1280, with `dist/` served at `--site-at /slides`, since the pages load their assets
  from that base.
- `bun run fix`: `eslint --fix`, then `prettier --write`.
- One test file: `bun run test <file>`.
- `bun run dev` (or `bun run catalog`, which opens it): the catalog at
  `http://127.0.0.1:4335/`, the print page at `/catalog/print/`: dev serves without the `/slides` base.
- `bun run build`: the catalog to `dist/`, which the Pages workflow (scaffolding's reusable one)
  publishes at `https://hackersandwizards.github.io/slides/`. `bun run preview` serves that build.

## Releasing a change

1. Change the engine here, `bun run check` green, raise `version` in `package.json`, then commit
   and push `main` (`git push origin main`). Only once that push has landed, tag `v<version>` to
   match and push the tag (`git tag v<version> && git push origin v<version>`): a tag pushed with a
   rejected `main` points at a commit `main` never holds.
2. Raise each consumer's pin through the `pins` mode of `dependency-updates`, which runs its gate.
   The regression decks are this repo's `specimen/slide-catalog.ts`, which talks shows, and
   trainer-hub's `slide-master`; a new slide type or variant lands in the specimen deck first.

## Behavioral rules

Project rules live in `.claude/rules/*.md` (relative to this file). Files with no YAML frontmatter
are always-on: read and apply them this session. Files with a `paths:` frontmatter list apply only
when editing files matching those globs. Claude loads these natively and excludes the global
`~/.claude/rules` here via `claudeMdExcludes`. Codex and pi must read `.claude/rules/` themselves
and ignore the global set. These project rules supersede it.
