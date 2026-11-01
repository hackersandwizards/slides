"use client";

import {
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import Pause from "lucide-react/icons/pause";
import Play from "lucide-react/icons/play";
import { usePrintMode } from "../../lib/print-context";
import { BlurFade } from "../ui/blur-fade";

// The parts every slide type is built from, one owner each, on the tokens of styles/tokens.css. A
// slide type composes these; a difference between two slide types is a variant here, never a class
// of the type's own. Each export is listed in the specimen page's parts section
// (scripts/specimen.ts), with the slide types that use it.

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
    <SlideCard
      inert={!visible}
      tone="secondary"
      look="soft"
      className={`w-full max-w-5xl px-10 py-5 text-center transition-all duration-500 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <p className="text-xl font-medium text-secondary">{children}</p>
    </SlideCard>
  );
}

export type CardTone = "neutral" | "primary" | "secondary" | "accent" | "success" | "error";

/** Tailwind sees each class whole: one line per tone and look. */
const CARD_TONES: Record<CardTone, Record<"tint" | "soft" | "outline" | "line", string>> = {
  neutral: {
    tint: "border border-border bg-white",
    soft: "border border-border bg-white",
    outline: "border border-border bg-white",
    line: "border border-border bg-white",
  },
  primary: {
    tint: "border border-primary bg-primary/7",
    soft: "border border-primary/25 bg-primary/7",
    outline: "border border-primary bg-white",
    line: "border border-primary/25 bg-white",
  },
  secondary: {
    tint: "border border-secondary bg-secondary/7",
    soft: "border border-secondary/25 bg-secondary/7",
    outline: "border border-secondary bg-white",
    line: "border border-secondary/25 bg-white",
  },
  accent: {
    tint: "border border-accent bg-accent/7",
    soft: "border border-accent/25 bg-accent/7",
    outline: "border border-accent bg-white",
    line: "border border-accent/25 bg-white",
  },
  success: {
    tint: "border border-success bg-success/7",
    soft: "border border-success/25 bg-success/7",
    outline: "border border-success bg-white",
    line: "border border-success/25 bg-white",
  },
  error: {
    tint: "border border-error bg-error/7",
    soft: "border border-error/25 bg-error/7",
    outline: "border border-error bg-white",
    line: "border border-error/25 bg-white",
  },
};

/** The website's card: brand radius, hairline border, no shadow. `tone` names its colour and
 *  `look` how much of it: `tint` a full border on the 7% tint (the one that matters), `soft` a
 *  light border on the tint, `outline` a full border on white, `line` a light border on white. A
 *  neutral card is white with the grey hairline whatever its look; `quiet` drops the border onto a
 *  grey tint, for a result set apart from the flow. */
export function SlideCard({
  tone = "neutral",
  look = "tint",
  className = "",
  ...props
}: {
  tone?: CardTone | "quiet";
  look?: "tint" | "soft" | "outline" | "line";
} & ComponentPropsWithoutRef<"div">) {
  const colour = tone === "quiet" ? "bg-ink/7" : CARD_TONES[tone][look];
  return <div className={`rounded-brand ${colour} ${className}`.trim()} {...props} />;
}

const DISPLAY_SIZES = {
  xl: "text-8xl",
  lg: "text-7xl",
  md: "text-6xl",
  sm: "text-5xl",
};

/** Inline, because the `white-space` shorthand of `whitespace-pre-line` resets the class's
 *  `text-wrap: balance`, which left a lone year on a subtitle's second line. */
const BALANCED: CSSProperties = { textWrap: "balance" };

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
      className={`-my-(--slide-display-bleed) py-(--slide-display-bleed) font-heading leading-(--slide-display-leading) font-bold tracking-(--slide-display-tracking) whitespace-pre-line text-text ${DISPLAY_SIZES[size]} ${className}`.trim()}
      style={BALANCED}
    >
      {children}
    </Tag>
  );
}

const TILE_SIZES = {
  sm: "size-10 text-lg",
  md: "size-12 text-xl",
  lg: "size-16 text-3xl",
  xl: "h-24 min-w-24 px-3 text-4xl",
};

const TILE_TONES = {
  solid: "bg-primary text-white",
  soft: "bg-primary/7 text-primary",
  badge: "border border-badge-border bg-badge-bg text-primary",
  ink: "bg-text text-white",
  /** The colours come from the caller, a tile whose state animates them (a pillar's badge). */
  none: "",
};

/** A number or an icon on a square tile: a step's number, a pillar's badge, a phase's mark. Four
 *  sizes and four tones; the tile's corner is the slide's small radius. */
export function NumberTile({
  children,
  size = "md",
  tone = "solid",
  className = "",
}: {
  children: ReactNode;
  size?: keyof typeof TILE_SIZES;
  tone?: keyof typeof TILE_TONES;
  className?: string;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-brand-sm font-heading font-bold tabular-nums ${TILE_SIZES[size]} ${TILE_TONES[tone]} ${className}`.trim()}
    >
      {children}
    </span>
  );
}

const FRAME_TONES = {
  neutral: { idle: "border-border bg-white", active: "border-border bg-white" },
  primary: { idle: "border-primary-border/70 bg-white", active: "border-primary bg-primary/7" },
  secondary: {
    idle: "border-secondary-border/70 bg-white",
    active: "border-secondary bg-secondary/7",
  },
};

/** A dashed frame round a group of parts that belong together: the factory frame, a pipeline's
 *  group, a content slide's container. `active` fills it with its tone's tint. */
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
      className={`rounded-brand border-2 border-dashed ${FRAME_TONES[tone][active ? "active" : "idle"]} ${className}`.trim()}
      {...props}
    />
  );
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
    <SlideCard className="h-(--slide-chart-height) p-8" data-chart-plot>
      {children}
    </SlideCard>
  );
}

/** The one video player: the recording on night in the brand corner, a round teal play button
 *  straddling its bottom edge, centred (the caller leaves 2.5rem below for its lower half), and a
 *  progress line. Click the picture or the button to play or pause; playing, the button stays as
 *  the pause control, shown only to the keyboard that holds focus on it. */
export function VideoPlayer({
  src,
  poster,
  alt,
  className = "",
}: {
  src: string;
  poster?: string;
  alt?: string;
  className?: string;
}) {
  const printMode = usePrintMode();
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };
  return (
    <div className={`relative rounded-brand border border-border bg-night ${className}`.trim()}>
      <video
        ref={ref}
        src={src}
        poster={poster}
        aria-label={alt}
        muted
        playsInline
        preload={printMode ? "auto" : "metadata"}
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) =>
          setProgress(e.currentTarget.currentTime / (e.currentTarget.duration || 1))
        }
        className={`block cursor-pointer rounded-[inherit] ${className}`.trim()}
      />
      {/* Round and teal, as every control that holds only an icon (brand tokens, radius-pill;
            unprimed blind panel 2026-11-01). It straddles the recording's bottom edge, centred,
            as on the website, so it covers no corner of the picture (os decision
            play-button-position); the frame's bottom padding holds its lower half. Playing, it
            stays as the pause control, shown only to the keyboard that holds focus on it. */}
      <button
        type="button"
        onClick={toggle}
        aria-label={`${playing ? "Pause" : "Play"} ${alt ?? "video"}`}
        className={`absolute -bottom-10 left-1/2 z-10 flex size-20 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-white ${playing ? "opacity-0 focus-visible:opacity-100" : ""}`}
      >
        {playing ? (
          <Pause className="size-10 fill-current" strokeWidth={0} />
        ) : (
          <Play className="size-10 fill-current" strokeWidth={0} />
        )}
      </button>
      {progress > 0 && (
        <div className="absolute inset-x-0 bottom-0 h-1.5 overflow-hidden rounded-b-[inherit] bg-white/15">
          <div className="h-full bg-primary" style={{ width: `${progress * 100}%` }} />
        </div>
      )}
    </div>
  );
}
