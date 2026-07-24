import React from "react";
import type { CSSProperties, ReactNode } from "react";
import type { ShareCardMotifId } from "@/lib/share-card";

interface ShareCardProfileMarkProps {
  accent: string;
  className?: string;
  motif: ShareCardMotifId;
  style?: CSSProperties;
}

function renderAuthoredMotif(motif: ShareCardMotifId): ReactNode {
  const commonProps = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "square" as const,
    strokeWidth: 1.15,
    vectorEffect: "non-scaling-stroke" as const,
  };
  const svgProps = {
    "aria-hidden": true,
    style: {
      display: "block",
      height: "100%",
      overflow: "visible",
      width: "100%",
    } satisfies CSSProperties,
    viewBox: "0 0 48 48",
  };

  switch (motif) {
    case "precision":
      return (
        <svg {...svgProps}>
          <path {...commonProps} d="M5 34V7h27M16 41h27V16" />
          <rect {...commonProps} x="33" y="5" width="10" height="10" />
        </svg>
      );
    case "cartography":
      return (
        <svg {...svgProps}>
          <path {...commonProps} d="M3 13c9-8 33-8 42 0M5 23c8-6 30-6 38 0M8 33c7-4 25-4 32 0M15 41c5-2 13-2 18 0" />
        </svg>
      );
    case "cinema":
      return (
        <svg {...svgProps}>
          <path {...commonProps} d="M3 8h42M3 40h42M10 18h31M10 25h25M10 32h19" />
        </svg>
      );
    case "night-editorial":
      return (
        <svg {...svgProps}>
          <path {...commonProps} d="M8 5v38h35M16 13h25M16 22h20M16 31h27" />
        </svg>
      );
    case "material":
      return (
        <svg {...svgProps}>
          <path {...commonProps} d="M2 14c13 5 26 5 44-2M2 24c16 6 30 5 44-3M2 35c12 4 28 3 44-4" />
        </svg>
      );
    case "botanical":
      return (
        <svg {...svgProps}>
          <path {...commonProps} d="M11 43C26 33 25 19 34 5M20 30C9 30 6 23 6 16c10 0 17 4 18 10M27 20c0-9 6-14 15-15 0 9-4 15-13 17" />
        </svg>
      );
    case "couture":
      return (
        <svg {...svgProps}>
          <path {...commonProps} d="M14 3c-5 12-5 30 0 42M23 3c5 12 5 30 0 42M34 3c-5 12-5 30 0 42" />
        </svg>
      );
    case "print-studio":
      return (
        <svg {...svgProps}>
          <path {...commonProps} d="M4 17V4h13M31 4h13v13M44 31v13H31M17 44H4V31" />
          <rect {...commonProps} x="14" y="14" width="20" height="20" />
        </svg>
      );
    case "ornamental":
      return (
        <svg {...svgProps}>
          <path {...commonProps} d="M4 24c8 0 8-12 20-12s12 12 20 12M4 24c8 0 8 12 20 12s12-12 20-12" />
          <path {...commonProps} d="M24 5c0 8-7 11-7 19s7 11 7 19c0-8 7-11 7-19S24 13 24 5Z" />
        </svg>
      );
    case "celestial":
      return (
        <svg {...svgProps}>
          <path {...commonProps} d="M7 29c5-15 23-23 36-13M5 35c11 9 30 7 38-7M30 8c-8 4-11 14-7 22 3 7 11 11 19 9-5 5-13 7-20 4C10 38 5 25 10 14 14 6 22 2 30 3" />
        </svg>
      );
    case "bearing":
      return (
        <svg {...svgProps}>
          <circle {...commonProps} cx="24" cy="24" r="16" />
          <path {...commonProps} d="M17 31 27 12l4 19-7-3-7 3Z" />
        </svg>
      );
    case "orbit":
      return (
        <svg {...svgProps}>
          <ellipse {...commonProps} cx="24" cy="24" rx="19" ry="9" transform="rotate(-20 24 24)" />
          <ellipse {...commonProps} cx="24" cy="24" rx="18" ry="7" transform="rotate(33 24 24)" />
        </svg>
      );
    case "petal":
      return (
        <svg {...svgProps}>
          <path {...commonProps} d="M7 26C8 15 15 8 27 7c-1 12-8 19-20 19Z" />
          <path {...commonProps} d="M21 41c1-11 8-18 20-19-1 12-8 19-20 19Z" />
        </svg>
      );
    case "curtain":
      return (
        <svg {...svgProps}>
          <path {...commonProps} d="M9 3c9 9 9 33 0 42M21 3c9 9 9 33 0 42M33 3c9 9 9 33 0 42" />
        </svg>
      );
    case "weave":
      return (
        <svg {...svgProps}>
          <path {...commonProps} d="M3 14c10-8 32-8 42 0M3 34c10 8 32 8 42 0" />
          <path {...commonProps} d="M14 3c-8 10-8 32 0 42M34 3c8 10 8 32 0 42" />
        </svg>
      );
    case "contour":
      return (
        <svg {...svgProps}>
          <path {...commonProps} d="M4 13 18 4l22 6 4 20-13 14-22-5L4 13Z" />
          <path {...commonProps} d="m13 17 9-6 13 5 2 12-8 9-13-4-3-16Z" />
        </svg>
      );
  }
}

export function ShareCardProfileMark({
  accent,
  className,
  motif,
  style,
}: ShareCardProfileMarkProps) {
  return (
    <div
      aria-hidden="true"
      data-share-card-profile={motif}
      className={`share-card-profile-mark ${className ?? ""}`}
      style={{
        color: accent,
        display: "flex",
        height: "2.75rem",
        opacity: 0.52,
        pointerEvents: "none",
        position: "absolute",
        width: "2.75rem",
        ...style,
      }}
    >
      {renderAuthoredMotif(motif)}
    </div>
  );
}
