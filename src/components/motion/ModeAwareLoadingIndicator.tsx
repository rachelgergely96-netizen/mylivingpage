"use client";

import React from "react";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import { MOTION_MODE_POLICIES } from "@/lib/motion";

interface ModeAwareLoadingIndicatorProps {
  appearance?: "site" | "current";
  className?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASS = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-10 w-10",
} as const;

/**
 * A shared loading mark whose meaning does not depend on movement. Full mode
 * can rotate it; Calm and Still retain the same directional ring as a static
 * state cue.
 */
export default function ModeAwareLoadingIndicator({
  appearance = "site",
  className = "",
  size = "md",
}: ModeAwareLoadingIndicatorProps) {
  const { mode } = useMotionPreference();
  const canRotate = MOTION_MODE_POLICIES[mode].allowsContinuousMotion;
  const colorClass =
    appearance === "current"
      ? "border-current border-r-transparent"
      : "border-site-border border-t-site-action";

  return (
    <span
      aria-hidden="true"
      className={`${SIZE_CLASS[size]} inline-block shrink-0 rounded-full border-2 ${colorClass} ${
        canRotate ? "animate-spin" : ""
      } ${className}`}
      data-loading-indicator
      data-motion-mode={mode}
    />
  );
}
