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
  /**
   * Optional descendant that receives the transform while the frame stays
   * still. Share cards use this to tilt only the physical panel, not their
   * theme-colored outer plate.
   */
  targetSelector?: string;
}

function setGlassLight(
  element: HTMLElement,
  pointerX: number,
  pointerY: number,
) {
  element.style.setProperty(
    "--share-card-light-x",
    `${(pointerX * 92).toFixed(1)}px`,
  );
  element.style.setProperty(
    "--share-card-light-y",
    `${(pointerY * 64).toFixed(1)}px`,
  );
  element.style.setProperty(
    "--share-card-specular-x",
    `${(24 + pointerX * 250).toFixed(1)}px`,
  );
  element.style.setProperty(
    "--share-card-caustic-x",
    `${(-18 + pointerX * 176).toFixed(1)}px`,
  );
  element.style.setProperty(
    "--share-card-rim-strength",
    `${(0.34 + Math.abs(pointerX) * 0.16).toFixed(3)}`,
  );
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
  targetSelector,
}: TiltCardProps) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef(0);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const resetTimerRef = useRef(0);

  const getTarget = () =>
    targetSelector
      ? (hostRef.current?.querySelector<HTMLElement>(targetSelector) ?? null)
      : innerRef.current;

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
    const el = getTarget();
    const host = hostRef.current;
    if (!el || !host || !canTilt()) return;
    const rect = host.getBoundingClientRect();
    const px = (event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5;
    const py = (event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5;
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      el.style.transition = "transform 90ms cubic-bezier(0.2, 0.7, 0.2, 1)";
      el.style.transform = `perspective(1000px) rotateX(${(-py * 2 * max).toFixed(2)}deg) rotateY(${(px * 2 * max).toFixed(2)}deg) translateZ(${lift}px)`;
      setGlassLight(el, px, py);
    });
  };

  const handleEnter = () => {
    const el = getTarget();
    if (!el || !canTilt()) return;
    el.dataset.tiltActive = "true";
    el.style.willChange = "transform";
    el.style.transition = "transform 140ms ease-out";
    el.style.transformStyle = "preserve-3d";
  };

  const handleLeave = () => {
    const el = getTarget();
    if (!el) return;
    cancelAnimationFrame(frameRef.current);
    window.clearTimeout(resetTimerRef.current);
    el.dataset.tiltActive = "false";
    el.style.transition = "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)";
    el.style.transform =
      "perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0)";
    setGlassLight(el, 0, 0);
    resetTimerRef.current = window.setTimeout(() => {
      el.style.willChange = "auto";
    }, 440);
  };

  return (
    <div
      className={className}
      data-tilt-frame
      ref={hostRef}
      style={{ maxWidth: "100%", minWidth: 0, perspective: 1000, ...style }}
    >
      <div
        ref={innerRef}
        data-tilt-host
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
