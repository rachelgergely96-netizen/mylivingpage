import React from "react";
import type { CSSProperties } from "react";

interface ShareCardSkeletonArtworkProps {
  accent: string;
  accentBright: string;
  border: string;
  glow: string;
  style?: CSSProperties;
  surface: string;
}

interface CircuitTrace {
  height: number;
  left: number;
  top: number;
  width: number;
}

const CIRCUIT_TRACES: readonly CircuitTrace[] = [
  { height: 1, left: 704, top: 58, width: 232 },
  { height: 1, left: 744, top: 82, width: 258 },
  { height: 1, left: 786, top: 106, width: 178 },
  { height: 1, left: 832, top: 130, width: 214 },
  { height: 1, left: 760, top: 154, width: 158 },
  { height: 142, left: 934, top: 58, width: 1 },
  { height: 112, left: 1001, top: 82, width: 1 },
  { height: 88, left: 831, top: 130, width: 1 },
] as const;

const CIRCUIT_NODES = [
  { left: 700, top: 54 },
  { left: 782, top: 102 },
  { left: 756, top: 150 },
  { left: 930, top: 54 },
  { left: 997, top: 78 },
  { left: 827, top: 126 },
  { left: 1042, top: 126 },
] as const;

/**
 * One canonical glass circuit skeleton shared by every Living Page theme.
 * Themes provide palette values only; geometry and layer order never change.
 * Pure positioned divs keep the artwork portable across DOM, html-to-image,
 * and Satori OG rendering.
 */
export function ShareCardSkeletonArtwork({
  accent,
  accentBright,
  border,
  glow,
  style,
  surface,
}: ShareCardSkeletonArtworkProps) {
  return (
    <div
      aria-hidden="true"
      data-share-card-skeleton="canonical"
      style={{
        bottom: 0,
        display: "flex",
        left: 0,
        overflow: "hidden",
        pointerEvents: "none",
        position: "absolute",
        right: 0,
        top: 0,
        ...style,
      }}
    >
      <div
        data-share-card-skeleton-layer="glass-volume"
        style={{
          background: `radial-gradient(ellipse 58% 78% at 84% 26%, ${glow} 0%, ${surface} 42%, rgba(0,0,0,0) 76%)`,
          bottom: 0,
          position: "absolute",
          right: 0,
          top: 0,
          width: "48%",
        }}
      />

      <div
        data-share-card-skeleton-layer="micro-grid"
        style={{
          background:
            "repeating-linear-gradient(90deg, rgba(255,255,255,0.028) 0px, rgba(255,255,255,0.028) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 28px)",
          bottom: 24,
          opacity: 0.48,
          position: "absolute",
          right: 24,
          top: 24,
          width: 440,
        }}
      />

      <div
        data-share-card-skeleton-layer="circuit-traces"
        style={{
          bottom: 0,
          display: "flex",
          left: 0,
          position: "absolute",
          right: 0,
          top: 0,
        }}
      >
        {CIRCUIT_TRACES.map((trace, index) => (
          <div
            key={`${trace.left}-${trace.top}`}
            style={{
              background:
                index % 3 === 0
                  ? `linear-gradient(90deg, ${accent}, ${accentBright})`
                  : border,
              height: trace.height,
              left: trace.left,
              opacity: index % 3 === 0 ? 0.72 : 0.46,
              position: "absolute",
              top: trace.top,
              width: trace.width,
            }}
          />
        ))}
        {CIRCUIT_NODES.map((node, index) => (
          <div
            key={`${node.left}-${node.top}`}
            style={{
              background: index % 2 === 0 ? accentBright : accent,
              border: "1px solid rgba(255,255,255,0.34)",
              height: 8,
              left: node.left,
              opacity: 0.84,
              position: "absolute",
              top: node.top,
              width: 8,
            }}
          />
        ))}
      </div>

      <div
        data-share-card-skeleton-layer="registration-corners"
        style={{
          borderRight: `1px solid ${accentBright}`,
          borderTop: `1px solid ${accentBright}`,
          height: 68,
          opacity: 0.68,
          position: "absolute",
          right: 22,
          top: 22,
          width: 68,
        }}
      />
      <div
        style={{
          borderBottom: `1px solid ${accent}`,
          borderLeft: `1px solid ${accent}`,
          bottom: 22,
          height: 54,
          left: 22,
          opacity: 0.48,
          position: "absolute",
          width: 54,
        }}
      />

      <div
        data-share-card-skeleton-layer="laser-rail"
        style={{
          background: `linear-gradient(90deg, rgba(0,0,0,0), ${accent}, ${accentBright}, rgba(0,0,0,0))`,
          height: 1,
          opacity: 0.42,
          position: "absolute",
          right: 24,
          top: 236,
          width: 408,
        }}
      />
    </div>
  );
}
