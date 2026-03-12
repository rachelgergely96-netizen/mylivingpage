"use client";

import { useEffect, useMemo, useRef } from "react";
import { THEME_MAP } from "@/themes/registry";
import type { ThemeId } from "@/themes/types";

interface ThemeCanvasProps {
  themeId: ThemeId;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
  interactive?: boolean;
  children?: React.ReactNode;
}

export default function ThemeCanvas({
  themeId,
  height = 320,
  className,
  style,
  interactive = true,
  children,
}: ThemeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const visibleRef = useRef(true);
  const elapsedRef = useRef(0);
  const lastFrameRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const theme = useMemo(() => THEME_MAP[themeId], [themeId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !theme) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(canvas.offsetWidth * pixelRatio));
      const h = Math.max(1, Math.floor(canvas.offsetHeight * pixelRatio));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    const container = containerRef.current;
    const renderFrame = (elapsed: number) => {
      context.fillStyle = theme.background;
      context.fillRect(0, 0, canvas.width, canvas.height);
      try {
        theme.renderer(context, canvas.width, canvas.height, elapsed, mouseRef.current.x, mouseRef.current.y);
      } catch {
        // Prevent a single renderer error from killing the animation loop
      }
    };

    const stop = () => {
      runningRef.current = false;
      lastFrameRef.current = null;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };

    const draw = (now: number) => {
      if (!runningRef.current) {
        return;
      }
      if (lastFrameRef.current === null) {
        lastFrameRef.current = now;
      }
      const delta = Math.min(0.05, (now - lastFrameRef.current) * 0.001);
      lastFrameRef.current = now;
      elapsedRef.current += delta;
      renderFrame(elapsedRef.current);
      animationRef.current = requestAnimationFrame(draw);
    };

    const start = () => {
      if (runningRef.current || document.hidden || !visibleRef.current) {
        return;
      }
      runningRef.current = true;
      animationRef.current = requestAnimationFrame(draw);
    };

    const handleMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height,
      };
    };
    const handleTouch = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: (touch.clientX - rect.left) / rect.width,
        y: (touch.clientY - rect.top) / rect.height,
      };
    };
    const handleVisibility = () => {
      if (document.hidden || !visibleRef.current) {
        stop();
      } else {
        start();
      }
    };

    resize();
    renderFrame(elapsedRef.current);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", handleVisibility);

    // ResizeObserver catches late layout shifts that the initial resize() misses
    let observer: ResizeObserver | null = null;
    if (container) {
      observer = new ResizeObserver(() => resize());
      observer.observe(container);
    }

    let intersectionObserver: IntersectionObserver | null = null;
    if (container && "IntersectionObserver" in window) {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          visibleRef.current = entry?.isIntersecting ?? true;
          if (visibleRef.current) {
            start();
          } else {
            stop();
          }
        },
        { threshold: 0.05 },
      );
      intersectionObserver.observe(container);
    } else {
      visibleRef.current = true;
    }

    if (interactive && container) {
      container.addEventListener("mousemove", handleMove);
      container.addEventListener("touchmove", handleTouch, { passive: true });
    }
    start();

    return () => {
      stop();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
      observer?.disconnect();
      intersectionObserver?.disconnect();
      if (interactive && container) {
        container.removeEventListener("mousemove", handleMove);
        container.removeEventListener("touchmove", handleTouch);
      }
    };
  }, [interactive, theme]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        ...(!className?.includes("rounded-none") ? { borderRadius: 16 } : {}),
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height,
          display: "block",
          cursor: interactive ? "crosshair" : "default",
        }}
      />
      {children ? (
        <div
          style={{
            pointerEvents: "auto",
            position: "absolute",
            inset: 0,
            zIndex: 2,
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
