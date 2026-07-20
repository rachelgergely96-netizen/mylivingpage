import type {
  ThemeCollectionId,
  ThemeId,
  ThemeMeta,
  ThemePresentation,
} from "./types";

const THEME_COLLECTIONS = {
  cosmic: "cinematic",
  fluid: "organic-material",
  ember: "cinematic",
  monolith: "executive-tech",
  aurora: "cinematic",
  terracotta: "organic-material",
  prism: "cinematic",
  biolume: "organic-material",
  circuit: "executive-tech",
  sakura: "organic-material",
  glacier: "organic-material",
  verdant: "organic-material",
  neon: "executive-tech",
  topo: "executive-tech",
  luxe: "editorial-luxe",
  dusk: "editorial-luxe",
  matrix: "executive-tech",
  coral: "organic-material",
  stardust: "art-lab",
  ink: "art-lab",
  bloom: "organic-material",
  silk: "editorial-luxe",
  tempest: "cinematic",
  obsidian: "cinematic",
  apex: "executive-tech",
  atlas: "executive-tech",
  forge: "cinematic",
  vector: "executive-tech",
  vault: "cinematic",
  velvet: "editorial-luxe",
  opaline: "editorial-luxe",
  halo: "editorial-luxe",
  sonata: "art-lab",
  mosaic: "art-lab",
  bastion: "executive-tech",
  carbon: "executive-tech",
  caliber: "executive-tech",
  quarry: "organic-material",
  harbor: "cinematic",
  relay: "executive-tech",
  meridian: "executive-tech",
  atelier: "art-lab",
  porcelain: "editorial-luxe",
  filigree: "art-lab",
  cameo: "editorial-luxe",
  solstice: "cinematic",
  tulle: "editorial-luxe",
  parasol: "editorial-luxe",
  gossamer: "art-lab",
  citadel: "executive-tech",
  axiom: "executive-tech",
  helix: "executive-tech",
  jetstream: "cinematic",
  echelon: "executive-tech",
  vellum: "editorial-luxe",
  nocturne: "cinematic",
  lustre: "editorial-luxe",
  fresco: "organic-material",
  rosaline: "editorial-luxe",
} as const satisfies Record<ThemeId, ThemeCollectionId>;

const THEME_PRESENTATION_DEFAULTS = {
  "executive-tech": {
    accent: "#7DD3FC",
    accentBright: "#D7F4FF",
    accentSoft: "rgba(77, 196, 255, 0.11)",
    accentBorder: "rgba(125, 211, 252, 0.28)",
    text: "#F2F8FC",
    textMuted: "rgba(226, 241, 250, 0.68)",
    textSubtle: "rgba(214, 234, 246, 0.42)",
    surface: "rgba(4, 15, 25, 0.5)",
    surfaceStrong: "rgba(4, 15, 25, 0.72)",
    border: "rgba(157, 220, 250, 0.14)",
    scrim:
      "radial-gradient(ellipse at 76% 18%, rgba(1, 7, 12, 0.04) 0%, rgba(1, 7, 12, 0.28) 48%, rgba(1, 7, 12, 0.62) 100%)",
    headingFont: "modern",
  },
  cinematic: {
    accent: "#AFC9FF",
    accentBright: "#E1EAFF",
    accentSoft: "rgba(134, 168, 255, 0.11)",
    accentBorder: "rgba(175, 201, 255, 0.25)",
    text: "#F5F6FF",
    textMuted: "rgba(232, 235, 255, 0.68)",
    textSubtle: "rgba(223, 227, 250, 0.42)",
    surface: "rgba(7, 9, 20, 0.5)",
    surfaceStrong: "rgba(7, 9, 20, 0.72)",
    border: "rgba(205, 214, 255, 0.14)",
    scrim:
      "radial-gradient(ellipse at 72% 16%, rgba(3, 5, 14, 0.02) 0%, rgba(3, 5, 14, 0.3) 50%, rgba(3, 5, 14, 0.64) 100%)",
    headingFont: "editorial",
  },
  "organic-material": {
    accent: "#E9C89B",
    accentBright: "#FFE9CA",
    accentSoft: "rgba(217, 171, 112, 0.11)",
    accentBorder: "rgba(233, 200, 155, 0.26)",
    text: "#FBF6ED",
    textMuted: "rgba(244, 233, 216, 0.68)",
    textSubtle: "rgba(237, 224, 205, 0.42)",
    surface: "rgba(19, 13, 9, 0.5)",
    surfaceStrong: "rgba(19, 13, 9, 0.72)",
    border: "rgba(239, 216, 184, 0.14)",
    scrim:
      "radial-gradient(ellipse at 75% 16%, rgba(14, 9, 5, 0.02) 0%, rgba(14, 9, 5, 0.28) 48%, rgba(14, 9, 5, 0.63) 100%)",
    headingFont: "editorial",
  },
  "editorial-luxe": {
    accent: "#E8BC85",
    accentBright: "#FFE6C4",
    accentSoft: "rgba(219, 166, 101, 0.11)",
    accentBorder: "rgba(232, 188, 133, 0.27)",
    text: "#FFF8EF",
    textMuted: "rgba(249, 234, 218, 0.7)",
    textSubtle: "rgba(239, 219, 200, 0.43)",
    surface: "rgba(18, 10, 12, 0.48)",
    surfaceStrong: "rgba(18, 10, 12, 0.72)",
    border: "rgba(245, 214, 180, 0.15)",
    scrim:
      "radial-gradient(ellipse at 78% 14%, rgba(11, 5, 8, 0.01) 0%, rgba(11, 5, 8, 0.26) 48%, rgba(11, 5, 8, 0.62) 100%)",
    headingFont: "editorial",
  },
  "art-lab": {
    accent: "#FFAE8C",
    accentBright: "#FFE0D1",
    accentSoft: "rgba(255, 139, 105, 0.1)",
    accentBorder: "rgba(255, 174, 140, 0.26)",
    text: "#FFF7F3",
    textMuted: "rgba(248, 230, 224, 0.68)",
    textSubtle: "rgba(239, 216, 211, 0.42)",
    surface: "rgba(13, 10, 18, 0.49)",
    surfaceStrong: "rgba(13, 10, 18, 0.72)",
    border: "rgba(247, 210, 200, 0.14)",
    scrim:
      "radial-gradient(ellipse at 76% 16%, rgba(8, 6, 13, 0.01) 0%, rgba(8, 6, 13, 0.27) 48%, rgba(8, 6, 13, 0.62) 100%)",
    headingFont: "modern",
  },
} as const satisfies Record<ThemeCollectionId, ThemePresentation>;

type ThemeAccentPalette = Pick<
  ThemePresentation,
  "accent" | "accentBright" | "accentSoft" | "accentBorder"
>;

type ThemeWorldPresentation = Pick<
  ThemePresentation,
  "surface" | "surfaceStrong" | "scrim"
>;

type RgbChannels = `${number}, ${number}, ${number}`;

function accentPalette(
  accent: string,
  accentBright: string,
  softChannels: RgbChannels,
  borderChannels: RgbChannels,
  softAlpha = 0.11,
  borderAlpha = 0.28,
): ThemeAccentPalette {
  return {
    accent,
    accentBright,
    accentSoft: `rgba(${softChannels}, ${softAlpha})`,
    accentBorder: `rgba(${borderChannels}, ${borderAlpha})`,
  };
}

function worldPresentation(background: string): ThemeWorldPresentation {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(background);
  if (!match) {
    throw new Error(`Theme background must be a six-digit hex color: ${background}`);
  }

  const channels = match
    .slice(1)
    .map((channel) => Number.parseInt(channel, 16))
    .join(", ");

  return {
    surface: `rgba(${channels}, 0.56)`,
    surfaceStrong: `rgba(${channels}, 0.8)`,
    scrim: `linear-gradient(90deg, rgba(${channels}, 0.8) 0%, rgba(${channels}, 0.52) 50%, rgba(${channels}, 0.12) 100%)`,
  };
}

// Each renderer owns an accent family derived from its scene rather than
// borrowing a collection-wide color. `satisfies Record<ThemeId, ...>` makes a
// newly registered theme fail type-checking until its palette is intentionally
// authored. Signature entries mirror their established values exactly; their
// additional surface and scrim treatments remain below.
const THEME_ACCENT_PALETTES = {
  cosmic: accentPalette("#E7C27D", "#FFF0C2", "214, 167, 76", "231, 194, 125"),
  fluid: accentPalette("#62D6D0", "#D1FAF7", "33, 171, 166", "98, 214, 208"),
  ember: accentPalette("#FF9A70", "#FFD7C5", "232, 92, 48", "255, 154, 112"),
  monolith: accentPalette("#BFC7D3", "#F1F4F7", "132, 145, 162", "191, 199, 211"),
  aurora: accentPalette("#82F3D0", "#D6FFF3", "91, 226, 193", "130, 243, 208", 0.11, 0.28),
  terracotta: accentPalette("#E69A6B", "#FFDCC2", "188, 91, 49", "230, 154, 107"),
  prism: accentPalette("#C9B7FF", "#F0EAFF", "151, 109, 255", "201, 183, 255"),
  biolume: accentPalette("#61E9C5", "#D0FFF3", "29, 190, 153", "97, 233, 197"),
  circuit: accentPalette("#63E2B7", "#D1FFF0", "31, 184, 137", "99, 226, 183"),
  sakura: accentPalette("#F0A9BD", "#FFE1E9", "214, 113, 143", "240, 169, 189"),
  glacier: accentPalette("#A8DDF2", "#E5F7FF", "89, 174, 211", "168, 221, 242"),
  verdant: accentPalette("#8CD48D", "#E0F7DF", "67, 164, 78", "140, 212, 141"),
  neon: accentPalette("#F08DFF", "#FAD7FF", "206, 70, 228", "240, 141, 255"),
  topo: accentPalette("#76D6B4", "#D7F8EC", "45, 166, 126", "118, 214, 180"),
  luxe: accentPalette("#E8C06A", "#FFF0BB", "195, 147, 49", "232, 192, 106"),
  dusk: accentPalette("#E9A4A8", "#FFDADD", "188, 89, 102", "233, 164, 168"),
  matrix: accentPalette("#69E887", "#D5FFDF", "43, 191, 81", "105, 232, 135"),
  coral: accentPalette("#FF9B82", "#FFDCD3", "221, 91, 61", "255, 155, 130"),
  stardust: accentPalette("#B6A8FF", "#E9E4FF", "119, 93, 224", "182, 168, 255"),
  ink: accentPalette("#9AB7DF", "#E1EDFA", "84, 123, 177", "154, 183, 223"),
  bloom: accentPalette("#E2A3F2", "#F8E0FF", "181, 89, 210", "226, 163, 242"),
  silk: accentPalette("#A7B9FF", "#E4E9FF", "104, 126, 223", "167, 185, 255"),
  tempest: accentPalette("#88D8FF", "#D8F3FF", "57, 166, 225", "136, 216, 255"),
  obsidian: accentPalette("#FF9B62", "#FFD8BF", "232, 77, 24", "255, 155, 98"),
  apex: accentPalette("#77CFFF", "#D6F1FF", "53, 167, 229", "119, 207, 255"),
  atlas: accentPalette("#67D6FF", "#C9F3FF", "50, 193, 255", "103, 214, 255", 0.11, 0.3),
  forge: accentPalette("#FFB36A", "#FFE2BA", "225, 105, 35", "255, 179, 106"),
  vector: accentPalette("#7DA7FF", "#DBE7FF", "70, 117, 221", "125, 167, 255"),
  vault: accentPalette("#BACFFF", "#EDF3FF", "113, 147, 222", "186, 207, 255"),
  velvet: accentPalette("#E8A7B9", "#FFD9E2", "232, 117, 151", "244, 168, 190", 0.12, 0.3),
  opaline: accentPalette("#C5C8F5", "#F1F2FF", "133, 140, 218", "197, 200, 245"),
  halo: accentPalette("#E7AD9D", "#FFE1D8", "198, 104, 83", "231, 173, 157"),
  sonata: accentPalette("#E6A6C5", "#FCE1EF", "190, 87, 137", "230, 166, 197"),
  mosaic: accentPalette("#82D7DB", "#D7F8F7", "48, 171, 177", "130, 215, 219"),
  bastion: accentPalette("#A9B8C9", "#E7EDF4", "97, 119, 145", "169, 184, 201"),
  carbon: accentPalette("#B9CEE0", "#EEF7FF", "113, 147, 174", "185, 206, 224"),
  caliber: accentPalette("#84BEFF", "#E0EEFF", "65, 139, 222", "132, 190, 255"),
  quarry: accentPalette("#E9AF72", "#FFE0B8", "217, 143, 72", "233, 175, 114", 0.12, 0.29),
  harbor: accentPalette("#75CDEB", "#D1F1FC", "49, 158, 199", "117, 205, 235"),
  relay: accentPalette("#68D7F2", "#D3F7FF", "43, 172, 207", "104, 215, 242"),
  meridian: accentPalette("#75C7D4", "#D8F4F6", "48, 157, 173", "117, 199, 212"),
  atelier: accentPalette("#FFB28F", "#FFE0D1", "255, 137, 102", "255, 178, 143", 0.11, 0.28),
  porcelain: accentPalette("#B9CCE2", "#EEF6FF", "112, 145, 182", "185, 204, 226"),
  filigree: accentPalette("#DDBB76", "#F8E8BD", "181, 132, 41", "221, 187, 118"),
  cameo: accentPalette("#D9B1C6", "#F9E6EF", "170, 101, 139", "217, 177, 198"),
  solstice: accentPalette("#FFC66D", "#FFF0C2", "239, 154, 49", "255, 198, 109"),
  tulle: accentPalette("#C9BEDD", "#F2ECFA", "144, 123, 173", "201, 190, 221"),
  parasol: accentPalette("#E4A7CB", "#FCE2F1", "190, 91, 145", "228, 167, 203"),
  gossamer: accentPalette("#A8D7F0", "#E4F6FF", "88, 167, 207", "168, 215, 240"),
  citadel: accentPalette("#A7B7D1", "#E6EDF8", "91, 115, 154", "167, 183, 209"),
  axiom: accentPalette("#8DB5FF", "#DEE9FF", "74, 126, 225", "141, 181, 255"),
  helix: accentPalette("#91E0EA", "#DDFBFF", "70, 178, 191", "145, 224, 234"),
  jetstream: accentPalette("#9FD5FF", "#E2F2FF", "78, 161, 226", "159, 213, 255"),
  echelon: accentPalette("#91AEE8", "#E1E9FA", "74, 108, 177", "145, 174, 232"),
  vellum: accentPalette("#D8C6AC", "#F7EDDF", "172, 145, 109", "216, 198, 172"),
  nocturne: accentPalette("#C8D4FF", "#F1F4FF", "151, 171, 255", "200, 212, 255", 0.11, 0.27),
  lustre: accentPalette("#E6BF8A", "#FFE9CB", "191, 139, 72", "230, 191, 138"),
  fresco: accentPalette("#D7AE83", "#F5DEC4", "175, 125, 76", "215, 174, 131"),
  rosaline: accentPalette("#E6AFC2", "#FCE3EC", "191, 100, 136", "230, 175, 194"),
} as const satisfies Record<ThemeId, ThemeAccentPalette>;

const THEME_PRESENTATION_OVERRIDES: Partial<Record<ThemeId, Partial<ThemePresentation>>> = {
  velvet: {
    accent: "#E8A7B9",
    accentBright: "#FFD9E2",
    accentSoft: "rgba(232, 117, 151, 0.12)",
    accentBorder: "rgba(244, 168, 190, 0.3)",
    surface: "rgba(30, 7, 18, 0.48)",
    surfaceStrong: "rgba(30, 7, 18, 0.74)",
    scrim:
      "linear-gradient(90deg, rgba(15, 3, 10, 0.7) 0%, rgba(15, 3, 10, 0.42) 50%, rgba(15, 3, 10, 0.2) 100%)",
  },
  atlas: {
    accent: "#67D6FF",
    accentBright: "#C9F3FF",
    accentSoft: "rgba(50, 193, 255, 0.11)",
    accentBorder: "rgba(103, 214, 255, 0.3)",
    scrim:
      "linear-gradient(90deg, rgba(1, 9, 15, 0.76) 0%, rgba(1, 9, 15, 0.5) 47%, rgba(1, 9, 15, 0.1) 100%)",
  },
  aurora: {
    accent: "#82F3D0",
    accentBright: "#D6FFF3",
    accentSoft: "rgba(91, 226, 193, 0.11)",
    accentBorder: "rgba(130, 243, 208, 0.28)",
    scrim:
      "linear-gradient(90deg, rgba(2, 8, 20, 0.7) 0%, rgba(2, 8, 20, 0.42) 50%, rgba(2, 8, 20, 0.12) 100%)",
  },
  quarry: {
    accent: "#E9AF72",
    accentBright: "#FFE0B8",
    accentSoft: "rgba(217, 143, 72, 0.12)",
    accentBorder: "rgba(233, 175, 114, 0.29)",
    scrim:
      "linear-gradient(90deg, rgba(12, 8, 5, 0.72) 0%, rgba(12, 8, 5, 0.4) 52%, rgba(12, 8, 5, 0.14) 100%)",
  },
  nocturne: {
    accent: "#C8D4FF",
    accentBright: "#F1F4FF",
    accentSoft: "rgba(151, 171, 255, 0.11)",
    accentBorder: "rgba(200, 212, 255, 0.27)",
    scrim:
      "linear-gradient(90deg, rgba(3, 5, 14, 0.72) 0%, rgba(3, 5, 14, 0.42) 52%, rgba(3, 5, 14, 0.1) 100%)",
  },
  atelier: {
    accent: "#FFB28F",
    accentBright: "#FFE0D1",
    accentSoft: "rgba(255, 137, 102, 0.11)",
    accentBorder: "rgba(255, 178, 143, 0.28)",
    scrim:
      "linear-gradient(90deg, rgba(10, 7, 15, 0.7) 0%, rgba(10, 7, 15, 0.4) 50%, rgba(10, 7, 15, 0.12) 100%)",
  },
};

const THEME_DEFINITIONS: Array<Omit<ThemeMeta, "collection" | "presentation">> = [
  {
    id: "cosmic",
    name: "Cosmic",
    description:
      "Deep space constellation field with golden star-links drifting through nebula clouds.",
    vibe: "Visionary & Bold",
    background: "#06061A",
  },
  {
    id: "fluid",
    name: "Fluid",
    description:
      "Noise-driven flow field with trailing particles that carve luminous rivers through a deep ocean canvas.",
    vibe: "Creative & Approachable",
    background: "#050E18",
  },
  {
    id: "ember",
    name: "Ember",
    description:
      "Rising ember sparks with heat distortion, fading trails, and a molten base glow that shifts with the wind.",
    vibe: "Passionate & Driven",
    background: "#110605",
  },
  {
    id: "monolith",
    name: "Monolith",
    description:
      "A faceted obsidian monument rises through architectural wireframes, survey lines, and cool precision light.",
    vibe: "Executive & Minimal",
    background: "#060606",
  },
  {
    id: "aurora",
    signature: true,
    name: "Aurora",
    description:
      "Layered spectral curtains ripple with noise-driven displacement while shimmer particles rain through the bands.",
    vibe: "Innovative & Fresh",
    background: "#060D1F",
  },
  {
    id: "terracotta",
    name: "Terracotta",
    description:
      "Warm organic noise blobs drift like clay on water with fine grain texture and earthy color evolution.",
    vibe: "Grounded & Authentic",
    background: "#100C07",
  },
  {
    id: "prism",
    name: "Prism",
    description:
      "Refracting light shards rotate through spectral color splits while rainbow caustics dance on a dark surface.",
    vibe: "Daring & Expressive",
    background: "#08080F",
  },
  {
    id: "biolume",
    name: "Biolume",
    description:
      "Deep sea bioluminescent organisms pulse and drift with cyan-green phosphorescence.",
    vibe: "Thoughtful & Unique",
    background: "#030D0D",
  },
  {
    id: "circuit",
    name: "Circuit",
    description:
      "Data streams pulse along circuit traces while nodes light up as information flows through the network.",
    vibe: "Technical & Sharp",
    background: "#050A0A",
  },
  {
    id: "sakura",
    name: "Sakura",
    description:
      "Soft petals drift and tumble through gentle air currents as watercolor washes bloom and dissolve.",
    vibe: "Elegant & Refined",
    background: "#0F0A0D",
  },
  {
    id: "glacier",
    name: "Glacier",
    description:
      "Slow-drifting ice crystals and frost particles float through frozen mist with pale blue luminance.",
    vibe: "Calm & Focused",
    background: "#040810",
  },
  {
    id: "verdant",
    name: "Verdant",
    description:
      "A luminous botanical portal grows through layered canopy, drifting rain, authored leaves, and firefly light.",
    vibe: "Balanced & Growth-Minded",
    background: "#050D06",
  },
  {
    id: "neon",
    name: "Neon",
    description:
      "Pulsing neon grid lines recede into perspective while light streaks race along the horizon in synthwave style.",
    vibe: "Dynamic & Ambitious",
    background: "#08050E",
  },
  {
    id: "topo",
    name: "Topo",
    description:
      "Animated topographic contour lines shift and morph with noise, creating living elevation maps.",
    vibe: "Analytical & Precise",
    background: "#070808",
  },
  {
    id: "luxe",
    name: "Luxe",
    description:
      "A cut-brass Art Deco aperture turns through lacquered depth, architectural facets, and controlled golden glints.",
    vibe: "Prestigious & Confident",
    background: "#0A0808",
  },
  {
    id: "dusk",
    name: "Dusk",
    description:
      "Warm sunset gradient bands drift horizontally with floating dust motes caught in the fading light.",
    vibe: "Warm & Reflective",
    background: "#0E0710",
  },
  {
    id: "matrix",
    name: "Matrix",
    description:
      "Falling code rain columns with glowing lead characters and faint scanline overlay.",
    vibe: "Hacker & Cryptic",
    background: "#020804",
  },
  {
    id: "coral",
    name: "Coral",
    description:
      "Underwater coral reef with swaying tendrils, caustic light patterns, and rising bubbles.",
    vibe: "Deep & Immersive",
    background: "#040A0D",
  },
  {
    id: "stardust",
    name: "Stardust",
    description:
      "Spiraling galaxy arms with dense particle fields and softly glowing nebula clouds.",
    vibe: "Cosmic & Expansive",
    background: "#050510",
  },
  {
    id: "ink",
    name: "Ink",
    description:
      "Ink drops spreading through water with blooming organic shapes and delicate tendrils.",
    vibe: "Artistic & Contemplative",
    background: "#080A10",
  },
  {
    id: "bloom",
    name: "Bloom",
    description:
      "Generative botanical flowers open and breathe with Bézier-curve petals while golden pollen drifts upward.",
    vibe: "Lush & Radiant",
    background: "#0a0514",
  },
  {
    id: "silk",
    name: "Silk",
    description:
      "Iridescent flowing fabric threads undulate across a midnight canvas with interference color and fluid mouse response.",
    vibe: "Iridescent & Fluid",
    background: "#040612",
  },
  {
    id: "tempest",
    name: "Tempest",
    description:
      "Atmospheric storm with FBM cloud masses, fractal forking lightning, and relentless diagonal rain.",
    vibe: "Electric & Relentless",
    background: "#020306",
  },
  {
    id: "obsidian",
    name: "Obsidian",
    description:
      "Volcanic glass fractured by glowing magma veins that pulse and breathe while heat particles rise from the cracks.",
    vibe: "Fierce & Primal",
    background: "#040100",
  },
  {
    id: "apex",
    name: "Apex",
    description:
      "Architectural light towers rise from a precision floor grid while beacon lines sweep toward a moving horizon.",
    vibe: "Decisive & Elite",
    background: "#03060B",
  },
  {
    id: "atlas",
    signature: true,
    name: "Atlas",
    description:
      "Luminous globe meridians, latitude bands, and route signals pulse through a dark cartographic field.",
    vibe: "Strategic & Worldly",
    background: "#03070B",
  },
  {
    id: "forge",
    name: "Forge",
    description:
      "Forged steel rings orbit a heated core while disciplined sparks rise through industrial darkness.",
    vibe: "Powerful & Driven",
    background: "#020101",
  },
  {
    id: "vector",
    name: "Vector",
    description:
      "Blueprint grids, targeting reticles, and scanning measurement lines animate like a living design system.",
    vibe: "Precise & Technical",
    background: "#040811",
  },
  {
    id: "vault",
    name: "Vault",
    description:
      "Monumental arches recede through atmospheric light shafts with dust drifting down a central aisle.",
    vibe: "Stately & Monumental",
    background: "#030406",
  },
  {
    id: "velvet",
    signature: true,
    name: "Velvet",
    description:
      "Plush jewel-toned folds breathe with soft sheen and floating gold dust across a dark editorial stage.",
    vibe: "Rich & Poised",
    background: "#080307",
  },
  {
    id: "opaline",
    name: "Opaline",
    description:
      "Pearlescent opal discs drift through iridescent haze with subtle refraction and crystalline sparkles.",
    vibe: "Luminous & Graceful",
    background: "#060813",
  },
  {
    id: "halo",
    name: "Halo",
    description:
      "Rose-gold halos pulse in layered ellipses with atmospheric bloom and refined floating particles.",
    vibe: "Polished & Magnetic",
    background: "#050204",
  },
  {
    id: "sonata",
    name: "Sonata",
    description:
      "Elegant ribbon staves sweep across the frame while luminous notes travel in choreographed motion.",
    vibe: "Expressive & Composed",
    background: "#060205",
  },
  {
    id: "mosaic",
    name: "Mosaic",
    description:
      "Faceted glass tiles shimmer with caustic light sweeps and polished editorial color transitions.",
    vibe: "Artful & Modern",
    background: "#05060B",
  },
  {
    id: "bastion",
    name: "Bastion",
    description:
      "Hex-armored shield cells pulse with seam lights and tactical energy sweeps across a steel-dark field.",
    vibe: "Commanding & Secure",
    background: "#040507",
  },
  {
    id: "carbon",
    name: "Carbon",
    description:
      "Woven carbon-fiber texture catches chrome highlights as diagonal specular bands glide across the surface.",
    vibe: "High-Performance & Refined",
    background: "#050608",
  },
  {
    id: "caliber",
    name: "Caliber",
    description:
      "Precision instrument rings, tick marks, and sweeping indicators spin like a luxury control dial.",
    vibe: "Measured & Elite",
    background: "#03050A",
  },
  {
    id: "quarry",
    signature: true,
    name: "Quarry",
    description:
      "Layered stone terraces breathe with mineral shadow, warm seam glints, and drifting quarry dust.",
    vibe: "Solid & Grounded",
    background: "#050403",
  },
  {
    id: "harbor",
    name: "Harbor",
    description:
      "Night watch beams skim over dark water while beacon lights ripple across reflective harbor waves.",
    vibe: "Calm & Commanding",
    background: "#04070B",
  },
  {
    id: "relay",
    name: "Relay",
    description:
      "Signal towers trade luminous packets through arcing links over a dark infrastructure horizon.",
    vibe: "Connected & Future-Ready",
    background: "#03070A",
  },
  {
    id: "meridian",
    name: "Meridian",
    description:
      "Compass spokes, bearing arcs, and orbital markers turn like a living navigation instrument.",
    vibe: "Directed & Global",
    background: "#04070B",
  },
  {
    id: "atelier",
    signature: true,
    name: "Atelier",
    description:
      "Painterly ribbon strokes sweep across the canvas with layered pigment trails and luminous droplets.",
    vibe: "Curated & Creative",
    background: "#06070B",
  },
  {
    id: "porcelain",
    name: "Porcelain",
    description:
      "Ceramic glaze blooms beneath fine crack lines and soft gilded kintsugi shimmer.",
    vibe: "Delicate & Polished",
    background: "#11161F",
  },
  {
    id: "filigree",
    name: "Filigree",
    description:
      "Ornamental metallic curls unfurl from the center in elegant looping arabesques.",
    vibe: "Intricate & Regal",
    background: "#05060A",
  },
  {
    id: "cameo",
    name: "Cameo",
    description:
      "Floating medallions reveal layered relief ovals, pearl highlights, and soft shadow depth.",
    vibe: "Classic & Feminine",
    background: "#060508",
  },
  {
    id: "solstice",
    name: "Solstice",
    description:
      "Radiant sun discs, flare halos, and warm atmospheric dust bathe the frame in golden light.",
    vibe: "Warm & Radiant",
    background: "#0A0605",
  },
  {
    id: "tulle",
    name: "Tulle",
    description:
      "Translucent mesh drapes sway with pearl nodes and airy couture structure.",
    vibe: "Airy & Couture",
    background: "#06070B",
  },
  {
    id: "parasol",
    name: "Parasol",
    description:
      "Pleated fan arcs open in layered jewel tones with delicate rib lines and drifting dust.",
    vibe: "Elegant & Playful",
    background: "#060306",
  },
  {
    id: "gossamer",
    name: "Gossamer",
    description:
      "Dewy web structures glimmer with fine threads, suspended droplets, and lunar glow.",
    vibe: "Ethereal & Refined",
    background: "#04070C",
  },
  {
    id: "citadel",
    name: "Citadel",
    description:
      "Brutalist tower canyons rise around a vanishing corridor while slit-window sweeps scan the walls.",
    vibe: "Architectural & Commanding",
    background: "#030508",
  },
  {
    id: "axiom",
    name: "Axiom",
    description:
      "Theorem lines, proof arcs, and luminous node pulses map across a disciplined analytical field.",
    vibe: "Intellectual & Precise",
    background: "#040713",
  },
  {
    id: "helix",
    name: "Helix",
    description:
      "Chrome double-helix ribbons twist through orbital beads and cool laboratory light.",
    vibe: "Advanced & Kinetic",
    background: "#04060D",
  },
  {
    id: "jetstream",
    name: "Jetstream",
    description:
      "Contrails, turbulence ribbons, and speed streaks cut across a high-altitude cinematic sky.",
    vibe: "Fast & Aerodynamic",
    background: "#040913",
  },
  {
    id: "echelon",
    name: "Echelon",
    description:
      "Staggered chevron planes advance in formation as tactical sweep lights rake across the stack.",
    vibe: "Strategic & Elite",
    background: "#04070D",
  },
  {
    id: "vellum",
    name: "Vellum",
    description:
      "Translucent paper layers drift in soft overlap with shadowed edges and couture calm.",
    vibe: "Editorial & Airy",
    background: "#09080D",
  },
  {
    id: "nocturne",
    signature: true,
    name: "Nocturne",
    description:
      "Moonlit crescents, indigo haze, and floating dust motes unfold like a midnight stage set.",
    vibe: "Dreamlike & Poised",
    background: "#050713",
  },
  {
    id: "lustre",
    name: "Lustre",
    description:
      "Molten champagne-metal ribbons pour through darkness with polished glints and warm bloom.",
    vibe: "Luxurious & Fluid",
    background: "#090608",
  },
  {
    id: "fresco",
    name: "Fresco",
    description:
      "Mineral plaster washes breathe with soft cracking, chalk bloom, and painterly pigment drift.",
    vibe: "Textural & Collected",
    background: "#0D0907",
  },
  {
    id: "rosaline",
    name: "Rosaline",
    description:
      "Rose-quartz facets refract blush halos and soft crystalline gleam across an elegant frame.",
    vibe: "Radiant & Refined",
    background: "#09060A",
  },
];

// Theme metadata only — no renderer code. Renderers are loaded on demand from
// ./renderers/<id> via loadRenderer(), so importing the registry (for names,
// collections, and presentation colors) never pulls the ~59 canvas modules into
// a consumer's bundle. ThemeCanvas resolves the matching renderer lazily.
export const THEME_REGISTRY: ThemeMeta[] = THEME_DEFINITIONS.map((theme) => ({
  ...theme,
  collection: THEME_COLLECTIONS[theme.id],
  presentation: {
    ...THEME_PRESENTATION_DEFAULTS[THEME_COLLECTIONS[theme.id]],
    ...THEME_ACCENT_PALETTES[theme.id],
    ...(theme.signature ? {} : worldPresentation(theme.background)),
    ...THEME_PRESENTATION_OVERRIDES[theme.id],
  },
}));

export const THEME_MAP = THEME_REGISTRY.reduce<Record<ThemeId, ThemeMeta>>((acc, theme) => {
  acc[theme.id] = theme;
  return acc;
}, {} as Record<ThemeId, ThemeMeta>);

export function getTheme(themeId: string): ThemeMeta | undefined {
  return THEME_REGISTRY.find((theme) => theme.id === themeId);
}
