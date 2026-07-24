import React from "react";
import { ImageResponse } from "next/og";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ShareCardProfileMark } from "@/components/ShareCardProfileMark";
import { getShareCardVisual } from "@/lib/share-card";
import { THEME_REGISTRY } from "@/themes/registry";

describe("ShareCardProfileMark", () => {
  it("renders every theme motif as portable inline SVG", () => {
    for (const theme of THEME_REGISTRY) {
      const visual = getShareCardVisual(theme.id);
      const markup = renderToStaticMarkup(
        <ShareCardProfileMark
          accent={visual.accent}
          motif={visual.motif}
        />,
      );

      expect(markup).toContain(`data-share-card-profile="${visual.motif}"`);
      expect(markup).toContain("<svg");
      expect(markup).not.toContain("<span");
    }
  });

  it("renders every unique motif through the Open Graph image engine", async () => {
    const visuals = Array.from(
      new Map(
        THEME_REGISTRY.map((theme) => {
          const visual = getShareCardVisual(theme.id);
          return [visual.motif, visual] as const;
        }),
      ).values(),
    );
    const response = new ImageResponse(
      (
        <div
          style={{
            alignItems: "center",
            background: "#07111C",
            display: "flex",
            gap: 10,
            height: "100%",
            padding: 12,
            width: "100%",
          }}
        >
          {visuals.map((visual) => (
            <ShareCardProfileMark
              key={visual.motif}
              accent={visual.accent}
              motif={visual.motif}
              style={{ position: "relative" }}
            />
          ))}
        </div>
      ),
      { height: 96, width: 900 },
    );

    expect(response.headers.get("content-type")).toBe("image/png");
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(1_000);
  });
});
