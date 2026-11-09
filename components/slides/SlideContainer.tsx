"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";
import Image from "../ui/image";
import type { LogoConfig, SlideLogo } from "../../types/slide";
import { HW_LOGO } from "../../lib/logo";
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

/** The page counter beside the corner logo, legible in a half-size video call and a step below the
 *  company name, on its centre line: at 1.625rem it would outrank the name and be read before the
 *  brand. */
export function PageCounter({ label }: { label: string }) {
  return (
    // Below `md` the navigation's own position pill takes its place.
    <span className="hidden font-mono text-sm leading-none font-bold text-text-subtle tabular-nums md:inline">
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
        <Image
          src="/hw-wordmark.svg"
          alt=""
          width={6571}
          height={952}
          className={`hw-wordmark ${className}`}
        />
        <Image
          src="/hw-wordmark-night.svg"
          alt=""
          width={6571}
          height={952}
          className={`hw-wordmark-night ${className}`}
        />
      </span>
    );
  }
  return (
    <span className="pointer-events-none inline-flex items-center">
      <Image
        src="/hw-lockup.svg"
        alt=""
        width={8042}
        height={1489}
        className="hw-wordmark my-[calc((var(--slide-footer-mark)-var(--slide-corner-lockup))/2)] h-(--slide-corner-lockup) w-auto shrink-0 translate-y-(--logo-wizard-lift)"
      />
      <Image
        src="/hw-lockup-night.svg"
        alt=""
        width={8196}
        height={1641}
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

export function SlideContainer({ children, logo, theme, page, mark, lang }: Props) {
  const slides = (
    <DeckNight.Provider value={!!theme}>
      <DeckLang.Provider value={lang ?? "en"}>{children}</DeckLang.Provider>
    </DeckNight.Provider>
  );
  const viewportClassName = `slide-viewport fixed inset-0 overflow-hidden${theme ? ` theme-${theme}` : ""}`;

  const renderHW = (l: LogoConfig) => (
    <div
      className="slide-corner fixed right-(--slide-footer-side) bottom-(--slide-footer-inset) z-40 flex items-center gap-5"
      aria-hidden="true"
    >
      {page && <PageCounter label={page} />}
      {l.src === HW_LOGO.src ? (
        <HwWordmark mark={mark} />
      ) : (
        <Image
          src={l.src}
          alt={l.alt}
          width={l.width ?? 80}
          height={l.height ?? 65}
          className="pointer-events-none h-9 w-auto"
        />
      )}
    </div>
  );

  if (Array.isArray(logo)) {
    return (
      <div
        className={viewportClassName}
        lang={lang}
        data-theme={theme ? "dark" : "light"}
        data-hw-night={theme ? "" : undefined}
      >
        <BrandStrip />
        <MotionConfig reducedMotion="user">{slides}</MotionConfig>
        <div className="slide-corner-start fixed bottom-6 left-6 z-40" aria-hidden="true">
          <Image
            src={logo[0].src}
            alt={logo[0].alt}
            width={logo[0].width ?? 80}
            height={logo[0].height ?? 65}
            className="pointer-events-none h-9 w-auto"
          />
        </div>
        {renderHW(logo[1])}
      </div>
    );
  }

  const displayLogo = logo ?? HW_LOGO;

  return (
    <div
      className={viewportClassName}
      lang={lang}
      data-theme={theme ? "dark" : "light"}
      data-hw-night={theme ? "" : undefined}
    >
      <BrandStrip />
      <MotionConfig reducedMotion="user">{slides}</MotionConfig>
      {renderHW(displayLogo)}
    </div>
  );
}
