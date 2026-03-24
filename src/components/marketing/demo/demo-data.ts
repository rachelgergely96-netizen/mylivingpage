import type { ThemeId } from "@/themes/types";

export type DemoThemeKey = "celestial" | "noir" | "ocean" | "aurora" | "neon" | "luxe" | "ember";

export const THEME_KEY_MAP: Record<DemoThemeKey, ThemeId> = {
  celestial: "cosmic",
  noir: "monolith",
  ocean: "fluid",
  aurora: "aurora",
  neon: "neon",
  luxe: "luxe",
  ember: "ember",
};

export const THEME_ACCENTS: Record<DemoThemeKey, { dot: string; accent: string; label: string }> = {
  celestial: { dot: "linear-gradient(135deg, #3B82F6, #6366F1)", accent: "#3B82F6", label: "Cosmic" },
  noir: { dot: "linear-gradient(135deg, #E8E4ED, #3A3A4A)", accent: "#C0B8D0", label: "Monolith" },
  ocean: { dot: "linear-gradient(135deg, #5BD6C4, #2D5BA6)", accent: "#5BD6C4", label: "Fluid" },
  aurora: { dot: "linear-gradient(135deg, #7DD3FC, #A78BFA)", accent: "#7DD3FC", label: "Aurora" },
  neon: { dot: "linear-gradient(135deg, #F472B6, #8B5CF6)", accent: "#F472B6", label: "Neon" },
  luxe: { dot: "linear-gradient(135deg, #D4A654, #8B6914)", accent: "#D4A654", label: "Luxe" },
  ember: { dot: "linear-gradient(135deg, #F97316, #DC2626)", accent: "#F97316", label: "Ember" },
};

export type ViewMode = "story" | "recruiter" | "project";

export const VIEW_BIOS: Record<ViewMode, string> = {
  story: "Building systems that turn complexity into clarity. Making hard things feel easier through beautiful design.",
  recruiter: "Licensed NY attorney and founder building EdTech and creative technology products. 5+ products launched, 275+ active users across platforms.",
  project: "I build products at the intersection of law, design, and technology. Currently focused on interactive digital experiences and gamified education.",
};

export const MOCK_PERSON = {
  name: "Ray Smith",
  headline: "Attorney & Technology Entrepreneur",
  badges: ["Attorney", "Founder", "Designer", "Builder"],
  openTo: "Open to: consulting, speaking, advisory roles",
  focus: [
    "Building LiveCardStudio - living greeting cards with procedural art",
    "Scaling BarPrepPlay to 500+ active users",
    "Exploring the intersection of legal expertise and beautiful technology",
  ],
  projects: [
    { name: "LiveCardStudio.com", status: "LIVE", desc: "Living greeting cards with procedural art, animated themes and NFC luxury print" },
    { name: "BarPrepPlay", status: "LIVE", desc: "Gamified bar exam prep - 275+ active users, generating passive revenue" },
  ],
};

export const MOCK_ANALYTICS = {
  views: 2847,
  unique: 312,
  avgTime: "2m 14s",
  topSection: "Projects",
  chartBars: [18, 32, 25, 48, 42, 58, 72],
  referrals: [
    { label: "LinkedIn", pct: "62%" },
    { label: "Direct", pct: "24%" },
    { label: "Twitter", pct: "9%" },
  ],
};

export interface ComparisonFeature {
  feature: string;
  free: boolean;
  hosting: boolean;
}

export const COMPARISON_FEATURES: ComparisonFeature[] = [
  { feature: "One public page", free: true, hosting: true },
  { feature: "Full page, all sections", free: true, hosting: true },
  { feature: "Mobile responsive", free: true, hosting: true },
  { feature: "Public page URL", free: true, hosting: true },
  { feature: "Core themes", free: true, hosting: true },
  { feature: "Resume PDF download", free: true, hosting: true },
  { feature: "Page analytics", free: true, hosting: true },
  { feature: "Premium themes", free: false, hosting: true },
  { feature: "PNG share card download", free: false, hosting: true },
  { feature: "Remove branding", free: false, hosting: true },
];
