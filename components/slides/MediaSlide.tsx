"use client";

import type { MediaSlide as MediaSlideType } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { SectionHeader } from "./SectionHeader";
import { renderMarkdown } from "../../lib/markdown";
import { getSectionStyle } from "../../lib/section-styles";
import { SlideShell } from "./SlideShell";
import Image from "../ui/image";
import { SlideTitle } from "./primitives";

interface Props {
  slide: MediaSlideType;
}

function MediaItem({
  src,
  alt,
  kind,
  height,
}: {
  src: string;
  alt?: string;
  kind?: "image" | "video";
  height?: number;
}) {
  if (kind === "video") {
    return (
      <video
        src={src}
        controls
        aria-label={alt}
        className="h-auto max-h-[62vh] w-full rounded-brand border border-border bg-code-bg object-contain"
      />
    );
  }

  if (height) {
    return (
      <Image
        src={src}
        alt={alt ?? ""}
        width={400}
        height={height}
        style={{ maxHeight: `${height / 16}rem` }}
        className="h-auto w-auto min-w-0 shrink rounded-brand border border-border object-contain object-top"
      />
    );
  }

  // The frame is the picture's own edge, as on a content slide's linked image: a box wider or
  // taller than the picture left empty bands beside it.
  return (
    <Image
      src={src}
      alt={alt ?? ""}
      width={1920}
      height={1080}
      className="mx-auto h-auto max-h-[62vh] w-auto max-w-full rounded-brand border border-border"
      priority
    />
  );
}

export function MediaSlide({ slide }: Props) {
  const theme = getSectionStyle(slide.sectionTheme ?? "primary");
  const layout: "row" | "grid" | "single" =
    slide.layout === "row" ? "row" : slide.sources.length > 1 ? "grid" : "single";

  return (
    <SlideShell>
      <div className={`absolute inset-0 ${theme.gradient}`} />

      <div
        className={`slide-content relative z-10 flex flex-col justify-center px-16 py-12 ${slide.headline ? "slide-titled" : ""}`}
      >
        <SectionHeader
          label={slide.sectionLabel}
          labelColor={theme.label}
          principle={slide.principle}
        />

        {slide.headline && <SlideTitle delay={0.15}>{renderMarkdown(slide.headline)}</SlideTitle>}

        <div className="slide-body">
          {layout === "row" ? (
            <BlurFade delay={slide.headline ? 0.25 : 0.15} duration={0.6}>
              <div className="flex items-center justify-center gap-3">
                {slide.sources.map((source, index) => (
                  <MediaItem
                    key={index}
                    src={source.src}
                    alt={source.alt}
                    kind={source.kind}
                    height={source.height ?? 300}
                  />
                ))}
              </div>
            </BlurFade>
          ) : layout === "grid" ? (
            <div
              className={`grid gap-6 ${slide.sources.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}
            >
              {slide.sources.map((source, index) => (
                <BlurFade
                  key={index}
                  delay={(slide.headline ? 0.25 : 0.15) + index * 0.1}
                  duration={0.6}
                >
                  <MediaItem src={source.src} alt={source.alt} kind={source.kind} />
                </BlurFade>
              ))}
            </div>
          ) : slide.sources[0] ? (
            <BlurFade delay={slide.headline ? 0.25 : 0.15} duration={0.6}>
              <MediaItem
                src={slide.sources[0].src}
                alt={slide.sources[0].alt}
                kind={slide.sources[0].kind}
              />
            </BlurFade>
          ) : null}

          {slide.tags && slide.tags.length > 0 && (
            <BlurFade delay={0.4} duration={0.5}>
              <div className="mx-auto mt-6 flex max-w-4xl flex-wrap justify-center gap-2">
                {slide.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-border bg-white px-4 py-1.5 text-xs text-text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </BlurFade>
          )}
        </div>
      </div>
    </SlideShell>
  );
}
