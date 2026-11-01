"use client";

import { useEffect, useRef } from "react";
import { deckSync } from "../../lib/presenter-sync";

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

// Draws over text too. Option/Alt-drag highlights text and leaves it selected for copying,
// Escape clears the highlights;
// links and controls stay clickable.
const INTERACTIVE = "a, button, input, textarea, select, [contenteditable]";

export function LaserPointer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Point[]>([]);
  const isDrawingRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // In the speaker window the slide sits inert under the speaker view, whose notes and controls
    // keep their clicks and text selection.
    if (deckSync.role() !== "audience") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const laser = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-teal")
      .trim();

    const getCanvasPoint = (e: MouseEvent): Point => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const highlight = "highlights" in CSS ? new Highlight() : null;
    if (highlight) CSS.highlights.set(HIGHLIGHT_NAME, highlight);
    let isHighlighting = false;

    const startLoop = () => {
      if (animationFrameRef.current !== null) return;
      animationFrameRef.current = requestAnimationFrame(draw);
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const now = Date.now();

      strokesRef.current = strokesRef.current.filter(
        (stroke) => now - stroke.createdAt < FADE_DURATION,
      );

      strokesRef.current.forEach((stroke) => {
        const elapsed = now - stroke.createdAt;
        const opacity = Math.max(0, 1 - elapsed / FADE_DURATION);

        if (stroke.points.length > 1) {
          ctx.beginPath();
          ctx.strokeStyle = withAlpha(laser, opacity);
          ctx.lineWidth = LINE_WIDTH;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.shadowColor = withAlpha(laser, opacity * 0.6);
          ctx.shadowBlur = 10;

          ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      if (currentStrokeRef.current.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = laser;
        ctx.lineWidth = LINE_WIDTH;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = withAlpha(laser, 0.6);
        ctx.shadowBlur = 10;

        ctx.moveTo(currentStrokeRef.current[0].x, currentStrokeRef.current[0].y);
        for (let i = 1; i < currentStrokeRef.current.length; i++) {
          ctx.lineTo(currentStrokeRef.current[i].x, currentStrokeRef.current[i].y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      const isIdle = !isDrawingRef.current && strokesRef.current.length === 0;
      if (isIdle) {
        animationFrameRef.current = null;
      } else {
        animationFrameRef.current = requestAnimationFrame(draw);
      }
    };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const endStroke = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      document.body.style.userSelect = "";
      if (currentStrokeRef.current.length > 0) {
        strokesRef.current.push({ points: [...currentStrokeRef.current], createdAt: Date.now() });
        currentStrokeRef.current = [];
      }
    };

    // A button released outside the window sends no mouseup here: the next move without a button
    // held, or the window losing focus, ends the stroke instead.
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawingRef.current) return;
      if (e.buttons === 0) endStroke();
      else currentStrokeRef.current.push(getCanvasPoint(e));
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        if (e.altKey) {
          isHighlighting = highlight !== null;
          return;
        }
        const targetElement = document.elementFromPoint(e.clientX, e.clientY);
        if (targetElement?.closest(INTERACTIVE)) return;

        e.preventDefault();
        window.getSelection()?.removeAllRanges();
        document.body.style.userSelect = "none";
        isDrawingRef.current = true;
        currentStrokeRef.current = [getCanvasPoint(e)];
        startLoop();
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0 && isHighlighting) {
        isHighlighting = false;
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) {
          highlight?.add(selection.getRangeAt(0).cloneRange());
        }
        return;
      }
      if (e.button === 0) endStroke();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") highlight?.clear();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("blur", endStroke);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (highlight) CSS.highlights.delete(HIGHLIGHT_NAME);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("blur", endStroke);
      document.body.style.userSelect = "";
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50" aria-hidden="true">
      <style>{`::highlight(${HIGHLIGHT_NAME}) { background-color: color-mix(in srgb, var(--color-amber) 40%, transparent); }`}</style>
      <canvas ref={canvasRef} className="pointer-events-none h-full w-full" />
    </div>
  );
}
