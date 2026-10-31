"use client";
/* eslint-disable react-hooks/immutability -- the effect events call helpers declared below them;
   they run after render, when those exist. */

import React, { useEffect, useEffectEvent, useRef } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { usePrintMode } from "../../lib/print-context";

interface ParticlesProps extends ComponentPropsWithoutRef<"div"> {
  className?: string;
  quantity?: number;
  staticity?: number;
  ease?: number;
  size?: number;
  /** A CSS colour, or the name of a custom property holding one (`--color-teal`); white by default. */
  color?: string;
}

type Circle = {
  x: number;
  y: number;
  translateX: number;
  translateY: number;
  size: number;
  alpha: number;
  targetAlpha: number;
  magnetism: number;
};

export const Particles: React.FC<ParticlesProps> = ({
  className = "",
  quantity = 100,
  staticity = 50,
  ease = 50,
  size = 0.4,
  color,
  ...props
}) => {
  const printMode = usePrintMode();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const context = useRef<CanvasRenderingContext2D | null>(null);
  const fill = useRef("white");
  const circles = useRef<Circle[]>([]);
  const mouse = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasSize = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const dpr = useRef(typeof window !== "undefined" ? window.devicePixelRatio : 1);
  const rafID = useRef<number | null>(null);
  const resizeTimeout = useRef<NodeJS.Timeout | null>(null);

  // The effect reaches the helpers below through effect events, which call this render's copy.
  const onResize = useEffectEvent(() => resizeCanvas());
  const onDrawStatic = useEffectEvent(() => drawStatic());
  const onAnimate = useEffectEvent(() => animate());

  useEffect(() => {
    if (printMode) return;
    if (canvasRef.current) {
      context.current = canvasRef.current.getContext("2d");
      // A canvas does not resolve var(): the property is read off the canvas, theme included.
      fill.current = color?.startsWith("--")
        ? getComputedStyle(canvasRef.current).getPropertyValue(color).trim() || "white"
        : (color ?? "white");
    }
    onResize();

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      onDrawStatic();
    } else {
      onAnimate();
    }

    const handleResize = () => {
      if (resizeTimeout.current) {
        clearTimeout(resizeTimeout.current);
      }
      resizeTimeout.current = setTimeout(() => {
        onResize();
        // The new field starts transparent: draw it, or fade it in again.
        if (reducedMotion) onDrawStatic();
        else if (!document.hidden && rafID.current == null) onAnimate();
      }, 200);
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const { w, h } = canvasSize.current;
        const x = event.clientX - rect.left - w / 2;
        const y = event.clientY - rect.top - h / 2;
        const inside = x < w / 2 && x > -w / 2 && y < h / 2 && y > -h / 2;
        if (inside) {
          mouse.current.x = x;
          mouse.current.y = y;
          if (!reducedMotion && !document.hidden && rafID.current == null) onAnimate();
        }
      }
    };

    // Stop the 60fps loop while the tab is backgrounded; resume on return.
    const handleVisibility = () => {
      if (reducedMotion) return;
      if (document.hidden) {
        if (rafID.current != null) {
          window.cancelAnimationFrame(rafID.current);
          rafID.current = null;
        }
      } else if (rafID.current == null) {
        onAnimate();
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (rafID.current != null) {
        window.cancelAnimationFrame(rafID.current);
      }
      if (resizeTimeout.current) {
        clearTimeout(resizeTimeout.current);
      }
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [color, printMode]);

  const resizeCanvas = () => {
    if (canvasContainerRef.current && canvasRef.current && context.current) {
      dpr.current = window.devicePixelRatio;
      canvasSize.current.w = canvasContainerRef.current.offsetWidth;
      canvasSize.current.h = canvasContainerRef.current.offsetHeight;

      canvasRef.current.width = canvasSize.current.w * dpr.current;
      canvasRef.current.height = canvasSize.current.h * dpr.current;
      canvasRef.current.style.width = `${canvasSize.current.w}px`;
      canvasRef.current.style.height = `${canvasSize.current.h}px`;
      context.current.scale(dpr.current, dpr.current);

      circles.current = [];
      for (let i = 0; i < quantity; i++) {
        const circle = circleParams();
        drawCircle(circle);
      }
    }
  };

  const circleParams = (): Circle => {
    const x = Math.floor(Math.random() * canvasSize.current.w);
    const y = Math.floor(Math.random() * canvasSize.current.h);
    const translateX = 0;
    const translateY = 0;
    const pSize = Math.floor(Math.random() * 2) + size;
    const alpha = 0;
    const targetAlpha = parseFloat((Math.random() * 0.6 + 0.1).toFixed(1));
    // No drift: a moving field behind the text smears under a video call's compression. The
    // particles still answer the pointer.
    const magnetism = 0.1 + Math.random() * 4;
    return {
      x,
      y,
      translateX,
      translateY,
      size: pSize,
      alpha,
      targetAlpha,
      magnetism,
    };
  };

  const drawCircle = (circle: Circle, update = false) => {
    if (context.current) {
      const { x, y, translateX, translateY, size, alpha } = circle;
      context.current.translate(translateX, translateY);
      context.current.beginPath();
      context.current.arc(x, y, size, 0, 2 * Math.PI);
      context.current.globalAlpha = alpha;
      context.current.fillStyle = fill.current;
      context.current.fill();
      context.current.globalAlpha = 1;
      context.current.setTransform(dpr.current, 0, 0, dpr.current, 0, 0);

      if (!update) {
        circles.current.push(circle);
      }
    }
  };

  const clearContext = () => {
    if (context.current) {
      context.current.clearRect(0, 0, canvasSize.current.w, canvasSize.current.h);
    }
  };

  // Render the field once at full alpha, without an animation loop — used for
  // prefers-reduced-motion. resizeCanvas seeds circles at alpha 0, so they are
  // invisible until either animate() fades them in or this paints them.
  const drawStatic = () => {
    clearContext();
    for (const circle of circles.current) {
      circle.alpha = circle.targetAlpha;
      drawCircle(circle, true);
    }
  };

  const remapValue = (
    value: number,
    start1: number,
    end1: number,
    start2: number,
    end2: number,
  ): number => {
    const remapped = ((value - start1) * (end2 - start2)) / (end1 - start1) + start2;
    return remapped > 0 ? remapped : 0;
  };

  // Runs until the field stands still, then stops: once the fade-in has finished and the pointer
  // rests, every frame would redraw the same pixels. A pointer move inside starts it again.
  const animate = () => {
    clearContext();
    let moving = false;
    for (const circle of circles.current) {
      const { alpha, translateX, translateY } = circle;
      const edge = [
        circle.x + circle.translateX - circle.size,
        canvasSize.current.w - circle.x - circle.translateX - circle.size,
        circle.y + circle.translateY - circle.size,
        canvasSize.current.h - circle.y - circle.translateY - circle.size,
      ];
      const closestEdge = edge.reduce((a, b) => Math.min(a, b));
      const remapClosestEdge = parseFloat(remapValue(closestEdge, 0, 20, 0, 1).toFixed(2));
      if (remapClosestEdge > 1) {
        circle.alpha += 0.02;
        if (circle.alpha > circle.targetAlpha) {
          circle.alpha = circle.targetAlpha;
        }
      } else {
        circle.alpha = circle.targetAlpha * remapClosestEdge;
      }
      circle.translateX +=
        (mouse.current.x / (staticity / circle.magnetism) - circle.translateX) / ease;
      circle.translateY +=
        (mouse.current.y / (staticity / circle.magnetism) - circle.translateY) / ease;
      moving ||=
        circle.alpha !== alpha ||
        Math.abs(circle.translateX - translateX) > 0.001 ||
        Math.abs(circle.translateY - translateY) > 0.001;

      drawCircle(circle, true);
    }
    rafID.current = moving ? window.requestAnimationFrame(animate) : null;
  };

  if (printMode) {
    return (
      <div className={`pointer-events-none ${className ?? ""}`} aria-hidden="true" {...props} />
    );
  }

  return (
    <div
      className={`pointer-events-none [mask-image:radial-gradient(ellipse_at_center,transparent_60%,black_90%)] ${className ?? ""}`}
      ref={canvasContainerRef}
      aria-hidden="true"
      {...props}
    >
      <canvas ref={canvasRef} className="size-full" />
    </div>
  );
};
