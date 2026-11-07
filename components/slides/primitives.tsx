"use client";

import {
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import ArrowUpRight from "lucide-react/icons/arrow-up-right";
import Pause from "lucide-react/icons/pause";
import Play from "lucide-react/icons/play";
import { usePrintMode } from "../../lib/print-context";
import { DEFAULT_SECTION_STYLE } from "../../lib/section-styles";
import { linkLabel, profileLabel } from "../../lib/slide-utils";
import { BlurFade } from "../ui/blur-fade";
import { Linkedin } from "../../lib/icons";

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

/** A link spelled out under a picture or a QR code, an arrow before it, opening in a new tab: the
 *  address's one link for the keyboard and screen readers. `linkedin`: a person's profile on a
 *  profile card, the LinkedIn glyph before the short address (`in/name`) on one line in muted body
 *  text, not the word "LinkedIn" in teal or an outlined button. */
export function LinkCaption({ href, variant }: { href: string; variant?: "linkedin" }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        variant
          ? "inline-flex items-center gap-2 text-lg whitespace-nowrap text-text-muted"
          : "slide-media-caption slide-media-link"
      }
    >
      {variant ? (
        <Linkedin className="size-5 shrink-0" />
      ) : (
        <ArrowUpRight className="size-(--slide-link-icon) shrink-0" strokeWidth={2.25} />
      )}
      {variant ? profileLabel(href) : linkLabel(href)}
    </a>
  );
}

/** A picture linked to the address its `LinkCaption` spells out: out of the tab order, so the
 *  keyboard reaches the address once; a screen reader still reads the picture's alt text. */
export function PictureLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="contents" tabIndex={-1}>
      {children}
    </a>
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

export type CardTone = "neutral" | "primary" | "secondary" | "accent" | "success" | "error";
type CardLook = "tint" | "soft" | "outline" | "line";

/** The tones the brand card has no rule for, the slide's own (exception `card-tone` in
 *  brand-elements.json). Tailwind sees each class whole: one line per tone and look. */
const CARD_TONES: Record<Exclude<CardTone, "neutral">, Partial<Record<CardLook, string>>> = {
  primary: {
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
    tint: "border border-slide-accent bg-slide-accent/7",
    soft: "border border-slide-accent/25 bg-slide-accent/7",
    outline: "border border-slide-accent bg-white",
    line: "border border-slide-accent/25 bg-white",
  },
  success: {
    tint: "border border-green-dark bg-green-dark/7",
    soft: "border border-green-dark/25 bg-green-dark/7",
    outline: "border border-green-dark bg-white",
    line: "border border-green-dark/25 bg-white",
  },
  error: {
    tint: "border border-red bg-red/7",
    soft: "border border-red/25 bg-red/7",
    outline: "border border-red bg-white",
    line: "border border-red/25 bg-white",
  },
};

/** A soft card in a tone with a meaning is brand's status box (`hw-status`): its tone at 40 % as
 *  the line and 7 % as the ground. Purple means no state and stays a slide card; a tinted card
 *  keeps its full line (exception `card-tone`). */
const STATUS_TONES: Partial<Record<CardTone, "info" | "warning" | "success" | "error">> = {
  primary: "info",
  accent: "warning",
  success: "success",
  error: "error",
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
  if (tone === "neutral" || (tone === "primary" && look === "tint"))
    return (
      <div
        className={`hw-card ${className}`.trim()}
        data-variant={tone === "primary" ? "tint" : undefined}
        {...props}
      />
    );
  const status = tone !== "quiet" && look === "soft" && STATUS_TONES[tone];
  if (status)
    return <div className={`hw-status ${className}`.trim()} data-tone={status} {...props} />;
  const colour = tone === "quiet" ? "bg-ink/7" : CARD_TONES[tone][look];
  return (
    <div
      className={`rounded-brand p-(--hw-card-pad) ${colour} ${className}`.trim()}
      data-hw-exception="card-tone"
      {...props}
    />
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
      className={`-my-(--slide-display-bleed) py-(--slide-display-bleed) font-heading leading-(--slide-display-leading) font-bold tracking-(--type-display-tracking) whitespace-pre-line text-text ${DISPLAY_SIZES[size]} ${className}`.trim()}
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

/** A chart's plot area: a card of fixed height the chart fills. */
export function ChartFrame({ children }: { children: ReactNode }) {
  return (
    <SlideCard className="h-(--slide-chart-height) card-pad-8" data-chart-plot>
      {children}
    </SlideCard>
  );
}

/** The one video player: the recording on night in the brand corner, a round teal play button
 *  straddling its bottom edge, centred (the caller leaves 2.5rem below for its lower half), and a
 *  progress line. Click the picture or the button to play or pause; playing, the button stays as
 *  the pause control, shown only to the keyboard that holds focus on it. `className` sizes player
 *  and video alike, so the frame's line is a ring: a border takes the frame's box from the video,
 *  which then runs past it. The frame alone carries the corner and clips the video and the
 *  progress line to it, so no brand corner sits inside another; the button stays outside it.
 *  `isolate`, or WebKit draws a playing video's square corners over the clip. */
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
    <div className={`relative ${className}`.trim()}>
      <div className="relative isolate overflow-hidden rounded-brand bg-night ring ring-border">
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
          className={`block cursor-pointer ${className}`.trim()}
        />
        {progress > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-white/15">
            <div className="h-full bg-primary" style={{ width: `${progress * 100}%` }} />
          </div>
        )}
      </div>
      {/* The brand's round icon control over a picture (hw-icon-button, solid teal), at the
            stage scale's size. It straddles the recording's bottom edge, centred, as on the
            website, so it covers no corner of the picture; the frame's bottom padding holds its
            lower half. Playing, it stays as the pause control, shown only to the keyboard that
            holds focus on it. */}
      <button
        type="button"
        onClick={toggle}
        aria-label={`${playing ? "Pause" : "Play"} ${alt ?? "video"}`}
        className={`hw-icon-button absolute -bottom-[calc(var(--hw-control-size)/2)] left-1/2 z-10 -translate-x-1/2 ${playing ? "opacity-0 focus-visible:opacity-100" : ""}`}
        data-on="picture"
      >
        {playing ? (
          <Pause className="fill-current" strokeWidth={0} />
        ) : (
          <Play className="fill-current" strokeWidth={0} />
        )}
      </button>
    </div>
  );
}
