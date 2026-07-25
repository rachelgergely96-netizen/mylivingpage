import type { CSSProperties } from "react";
import type { ShareCardVisual } from "@/lib/share-card";

/**
 * A card FINISH is a premium physical-material treatment layered over the
 * theme-derived {@link ShareCardVisual}: the theme still supplies the signature
 * color, the finish supplies the material. "classic" reproduces the original
 * look exactly (so the OG/social image is unchanged until a finish is chosen);
 * "metal" is a brushed black-metal card; "holographic" is an iridescent foil
 * invitation.
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
  holographic: "Holographic",
};

export interface ShareCardFinishTreatment {
  id: ShareCardFinishId;
  outerBackground: string;
  panelBackground: string;
  panelBorder: string;
  panelBoxShadow: string;
  panelRadius: number;
  /** Opacity applied to the underlying per-theme motif so it does not fight the finish. */
  themeArtOpacity: number;
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
  /** Optional rotated specular highlight band (metal). */
  specular: CSSProperties | null;
  /** Optional left-side scrim that protects text legibility (holographic). */
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
  shine: { rotateDeg: number; width: string; background: string } | null;
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

function classicTreatment(visual: ShareCardVisual): ShareCardFinishTreatment {
  return {
    id: "classic",
    outerBackground: visual.background,
    panelBackground: `linear-gradient(138deg, ${visual.gradientFrom} 0%, ${visual.gradientMid} 52%, ${visual.gradientTo} 100%)`,
    panelBorder: `1px solid ${visual.border}`,
    panelBoxShadow: `inset 0 1px 0 rgba(255,255,255,0.07), 0 24px 70px ${visual.glow}`,
    panelRadius: 0,
    themeArtOpacity: 1,
    showGlowOrbs: true,
    text: visual.text,
    textMuted: visual.textMuted,
    accent: visual.accent,
    accentBright: visual.accentBright,
    chromeBorder: visual.border,
    chromeSurface: visual.surface,
    sheets: [],
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
    themeArtOpacity: 0.16,
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
      width: "32%",
      background:
        "linear-gradient(90deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.06) 48%, rgba(255,255,255,0.16) 50%, rgba(255,255,255,0.05) 52%, rgba(255,255,255,0) 60%)",
    },
    nameTextShadow: "0 2px 22px rgba(0,0,0,0.5)",
  };
}

function holographicTreatment(visual: ShareCardVisual): ShareCardFinishTreatment {
  const accent = parseRgb(visual.accent);
  const accentBright = parseRgb(visual.accentBright);
  return {
    id: "holographic",
    outerBackground:
      "linear-gradient(155deg, #0a0c12 0%, #12151f 45%, #0b0e16 100%)",
    panelBackground:
      "linear-gradient(155deg, #0a0c12 0%, #12151f 45%, #0b0e16 100%)",
    panelBorder: "1px solid rgba(255,255,255,0.10)",
    panelBoxShadow: `inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.45), inset 1px 0 0 rgba(255,255,255,0.12), inset -1px 0 0 rgba(180,120,255,0.18), 0 26px 74px ${rgba(accent, 0.32)}`,
    panelRadius: 12,
    themeArtOpacity: 0.24,
    showGlowOrbs: true,
    text: "#f6f7ff",
    textMuted: "rgba(226,230,246,0.72)",
    accent: visual.accentBright,
    accentBright: visual.accentBright,
    chromeBorder: "rgba(255,255,255,0.16)",
    chromeSurface: "rgba(255,255,255,0.06)",
    sheets: [
      // A′ — full-bleed accent wash so the whole foil casts toward the theme
      // color (ember warm, atlas cyan, velvet rose) before the spectrum bands.
      {
        ...FULL_BLEED,
        background: `linear-gradient(155deg, ${rgba(accent, 0.14)} 0%, ${rgba(accent, 0.06)} 45%, rgba(0,0,0,0) 78%)`,
        opacity: 0.9,
      },
      // B — cool wash, accent-led (companion cyan/violet kept as side hues).
      {
        ...FULL_BLEED,
        background: `linear-gradient(118deg, rgba(0,0,0,0) 18%, ${rgba(accent, 0.28)} 38%, rgba(120,220,255,0.14) 52%, rgba(180,120,255,0.10) 68%, rgba(0,0,0,0) 88%)`,
        opacity: 0.62,
      },
      // C — warm cross, accent-led (gold/magenta demoted to flanks).
      {
        ...FULL_BLEED,
        background: `linear-gradient(52deg, rgba(0,0,0,0) 8%, rgba(255,80,180,0.12) 28%, ${rgba(accent, 0.24)} 44%, rgba(255,200,80,0.14) 58%, rgba(0,0,0,0) 82%)`,
        opacity: 0.5,
      },
      // D — fixed spectrum band, subordinate so the theme accent leads.
      {
        ...FULL_BLEED,
        background:
          "linear-gradient(28deg, rgba(0,0,0,0) 24%, rgba(255,72,180,0.18) 37%, rgba(255,210,96,0.15) 43%, rgba(100,240,220,0.19) 50%, rgba(92,176,255,0.2) 57%, rgba(184,108,255,0.18) 64%, rgba(0,0,0,0) 78%)",
        opacity: 0.42,
      },
      // D2 — fine diffraction grooves. At full export resolution these read
      // as foil texture; scaled previews retain a quiet pearlescent grain.
      {
        ...FULL_BLEED,
        background:
          "linear-gradient(112deg, rgba(0,0,0,0) 18%, rgba(255,255,255,0.07) 18.3%, rgba(0,0,0,0) 18.8%, rgba(0,0,0,0) 39%, rgba(120,220,255,0.06) 39.3%, rgba(0,0,0,0) 39.9%, rgba(0,0,0,0) 61%, rgba(255,255,255,0.06) 61.3%, rgba(0,0,0,0) 61.9%, rgba(0,0,0,0) 82%)",
        opacity: 0.32,
      },
      // E — top-left light catch.
      {
        ...FULL_BLEED,
        background: `radial-gradient(ellipse 70% 55% at 18% 12%, rgba(255,255,255,0.16) 0%, ${rgba(accentBright, 0.12)} 35%, rgba(0,0,0,0) 70%)`,
        opacity: 0.45,
      },
    ],
    specular: null,
    bodyScrim: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      width: "62%",
      background:
        "linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.28) 48%, rgba(0,0,0,0) 100%)",
    },
    emblem: "seal",
    signatureSerial: "MLP",
    serialColor: "rgba(230,234,250,0.34)",
    footerBackground: "rgba(8,9,14,0.9)",
    monogramBackground: `linear-gradient(135deg, ${visual.accent}, ${visual.accentBright})`,
    monogramColor: "#06080e",
    avatarBorder: visual.accentBright,
    shine: {
      rotateDeg: 26,
      width: "48%",
      background: `linear-gradient(90deg, rgba(0,0,0,0) 20%, rgba(255,76,184,0.08) 31%, ${rgba(accent, 0.2)} 42%, rgba(255,255,255,0.34) 49%, rgba(130,244,255,0.2) 54%, ${rgba(accentBright, 0.18)} 61%, rgba(190,118,255,0.1) 70%, rgba(0,0,0,0) 82%)`,
    },
    nameTextShadow: "0 2px 22px rgba(0,0,0,0.4)",
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
