import { describe, expect, it } from "vitest";
import { getLoadedRenderer, loadRenderer } from "@/themes/loadRenderer";
import { THEME_IDS, type ThemeId } from "@/themes/types";

describe("loadRenderer", () => {
  it("loads and caches a renderer by theme id", async () => {
    const renderer = await loadRenderer("cosmic");

    expect(typeof renderer).toBe("function");
    expect(getLoadedRenderer("cosmic")).toBe(renderer);
    await expect(loadRenderer("cosmic")).resolves.toBe(renderer);
  });

  it("polishes catalog renderers while preserving bespoke signature renderers", async () => {
    const [{ renderCosmic }, { renderAurora }] = await Promise.all([
      import("@/themes/renderers/cosmic"),
      import("@/themes/renderers/aurora"),
    ]);

    await expect(loadRenderer("cosmic")).resolves.not.toBe(renderCosmic);
    await expect(loadRenderer("aurora")).resolves.toBe(renderAurora);
  });

  it("provides a valid loader and export for every registered theme", async () => {
    const renderers = await Promise.all(THEME_IDS.map((id) => loadRenderer(id)));

    expect(renderers).toHaveLength(THEME_IDS.length);
    expect(renderers.every((renderer) => typeof renderer === "function")).toBe(true);
  });

  it("surfaces a useful error when a renderer chunk cannot load", async () => {
    await expect(loadRenderer("missing-theme" as ThemeId)).rejects.toThrow(
      'Unable to load theme renderer "missing-theme".',
    );
  });
});
