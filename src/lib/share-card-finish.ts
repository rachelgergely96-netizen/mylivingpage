import type { CSSProperties } from "react";
import type { ShareCardVisual } from "@/lib/share-card";

/**
 * A card FINISH is a premium physical-material treatment layered over the
 * theme-derived {@link ShareCardVisual}: the theme still supplies the signature
 * color, the finish supplies the material. "classic" reproduces the original
 * look exactly (so the OG/social image is unchanged until a finish is chosen);
 * "metal" is a brushed black-metal card; "holographic" is the product's
 * transparent acrylic-glass identity card.
 *
 * Every layer here is Satori-safe — absolutely-positioned gradient/box-shadow
 * divs only, no filters, blend modes, or conic gradients — because the same
 * component renders through Satori (OG image), html-to-image (download), and
 * the DOM preview.
 */
export type ShareCardFinishId = "classic" | "metal" | "holographic";

export const SHARE_CARD_FINISHES: ShareCardFinishId[] = [
  "classic",
  "metal",
  "holographic",
];

export const SHARE_CARD_FINISH_LABELS: Record<ShareCardFinishId, string> = {
  classic: "Classic",
  metal: "Metal",
  holographic: "Glass",
};

export interface ShareCardFinishTreatment {
  id: ShareCardFinishId;
  outerBackground: string;
  panelBackground: string;
  panelBorder: string;
  panelBoxShadow: string;
  panelRadius: number;
  /** Opacity applied to the canonical skeleton so it does not fight the finish. */
  skeletonOpacity: number;
  showGlowOrbs: boolean;
  text: string;
  textMuted: string;
  accent: string;
  accentBright: string;
  /** Chip color for pills / hairlines. */
  chromeBorder: string;
  chromeSurface: string;
  /** Full-bleed material sheets rendered above the theme art, below content. */
  sheets: CSSProperties[];
  /**
   * Art on the outer plate BEHIND the panel. Transparency only reads when
   * something visible shows through the glass — and because only the panel
   * tilts, the backdrop also gives the 3D motion true parallax.
   */
  backdropSheets: CSSProperties[];
  /** Optional rotated specular highlight band (metal). */
  specular: CSSProperties | null;
  /** Optional smoked inner laminate that protects text legibility. */
  bodyScrim: CSSProperties | null;
  emblem: "chip" | "seal" | null;
  /** Manufactured bottom edge: a debossed serial line. */
  signatureSerial: string | null;
  serialColor: string;
  /** Footer/QR panel stays opaque so the code and CTA never sit on live foil. */
  footerBackground: string;
  /** Avatar/monogram treatment — metal keeps this platinum, not theme-accent-loud. */
  monogramBackground: string;
  monogramColor: string;
  avatarBorder: string;
  /**
   * A live-preview-only moving glint. Rendered only when the artwork is asked to
   * animate; the PNG/OG export paths omit it entirely so both stay static.
   */
  shine: {
    rotateDeg: number;
    width: string;
    background: string;
    secondaryBackground?: string;
    secondaryWidth?: string;
  } | null;
  nameTextShadow: string;
}

function parseRgb(hex: string): [number, number, number] {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!match) return [125, 211, 252];
  return [
    parseInt(match[1], 16),
    parseInt(match[2], 16),
    parseInt(match[3], 16),
  ];
}

const rgba = (rgb: [number, number, number], alpha: number) =>
  `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;

const FULL_BLEED: CSSProperties = {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

/**
 * Deterministic glitter points for the holographic finish: [left%, top%,
 * size(px), tint]. Fixed positions keep the PNG/OG exports reproducible.
 */
const HOLO_SPARKLES: Array<[number, number, number, string]> = [
  [74, 18, 3, "rgba(255,255,255,0.85)"],
  [83, 34, 2, "rgba(96,225,255,0.8)"],
  [68, 52, 2, "rgba(255,110,224,0.7)"],
  [88, 58, 3, "rgba(255,255,255,0.75)"],
  [79, 74, 2, "rgba(96,225,255,0.7)"],
  [64, 30, 2, "rgba(255,255,255,0.6)"],
  [92, 22, 2, "rgba(255,110,224,0.65)"],
  [71, 86, 2, "rgba(255,255,255,0.65)"],
  [85, 80, 2, "rgba(96,225,255,0.6)"],
  [60, 68, 2, "rgba(255,110,224,0.55)"],
];

function classicTreatment(visual: ShareCardVisual): ShareCardFinishTreatment {
  return {
    id: "classic",
    outerBackground: visual.background,
    panelBackground: `linear-gradient(138deg, ${visual.gradientFrom} 0%, ${visual.gradientMid} 52%, ${visual.gradientTo} 100%)`,
    panelBorder: `1px solid ${visual.border}`,
    panelBoxShadow: `inset 0 1px 0 rgba(255,255,255,0.07), 0 24px 70px ${visual.glow}`,
    panelRadius: 0,
    skeletonOpacity: 1,
    showGlowOrbs: true,
    text: visual.text,
    textMuted: visual.textMuted,
    accent: visual.accent,
    accentBright: visual.accentBright,
    chromeBorder: visual.border,
    chromeSurface: visual.surface,
    sheets: [],
    backdropSheets: [],
    specular: null,
    bodyScrim: null,
    emblem: null,
    signatureSerial: null,
    serialColor: "rgba(255,255,255,0.28)",
    footerBackground: visual.surfaceStrong,
    monogramBackground: `linear-gradient(135deg, ${visual.accent}, ${visual.accentBright})`,
    monogramColor: visual.background,
    avatarBorder: visual.accent,
    shine: null,
    nameTextShadow: visual.lightGround ? "none" : "0 2px 22px rgba(0,0,0,0.34)",
  };
}

function metalTreatment(visual: ShareCardVisual): ShareCardFinishTreatment {
  const accent = parseRgb(visual.accent);
  return {
    id: "metal",
    outerBackground: "#08090b",
    panelBackground:
      "linear-gradient(180deg, #1a1c20 0%, #0c0d10 42%, #14161a 72%, #0a0b0d 100%)",
    panelBorder: "1px solid rgba(255,255,255,0.08)",
    panelBoxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.55), 0 26px 74px rgba(0,0,0,0.6)",
    panelRadius: 12,
    skeletonOpacity: 0.16,
    showGlowOrbs: false,
    text: "#f2f0ea",
    textMuted: "rgba(220,215,200,0.62)",
    accent: visual.accent,
    accentBright: visual.accentBright,
    chromeBorder: "rgba(255,255,255,0.12)",
    chromeSurface: "rgba(255,255,255,0.04)",
    sheets: [
      // Fine milled brush.
      {
        ...FULL_BLEED,
        background:
          "repeating-linear-gradient(90deg, rgba(255,255,255,0.028) 0px, rgba(255,255,255,0.028) 1px, rgba(0,0,0,0.035) 1px, rgba(0,0,0,0.035) 2px, rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 3px)",
        opacity: 0.85,
      },
      // Secondary cross-brush, slight skew — reads milled, not printed.
      {
        ...FULL_BLEED,
        background:
          "repeating-linear-gradient(92deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, rgba(0,0,0,0.03) 1px, rgba(0,0,0,0.03) 2px)",
        opacity: 0.35,
      },
      // A single accent foil hairline down the left edge keeps the theme present.
      {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        width: 3,
        background: rgba(accent, 0.42),
        opacity: 1,
      },
      // A faint accent sheen in the top-right corner — the theme catching the
      // metal without breaking the black-card restraint.
      {
        ...FULL_BLEED,
        background: `radial-gradient(ellipse 55% 50% at 88% 12%, ${rgba(accent, 0.08)} 0%, rgba(0,0,0,0) 65%)`,
        opacity: 1,
      },
    ],
    backdropSheets: [],
    specular: {
      position: "absolute",
      top: "-20%",
      left: "42%",
      width: "38%",
      height: "140%",
      transform: "rotate(24deg)",
      transformOrigin: "center",
      background:
        "linear-gradient(90deg, rgba(255,255,255,0) 28%, rgba(255,255,255,0.07) 48%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.06) 52%, rgba(255,255,255,0) 72%)",
      opacity: 0.55,
    },
    bodyScrim: null,
    emblem: "chip",
    signatureSerial: "MLP",
    serialColor: "rgba(226,222,208,0.32)",
    footerBackground: "rgba(10,11,13,0.92)",
    monogramBackground:
      "linear-gradient(135deg, #dcdce0 0%, #b6b6bc 45%, #8e8e95 100%)",
    monogramColor: "#141518",
    avatarBorder: "rgba(232,232,236,0.55)",
    shine: {
      rotateDeg: 24,
      width: "24%",
      background:
        "linear-gradient(90deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.06) 48%, rgba(255,255,255,0.16) 50%, rgba(255,255,255,0.05) 52%, rgba(255,255,255,0) 60%)",
    },
    nameTextShadow: "0 2px 22px rgba(0,0,0,0.5)",
  };
}

function holographicTreatment(
  visual: ShareCardVisual,
): ShareCardFinishTreatment {
  const accent = parseRgb(visual.accent);
  const accentBright = parseRgb(visual.accentBright);
  return {
    id: "holographic",
    outerBackground: "#050507",
    panelBackground:
      "linear-gradient(145deg, rgba(18,22,30,0.4) 0%, rgba(6,9,14,0.5) 48%, rgba(10,13,19,0.44) 100%)",
    panelBorder: "1px solid rgba(224,238,255,0.36)",
    panelBoxShadow: `inset 0 1px 0 rgba(255,255,255,0.28), inset 1px 0 0 rgba(198,238,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.28), inset -1px 0 0 rgba(255,108,224,0.1), inset 0 0 0 1px rgba(214,232,255,0.06), 0 8px 18px rgba(0,0,0,0.28), 0 28px 64px rgba(0,0,0,0.42), 0 36px 80px ${rgba(accent, 0.1)}`,
    panelRadius: 18,
    skeletonOpacity: 0.4,
    showGlowOrbs: false,
    text: "#f6f7ff",
    textMuted: "rgba(232,237,248,0.86)",
    accent: visual.accent,
    accentBright: visual.accentBright,
    chromeBorder: "rgba(220,235,255,0.2)",
    chromeSurface: "rgba(8,12,18,0.38)",
    backdropSheets: [
      // Theme light pooled on the plate, upper right — half of it passes under
      // the pane so the glass visibly transmits it.
      {
        position: "absolute",
        top: -170,
        right: -120,
        width: 640,
        height: 640,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${rgba(accentBright, 0.5)} 0%, ${rgba(accent, 0.24)} 36%, rgba(0,0,0,0) 70%)`,
      },
      // A cooler pool lower left keeps the pane lit from both sides.
      {
        position: "absolute",
        bottom: -220,
        left: -140,
        width: 600,
        height: 600,
        borderRadius: "50%",
        background: `radial-gradient(circle, rgba(96,225,255,0.26) 0%, ${rgba(accent, 0.14)} 40%, rgba(0,0,0,0) 72%)`,
        opacity: 0.8,
      },
      // A light shaft crossing the stage under the pane.
      {
        position: "absolute",
        top: "-30%",
        left: "30%",
        width: "26%",
        height: "160%",
        transform: "rotate(24deg)",
        transformOrigin: "center",
        background:
          "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0) 100%)",
      },
    ],
    sheets: [
      // Refraction echo: the backdrop pool re-drawn slightly offset inside the
      // pane, as if the glass bends the light passing through it.
      {
        position: "absolute",
        top: -150,
        right: -132,
        width: 620,
        height: 620,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${rgba(accentBright, 0.12)} 0%, ${rgba(accent, 0.06)} 38%, rgba(0,0,0,0) 68%)`,
      },
      // A thin nested rim reads as a refractive acrylic edge rather than a
      // machined metal bevel.
      {
        position: "absolute",
        top: 6,
        right: 6,
        bottom: 6,
        left: 6,
        border: "1px solid rgba(218,235,255,0.14)",
        borderRadius: 12,
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.22)",
      },
      // Theme color occupies the glass volume rather than the outer stage.
      {
        ...FULL_BLEED,
        background: `radial-gradient(ellipse 60% 74% at 82% 24%, ${rgba(accent, 0.13)} 0%, ${rgba(accentBright, 0.07)} 38%, rgba(0,0,0,0) 74%)`,
      },
      // A restrained smoke field keeps the transparent center dimensional.
      {
        ...FULL_BLEED,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 22%, rgba(0,0,0,0.1) 74%, rgba(0,0,0,0.24) 100%)",
      },
      // Full-panel diffraction wash: the spectrum a hologram throws when the
      // light is fixed. Low-alpha linear spectrum (Satori-safe — no conic),
      // strongest in the open glass, dimmed under the reading scrim.
      {
        ...FULL_BLEED,
        background:
          "linear-gradient(112deg, rgba(96,225,255,0.05) 6%, rgba(120,170,255,0.065) 20%, rgba(170,130,255,0.075) 33%, rgba(255,110,224,0.08) 46%, rgba(255,140,160,0.065) 58%, rgba(255,196,120,0.055) 69%, rgba(150,235,150,0.05) 80%, rgba(96,225,255,0.06) 92%)",
        opacity: 0.85,
      },
      // Sparse cyan/theme/magenta refraction stays on the physical edge.
      {
        position: "absolute",
        top: 1,
        right: 18,
        left: 18,
        height: 6,
        background:
          "linear-gradient(90deg, rgba(116,238,255,0.05) 0%, rgba(255,255,255,0.32) 18%, rgba(255,255,255,0.05) 44%, rgba(255,116,220,0.17) 72%, rgba(116,224,255,0.13) 100%)",
        borderRadius: 8,
        opacity: 0.52,
      },
      // The side edge carries a faint prismatic split outside the reading lane.
      {
        position: "absolute",
        top: 18,
        right: 1,
        bottom: 18,
        width: 6,
        background: `linear-gradient(180deg, rgba(116,238,255,0.16) 0%, rgba(255,255,255,0.07) 24%, ${rgba(accentBright, 0.22)} 54%, rgba(255,104,220,0.17) 78%, rgba(255,255,255,0.1) 100%)`,
        borderRadius: 8,
      },
      // Static export-safe specular at the glass rest pose, chromatically
      // split into cyan / white / magenta bands — light through foil. Live
      // previews add a pointer-coupled twin above; PNG and OG stay
      // deterministic.
      {
        ...FULL_BLEED,
        background:
          "linear-gradient(112deg, rgba(0,0,0,0) 50%, rgba(96,225,255,0.09) 60%, rgba(96,225,255,0.02) 66%, rgba(0,0,0,0) 72%)",
        opacity: 0.5,
      },
      {
        ...FULL_BLEED,
        background: `linear-gradient(112deg, rgba(0,0,0,0) 54%, rgba(112,238,255,0.03) 61%, rgba(255,255,255,0.08) 66%, ${rgba(accentBright, 0.055)} 69%, rgba(255,110,220,0.035) 72%, rgba(0,0,0,0) 80%)`,
        opacity: 0.5,
      },
      {
        ...FULL_BLEED,
        background:
          "linear-gradient(112deg, rgba(0,0,0,0) 58%, rgba(255,110,224,0.02) 66%, rgba(255,110,224,0.085) 71%, rgba(0,0,0,0) 78%)",
        opacity: 0.5,
      },
      // Specular sparkle field — deterministic glitter points in the open
      // glass zone, clear of the reading lane.
      ...HOLO_SPARKLES.map(([left, top, size, tint]) => ({
        position: "absolute" as const,
        left: `${left}%`,
        top: `${top}%`,
        width: size,
        height: size,
        background: `radial-gradient(circle, ${tint} 0%, rgba(0,0,0,0) 70%)`,
        opacity: 0.8,
      })),
    ],
    specular: null,
    bodyScrim: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      width: "60%",
      background:
        "linear-gradient(90deg, rgba(3,6,11,0.48) 0%, rgba(3,6,11,0.36) 52%, rgba(3,6,11,0.16) 76%, rgba(3,6,11,0) 100%)",
    },
    emblem: null,
    signatureSerial: "MLP GLASS",
    serialColor: "rgba(214,226,244,0.3)",
    footerBackground:
      "linear-gradient(110deg, rgba(3,7,13,0.84) 0%, rgba(6,11,18,0.8) 68%, rgba(4,8,14,0.88) 100%)",
    monogramBackground: `linear-gradient(145deg, rgba(255,255,255,0.11) 0%, ${rgba(accent, 0.6)} 48%, ${rgba(accentBright, 0.76)} 100%)`,
    monogramColor: "#05070c",
    avatarBorder: "rgba(225,239,255,0.36)",
    shine: {
      rotateDeg: 24,
      width: "28%",
      background: `linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(112,238,255,0.025) 24%, rgba(255,255,255,0.12) 48%, ${rgba(accentBright, 0.09)} 58%, rgba(255,110,220,0.035) 72%, rgba(0,0,0,0) 100%)`,
      secondaryBackground: `linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(112,238,255,0.06) 38%, rgba(255,255,255,0.15) 50%, ${rgba(accent, 0.08)} 60%, rgba(255,110,220,0.045) 70%, rgba(0,0,0,0) 100%)`,
      secondaryWidth: "12%",
    },
    nameTextShadow: "0 2px 10px rgba(0,0,0,0.62), 0 2px 26px rgba(0,0,0,0.4)",
  };
}

export function getShareCardFinish(
  finish: ShareCardFinishId,
  visual: ShareCardVisual,
): ShareCardFinishTreatment {
  if (finish === "metal") return metalTreatment(visual);
  if (finish === "holographic") return holographicTreatment(visual);
  return classicTreatment(visual);
}
