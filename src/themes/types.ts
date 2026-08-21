import type { MotionMode } from "@/lib/motion";

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
 * Visual identity motifs used by theme previews and generated share cards.
 * The live Living Page foreground deliberately does not branch on this value.
 */
export type ThemeContentProfileId = (typeof THEME_CONTENT_PROFILE_IDS)[number];

export const THEME_READING_MODE_IDS = ["glass", "solid"] as const;

/**
 * Classifies the contrast lineage of theme artwork for registry tooling.
 * Living Pages use one fixed reading stage across every background world.
 */
export type ThemeReadingMode = (typeof THEME_READING_MODE_IDS)[number];

export const THEME_MATERIAL_PROFILE_IDS = [
  "refractive",
  "organic-glass",
  "engraved",
] as const;

/**
 * Material profiles tune background-world depth polish. They do not change
 * the semantic resume foreground or its shared surface treatment.
 */
export type ThemeMaterialProfileId =
  (typeof THEME_MATERIAL_PROFILE_IDS)[number];

/**
 * A small, renderer-agnostic model of what is happening on a Living Page.
 *
 * The object is mutated outside React's render cycle and sampled by the canvas
 * renderer, so scroll and pointer movement do not cause component re-renders.
 * Values that represent coordinates or progress are normalized to the [0, 1]
 * range unless noted otherwise.
 */
export interface ThemeMotionContext {
  /** Additive motion contract; absent legacy contexts resolve from reducedMotion. */
  motionMode?: MotionMode;
  scrollProgress: number;
  /** Viewport-heights per second, clamped to [-4, 4]. */
  scrollVelocity: number;
  scrollDirection: -1 | 0 | 1;
  activeSection: string | null;
  activeSectionIndex: number;
  sectionCount: number;
  sectionProgress: number;
  /** Decaying [0, 1] arrival pulse when the dominant section changes. */
  sectionImpulse: number;
  /** Direction of the latest section transition through the page story. */
  sectionDirection: -1 | 0 | 1;
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
  name: string;
  description: string;
  vibe: string;
  background: string;
  presentation: ThemePresentation;
  signature?: boolean;
  /**
   * The renderer authors its own complete world (atmosphere, depth, focus,
   * vignette), so the shared world-polish pass must leave it untouched.
   * Signature themes are exempt implicitly; this flag opts out catalog themes.
   */
  bespokeWorld?: true;
}
