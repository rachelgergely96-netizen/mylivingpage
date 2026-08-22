import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ThemePicker from "@/components/ThemePicker";
import { THEME_REGISTRY } from "@/themes/registry";

vi.mock("@/components/ThemeCanvas", () => ({
  default: ({ themeId }: { themeId: string }) => (
    <div data-theme-canvas={themeId} />
  ),
}));

describe("ThemePicker", () => {
  it("loads only the selected renderer on the initial render", () => {
    const themes = THEME_REGISTRY.slice(0, 3);
    const selectedThemeId = themes[1].id;
    const markup = renderToStaticMarkup(
      <ThemePicker
        themes={themes}
        selectedThemeId={selectedThemeId}
        onSelectTheme={vi.fn()}
        premium
      />,
    );

    expect(markup.match(/data-theme-canvas=/g)).toHaveLength(1);
    expect(markup).toContain(`data-theme-canvas="${selectedThemeId}"`);
    expect(markup.match(/data-theme-preview-static=/g)).toHaveLength(2);
    expect(markup).toContain("role=\"radiogroup\"");
    expect(markup.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(markup).toContain("data-theme-preview-selected=\"true\"");
    expect(markup).toContain("class=\"theme-picker-preview\"");
    expect(markup).toContain("data-theme-picker");
    expect(markup).toContain("data-theme-selection-status");
    expect(markup).not.toContain("theme.selection.changed");
    expect(markup).not.toContain("data-motion-target=");
  });

  it("can open on the selected theme collection instead of the full catalog", () => {
    const selectedTheme = THEME_REGISTRY.find(
      (theme) => theme.collection === "cinematic",
    );
    const outsideTheme = THEME_REGISTRY.find(
      (theme) => theme.collection !== "cinematic",
    );

    expect(selectedTheme).toBeDefined();
    expect(outsideTheme).toBeDefined();

    const markup = renderToStaticMarkup(
      <ThemePicker
        themes={THEME_REGISTRY}
        selectedThemeId={selectedTheme!.id}
        onSelectTheme={vi.fn()}
        initialCollection="cinematic"
        premium
      />,
    );

    expect(markup).toContain(`data-theme-preview="${selectedTheme!.id}"`);
    expect(markup).not.toContain(`data-theme-preview="${outsideTheme!.id}"`);
  });
});
