"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";
import Image from "../ui/image";
import type { LogoConfig, SlideLogo } from "../../types/slide";
import { HW_LOGO } from "../../lib/logo";

interface Props {
  children: ReactNode;
  logo?: SlideLogo;
  theme?: "kinetic-dark" | "brand-dark";
  /** The page counter, "05 / 24"; none on a title slide. */
  page?: string;
  /** The h&w corner mark, `cornerMark()`: the lockup by default. */
  mark?: CornerMark;
}

export type CornerMark = "lockup" | "wordmark";

/** The page counter beside the corner logo, legible in a half-size video call and a step below the
 *  company name, on its centre line: at 1.625rem it outranked the name, and blind reviewers read the
 *  number before the brand (2026-10-29). */
export function PageCounter({ label }: { label: string }) {
  return (
    // Below `md` the navigation's own position pill takes its place.
    <span className="hidden font-mono text-sm leading-none font-bold text-text-subtle tabular-nums md:inline">
      {label}
    </span>
  );
}

/**
 * The h&w mark in the slide corner, from `@hackersandwizards/brand` `logos/`, copied into `public/`
 * by `postinstall`, the Night cut on a dark theme (`slides.css`). `lockup`, wizard and wordmark,
 * goes on a title and a closing slide, `wordmark` alone on every other slide. Both keep the
 * wordmark at `--slide-corner-wordmark`: the lockup's box is the wizard's, taller than the
 * letters and taller again in the Night cut, so each cut takes its own height, overhangs the row
 * above and below without moving it, and carries the brand's `--logo-wizard-lift` so its letters
 * centre on the page counter beside it.
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
          priority
          className={`hw-wordmark ${className}`}
        />
        <Image
          src="/hw-wordmark-night.svg"
          alt=""
          width={6571}
          height={952}
          priority
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
        priority
        className="hw-wordmark my-[calc((var(--slide-footer-mark)-var(--slide-corner-lockup))/2)] h-(--slide-corner-lockup) w-auto shrink-0 translate-y-(--logo-wizard-lift)"
      />
      <Image
        src="/hw-lockup-night.svg"
        alt=""
        width={8196}
        height={1641}
        priority
        className="hw-wordmark-night my-[calc((var(--slide-footer-mark)-var(--slide-corner-lockup-night))/2)] h-(--slide-corner-lockup-night) w-auto shrink-0 translate-y-(--logo-wizard-lift)"
      />
    </span>
  );
}

/** The website's teal-to-purple strip, the one brand mark every slide shares. */
export function BrandStrip() {
  return (
    <div
      className="brand-strip absolute inset-x-0 top-0 z-40 h-(--slide-strip) bg-gradient-to-r from-brand to-brand-accent"
      aria-hidden="true"
    />
  );
}

export function SlideContainer({ children, logo, theme, page, mark }: Props) {
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
          priority
          className="pointer-events-none h-9 w-auto"
        />
      )}
    </div>
  );

  if (Array.isArray(logo)) {
    return (
      <div className={viewportClassName}>
        <BrandStrip />
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
        <div className="fixed bottom-6 left-6 z-40" aria-hidden="true">
          <Image
            src={logo[0].src}
            alt={logo[0].alt}
            width={logo[0].width ?? 80}
            height={logo[0].height ?? 65}
            priority
            className="pointer-events-none h-9 w-auto"
          />
        </div>
        {renderHW(logo[1])}
      </div>
    );
  }

  const displayLogo = logo ?? HW_LOGO;

  return (
    <div className={viewportClassName}>
      <BrandStrip />
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
      {renderHW(displayLogo)}
    </div>
  );
}
