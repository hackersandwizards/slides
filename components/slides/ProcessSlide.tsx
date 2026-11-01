"use client";

import { Fragment, type CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import type { ProcessSlide as ProcessSlideType } from "../../types/slide";
import { SlideShell } from "./SlideShell";
import { iconMap, type LucideIcon } from "../../lib/icons";
import { useProgressiveReveal } from "../../lib/use-progressive-reveal";
import { TitledContent, SlideTitle } from "./primitives";

interface Props {
  slide: ProcessSlideType;
}

const defaultIcons: LucideIcon[] = [
  iconMap.bot,
  iconMap.code,
  iconMap["shield-check"],
  iconMap.refresh,
];

// N nodes sit evenly around an ellipse from the top, clockwise, centred in the canvas so the top
// and bottom cards stay inside it. A loop of more than four renders every node rather than dropping
// the overflow.
const CENTER_X = 50;
const CENTER_Y = 50;
const RADIUS_X = 32;
const RADIUS_Y = 32;

// Canvas is 960×520 (in sixteenths of a rem, so it scales with the slide like its nodes do) for
// the common 4-node diamond. Loops with more nodes stack two cards per side and get a taller
// canvas, so the side cards don't collide: the percentage-based radii map to more pixels.
const CANVAS_W = 960;
const NODE_HALF_W = 120;
const NODE_HALF_H = 80;
function canvasHeight(count: number) {
  return count > 4 ? 640 : 520;
}

function nodePositions(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (-90 + (360 / count) * i) * (Math.PI / 180);
    return {
      x: CENTER_X + RADIUS_X * Math.cos(angle),
      y: CENTER_Y + RADIUS_Y * Math.sin(angle),
    };
  });
}

export function ProcessSlide({ slide }: Props) {
  const { revealedCount, footerVisible } = useProgressiveReveal({
    totalSteps: slide.nodes.length,
    hasFooter: !!slide.footer,
  });

  const positions = nodePositions(slide.nodes.length);
  const canvasH = canvasHeight(slide.nodes.length);

  // Close the loop: each node points to the next, the last back to the first.
  const arrowPaths = slide.nodes.map((_, i) => ({
    from: i,
    to: (i + 1) % slide.nodes.length,
  }));

  return (
    <SlideShell background={slide.background ?? "bg-section-intro"}>
      <TitledContent>
        <SlideTitle duration={0.6}>{slide.headline}</SlideTitle>

        <div className="slide-body items-center">
          <div className="flex w-full flex-col items-center gap-4">
            {/* Desktop: the steps in one row with a return line under it, so each card is wide
                enough for its text at the type scale. Delivered decks keep the circle (slides.css). */}
            <div className="process-row hidden w-full flex-col md:flex">
              <div className="flex items-stretch">
                {slide.nodes.map((node, index) => {
                  // Six and more cards leave a mono heading about ten characters a line: a size down
                  // and a narrower padding keep "Repository" and "Validation" off the card edges.
                  const dense = slide.nodes.length >= 6;
                  const isRevealed = index < revealedCount;
                  // The step being revealed, or the named phase; once every step shows, none stands
                  // out unless a phase is named.
                  const highlighted =
                    (index === revealedCount - 1 && revealedCount < slide.nodes.length) ||
                    node.title.toLowerCase() === slide.highlightPhase?.toLowerCase();
                  const Icon =
                    (node.icon ? iconMap[node.icon] : null) ?? defaultIcons[index] ?? iconMap.bot;
                  return (
                    <Fragment key={index}>
                      {index > 0 && (
                        <ArrowRight
                          className={`mx-2 h-10 w-10 shrink-0 self-center transition-colors duration-500 ${index < revealedCount ? "text-brand" : "text-primary-border"}`}
                          aria-hidden
                        />
                      )}
                      <div
                        className={`flex min-w-0 flex-1 flex-col items-center rounded-brand border bg-white ${dense ? "px-3" : "px-4"} py-6 text-center transition-all duration-500 ${
                          highlighted
                            ? "border-brand bg-brand/7"
                            : isRevealed
                              ? "border-border"
                              : "border-primary-border/40 opacity-40"
                        }`}
                      >
                        <span
                          className={`flex h-14 w-14 items-center justify-center rounded-full ${highlighted ? "bg-gradient-to-r from-brand to-brand-accent text-white" : "bg-brand/7 text-brand"}`}
                        >
                          <Icon className="h-7 w-7" aria-hidden />
                        </span>
                        <h3
                          className={`mt-3 font-heading ${dense ? "text-base" : "text-xl"} font-bold text-balance text-text`}
                        >
                          {node.title}
                        </h3>
                        <p className="card-text-base mt-2 leading-snug text-text-muted">
                          {node.description}
                        </p>
                      </div>
                    </Fragment>
                  );
                })}
              </div>
              {/* The return line: from under the last card's centre back to under the first's. A
                  card is the row less its arrows (3.5rem each: w-10 plus mx-2) over n, so its
                  centre sits half a card in; the line's 4px edges are centred on that point. */}
              <div
                className={`relative mx-[calc((100%-(var(--n)-1)*3.5rem)/(2*var(--n))-2px)] h-10 rounded-b-2xl border-x-4 border-b-4 transition-colors duration-500 ${revealedCount >= slide.nodes.length ? "border-brand" : "border-border"}`}
                style={{ "--n": slide.nodes.length } as CSSProperties}
                aria-hidden
              >
                <span
                  className={`absolute -top-3 left-[calc(-2px-0.6rem)] h-0 w-0 border-x-[0.6rem] border-b-[0.9rem] border-x-transparent transition-colors duration-500 ${revealedCount >= slide.nodes.length ? "border-b-brand" : "border-b-primary-border"}`}
                />
              </div>
            </div>
            <div
              className="process-canvas relative max-md:[zoom:0.44]"
              style={{ width: `${CANVAS_W / 16}rem`, height: `${canvasH / 16}rem` }}
            >
              <svg
                className="absolute inset-0 h-full w-full"
                viewBox={`0 0 ${CANVAS_W} ${canvasH}`}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="8"
                    refX="9"
                    refY="4"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 4, 0 8" className="fill-brand" />
                  </marker>
                  <marker
                    id="arrowhead-dim"
                    markerWidth="10"
                    markerHeight="8"
                    refX="9"
                    refY="4"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 4, 0 8" className="fill-primary-border" />
                  </marker>
                </defs>

                {arrowPaths.map((arrow, index) => {
                  const showArrow =
                    index < slide.nodes.length - 1
                      ? revealedCount > index + 1
                      : revealedCount >= slide.nodes.length;

                  const fromPos = positions[arrow.from];
                  const toPos = positions[arrow.to];
                  const fx = (fromPos.x / 100) * CANVAS_W;
                  const fy = (fromPos.y / 100) * canvasH;
                  const tx = (toPos.x / 100) * CANVAS_W;
                  const ty = (toPos.y / 100) * canvasH;

                  const dx = tx - fx;
                  const dy = ty - fy;
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  // Where the line leaves a card: the half-card box (a w-56 card, 224 units wide,
                  // plus a gap) hit along the line's direction, so arrows start at the card edge
                  // whatever the angle.
                  const edge = Math.min(
                    NODE_HALF_W / Math.abs(dx / dist || 1e-6),
                    NODE_HALF_H / Math.abs(dy / dist || 1e-6),
                  );
                  const sx = fx + (dx / dist) * edge;
                  const sy = fy + (dy / dist) * edge;
                  const ex = tx - (dx / dist) * edge;
                  const ey = ty - (dy / dist) * edge;

                  const mx = (sx + ex) / 2;
                  const my = (sy + ey) / 2;
                  const perpX = -(ey - sy) * 0.15;
                  const perpY = (ex - sx) * 0.15;
                  const cx = mx + perpX;
                  const cy = my + perpY;

                  return (
                    <path
                      key={index}
                      d={`M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`}
                      className={`transition-all duration-500 ${showArrow ? "stroke-brand" : "stroke-primary-border"}`}
                      strokeWidth={showArrow ? 2.5 : 1.5}
                      strokeDasharray={showArrow ? "none" : "6 4"}
                      markerEnd={showArrow ? "url(#arrowhead)" : "url(#arrowhead-dim)"}
                      opacity={showArrow ? 0.8 : 0.15}
                    />
                  );
                })}
              </svg>

              {slide.nodes.map((node, index) => {
                const pos = positions[index];
                const isRevealed = index < revealedCount;
                const isActive = index === revealedCount - 1;
                const isHighlightPhase = slide.highlightPhase
                  ? node.title.toLowerCase() === slide.highlightPhase.toLowerCase()
                  : false;
                const Icon =
                  (node.icon ? iconMap[node.icon] : null) ?? defaultIcons[index] ?? iconMap.bot;

                const highlighted = isActive || isHighlightPhase;

                return (
                  <div
                    key={index}
                    inert={!isRevealed}
                    className={`absolute transition-all duration-500 ${
                      isRevealed
                        ? "scale-100 opacity-100"
                        : "pointer-events-none scale-90 opacity-0"
                    }`}
                    style={{
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      transform: `translate(-50%, -50%) ${isRevealed ? "scale(1)" : "scale(0.9)"}`,
                    }}
                  >
                    <div
                      className={`relative flex w-56 flex-col items-center rounded-brand border p-5 text-center transition-all duration-500 ${
                        highlighted
                          ? "scale-105 border-brand"
                          : isRevealed
                            ? "border-border"
                            : "border-primary-border/40"
                      }`}
                    >
                      <div
                        className={`absolute inset-0 rounded-brand bg-white transition-opacity duration-500 ${
                          highlighted ? "opacity-0" : isRevealed ? "opacity-100" : "opacity-70"
                        }`}
                      />
                      <div
                        className={`absolute inset-0 rounded-brand bg-brand/7 transition-opacity duration-500 ${
                          highlighted ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      <div
                        className={`absolute inset-0 rounded-brand transition-opacity duration-500 ${
                          highlighted ? "opacity-100" : "opacity-0"
                        }`}
                      />

                      <div className="relative z-10 h-12 w-12 overflow-hidden rounded-full">
                        <div
                          className={`absolute inset-0 rounded-full transition-opacity duration-500 ${
                            highlighted
                              ? "opacity-0"
                              : isRevealed
                                ? "bg-brand/7 opacity-100"
                                : "bg-primary/7 opacity-40"
                          }`}
                        />
                        <div
                          className={`absolute inset-0 rounded-full bg-gradient-to-r from-brand to-brand-accent transition-opacity duration-500 ${
                            highlighted ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        <div className="relative z-10 flex h-full w-full items-center justify-center">
                          <Icon
                            className={`h-6 w-6 transition-colors duration-500 ${
                              highlighted
                                ? "text-white"
                                : isRevealed
                                  ? "text-brand"
                                  : "text-text-subtle"
                            }`}
                          />
                        </div>
                      </div>
                      <h3
                        className={`relative z-10 mt-3 font-heading text-lg font-bold transition-colors duration-500 ${
                          isRevealed ? "text-text" : "text-text-subtle"
                        }`}
                      >
                        {node.title}
                      </h3>
                      <p
                        className={`card-text-base relative z-10 mt-1.5 leading-snug transition-colors duration-500 ${
                          isRevealed ? "text-text-muted" : "text-text-subtle/70"
                        }`}
                      >
                        {node.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {slide.footer && (
              <div
                inert={!footerVisible}
                className={`w-full max-w-4xl transition-all duration-500 ${
                  footerVisible
                    ? "translate-y-0 opacity-100"
                    : "pointer-events-none translate-y-4 opacity-0"
                }`}
              >
                <div className="rounded-brand border border-border bg-brand-accent/7 px-8 py-4 text-center">
                  <p className="text-lg font-medium text-brand-accent">{slide.footer}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </TitledContent>
    </SlideShell>
  );
}
