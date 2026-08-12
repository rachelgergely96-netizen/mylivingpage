import type { ThemeMotionContext } from "../types";

export interface ResolvedThemeMotion {
  scrollProgress: number;
  scrollVelocity: number;
  activeSection: string | null;
  activeSectionIndex: number;
  sectionCount: number;
  sectionProgress: number;
  sectionImpulse: number;
  sectionDirection: -1 | 0 | 1;
  /** Continuous position through the ordered page story, normalized to [0, 1]. */
  storyProgress: number;
  hasFocus: boolean;
  focusStrength: number;
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

/**
 * Returns a smooth influence for one visual step in an ordered story.
 * Adjacent steps crossfade linearly and the weights always remain bounded.
 */
export function storyStepWeight(
  storyProgress: number,
  stepIndex: number,
  stepCount: number,
): number {
  const count = Math.max(1, Math.round(finiteClamp(stepCount, 1, 100)));
  const index = Math.round(finiteClamp(stepIndex, 0, count - 1));
  if (count === 1) return index === 0 ? 1 : 0;

  const position = finiteClamp(storyProgress, 0, 1) * (count - 1);
  return 1 - finiteClamp(Math.abs(position - index), 0, 1);
}

/** Converts event-driven page state into safe values for visual formulas. */
export function resolveThemeMotion(
  motion: Readonly<ThemeMotionContext> | undefined,
): ResolvedThemeMotion {
  const reducedMotion = motion?.reducedMotion ?? false;
  const scrollProgress = finiteClamp(motion?.scrollProgress, 0, 1);
  const sectionCount = Math.round(finiteClamp(motion?.sectionCount, 0, 100));
  const activeSectionIndex = Math.round(
    finiteClamp(
      motion?.activeSectionIndex,
      0,
      Math.max(0, sectionCount - 1),
    ),
  );
  const sectionProgress = finiteClamp(motion?.sectionProgress, 0, 1);
  const hasFocus = Boolean(motion?.focusedItem || motion?.focusKind);
  const storyProgress =
    sectionCount > 0
      ? finiteClamp(
          (activeSectionIndex + sectionProgress) / sectionCount,
          0,
          1,
        )
      : scrollProgress;

  return {
    scrollProgress,
    scrollVelocity: reducedMotion
      ? 0
      : finiteClamp(motion?.scrollVelocity, -4, 4),
    activeSection: motion?.activeSection ?? null,
    activeSectionIndex,
    sectionCount,
    sectionProgress,
    sectionImpulse: reducedMotion
      ? 0
      : finiteClamp(motion?.sectionImpulse, 0, 1),
    sectionDirection: reducedMotion
      ? 0
      : motion?.sectionDirection === 1
        ? 1
        : motion?.sectionDirection === -1
          ? -1
          : 0,
    storyProgress,
    hasFocus,
    focusStrength: finiteClamp(
      motion?.focusStrength,
      0,
      1,
      hasFocus ? 1 : 0,
    ),
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
  motion.sectionImpulse = 0;
  motion.sectionDirection = 0;
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
  // A section arrival outlives the click/hover impulse slightly. This creates
  // a calm follow-through instead of making every world snap to its new pose.
  motion.sectionImpulse *= Math.exp(-delta / 0.46);
  if (Math.abs(motion.scrollVelocity) < 0.005) {
    motion.scrollVelocity = 0;
    motion.scrollDirection = 0;
  }
  if (motion.sectionImpulse < 0.005) {
    motion.sectionImpulse = 0;
    motion.sectionDirection = 0;
  }
}

/**
 * Converts a section arrival into one small, universal camera cue. Renderers
 * still own their imagery and intrinsic motion; this only gives every world a
 * shared directional settle when the reader reaches a new chapter.
 */
export function applySectionMotionToPointer(
  pointerX: number,
  pointerY: number,
  motion: Readonly<ThemeMotionContext> | undefined,
): { x: number; y: number } {
  const pageMotion = resolveThemeMotion(motion);
  const pulse = pageMotion.sectionImpulse;
  if (pulse <= 0) {
    return {
      x: finiteClamp(pointerX, 0, 1, 0.5),
      y: finiteClamp(pointerY, 0, 1, 0.5),
    };
  }

  const lateralDirection = pageMotion.activeSectionIndex % 2 === 0 ? 1 : -1;
  return {
    x: finiteClamp(pointerX + lateralDirection * pulse * 0.014, 0, 1, 0.5),
    y: finiteClamp(
      pointerY + pageMotion.sectionDirection * pulse * 0.018,
      0,
      1,
      0.5,
    ),
  };
}
