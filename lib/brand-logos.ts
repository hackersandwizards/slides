// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- an ambient wildcard module has no import form, and a consumer's typecheck reaches it only from here
/// <reference path="../types/brand-logos.d.ts" />
import { BRAND_MARK } from "./logo";
import lockupNight from "@hackersandwizards/brand/logos/lockup-night.svg?url&no-inline";
import lockup from "@hackersandwizards/brand/logos/lockup.svg?url&no-inline";
import wordmarkNight from "@hackersandwizards/brand/logos/wordmark-night.svg?url&no-inline";
import wordmark from "@hackersandwizards/brand/logos/wordmark.svg?url&no-inline";

/** The h&w marks, each the URL the consumer's bundler gives brand's exported file, keyed by that
 *  file's name. */
export const brandLogos: Record<string, string> = {
  lockup,
  "lockup-night": lockupNight,
  wordmark,
  "wordmark-night": wordmarkNight,
};

/** The URL brand's file has here for a path `BRAND_MARK` names, any other path as it stands. */
export const logoUrl = (src: string) => brandLogos[BRAND_MARK.exec(src)?.[1] ?? ""] ?? src;
