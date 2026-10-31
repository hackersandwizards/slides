"use client";

import Image from "../ui/image";
import type { StatementSlide as StatementSlideType } from "../../types/slide";
import { Particles } from "../ui/particles";
import { BRAND_HEX } from "../../lib/theme";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell } from "./SlideShell";
import { renderMarkdown } from "../../lib/markdown";

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
    <SlideShell direction="col" overflowHidden background={slide.background ?? "bg-section-intro"}>
      <div
        className="absolute top-1/4 left-1/4 h-[37.5rem] w-[37.5rem] rounded-full bg-primary/7 blur-[120px]"
        aria-hidden="true"
      />
      <div
        className="absolute right-1/4 bottom-1/4 h-[31.25rem] w-[31.25rem] rounded-full bg-secondary/7 blur-[100px]"
        aria-hidden="true"
      />

      <Particles
        className="absolute inset-0"
        quantity={80}
        size={1.0}
        staticity={25}
        color={BRAND_HEX}
      />

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

        {/* ── Hero block: lines + subtitle ── */}
        <div className={`text-center ${hasSupporting ? "mb-2" : ""}`}>
          {slide.lines.map((line, index) => (
            <BlurFade key={index} delay={0.1 + index * 0.08} duration={0.4}>
              <div
                className={`font-heading leading-[1.05] font-bold tracking-[-0.03em] text-balance text-text ${
                  isSimple ? "text-7xl md:text-8xl" : "text-6xl md:text-7xl"
                }`}
              >
                <HighlightedLine line={line} highlighted={slide.highlighted} />
              </div>
            </BlurFade>
          ))}

          {slide.subtitle && (
            <BlurFade delay={0.1 + slide.lines.length * 0.08} duration={0.4}>
              {/* Sans in ink: since font-heading became the mono face, a multi-line subtitle set in
                  teal mono was the hardest text in a deck to read at a distance. */}
              <p className="mx-auto mt-8 max-w-5xl font-sans text-2xl leading-snug font-medium text-balance whitespace-pre-line text-text-muted sm:text-3xl md:text-4xl md:leading-snug">
                {renderMarkdown(slide.subtitle)}
              </p>
            </BlurFade>
          )}

          {slide.crossedOut && (
            <BlurFade delay={0.15 + slide.lines.length * 0.08} duration={0.4}>
              <p className="mt-10 text-3xl text-text-subtle line-through decoration-warning decoration-[6px] sm:text-4xl md:text-5xl">
                {slide.crossedOut}
              </p>
            </BlurFade>
          )}

          {slide.attribution && (
            <BlurFade delay={0.1 + slide.lines.length * 0.08} duration={0.4}>
              <p className="mt-8 text-xl text-text-muted md:text-2xl">— {slide.attribution}</p>
            </BlurFade>
          )}
        </div>

        {/* ── Supporting content: points + closing ── */}
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
