import React from "react";
import { ImageResponse } from "next/og";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ShareCardArtwork } from "@/components/ShareCardArtwork";
import {
  buildShareCardModel,
  getShareCardVisual,
  SHARE_CARD_SIZE,
} from "@/lib/share-card";
import {
  getShareCardFinish,
  SHARE_CARD_FINISHES,
} from "@/lib/share-card-finish";
import type { ThemeId } from "@/themes/types";
import type { ResumeData } from "@/types/resume";

function buildResume(overrides: Partial<ResumeData> = {}): ResumeData {
  return {
    name: "Rachel Gergely",
    headline: "Founder | Attorney | Product Architect",
    location: "New York City & Orlando, Florida",
    email: null,
    linkedin: null,
    github: null,
    website: null,
    avatar_url: null,
    summary: "",
    experience: [],
    education: [],
    projects: [],
    skills: [],
    certifications: [],
    stats: [],
    ...overrides,
  };
}

function buildArtwork(themeId: ThemeId, resume: ResumeData = buildResume()) {
  const model = buildShareCardModel({
    appUrl: "https://www.mylivingpage.com",
    resume,
    slug: "rachel-gergely",
  });
  const visual = getShareCardVisual(themeId);
  const markup = renderToStaticMarkup(
    <ShareCardArtwork
      bodyFontFamily="Arial, sans-serif"
      model={model}
      visual={visual}
    />,
  );

  return { markup, model, visual };
}

function readPngDimensions(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    height: view.getUint32(20),
    width: view.getUint32(16),
  };
}

describe("ShareCardArtwork", () => {
  it("keeps the canonical model and markup locked to 1200 by 630", () => {
    const { markup, model } = buildArtwork("meridian");

    expect(SHARE_CARD_SIZE).toEqual({ width: 1200, height: 630 });
    expect(markup).toContain("height:630px");
    expect(markup).toContain("width:1200px");
    expect(markup).toContain(model.name);
    expect(markup).toContain(model.headline);
    expect(markup).toContain(`@${model.slug}`);
    expect(markup).toContain(model.displayUrl);
    expect(markup).toContain("data-share-card-outer");
    expect(markup).toContain("data-share-card-panel");
    expect(markup).not.toContain("Georgia");
    expect(markup).not.toContain("--font-playfair");
    expect(markup).toContain(`aria-label="QR code for ${model.displayUrl}"`);
  });

  it.each([
    "cosmic",
    "meridian",
    "halo",
    "sakura",
    "aurora",
    "silk",
    "topo",
    "luxe",
    "filigree",
    "atelier",
  ] satisfies ThemeId[])(
    "uses the canonical skeleton with the %s Living Page palette",
    (themeId) => {
      const { markup, visual } = buildArtwork(themeId);

      expect(markup).toContain(`data-share-card-theme-id="${themeId}"`);
      expect(markup).toContain(
        `data-share-card-collection="${visual.collection}"`,
      );
      expect(markup).toContain('data-share-card-skeleton="canonical"');
      expect(markup).toContain(
        'data-share-card-skeleton-layer="circuit-traces"',
      );
      expect(markup).toContain("MyLivingPage / Living Resume");
      expect(markup).not.toContain("data-share-card-primitive");
      expect(markup).not.toContain("data-share-card-frame");
      expect(markup).not.toContain("data-share-card-profile");
      expect(markup).toContain(`share card in the ${visual.themeName} theme`);
    },
  );

  it("inherits the same DM Sans typography contract as the Living Page", () => {
    const model = buildShareCardModel({
      appUrl: "https://www.mylivingpage.com",
      resume: buildResume(),
      slug: "rachel-gergely",
    });
    const markup = renderToStaticMarkup(
      <ShareCardArtwork model={model} visual={getShareCardVisual("cosmic")} />,
    );

    expect(markup).toContain("font-family:var(--font-dm-sans), sans-serif");
    expect(markup).not.toContain("--font-dm-mono");
    expect(markup).not.toContain("--font-playfair");
  });

  it("keeps the glass shell theme-led while protecting text contrast", () => {
    const visual = getShareCardVisual("velvet");
    const treatment = getShareCardFinish("holographic", visual);

    expect(treatment.outerBackground).toBe("#050507");
    expect(treatment.panelBackground).toContain("rgba(18,22,30,0.72)");
    expect(treatment.accent).toBe(visual.accent);
    expect(treatment.accentBright).toBe(visual.accentBright);
    expect(treatment.textMuted).toBe("rgba(232,237,248,0.86)");
    expect(treatment.bodyScrim).toMatchObject({ width: "64%" });
    expect(treatment.bodyScrim?.background).toContain("rgba(3,6,11,0.56)");
    expect(treatment.chromeSurface).toBe("rgba(8,12,18,0.38)");
    expect(treatment.footerBackground).toContain("rgba(3,7,13,0.84)");
    expect(treatment.panelBoxShadow).toContain("inset 0 0 0 1px");
    expect(JSON.stringify(treatment.sheets)).not.toContain(
      "repeating-linear-gradient",
    );
  });

  it.each(SHARE_CARD_FINISHES)(
    "keeps the canonical skeleton mounted in the %s finish",
    (finish) => {
      const model = buildShareCardModel({
        appUrl: "https://www.mylivingpage.com",
        resume: buildResume(),
        slug: "rachel-gergely",
      });
      const markup = renderToStaticMarkup(
        <ShareCardArtwork
          finish={finish}
          model={model}
          visual={getShareCardVisual("velvet")}
        />,
      );

      expect(markup).toContain('data-share-card-skeleton="canonical"');
      expect(markup).toContain(
        'data-share-card-skeleton-layer="circuit-traces"',
      );
      expect(markup).not.toContain("data-share-card-primitive");
    },
  );

  it("keeps long content inside the artwork's declared bounds", () => {
    const longName = "Alexandria Maximiliana Theodora Montgomery-Worthington";
    const longHeadline =
      "Global product transformation leader building trustworthy systems for complex organizations across regulated industries";
    const longLocation =
      "New York City, London, Singapore, and everywhere thoughtful product work happens";
    const longTag =
      "Enterprise product architecture and organizational transformation";
    const { markup, model } = buildArtwork(
      "atelier",
      buildResume({
        headline: longHeadline,
        location: longLocation,
        name: longName,
        skills: [
          {
            category: "Focus",
            items: [
              longTag,
              `${longTag} II`,
              `${longTag} III`,
              `${longTag} IV`,
            ],
          },
        ],
      }),
    );

    expect(model.name.length).toBeLessThanOrEqual(44);
    expect(model.headline.length).toBeLessThanOrEqual(72);
    expect(model.location.length).toBeLessThanOrEqual(42);
    expect(model.nameFontSize).toBe(48);
    expect(model.tags).toHaveLength(4);
    expect(markup).toContain("max-height:124px");
    expect(markup).toContain("max-width:760px");
    expect(markup).toContain("max-height:70px");
    expect(markup).toContain("max-width:360px");
    expect(markup.match(/overflow:hidden/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("uses the shared sharp, quiet-zone-safe QR artwork", () => {
    const { markup, model } = buildArtwork("topo");
    const qrMarkup = markup.slice(markup.indexOf("<div data-share-card-qr"));

    expect(model.qrMatrix).not.toBeNull();
    expect(qrMarkup).toContain("data-share-card-qr");
    expect(qrMarkup).toContain('data-share-card-qr-state="ready"');
    expect(qrMarkup).toContain('shape-rendering="crispEdges"');
    expect(qrMarkup).toContain(
      `viewBox="0 0 ${model.qrMatrix?.length} ${model.qrMatrix?.length}"`,
    );
    expect(qrMarkup).toContain('fill="#0A1628"');
    expect(qrMarkup).not.toContain("rx=");
    expect(qrMarkup).not.toContain("border-radius");
  });

  it("renders the complete canonical card through ImageResponse", async () => {
    const model = buildShareCardModel({
      appUrl: "https://www.mylivingpage.com",
      resume: buildResume({
        skills: [
          {
            category: "Focus",
            items: ["Product Architecture", "Behavioral Systems Design"],
          },
        ],
      }),
      slug: "rachel-gergely",
    });
    const visual = getShareCardVisual("atelier");
    const response = new ImageResponse(
      <ShareCardArtwork
        bodyFontFamily="sans-serif"
        model={model}
        visual={visual}
      />,
      SHARE_CARD_SIZE,
    );
    const bytes = new Uint8Array(await response.arrayBuffer());

    expect(response.headers.get("content-type")).toBe("image/png");
    expect(Array.from(bytes.slice(0, 8))).toEqual([
      137, 80, 78, 71, 13, 10, 26, 10,
    ]);
    expect(readPngDimensions(bytes)).toEqual(SHARE_CARD_SIZE);
    expect(bytes.byteLength).toBeGreaterThan(10_000);
  }, 45_000);

  it("only emits the moving shine when explicitly animated (export paths stay static)", () => {
    const model = buildShareCardModel({
      appUrl: "https://www.mylivingpage.com",
      resume: buildResume(),
      slug: "rachel-gergely",
    });
    const visual = getShareCardVisual("obsidian");

    // Export/OG path (no animatedShine) must contain no animated element.
    const staticMarkup = renderToStaticMarkup(
      <ShareCardArtwork finish="holographic" model={model} visual={visual} />,
    );
    expect(staticMarkup).not.toContain("share-card-glass-ambient");
    expect(staticMarkup).not.toContain("share-card-glass-specular");
    expect(staticMarkup).not.toContain("share-card-glass-caustic");
    expect(staticMarkup).not.toContain("share-card-holo-rainbow");
    expect(staticMarkup).not.toContain("share-card-holo-fringe");
    expect(staticMarkup).not.toContain("data-share-card-light-stage");

    // Live preview opts in.
    const liveMarkup = renderToStaticMarkup(
      <ShareCardArtwork
        animatedShine
        finish="holographic"
        model={model}
        visual={visual}
      />,
    );
    expect(liveMarkup).toContain("share-card-glass-ambient");
    expect(liveMarkup).toContain("share-card-glass-specular");
    expect(liveMarkup).toContain("share-card-glass-caustic");
    expect(liveMarkup).toContain("share-card-holo-rainbow");
    expect(liveMarkup).toContain("share-card-holo-fringe");
    expect(liveMarkup).toContain('data-share-card-glass-shell="acrylic"');
    expect(liveMarkup).toContain("data-share-card-light-stage");

    // Classic has no shine even when animated.
    const classicMarkup = renderToStaticMarkup(
      <ShareCardArtwork
        animatedShine
        finish="classic"
        model={model}
        visual={visual}
      />,
    );
    expect(classicMarkup).not.toContain("share-card-glass-specular");
    expect(classicMarkup).not.toContain("share-card-metal-shine");
    expect(classicMarkup).not.toContain("share-card-glass-caustic");

    const metalMarkup = renderToStaticMarkup(
      <ShareCardArtwork
        animatedShine
        finish="metal"
        model={model}
        visual={visual}
      />,
    );
    expect(metalMarkup).toContain("share-card-metal-shine");
    expect(metalMarkup).not.toContain("share-card-glass-ambient");
    expect(metalMarkup).not.toContain("share-card-glass-caustic");
  });

  it.each(["metal", "holographic"] as const)(
    "renders the %s finish through ImageResponse (Satori-safe)",
    async (finish) => {
      const model = buildShareCardModel({
        appUrl: "https://www.mylivingpage.com",
        resume: buildResume(),
        slug: "rachel-gergely",
      });
      const response = new ImageResponse(
        <ShareCardArtwork
          bodyFontFamily="sans-serif"
          finish={finish}
          model={model}
          visual={getShareCardVisual("obsidian")}
        />,
        SHARE_CARD_SIZE,
      );
      const bytes = new Uint8Array(await response.arrayBuffer());

      expect(response.headers.get("content-type")).toBe("image/png");
      expect(readPngDimensions(bytes)).toEqual(SHARE_CARD_SIZE);
      expect(bytes.byteLength).toBeGreaterThan(10_000);
    },
    45_000,
  );
});
