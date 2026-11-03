"use client";

import {
  Fragment,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import ArrowUpRight from "lucide-react/icons/arrow-up-right";
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
import { Positions } from "./ComparisonSlide";
import { StatementSlide } from "./StatementSlide";
import { SlideShell, groundOf } from "./SlideShell";
import { renderMarkdown } from "../../lib/markdown";
import { CodeLines } from "../../lib/use-code-highlight";
import { getStageClasses } from "../../lib/stage-utils";
import { getSectionStyle } from "../../lib/section-styles";
import {
  centeredAsStatement,
  fourColumnAsCards,
  isDeepDive,
  keepHyphenatedWords,
  labeledGridAsCards,
  linkLabel,
  pipelineAsFlow,
} from "../../lib/slide-utils";
import {
  TitledContent,
  SlideTitle,
  SlideCard,
  CodePanel,
  SlideSubtitle,
  DisplayHeading,
  type CardTone,
  VideoPlayer,
  DashedFrame,
} from "./primitives";

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
  return (
    <MediaFrame
      boxClassName="pb-10"
      below={
        block.caption && <figcaption className="slide-media-caption">{block.caption}</figcaption>
      }
    >
      <VideoPlayer
        src={block.src}
        poster={block.poster}
        alt={block.alt}
        className="slide-media-item"
      />
    </MediaFrame>
  );
}

const TWO_COL_VARIANTS: Record<
  string,
  Record<"left" | "right", { card: CardTone; title: string; dot: string }>
> = {
  "success-error": {
    left: {
      card: "success",
      title: "text-green-dark",
      dot: "bg-green-dark",
    },
    right: {
      card: "error",
      title: "text-red",
      dot: "bg-red",
    },
  },
  "error-success": {
    left: {
      card: "error",
      title: "text-red",
      dot: "bg-red",
    },
    right: {
      card: "success",
      title: "text-green-dark",
      dot: "bg-green-dark",
    },
  },
  error: {
    left: {
      card: "error",
      title: "text-red",
      dot: "bg-red",
    },
    right: {
      card: "error",
      title: "text-red",
      dot: "bg-red",
    },
  },
  "error-neutral": {
    left: {
      card: "error",
      title: "text-red",
      dot: "bg-red",
    },
    right: {
      card: "neutral",
      title: "text-text",
      dot: "",
    },
  },
  success: {
    left: {
      card: "success",
      title: "text-green-dark",
      dot: "bg-green-dark",
    },
    right: {
      card: "success",
      title: "text-green-dark",
      dot: "bg-green-dark",
    },
  },
  neutral: {
    left: {
      card: "neutral",
      title: "text-text",
      dot: "",
    },
    right: {
      card: "neutral",
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
        <code className="font-code">
          <CodeLines code={codeContent.replace(/\n$/, "")} language={language} />
        </code>
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
              <span className="text-2xl text-primary">
                {getPipelineArrow(i - 1, block.stages, block.showLoops)}
              </span>
            )}
            <div
              className={`pipeline-stage flex items-center gap-3 rounded-brand px-5 py-3 text-lg font-semibold ${getStageClasses(stage.state as StageState, !stage.state || stage.state === "default" ? "primary" : "secondary")}`}
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

/** The info callout is the brand's purple callout; warning and success are the slide's own
 *  (exception `callout-status` in brand-elements.json). */
const CALLOUT_VARIANTS = {
  info: "hw-callout text-text",
  // On their tint the brand amber and green drop under 4.5:1 (4.29 and 4.27), so the text mixes
  // them 40% with ink, as the website's chips do.
  warning:
    "rounded-brand border-2 px-8 py-6 border-accent/25 bg-accent/7 text-(--slide-insight-ink)",
  success:
    "rounded-brand border-2 px-8 py-6 border-green-dark/25 bg-green-dark/7 text-(--slide-success-ink)",
};

function ContentBlockRenderer({
  block,
  centered,
  sectionTheme,
}: {
  block: ContentBlock;
  centered?: boolean;
  sectionTheme?: SectionTheme;
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
        <p className="max-w-6xl text-xl leading-snug text-text-muted">
          {renderMarkdown(block.text)}
        </p>
      );

    case "bullets": {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List className="max-w-(--slide-measure-list) space-y-4">
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
          {/* The cells take the ink and the heads the step under the cells', set tight: in a lit
              hall and a 720p stream the label step and the muted grey washed out first (blind
              panel 02.11.; os docs/tracking/2026-11-03-table-legibility.md). The cells' own
              step for the heads widened a two-column table's first column until its slide fell
              to 0.79 in a consumer's deck; the step under it holds 0.80. */}
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
                      className={`label-caps border-b-2 border-border py-3 text-left leading-tight text-text ${block.compact ? "px-4 text-base" : "px-6 text-lg"}`}
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
                      className={`border-b border-border py-4 text-left text-text ${block.compact ? "px-4" : "px-6"} ${cellIndex === 0 ? "font-bold" : ""}`}
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
            <SlideCard key={i} tone={style.card} look="line" className="card-pad-7">
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
            </SlideCard>
          ))}
        </div>
      );
    }

    case "code":
      return (
        <CodePanel as="pre" className="p-6 [overflow-wrap:anywhere] whitespace-pre-wrap">
          <code className="font-code text-lg">
            <CodeLines code={block.code} language={block.language} />
          </code>
        </CodePanel>
      );

    case "code-and-text":
      return (
        <div className="grid grid-cols-2 gap-8">
          <CodePanel className="overflow-hidden">
            <pre className="p-6 text-base leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap">
              <code className="font-code">
                <CodeLines code={block.code} language={block.language} />
              </code>
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
            <SlideCard key={i} className="flex items-baseline gap-4 card-pad-3">
              <code className="rounded-brand-sm bg-primary/7 px-3 py-1 font-code text-base text-text">
                {hook.name}
              </code>
              <span className="text-lg text-text-muted">{hook.description}</span>
            </SlideCard>
          ))}
        </div>
      );

    case "pipeline": {
      // A pipeline flow can draw renders as the flow (decision merge-flow, 7.62 against 6.94).
      const flow = pipelineAsFlow(block);
      if (flow) return <Visual block={flow} />;
      // Teal frame, label, arrows and plain steps, as every other accent; purple marks only an
      // active or new step (blind panel 01.11.: 8.48 against 6.85 for the purple block).
      return (
        <DashedFrame tone="primary" active={!!block.containerLabel} className="p-6">
          {block.containerLabel && (
            <div className="label-caps mb-4 flex items-baseline gap-2 text-sm">
              <div className="hw-marker bg-primary" />
              <span className="text-primary">{block.containerLabel}</span>
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
                <div className="h-16 w-px bg-primary/25" />
                <ul className="space-y-1.5">
                  {block.containerSideNotes.map((note, ni) => (
                    <li key={ni} className="flex items-baseline gap-2 text-base text-text-muted">
                      <span className="hw-marker slide-marker-nested bg-primary" />
                      <span>{renderMarkdown(note)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          {block.containerFooter && (
            <p className="mt-4 border-t border-primary/25 pt-3 text-base text-text-muted">
              {renderMarkdown(block.containerFooter)}
            </p>
          )}
        </DashedFrame>
      );
    }

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
            <div className="relative min-h-(--slide-picture-max) self-stretch">
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
                className="h-auto max-h-(--slide-picture-max) w-auto rounded-brand border border-border"
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
              <SlideCard key={i} tone="secondary" look="line" className="card-pad-4/6">
                <p className="mb-1 text-xl font-bold text-text">{renderMarkdown(item.title)}</p>
                <p className="card-text-lg text-text">{renderMarkdown(item.subtitle)}</p>
              </SlideCard>
            ))}
          </div>
        </div>
      );

    case "video":
      return <VideoBlock block={block} />;

    case "callout":
      if (centered) {
        return (
          <SlideCard className="mx-auto max-w-3xl card-pad-5/8">
            <p className="text-lg leading-relaxed text-text-muted sm:text-xl md:text-2xl">
              {renderMarkdown(block.text)}
            </p>
          </SlideCard>
        );
      }
      return (
        <div
          className={`max-w-full ${block.fullWidth ? "w-full" : "w-fit"} ${CALLOUT_VARIANTS[block.variant ?? "info"]}`}
          data-hue={(block.variant ?? "info") === "info" ? "purple" : undefined}
          data-hw-exception={(block.variant ?? "info") === "info" ? undefined : "callout-status"}
        >
          <p className="text-xl leading-snug font-medium">{renderMarkdown(block.text)}</p>
        </div>
      );

    case "four-column":
      return <Visual block={fourColumnAsCards(block)} />;

    case "labeled-grid":
      return <Visual block={labeledGridAsCards(block)} />;

    case "terminal":
      return (
        <CodePanel className="mx-auto max-w-4xl overflow-hidden text-left">
          <div className="border-b border-white/15 px-6 py-3 font-mono text-xs text-(--code-comment)">
            terminal
          </div>
          <div className="space-y-2 px-6 py-5 font-mono text-lg leading-loose sm:text-xl">
            {block.commands.map((cmd, i) => (
              <BlurFade key={i} delay={0.3 + i * 0.15} duration={0.4}>
                <div>
                  <span
                    className={
                      cmd.prefix === "$"
                        ? "text-(--code-inserted)"
                        : cmd.prefix === "→"
                          ? "text-amber"
                          : "text-(--code-comment)"
                    }
                  >
                    {cmd.prefix}
                  </span>{" "}
                  <code>{cmd.text}</code>
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
                <ArrowUpRight className="size-(--slide-link-icon) shrink-0" strokeWidth={2.25} />
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

    case "positions":
      return <Positions block={block} />;

    default:
      return null;
  }
}

function CenteredContentSlide({ slide }: Props) {
  return (
    <SlideShell direction="col" overflowHidden ground={groundOf(slide)} night={isDeepDive(slide)}>
      <div className="slide-content relative z-10 flex flex-col items-center justify-center space-y-6 px-8 text-center md:space-y-8">
        {slide.sectionLabel && (
          <BlurFade delay={0.1} duration={0.4}>
            <p className="hw-label [--hw-label-size:var(--text-sm)]">{slide.sectionLabel}</p>
          </BlurFade>
        )}

        <BlurFade delay={0.2} duration={0.6}>
          <DisplayHeading size="md" className="max-w-5xl">
            {renderMarkdown(slide.headline)}
          </DisplayHeading>
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
  const pictures = slide.content.filter((b) => MEDIA_BLOCKS.has(b.type)).length;

  return (
    <SlideShell ground={groundOf(slide)} night={isDeepDive(slide)}>
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
                <ContentBlockRenderer block={block} sectionTheme={slide.sectionTheme} />
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
    const statement = centeredAsStatement(slide);
    if (statement) return <StatementSlide slide={statement} />;
    return <CenteredContentSlide slide={slide} />;
  }
  return <StandardContentSlide slide={slide} />;
}
