"use client";

import { useEffect, useRef, type RefObject } from "react";
import { deckSync } from "../../lib/presenter-sync";
import { dialogOpen } from "../../lib/slide-input";

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  createdAt: number;
}

const FADE_DURATION = 2000;
/** The brand teal at an opacity, as an 8-digit hex: a canvas reads no custom property, so the
 *  colour is read off the page's tokens once. */
const withAlpha = (hex: string, alpha: number) =>
  hex +
  Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
const LINE_WIDTH = 4;
const HIGHLIGHT_NAME = "slide-marker";

// Draws over text too, while links and controls stay clickable; Option/Alt-drag highlights text
// and leaves it selected for copying, Escape clears the highlights.
const INTERACTIVE = "a, button, input, textarea, select, [contenteditable]";

// The teal of what the stroke starts on: night sets its own under `[data-hw-night]`, never on
// the root.
const tealOf = (element: Element) =>
  getComputedStyle(element).getPropertyValue("--color-teal").trim();

function canvasPoint(canvas: HTMLCanvasElement, event: MouseEvent): Point {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function drawLaserStroke(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
  style: { strokeColor: string; shadowColor: string },
) {
  if (points.length <= 1) return;
  ctx.beginPath();
  ctx.strokeStyle = style.strokeColor;
  ctx.lineWidth = LINE_WIDTH;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = style.shadowColor;
  ctx.shadowBlur = 10;
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function createLaserTrail(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  let strokes: Stroke[] = [];
  let current: Point[] = [];
  let drawing = false;
  let color = tealOf(document.documentElement);
  let frameId: number | null = null;

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const now = Date.now();
    strokes = strokes.filter((stroke) => now - stroke.createdAt < FADE_DURATION);
    for (const stroke of strokes) {
      const opacity = Math.max(0, 1 - (now - stroke.createdAt) / FADE_DURATION);
      drawLaserStroke(ctx, stroke.points, {
        strokeColor: withAlpha(color, opacity),
        shadowColor: withAlpha(color, opacity * 0.6),
      });
    }
    drawLaserStroke(ctx, current, { strokeColor: color, shadowColor: withAlpha(color, 0.6) });
    frameId = !drawing && strokes.length === 0 ? null : requestAnimationFrame(draw);
  };

  return {
    isDrawing: () => drawing,
    recolor(next: string) {
      color = next;
    },
    begin(point: Point) {
      drawing = true;
      current = [point];
      if (frameId === null) frameId = requestAnimationFrame(draw);
    },
    extend(point: Point) {
      current.push(point);
    },
    finish() {
      if (!drawing) return false;
      drawing = false;
      if (current.length > 0) {
        strokes.push({ points: [...current], createdAt: Date.now() });
        current = [];
      }
      return true;
    },
    dispose() {
      if (frameId !== null) cancelAnimationFrame(frameId);
    },
  };
}

function trackCanvasViewport(canvas: HTMLCanvasElement) {
  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener("resize", resize);
  return () => window.removeEventListener("resize", resize);
}

function enableTextHighlight() {
  if (!("highlights" in CSS)) return;
  const highlight = new Highlight();
  CSS.highlights.set(HIGHLIGHT_NAME, highlight);
  let highlighting = false;

  const onMouseDown = (e: MouseEvent) => {
    if (!dialogOpen() && e.button === 0 && e.altKey) highlighting = true;
  };
  const onMouseUp = (e: MouseEvent) => {
    if (e.button !== 0 || !highlighting) return;
    highlighting = false;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) highlight.add(selection.getRangeAt(0).cloneRange());
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") highlight.clear();
  };

  window.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);
  window.addEventListener("keydown", onKeyDown);
  return () => {
    CSS.highlights.delete(HIGHLIGHT_NAME);
    window.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("mouseup", onMouseUp);
    window.removeEventListener("keydown", onKeyDown);
  };
}

function listenForLaserStrokes(
  canvas: HTMLCanvasElement,
  trail: ReturnType<typeof createLaserTrail>,
) {
  const endStroke = () => {
    if (trail.finish()) document.body.style.userSelect = "";
  };
  // A button released outside the window sends no mouseup here: the next move without a button
  // held, or the window losing focus, ends the stroke instead.
  const onMouseMove = (e: MouseEvent) => {
    if (!trail.isDrawing()) return;
    if (e.buttons === 0) endStroke();
    else trail.extend(canvasPoint(canvas, e));
  };
  const onMouseDown = (e: MouseEvent) => {
    if (dialogOpen() || e.button !== 0 || e.altKey) return;
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (target?.closest(INTERACTIVE)) return;
    if (target) trail.recolor(tealOf(target));
    e.preventDefault();
    window.getSelection()?.removeAllRanges();
    document.body.style.userSelect = "none";
    trail.begin(canvasPoint(canvas, e));
  };
  const onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) endStroke();
  };

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);
  window.addEventListener("blur", endStroke);
  return () => {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("mouseup", onMouseUp);
    window.removeEventListener("blur", endStroke);
    document.body.style.userSelect = "";
  };
}

function useLaserCanvas(canvasRef: RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    // In the speaker window the slide sits inert under the speaker view, whose notes and controls
    // keep their clicks and text selection.
    if (deckSync.role() !== "audience") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const trail = createLaserTrail(canvas, ctx);
    const stopResize = trackCanvasViewport(canvas);
    const stopHighlight = enableTextHighlight();
    const stopStrokes = listenForLaserStrokes(canvas, trail);
    return () => {
      stopHighlight?.();
      stopResize();
      stopStrokes();
      trail.dispose();
    };
  }, [canvasRef]);
}

export function LaserPointer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useLaserCanvas(canvasRef);

  return (
    <div className="pointer-events-none fixed inset-0 z-50" aria-hidden="true">
      <style>{`::highlight(${HIGHLIGHT_NAME}) { background-color: color-mix(in srgb, var(--color-amber) 40%, transparent); }`}</style>
      <canvas ref={canvasRef} className="pointer-events-none h-full w-full" />
    </div>
  );
}
