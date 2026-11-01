"use client";

import type { ProcessSlide as ProcessSlideType } from "../../types/slide";
import { SlideShell } from "./SlideShell";
import { iconMap, type LucideIcon } from "../../lib/icons";
import { useProgressiveReveal } from "../../lib/use-progressive-reveal";
import { TitledContent, SlideTitle, SlideCaption } from "./primitives";
import { FlowSteps } from "./Visuals";

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
  const loop = slide.loop !== false;
  const { revealedCount, footerVisible } = useProgressiveReveal({
    totalSteps: slide.nodes.length,
    startFull: !!slide.static,
    hasFooter: !!slide.footer,
  });

  // The named phase stays lit once every step shows; while stepping, the step just revealed is.
  const named = slide.nodes.findIndex(
    (node) => node.title.toLowerCase() === slide.highlightPhase?.toLowerCase(),
  );
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
          <div className="flex w-full flex-col items-center gap-10">
            {/* Desktop and print: the steps on one line as the flow block draws them, the loop
                back above. Phones keep the circle (slides.css). */}
            <div className={`w-full ${loop ? "hidden md:block" : ""}`}>
              <FlowSteps
                steps={slide.nodes.map((node) => ({
                  title: node.title,
                  text: node.description || undefined,
                  icon: node.icon ?? undefined,
                  label: node.label,
                  subtitle: node.subtitle || undefined,
                  badge: node.badge,
                  dim: node.dimmed,
                }))}
                highlight={revealedCount < slide.nodes.length ? revealedCount - 1 : named}
                loop={loop ? "" : undefined}
                revealed={revealedCount}
              />
            </div>
            {loop && (
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

                        <div className="relative z-10 h-12 w-12 overflow-hidden rounded-brand-sm">
                          <div
                            className={`absolute inset-0 transition-opacity duration-500 ${
                              highlighted
                                ? "opacity-0"
                                : isRevealed
                                  ? "bg-brand/7 opacity-100"
                                  : "bg-primary/7 opacity-40"
                            }`}
                          />
                          <div
                            className={`absolute inset-0 bg-gradient-to-r from-brand to-brand-accent transition-opacity duration-500 ${
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
            )}

            {slide.footer && <SlideCaption visible={footerVisible}>{slide.footer}</SlideCaption>}
          </div>
        </div>
      </TitledContent>
    </SlideShell>
  );
}
