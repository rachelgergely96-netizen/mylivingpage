import { describe, expect, it } from "vitest";
import {
  MOTION_DURATIONS_MS,
  MOTION_EASINGS,
  MOTION_EVENT_SIGNALS,
  MOTION_EVENTS,
  MOTION_MODE_POLICIES,
  MOTION_OPACITY,
  MOTION_SIGNALS,
  parseMotionPreference,
  resolveMotionDistance,
  resolveMotionDuration,
  resolveMotionMode,
} from "@/lib/motion";

describe("shared motion contract", () => {
  it("keeps the approved tokens and semantic names stable", () => {
    expect(MOTION_DURATIONS_MS).toEqual({
      instant: 0,
      micro: 120,
      standard: 220,
      context: 380,
    });
    expect(MOTION_EASINGS).toEqual({
      enter: "cubic-bezier(.16,1,.3,1)",
      standard: "cubic-bezier(.2,0,0,1)",
      exit: "cubic-bezier(.4,0,1,1)",
    });
    expect(MOTION_OPACITY).toEqual({ muted: 0.72, confirm: 0.99 });
    expect(Object.values(MOTION_EVENTS)).toEqual([
      "resume.import.fact.detected",
      "resume.import.review.required",
      "resume.pdf.preview.ready",
      "editor.field.changed",
      "editor.save.confirmed",
      "theme.selection.changed",
      "example.context.changed",
      "page.chapter.entered",
      "page.publish.confirmed",
      "share.artifact.ready",
      "analytics.first_view.detected",
      "analytics.range.updated",
    ]);
    expect(Object.values(MOTION_SIGNALS)).toEqual([
      "truth-transfer",
      "review-gate",
      "edit-to-proof",
      "style-dialect",
      "career-chapters",
      "share-handoff",
    ]);
    expect(MOTION_EVENT_SIGNALS).toEqual({
      "resume.import.fact.detected": "truth-transfer",
      "resume.import.review.required": "review-gate",
      "resume.pdf.preview.ready": "edit-to-proof",
      "editor.field.changed": "edit-to-proof",
      "editor.save.confirmed": "edit-to-proof",
      "theme.selection.changed": "style-dialect",
      "example.context.changed": "career-chapters",
      "page.chapter.entered": "career-chapters",
      "page.publish.confirmed": "share-handoff",
      "share.artifact.ready": "share-handoff",
      "analytics.first_view.detected": "share-handoff",
      "analytics.range.updated": "edit-to-proof",
    });
  });

  it("follows the system only when there is no explicit preference", () => {
    expect(parseMotionPreference(null)).toBe("system");
    expect(parseMotionPreference("unexpected")).toBe("system");
    expect(parseMotionPreference("calm")).toBe("calm");
    expect(resolveMotionMode("system", false)).toBe("full");
    expect(resolveMotionMode("system", true)).toBe("still");
    expect(resolveMotionMode("full", true)).toBe("full");
    expect(resolveMotionMode("calm", true)).toBe("calm");
  });

  it("keeps Calm loop-free and Still immediate and deterministic", () => {
    expect(MOTION_MODE_POLICIES.calm).toMatchObject({
      allowsAmbientMotion: false,
      allowsContinuousMotion: false,
      defaultDurationMs: 120,
      maxDurationMs: 180,
      maxDistancePx: 4,
      pointerScale: 0,
      impulseScale: 0,
    });
    expect(MOTION_MODE_POLICIES.still).toMatchObject({
      allowsAmbientMotion: false,
      allowsContinuousMotion: false,
      allowsViewTransitions: false,
      deterministicFrame: true,
      defaultDurationMs: 0,
      maxDurationMs: 0,
      maxDistancePx: 0,
    });
    expect(resolveMotionDuration("context", "calm")).toBe(180);
    expect(resolveMotionDuration("standard", "still")).toBe(0);
  });

  it("reserves 32px travel for Full marketing motion", () => {
    expect(resolveMotionDistance("marketing", "full", "marketing")).toBe(32);
    expect(resolveMotionDistance("marketing", "full", "public")).toBe(12);
    expect(resolveMotionDistance("marketing", "calm", "marketing")).toBe(4);
    expect(resolveMotionDistance("standard", "still", "marketing")).toBe(0);
  });
});
