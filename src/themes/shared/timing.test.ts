import { describe, expect, it } from "vitest";
import {
  frameScaleFromDelta,
  hasFrameIntervalElapsed,
  shouldPresentFrame,
} from "@/themes/shared/timing";

/** Simulates a jittery vsync clock: nominal step ± up to `jitterMs`. */
function vsyncTimestamps(stepMs: number, count: number, jitterMs: number) {
  const stamps: number[] = [];
  let t = 0;
  for (let index = 0; index < count; index += 1) {
    // Deterministic pseudo-jitter in [-jitter, +jitter], no Math.random.
    const jitter = (Math.sin(index * 12.9898) * 0.5) * 2 * jitterMs;
    t += stepMs + jitter;
    stamps.push(t);
  }
  return stamps;
}

describe("frameScaleFromDelta", () => {
  it("preserves legacy renderer behavior when no delta is supplied", () => {
    expect(frameScaleFromDelta()).toBe(1);
  });

  it("keeps motion tied to elapsed time across frame rates", () => {
    expect(frameScaleFromDelta(1 / 60)).toBeCloseTo(1);
    expect(frameScaleFromDelta(1 / 30)).toBeCloseTo(2);
  });

  it("does not advance state for static paints and caps long gaps", () => {
    expect(frameScaleFromDelta(0)).toBe(0);
    expect(frameScaleFromDelta(Number.NaN)).toBe(0);
    expect(frameScaleFromDelta(2)).toBeCloseTo(3);
  });

  it("keeps a 30fps cap stable across floating-point timestamps", () => {
    const interval = 1000 / 30;

    expect(hasFrameIntervalElapsed(16, 0, interval)).toBe(false);
    expect(hasFrameIntervalElapsed(34, 0, interval)).toBe(true);
    expect(hasFrameIntervalElapsed(200, 166.66666666666669, interval)).toBe(true);
  });
});

describe("shouldPresentFrame", () => {
  it("presents every frame at a 60fps target (ungated) so a 60Hz panel never judders", () => {
    // The exact bug that caused the reported glitch: a 16.5ms rAF must NOT be
    // skipped against a 16.67ms interval. Ungating means every vsync presents.
    const interval = 1000 / 60;
    const stamps = vsyncTimestamps(1000 / 60, 240, 0.6);
    let last = 0;
    let presented = 0;
    for (const now of stamps) {
      if (shouldPresentFrame(now, last, interval)) {
        presented += 1;
        last = now;
      }
    }
    expect(presented).toBe(stamps.length);
  });

  it("treats 0 / non-positive targets as always present", () => {
    expect(shouldPresentFrame(1, 0, 0)).toBe(true);
    expect(shouldPresentFrame(5, 0, -1)).toBe(true);
  });

  it("holds a 30fps floor to every-other vsync without dropping to 20fps", () => {
    const interval = 1000 / 30;
    const stamps = vsyncTimestamps(1000 / 60, 240, 0.6); // 60Hz clock
    let last = 0;
    let presented = 0;
    for (const now of stamps) {
      if (shouldPresentFrame(now, last, interval)) {
        presented += 1;
        last = now;
      }
    }
    // ~half of 240 vsyncs; the half-frame tolerance keeps it from slipping to
    // every-third (which the old exact-interval gate risked under jitter).
    expect(presented).toBeGreaterThanOrEqual(112);
    expect(presented).toBeLessThanOrEqual(122);
  });

  it("gates a low 24fps preview cap below its target rate", () => {
    const interval = 1000 / 24;
    // Two rAFs 10ms apart must not both present under a ~41ms target.
    expect(shouldPresentFrame(10, 0, interval)).toBe(false);
    expect(shouldPresentFrame(40, 0, interval)).toBe(true);
  });
});
