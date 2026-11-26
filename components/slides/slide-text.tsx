"use client";

import { type CSSProperties, type ReactNode } from "react";
import { DEFAULT_SECTION_STYLE } from "../../lib/section-styles";
import { BlurFade } from "../ui/blur-fade";
import { keepCompounds, renderMarkdown } from "../../lib/markdown";

/** A titled slide's column: headline on top, `.slide-body` below, both under the fit guard. */
export function TitledContent({
  children,
  titled = true,
}: {
  children: ReactNode;
  /** False on a slide without a headline: its body then stands centred, as on any untitled slide. */
  titled?: boolean;
}) {
  return (
    <div
      className={`slide-content ${titled ? "slide-titled" : "justify-center"} relative z-10 flex flex-col`}
    >
      {children}
    </div>
  );
}

/** The slide headline (`.slide-title`), fading in. `as="h2"` where the slide already has an h1. */
export function SlideTitle({
  children,
  as: Tag = "h1",
  className = "",
  delay = 0.1,
  duration = 0.5,
}: {
  children: ReactNode;
  as?: "h1" | "h2";
  className?: string;
  delay?: number;
  duration?: number;
}) {
  return (
    <BlurFade delay={delay} duration={duration}>
      <Tag className={`slide-title ${className}`.trim()}>{keepCompounds(children)}</Tag>
    </BlurFade>
  );
}

/** The line under a headline, fading in after it. */
export function SlideSubtitle({ children, delay = 0.15 }: { children: ReactNode; delay?: number }) {
  return (
    <BlurFade delay={delay} duration={0.5}>
      <p className="mt-4 max-w-6xl text-2xl leading-snug whitespace-pre-line text-text-muted">
        {keepCompounds(children)}
      </p>
    </BlurFade>
  );
}

/** The one line under a slide's body, such as a source or the point it lands on, set off by a
 *  rule in the section's colour (`border`, a `getSectionStyle` border class). */
export function SlideFooter({
  children,
  border = DEFAULT_SECTION_STYLE.border,
  delay,
  className,
}: {
  children: ReactNode;
  border?: string;
  delay?: number;
  className?: string;
}) {
  return (
    <BlurFade delay={delay} duration={0.5} className={className}>
      <p className={`mt-8 border-t-2 pt-6 text-2xl text-text ${border}`}>{children}</p>
    </BlurFade>
  );
}

/** Someone else's words on a content slide: brand's quote, its source inside the rule under the
 *  words, as a statement slide sets its quotation. */
export function Quote({ text, source }: { text: string; source?: string }) {
  return (
    <figure className="hw-quote m-0 max-w-(--slide-measure-list)">
      <blockquote className="m-0">
        <p className="text-4xl leading-snug text-balance">{renderMarkdown(text)}</p>
      </blockquote>
      {source && (
        <figcaption className="mt-5 text-xl text-text-muted">{renderMarkdown(source)}</figcaption>
      )}
    </figure>
  );
}

/** The takeaway under a slide's diagram, brand's callout, fading in when `visible`: the last step
 *  of a reveal. */
export function SlideCaption({
  children,
  visible = true,
}: {
  children: ReactNode;
  visible?: boolean;
}) {
  return (
    <div
      inert={!visible}
      className={`hw-callout w-fit max-w-5xl transition-all duration-500 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <p className="text-xl text-text">{children}</p>
    </div>
  );
}

const DISPLAY_SIZES = {
  xl: "text-8xl",
  lg: "text-7xl",
  md: "text-6xl",
  sm: "text-5xl",
};

/** Inline, because the `white-space` shorthand of `whitespace-pre-line` resets the class's
 *  `text-wrap: balance`, which left a lone year on a subtitle's second line. */
export const BALANCED: CSSProperties = { textWrap: "balance" };

/** The display heading of a slide that stands on one statement: the title, a divider, a
 *  statement, a question, the closing line, a roadmap column's name. The heading family in ink at
 *  one tracking and one leading (tokens.css), its size the one variant; a line break in the text
 *  is kept. Its vertical margin is the descender bleed, so `className` carries no margin: a gap
 *  goes on the element around it. */
export function DisplayHeading({
  children,
  as: Tag = "h1",
  size = "xl",
  className = "",
}: {
  children: ReactNode;
  as?: "h1" | "h2" | "h3" | "div" | "p";
  size?: keyof typeof DISPLAY_SIZES;
  className?: string;
}) {
  return (
    <Tag
      className={`-my-(--slide-display-bleed) py-(--slide-display-bleed) font-heading leading-(--slide-display-leading) font-bold tracking-(--type-display-tracking) whitespace-pre-line text-text ${DISPLAY_SIZES[size]} ${className}`.trim()}
      style={BALANCED}
    >
      {children}
    </Tag>
  );
}
