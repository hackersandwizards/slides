"use client";

import type { GuidanceSlide as GuidanceSlideType } from "../../types/slide";
import { usePrintMode } from "../../lib/print-context";
import { useCarousel } from "../../lib/use-carousel";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell } from "./SlideShell";
import { SlideTitle, SlideCard } from "./primitives";

interface Props {
  slide: GuidanceSlideType;
}

export function GuidanceSlide({ slide }: Props) {
  const { headline, intro, points, examples } = slide;
  const printMode = usePrintMode();
  const [activeExample] = useCarousel({ count: examples.length, enabled: !printMode });

  const renderExamples = printMode ? examples : [examples[activeExample]];

  return (
    <SlideShell>
      <div
        className={`slide-content relative z-10 flex flex-col items-center justify-center px-16 ${headline ? "slide-titled" : ""}`}
      >
        {headline && (
          <SlideTitle as="h2" duration={0.6}>
            {headline}
          </SlideTitle>
        )}

        <div className="slide-body w-full max-w-6xl">
          {intro && (
            <BlurFade delay={0.15} duration={0.6}>
              <p className="mb-6 text-xl text-text-muted">{intro}</p>
            </BlurFade>
          )}

          {points && points.length > 0 && (
            <BlurFade delay={0.2} duration={0.6}>
              <ul className="mb-8 space-y-2">
                {points.map((point, i) => (
                  <li key={i} className="flex items-baseline gap-3 text-lg text-text-muted">
                    <span className="hw-marker" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </BlurFade>
          )}

          {renderExamples.map((example, i) => (
            <BlurFade key={printMode ? i : activeExample} delay={0.25} duration={0.5}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl text-text">{example.title}</h3>
                  {!printMode && examples.length > 1 && (
                    <span className="text-base font-medium text-text-subtle">
                      {activeExample + 1} / {examples.length}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <SlideCard tone="error" look="soft" className="p-6">
                    <p className="label-caps mb-3 text-sm text-error">Bad</p>
                    <pre className="overflow-x-auto text-sm leading-relaxed whitespace-pre-wrap text-text-muted">
                      {example.bad}
                    </pre>
                  </SlideCard>

                  <SlideCard tone="success" look="soft" className="p-6">
                    <p className="label-caps mb-3 text-sm text-(--slide-success-ink)">Good</p>
                    <pre className="overflow-x-auto text-sm leading-relaxed whitespace-pre-wrap text-text-muted">
                      {example.good}
                    </pre>
                  </SlideCard>
                </div>
              </div>
            </BlurFade>
          ))}

          {!printMode && examples.length > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              {examples.map((_, i) => (
                <div
                  key={i}
                  className={`h-2.5 w-2.5 transition-colors ${
                    i === activeExample ? "bg-primary" : "bg-primary-border"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </SlideShell>
  );
}
