"use client";

import type { ReactNode } from "react";
import { preload } from "react-dom";
import { MotionConfig } from "motion/react";
import inter400 from "@hackersandwizards/brand/fonts/inter-latin-400-normal.woff2?url&no-inline";
import inter500 from "@hackersandwizards/brand/fonts/inter-latin-500-normal.woff2?url&no-inline";
import inter700 from "@hackersandwizards/brand/fonts/inter-latin-700-normal.woff2?url&no-inline";
import mono500 from "@hackersandwizards/brand/fonts/jetbrains-mono-latin-500-normal.woff2?url&no-inline";
import mono700 from "@hackersandwizards/brand/fonts/jetbrains-mono-latin-700-normal.woff2?url&no-inline";
import Image from "../ui/image";
import type { LogoConfig, SlideLogo } from "../../types/slide";
import { logoSize } from "../../lib/brand-logos";
import { HW_LOGO, logoPlaces } from "../../lib/logo";
import { DeckLang, DeckNight } from "./SlideShell";

interface Props {
  children: ReactNode;
  logo?: SlideLogo;
  theme?: "brand-dark";
  /** The page counter, "05 / 24"; none on a title slide. */
  page?: string;
  /** The h&w corner mark, `cornerMark()`: the lockup by default. */
  mark?: CornerMark;
  /** The deck's language, `deckLang()`: the slide's `lang`, by which a long word hyphenates, and
   *  brand's claim on a contact closing take it. Without it the slide keeps the page's `lang` and
   *  the claim is English, as `deckLang` is for a deck that names none. */
  lang?: "en" | "de";
}

export type CornerMark = "lockup" | "wordmark";

/** A logo a deck names, at the corner row's height. In the corner (`asMark`), the default logo
 *  draws as the h&w corner mark (`HwWordmark`) in the cut `mark`; elsewhere every logo is its
 *  picture. */
export function DeckLogo({
  logo,
  asMark,
  mark,
}: {
  logo: LogoConfig;
  asMark?: boolean;
  mark?: CornerMark;
}) {
  const size = logoSize(logo.src) ?? { width: 80, height: 65 };
  return asMark && logo.src === HW_LOGO.src ? (
    <HwWordmark mark={mark} />
  ) : (
    <Image
      src={logo.src}
      alt={logo.alt}
      width={logo.width ?? size.width}
      height={logo.height ?? size.height}
      className="pointer-events-none h-9 w-auto"
    />
  );
}

/** A deck's logos before its last, at the slide's bottom left: `fixed` on the screen's viewport,
 *  `absolute` on a printed page. */
export function CornerStart({
  logos,
  position,
}: {
  logos: LogoConfig[];
  position: "fixed" | "absolute";
}) {
  if (logos.length === 0) return null;
  return (
    <div
      className={`slide-corner-start ${position} bottom-6 left-6 z-40 flex items-center gap-5`}
      aria-hidden="true"
    >
      {logos.map((l, i) => (
        <DeckLogo key={i} logo={l} />
      ))}
    </div>
  );
}

/** The page counter beside the corner logo, legible in a half-size video call and a step below the
 *  company name, on its centre line: at 1.625rem it would outrank the name and be read before the
 *  brand. */
export function PageCounter({ label }: { label: string }) {
  return (
    // Below `md` the navigation's own position pill takes its place.
    <span
      data-page-counter
      className="hidden font-mono text-sm leading-none font-bold text-text-subtle tabular-nums md:inline"
    >
      {label}
    </span>
  );
}

/**
 * The h&w corner mark: `lockup` on a title and a closing slide, `wordmark` on every other. The
 * lockup's box is the wizard's, taller than the letters and taller again in the Night cut, so each
 * cut takes its own height, overhangs the row without moving it, and carries the brand's
 * `--logo-wizard-lift` so its letters centre on the page counter. Both cuts load lazily, so the one
 * `slides.css` hides is never fetched (the Night lockup alone is 59 KB); print loads both
 * (`components/ui/image.tsx`).
 */
export function HwWordmark({ mark = "lockup" }: { mark?: CornerMark }) {
  if (mark === "wordmark") {
    const className =
      "h-(--slide-corner-wordmark) w-auto shrink-0 my-[calc((var(--slide-footer-mark)-var(--slide-corner-wordmark))/2)]";
    return (
      <span className="pointer-events-none inline-flex items-center">
        <Image src="/hw-wordmark.svg" alt="" className={`hw-wordmark ${className}`} />
        <Image src="/hw-wordmark-night.svg" alt="" className={`hw-wordmark-night ${className}`} />
      </span>
    );
  }
  return (
    <span className="pointer-events-none inline-flex items-center">
      <Image
        src="/hw-lockup.svg"
        alt=""
        className="hw-wordmark my-[calc((var(--slide-footer-mark)-var(--slide-corner-lockup))/2)] h-(--slide-corner-lockup) w-auto shrink-0 translate-y-(--logo-wizard-lift)"
      />
      <Image
        src="/hw-lockup-night.svg"
        alt=""
        className="hw-wordmark-night my-[calc((var(--slide-footer-mark)-var(--slide-corner-lockup-night))/2)] h-(--slide-corner-lockup-night) w-auto shrink-0 translate-y-(--logo-wizard-lift)"
      />
    </span>
  );
}

/** The brand's gradient strip (hw-strip), the one brand mark every slide shares. */
export function BrandStrip() {
  return (
    <div
      className="hw-strip absolute inset-x-0 top-0 z-40"
      data-hw-scale="stage"
      aria-hidden="true"
    />
  );
}

// A face arriving after a server-rendered slide's first paint can still change a line break, or
// more where the device lacks the local font of brand's metric-matched fallback. Inter 400, 500 and
// both mono faces are every face of about half the specimen slides; each further face covers fewer.
// Inter 700 is here for another reason: with Inter 400 in and Inter 700 still loading, a bold run
// drawn in the fallback beside Inter text re-breaks a `pretty` paragraph when Inter 700 lands.
const FACES = [inter400, inter500, inter700, mono500, mono700];

export function SlideContainer({ children, logo, theme, page, mark, lang }: Props) {
  for (const href of FACES) preload(href, { as: "font", type: "font/woff2", crossOrigin: "" });
  const slides = (
    <DeckNight.Provider value={!!theme}>
      <DeckLang.Provider value={lang ?? "en"}>{children}</DeckLang.Provider>
    </DeckNight.Provider>
  );
  const viewportClassName = `slide-viewport fixed inset-0 overflow-hidden${theme ? ` theme-${theme}` : ""}`;

  const { corner, start } = logoPlaces(logo);

  return (
    <div
      className={viewportClassName}
      lang={lang}
      data-theme={theme ? "dark" : "light"}
      data-hw-night={theme ? "" : undefined}
    >
      <BrandStrip />
      <MotionConfig reducedMotion="user">{slides}</MotionConfig>
      <CornerStart logos={start} position="fixed" />
      <div
        className="slide-corner fixed right-(--slide-footer-side) bottom-(--slide-footer-inset) z-40 flex items-center gap-5"
        aria-hidden="true"
      >
        {page && <PageCounter label={page} />}
        <DeckLogo logo={corner} asMark mark={mark} />
      </div>
    </div>
  );
}
