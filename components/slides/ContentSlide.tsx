"use client";

import type { ReactNode } from "react";
import type {
  ContentSlide as ContentSlideType,
  ContentBlock,
  SectionTheme,
  VisualBlock,
} from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { SectionHeader } from "./SectionHeader";
import { Visual } from "./Visuals";
import { ComparisonSlide, Positions } from "./ComparisonSlide";
import { StatementSlide } from "./StatementSlide";
import { SlideShell, groundOf } from "./SlideShell";
import { renderMarkdown } from "../../lib/markdown";
import { getSectionStyle } from "../../lib/section-styles";
import {
  contentRedrawnAs,
  fourColumnAsCards,
  isDeepDive,
  labeledGridAsCards,
  pipelineAsFlow,
} from "../../lib/slide-utils";
import {
  TitledContent,
  SlideTitle,
  SlideSubtitle,
  SlideFooter,
  DisplayHeading,
  Quote,
} from "./primitives";
import { TableBlock } from "./TableBlock";
import {
  GalleryBlock,
  ImageAndGridBlock,
  ImageBlock,
  ImageStepsBlock,
  LinkedImageBlock,
  VideoBlock,
} from "./ContentMedia";
import {
  BulletsBlock,
  CalloutBlock,
  HooksBlock,
  ParagraphBlock,
  TwoColumnBlock,
} from "./ContentTextBlocks";
import { CodeAndTextBlock, CodeBlock, TerminalBlock } from "./ContentCodeBlocks";

interface Props {
  slide: ContentSlideType;
}

interface BlockContext {
  centered?: boolean;
  sectionTheme?: SectionTheme;
}

type BlockRendererMap = {
  [K in ContentBlock["type"]]: (
    block: Extract<ContentBlock, { type: K }>,
    context: BlockContext,
  ) => ReactNode;
};

const MEDIA_BLOCKS = new Set(["image", "image-steps", "video", "linked-image"]);

const renderVisual = (block: VisualBlock) => <Visual block={block} />;

const BLOCK_RENDERERS: BlockRendererMap = {
  flow: renderVisual,
  layers: renderVisual,
  timeline: renderVisual,
  transform: renderVisual,
  bars: renderVisual,
  numbers: renderVisual,
  annotated: renderVisual,
  "annotated-code": renderVisual,
  cards: renderVisual,
  paragraph: (block, { centered, sectionTheme }) => (
    <ParagraphBlock block={block} centered={centered} sectionTheme={sectionTheme} />
  ),
  bullets: (block) => <BulletsBlock block={block} />,
  table: (block) => <TableBlock block={block} />,
  "image-steps": (block) => <ImageStepsBlock block={block} />,
  "two-column": (block) => <TwoColumnBlock block={block} />,
  code: (block) => <CodeBlock block={block} />,
  "code-and-text": (block) => <CodeAndTextBlock block={block} />,
  hooks: (block) => <HooksBlock block={block} />,
  pipeline: (block) => <Visual block={pipelineAsFlow(block)} />,
  image: (block) => <ImageBlock block={block} />,
  gallery: (block) => <GalleryBlock block={block} />,
  "image-and-grid": (block) => <ImageAndGridBlock block={block} />,
  video: (block) => <VideoBlock block={block} />,
  quote: (block) => <Quote text={block.text} source={block.source} />,
  callout: (block, { centered }) => <CalloutBlock block={block} centered={centered} />,
  "four-column": (block) => <Visual block={fourColumnAsCards(block)} />,
  "labeled-grid": (block) => <Visual block={labeledGridAsCards(block)} />,
  terminal: (block) => <TerminalBlock block={block} />,
  "linked-image": (block) => <LinkedImageBlock block={block} />,
  positions: (block) => <Positions block={block} />,
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
  if (!Object.hasOwn(BLOCK_RENDERERS, block.type)) return null;
  const render = BLOCK_RENDERERS[block.type] as (
    block: ContentBlock,
    context: BlockContext,
  ) => ReactNode;
  return render(block, { centered, sectionTheme });
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
