"use client";

import Image from "../ui/image";
import type { StatementSlide as StatementSlideType } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell, groundOf } from "./SlideShell";
import { renderMarkdown } from "../../lib/markdown";
import { DisplayHeading } from "./primitives";

interface Props {
  slide: StatementSlideType;
}

function HighlightedLine({ line, highlighted }: { line: string; highlighted?: string }) {
  if (!highlighted || !line.includes(highlighted)) {
    return <>{line}</>;
  }

  const idx = line.indexOf(highlighted);
  const before = line.slice(0, idx);
  const after = line.slice(idx + highlighted.length);

  return (
    <>
      {before}
      <span className="text-gradient-brand">{highlighted}</span>
      {after}
    </>
  );
}

export function StatementSlide({ slide }: Props) {
  const hasSupporting = (slide.points && slide.points.length > 0) || slide.closing;
  const isSimple = !hasSupporting && !slide.subtitle && !slide.highlighted && !slide.crossedOut;
  const pointBaseDelay = 0.1 + slide.lines.length * 0.08;

  return (
    <SlideShell direction="col" overflowHidden ground={groundOf(slide)}>
      <div className="slide-content relative z-10 flex flex-col items-center justify-center px-16">
        {slide.imageSrc && (
          <BlurFade delay={0.05} duration={0.4}>
            <Image
              src={slide.imageSrc}
              alt={slide.imageAlt ?? ""}
              width={120}
              height={120}
              className="mb-8 h-28 w-28 rounded-full border-2 border-border object-cover"
            />
          </BlurFade>
        )}

        <div className={`text-center ${hasSupporting ? "mb-2" : ""}`}>
          {slide.crossedOut && (
            <BlurFade delay={0.05} duration={0.4}>
              <p className="mb-6 font-heading text-3xl text-text-subtle md:text-4xl">
                <s className="line-through decoration-text-subtle decoration-(length:--slide-rule-strong)">
                  {slide.crossedOut}
                </s>
              </p>
            </BlurFade>
          )}
          {/* A column of flex items, so one line's descender bleed never collapses into the next
              line's and opens a gap between them. */}
          <div className="flex flex-col">
            {slide.lines.map((line, index) => (
              <BlurFade key={index} delay={0.1 + index * 0.08} duration={0.4}>
                <DisplayHeading as="div" size={isSimple ? "xl" : "lg"}>
                  <HighlightedLine line={line} highlighted={slide.highlighted} />
                </DisplayHeading>
              </BlurFade>
            ))}
          </div>

          {slide.subtitle && (
            <BlurFade delay={0.1 + slide.lines.length * 0.08} duration={0.4}>
              {/* Sans in ink: since font-heading became the mono face, a multi-line subtitle set in
                  teal mono was the hardest text in a deck to read at a distance. */}
              <p className="mx-auto mt-8 max-w-5xl font-sans text-2xl leading-snug font-medium text-balance whitespace-pre-line text-text-muted sm:text-3xl md:text-4xl md:leading-snug">
                {renderMarkdown(slide.subtitle)}
              </p>
            </BlurFade>
          )}

          {slide.attribution && (
            <BlurFade delay={0.1 + slide.lines.length * 0.08} duration={0.4}>
              <p className="mt-8 text-xl text-text-muted md:text-2xl">— {slide.attribution}</p>
            </BlurFade>
          )}
        </div>

        {hasSupporting && (
          <div className="mt-10 w-full max-w-4xl">
            {slide.points && slide.points.length > 0 && (
              <div className="mx-auto mt-4 w-fit space-y-5">
                {slide.points.map((point, index) => (
                  <BlurFade key={index} delay={pointBaseDelay + index * 0.06} duration={0.4}>
                    <div className="flex items-baseline gap-5 text-left text-xl text-text-muted md:text-2xl">
                      <span className="shrink-0 font-heading text-2xl font-bold tracking-tight text-primary tabular-nums md:text-3xl">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="leading-snug">{renderMarkdown(point)}</span>
                    </div>
                  </BlurFade>
                ))}
              </div>
            )}

            {slide.closing && (
              <BlurFade
                delay={pointBaseDelay + (slide.points?.length ?? 0) * 0.06 + 0.05}
                duration={0.4}
              >
                {slide.closingStyle === "quote" ? (
                  <p className="mt-10 text-center text-2xl font-semibold tracking-tight text-text-subtle italic md:text-3xl">
                    <span className="text-primary/70">&ldquo;</span>
                    {renderMarkdown(slide.closing)}
                    <span className="text-primary/70">&rdquo;</span>
                  </p>
                ) : (
                  <p className="mt-10 text-center text-2xl font-semibold tracking-tight text-balance text-text md:text-3xl">
                    {renderMarkdown(slide.closing)}
                  </p>
                )}
              </BlurFade>
            )}
          </div>
        )}
      </div>
    </SlideShell>
  );
}
