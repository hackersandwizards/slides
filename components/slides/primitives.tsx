import type { ComponentPropsWithoutRef, HTMLAttributes, ReactNode } from "react";
import { BlurFade } from "../ui/blur-fade";

// The parts every slide type is built from, one owner each. Each export has an entry on the
// design system page, whose test fails on an export without one.

/** A titled slide's column: headline on top, `.slide-body` below, both under the fit guard. */
export function TitledContent({ children }: { children: ReactNode }) {
  return <div className="slide-content slide-titled relative z-10 flex flex-col">{children}</div>;
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
      <Tag className={`slide-title ${className}`.trim()}>{children}</Tag>
    </BlurFade>
  );
}

/** The line under a headline, fading in after it. */
export function SlideSubtitle({ children, delay = 0.15 }: { children: ReactNode; delay?: number }) {
  return (
    <BlurFade delay={delay} duration={0.5}>
      <p className="mt-4 max-w-6xl text-2xl leading-snug whitespace-pre-line text-text-muted">
        {children}
      </p>
    </BlurFade>
  );
}

/** The website's card: brand radius, hairline border, white, no shadow. */
export function SlideCard({ className = "", ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={`rounded-brand border border-border bg-white ${className}`} {...props} />;
}

/** The website's run log: night background, faint border. A `pre` for code, a `div` for a
 *  panel with its own header. */
export function CodePanel({
  as: Tag = "div",
  className = "",
  ...props
}: { as?: "div" | "pre" } & HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={`rounded-brand border border-white/7 bg-code-bg ${className}`} {...props} />
  );
}

/** A chart's plot area: a card of fixed height the chart fills. */
export function ChartFrame({ children }: { children: ReactNode }) {
  return (
    <SlideCard className="p-8" style={{ height: "26.25rem" }} data-chart-plot>
      {children}
    </SlideCard>
  );
}

// Full class strings, so Tailwind finds them in this file.
const WASH = {
  3: "from-primary/7 via-transparent to-secondary/7",
  4: "from-primary/7 via-transparent to-secondary/7",
  5: "from-primary/7 via-transparent to-secondary/7",
  6: "from-primary/7 via-transparent to-secondary/7",
} as const;

/** The diagonal teal-to-purple tint behind a slide, at a strength in percent. */
export function Wash({ strength }: { strength: keyof typeof WASH }) {
  return <div className={`absolute inset-0 bg-gradient-to-br ${WASH[strength]}`} />;
}
