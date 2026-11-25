"use client";

import { useContext } from "react";
import type { ComparisonGuidanceSlide, GuidanceExample } from "../../types/slide";
import { usePrintMode } from "../../lib/print-context";
import { useCarousel } from "../../lib/use-carousel";
import { usePhone } from "../../lib/use-progressive-reveal";
import { WORDS } from "../../lib/slide-utils";
import { BlurFade } from "../ui/blur-fade";
import { DeckLang } from "./SlideShell";
import { SlideCard } from "./primitives";

function GuidanceExamplePair({
  example,
  counter,
  labels,
}: {
  example: GuidanceExample;
  counter?: string;
  labels: { bad: string; good: string };
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl text-text">{example.title}</h2>
        {counter && <span className="text-base font-medium text-text-subtle">{counter}</span>}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <SlideCard tone="error" look="soft" className="card-pad-6">
          <p className="hw-label mb-3 [--hw-label-size:var(--text-sm)]" data-hue="red">
            {labels.bad}
          </p>
          <pre className="overflow-x-auto text-sm leading-relaxed whitespace-pre-wrap text-text-muted">
            {example.bad}
          </pre>
        </SlideCard>

        <SlideCard tone="success" look="soft" className="card-pad-6">
          <p className="hw-label mb-3 [--hw-label-size:var(--text-sm)]" data-hue="green">
            {labels.good}
          </p>
          <pre className="overflow-x-auto text-sm leading-relaxed whitespace-pre-wrap text-text-muted">
            {example.good}
          </pre>
        </SlideCard>
      </div>
    </div>
  );
}

function ExampleDots({ count, active }: { count: number; active: number }) {
  return (
    <div className="mt-6 flex justify-center gap-2">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={`h-2.5 w-2.5 transition-colors ${
            i === active ? "bg-primary" : "bg-primary-border"
          }`}
        />
      ))}
    </div>
  );
}

export function ComparisonGuidance({ slide }: { slide: ComparisonGuidanceSlide }) {
  const { intro, points, examples } = slide;
  const lang = useContext(DeckLang);
  // Print and a phone show every example; a screen steps through them.
  const printMode = usePrintMode();
  const phone = usePhone();
  const all = printMode || phone;
  const [activeExample] = useCarousel({ count: examples.length, enabled: !all });
  const renderExamples = all ? examples : examples.slice(activeExample, activeExample + 1);
  const showPager = !all && examples.length > 1;
  const counter = showPager ? `${activeExample + 1} / ${examples.length}` : undefined;

  return (
    <div className="w-full max-w-6xl self-start">
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
        <BlurFade key={all ? i : activeExample} delay={0.25} duration={0.5}>
          <GuidanceExamplePair example={example} counter={counter} labels={WORDS[lang]} />
        </BlurFade>
      ))}

      {showPager && <ExampleDots count={examples.length} active={activeExample} />}
    </div>
  );
}
