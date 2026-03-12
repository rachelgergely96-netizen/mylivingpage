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
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export type ThemeRenderer = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  mouseX: number,
  mouseY: number,
) => void;

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  description: string;
  vibe: string;
  background: string;
}

export interface ThemeDefinition extends ThemeMeta {
  renderer: ThemeRenderer;
}
