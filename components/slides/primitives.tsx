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

/** The purple caption under a slide's diagram, fading in when `visible`: the last step of a
 *  reveal. */
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
      className={`w-full max-w-5xl rounded-brand border border-secondary/25 bg-secondary/7 px-10 py-5 text-center transition-all duration-500 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <p className="text-xl font-medium text-secondary">{children}</p>
    </div>
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
