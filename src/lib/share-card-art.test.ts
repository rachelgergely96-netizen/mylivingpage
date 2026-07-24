import { describe, expect, it } from "vitest";
import {
  SHARE_CARD_ART_ANCHOR_IDS,
  SHARE_CARD_FRAME_IDS,
  SHARE_CARD_PRIMITIVE_IDS,
  THEME_SHARE_CARD_RECIPES,
  getThemeShareCardRecipe,
} from "@/lib/share-card-art";
import { THEME_IDS } from "@/themes/types";

describe("theme share-card artwork recipes", () => {
  it("requires an intentional, correctly keyed recipe for every theme", () => {
    expect(Object.keys(THEME_SHARE_CARD_RECIPES)).toEqual([...THEME_IDS]);

    for (const themeId of THEME_IDS) {
      const recipe = getThemeShareCardRecipe(themeId);

      expect(recipe.themeId).toBe(themeId);
      expect(SHARE_CARD_PRIMITIVE_IDS).toContain(recipe.primitive);
      expect(SHARE_CARD_FRAME_IDS).toContain(recipe.frame);
      expect(SHARE_CARD_ART_ANCHOR_IDS).toContain(recipe.anchor);
      expect(recipe.density).toBeGreaterThanOrEqual(1);
      expect(recipe.density).toBeLessThanOrEqual(3);
      expect(recipe.scale).toBeGreaterThan(0);
      expect(recipe.opacity).toBeGreaterThan(0);
      expect(recipe.opacity).toBeLessThanOrEqual(1);
    }
  });

  it("uses the complete portable primitive and frame vocabulary", () => {
    const recipes = Object.values(THEME_SHARE_CARD_RECIPES);
    const usedPrimitives = new Set(
      recipes.flatMap((recipe) =>
        recipe.secondaryPrimitive
          ? [recipe.primitive, recipe.secondaryPrimitive]
          : [recipe.primitive],
      ),
    );
    const usedFrames = new Set(recipes.map((recipe) => recipe.frame));

    expect(usedPrimitives).toEqual(new Set(SHARE_CARD_PRIMITIVE_IDS));
    expect(usedFrames).toEqual(new Set(SHARE_CARD_FRAME_IDS));
  });

  it("keeps every theme recipe structurally distinct without embedding colors", () => {
    const signatures = Object.values(THEME_SHARE_CARD_RECIPES).map(
      ({ themeId: _themeId, ...recipe }) => JSON.stringify(recipe),
    );

    expect(new Set(signatures).size).toBe(THEME_IDS.length);
    expect(JSON.stringify(THEME_SHARE_CARD_RECIPES)).not.toMatch(
      /#[0-9a-f]{3,8}|rgba?\(|hsla?\(/i,
    );
  });
});
