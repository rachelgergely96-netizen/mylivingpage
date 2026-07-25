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

/**
 * One canonical decorative skeleton shared by every Living Page theme.
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
        data-share-card-skeleton-layer="palette-field"
        style={{
          background: `linear-gradient(145deg, rgba(0,0,0,0) 0%, ${surface} 42%, ${glow} 100%)`,
          bottom: 0,
          position: "absolute",
          right: 0,
          top: 0,
          width: "44%",
        }}
      />

      <div
        data-share-card-skeleton-layer="signal-frame"
        style={{
          border: `1px solid ${border}`,
          display: "flex",
          height: 208,
          opacity: 0.58,
          position: "absolute",
          right: 72,
          top: 44,
          transform: "rotate(8deg)",
          width: 208,
        }}
      >
        <div
          style={{
            border: `1px solid ${accent}`,
            bottom: 18,
            left: 18,
            opacity: 0.7,
            position: "absolute",
            right: 18,
            top: 18,
          }}
        />
        <div
          style={{
            background: accentBright,
            height: 10,
            position: "absolute",
            right: -5,
            top: -5,
            width: 10,
          }}
        />
      </div>

      <div
        data-share-card-skeleton-layer="diagonal-rail"
        style={{
          background: `linear-gradient(90deg, rgba(0,0,0,0), ${accent}, ${accentBright}, rgba(0,0,0,0))`,
          height: 2,
          opacity: 0.46,
          position: "absolute",
          right: -44,
          top: 252,
          transform: "rotate(-24deg)",
          width: 430,
        }}
      />

      {[118, 168, 218].map((top, index) => (
        <div
          data-share-card-skeleton-layer="measure"
          key={top}
          style={{
            background: index === 1 ? accent : border,
            height: 1,
            opacity: index === 1 ? 0.58 : 0.4,
            position: "absolute",
            right: 34,
            top,
            width: 330 - index * 44,
          }}
        />
      ))}

      <div
        data-share-card-skeleton-layer="accent-block"
        style={{
          background: accent,
          bottom: 176,
          height: 34,
          opacity: 0.5,
          position: "absolute",
          right: 42,
          width: 8,
        }}
      />
    </div>
  );
}
