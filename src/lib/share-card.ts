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
  apex: { accent: "#7CC3FF", glow: "rgba(124,195,255,0.30)", gradientFrom: "#07101E", gradientMid: "#0A1830", gradientTo: "#08101A" },
  atlas: { accent: "#38BDF8", glow: "rgba(56,189,248,0.30)", gradientFrom: "#07141A", gradientMid: "#0B2030", gradientTo: "#081018" },
  forge: { accent: "#F97316", glow: "rgba(249,115,22,0.32)", gradientFrom: "#140705", gradientMid: "#25100B", gradientTo: "#120606" },
  vector: { accent: "#60A5FA", glow: "rgba(96,165,250,0.30)", gradientFrom: "#091225", gradientMid: "#12203A", gradientTo: "#08101D" },
  vault: { accent: "#CBD5E1", glow: "rgba(203,213,225,0.26)", gradientFrom: "#0B1018", gradientMid: "#161D2A", gradientTo: "#090C12" },
  velvet: { accent: "#FB7185", glow: "rgba(251,113,133,0.28)", gradientFrom: "#170811", gradientMid: "#2A0F1A", gradientTo: "#12070E" },
  opaline: { accent: "#93C5FD", glow: "rgba(147,197,253,0.28)", gradientFrom: "#0C1020", gradientMid: "#171C33", gradientTo: "#0C0F1A" },
  halo: { accent: "#F9A8D4", glow: "rgba(249,168,212,0.30)", gradientFrom: "#150913", gradientMid: "#23111F", gradientTo: "#12070F" },
  sonata: { accent: "#FDBA74", glow: "rgba(253,186,116,0.28)", gradientFrom: "#150815", gradientMid: "#241122", gradientTo: "#12070D" },
  mosaic: { accent: "#67E8F9", glow: "rgba(103,232,249,0.30)", gradientFrom: "#08101B", gradientMid: "#102133", gradientTo: "#0A0C14" },
  bastion: { accent: "#93C5FD", glow: "rgba(147,197,253,0.28)", gradientFrom: "#0B1018", gradientMid: "#151D2A", gradientTo: "#090C12" },
  carbon: { accent: "#CBD5E1", glow: "rgba(203,213,225,0.24)", gradientFrom: "#06080A", gradientMid: "#12161B", gradientTo: "#07090B" },
  caliber: { accent: "#7DD3FC", glow: "rgba(125,211,252,0.28)", gradientFrom: "#09101C", gradientMid: "#131B2D", gradientTo: "#0A0E16" },
  quarry: { accent: "#E7B98A", glow: "rgba(231,185,138,0.24)", gradientFrom: "#120D0A", gradientMid: "#201611", gradientTo: "#0F0B08" },
  harbor: { accent: "#93C5FD", glow: "rgba(147,197,253,0.28)", gradientFrom: "#08121C", gradientMid: "#112434", gradientTo: "#090F15" },
  relay: { accent: "#5EEAD4", glow: "rgba(94,234,212,0.28)", gradientFrom: "#07121A", gradientMid: "#102131", gradientTo: "#081017" },
  meridian: { accent: "#60A5FA", glow: "rgba(96,165,250,0.28)", gradientFrom: "#08111C", gradientMid: "#122030", gradientTo: "#090F16" },
  atelier: { accent: "#FDBA74", glow: "rgba(253,186,116,0.28)", gradientFrom: "#120E17", gradientMid: "#1D1B2C", gradientTo: "#0D0E14" },
  porcelain: { accent: "#BFDBFE", glow: "rgba(191,219,254,0.26)", gradientFrom: "#192230", gradientMid: "#263143", gradientTo: "#161C26" },
  filigree: { accent: "#FCD34D", glow: "rgba(252,211,77,0.26)", gradientFrom: "#110C17", gradientMid: "#1C1630", gradientTo: "#0E0B14" },
  cameo: { accent: "#FBCFE8", glow: "rgba(251,207,232,0.28)", gradientFrom: "#140D18", gradientMid: "#251626", gradientTo: "#110A12" },
  solstice: { accent: "#FDBA74", glow: "rgba(253,186,116,0.30)", gradientFrom: "#180D0B", gradientMid: "#2A1712", gradientTo: "#140A08" },
  tulle: { accent: "#DDD6FE", glow: "rgba(221,214,254,0.28)", gradientFrom: "#0E0F19", gradientMid: "#191C2D", gradientTo: "#0A0C12" },
  parasol: { accent: "#F9A8D4", glow: "rgba(249,168,212,0.28)", gradientFrom: "#140913", gradientMid: "#25111F", gradientTo: "#10070E" },
  gossamer: { accent: "#BAE6FD", glow: "rgba(186,230,253,0.28)", gradientFrom: "#09111A", gradientMid: "#132231", gradientTo: "#0A1016" },
  citadel: { accent: "#A5C8FF", glow: "rgba(165,200,255,0.28)", gradientFrom: "#08101A", gradientMid: "#111A29", gradientTo: "#06080E" },
  axiom: { accent: "#7DD3FC", glow: "rgba(125,211,252,0.30)", gradientFrom: "#07101F", gradientMid: "#0E1C35", gradientTo: "#090D18" },
  helix: { accent: "#C4B5FD", glow: "rgba(196,181,253,0.30)", gradientFrom: "#080B18", gradientMid: "#111831", gradientTo: "#0A0D15" },
  jetstream: { accent: "#93C5FD", glow: "rgba(147,197,253,0.30)", gradientFrom: "#081120", gradientMid: "#11233C", gradientTo: "#090E18" },
  echelon: { accent: "#5EEAD4", glow: "rgba(94,234,212,0.28)", gradientFrom: "#081018", gradientMid: "#11202A", gradientTo: "#070B10" },
  vellum: { accent: "#F5E1D4", glow: "rgba(245,225,212,0.24)", gradientFrom: "#171219", gradientMid: "#231A22", gradientTo: "#0D0B10" },
  nocturne: { accent: "#A78BFA", glow: "rgba(167,139,250,0.28)", gradientFrom: "#081022", gradientMid: "#111C39", gradientTo: "#0A0D18" },
  lustre: { accent: "#FCD34D", glow: "rgba(252,211,77,0.28)", gradientFrom: "#130A0B", gradientMid: "#241416", gradientTo: "#10080A" },
  fresco: { accent: "#E7C9A2", glow: "rgba(231,201,162,0.24)", gradientFrom: "#120D0B", gradientMid: "#201610", gradientTo: "#0E0A07" },
  rosaline: { accent: "#F9A8D4", glow: "rgba(249,168,212,0.30)", gradientFrom: "#140A13", gradientMid: "#25111F", gradientTo: "#10070E" },
};

export function normalizeAppUrl(url?: string): string {
  return (url ?? "https://www.mylivingpage.com").replace(/\/+$/, "");
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
