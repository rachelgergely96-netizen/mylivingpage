import { describe, expect, it } from "vitest";
import { THEME_MAP, THEME_REGISTRY } from "@/themes/registry";
import { THEME_IDS } from "@/themes/types";

describe("theme registry", () => {
  it("provides a complete presentation model for every theme", () => {
    expect(THEME_REGISTRY).toHaveLength(THEME_IDS.length);

    for (const theme of THEME_REGISTRY) {
      expect(THEME_MAP[theme.id]).toBe(theme);
      expect(Object.values(theme.presentation).every(Boolean)).toBe(true);
      expect(theme.presentation.scrim).toMatch(/gradient\(/);
    }
  });

  it("identifies the redesigned signature set", () => {
    expect(
      THEME_REGISTRY.filter((theme) => theme.signature).map((theme) => theme.id),
    ).toEqual(["aurora", "atlas", "velvet", "quarry", "atelier", "nocturne"]);
  });
});
