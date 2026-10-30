"use client";

import type { WheelSlide as WheelSlideType } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell } from "./SlideShell";
import { TitledContent, SlideTitle, SlideSubtitle } from "./primitives";

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

// Segments run clockwise from the top. Each label goes to the side its segment's centre lies on,
// top to bottom; a segment centred on the vertical axis goes to the shorter column. The PPTX
// exporter places them by the same rule.
function wheelSides(n: number) {
  const centres = Array.from({ length: n }, (_, k) => -90 + (360 * (k + 0.5)) / n);
  const cos = centres.map((a) => Math.cos((a * Math.PI) / 180));
  const right = cos.flatMap((c, k) => (c > 1e-6 ? [k] : []));
  const left = cos.flatMap((c, k) => (c < -1e-6 ? [k] : []));
  cos.forEach((c, k) => {
    if (Math.abs(c) <= 1e-6) (right.length <= left.length ? right : left).push(k);
  });
  const bySin = (a: number, b: number) =>
    Math.sin((centres[a] * Math.PI) / 180) - Math.sin((centres[b] * Math.PI) / 180);
  return { left: left.sort(bySin), right: right.sort(bySin), centres };
}

export function WheelSlide({ slide }: Props) {
  const n = slide.segments.length;
  const { left, right, centres } = wheelSides(n);

  const label = (k: number) => (
    <div key={k} className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-brand-sm bg-success text-sm font-bold text-white">
        {k + 1}
      </span>
      <div>
        <p className="text-lg leading-tight font-bold text-text">{slide.segments[k].title}</p>
        <p className="text-sm leading-snug text-text-muted">{slide.segments[k].text}</p>
      </div>
    </div>
  );

  return (
    <SlideShell background="bg-section-intro">
      <TitledContent>
        <SlideTitle>{slide.headline}</SlideTitle>
        {slide.subtitle && <SlideSubtitle>{slide.subtitle}</SlideSubtitle>}
        <div className="slide-body">
          <BlurFade delay={0.2} duration={0.5}>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-8">
              <div className="flex flex-col gap-6">{left.map(label)}</div>
              <div className="relative h-80 w-80">
                <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
                  {slide.segments.map((segment, k) => {
                    const from = -90 + (360 * k) / n + GAP;
                    const to = -90 + (360 * (k + 1)) / n - GAP;
                    const [x, y] = point((R_OUT + R_IN) / 2, centres[k]).split(" ");
                    return (
                      <g key={segment.title}>
                        <path d={arc(from, to)} className="fill-success" />
                        <text
                          x={x}
                          y={y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="fill-text text-[14px] font-bold"
                        >
                          {k + 1}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                <div className="absolute inset-[22%] flex items-center justify-center rounded-full bg-ink/5 p-3 text-center text-base leading-tight font-bold text-text">
                  {slide.center}
                </div>
              </div>
              <div className="flex flex-col gap-6">{right.map(label)}</div>
            </div>
          </BlurFade>

          {slide.caption && <p className="mt-4 text-base text-text-muted">{slide.caption}</p>}
        </div>
      </TitledContent>
    </SlideShell>
  );
}
