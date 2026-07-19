import type { ThemeMotionContext } from "../types";

export interface ResolvedThemeMotion {
  scrollProgress: number;
  scrollVelocity: number;
  activeSection: string | null;
  activeSectionIndex: number;
  sectionProgress: number;
  hasFocus: boolean;
  focusX: number;
  focusY: number;
  interactionImpulse: number;
  pointerSpeed: number;
}

export function finiteClamp(
  value: number | undefined,
  min: number,
  max: number,
  fallback = 0,
): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

/** Converts event-driven page state into safe values for visual formulas. */
export function resolveThemeMotion(
  motion: Readonly<ThemeMotionContext> | undefined,
): ResolvedThemeMotion {
  const reducedMotion = motion?.reducedMotion ?? false;
  return {
    scrollProgress: finiteClamp(motion?.scrollProgress, 0, 1),
    scrollVelocity: reducedMotion
      ? 0
      : finiteClamp(motion?.scrollVelocity, -4, 4),
    activeSection: motion?.activeSection ?? null,
    activeSectionIndex: Math.round(
      finiteClamp(motion?.activeSectionIndex, 0, 100),
    ),
    sectionProgress: finiteClamp(motion?.sectionProgress, 0, 1),
    hasFocus: Boolean(motion?.focusedItem || motion?.focusKind),
    focusX: finiteClamp(motion?.focusX, 0, 1, 0.5),
    focusY: finiteClamp(motion?.focusY, 0, 1, 0.5),
    interactionImpulse: reducedMotion
      ? 0
      : finiteClamp(motion?.interactionImpulse, 0, 1),
    pointerSpeed: reducedMotion
      ? 0
      : finiteClamp(motion?.pointerSpeed, 0, 4),
  };
}

export function clearTransientThemeMotion(motion: ThemeMotionContext): void {
  motion.scrollVelocity = 0;
  motion.scrollDirection = 0;
  motion.pointerVelocityX = 0;
  motion.pointerVelocityY = 0;
  motion.pointerSpeed = 0;
  motion.interactionImpulse = 0;
}

export function decayTransientThemeMotion(
  motion: ThemeMotionContext,
  deltaSeconds: number,
): void {
  const delta = finiteClamp(deltaSeconds, 0, 0.25);
  motion.scrollVelocity *= Math.exp(-delta / 0.18);
  motion.pointerVelocityX *= Math.exp(-delta / 0.14);
  motion.pointerVelocityY *= Math.exp(-delta / 0.14);
  motion.pointerSpeed *= Math.exp(-delta / 0.14);
  motion.interactionImpulse *= Math.exp(-delta / 0.32);
  if (Math.abs(motion.scrollVelocity) < 0.005) {
    motion.scrollVelocity = 0;
    motion.scrollDirection = 0;
  }
}
