"use client";

import React, { useId } from "react";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import type { MotionPreference } from "@/lib/motion";

const OPTIONS = [
  {
    value: "system",
    label: "Device",
    description: "Follow your device motion setting.",
  },
  {
    value: "full",
    label: "Full",
    description: "Ambient motion and authored transitions.",
  },
  {
    value: "calm",
    label: "Calm",
    description: "No ambient loops; brief, small responses.",
  },
  {
    value: "still",
    label: "Still",
    description: "Immediate updates with no spatial motion.",
  },
] as const satisfies ReadonlyArray<{
  value: MotionPreference;
  label: string;
  description: string;
}>;

interface MotionModeControlProps {
  className?: string;
  compact?: boolean;
  ariaLabel?: string;
}

export default function MotionModeControl({
  className = "",
  compact = false,
  ariaLabel = "Motion preference",
}: MotionModeControlProps) {
  const { mode, preference, systemReducedMotion, setPreference } =
    useMotionPreference();
  const descriptionId = useId();

  if (compact) {
    return (
      <label
        className={`flex min-h-11 items-center justify-between gap-3 border border-site-border bg-site-surface-raised px-3 text-xs text-site-secondary ${className}`}
        data-motion-control
        data-motion-state={mode}
      >
        <span className="font-semibold text-site-text">Motion</span>
        <select
          aria-label={ariaLabel}
          value={preference}
          onChange={(event) =>
            setPreference(event.target.value as MotionPreference)
          }
          className="site-field min-h-11 min-w-[7.25rem] bg-site-canvas-alt px-2 py-1 text-xs"
        >
          {OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <fieldset
      className={`site-panel p-5 sm:p-7 ${className}`}
      aria-describedby={descriptionId}
      data-motion-control
      data-motion-state={mode}
    >
      <legend className="site-panel-title px-1">Motion</legend>
      <p id={descriptionId} className="site-muted mb-4 text-sm leading-6">
        Choose how movement behaves on this device. Your current device setting
        {systemReducedMotion ? " requests reduced motion." : " allows full motion."}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className="site-panel flex min-h-16 cursor-pointer items-start gap-3 p-3 has-[:checked]:border-site-action has-[:checked]:bg-site-selected"
          >
            <input
              type="radio"
              name="motion-preference"
              value={option.value}
              checked={preference === option.value}
              onChange={() => setPreference(option.value)}
              className="mt-1 h-4 w-4 accent-[var(--site-action)]"
            />
            <span>
              <span className="block text-sm font-semibold text-site-text">
                {option.label}
              </span>
              <span className="site-muted mt-1 block text-xs leading-5">
                {option.description}
              </span>
            </span>
          </label>
        ))}
      </div>
      <p className="site-muted mt-3 text-xs" aria-live="polite">
        Active mode: <span className="font-semibold text-site-text">{mode}</span>
      </p>
    </fieldset>
  );
}
