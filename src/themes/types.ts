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

export const THEME_CONTENT_PROFILE_IDS = [
  "precision",
  "cartography",
  "cinema",
  "night-editorial",
  "material",
  "botanical",
  "couture",
  "print-studio",
  "ornamental",
  "celestial",
] as const;

/**
 * Authored content treatments shared by a small family of compatible themes.
 * These profiles style the semantic resume without duplicating or reordering it.
 */
export type ThemeContentProfileId = (typeof THEME_CONTENT_PROFILE_IDS)[number];

export const THEME_READING_MODE_IDS = ["glass", "solid"] as const;

/**
 * Defines how semantic resume content is optically separated from a moving
 * renderer. Glass profiles keep more of the world visible through a sharp
 * blur; solid profiles use denser authored plates without blur.
 */
export type ThemeReadingMode = (typeof THEME_READING_MODE_IDS)[number];

export const THEME_MATERIAL_PROFILE_IDS = [
  "refractive",
  "organic-glass",
  "engraved",
] as const;

/**
 * Material profiles refine surface and light behavior without changing the
 * semantic resume or replacing a theme's authored content profile.
 */
export type ThemeMaterialProfileId =
  (typeof THEME_MATERIAL_PROFILE_IDS)[number];

export const THEME_SIGNATURE_EXPERIENCE_IDS = [
  "achievement-atlas",
  "proof-museum",
  "editorial-feature",
] as const;

export type ThemeSignatureExperienceId =
  (typeof THEME_SIGNATURE_EXPERIENCE_IDS)[number];

export interface ThemeSignatureExperience {
  id: ThemeSignatureExperienceId;
  name: string;
  description: string;
}

/**
 * A small, renderer-agnostic model of what is happening on a Living Page.
 *
 * The object is mutated outside React's render cycle and sampled by the canvas
 * renderer, so scroll and pointer movement do not cause component re-renders.
 * Values that represent coordinates or progress are normalized to the [0, 1]
 * range unless noted otherwise.
 */
export interface ThemeMotionContext {
  scrollProgress: number;
  /** Viewport-heights per second, clamped to [-4, 4]. */
  scrollVelocity: number;
  scrollDirection: -1 | 0 | 1;
  activeSection: string | null;
  activeSectionIndex: number;
  sectionCount: number;
  sectionProgress: number;
  focusedItem: string | null;
  focusKind: string | null;
  focusX: number;
  focusY: number;
  /** Optional host-smoothed focus blend used by shared visual polish. */
  focusStrength?: number;
  interactionImpulse: number;
  /** Normalized canvas-widths / canvas-heights per second. */
  pointerVelocityX: number;
  pointerVelocityY: number;
  pointerSpeed: number;
  reducedMotion: boolean;
}

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
  /** Optional page-level motion model. Legacy renderers can safely ignore it. */
  motion?: Readonly<ThemeMotionContext>,
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
}

export interface ThemeMeta {
  id: ThemeId;
  collection: ThemeCollectionId;
  contentProfile: ThemeContentProfileId;
  materialProfile: ThemeMaterialProfileId;
  readingMode: ThemeReadingMode;
  signatureExperience?: ThemeSignatureExperience;
  name: string;
  description: string;
  vibe: string;
  background: string;
  presentation: ThemePresentation;
  signature?: boolean;
}
