"use client";

import { renderMarkdown } from "../../lib/markdown";
import type { AgendaSlide as AgendaSlideType } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell } from "./SlideShell";
import { TitledContent, SlideTitle, SlideFooter } from "./primitives";

interface Props {
  slide: AgendaSlideType;
}

// Numbered items; where any item names a `when`, that column holds the times or dates instead of
// the numbers, as wide as the longest in the mono face, and a `when` repeated from the row above
// is left out.
export function AgendaSlide({ slide }: Props) {
  const items = slide.items.map((item) => (typeof item === "string" ? { title: item } : item));
  const timed = items.some((item) => item.when);
  const whenWidth = `${Math.max(...items.map((item) => item.when?.length ?? 0))}ch`;
  return (
    <SlideShell>
      <TitledContent>
        <SlideTitle>{slide.headline}</SlideTitle>
        <div className="slide-body">
          <ol className={`flex flex-col ${timed ? "gap-7" : "gap-6"}`}>
            {items.map((item, i) => (
              <BlurFade
                key={i}
                delay={0.15 + i * 0.04}
                duration={0.4}
                as="li"
                className={`flex items-baseline gap-4 md:gap-8 ${timed ? "max-md:flex-col max-md:gap-1" : ""}`}
              >
                {timed ? (
                  <span
                    className="shrink-0 font-mono text-xl font-bold text-primary empty:hidden md:text-3xl"
                    style={{ width: whenWidth }}
                  >
                    {item.when !== items[i - 1]?.when ? item.when : ""}
                  </span>
                ) : (
                  <span className="w-9 shrink-0 text-right font-mono text-2xl font-bold text-primary md:w-14 md:text-4xl">
                    {i + 1}.
                  </span>
                )}
                <span className="text-2xl text-text md:text-4xl">
                  {renderMarkdown(item.title)}
                  {item.text && (
                    <span className="mt-1 block text-xl text-text-muted md:text-2xl">
                      {renderMarkdown(item.text)}
                    </span>
                  )}
                </span>
              </BlurFade>
            ))}
          </ol>
          {slide.footer && <SlideFooter delay={0.3}>{renderMarkdown(slide.footer)}</SlideFooter>}
        </div>
      </TitledContent>
    </SlideShell>
  );
}
