# Set up a consumer

What a consumer of `@hackersandwizards/slides` pins, imports and sets, and how a deck page behaves.
The first section is a working deck from an empty Astro site.

## A first deck

The package ships TypeScript source, so the build transpiles it. In `astro.config.ts`:

```ts
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { slidesOptimizeDeps } from "@hackersandwizards/slides/lib/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: slidesOptimizeDeps(),
    ssr: { noExternal: ["@hackersandwizards/slides"] },
  },
});
```

A deck is a typed object, here `src/decks/hello.ts`:

```ts
import type { Presentation } from "@hackersandwizards/slides/types/slide";

export const hello: Presentation = {
  name: "Hello",
  lang: "en",
  slides: [
    { type: "title", title: "Hello" },
    { type: "statement", lines: ["One idea per slide."] },
  ],
};
```

One page per slide draws it, here `src/pages/hello/[slide].astro`:

```astro
---
import "@hackersandwizards/slides/styles/slides.css";
import { DeckView } from "@hackersandwizards/slides/components/deck/DeckView";
import { deckLang } from "@hackersandwizards/slides/lib/slide-utils";
import { hello } from "../../decks/hello";

export const getStaticPaths = () => hello.slides.map((_, i) => ({ params: { slide: `${i}` } }));
const index = Number(Astro.params.slide);
---

<html lang={deckLang(hello)} class="hw-focus-ring">
  <head>
    <meta charset="utf-8" />
  </head>
  <body>
    <DeckView presentation={hello} index={index} basePath="/hello" client:load />
  </body>
</html>
```

The print route, `src/pages/hello/print.astro`, which the PDF export and `slides-density` read:

```astro
---
import "@hackersandwizards/slides/styles/slides.css";
import { PrintDeck } from "@hackersandwizards/slides/components/slides/PrintSlide";
import { deckLang } from "@hackersandwizards/slides/lib/slide-utils";
import { hello } from "../../decks/hello";
---

<html lang={deckLang(hello)} class="hw-focus-ring">
  <head>
    <meta charset="utf-8" />
  </head>
  <body>
    <PrintDeck presentation={hello} client:load />
  </body>
</html>
```

Vitest takes the package in `test.server.deps.inline`. After `astro build`, the gate checks the deck
with `slides-pins` and `slides-density --site dist /hello/print`.

## What the engine takes from brand

Pin `@hackersandwizards/brand` at the minimum the README names, whose static faces (`static-fonts.css`) with their metric-matched fallback faces, shared
elements (only those a slide draws, each from `elements/<name>.css`), text
base (`text-base.css`), slide pointer (`cursor.svg`) and small corner the stylesheet imports, whose
list marker takes `--hw-zoom`, which the fit guard sets beside the `zoom` it shrinks a slide with, whose dialog draws no browser focus ring, whose `verbal.json` gives the closing its claim and every h&w logo its alt text, whose `--tint-callout` tokens `slides-pptx` mixes a callout from, whose `logos.json` gives each logo's width and height, and whose logos the
slides draw through its exports, as `?url` imports the bundler serves: a deck names a mark as
`/hw-lockup.svg`, `/hw-wordmark.svg` or their `-night` cuts. The specimen deck imports its images
the same way, so a consumer copies nothing into `public/` for the engine. A page that draws
another brand element, such as a catalog shell's rail and search, imports brand's `elements.css`
itself: put it in the catalog's `css` beside `slides.css`.

## Imports

| Import                                                   | What                                                                                                                          |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `@hackersandwizards/slides/styles/slides.css`            | the slide stylesheet, Tailwind 4                                                                                              |
| `@hackersandwizards/slides/styles/tokens.css`            | every value a slide draws, as custom properties                                                                               |
| `@hackersandwizards/slides/types/slide`                  | `Presentation`, `Slide` and the blocks                                                                                        |
| `@hackersandwizards/slides/components/slides/<Name>`     | a slide component                                                                                                             |
| `@hackersandwizards/slides/lib/<module>`                 | a module `exports` in `package.json` names                                                                                    |
| `@hackersandwizards/slides/components/slides/PrintSlide` | `PrintDeck`, a deck's print route, and `PrintSlide`, one printed page                                                         |
| `@hackersandwizards/slides/components/deck/DeckView`     | `DeckView`, a deck page's one island: `presentation`, `index`, `basePath`, and `documentTitle` to keep the title on the slide |
| `@hackersandwizards/slides/components/deck/DeckTile`     | `DeckTile`, one deck on a deck list, brand's linked card; React, which an Astro page renders without `client:`                |
| `@hackersandwizards/slides/scripts/render-pdf`           | `renderPdf` for an export script                                                                                              |
| `@hackersandwizards/slides/specimen/slide-catalog`       | the fictional specimen deck, and `specimenImages`, its images' URLs by file name                                              |
| `@hackersandwizards/slides/catalog/SlideFrame.astro`     | a story's frame in a catalog on scaffolding's shell: `decorators: [{ component: SlideFrame, props: { component } }]`          |

`SlideFrame` takes `part: true` for a part, `css`, the slides' stylesheet linked on the story page
(a URL with the site's base), and `light`, which keeps that page light.

## A deck page

A deck page's root carries brand's `hw-focus-ring` class, as in `<html class="hw-focus-ring">`.
It gives every control on the page the brand's focus ring.

Under the dev server `DeckView` offers edit mode, which writes a text clicked on into the deck file
through the consumer's mount of `lib/deck-edit-server`: E starts it, in a tab opened once with
`?edit` on a deck page's address.

## A slide fully revealed

A slide opens fully revealed on a URL carrying `?revealed`, such as `/<deck>/12?revealed`, as it does
on a backward arrival: for a catalog tile, a screenshot or a check of the finished slide. It shows
no presenter hints there. A slide whose steps replace each other, such as a guidance comparison,
opens at its last step; only print shows them all.
A story frame sets it on its own page, as `SlideFrame.astro` does. In a frame the plain
`slide-direction` key no longer reaches the slide, since each frame keeps its own. The print route needs none: `PrintProvider` opens every slide full.

## The deck's language

A deck's language is its own `lang`, a deck without a title slide's one place to name it, else
its first title slide's, else English, which the build warns about. A consumer's deck and print
layouts set `<html lang={deckLang(presentation)}>` with `deckLang` from
`@hackersandwizards/slides/lib/slide-utils`, so screen readers and hyphenation read the
deck's language; `slides-pptx` marks its text with it. The screen route passes it to
`SlideContainer` as `lang`, English when left out, which `PrintSlide` reads from the deck itself: a
contact closing shows brand's claim in that language unless it sets `claim: false`, and a title
slide without a `lang` of its own joins its speakers and words its QR code's alt text in it.
