import { describe, expect, it } from "vitest";
import {
  calculateScrollMotion,
  calculateScrollVelocity,
  createInitialThemeMotionContext,
} from "@/hooks/useLivingMotionBridge";
import {
  clearTransientThemeMotion,
  decayTransientThemeMotion,
  finiteClamp,
  resolveThemeMotion,
} from "@/themes/shared/motion";
import type { ThemeRenderer } from "@/themes/types";

describe("Living Page motion model", () => {
  it("starts finite, neutral, and centered", () => {
    const motion = createInitialThemeMotionContext();

    expect(motion).toMatchObject({
      scrollProgress: 0,
      scrollVelocity: 0,
      activeSection: null,
      focusX: 0.5,
      focusY: 0.5,
      interactionImpulse: 0,
      reducedMotion: false,
    });
    expect(Object.values(motion).filter((value) => typeof value === "number").every(Number.isFinite)).toBe(true);
  });

  it("calculates bounded page and section progress from geometry", () => {
    const snapshot = calculateScrollMotion({
      scrollTop: 750,
      scrollHeight: 2_000,
      viewportHeight: 500,
      viewportTop: 100,
      sections: [
        { id: "summary", top: -100, height: 240 },
        { id: "experience", top: 200, height: 300 },
        { id: "projects", top: 560, height: 320 },
      ],
    });

    expect(snapshot.scrollProgress).toBe(0.5);
    expect(snapshot.activeSection).toBe("experience");
    expect(snapshot.activeSectionIndex).toBe(1);
    expect(snapshot.sectionProgress).toBeCloseTo(0.3667, 3);
  });

  it("handles non-scrollable pages and clamps overscroll", () => {
    expect(
      calculateScrollMotion({
        scrollTop: 20,
        scrollHeight: 400,
        viewportHeight: 500,
        sections: [],
      }).scrollProgress,
    ).toBe(0);
    expect(
      calculateScrollMotion({
        scrollTop: 9_000,
        scrollHeight: 1_000,
        viewportHeight: 500,
        sections: [],
      }).scrollProgress,
    ).toBe(1);
  });

  it("uses visible section ratio with stable DOM-order ties", () => {
    const snapshot = calculateScrollMotion({
      scrollTop: 400,
      scrollHeight: 2_000,
      viewportHeight: 500,
      sections: [
        { id: "experience", top: -400, height: 1_000 },
        { id: "projects", top: 400, height: 100 },
      ],
    });

    expect(snapshot.activeSection).toBe("projects");
  });

  it("reports signed viewport velocity and caps extreme input", () => {
    expect(calculateScrollVelocity(250, 100, 100, 500)).toBe(3);
    expect(calculateScrollVelocity(0, 500, 10, 500)).toBe(-4);
    expect(calculateScrollVelocity(100, 0, 0, 500)).toBe(0);
  });

  it("sanitizes renderer input and neutralizes transients for reduced motion", () => {
    const motion = createInitialThemeMotionContext();
    motion.scrollProgress = Number.NaN;
    motion.scrollVelocity = 4;
    motion.interactionImpulse = 1;
    motion.pointerSpeed = Number.POSITIVE_INFINITY;
    motion.focusedItem = "project-example";
    motion.reducedMotion = true;

    expect(resolveThemeMotion(motion)).toMatchObject({
      scrollProgress: 0,
      scrollVelocity: 0,
      hasFocus: true,
      interactionImpulse: 0,
      pointerSpeed: 0,
    });
    expect(finiteClamp(Number.NaN, -1, 1, 0.5)).toBe(0.5);
  });

  it("decays motion by elapsed time and can clear it immediately", () => {
    const motion = createInitialThemeMotionContext();
    motion.scrollVelocity = 2;
    motion.scrollDirection = 1;
    motion.pointerVelocityX = 2;
    motion.pointerVelocityY = -1;
    motion.pointerSpeed = 2.2;
    motion.interactionImpulse = 1;

    decayTransientThemeMotion(motion, 0.1);
    expect(motion.scrollVelocity).toBeGreaterThan(0);
    expect(motion.scrollVelocity).toBeLessThan(2);
    expect(motion.interactionImpulse).toBeGreaterThan(0);
    expect(motion.interactionImpulse).toBeLessThan(1);

    clearTransientThemeMotion(motion);
    expect(motion).toMatchObject({
      scrollVelocity: 0,
      scrollDirection: 0,
      pointerVelocityX: 0,
      pointerVelocityY: 0,
      pointerSpeed: 0,
      interactionImpulse: 0,
    });
  });

  it("keeps legacy seven-argument renderers assignable", () => {
    const legacyRenderer: ThemeRenderer = (
      _ctx,
      _width,
      _height,
      _time,
      _mouseX,
      _mouseY,
      _deltaSeconds,
    ) => undefined;

    expect(legacyRenderer).toBeTypeOf("function");
  });
});
