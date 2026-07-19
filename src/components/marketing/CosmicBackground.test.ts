import { describe, expect, it } from "vitest";
import {
  buildCosmicLinkBatches,
  COSMIC_BACKGROUND_FRAME_INTERVAL_MS,
  COSMIC_BACKGROUND_MAX_FPS,
  redistributeCosmicPoints,
  shouldPaintCosmicFrame,
} from "@/components/marketing/CosmicBackground";

describe("CosmicBackground helpers", () => {
  it("redistributes particles across an expanded viewport", () => {
    const points = [
      { x: 150, y: 100 },
      { x: 450, y: 300 },
    ];

    redistributeCosmicPoints(points, 600, 400, 1200, 800);

    expect(points).toEqual([
      { x: 300, y: 200 },
      { x: 900, y: 600 },
    ]);
    expect(points.some((point) => point.x > 600)).toBe(true);
  });

  it("redistributes particles when viewport orientation changes", () => {
    const points = [{ x: 900, y: 150 }];

    redistributeCosmicPoints(points, 1200, 600, 600, 1200);

    expect(points).toEqual([{ x: 450, y: 300 }]);
  });

  it("limits animated paints to 30 frames per second", () => {
    expect(COSMIC_BACKGROUND_MAX_FPS).toBe(30);
    expect(COSMIC_BACKGROUND_FRAME_INTERVAL_MS).toBeCloseTo(33.333, 3);
    expect(shouldPaintCosmicFrame(0, null)).toBe(true);
    expect(shouldPaintCosmicFrame(16, 0)).toBe(false);
    expect(shouldPaintCosmicFrame(34, 0)).toBe(true);
    // Floating-point requestAnimationFrame timestamps should not cause the
    // intended every-other-frame paint to drift down toward 20 FPS.
    expect(shouldPaintCosmicFrame(200, 166.66666666666669)).toBe(true);
  });

  it("caps nearby links per point and ignores distant pairs", () => {
    const batches = buildCosmicLinkBatches(
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
        { x: 100, y: 100 },
      ],
      10,
      1,
    );
    const segments = batches.flat();

    expect(segments).toHaveLength(3);
    expect(segments).toContainEqual([0, 0, 1, 0]);
    expect(segments.flat()).not.toContain(100);
  });
});
