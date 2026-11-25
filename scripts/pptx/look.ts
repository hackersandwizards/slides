import { WORDS, type deckLang } from "../../lib/slide-utils";
import { parasHeight } from "./fit";
import { mixColor, type Palette } from "./palette";
import { H } from "./stage";
import { asParas, type BoxOpts, type Para } from "./text";

type Lang = ReturnType<typeof deckLang>;
type Words = (typeof WORDS)[Lang];

export class Look {
  readonly c: Palette;
  readonly lang: Lang;
  readonly dark: boolean;

  /** The words the engine prints itself, in the deck's language. */
  readonly words: Words;

  constructor(c: Palette, lang: Lang, dark: boolean) {
    this.c = c;
    this.lang = lang;
    this.dark = dark;
    this.words = WORDS[lang];
  }

  /** The height a box of `content` needs at full size, capped at the slide height. */
  need(content: Para[] | Para | string, w: number, o: BoxOpts): number {
    return Math.min(H, parasHeight(asParas(content, this.c), o, { w, k: 1 }));
  }

  grounded(hue: string): Look {
    return new Look({ ...this.c, bg: mixColor(hue, this.c.bg, 0.07) }, this.lang, this.dark);
  }
}
