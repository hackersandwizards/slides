# @hackersandwizards/slides

The hackers&wizards slide engine: every slide type as a React component, the deck types, the slide
stylesheet, and the PDF and PowerPoint export. Three Astro sites install it and keep only their
decks: `talks`, `trainer-hub` and `hycle-private`. The colours, faces and logos it draws come from
[`@hackersandwizards/brand`](https://github.com/hackersandwizards/brand).

| You want                                 | Go to                                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| to see every slide type and its variants | [the catalog](https://hackersandwizards.github.io/slides/)                                       |
| the slide type that fits what you say    | [when, do and don't per type](https://hackersandwizards.github.io/slides/catalog/print/#catalog) |
| to export a deck as PowerPoint           | [slides-pptx](docs/commands.md#slides-pptx)                                                      |
| to plan a deck: agenda, chapters, slides | [Deck structure](docs/deck-structure.md)                                                         |
| to add the engine to an Astro site       | [Install](#install) and [Use](#use)                                                              |
| to check decks in your gate              | [Commands](#commands)                                                                            |
| to change the engine                     | [Work on the package](#work-on-the-package)                                                      |

## Install

Pin the newest tag, with brand beside it:

```json
"@hackersandwizards/slides": "git+https://github.com/hackersandwizards/slides.git#v<version>",
"@hackersandwizards/brand": "git+https://github.com/hackersandwizards/brand.git#v<version>"
```

The engine needs `@hackersandwizards/brand` v2.15.0 or later. Both repositories are public, so Bun
fetches them without GitHub access. `git ls-remote --tags <repository URL>` lists the tags.

Requirements: Bun 1.3 or later, Astro with `@astrojs/react`, Tailwind 4 with `@tailwindcss/vite`,
and the peers React 19 with `react-dom`, motion, lucide-react, recharts and shiki. `renderPdf` and
`slides-density` need `puppeteer`, `slides-pptx` needs `pptxgenjs` and `jszip`.

## Use

The package ships TypeScript source: an Astro site lists it in `vite.ssr.noExternal` and sets
`vite.optimizeDeps` to `slidesOptimizeDeps()` from `lib/vite`. A deck is a `Presentation` from
`types/slide`. A deck page imports `styles/slides.css` and renders `DeckView` from
`components/deck/DeckView`; a print route renders `PrintDeck` from `components/slides/PrintSlide`.
Each path is under `@hackersandwizards/slides/`. A working config, deck, deck page and print route:
[docs/setup.md](docs/setup.md#a-first-deck), with every import.

## Commands

- `slides-pins`: fails when `package.json` pins no brand, or one below the minimum.
- `slides-density`: fails on a slide shrunk below 0.8 to fit, one a statement should carry, or one
  the fit guard never fitted.
- `slides-usage`: counts a deck's slides per slide type, variant and block, and lints the decks.
- `slides-pptx`: writes a deck as a native PowerPoint file in the h&w design.

A consumer's gate runs `slides-pins` and `slides-density` after its build. The last three print
their arguments with `--help`; what each checks: [docs/commands.md](docs/commands.md). A PDF comes
from `renderPdf` in `scripts/render-pdf`, which a consumer's export script calls.

## Deck structure

Agenda, chapters, statement and activity slides, retired types and sketches:
[docs/deck-structure.md](docs/deck-structure.md).

## Documentation

- [Set up a consumer](docs/setup.md): a first deck, what the engine takes from brand, every import.
- [Commands](docs/commands.md): what each command checks and writes, with its flags.
- [Deck structure](docs/deck-structure.md): which slide carries what in a deck.

## Work on the package

- `bun install`: also points the git hooks at `.githooks/`.
- `bun run dev`: the catalog at `http://127.0.0.1:4335/`.
- `bun run check`: the gate.
- `bun run build`: the catalog to `dist/`, as GitHub Pages publishes it.

A release raises `version`, pushes `main` and then tags `v<version>`. The rules for a change, the
layout, the gate and the release order: [CLAUDE.md](CLAUDE.md).

## Maintainer and licence

Benedikt Stemmildt maintains it. The repository is public, its history included, so nothing goes
in that the public may not see. Vulnerabilities: [SECURITY.md](SECURITY.md). Licence: PolyForm
Strict 1.0.0 with a permission for trainers h&w commissions, [LICENSE](LICENSE).
