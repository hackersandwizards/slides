"use client";

import type { LanesSlide as LanesSlideType } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell } from "./SlideShell";
import { isDeepDive } from "../../lib/slide-utils";
import { SectionHeader } from "./SectionHeader";
import { highlightCode } from "../../lib/code-highlight";
import { renderMarkdown } from "../../lib/markdown";
import { TitledContent, SlideTitle, CodePanel } from "./primitives";

interface Props {
  slide: LanesSlideType;
}

export function LanesSlide({ slide }: Props) {
  return (
    <SlideShell night={isDeepDive(slide)}>
      <TitledContent>
        <SectionHeader label={slide.sectionLabel} principle={slide.principle} />

        <SlideTitle delay={0.15}>{slide.headline}</SlideTitle>
        <div className="slide-body">
          {slide.codeSnippet && (
            <BlurFade delay={0.2} duration={0.5}>
              <CodePanel as="pre" className="mb-8 p-6 [overflow-wrap:anywhere] whitespace-pre-wrap">
                <code className="font-code text-lg">
                  {highlightCode(slide.codeSnippet.code, slide.codeSnippet.language)}
                </code>
              </CodePanel>
            </BlurFade>
          )}

          <div className="space-y-4">
            {slide.lanes.map((lane, index) => {
              const isFirst = index === 0;

              return (
                <BlurFade key={index} delay={0.25 + index * 0.1} duration={0.5}>
                  <div
                    className={`flex flex-col items-start gap-3 rounded-brand border p-5 md:flex-row md:items-center md:gap-6 ${
                      isFirst
                        ? "border-secondary bg-secondary/7 opacity-100"
                        : "border-secondary/25 bg-white opacity-70"
                    }`}
                  >
                    <span
                      className={`shrink-0 font-mono text-base font-bold md:w-56 ${isFirst ? "text-secondary" : "text-text-muted"}`}
                    >
                      {lane.label}
                    </span>

                    <div className="flex flex-wrap items-center gap-3">
                      {lane.stages.map((stage, stageIndex) => (
                        <div key={stageIndex} className="flex items-center gap-3">
                          <div
                            className={`rounded-brand border px-4 py-2 text-base font-semibold ${
                              isFirst
                                ? "border-secondary/25 bg-white text-text"
                                : "border-secondary/25 bg-white text-text-muted"
                            }`}
                          >
                            {stage}
                          </div>
                          {stageIndex < lane.stages.length - 1 && (
                            <span
                              className={`text-xl ${isFirst ? "text-secondary" : "text-text-subtle"}`}
                            >
                              →
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </BlurFade>
              );
            })}
          </div>

          {slide.footer && (
            <BlurFade delay={0.3 + slide.lanes.length * 0.1} duration={0.5}>
              <p className="mt-10 text-xl text-text-muted">{renderMarkdown(slide.footer)}</p>
            </BlurFade>
          )}
        </div>
      </TitledContent>
    </SlideShell>
  );
}
