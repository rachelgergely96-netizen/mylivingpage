const BASELINE_FRAME_SECONDS = 1 / 60;
const MAX_FRAME_SECONDS = 0.05;
const FRAME_TIMESTAMP_EPSILON_MS = 0.01;

/**
 * Converts elapsed wall-clock time into a multiplier for animation values that
 * were originally tuned as per-frame updates at 60fps.
 */
export function frameScaleFromDelta(deltaSeconds?: number): number {
  if (deltaSeconds === undefined) {
    return 1;
  }
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
    return 0;
  }
  return Math.min(deltaSeconds, MAX_FRAME_SECONDS) / BASELINE_FRAME_SECONDS;
}

/** Prevents floating-point rAF timestamps from skipping an intended capped frame. */
export function hasFrameIntervalElapsed(
  now: number,
  lastPaint: number,
  minimumIntervalMs: number,
): boolean {
  return minimumIntervalMs <= 0
    || now - lastPaint + FRAME_TIMESTAMP_EPSILON_MS >= minimumIntervalMs;
}
