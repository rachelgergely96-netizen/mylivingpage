import type { ThemeId } from "@/themes/types";

/* ── Theme mapping ─────────────────────────────────── */

export type DemoThemeKey = "celestial" | "noir" | "ocean";

export const THEME_KEY_MAP: Record<DemoThemeKey, ThemeId> = {
  celestial: "cosmic",
  noir: "monolith",
  ocean: "fluid",
};

export const THEME_ACCENTS: Record<DemoThemeKey, { dot: string; accent: string }> = {
  celestial: { dot: "linear-gradient(135deg, #3B82F6, #6366F1)", accent: "#3B82F6" },
  noir: { dot: "linear-gradient(135deg, #E8E4ED, #3A3A4A)", accent: "#C0B8D0" },
  ocean: { dot: "linear-gradient(135deg, #5BD6C4, #2D5BA6)", accent: "#5BD6C4" },
};

/* ── View mode content ─────────────────────────────── */

export type ViewMode = "story" | "recruiter" | "project";

export const VIEW_BIOS: Record<ViewMode, string> = {
  story: "Building systems that turn complexity into clarity. Making hard things feel easier through beautiful design.",
  recruiter: "Licensed NY attorney & founder building EdTech and creative technology products. 5+ products launched, 275+ active users across platforms.",
  project: "I build products at the intersection of law, design, and technology. Currently focused on interactive digital experiences and gamified education.",
};

/* ── Mock page content ─────────────────────────────── */

export const MOCK_PERSON = {
  name: "Ray Smith",
  headline: "Attorney & Technology Entrepreneur",
  badges: ["Attorney", "Founder", "Designer", "Builder"],
  openTo: "Open to: consulting, speaking, advisory roles",
  focus: [
    "Building LiveCardStudio — living greeting cards with procedural art",
    "Scaling BarPrepPlay to 500+ active users",
    "Exploring the intersection of legal expertise and beautiful technology",
  ],
  projects: [
    { name: "LiveCardStudio.com", status: "LIVE", desc: "Living greeting cards with procedural art, animated themes & NFC luxury print" },
    { name: "BarPrepPlay", status: "LIVE", desc: "Gamified bar exam prep — 275+ active users, generating passive revenue" },
  ],
};

/* ── Analytics mock data ───────────────────────────── */

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

/* ── AI generator text ─────────────────────────────── */

export const AI_PROMPT = "You added a new project. Want me to draft a LinkedIn announcement?";

export const AI_OUTPUT = `Excited to share that I've launched LiveCardStudio — where greeting cards come alive through procedural art and NFC luxury print.

After building BarPrepPlay for 275+ bar exam students, I'm bringing the same philosophy to a new canvas: making hard things feel easier through beautiful, thoughtful design.

If you've ever wished a greeting card could do more than just sit there... check it out.

#buildinpublic #creativetechnology #design`;

/* ── Comparison table ──────────────────────────────── */

export interface ComparisonFeature {
  feature: string;
  free: boolean;
  pro: boolean;
}

export const COMPARISON_FEATURES: ComparisonFeature[] = [
  { feature: "Full page, all sections", free: true, pro: true },
  { feature: "Share card generation", free: true, pro: true },
  { feature: "Mobile responsive", free: true, pro: true },
  { feature: "Custom domain", free: false, pro: true },
  { feature: "Remove branding", free: false, pro: true },
  { feature: "Page analytics", free: false, pro: true },
  { feature: "Premium themes", free: false, pro: true },
  { feature: "View modes (Story / Recruiter / Project)", free: false, pro: true },
  { feature: "PDF export", free: false, pro: true },
  { feature: "AI content generator", free: false, pro: true },
  { feature: "Auto share card with PNG export", free: false, pro: true },
];
