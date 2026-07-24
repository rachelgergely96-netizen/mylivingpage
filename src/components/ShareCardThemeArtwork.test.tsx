import React from "react";
import { ImageResponse } from "next/og";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ShareCardThemeArtwork } from "@/components/ShareCardThemeArtwork";
import {
  SHARE_CARD_PRIMITIVE_IDS,
  THEME_SHARE_CARD_RECIPES,
} from "@/lib/share-card-art";
import { THEME_MAP, THEME_REGISTRY } from "@/themes/registry";
import type { ThemeId } from "@/themes/types";

function artworkProps(themeId: ThemeId) {
  const theme = THEME_MAP[themeId];
  return {
    accent: theme.presentation.accent,
    accentBright: theme.presentation.accentBright,
    background: theme.background,
    border: theme.presentation.border,
    glow: theme.presentation.accentSoft,
    surface: theme.presentation.surface,
    themeId,
  };
}

describe("ShareCardThemeArtwork", () => {
  it("renders portable, static SVG artwork for all 59 themes", () => {
    for (const theme of THEME_REGISTRY) {
      const recipe = THEME_SHARE_CARD_RECIPES[theme.id];
      const markup = renderToStaticMarkup(
        <ShareCardThemeArtwork {...artworkProps(theme.id)} />,
      );

      expect(markup).toContain(`data-share-card-theme="${theme.id}"`);
      expect(markup).toContain(
        `data-share-card-primitive="${recipe.primitive}"`,
      );
      expect(markup).toContain(`data-share-card-frame="${recipe.frame}"`);
      expect(markup).toContain("<svg");
      expect(markup).not.toContain("<style");
      expect(markup).not.toMatch(/animation|transition/i);
    }
  });

  it("renders every primitive family through the Open Graph image engine", async () => {
    const representatives = SHARE_CARD_PRIMITIVE_IDS.map((primitive) => {
      const theme = THEME_REGISTRY.find(
        (candidate) =>
          THEME_SHARE_CARD_RECIPES[candidate.id].primitive === primitive,
      );

      if (!theme) {
        throw new Error(`Missing share-card representative for ${primitive}`);
      }

      return theme;
    });

    const response = new ImageResponse(
      (
        <div
          style={{
            background: "#060913",
            display: "flex",
            flexWrap: "wrap",
            height: "100%",
            width: "100%",
          }}
        >
          {representatives.map((theme) => (
            <div
              key={theme.id}
              style={{
                display: "flex",
                height: 210,
                overflow: "hidden",
                position: "relative",
                width: 300,
              }}
            >
              <ShareCardThemeArtwork {...artworkProps(theme.id)} />
            </div>
          ))}
        </div>
      ),
      { height: 630, width: 1200 },
    );

    expect(response.headers.get("content-type")).toBe("image/png");
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(5_000);
  }, 20_000);
});
