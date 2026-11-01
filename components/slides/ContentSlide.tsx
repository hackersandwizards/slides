"use client";

import {
  Fragment,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import { usePrintMode } from "../../lib/print-context";
import Image from "../ui/image";
import type {
  ContentSlide as ContentSlideType,
  ContentBlock,
  SectionTheme,
  StageState,
} from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { SectionHeader } from "./SectionHeader";
import { Visual } from "./Visuals";
import { SlideShell } from "./SlideShell";
import { renderMarkdown } from "../../lib/markdown";
import { highlightCode } from "../../lib/code-highlight";
import { getStageClasses } from "../../lib/stage-utils";
import { getSectionStyle } from "../../lib/section-styles";
import { isDeepDive, keepHyphenatedWords, linkLabel, personAccent } from "../../lib/slide-utils";
import { useProgressiveReveal } from "../../lib/use-progressive-reveal";
import { TitledContent, SlideTitle, SlideCard, CodePanel, SlideSubtitle } from "./primitives";

type LabeledGridBlockType = Extract<ContentBlock, { type: "labeled-grid" }>;

const LABELED_GRID_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

/** The deck's own column count, or three for a multiple of three items, so three cards never
 *  wrap as two plus an orphan. */
function labeledGridColumns(block: LabeledGridBlockType): number {
  if (block.columns && block.columns in LABELED_GRID_COLS) return block.columns;
  return block.items.length % 3 === 0 ? 3 : 2;
}

function LabeledGridBlock({
  block,
  centered,
}: {
  block: LabeledGridBlockType;
  centered?: boolean;
}) {
  // When `reveal` is set, items appear one per ArrowRight; otherwise all show at once.
  const { revealedCount } = useProgressiveReveal({
    totalSteps: block.items.length,
    startFull: !block.reveal,
  });
  return (
    <div
      className={`grid gap-5 ${LABELED_GRID_COLS[labeledGridColumns(block)]} ${centered ? "mx-auto w-full max-w-6xl" : ""}`}
    >
      {block.items.map((item, i) => {
        const revealed = i < revealedCount;
        return (
          <div
            key={i}
            inert={!revealed}
            className={`rounded-brand p-6 transition-all duration-500 ${
              revealed ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            } ${
              item.highlighted
                ? "border border-success bg-success/7"
                : "border border-border bg-white"
            }`}
          >
            <p className={`text-xl font-bold ${item.highlighted ? "text-success" : "text-text"}`}>
              {item.title}
            </p>
            <p className="card-text-lg mt-1 text-text-muted">{renderMarkdown(item.subtitle)}</p>
          </div>
        );
      })}
    </div>
  );
}

interface Props {
  slide: ContentSlideType;
}

const MEDIA_BLOCKS = new Set(["image", "video", "linked-image"]);

/** An image, video or linked image: centred, and on a titled slide as large as the body's free
 *  height allows, never larger than its own file. */
function MediaFrame({
  children,
  below,
  boxClassName = "",
}: {
  children: ReactNode;
  below?: ReactNode;
  boxClassName?: string;
}) {
  return (
    <figure className="slide-media">
      <div className={`slide-media-box ${boxClassName}`}>{children}</div>
      {below}
    </figure>
  );
}

/** A picture in the media frame. Once its file has loaded, it may grow to fill the frame, up to
 *  twice its own pixel width on the 1920 px stage (90rem): a screenshot left at its file's size
 *  stood small in an empty body, and its text was unreadable in the room (blind panel 2026-11-01). */
function MediaPicture({ src, alt, className }: { src: string; alt?: string; className: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [fill, setFill] = useState<string>();
  useLayoutEffect(() => {
    const img = ref.current?.querySelector("img");
    if (!img) return;
    const measure = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      if (w && h) setFill(`min(100cqw, ${w / h} * 100cqh, ${(w * 2 * 90) / 1920}rem)`);
    };
    measure();
    img.addEventListener("load", measure);
    return () => img.removeEventListener("load", measure);
  }, [src]);
  return (
    <span
      ref={ref}
      className="contents"
      style={fill ? ({ "--media-fill": fill } as CSSProperties) : undefined}
    >
      <Image src={src} alt={alt || ""} width={1920} height={1080} className={className} />
    </span>
  );
}

function VideoBlock({ block }: { block: Extract<ContentBlock, { type: "video" }> }) {
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
    <MediaFrame
      boxClassName="pb-10"
      below={
        block.caption && <figcaption className="slide-media-caption">{block.caption}</figcaption>
      }
    >
      <div className="slide-media-item relative rounded-brand border border-border bg-night">
        <video
          ref={ref}
          src={block.src}
          poster={block.poster}
          aria-label={block.alt}
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
          className="slide-media-item block cursor-pointer rounded-[inherit]"
        />
        {/* Round and teal, as every control that holds only an icon (brand tokens, radius-pill;
            unprimed blind panel 2026-11-01). It straddles the recording's bottom edge, centred,
            as on the website, so it covers no corner of the picture (os decision
            play-button-position); the frame's bottom padding holds its lower half. Playing, it
            stays as the pause control, shown only to the keyboard that holds focus on it. */}
        <button
          type="button"
          onClick={toggle}
          aria-label={`${playing ? "Pause" : "Play"} ${block.alt ?? "video"}`}
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
    </MediaFrame>
  );
}

const TWO_COL_VARIANTS = {
  "success-error": {
    left: {
      card: "border-success/25 bg-white",
      title: "text-success",
      dot: "bg-success",
    },
    right: {
      card: "border-error/25 bg-white",
      title: "text-error",
      dot: "bg-error",
    },
  },
  "error-success": {
    left: {
      card: "border-error/25 bg-white",
      title: "text-error",
      dot: "bg-error",
    },
    right: {
      card: "border-success/25 bg-white",
      title: "text-success",
      dot: "bg-success",
    },
  },
  error: {
    left: {
      card: "border-error/25 bg-white",
      title: "text-error",
      dot: "bg-error",
    },
    right: {
      card: "border-error/25 bg-white",
      title: "text-error",
      dot: "bg-error",
    },
  },
  "error-neutral": {
    left: {
      card: "border-error/25 bg-white",
      title: "text-error",
      dot: "bg-error",
    },
    right: {
      card: "border-border bg-white",
      title: "text-text",
      dot: "",
    },
  },
  success: {
    left: {
      card: "border-success/25 bg-white",
      title: "text-success",
      dot: "bg-success",
    },
    right: {
      card: "border-success/25 bg-white",
      title: "text-success",
      dot: "bg-success",
    },
  },
  neutral: {
    left: {
      card: "border-border bg-white",
      title: "text-text",
      dot: "",
    },
    right: {
      card: "border-border bg-white",
      title: "text-text",
      dot: "",
    },
  },
};

function renderColumnContent(text: string) {
  if (text.startsWith("```") && text.endsWith("```")) {
    const language = text.slice(3, text.indexOf("\n")).trim();
    const codeContent = text.slice(text.indexOf("\n") + 1, text.lastIndexOf("```"));
    return (
      <CodePanel
        as="pre"
        className="p-5 text-base leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap"
      >
        <code className="font-code">{highlightCode(codeContent.replace(/\n$/, ""), language)}</code>
      </CodePanel>
    );
  }
  return text.split("\n\n").map((paragraph, i) => {
    if (paragraph.startsWith("•")) {
      const items = paragraph.split("\n").filter((line) => line.startsWith("•"));
      return (
        <ul key={i} className="space-y-3">
          {items.map((item, j) => (
            <li key={j} className="flex items-baseline gap-3 text-xl text-text-muted">
              <span className="hw-marker" />
              <span>{renderMarkdown(item.slice(2))}</span>
            </li>
          ))}
        </ul>
      );
    }
    return (
      <p key={i} className="mb-4 text-xl text-text-muted">
        {renderMarkdown(paragraph)}
      </p>
    );
  });
}

interface PipelineStage {
  title: string;
  state?: string;
}

function getPipelineArrow(
  stageIndex: number,
  stages: PipelineStage[],
  showLoops?: boolean,
): string {
  if (!showLoops) return "→";
  const currentTitle = stages[stageIndex].title.toLowerCase();
  const nextTitle = stages[stageIndex + 1]?.title.toLowerCase();
  if (
    (currentTitle === "refine" && nextTitle === "challenge") ||
    (currentTitle === "review" && nextTitle === "rework")
  ) {
    return "⇄";
  }
  return "→";
}

type PipelineBlock = Extract<ContentBlock, { type: "pipeline" }>;

/** A pipeline reads as one row. Where its stages wrap, the row steps through `data-step` in
 *  slides.css: 1 closes its gaps and stage padding just as far as one row needs, so the row still
 *  spans its box, 2 also sets the labels at body size, the floor, and 3 splits it into two
 *  balanced rows. The fit guard in SlideShell lays the body out wider until a row at 3 holds one
 *  line, sends `pipeline-settle` whenever it changes the width, and sends `pipeline-reset` to
 *  measure the body with its rows at full spacing. */
function PipelineRow({ block }: { block: PipelineBlock }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const row = ref.current;
    if (!row) return;
    const stages = [...row.querySelectorAll<HTMLElement>(".pipeline-stage")];
    const wraps = () => new Set(stages.map((stage) => stage.offsetTop)).size > 1;
    const tighten = (share: number) => row.style.setProperty("--tighten", String(share));
    const reset = () => {
      delete row.dataset.step;
      row.style.removeProperty("--tighten");
    };
    const settle = () => {
      reset();
      if (!wraps()) return;
      row.dataset.step = "1";
      tighten(1);
      if (wraps()) {
        row.dataset.step = "2";
        if (wraps()) row.dataset.step = "3";
        return;
      }
      // The least tightening that holds one row, to 1/256.
      let loose = 0;
      let tight = 1;
      for (let i = 0; i < 8; i++) {
        const share = (loose + tight) / 2;
        tighten(share);
        if (wraps()) loose = share;
        else tight = share;
      }
      tighten(tight);
    };
    settle();
    row.addEventListener("pipeline-settle", settle);
    row.addEventListener("pipeline-reset", reset);
    return () => {
      row.removeEventListener("pipeline-settle", settle);
      row.removeEventListener("pipeline-reset", reset);
    };
  }, []);
  const half = Math.ceil(block.stages.length / 2);
  return (
    <div ref={ref} className="pipeline-row flex flex-wrap items-center justify-center gap-4">
      {block.stages.map((stage, i) => (
        <Fragment key={i}>
          {i === half && <span className="pipeline-break" />}
          <div className="flex items-center gap-4">
            {i > 0 && block.showArrows !== false && (
              <span className="text-2xl text-secondary">
                {getPipelineArrow(i - 1, block.stages, block.showLoops)}
              </span>
            )}
            <div
              className={`pipeline-stage flex items-center gap-3 rounded-brand px-5 py-3 text-lg font-semibold ${getStageClasses(stage.state as StageState)}`}
            >
              {stage.logo && (
                <Image
                  src={stage.logo}
                  alt={stage.title}
                  width={24}
                  height={24}
                  className="h-6 w-6 object-contain"
                />
              )}
              {stage.title}
            </div>
          </div>
        </Fragment>
      ))}
    </div>
  );
}

const CALLOUT_VARIANTS = {
  info: "border-secondary/25 bg-secondary/7 text-text",
  // On their tint the brand amber and green drop under 4.5:1 (4.29 and 4.27), so the text mixes
  // them 40% with ink, as the website's chips do.
  warning:
    "border-accent/25 bg-accent/7 text-[color-mix(in_srgb,var(--color-amber-dark)_60%,var(--color-ink))]",
  success:
    "border-success/25 bg-success/7 text-[color-mix(in_srgb,var(--color-green-dark)_60%,var(--color-ink))]",
};

function ContentBlockRenderer({
  block,
  centered,
  sectionTheme,
  besideBars,
}: {
  block: ContentBlock;
  centered?: boolean;
  sectionTheme?: SectionTheme;
  /** The slide carries a bars block: a callout ends level with the bars' track, not the values. */
  besideBars?: boolean;
}) {
  switch (block.type) {
    case "flow":
    case "layers":
    case "timeline":
    case "transform":
    case "bars":
    case "numbers":
    case "annotated":
    case "annotated-code":
    case "cards":
      return <Visual block={block} />;
    case "paragraph":
      if (centered) {
        return (
          <p className="mx-auto max-w-3xl text-xl leading-relaxed text-text-muted sm:text-2xl md:text-3xl">
            {renderMarkdown(block.text)}
          </p>
        );
      }
      if (block.centered) {
        // Set off by the same rule as the slide's footer, the one separator a slide carries.
        return (
          <div className={`mt-8 border-t-2 pt-6 ${getSectionStyle(sectionTheme).border}`}>
            <p className="mx-auto max-w-4xl text-center text-2xl leading-snug font-semibold tracking-tight text-balance text-text md:text-3xl">
              {renderMarkdown(block.text)}
            </p>
          </div>
        );
      }
      return (
        <p className="max-w-[72rem] text-xl leading-snug text-text-muted">
          {renderMarkdown(block.text)}
        </p>
      );

    case "bullets": {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List className="max-w-[60rem] space-y-4">
          {block.items.map((item, i) => {
            const isNested = typeof item === "object";
            const text = isNested ? item.text : item;
            return (
              <li key={i}>
                <div className="flex items-baseline gap-4 text-2xl text-text-muted">
                  {block.ordered ? (
                    <span className="w-8 shrink-0 font-semibold text-primary tabular-nums">
                      {i + 1}.
                    </span>
                  ) : (
                    <span className="hw-marker" />
                  )}
                  <span>{renderMarkdown(text)}</span>
                </div>
                {isNested && item.children.length > 0 && (
                  <ul className="mt-3 ml-10 space-y-3">
                    {item.children.map((child, j) => (
                      <li key={j} className="flex items-baseline gap-3 text-xl text-text-muted">
                        <span className="hw-marker slide-marker-nested" />
                        <span>{renderMarkdown(child)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </List>
      );
    }

    case "table":
      return (
        <div className="overflow-x-auto rounded-brand border-2 border-border bg-white">
          {/* Automatic layout: `widths` are the columns' preferred shares, and no column ever gets
              narrower than its longest word. A fixed layout let a word run into the next cell. */}
          <table className={`w-full border-collapse ${block.compact ? "text-lg" : "text-xl"}`}>
            {block.widths && (
              <colgroup>
                {block.widths.map((w, i) => (
                  <col
                    key={i}
                    style={{ width: `${(w / block.widths!.reduce((a, b) => a + b, 0)) * 100}%` }}
                  />
                ))}
              </colgroup>
            )}
            {block.headers && (
              <thead>
                <tr className="bg-gradient-to-r from-primary/7 to-primary/7">
                  {block.headers.map((header, i) => (
                    <th
                      key={i}
                      className={`label-caps border-b-2 border-border py-4 text-left text-base text-text ${block.compact ? "px-4" : "px-6"}`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={`transition-colors hover:bg-primary/7 ${rowIndex % 2 === 1 ? "bg-primary/7" : ""}`}
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={`border-b border-border py-4 text-left ${block.compact ? "px-4" : "px-6"} ${cellIndex === 0 ? "font-bold text-text" : "text-text-muted"}`}
                    >
                      {/* A word breaks only at a space: "Self-serve" never splits at its hyphen. */}
                      {renderMarkdown(keepHyphenatedWords(cell))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "two-column": {
      const v = TWO_COL_VARIANTS[block.variant ?? "neutral"];
      const sides = [
        { data: block.left, style: v.left },
        { data: block.right, style: v.right },
      ] as const;

      return (
        <div className="grid grid-cols-2 gap-10">
          {sides.map(({ data, style }, i) => (
            <div key={i} className={`rounded-brand border p-7 ${style.card}`}>
              {data.title && (
                <h3 className={`mb-5 font-heading text-2xl font-bold ${style.title}`}>
                  {renderMarkdown(data.title)}
                </h3>
              )}
              {data.text && renderColumnContent(data.text)}
              {data.items && (
                <ul className="space-y-4">
                  {data.items.map((item, j) => (
                    <li key={j} className="flex items-baseline gap-3 text-xl text-text-muted">
                      <span className={`hw-marker ${style.dot}`} />
                      <span>{renderMarkdown(item)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      );
    }

    case "code":
      return (
        <CodePanel as="pre" className="p-6 [overflow-wrap:anywhere] whitespace-pre-wrap">
          <code className="font-code text-lg">{highlightCode(block.code, block.language)}</code>
        </CodePanel>
      );

    case "code-and-text":
      return (
        <div className="grid grid-cols-2 gap-8">
          <CodePanel className="overflow-hidden">
            <pre className="p-6 text-base leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap">
              <code className="font-code">{highlightCode(block.code, block.language)}</code>
            </pre>
          </CodePanel>

          <div className="flex flex-col justify-center space-y-8">
            {block.sections.map((section, i) => (
              <div key={i}>
                <h3 className="label-caps mb-2 text-xl text-accent">{section.title}</h3>
                <p className="text-xl leading-relaxed text-text-muted">
                  {renderMarkdown(section.text)}
                </p>
              </div>
            ))}
          </div>
        </div>
      );

    case "hooks":
      return (
        <div className="space-y-2.5">
          {block.items.map((hook, i) => (
            <SlideCard key={i} className="flex items-baseline gap-4 p-3">
              <code className="rounded-brand-sm bg-primary/7 px-3 py-1 font-code text-base text-text">
                {hook.name}
              </code>
              <span className="text-lg text-text-muted">{hook.description}</span>
            </SlideCard>
          ))}
        </div>
      );

    case "pipeline":
      return (
        <div
          className={`rounded-brand border-2 border-dashed p-6 ${block.containerLabel ? "border-secondary bg-secondary/7" : "border-secondary-border bg-white"}`}
        >
          {block.containerLabel && (
            <div className="label-caps mb-4 flex items-baseline gap-2 text-sm">
              <div className="hw-marker bg-secondary" />
              <span className="text-secondary">{block.containerLabel}</span>
              {block.containerLogos &&
                block.containerLogos.map((logo, li) => (
                  <Image
                    key={li}
                    src={logo.src}
                    alt={logo.alt}
                    width={28}
                    height={28}
                    className="ml-1 h-7 w-auto self-center"
                  />
                ))}
            </div>
          )}
          <div
            className={`flex flex-wrap ${block.containerSideNotes ? "items-center justify-center gap-6" : "items-center justify-center gap-4"}`}
          >
            <PipelineRow block={block} />
            {block.containerSideNotes && (
              <>
                <div className="h-16 w-px bg-secondary/25" />
                <ul className="space-y-1.5">
                  {block.containerSideNotes.map((note, ni) => (
                    <li key={ni} className="flex items-baseline gap-2 text-base text-text-muted">
                      <span className="hw-marker slide-marker-nested bg-secondary" />
                      <span>{renderMarkdown(note)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          {block.containerFooter && (
            <p className="mt-4 border-t border-secondary/25 pt-3 text-base text-text-muted">
              {renderMarkdown(block.containerFooter)}
            </p>
          )}
        </div>
      );

    case "image":
      return (
        <MediaFrame>
          <MediaPicture
            src={block.src}
            alt={block.alt}
            className="slide-media-item rounded-brand border border-border"
          />
        </MediaFrame>
      );

    case "image-and-grid":
      return (
        <div className="grid grid-cols-[2fr_3fr] items-center gap-10">
          {block.image.sketch ? (
            // A sketch stands on the ground without a frame and fills the height of the cards
            // beside it, centred, never less than a framed image's height.
            <div className="relative min-h-[45vh] self-stretch">
              <Image
                src={block.image.src}
                alt={block.image.alt || ""}
                width={1200}
                height={1200}
                className="absolute inset-0 h-full w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex justify-center">
              <Image
                src={block.image.src}
                alt={block.image.alt || ""}
                width={1200}
                height={1500}
                className="h-auto max-h-[45vh] w-auto rounded-brand border border-border"
              />
            </div>
          )}
          <div className="flex flex-col gap-4">
            {block.gridTitle && (
              <h3 className="label-caps mb-2 text-base text-secondary">
                {renderMarkdown(block.gridTitle)}
              </h3>
            )}
            {block.items.map((item, i) => (
              <div
                key={i}
                className="rounded-brand border-2 border-secondary/15 bg-white px-6 py-4"
              >
                <p className="mb-1 text-xl font-bold text-text">{renderMarkdown(item.title)}</p>
                <p className="card-text-lg text-text">{renderMarkdown(item.subtitle)}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case "video":
      return <VideoBlock block={block} />;

    case "callout":
      if (centered) {
        return (
          <SlideCard className="mx-auto max-w-3xl px-8 py-5">
            <p className="text-lg leading-relaxed text-text-muted sm:text-xl md:text-2xl">
              {renderMarkdown(block.text)}
            </p>
          </SlideCard>
        );
      }
      return (
        <div
          className={`max-w-full rounded-brand border-2 px-8 py-6 ${block.fullWidth ? "w-full" : "w-fit"} ${besideBars ? "md:w-[calc(100%-16rem)]" : ""} ${CALLOUT_VARIANTS[block.variant ?? "info"]}`}
        >
          <p className="text-xl leading-snug font-medium">{renderMarkdown(block.text)}</p>
        </div>
      );

    case "four-column":
      return (
        <div className="grid grid-cols-4 gap-6">
          {block.columns.map((col, i) => (
            <SlideCard key={i} className="p-5">
              <h3 className="mb-3 font-heading text-lg font-bold text-text">
                {col.title}
                {col.subtitle && (
                  <span className="ml-2 text-sm font-normal text-text-subtle">
                    ({col.subtitle})
                  </span>
                )}
              </h3>
              <ul className="space-y-2">
                {col.items.map((item, j) => (
                  <li key={j} className="card-text-base flex items-baseline gap-2 text-text-muted">
                    <span className="hw-marker" />
                    <span>{renderMarkdown(item)}</span>
                  </li>
                ))}
              </ul>
            </SlideCard>
          ))}
        </div>
      );

    case "labeled-grid":
      return <LabeledGridBlock block={block} centered={centered} />;

    case "terminal":
      return (
        <CodePanel className="mx-auto max-w-4xl overflow-hidden text-left">
          <div className="border-b border-white/15 px-6 py-3 font-mono text-xs text-code-comment">
            terminal
          </div>
          <div className="space-y-2 px-6 py-5 font-mono text-lg leading-[2] sm:text-xl">
            {block.commands.map((cmd, i) => (
              <BlurFade key={i} delay={0.3 + i * 0.15} duration={0.4}>
                <div>
                  <span
                    className={
                      cmd.prefix === "$"
                        ? "text-code-command"
                        : cmd.prefix === "→"
                          ? "text-insight"
                          : "text-white/40"
                    }
                  >
                    {cmd.prefix}
                  </span>{" "}
                  <code className="text-white">{cmd.text}</code>
                </div>
              </BlurFade>
            ))}
          </div>
        </CodePanel>
      );

    case "linked-image": {
      const picture = (
        <MediaPicture
          src={block.src}
          alt={block.alt}
          className="slide-media-item rounded-brand border border-border"
        />
      );
      return (
        <MediaFrame
          below={
            block.href && (
              <a
                href={block.href}
                target="_blank"
                rel="noopener noreferrer"
                className="slide-media-caption slide-media-link"
              >
                <ArrowUpRight className="size-[1.1em] shrink-0" strokeWidth={2.25} />
                {linkLabel(block.href)}
              </a>
            )
          }
        >
          {block.href ? (
            <a href={block.href} target="_blank" rel="noopener noreferrer" className="contents">
              {picture}
            </a>
          ) : (
            picture
          )}
        </MediaFrame>
      );
    }

    case "positions": {
      // The two sides are people or their stances: coloured by position, teal first, purple
      // second, like every person on a slide (`personAccent`).
      const POSITION_ACCENT = {
        primary: { text: "text-primary", rule: "bg-primary/40", border: "border-primary/40" },
        secondary: {
          text: "text-secondary",
          rule: "bg-secondary/40",
          border: "border-secondary/40",
        },
      };

      const renderSide = (side: typeof block.left, index: number, alignRight = false) => {
        const a = POSITION_ACCENT[personAccent(index)];
        const numeral = String(index + 1).padStart(2, "0");
        return (
          <div
            className={`relative flex flex-col gap-8 ${alignRight ? "items-end text-right" : "items-start text-left"}`}
          >
            <div className="flex items-baseline gap-3">
              {!alignRight && (
                <span
                  className={`text-xs font-bold tracking-[0.25em] tabular-nums ${a.text} opacity-70`}
                >
                  {numeral}
                </span>
              )}
              {!alignRight && <span className={`h-px w-10 self-center ${a.rule}`} />}
              <span className={`label-caps text-sm ${a.text}`}>{side.name}</span>
              {alignRight && <span className={`h-px w-10 self-center ${a.rule}`} />}
              {alignRight && (
                <span
                  className={`text-xs font-bold tracking-[0.25em] tabular-nums ${a.text} opacity-70`}
                >
                  {numeral}
                </span>
              )}
            </div>

            <h3
              className={`font-heading text-8xl leading-[0.85] font-bold tracking-[-0.045em] lg:text-[8rem] ${a.text}`}
            >
              {/* A line breaks only between words: "All-in" never splits at its hyphen. */}
              {side.stance.split(" ").map((word, i) => (
                <Fragment key={i}>
                  {i > 0 && " "}
                  <span className="whitespace-nowrap">{word}</span>
                </Fragment>
              ))}
            </h3>

            <p
              className={`mt-2 font-heading text-2xl leading-snug font-medium text-text-muted italic md:text-3xl ${alignRight ? "border-r-2 pr-5" : "border-l-2 pl-5"} ${a.border}`}
            >
              {`“${side.quote}”`}
            </p>
          </div>
        );
      };

      return (
        <div className="mx-auto flex w-full max-w-7xl flex-col items-stretch gap-20">
          <div className="relative grid grid-cols-[1fr_auto_1fr] items-start gap-14 pt-4">
            {renderSide(block.left, 0, true)}

            <div
              aria-hidden="true"
              className="relative flex flex-col items-center self-stretch px-2"
            >
              <div className="w-px flex-1 bg-text-subtle/25" />
              <span className="my-4 text-6xl leading-none text-text-subtle/40 md:text-7xl">
                &amp;
              </span>
              <div className="w-px flex-1 bg-text-subtle/25" />
            </div>

            {renderSide(block.right, 1, false)}
          </div>

          {block.middle && (
            <p className="text-center text-lg text-text-subtle italic">{block.middle}</p>
          )}

          <div className="relative flex flex-col items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="h-px w-16 bg-text-subtle/25" />
              <span className="label-caps text-xs text-text-subtle">The verdict</span>
              <div className="h-px w-16 bg-text-subtle/25" />
            </div>
            <h2 className="max-w-4xl text-center text-4xl leading-[1.05] text-balance text-text md:text-5xl">
              {renderMarkdown(block.resolution)}
            </h2>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}

function CenteredContentSlide({ slide }: Props) {
  return (
    <SlideShell direction="col" overflowHidden night={isDeepDive(slide)}>
      <div className="slide-content relative z-10 flex flex-col items-center justify-center space-y-6 px-8 text-center md:space-y-8">
        {slide.sectionLabel && (
          <BlurFade delay={0.1} duration={0.4}>
            <p className="label-caps text-sm text-primary">{slide.sectionLabel}</p>
          </BlurFade>
        )}

        <BlurFade delay={0.2} duration={0.6}>
          <h1 className="max-w-5xl text-4xl text-text sm:text-5xl md:text-6xl">
            {renderMarkdown(slide.headline)}
          </h1>
        </BlurFade>

        {slide.subtitle && (
          <BlurFade delay={0.35} duration={0.5}>
            <p className="max-w-3xl text-xl leading-relaxed whitespace-pre-line text-text-muted sm:text-2xl md:text-3xl">
              {renderMarkdown(slide.subtitle)}
            </p>
          </BlurFade>
        )}

        {slide.content.map((block, i) => (
          <BlurFade key={i} delay={0.4 + i * 0.1} duration={0.5}>
            <ContentBlockRenderer block={block} centered />
          </BlurFade>
        ))}

        {slide.footer && (
          <BlurFade delay={0.5 + slide.content.length * 0.1} duration={0.5}>
            <p className="mx-auto max-w-4xl border-t border-border pt-5 text-lg text-text-muted">
              {renderMarkdown(slide.footer)}
            </p>
          </BlurFade>
        )}
      </div>
    </SlideShell>
  );
}

function StandardContentSlide({ slide }: Props) {
  const styles = getSectionStyle(slide.sectionTheme);
  const hasBars = slide.content.some((b) => b.type === "bars");
  const pictures = slide.content.filter((b) => MEDIA_BLOCKS.has(b.type)).length;

  return (
    <SlideShell night={isDeepDive(slide)}>
      <TitledContent>
        {/* The badge shares the section label's row, in the flow: placed absolutely in the corner,
            a long headline ran underneath it. */}
        <div className="flex items-start justify-between gap-8">
          <SectionHeader
            label={slide.sectionLabel}
            principle={slide.principle}
            pillColor={styles.pill}
            stageMarker={slide.stageMarker}
            stagePrefix={slide.stagePrefix}
          />
          {slide.badge && (
            <div className="label-caps flex shrink-0 items-baseline gap-2.5 rounded-full border border-primary/40 bg-white px-5 py-2 text-sm text-primary">
              <span className="hw-marker" />
              <span>{slide.badge}</span>
            </div>
          )}
        </div>

        <SlideTitle delay={0.15}>{renderMarkdown(slide.headline)}</SlideTitle>

        {slide.subtitle && (
          <SlideSubtitle delay={0.22}>{renderMarkdown(slide.subtitle)}</SlideSubtitle>
        )}

        <div className="slide-body">
          <div className={`slide-blocks space-y-6 ${pictures > 1 ? "slide-media-stack" : ""}`}>
            {slide.content.map((block, index) => (
              <BlurFade key={index} delay={0.2 + index * 0.1} duration={0.5}>
                <ContentBlockRenderer
                  block={block}
                  sectionTheme={slide.sectionTheme}
                  besideBars={hasBars}
                />
              </BlurFade>
            ))}
          </div>

          {slide.footer && (
            <BlurFade delay={0.3 + slide.content.length * 0.1} duration={0.5}>
              <p className={`mt-8 border-t-2 text-2xl text-text ${styles.border} pt-6`}>
                {renderMarkdown(slide.footer)}
              </p>
            </BlurFade>
          )}
        </div>
      </TitledContent>
    </SlideShell>
  );
}

export function ContentSlide({ slide }: Props) {
  if (slide.layout === "centered") {
    return <CenteredContentSlide slide={slide} />;
  }
  return <StandardContentSlide slide={slide} />;
}
