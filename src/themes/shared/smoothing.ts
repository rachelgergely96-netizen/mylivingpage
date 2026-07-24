import type { ThemeMotionContext } from "../types";
import { finiteClamp } from "./motion";

/**
 * Framerate-independent exponential smoothing factor for one integration step.
 * `sample += (target - sample) * smoothingFactor(dt, tau)` converges to the
 * target with time constant `tau` regardless of the frame rate.
 */
export function smoothingFactor(deltaSeconds: number, timeConstant: number): number {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return 0;
  if (!Number.isFinite(timeConstant) || timeConstant <= 0) return 1;
  return 1 - Math.exp(-deltaSeconds / timeConstant);
}

const POINTER_TAU = 0.12;
const FOCUS_TAU = 0.2;
const SCROLL_TAU = 0.24;
/** Large-error fast-track: jump scrolls and teleporting targets should not swim. */
const FAST_TRACK_DELTA = 0.25;
const FAST_TRACK_TAU_SCALE = 0.25;
/** Story-space jumps larger than this (in sections) snap instead of gliding. */
const STORY_SNAP_SECTIONS = 1.5;

function approach(
  sample: number,
  target: number,
  deltaSeconds: number,
  timeConstant: number,
  fastTrackDelta = FAST_TRACK_DELTA,
): number {
  const error = target - sample;
  const tau =
    Math.abs(error) > fastTrackDelta
      ? timeConstant * FAST_TRACK_TAU_SCALE
      : timeConstant;
  return sample + error * smoothingFactor(deltaSeconds, tau);
}

export interface PointerSample {
  x: number;
  y: number;
}

/**
 * Integrates raw page inputs (pointer, focused card, scroll story) into
 * inertially smoothed samples for the canvas renderers. Event handlers write
 * targets; the host draw loop calls `step` once per painted frame and hands
 * renderers the smoothed pointer and a smoothed copy of the motion context.
 *
 * Continuous signals (pointer, focus position, scroll and story position) are
 * smoothed; the section index/progress pair is reconstructed from the smoothed
 * story position, so it can trail the live index by the smoothing lag — that
 * lag IS the glide renderers want. Identity and transient signals (section id
 * string, focus identity, impulse, reduced-motion) pass through untouched.
 * Pointer velocity is re-derived from the smoothed path, so impulse-driven
 * effects no longer jitter with raw input noise.
 */
export interface MotionSampler {
  /** Event-driven pointer target in normalized [0, 1] coordinates. */
  setPointerTarget(x: number, y: number): void;
  /** Snaps the pointer sample (initial mount, reduced motion). */
  snapPointer(x: number, y: number): void;
  readonly pointer: PointerSample;
  /**
   * Advances all samples by `deltaSeconds` and returns the smoothed motion
   * context (or undefined when no live context is provided).
   */
  step(
    live: Readonly<ThemeMotionContext> | undefined,
    deltaSeconds: number,
  ): Readonly<ThemeMotionContext> | undefined;
}

export function createMotionSampler(
  initialX = 0.5,
  initialY = 0.5,
): MotionSampler {
  let targetX = finiteClamp(initialX, 0, 1, 0.5);
  let targetY = finiteClamp(initialY, 0, 1, 0.5);
  const pointer: PointerSample = { x: targetX, y: targetY };

  let focusX = 0.5;
  let focusY = 0.5;
  let scrollProgress = 0;
  let storyPosition = 0;
  let motionInitialized = false;
  let smoothed: ThemeMotionContext | null = null;

  return {
    setPointerTarget(x: number, y: number) {
      targetX = finiteClamp(x, 0, 1, targetX);
      targetY = finiteClamp(y, 0, 1, targetY);
    },
    snapPointer(x: number, y: number) {
      targetX = finiteClamp(x, 0, 1, targetX);
      targetY = finiteClamp(y, 0, 1, targetY);
      pointer.x = targetX;
      pointer.y = targetY;
    },
    pointer,
    step(live, deltaSeconds) {
      const delta = finiteClamp(deltaSeconds, 0, 0.25);
      const reduced = live?.reducedMotion ?? false;
      // A zero-delta step is a static paint (initial render, resize, paused
      // canvas): snap to the live values so the frame is exact, not stale.
      const snap = reduced || delta === 0;

      if (snap) {
        pointer.x = targetX;
        pointer.y = targetY;
      } else {
        pointer.x = approach(pointer.x, targetX, delta, POINTER_TAU);
        pointer.y = approach(pointer.y, targetY, delta, POINTER_TAU);
      }

      if (!live) {
        motionInitialized = false;
        return undefined;
      }

      if (!smoothed) {
        smoothed = { ...live };
      }

      const sectionCount = Math.max(0, Math.round(live.sectionCount));
      const storyTarget =
        sectionCount > 0
          ? finiteClamp(live.activeSectionIndex, 0, sectionCount - 1) +
            finiteClamp(live.sectionProgress, 0, 1)
          : 0;

      if (!motionInitialized || snap) {
        focusX = live.focusX;
        focusY = live.focusY;
        scrollProgress = live.scrollProgress;
        storyPosition = storyTarget;
        motionInitialized = true;
      } else {
        focusX = approach(focusX, live.focusX, delta, FOCUS_TAU);
        focusY = approach(focusY, live.focusY, delta, FOCUS_TAU);
        scrollProgress = approach(
          scrollProgress,
          live.scrollProgress,
          delta,
          SCROLL_TAU,
        );
        if (Math.abs(storyTarget - storyPosition) > STORY_SNAP_SECTIONS) {
          storyPosition = storyTarget;
        } else {
          storyPosition = approach(
            storyPosition,
            storyTarget,
            delta,
            SCROLL_TAU,
            Number.POSITIVE_INFINITY,
          );
        }
      }

      // Identity/transient fields track the live context exactly.
      Object.assign(smoothed, live);
      smoothed.focusX = focusX;
      smoothed.focusY = focusY;
      smoothed.scrollProgress = finiteClamp(scrollProgress, 0, 1);
      if (sectionCount > 0) {
        // Clamp the index (not the position) so the very end of the last
        // section still reconstructs as sectionProgress === 1.
        const boundedStory = finiteClamp(storyPosition, 0, sectionCount);
        const index = Math.min(Math.floor(boundedStory), sectionCount - 1);
        smoothed.activeSectionIndex = index;
        smoothed.sectionProgress = finiteClamp(boundedStory - index, 0, 1);
      }

      // Pointer velocity from the smoothed path: converges to zero on its own
      // and cannot spike from a single noisy input event.
      if (snap) {
        smoothed.pointerVelocityX = 0;
        smoothed.pointerVelocityY = 0;
        smoothed.pointerSpeed = 0;
      } else {
        const velocityX = finiteClamp(
          (targetX - pointer.x) / POINTER_TAU,
          -4,
          4,
        );
        const velocityY = finiteClamp(
          (targetY - pointer.y) / POINTER_TAU,
          -4,
          4,
        );
        smoothed.pointerVelocityX = velocityX;
        smoothed.pointerVelocityY = velocityY;
        smoothed.pointerSpeed = finiteClamp(
          Math.hypot(velocityX, velocityY),
          0,
          4,
        );
      }

      return smoothed;
    },
  };
}
