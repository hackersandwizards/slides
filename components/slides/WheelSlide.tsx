"use client";

import type { WheelSlide as WheelSlideType } from "../../types/slide";
import { wheelLabelColumns, wheelSegmentAngle } from "../../lib/wheel-layout";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell } from "./SlideShell";
import { SectionHeader } from "./SectionHeader";
import { TitledContent, SlideTitle, SlideSubtitle, NumberTile } from "./primitives";

interface Props {
  slide: WheelSlideType;
}

const R_OUT = 96;
const R_IN = 60;
const GAP = 1.5; // degrees left open on each side of a segment

function point(r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return `${(100 + r * Math.cos(a)).toFixed(2)} ${(100 + r * Math.sin(a)).toFixed(2)}`;
}

function arc(from: number, to: number) {
  const large = to - from > 180 ? 1 : 0;
  return `M ${point(R_OUT, from)} A ${R_OUT} ${R_OUT} 0 ${large} 1 ${point(R_OUT, to)} L ${point(R_IN, to)} A ${R_IN} ${R_IN} 0 ${large} 0 ${point(R_IN, from)} Z`;
}

export function WheelSlide({ slide }: Props) {
  const count = slide.segments.length;
  const centres = Array.from({ length: count }, (_, index) => wheelSegmentAngle(count, index));
  const { left, right } = wheelLabelColumns(centres);

  return (
    <SlideShell>
      <TitledContent>
        <SectionHeader label={slide.sectionLabel} />
        <SlideTitle>{slide.headline}</SlideTitle>
        {slide.subtitle && <SlideSubtitle>{slide.subtitle}</SlideSubtitle>}
        <div className="slide-body">
          <BlurFade delay={0.2} duration={0.5}>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-8">
              {/* Both columns sit against the ring, so the left one keeps the right one's gap. */}
              <div className="flex flex-col gap-7 justify-self-end">
                {left.map((index) => (
                  <WheelSegmentDescription
                    key={index}
                    segment={slide.segments[index]}
                    index={index}
                  />
                ))}
              </div>
              {/* As wide as its column allows, so a phone's narrower row keeps the ring on the screen. */}
              <WheelDiagram segments={slide.segments} center={slide.center} />
              <div className="flex flex-col gap-7">
                {right.map((index) => (
                  <WheelSegmentDescription
                    key={index}
                    segment={slide.segments[index]}
                    index={index}
                  />
                ))}
              </div>
            </div>
          </BlurFade>

          {slide.caption && <p className="mt-4 text-base text-text-muted">{slide.caption}</p>}
        </div>
      </TitledContent>
    </SlideShell>
  );
}

function WheelDiagram({ segments, center }: Pick<WheelSlideType, "segments" | "center">) {
  const n = segments.length;
  return (
    <div className="relative aspect-square w-96 max-w-full">
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
        {segments.map((segment, k) => {
          const from = -90 + (360 * k) / n + GAP;
          const to = -90 + (360 * (k + 1)) / n - GAP;
          const [x, y] = point((R_OUT + R_IN) / 2, wheelSegmentAngle(n, k)).split(" ");
          return (
            <g key={segment.title}>
              <path d={arc(from, to)} className="fill-primary/40" />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-text text-(length:--slide-wheel-label) font-bold"
              >
                {k + 1}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="absolute inset-(--slide-wheel-hub) flex items-center justify-center rounded-full bg-ink/7 p-4 text-center text-base leading-tight font-bold text-text">
        {center}
      </div>
    </div>
  );
}

function WheelSegmentDescription({
  segment,
  index,
}: {
  segment: WheelSlideType["segments"][number];
  index: number;
}) {
  return (
    <div className="flex gap-3">
      <NumberTile size="sm">{index + 1}</NumberTile>
      <div>
        <p className="card-title text-xl leading-tight text-text">{segment.title}</p>
        <p className="mt-1 text-base leading-snug text-text-muted">{segment.text}</p>
      </div>
    </div>
  );
}
