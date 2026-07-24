import { describe, expect, it } from "vitest";
import { createMotionSampler, smoothingFactor } from "./smoothing";
import type { ThemeMotionContext } from "../types";

function liveMotion(overrides: Partial<ThemeMotionContext> = {}): ThemeMotionContext {
  return {
    scrollProgress: 0,
    scrollVelocity: 0,
    scrollDirection: 0,
    activeSection: null,
    activeSectionIndex: 0,
    sectionCount: 0,
    sectionProgress: 0,
    focusedItem: null,
    focusKind: null,
    focusX: 0.5,
    focusY: 0.5,
    interactionImpulse: 0,
    pointerVelocityX: 0,
    pointerVelocityY: 0,
    pointerSpeed: 0,
    reducedMotion: false,
    ...overrides,
  };
}

describe("smoothingFactor", () => {
  it("is framerate independent: two half steps equal one full step", () => {
    let oneStep = 0;
    oneStep += (1 - oneStep) * smoothingFactor(0.1, 0.12);
    let twoSteps = 0;
    twoSteps += (1 - twoSteps) * smoothingFactor(0.05, 0.12);
    twoSteps += (1 - twoSteps) * smoothingFactor(0.05, 0.12);
    expect(twoSteps).toBeCloseTo(oneStep, 10);
  });

  it("returns 0 for a zero step and 1 for a degenerate time constant", () => {
    expect(smoothingFactor(0, 0.12)).toBe(0);
    expect(smoothingFactor(0.016, 0)).toBe(1);
  });
});

describe("createMotionSampler", () => {
  it("glides the pointer toward the target instead of jumping", () => {
    const sampler = createMotionSampler(0, 0);
    sampler.setPointerTarget(1, 1);
    sampler.step(undefined, 1 / 60);
    // A whole-canvas jump fast-tracks but still lands short of the target.
    expect(sampler.pointer.x).toBeGreaterThan(0.2);
    expect(sampler.pointer.x).toBeLessThan(0.6);
    for (let index = 0; index < 120; index += 1) {
      sampler.step(undefined, 1 / 60);
    }
    expect(sampler.pointer.x).toBeGreaterThan(0.99);
  });

  it("snapPointer moves the sample immediately", () => {
    const sampler = createMotionSampler(0, 0);
    sampler.snapPointer(0.8, 0.6);
    expect(sampler.pointer.x).toBeCloseTo(0.8);
    expect(sampler.pointer.y).toBeCloseTo(0.6);
  });

  it("smooths scroll progress with lag but keeps discrete fields exact", () => {
    const sampler = createMotionSampler();
    sampler.step(liveMotion({ scrollProgress: 0 }), 1 / 60);
    const smoothed = sampler.step(
      liveMotion({
        scrollProgress: 0.1,
        activeSection: "experience",
        interactionImpulse: 0.7,
      }),
      1 / 60,
    );
    expect(smoothed).toBeDefined();
    expect(smoothed!.scrollProgress).toBeGreaterThan(0);
    expect(smoothed!.scrollProgress).toBeLessThan(0.1);
    expect(smoothed!.activeSection).toBe("experience");
    expect(smoothed!.interactionImpulse).toBe(0.7);
  });

  it("keeps story position continuous across a section boundary", () => {
    const sampler = createMotionSampler();
    sampler.step(
      liveMotion({ sectionCount: 4, activeSectionIndex: 1, sectionProgress: 0.95 }),
      1 / 60,
    );
    const smoothed = sampler.step(
      liveMotion({ sectionCount: 4, activeSectionIndex: 2, sectionProgress: 0.05 }),
      1 / 60,
    );
    const story =
      (smoothed!.activeSectionIndex + smoothed!.sectionProgress) / 4;
    expect(story).toBeGreaterThan(1.9 / 4);
    expect(story).toBeLessThan(2.1 / 4);
  });

  it("snaps story position on jump navigation instead of gliding", () => {
    const sampler = createMotionSampler();
    sampler.step(
      liveMotion({ sectionCount: 6, activeSectionIndex: 0, sectionProgress: 0 }),
      1 / 60,
    );
    const smoothed = sampler.step(
      liveMotion({ sectionCount: 6, activeSectionIndex: 5, sectionProgress: 0.4 }),
      1 / 60,
    );
    expect(smoothed!.activeSectionIndex).toBe(5);
    expect(smoothed!.sectionProgress).toBeCloseTo(0.4, 5);
  });

  it("passes targets through unsmoothed when reduced motion is set", () => {
    const sampler = createMotionSampler(0, 0);
    sampler.setPointerTarget(1, 1);
    const smoothed = sampler.step(
      liveMotion({ reducedMotion: true, scrollProgress: 0.6, focusX: 0.9 }),
      1 / 60,
    );
    expect(sampler.pointer.x).toBe(1);
    expect(smoothed!.scrollProgress).toBeCloseTo(0.6);
    expect(smoothed!.focusX).toBeCloseTo(0.9);
    expect(smoothed!.pointerSpeed).toBe(0);
  });

  it("derives pointer velocity from the smoothed path and settles to zero", () => {
    const sampler = createMotionSampler(0, 0.5);
    sampler.setPointerTarget(1, 0.5);
    const early = sampler.step(liveMotion(), 1 / 60);
    expect(early!.pointerVelocityX).toBeGreaterThan(0);
    for (let index = 0; index < 240; index += 1) {
      sampler.step(liveMotion(), 1 / 60);
    }
    const settled = sampler.step(liveMotion(), 1 / 60);
    expect(Math.abs(settled!.pointerVelocityX)).toBeLessThan(0.05);
  });
});
