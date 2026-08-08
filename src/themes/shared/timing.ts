const BASELINE_FRAME_SECONDS = 1 / 60;
// Guards against the multi-second jump after a backgrounded tab resumes, so it
// has to sit clear of every configured cap: a maxFps={24} canvas presents on
// every third vsync (~50ms), and clamping at that interval meant any dropped
// tick silently discarded real elapsed time and ran the world slow.
const MAX_FRAME_SECONDS = 0.1;
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

// A target at/above this rate is treated as "present every animation frame":
// gating a 60fps target on a 60Hz panel skipped frames unevenly because a
// slightly-early rAF (16.5ms vs the 16.67ms threshold) just-missed and pushed
// the paint to the next vsync, producing 16.7/33.3/50ms judder.
const DISPLAY_RATE_INTERVAL_MS = 1000 / 58;

/**
 * Decides whether to paint this animation frame for a given target interval.
 *
 * Targets at or above roughly display rate present on every rAF and let vsync
 * pace them — the elapsed-time accumulation elsewhere already makes animation
 * speed frame-rate independent, so this only governs cadence. Deliberate low
 * caps (small previews, the 30fps degrade floor) still gate, but a half-frame
 * tolerance means vsync jitter can never turn an intended paint into a skip.
 */
export function shouldPresentFrame(
  now: number,
  lastPaint: number,
  targetIntervalMs: number,
): boolean {
  if (!(targetIntervalMs > 0) || targetIntervalMs <= DISPLAY_RATE_INTERVAL_MS) {
    return true;
  }
  return now - lastPaint >= targetIntervalMs - Math.min(8, targetIntervalMs * 0.5);
}
