// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- an ambient wildcard module has no import form, and a consumer's typecheck reaches it only from here
/// <reference path="../types/brand-logos.d.ts" />
import lockupNight from "@hackersandwizards/brand/logos/lockup-night.svg?url";
import lockup from "@hackersandwizards/brand/logos/lockup.svg?url";
import wordmarkNight from "@hackersandwizards/brand/logos/wordmark-night.svg?url";
import wordmark from "@hackersandwizards/brand/logos/wordmark.svg?url";

/** The h&w marks, each the URL the consumer's bundler gives brand's exported file, keyed by that
 *  file's name. */
export const brandLogos: Record<string, string> = {
  lockup,
  "lockup-night": lockupNight,
  wordmark,
  "wordmark-night": wordmarkNight,
};

/** A deck and the engine name a mark by a root path, `/hw-lockup.svg`, which `slides-pptx` reads
 *  too: the URL brand's file has here, any other path as it stands. */
export const logoUrl = (src: string) => brandLogos[/^\/hw-(.+)\.svg$/.exec(src)?.[1] ?? ""] ?? src;
