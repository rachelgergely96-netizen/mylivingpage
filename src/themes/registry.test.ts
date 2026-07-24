import { describe, expect, it } from "vitest";
import { THEME_MAP, THEME_REGISTRY } from "@/themes/registry";
import {
  THEME_CONTENT_PROFILE_IDS,
  THEME_IDS,
  type ThemeId,
} from "@/themes/types";

const SIGNATURE_PRESENTATION_OVERRIDES = {
  aurora: {
    accent: "#82F3D0",
    accentBright: "#D6FFF3",
    accentSoft: "rgba(91, 226, 193, 0.11)",
    accentBorder: "rgba(130, 243, 208, 0.28)",
    scrim:
      "linear-gradient(90deg, rgba(2, 8, 20, 0.7) 0%, rgba(2, 8, 20, 0.42) 50%, rgba(2, 8, 20, 0.12) 100%)",
  },
  atlas: {
    accent: "#67D6FF",
    accentBright: "#C9F3FF",
    accentSoft: "rgba(50, 193, 255, 0.11)",
    accentBorder: "rgba(103, 214, 255, 0.3)",
    scrim:
      "linear-gradient(90deg, rgba(1, 9, 15, 0.76) 0%, rgba(1, 9, 15, 0.5) 47%, rgba(1, 9, 15, 0.1) 100%)",
  },
  velvet: {
    accent: "#E8A7B9",
    accentBright: "#FFD9E2",
    accentSoft: "rgba(232, 117, 151, 0.12)",
    accentBorder: "rgba(244, 168, 190, 0.3)",
    surface: "rgba(30, 7, 18, 0.48)",
    surfaceStrong: "rgba(30, 7, 18, 0.74)",
    scrim:
      "linear-gradient(90deg, rgba(15, 3, 10, 0.7) 0%, rgba(15, 3, 10, 0.42) 50%, rgba(15, 3, 10, 0.2) 100%)",
  },
  quarry: {
    accent: "#E9AF72",
    accentBright: "#FFE0B8",
    accentSoft: "rgba(217, 143, 72, 0.12)",
    accentBorder: "rgba(233, 175, 114, 0.29)",
    scrim:
      "linear-gradient(90deg, rgba(12, 8, 5, 0.72) 0%, rgba(12, 8, 5, 0.4) 52%, rgba(12, 8, 5, 0.14) 100%)",
  },
  atelier: {
    accent: "#A83D2B",
    accentBright: "#3157C8",
    accentSoft: "rgba(230, 111, 85, 0.13)",
    accentBorder: "rgba(24, 22, 27, 0.34)",
    text: "#18161B",
    surface: "rgba(246, 240, 224, 0.76)",
    scrim:
      "linear-gradient(90deg, rgba(232, 223, 207, 0.82) 0%, rgba(232, 223, 207, 0.56) 50%, rgba(232, 223, 207, 0.08) 100%)",
  },
  nocturne: {
    accent: "#C8D4FF",
    accentBright: "#F1F4FF",
    accentSoft: "rgba(151, 171, 255, 0.11)",
    accentBorder: "rgba(200, 212, 255, 0.27)",
    scrim:
      "linear-gradient(90deg, rgba(3, 5, 14, 0.72) 0%, rgba(3, 5, 14, 0.42) 52%, rgba(3, 5, 14, 0.1) 100%)",
  },
} as const;

function backgroundChannels(background: string): string {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(background);
  expect(match).not.toBeNull();
  return (match ?? [])
    .slice(1)
    .map((channel) => Number.parseInt(channel, 16))
    .join(", ");
}

describe("theme registry", () => {
  it("provides a complete presentation model for every theme", () => {
    expect(THEME_REGISTRY).toHaveLength(THEME_IDS.length);

    for (const theme of THEME_REGISTRY) {
      expect(THEME_MAP[theme.id]).toBe(theme);
      expect(Object.values(theme.presentation).every(Boolean)).toBe(true);
      expect(theme.presentation.scrim).toMatch(/gradient\(/);
    }
  });

  it("keeps typography uniform instead of varying it by theme", () => {
    for (const theme of THEME_REGISTRY) {
      expect("headingFont" in theme.presentation).toBe(false);
    }
  });

  it("identifies the redesigned signature set", () => {
    expect(
      THEME_REGISTRY.filter((theme) => theme.signature).map((theme) => theme.id),
    ).toEqual(["aurora", "atlas", "velvet", "quarry", "atelier", "nocturne"]);
  });

  it("assigns every theme its own authored accent family", () => {
    const paletteKeys = THEME_REGISTRY.map(({ presentation }) =>
      JSON.stringify([
        presentation.accent,
        presentation.accentBright,
        presentation.accentSoft,
        presentation.accentBorder,
      ]),
    );

    expect(new Set(paletteKeys).size).toBe(THEME_IDS.length);
  });

  it("assigns every theme an authored content profile", () => {
    const validProfiles = new Set(THEME_CONTENT_PROFILE_IDS);

    for (const theme of THEME_REGISTRY) {
      expect(validProfiles.has(theme.contentProfile)).toBe(true);
    }

    expect(new Set(THEME_REGISTRY.map((theme) => theme.contentProfile))).toEqual(
      validProfiles,
    );
  });

  it("derives non-signature surfaces from each theme background", () => {
    for (const theme of THEME_REGISTRY.filter(({ signature }) => !signature)) {
      const channels = backgroundChannels(theme.background);

      expect(theme.presentation.surface).toBe(`rgba(${channels}, 0.56)`);
      expect(theme.presentation.surfaceStrong).toBe(`rgba(${channels}, 0.8)`);
    }
  });

  it("gives non-signature themes directional content-safe scrims", () => {
    for (const theme of THEME_REGISTRY.filter(({ signature }) => !signature)) {
      const channels = backgroundChannels(theme.background);

      expect(theme.presentation.scrim).toBe(
        `linear-gradient(90deg, rgba(${channels}, 0.8) 0%, rgba(${channels}, 0.52) 50%, rgba(${channels}, 0.12) 100%)`,
      );
    }
  });

  it("preserves the established signature presentation overrides", () => {
    for (const [id, presentation] of Object.entries(
      SIGNATURE_PRESENTATION_OVERRIDES,
    )) {
      expect(THEME_MAP[id as ThemeId].presentation).toMatchObject(presentation);
    }
  });

  it("keeps signature surfaces on their established presentation model", () => {
    expect(THEME_MAP.aurora.presentation.surface).toBe("rgba(7, 9, 20, 0.5)");
    expect(THEME_MAP.atlas.presentation.surface).toBe("rgba(4, 15, 25, 0.5)");
    expect(THEME_MAP.velvet.presentation.surface).toBe("rgba(30, 7, 18, 0.48)");
    expect(THEME_MAP.quarry.presentation.surface).toBe("rgba(19, 13, 9, 0.5)");
    expect(THEME_MAP.atelier.presentation.surface).toBe("rgba(246, 240, 224, 0.76)");
    expect(THEME_MAP.nocturne.presentation.surface).toBe("rgba(7, 9, 20, 0.5)");
  });
});
