"use client";

import type { ActivitySlide as ActivitySlideType } from "../../types/slide";
import { iconMap } from "../../lib/icons";
import { renderMarkdown } from "../../lib/markdown";
import { BlurFade } from "../ui/blur-fade";
import { SectionHeader } from "./SectionHeader";
import { SlideShell } from "./SlideShell";
import { SlideCard, SlideSubtitle, SlideTitle, TitledContent } from "./primitives";

interface Props {
  slide: ActivitySlideType;
}

const LABELS: Record<ActivitySlideType["kind"], string> = {
  exercise: "Hands-on",
  demo: "Live demo",
  debrief: "Debrief",
};

// The moment the room works instead of the slides: an exercise, a live demo or a debrief. The
// steps, watch points or questions run down the left, numbered except a demo's; the frame of the
// activity (time, who works with whom, what comes out) stands in one card on the right, each line
// under an icon rather than a word, so a German and an English deck read the same.
export function ActivitySlide({ slide }: Props) {
  const numbered = slide.kind !== "demo";
  const frame = [
    { icon: iconMap.timer, text: slide.duration, lead: true },
    { icon: iconMap.users, text: slide.mode },
    { icon: iconMap.target, text: slide.outcome },
  ].filter((line) => line.text);

  return (
    <SlideShell background="bg-section-intro">
      <TitledContent>
        <SectionHeader label={slide.label ?? LABELS[slide.kind]} />
        <SlideTitle delay={0.15}>{renderMarkdown(slide.headline)}</SlideTitle>
        {slide.task && <SlideSubtitle delay={0.22}>{renderMarkdown(slide.task)}</SlideSubtitle>}

        <div className="slide-body">
          {slide.prompt && (
            <BlurFade delay={0.24} duration={0.4}>
              <p className="mb-10 rounded-brand border border-primary/40 bg-primary/7 px-9 py-6 text-3xl font-medium text-text">
                {renderMarkdown(slide.prompt)}
              </p>
            </BlurFade>
          )}
          <div className="flex flex-col gap-10 md:flex-row md:items-start md:gap-16">
            <ol className="flex flex-1 flex-col gap-6">
              {slide.items.map((item, i) => (
                <BlurFade key={i} delay={0.25 + i * 0.05} duration={0.4}>
                  <li className="flex items-baseline gap-5 text-2xl text-text md:text-3xl">
                    {numbered ? (
                      <span className="w-10 shrink-0 font-semibold text-primary tabular-nums">
                        {i + 1}.
                      </span>
                    ) : (
                      <span className="hw-marker" />
                    )}
                    <span>{renderMarkdown(item)}</span>
                  </li>
                </BlurFade>
              ))}
            </ol>
            {frame.length > 0 && (
              <BlurFade delay={0.3} duration={0.4} className="md:w-[34%] md:shrink-0">
                <SlideCard className="flex flex-col gap-6 px-9 py-8">
                  {frame.map(({ icon: Icon, text, lead }, i) => (
                    <div key={i} className="flex items-baseline gap-4">
                      <Icon className="h-7 w-7 shrink-0 translate-y-1 text-primary" aria-hidden />
                      <span
                        className={
                          lead
                            ? "font-mono text-4xl font-bold text-text"
                            : "text-2xl text-text-muted"
                        }
                      >
                        {renderMarkdown(text!)}
                      </span>
                    </div>
                  ))}
                </SlideCard>
              </BlurFade>
            )}
          </div>
        </div>
      </TitledContent>
    </SlideShell>
  );
}
