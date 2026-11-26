"use client";

import { type ComponentPropsWithoutRef, type HTMLAttributes, type ReactNode } from "react";

export type CardTone = "neutral" | "primary" | "secondary" | "accent" | "success" | "error";
type CardLook = "tint" | "soft" | "outline" | "line";

interface CardSurface {
  className: string;
  "data-variant"?: "tint";
  "data-tone"?: "info" | "warning" | "success" | "error";
  "data-hw-exception"?: "card-tone";
}

/** The tones the brand card has no rule for, the slide's own (exception `card-tone` in
 *  brand-elements.json). */
const cardTone = (colour: string): CardSurface => ({
  className: `rounded-brand p-(--hw-card-pad) ${colour}`,
  "data-hw-exception": "card-tone",
});

/** A soft card in a tone with a meaning is brand's status box (`hw-status`): its tone at 40 % as
 *  the line and 7 % as the ground. Purple means no state and stays a slide card; a tinted card
 *  keeps its full line (exception `card-tone`). */
const statusTone = (tone: "info" | "warning" | "success" | "error"): CardSurface => ({
  className: "hw-status",
  "data-tone": tone,
});

const allLooks = (surface: CardSurface): Record<CardLook, CardSurface> => ({
  tint: surface,
  soft: surface,
  outline: surface,
  line: surface,
});

/** Maps each tone and look to its card surface. Tailwind sees each class whole. */
const CARD_SURFACES: Record<CardTone | "quiet", Record<CardLook, CardSurface>> = {
  neutral: allLooks({ className: "hw-card" }),
  quiet: allLooks(cardTone("bg-ink/7")),
  primary: {
    tint: { className: "hw-card", "data-variant": "tint" },
    soft: statusTone("info"),
    outline: cardTone("border border-primary bg-white"),
    line: cardTone("border border-primary/25 bg-white"),
  },
  secondary: {
    tint: cardTone("border border-secondary bg-secondary/7"),
    soft: cardTone("border border-secondary/25 bg-secondary/7"),
    outline: cardTone("border border-secondary bg-white"),
    line: cardTone("border border-secondary/25 bg-white"),
  },
  accent: {
    tint: cardTone("border border-slide-accent bg-slide-accent/7"),
    soft: statusTone("warning"),
    outline: cardTone("border border-slide-accent bg-white"),
    line: cardTone("border border-slide-accent/25 bg-white"),
  },
  success: {
    tint: cardTone("border border-green-dark bg-green-dark/7"),
    soft: statusTone("success"),
    outline: cardTone("border border-green-dark bg-white"),
    line: cardTone("border border-green-dark/25 bg-white"),
  },
  error: {
    tint: cardTone("border border-red bg-red/7"),
    soft: statusTone("error"),
    outline: cardTone("border border-red bg-white"),
    line: cardTone("border border-red/25 bg-white"),
  },
};

/** The brand card (`hw-card`): a neutral card whatever its look, and the primary `tint`, the one
 *  that matters, as the brand's tinted card. `tone` names its colour and `look` how much of it:
 *  `tint` a full border on the 7% tint, `soft` a light border on the tint, `outline` a full border
 *  on white, `line` a light border on white; those and `quiet`, no border on a grey tint for a
 *  result set apart from the flow, are the slide's own. The padding is the card's setting, a
 *  `card-pad-*` utility in `className`, 2rem without one. */
export function SlideCard({
  tone = "neutral",
  look = "tint",
  className = "",
  ...props
}: {
  tone?: CardTone | "quiet";
  look?: CardLook;
} & ComponentPropsWithoutRef<"div">) {
  const { className: surfaceClass, ...surfaceAttrs } = CARD_SURFACES[tone][look];
  return <div className={`${surfaceClass} ${className}`.trim()} {...surfaceAttrs} {...props} />;
}

const FRAME_TONES = {
  neutral: { idle: "border-border bg-white", active: "border-border bg-white" },
  primary: { idle: "border-primary-border/70 bg-white", active: "border-primary bg-primary/7" },
  secondary: {
    idle: "border-secondary-border/70 bg-white",
    active: "border-secondary bg-secondary/7",
  },
};

/** A dashed frame round a group of parts that belong together, brand's `hw-frame` (line width and
 *  corner): the factory frame, a pipeline's group, a content slide's container. Its tones and white
 *  ground are the slide's own (exception `frame-tone`), `active` fills it with its tone's tint. */
export function DashedFrame({
  tone = "neutral",
  active = false,
  className = "",
  ...props
}: {
  tone?: keyof typeof FRAME_TONES;
  active?: boolean;
} & ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={`hw-frame ${FRAME_TONES[tone][active ? "active" : "idle"]} ${className}`.trim()}
      data-hw-exception="frame-tone"
      {...props}
    />
  );
}

/** The website's run log, brand's code panel (`hw-code` `panel`): its corner, hairline and
 *  colours. A `pre` for code, a `div` for a panel with its own header; padding and type stay the
 *  layout's (exception `code-panel`), and the ground is the slide's code ground, night-2 on night. */
export function CodePanel({
  as: Tag = "div",
  className = "",
  ...props
}: { as?: "div" | "pre" } & HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      className={`hw-code bg-code-bg ${className}`}
      data-variant="panel"
      data-hw-exception="code-panel"
      {...props}
    />
  );
}

/** A chart's plot area: a card of fixed height the chart fills. On a phone it grows with the text
 *  round its chart from that height, which it keeps while the chart loads. */
export function ChartFrame({ children }: { children: ReactNode }) {
  return (
    <SlideCard
      className="h-(--slide-chart-height) card-pad-8 max-md:h-auto max-md:min-h-(--slide-chart-height)"
      data-chart-plot
    >
      {children}
    </SlideCard>
  );
}
