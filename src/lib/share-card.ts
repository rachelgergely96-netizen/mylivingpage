import qrcode from "qrcode-generator";
import type { ResumeData } from "@/types/resume";

export interface ShareCardVisual {
  accent: string;
  glow: string;
  gradientFrom: string;
  gradientMid: string;
  gradientTo: string;
}

const DEFAULT_SHARE_CARD_VISUAL: ShareCardVisual = {
  accent: "#3B82F6",
  glow: "rgba(59,130,246,0.30)",
  gradientFrom: "#09152B",
  gradientMid: "#0A1024",
  gradientTo: "#13071E",
};

const SHARE_CARD_VISUALS: Record<string, ShareCardVisual> = {
  cosmic: { accent: "#6B5CE7", glow: "rgba(107,92,231,0.32)", gradientFrom: "#070C1B", gradientMid: "#0C1231", gradientTo: "#1B0E31" },
  fluid: { accent: "#3B82F6", glow: "rgba(59,130,246,0.30)", gradientFrom: "#071325", gradientMid: "#091C34", gradientTo: "#0B1230" },
  ember: { accent: "#EF6C35", glow: "rgba(239,108,53,0.33)", gradientFrom: "#180906", gradientMid: "#2A110A", gradientTo: "#17090C" },
  monolith: { accent: "#A1A1AA", glow: "rgba(161,161,170,0.28)", gradientFrom: "#0A0A0D", gradientMid: "#16161A", gradientTo: "#0B0B0E" },
  aurora: { accent: "#34D399", glow: "rgba(52,211,153,0.28)", gradientFrom: "#07142A", gradientMid: "#0A2540", gradientTo: "#0B1027" },
  terracotta: { accent: "#C2703E", glow: "rgba(194,112,62,0.30)", gradientFrom: "#180E09", gradientMid: "#27150E", gradientTo: "#16100C" },
  prism: { accent: "#A855F7", glow: "rgba(168,85,247,0.32)", gradientFrom: "#0E0A1A", gradientMid: "#1A1030", gradientTo: "#11091F" },
  biolume: { accent: "#06B6A4", glow: "rgba(6,182,164,0.30)", gradientFrom: "#061816", gradientMid: "#0A2624", gradientTo: "#071612" },
  circuit: { accent: "#10B981", glow: "rgba(16,185,129,0.30)", gradientFrom: "#06140F", gradientMid: "#0A2018", gradientTo: "#07120D" },
  sakura: { accent: "#EC4899", glow: "rgba(236,72,153,0.30)", gradientFrom: "#140A12", gradientMid: "#241126", gradientTo: "#180A14" },
  glacier: { accent: "#60A5FA", glow: "rgba(96,165,250,0.28)", gradientFrom: "#06101B", gradientMid: "#0B1B2F", gradientTo: "#080E1D" },
  verdant: { accent: "#4ADE80", glow: "rgba(74,222,128,0.28)", gradientFrom: "#07130B", gradientMid: "#0E2013", gradientTo: "#08110C" },
  neon: { accent: "#22D3EE", glow: "rgba(34,211,238,0.32)", gradientFrom: "#0B0818", gradientMid: "#17102E", gradientTo: "#0A0A1C" },
  topo: { accent: "#93C5FD", glow: "rgba(147,197,253,0.28)", gradientFrom: "#0A0E12", gradientMid: "#121924", gradientTo: "#0B0E14" },
  luxe: { accent: "#F59E0B", glow: "rgba(245,158,11,0.30)", gradientFrom: "#140F09", gradientMid: "#241A11", gradientTo: "#120D09" },
  dusk: { accent: "#F472B6", glow: "rgba(244,114,182,0.30)", gradientFrom: "#120A17", gradientMid: "#251030", gradientTo: "#130917" },
  matrix: { accent: "#22C55E", glow: "rgba(34,197,94,0.30)", gradientFrom: "#051007", gradientMid: "#0A1B0D", gradientTo: "#060E08" },
  coral: { accent: "#2DD4BF", glow: "rgba(45,212,191,0.30)", gradientFrom: "#071116", gradientMid: "#0C2128", gradientTo: "#081116" },
  stardust: { accent: "#818CF8", glow: "rgba(129,140,248,0.32)", gradientFrom: "#070816", gradientMid: "#101335", gradientTo: "#0C0720" },
  ink: { accent: "#94A3B8", glow: "rgba(148,163,184,0.28)", gradientFrom: "#090D16", gradientMid: "#121827", gradientTo: "#0A0D17" },
  bloom: { accent: "#C084FC", glow: "rgba(192,132,252,0.30)", gradientFrom: "#130A19", gradientMid: "#231033", gradientTo: "#150A1E" },
  silk: { accent: "#7DD3FC", glow: "rgba(125,211,252,0.30)", gradientFrom: "#080A17", gradientMid: "#101A32", gradientTo: "#0A0B18" },
  tempest: { accent: "#38BDF8", glow: "rgba(56,189,248,0.30)", gradientFrom: "#06080F", gradientMid: "#0E1323", gradientTo: "#070911" },
  obsidian: { accent: "#FB7185", glow: "rgba(251,113,133,0.30)", gradientFrom: "#080404", gradientMid: "#1A0C0C", gradientTo: "#090405" },
};

export function normalizeAppUrl(url?: string): string {
  return (url ?? "https://mylivingpage.com").replace(/\/+$/, "");
}

export function truncate(value: string | null | undefined, maxChars: number): string {
  if (!value) return "";
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`;
}

export function toDisplayDomainUrl(url: string, slug: string): string {
  const host = normalizeAppUrl(url).replace(/^https?:\/\//, "");
  return `${host}/${slug}`;
}

export function toLivePageUrl(appUrl: string, slug: string): string {
  return `${normalizeAppUrl(appUrl)}/${slug}`;
}

export function buildQrMatrix(value: string, margin = 3): boolean[][] | null {
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
    const matrix = buildQrMatrix(value, 3);
    if (!matrix?.length) {
      return null;
    }

    const cellSize = 5;
    const side = matrix.length * cellSize;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${side}" height="${side}" viewBox="0 0 ${side} ${side}" fill="none">`;
    svg += `<rect width="${side}" height="${side}" rx="18" fill="#FFFFFF"/>`;
    svg += `<g fill="#0A1628">`;

    for (let row = 0; row < matrix.length; row += 1) {
      for (let col = 0; col < matrix.length; col += 1) {
        if (!matrix[row]?.[col]) continue;
        const x = col * cellSize;
        const y = row * cellSize;
        svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="1.2" />`;
      }
    }

    svg += "</g></svg>";
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  } catch {
    return null;
  }
}

export function getShareCardVisual(themeId: string): ShareCardVisual {
  return SHARE_CARD_VISUALS[themeId] ?? DEFAULT_SHARE_CARD_VISUAL;
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
        .map((item) => truncate(item, 18))
        .filter(Boolean),
    ),
  ).slice(0, 4);
}

export function getFirstName(name: string | null | undefined): string {
  const first = (name ?? "").trim().split(/\s+/)[0] ?? "";
  return truncate(first || "Your", 16);
}
