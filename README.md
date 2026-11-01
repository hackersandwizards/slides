# @hackersandwizards/slides

The hackers&wizards slide engine as one package: every slide type, the deck types, the
slide stylesheet and the PDF renderer. `talks`, `trainer-hub` and `hycle-private/talks` install it
and keep only their decks.

Maintainer: Benedikt Stemmildt. The repo is public, its history included, so nothing goes in
that the public may not see.

## Use it in another repo

Add the dependency in exactly this form, pinned to the newest tag
(`git ls-remote --tags https://github.com/hackersandwizards/slides.git` lists them), next to
`@hackersandwizards/brand`, which the stylesheet needs. Both repos are public: Bun fetches the
`git+https://` form through GitHub's tarball API without any GitHub access.

```json
"@hackersandwizards/slides": "git+https://github.com/hackersandwizards/slides.git#v<version>"
```

| Import                                                   | What                                                                  |
| -------------------------------------------------------- | --------------------------------------------------------------------- |
| `@hackersandwizards/slides/styles/slides.css`            | the slide stylesheet, Tailwind 4                                      |
| `@hackersandwizards/slides/types/slide`                  | `Presentation`, `Slide` and the blocks                                |
| `@hackersandwizards/slides/components/slides/<Name>`     | a slide component                                                     |
| `@hackersandwizards/slides/lib/<module>`                 | a module `exports` in `package.json` names                            |
| `@hackersandwizards/slides/lib/next-adapter`             | `NextSlidesAdapter`                                                   |
| `@hackersandwizards/slides/components/slides/PrintSlide` | `PrintDeck`, a deck's print route, and `PrintSlide`, one printed page |
| `@hackersandwizards/slides/scripts/render-pdf`           | `renderPdf` for an export script                                      |
| `@hackersandwizards/slides/specimen/slide-catalogue`     | the fictional specimen deck                                           |

The command `slides-density [--serve "<command>"] <print-url> ...` belongs in each consumer's gate:
it renders each deck's print route and fails on a slide the fit guard shrinks below 0.8, and lists
those below 0.9. `--serve` starts the consumer's server for the run and stops it afterwards.

The command `slides-pptx <deck.json|-> <out.pptx> [--assets <dir>]` writes a deck as a native
PowerPoint file in the h&w design: text as text boxes, tables as tables, trend and bar charts as
charts, diagrams as shapes, and only the deck's own images and the h&w logos as pictures. The deck
is the `Presentation` as JSON, `-` reads it from stdin. `--assets` is the folder a deck's `/…`
image paths resolve against, `./public` by default. It needs `pptxgenjs` and `jszip`, optional
peer dependencies a consumer installs only to run it. In `talks`:

```sh
bun add -d pptxgenjs jszip
bun scripts/slides-json.ts <slug> > deck.json && bun run slides-pptx deck.json <slug>.pptx
```

The file names its fonts, Inter and JetBrains Mono, and embeds neither: the brand ships them as
woff2, which PowerPoint cannot embed. Each carries its kind (sans, monospace), so a machine without
them shows a font of the same kind. Install both fonts on the presenting machine for the h&w look.
It shows a client's deck in the h&w design only; a deck on a client's template needs that
consumer's own exporter. The PowerPoint parser pulls in `image-size`, whose old version carries
advisories, so a consumer adds `"overrides": { "image-size": "2.0.4" }` as this package does.

The package ships TypeScript source. Let the build transpile it: Next
`transpilePackages: ["@hackersandwizards/slides"]`, Astro `vite.ssr.noExternal`, vitest
`test.server.deps.inline`. A Next app wraps its root layout in `NextSlidesAdapter`, which puts
`next/image` and its router behind the engine; without it the engine uses a plain `<img>` and
`history`.

## Deck structure

A deck that runs an hour or longer with three or more chapters shows an `agenda` slide before its
first chapter, listing the chapters in order. Each chapter opens with a `transition` slide: its
`headline` is the chapter's agenda item, its `preText` the chapter's position in the agenda, such
as `"3 / 9"`. A break, lunch, a live demo or the thanks is not a chapter. A timetable is an `agenda`
whose items carry a `when` ("09:00"), and so are a pitch's next steps (a due date as `when`, the
owner as `text`, the decision needed as `footer`). A deck whose agenda is a map that returns before
each part (`overview`, `phased-pills`) keeps that instead.

An exercise, a live demo and a debrief are an `activity` slide (`kind`): the steps, watch points or
questions, the exact instruction as `prompt`, and the timebox, mode and outcome in one card.

`evolution` and `dual-pill-overview` still render, as a `process` slide with `loop: false` and a
`roadmap` whose columns carry `phases`; new slides use those (`aliasTypes` in
`lib/slide-components.ts`).
A chapter divider is a `transition`; `deep-dive-divider` marks a deep-dive part only. Every slide of a
deep-dive part, the `deep-dive-divider`, a slide whose `sectionTheme` is `deepdive` and a pill map whose
phases are, stands on night (`isDeepDive` in `lib/slide-utils`); nothing else marks the part.

A concept slide whose words claim a mechanism or a relationship in up to four short cards, and
which has no diagram of the engine, may carry a generated marker sketch beside them: the
`image-and-grid` block takes the sketch as its image, marked `sketch: true` so it stands without a
frame, and the cards as its items, words unchanged.
`bun run brand-slide-sketch-prompt` (brand v0.13.0 or later) prints the prompt. No other slide gets
a sketch: on a title, agenda, transition, statement, comparison, process, data or closing slide, and
on a concept slide of paragraphs, the slide without one scored higher in blind panels.

## Work on the package

```sh
bun install      # also points the git hooks at .githooks/
bun run check    # format, lint, typecheck, unique names, tests, brand colours
```

A release is a tag `v<version>` matching `version` in `package.json`; consumers then raise the tag
in their dependency line. The rest: [CLAUDE.md](CLAUDE.md).
