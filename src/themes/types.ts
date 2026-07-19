export const THEME_IDS = [
  "cosmic",
  "fluid",
  "ember",
  "monolith",
  "aurora",
  "terracotta",
  "prism",
  "biolume",
  "circuit",
  "sakura",
  "glacier",
  "verdant",
  "neon",
  "topo",
  "luxe",
  "dusk",
  "matrix",
  "coral",
  "stardust",
  "ink",
  "bloom",
  "silk",
  "tempest",
  "obsidian",
  "apex",
  "atlas",
  "forge",
  "vector",
  "vault",
  "velvet",
  "opaline",
  "halo",
  "sonata",
  "mosaic",
  "bastion",
  "carbon",
  "caliber",
  "quarry",
  "harbor",
  "relay",
  "meridian",
  "atelier",
  "porcelain",
  "filigree",
  "cameo",
  "solstice",
  "tulle",
  "parasol",
  "gossamer",
  "citadel",
  "axiom",
  "helix",
  "jetstream",
  "echelon",
  "vellum",
  "nocturne",
  "lustre",
  "fresco",
  "rosaline",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const THEME_COLLECTION_IDS = [
  "executive-tech",
  "cinematic",
  "organic-material",
  "editorial-luxe",
  "art-lab",
] as const;

export const THEME_COLLECTION_FILTER_IDS = [
  "all",
  "executive-tech",
  "cinematic",
  "organic-material",
  "editorial-luxe",
  "art-lab",
] as const;

export type ThemeCollectionId = (typeof THEME_COLLECTION_IDS)[number];
export type ThemeCollectionFilterId = (typeof THEME_COLLECTION_FILTER_IDS)[number];

export const THEME_COLLECTION_META = {
  all: { label: "All" },
  "executive-tech": { label: "Executive Tech" },
  cinematic: { label: "Cinematic" },
  "organic-material": { label: "Organic Material" },
  "editorial-luxe": { label: "Editorial Luxe" },
  "art-lab": { label: "Art Lab" },
} as const satisfies Record<ThemeCollectionFilterId, { label: string }>;

export type ThemeRenderer = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  mouseX: number,
  mouseY: number,
  /** Seconds elapsed since the last painted frame. Undefined preserves the legacy 60fps step. */
  deltaSeconds?: number,
) => void;

export interface ThemePresentation {
  accent: string;
  accentBright: string;
  accentSoft: string;
  accentBorder: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  surface: string;
  surfaceStrong: string;
  border: string;
  scrim: string;
  headingFont: "editorial" | "modern";
}

export interface ThemeMeta {
  id: ThemeId;
  collection: ThemeCollectionId;
  name: string;
  description: string;
  vibe: string;
  background: string;
  presentation: ThemePresentation;
  signature?: boolean;
}
