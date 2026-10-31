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

| Import                                               | What                                   |
| ---------------------------------------------------- | -------------------------------------- |
| `@hackersandwizards/slides/styles/slides.css`        | the slide stylesheet, Tailwind 4       |
| `@hackersandwizards/slides/types/slide`              | `Presentation`, `Slide` and the blocks |
| `@hackersandwizards/slides/components/slides/<Name>` | a slide component                      |
| `@hackersandwizards/slides/lib/<module>`             | hooks, navigation, presenter sync      |
| `@hackersandwizards/slides/lib/adapter`              | `SlidesAdapterProvider`                |
| `@hackersandwizards/slides/scripts/render-pdf`       | `renderPdf` for an export script       |
| `@hackersandwizards/slides/specimen/slide-catalogue` | the fictional specimen deck            |

The command `slides-density [--serve "<command>"] <print-url> ...` belongs in each consumer's gate:
it renders each deck's print route and fails on a slide the fit guard shrinks below 0.8, and lists
those below 0.9. `--serve` starts the consumer's server for the run and stops it afterwards.

The package ships TypeScript source. Let the build transpile it: Next
`transpilePackages: ["@hackersandwizards/slides"]`, Astro `vite.ssr.noExternal`, vitest
`test.server.deps.inline`. A Next app wraps its root layout in `SlidesAdapterProvider` with
`next/image` and its router; without a provider the engine uses a plain `<img>` and `history`.

## Deck structure

A deck that runs an hour or longer with three or more chapters shows an `agenda` slide before its
first chapter, listing the chapters in order. Each chapter opens with a `transition` slide: its
`headline` is the chapter's agenda item, its `preText` the chapter's position in the agenda, such
as `"3 / 9"`. A break, lunch, a live demo or the thanks is not a chapter. A deck whose agenda is a
timetable, or a map that returns before each part (`overview`, `phased-pills`), keeps that instead.
A chapter divider is a `transition`; `deep-dive-divider` marks a deep-dive part only.

A concept slide whose words claim a mechanism or a relationship in up to four short cards, and
which has no diagram of the engine, may carry a generated marker sketch beside them: the
`image-and-grid` block takes the sketch as its image and the cards as its items, words unchanged.
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
