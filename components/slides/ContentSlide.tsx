"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "../ui/image";
import type {
  ContentSlide as ContentSlideType,
  ContentBlock,
  GalleryItem,
  SectionTheme,
} from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { SectionHeader } from "./SectionHeader";
import { Visual } from "./Visuals";
import { ComparisonSlide, Positions } from "./ComparisonSlide";
import { StatementSlide } from "./StatementSlide";
import { SlideShell, groundOf } from "./SlideShell";
import { renderMarkdown } from "../../lib/markdown";
import { CodeLines } from "../../lib/use-code-highlight";
import { getSectionStyle } from "../../lib/section-styles";
import {
  contentRedrawnAs,
  fourColumnAsCards,
  isDeepDive,
  isVideo,
  keepHyphenatedWords,
  labeledGridAsCards,
  pipelineAsFlow,
  TWO_COLUMN_TONES,
  type SideTone,
} from "../../lib/slide-utils";
import {
  LinkCaption,
  PictureLink,
  TitledContent,
  SlideTitle,
  SlideCard,
  CodePanel,
  SlideSubtitle,
  SlideFooter,
  DisplayHeading,
  type CardTone,
  VideoPlayer,
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
 *  stands small in an empty body, and its text is unreadable in the room. */
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

function GalleryFigure({ item, row }: { item: GalleryItem; row: boolean }) {
  const caption = item.caption && (
    <figcaption className="slide-media-caption text-center">
      {renderMarkdown(item.caption)}
    </figcaption>
  );
  const frame = "rounded-brand border border-border";
  if (isVideo(item))
    return (
      <figure className="m-0 flex min-w-0 flex-col gap-(--slide-media-gap) pb-10">
        <VideoPlayer
          src={item.src}
          poster={item.poster}
          alt={item.alt}
          className="h-auto max-h-(--slide-picture-max-media) w-full object-contain"
        />
        {caption}
      </figure>
    );
  const height = item.height ?? 300;
  return (
    <figure className="m-0 flex min-w-0 shrink flex-col items-center gap-(--slide-media-gap)">
      {row ? (
        <Image
          src={item.src}
          alt={item.alt ?? ""}
          width={400}
          height={height}
          style={{ maxHeight: `min(${height / 16}rem, var(--slide-picture-max-media))` }}
          className={`h-auto w-auto min-w-0 object-contain object-top ${frame}`}
        />
      ) : (
        <Image
          src={item.src}
          alt={item.alt ?? ""}
          width={1920}
          height={1080}
          className={`h-auto max-h-(--slide-picture-max-media) w-auto max-w-full ${frame}`}
        />
      )}
      {caption}
    </figure>
  );
}

// Tailwind sees each class whole.
const GALLERY_COLUMNS: Record<number, string> = { 2: "grid-cols-2", 3: "grid-cols-3" };

function Gallery({ block }: { block: Extract<ContentBlock, { type: "gallery" }> }) {
  const row = block.layout === "row";
  return (
    <div className="flex flex-col items-center gap-6">
      <div
        className={
          row
            ? // One bottom line, so the captions under pictures of different heights align; on a
              // phone the pictures stand one under another, as a grid's do.
              "flex items-end justify-center gap-3 max-md:flex-col max-md:items-center"
            : `grid w-full gap-6 ${GALLERY_COLUMNS[Math.min(block.items.length, 3)] ?? ""}`
        }
      >
        {block.items.map((item, i) => (
          <GalleryFigure key={i} item={item} row={row} />
        ))}
      </div>
      {block.tags && block.tags.length > 0 && (
        <div className="flex max-w-4xl flex-wrap justify-center gap-2">
          {block.tags.map((tag, i) => (
            <span key={i} className="hw-pill" data-variant="outline">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** How a two-column side draws its tone (`TWO_COLUMN_TONES`). */
const SIDE_STYLES: Record<SideTone, { card: CardTone; title: string; dot: string }> = {
  success: { card: "success", title: "text-green-dark", dot: "bg-green-dark" },
  error: { card: "error", title: "text-red", dot: "bg-red" },
  neutral: { card: "neutral", title: "text-text", dot: "" },
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

/** The info callout is the brand's purple callout; warning and success are the slide's own
 *  (exception `callout-status` in brand-elements.json). */
const CALLOUT_VARIANTS = {
  info: "hw-callout text-text",
  // On their tint the brand amber and green drop under 4.5:1 (4.29 and 4.27), so the text mixes
  // them 40% with ink, as the website's chips do.
  warning:
    "rounded-brand border-2 px-8 py-6 border-slide-accent/25 bg-slide-accent/7 text-(--slide-insight-ink)",
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
      // Body text at the list's size and measure, in ink, not a smaller muted paragraph.
      return (
        <p className="max-w-(--slide-measure-list) text-2xl leading-snug text-text">
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
                <div className="flex items-baseline gap-4 text-2xl text-text">
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
        <div
          className="overflow-x-auto rounded-brand border-2 border-border bg-white"
          data-hw-exception="slide-table"
        >
          {/* Automatic layout: `widths` are the columns' preferred shares, and no column ever gets
              narrower than its longest word. A fixed layout let a word run into the next cell. */}
          {/* The cells take the ink and the heads the step under the cells', set tight: in a lit
              hall and a 720p stream the label step and the muted grey wash out first, and the
              cells' own step for the heads widened a two-column table until its slide fell to
              0.79; the step under it holds 0.80. */}
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
                <tr className="bg-primary/7">
                  {block.headers.map((header, i) => (
                    <th
                      key={i}
                      className={`hw-label border-b-2 border-border py-3 text-left leading-tight ${block.compact ? "px-4 [--hw-label-size:var(--text-base)]" : "px-6 [--hw-label-size:var(--text-lg)]"}`}
                      data-tone="ink"
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
      const [left, right] = TWO_COLUMN_TONES[block.variant ?? "neutral"];
      const sides = [
        { data: block.left, style: SIDE_STYLES[left] },
        { data: block.right, style: SIDE_STYLES[right] },
      ] as const;

      return (
        <div className="grid grid-cols-2 gap-10">
          {sides.map(({ data, style }, i) => (
            <SlideCard key={i} tone={style.card} look="line" className="card-pad-7">
              {data.title && (
                <h2 className={`mb-5 card-title text-2xl ${style.title}`}>
                  {renderMarkdown(data.title)}
                </h2>
              )}
              {data.text && renderColumnContent(data.text)}
              {data.items && (
                <ul className="space-y-4">
                  {data.items.map((item, j) => (
                    <li key={j} className="flex items-baseline gap-3 text-xl text-text">
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
                <h2 className="hw-label mb-2 [--hw-label-size:var(--text-xl)]" data-hue="amber">
                  {section.title}
                </h2>
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
            <SlideCard key={i} className="flex items-baseline gap-4 text-base card-pad-3">
              <code className="hw-inline-code text-text">{hook.name}</code>
              <span className="text-lg text-text-muted">{hook.description}</span>
            </SlideCard>
          ))}
        </div>
      );

    case "pipeline":
      return <Visual block={pipelineAsFlow(block)} />;

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

    case "gallery":
      return <Gallery block={block} />;

    case "image-and-grid":
      return (
        <div className="grid grid-cols-[2fr_3fr] items-center gap-10">
          {block.image.sketch ? (
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
              <h2 className="hw-label mb-2 [--hw-label-size:var(--text-base)]" data-hue="purple">
                {renderMarkdown(block.gridTitle)}
              </h2>
            )}
            {block.items.map((item, i) => (
              <SlideCard key={i} tone="secondary" look="line" className="card-pad-4/6">
                <p className="mb-1 card-title text-xl text-text">{renderMarkdown(item.title)}</p>
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
        <MediaFrame below={block.href && <LinkCaption href={block.href} />}>
          {block.href ? <PictureLink href={block.href}>{picture}</PictureLink> : picture}
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
      <TitledContent titled={!!slide.headline}>
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
            <div
              className="hw-label hw-label-box shrink-0 items-baseline gap-2.5 [--hw-label-size:var(--text-sm)]"
              data-hue="teal"
            >
              <span className="hw-marker" />
              <span>{slide.badge}</span>
            </div>
          )}
        </div>

        {slide.headline && <SlideTitle delay={0.15}>{renderMarkdown(slide.headline)}</SlideTitle>}

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
            <SlideFooter border={styles.border} delay={0.3 + slide.content.length * 0.1}>
              {renderMarkdown(slide.footer)}
            </SlideFooter>
          )}
        </div>
      </TitledContent>
    </SlideShell>
  );
}

export function ContentSlide({ slide }: Props) {
  const redrawn = contentRedrawnAs(slide);
  if (redrawn?.type === "comparison") return <ComparisonSlide slide={redrawn} />;
  if (redrawn) return <StatementSlide slide={redrawn} />;
  if (slide.layout === "centered") return <CenteredContentSlide slide={slide} />;
  return <StandardContentSlide slide={slide} />;
}
