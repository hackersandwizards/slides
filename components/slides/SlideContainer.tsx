"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";
import Image from "../ui/image";
import type { LogoConfig, SlideLogo } from "../../types/slide";

const HW_LOGO: LogoConfig = { src: "/hw-logo.svg", alt: "hackers&wizards", width: 80, height: 65 };

interface Props {
  children: ReactNode;
  logo?: SlideLogo;
  theme?: "kinetic-dark" | "brand-dark";
  scale?: "delivered";
  /** The page counter, "05 / 24"; none on a title slide. */
  page?: string;
}

/** The page counter beside the corner logo, legible in a half-size video call and a step below the
 *  company name, on its centre line: at 1.625rem it outranked the name, and blind reviewers read the
 *  number before the brand (2026-10-29). */
export function PageCounter({ label }: { label: string }) {
  return (
    // Below `md` the navigation's own position pill takes its place.
    <span className="hidden font-mono text-[1.25rem] leading-none font-semibold text-text-subtle tabular-nums md:inline">
      {label}
    </span>
  );
}

/**
 * The brand lockup in the slide corner: the wizard emoji beside the pixel wordmark
 * (`@hackersandwizards/brand` `logos/wordmark.svg`, copied into `public/` by `postinstall`), with
 * no line under it. The wordmark's box is centred on its letters, so the emoji and the page counter
 * beside it centre on the text; the emoji then rises by the brand's `--logo-wizard-lift` onto the
 * letters. On a dark theme the Night wordmark replaces it (`slides.css`).
 */
export function HwWordmark() {
  return (
    <span className="pointer-events-none inline-flex items-center gap-[0.375rem]">
      <Image
        src="/hw-emoji-wordmark.png"
        alt=""
        width={192}
        height={192}
        priority
        className="h-(--slide-footer-mark) w-(--slide-footer-mark) shrink-0 translate-y-(--logo-wizard-lift) object-contain"
      />
      <Image
        src="/hw-wordmark.svg"
        alt=""
        width={6571}
        height={952}
        priority
        className="hw-wordmark h-(--slide-wordmark) w-auto"
      />
      <Image
        src="/hw-wordmark-night.svg"
        alt=""
        width={6571}
        height={952}
        priority
        className="hw-wordmark-night h-(--slide-wordmark) w-auto"
      />
    </span>
  );
}

/** The website's teal-to-purple strip, the one brand mark every slide shares. */
export function BrandStrip() {
  return (
    <div
      className="absolute inset-x-0 top-0 z-40 h-(--slide-strip) bg-gradient-to-r from-brand to-brand-accent"
      aria-hidden="true"
    />
  );
}

export function SlideContainer({ children, logo, theme, scale, page }: Props) {
  const viewportClassName = `slide-viewport fixed inset-0 overflow-hidden${theme ? ` theme-${theme}` : ""}${scale ? ` slide-scale-${scale}` : ""}`;

  const renderHW = (l: LogoConfig) => (
    <div
      className="fixed right-(--slide-footer-inset) bottom-(--slide-footer-inset) z-40 flex items-center gap-5"
      aria-hidden="true"
    >
      {page && <PageCounter label={page} />}
      {l.src === HW_LOGO.src ? (
        <HwWordmark />
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
