# Commands

The four commands in `bin`. `slides-pins` takes no arguments; the other three print theirs with
`--help`.

## slides-pins

The command `slides-pins` belongs in each consumer's gate, after scaffolding's shared steps: it
fails when `package.json` pins no brand, which bun lets pass because the brand peer is optional, or
a brand below the minimum the README names.
That the install matches each pin, scaffolding's install and `coupling` steps check.

## slides-density

The command `slides-density [--site <dir> | --serve "<command>"] <print-url or path> ...` belongs in each consumer's gate:
it renders each deck's print route and fails on a slide the fit guard shrinks below 0.8, and lists
those below 0.9, a heading it shrinks so that its widest word fits included. It fails too on a content slide holding only one or two short bullets, a regular slide drawn as
one included, which a `statement` carries (`bulletsAsStatement` in `lib/slide-utils`), and on a slide the fit guard
never fitted, as on a print route that did not hydrate. `--site` serves a built
site's folder for the run, such as `dist`; `--serve` starts the consumer's server through
scaffolding's `serve`, which sets `HOST` and `PORT` for it, and stops it afterwards. With either, a
path such as `/<deck>/print` is read against that server.

## slides-usage

The command `slides-usage [--out <file> [--check]] <deck.json|-> ...` prints, as JSON, how many
slides of those decks use each entry of the catalogue's print page, and which entries none uses, for
a consumer to publish; `--out` writes it to the file instead, and `--check` fails where the file
differs, naming what to run instead: `bun run usage` where the check ran as `bun run usage --check`
on a script `"usage": "… | slides-usage --out <file> -"`. A slide drawn through a replaced form counts for the entry that replaces it. It lints the
decks too, failing on a slide no entry draws, on a field that changes nothing the slide draws (such
as `numberFrom` on cards that are not numbered, or a `sectionTheme` that colours no rule or pill),
and on a deck that names its `lang` neither on itself nor on a title slide. Each
argument, `-` for standard input, holds one deck or a JSON array of decks, so a consumer whose
decks are code pipes them all in at once; no deck at all fails. An error names a deck of an array
by its `slug`, where the consumer sets one, else its `name`, and by its place in the array.

## slides-pptx

The command `slides-pptx <deck.json|-> <out.pptx> [--assets <dir>] [--strict] [--embed-fonts]` writes a deck as a native
PowerPoint file in the h&w design: text as text boxes, tables as tables, trend and bar charts as
charts, diagrams as shapes, and only the deck's own images and the h&w logos as pictures. A chart's
labels and card, and the fill under a trend's measured part, are shapes beside the chart, so the
fill does not follow data someone edits in the chart in PowerPoint. The deck
is the `Presentation` as JSON, `-` reads it from stdin. `--assets` is the folder a deck's `/…`
image paths resolve against, `./public` by default; a path to an existing file, as Bun gives the
specimen's imported images, is read as it stands. It sets each line at the slide's own line height and breaks headings
where the web balances them, measured with the brand fonts' metrics. It warns on what it cannot
draw as the slide does, such as a missing image, blocks taller than the slide, or text taller or
wider than its box, crossing the shape it stands in or off the slide, and `--strict` makes a
warning exit 1, for a consumer's gate; an argument it does not know exits 1 too. It needs `pptxgenjs` and `jszip`, optional
peer dependencies a consumer installs only to run it. In `talks`:

```sh
bun add -d pptxgenjs jszip
bun scripts/slides-json.ts <slug> > deck.json && bun run slides-pptx deck.json <slug>.pptx
```

The file names its fonts, Inter and JetBrains Mono, each with its kind (sans, monospace), so a
machine without them shows a font of the same kind. `--embed-fonts` puts both into the file as
PowerPoint stores them, an Embedded OpenType part per face for regular and bold, built from brand's
static woff2 subsets and cut to the deck's characters and the Latin-1 range: about 50 kB. It needs
`fonteditor-core`, a further optional peer. PowerPoint for Windows and for Mac reads embedded
fonts; LibreOffice 7.4 ignored them and substituted, and the parts are not yet proven in PowerPoint,
so installing both fonts stays the sure way to the h&w look.
It shows a client's deck in the h&w design only; a deck on a client's template needs that
consumer's own exporter. The PowerPoint parser pulls in `image-size`, whose old version carries
advisories, so a consumer adds `"overrides": { "image-size": "2.1.0" }` as this package does.
