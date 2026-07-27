import { describe, expect, it, vi } from "vitest";
import { THEME_MAP, THEME_REGISTRY } from "@/themes/registry";
import {
  getWorldPolishProfile,
  hashThemeId,
  withWorldPolish,
} from "@/themes/shared/worldPolish";
import type { ThemeMotionContext, ThemeRenderer } from "@/themes/types";

function createCanvasContext() {
  const gradient = () => ({ addColorStop: vi.fn() });
  const context = {
    arc: vi.fn(),
    beginPath: vi.fn(),
    bezierCurveTo: vi.fn(),
    createLinearGradient: vi.fn(gradient),
    createRadialGradient: vi.fn(gradient),
    ellipse: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    lineCap: "butt",
    lineWidth: 1,
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    restore: vi.fn(),
    rotate: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    setLineDash: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
    strokeStyle: "#000",
    fillStyle: "#000",
    translate: vi.fn(),
  };

  return context as unknown as CanvasRenderingContext2D;
}

const MOTION: ThemeMotionContext = {
  scrollProgress: 0.54,
  scrollVelocity: 0.8,
  scrollDirection: 1,
  activeSection: "projects",
  activeSectionIndex: 4,
  sectionCount: 8,
  sectionProgress: 0.3,
  focusedItem: "project-1",
  focusKind: "project",
  focusX: 0.72,
  focusY: 0.46,
  interactionImpulse: 0.7,
  pointerVelocityX: 0.2,
  pointerVelocityY: -0.1,
  pointerSpeed: 0.3,
  reducedMotion: false,
};

describe("world polish", () => {
  it("gives every theme a stable, unique spatial seed", () => {
    const seeds = THEME_REGISTRY.map((theme) => hashThemeId(theme.id));

    expect(new Set(seeds).size).toBe(THEME_REGISTRY.length);
    expect(hashThemeId("cosmic")).toBe(hashThemeId("cosmic"));
  });

  it("maps every collection to a bounded, deterministic motif profile", () => {
    const motifs = new Set(
      THEME_REGISTRY.map((theme) => getWorldPolishProfile(theme).motif),
    );

    expect(motifs).toEqual(
      new Set([
        "cinematic-orbit",
        "editorial-ribbon",
        "experimental-frame",
        "material-contour",
        "technical-grid",
      ]),
    );

    for (const theme of THEME_REGISTRY) {
      const profile = getWorldPolishProfile(theme);
      expect(profile.anchorX).toBeGreaterThanOrEqual(0.66);
      expect(profile.anchorX).toBeLessThanOrEqual(0.82);
      expect(profile.anchorY).toBeGreaterThanOrEqual(0.28);
      expect(profile.anchorY).toBeLessThanOrEqual(0.48);
      expect(profile.depthStrength).toBeGreaterThanOrEqual(0.7);
      expect(profile.depthStrength).toBeLessThanOrEqual(1);
    }
  });

  it("gives every material language calm, deterministic depth", () => {
    const expectedDepth = {
      refractive: 0.7,
      "organic-glass": 0.74,
      engraved: 0.72,
    } as const;

    for (const theme of THEME_REGISTRY) {
      expect(getWorldPolishProfile(theme).depthStrength).toBe(
        expectedDepth[theme.materialProfile],
      );
    }
  });

  it("covers every theme while preserving only authored signature and bespoke worlds", () => {
    const renderer = vi.fn() as unknown as ThemeRenderer;
    const preservedIds: string[] = [];
    const polishedIds: string[] = [];

    for (const theme of THEME_REGISTRY) {
      const result = withWorldPolish(theme, renderer);
      if (result === renderer) preservedIds.push(theme.id);
      else polishedIds.push(theme.id);
    }

    expect(preservedIds).toEqual([
      "aurora",
      "sakura",
      "luxe",
      "atlas",
      "velvet",
      "quarry",
      "atelier",
      "filigree",
      "solstice",
      "axiom",
      "nocturne",
    ]);
    expect(polishedIds).toHaveLength(THEME_REGISTRY.length - preservedIds.length);
  });

  it("adds bounded motif and focus drawing after a catalog renderer", () => {
    const context = createCanvasContext();
    const renderer = vi.fn() as unknown as ThemeRenderer;
    const polished = withWorldPolish(THEME_MAP.cosmic, renderer);

    polished(context, 800, 600, 4, 0.6, 0.4, 1 / 30, MOTION);

    expect(renderer).toHaveBeenCalledWith(
      context,
      800,
      600,
      4,
      0.6,
      0.4,
      1 / 30,
      MOTION,
    );
    expect(context.save).toHaveBeenCalled();
    expect(context.restore).toHaveBeenCalledTimes(
      vi.mocked(context.save).mock.calls.length,
    );
    expect(context.createRadialGradient).toHaveBeenCalled();
    expect(context.createLinearGradient).toHaveBeenCalled();
    expect(context.quadraticCurveTo).toHaveBeenCalled();
  });

  it("restores canvas state when a renderer fails", () => {
    const context = createCanvasContext();
    const renderer = vi.fn(() => {
      throw new Error("renderer failed");
    }) as unknown as ThemeRenderer;
    const polished = withWorldPolish(THEME_MAP.cosmic, renderer);

    expect(() => polished(context, 800, 600, 0, 0.5, 0.5)).toThrow(
      "renderer failed",
    );
    expect(context.save).toHaveBeenCalledTimes(1);
    expect(context.restore).toHaveBeenCalledTimes(1);
  });
});
