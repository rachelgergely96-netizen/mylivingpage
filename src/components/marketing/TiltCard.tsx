"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** Maximum tilt in degrees on each axis. Kept small so it reads premium. */
  max?: number;
  /** How far the card lifts toward the viewer at peak, in px. */
  lift?: number;
  style?: CSSProperties;
}

/**
 * A subtle cursor-following 3D tilt for STATIC cards (no live canvas inside —
 * transforming a canvas host janks and blurs on Safari). Disabled on coarse /
 * hover-less pointers and under reduced motion, and it only animates transform
 * so it never thrashes layout.
 */
export default function TiltCard({
  children,
  className,
  max = 6,
  lift = 10,
  style,
}: TiltCardProps) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef(0);
  const resetTimerRef = useRef(0);

  useEffect(
    () => () => {
      cancelAnimationFrame(frameRef.current);
      window.clearTimeout(resetTimerRef.current);
    },
    [],
  );

  const canTilt = () =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const handleMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = innerRef.current;
    if (!el || !canTilt()) return;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5;
    const py = (event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5;
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      el.style.transform = `perspective(900px) rotateX(${(-py * 2 * max).toFixed(2)}deg) rotateY(${(px * 2 * max).toFixed(2)}deg) translateZ(${lift}px)`;
    });
  };

  const handleEnter = () => {
    const el = innerRef.current;
    if (!el || !canTilt()) return;
    el.style.willChange = "transform";
    el.style.transition = "transform 140ms ease-out";
  };

  const handleLeave = () => {
    const el = innerRef.current;
    if (!el) return;
    cancelAnimationFrame(frameRef.current);
    window.clearTimeout(resetTimerRef.current);
    el.style.transition = "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)";
    el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)";
    resetTimerRef.current = window.setTimeout(() => {
      if (innerRef.current) innerRef.current.style.willChange = "auto";
    }, 440);
  };

  return (
    <div className={className} style={{ perspective: 900, ...style }}>
      <div
        ref={innerRef}
        onPointerMove={handleMove}
        onPointerEnter={handleEnter}
        onPointerLeave={handleLeave}
        style={{ transformStyle: "preserve-3d" }}
      >
        {children}
      </div>
    </div>
  );
}
