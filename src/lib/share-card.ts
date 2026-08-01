import qrcode from "qrcode-generator";
import { getTheme, THEME_MAP } from "@/themes/registry";
import type {
  ThemeCollectionId,
  ThemeContentProfileId,
  ThemeId,
} from "@/themes/types";
import type { ResumeData } from "@/types/resume";

interface ShareCardGradient {
  accent: string;
  glow: string;
  gradientFrom: string;
  gradientMid: string;
  gradientTo: string;
}

export type ShareCardMotifId =
  | ThemeContentProfileId
  | "bearing"
  | "curtain"
  | "orbit"
  | "petal"
  | "contour"
  | "weave";

export interface ShareCardVisual extends ShareCardGradient {
  accentBright: string;
  background: string;
  border: string;
  collection: ThemeCollectionId;
  contentProfile: ThemeContentProfileId;
  lightGround: boolean;
  motif: ShareCardMotifId;
  surface: string;
  surfaceStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  themeId: ThemeId;
  themeName: string;
  themeVibe: string;
}

export const SHARE_CARD_SIZE = {
  height: 630,
  width: 1200,
} as const;

export interface ShareCardModel {
  avatarUrl: string | null;
  displayUrl: string;
  firstName: string;
  headline: string;
  initial: string;
  livePageUrl: string;
  location: string;
  name: string;
  nameFontSize: number;
  qrMatrix: boolean[][] | null;
  slug: string;
  tags: string[];
}

interface BuildShareCardModelOptions {
  appUrl: string;
  liveUrl?: string;
  resume: ResumeData;
  slug: string;
}

const SHARE_CARD_THEME_MOTIFS: Partial<Record<ThemeId, ShareCardMotifId>> = {
  aurora: "curtain",
  halo: "orbit",
  meridian: "bearing",
  sakura: "petal",
  silk: "weave",
  topo: "contour",
};

export function normalizeAppUrl(url?: string): string {
  return (url ?? "https://www.mylivingpage.com").replace(/\/+$/, "");
}

export function truncate(value: string | null | undefined, maxChars: number): string {
  if (!value) return "";
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

export function toDisplayDomainUrl(url: string, slug: string): string {
  const host = normalizeAppUrl(url).replace(/^https?:\/\//, "");
  return `${host}/${slug}`;
}

export function toLivePageUrl(appUrl: string, slug: string): string {
  return `${normalizeAppUrl(appUrl)}/${slug}`;
}

export function buildQrMatrix(value: string, margin = 4): boolean[][] | null {
  try {
    const qr = qrcode(0, "H");
    qr.addData(value, "Byte");
    qr.make();

    const moduleCount = qr.getModuleCount();
    return Array.from({ length: moduleCount + margin * 2 }, (_, row) =>
      Array.from({ length: moduleCount + margin * 2 }, (_, col) => {
        const qrRow = row - margin;
        const qrCol = col - margin;
        if (qrRow < 0 || qrCol < 0 || qrRow >= moduleCount || qrCol >= moduleCount) {
          return false;
        }
        return qr.isDark(qrRow, qrCol);
      }),
    );
  } catch {
    return null;
  }
}

export function buildQrDataUrl(value: string): string | null {
  try {
    const matrix = buildQrMatrix(value);
    if (!matrix?.length) {
      return null;
    }

    const cellSize = 5;
    const side = matrix.length * cellSize;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${side}" height="${side}" viewBox="0 0 ${side} ${side}" fill="none">`;
    svg += `<rect width="${side}" height="${side}" fill="#FFFFFF"/>`;
    svg += `<g fill="#0A1628">`;

    for (let row = 0; row < matrix.length; row += 1) {
      for (let col = 0; col < matrix.length; col += 1) {
        if (!matrix[row]?.[col]) continue;
        const x = col * cellSize;
        const y = row * cellSize;
        svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" />`;
      }
    }

    svg += "</g></svg>";
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  } catch {
    return null;
  }
}

function parseHexColor(value: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const color = Number.parseInt(match[1], 16);
  return [(color >> 16) & 255, (color >> 8) & 255, color & 255];
}

function toHexColor(red: number, green: number, blue: number): string {
  return `#${[red, green, blue]
    .map((channel) =>
      Math.round(Math.min(255, Math.max(0, channel)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function mixHexColors(from: string, to: string, amount: number): string {
  const start = parseHexColor(from);
  const end = parseHexColor(to);
  if (!start || !end) return from;
  const weight = Math.min(1, Math.max(0, amount));
  return toHexColor(
    start[0] + (end[0] - start[0]) * weight,
    start[1] + (end[1] - start[1]) * weight,
    start[2] + (end[2] - start[2]) * weight,
  );
}

function withAlpha(color: string, alpha: number, fallback: string): string {
  const channels = parseHexColor(color);
  if (!channels) return fallback;
  return `rgba(${channels[0]},${channels[1]},${channels[2]},${alpha})`;
}

function isLightColor(color: string): boolean {
  const channels = parseHexColor(color);
  if (!channels) return false;
  return (
    channels[0] * 0.299 + channels[1] * 0.587 + channels[2] * 0.114 > 130
  );
}

export function getShareCardVisual(themeId: string): ShareCardVisual {
  const theme = getTheme(themeId) ?? THEME_MAP.cosmic;
  const lightGround = isLightColor(theme.background);
  const gradients = lightGround
    ? {
        gradientFrom: mixHexColors(theme.background, "#FFFFFF", 0.1),
        gradientMid: mixHexColors(theme.background, theme.presentation.accent, 0.1),
        gradientTo: mixHexColors(theme.background, "#000000", 0.06),
      }
    : {
        gradientFrom: mixHexColors(
          theme.background,
          theme.presentation.accent,
          0.08,
        ),
        gradientMid: mixHexColors(
          theme.background,
          theme.presentation.accent,
          0.16,
        ),
        gradientTo: mixHexColors(theme.background, "#000000", 0.22),
      };

  return {
    ...gradients,
    accent: theme.presentation.accent,
    accentBright: theme.presentation.accentBright,
    background: theme.background,
    border: theme.presentation.border,
    collection: theme.collection,
    contentProfile: theme.contentProfile,
    glow: withAlpha(
      theme.presentation.accent,
      lightGround ? 0.18 : 0.3,
      "rgba(59,130,246,0.3)",
    ),
    lightGround,
    motif: SHARE_CARD_THEME_MOTIFS[theme.id] ?? theme.contentProfile,
    surface: theme.presentation.surface,
    surfaceStrong: theme.presentation.surfaceStrong,
    text: theme.presentation.text,
    textMuted: theme.presentation.textMuted,
    textSubtle: theme.presentation.textSubtle,
    themeId: theme.id,
    themeName: theme.name,
    themeVibe: theme.vibe,
  };
}

export function getShareCardTags(resume: ResumeData): string[] {
  const skills = Array.isArray(resume.skills)
    ? resume.skills.flatMap((group) => {
        if (typeof group === "string") return [group];
        return Array.isArray(group?.items) ? group.items : [];
      })
    : [];

  const projects = Array.isArray(resume.projects)
    ? resume.projects
        .map((project) => project?.name)
        .filter((name): name is string => Boolean(name))
    : [];

  return Array.from(
    new Set(
      [...skills, ...projects]
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, 4);
}

/**
 * First word of the name for possessive chrome like "Share {firstName}'s page".
 * Returns "" when no usable name exists so callers can fall back to
 * non-possessive copy instead of rendering "Your's".
 */
export function getFirstName(name: string | null | undefined): string {
  const first = (name ?? "").trim().split(/\s+/)[0] ?? "";
  return truncate(first, 16);
}

function getNameFontSize(name: string): number {
  if (name.length > 36) return 48;
  if (name.length > 28) return 54;
  if (name.length > 20) return 60;
  return 68;
}

export function buildShareCardModel({
  appUrl,
  liveUrl,
  resume,
  slug,
}: BuildShareCardModelOptions): ShareCardModel {
  const name = truncate(resume.name || "MyLivingPage User", 44);
  const livePageUrl = liveUrl ?? toLivePageUrl(appUrl, slug);
  const displayUrl = truncate(
    liveUrl
      ? livePageUrl.replace(/^https?:\/\/(www\.)?/i, "")
      : toDisplayDomainUrl(appUrl, slug),
    48,
  );

  return {
    avatarUrl: resume.avatar_url,
    displayUrl,
    firstName: getFirstName(name),
    headline: truncate(resume.headline || "Professional profile", 72),
    initial: name.slice(0, 1).toUpperCase() || "?",
    livePageUrl,
    location: truncate(resume.location || "", 42),
    name,
    nameFontSize: getNameFontSize(name),
    qrMatrix: buildQrMatrix(livePageUrl),
    slug,
    tags: getShareCardTags(resume),
  };
}
