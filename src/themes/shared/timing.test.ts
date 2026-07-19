import { describe, expect, it } from "vitest";
import {
  frameScaleFromDelta,
  hasFrameIntervalElapsed,
} from "@/themes/shared/timing";

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
