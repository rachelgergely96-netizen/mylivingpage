import { renderAurora } from "./renderers/aurora";
import { renderBiolume } from "./renderers/biolume";
import { renderCircuit } from "./renderers/circuit";
import { renderCoral } from "./renderers/coral";
import { renderCosmic } from "./renderers/cosmic";
import { renderDusk } from "./renderers/dusk";
import { renderEmber } from "./renderers/ember";
import { renderFluid } from "./renderers/fluid";
import { renderGlacier } from "./renderers/glacier";
import { renderInk } from "./renderers/ink";
import { renderLuxe } from "./renderers/luxe";
import { renderMatrix } from "./renderers/matrix";
import { renderMonolith } from "./renderers/monolith";
import { renderNeon } from "./renderers/neon";
import { renderPrism } from "./renderers/prism";
import { renderSakura } from "./renderers/sakura";
import { renderStardust } from "./renderers/stardust";
import { renderTerracotta } from "./renderers/terracotta";
import { renderTopo } from "./renderers/topo";
import { renderVerdant } from "./renderers/verdant";
import type { ThemeDefinition, ThemeId } from "./types";

export const THEME_REGISTRY: ThemeDefinition[] = [
  {
    id: "cosmic",
    name: "Cosmic",
    description:
      "Deep space constellation field with golden star-links drifting through nebula clouds.",
    vibe: "Visionary & Bold",
    background: "#06061A",
    renderer: renderCosmic,
  },
  {
    id: "fluid",
    name: "Fluid",
    description:
      "Noise-driven flow field with trailing particles that carve luminous rivers through a deep ocean canvas.",
    vibe: "Creative & Approachable",
    background: "#050E18",
    renderer: renderFluid,
  },
  {
    id: "ember",
    name: "Ember",
    description:
      "Rising ember sparks with heat distortion, fading trails, and a molten base glow that shifts with the wind.",
    vibe: "Passionate & Driven",
    background: "#110605",
    renderer: renderEmber,
  },
  {
    id: "monolith",
    name: "Monolith",
    description:
      "Rotating concentric wireframes pulse over a dot matrix grid in minimalist geometric motion.",
    vibe: "Executive & Minimal",
    background: "#060606",
    renderer: renderMonolith,
  },
  {
    id: "aurora",
    name: "Aurora",
    description:
      "Layered spectral curtains ripple with noise-driven displacement while shimmer particles rain through the bands.",
    vibe: "Innovative & Fresh",
    background: "#060D1F",
    renderer: renderAurora,
  },
  {
    id: "terracotta",
    name: "Terracotta",
    description:
      "Warm organic noise blobs drift like clay on water with fine grain texture and earthy color evolution.",
    vibe: "Grounded & Authentic",
    background: "#100C07",
    renderer: renderTerracotta,
  },
  {
    id: "prism",
    name: "Prism",
    description:
      "Refracting light shards rotate through spectral color splits while rainbow caustics dance on a dark surface.",
    vibe: "Daring & Expressive",
    background: "#08080F",
    renderer: renderPrism,
  },
  {
    id: "biolume",
    name: "Biolume",
    description:
      "Deep sea bioluminescent organisms pulse and drift with cyan-green phosphorescence.",
    vibe: "Thoughtful & Unique",
    background: "#030D0D",
    renderer: renderBiolume,
  },
  {
    id: "circuit",
    name: "Circuit",
    description:
      "Data streams pulse along circuit traces while nodes light up as information flows through the network.",
    vibe: "Technical & Sharp",
    background: "#050A0A",
    renderer: renderCircuit,
  },
  {
    id: "sakura",
    name: "Sakura",
    description:
      "Soft petals drift and tumble through gentle air currents as watercolor washes bloom and dissolve.",
    vibe: "Elegant & Refined",
    background: "#0F0A0D",
    renderer: renderSakura,
  },
  {
    id: "glacier",
    name: "Glacier",
    description:
      "Slow-drifting ice crystals and frost particles float through frozen mist with pale blue luminance.",
    vibe: "Calm & Focused",
    background: "#040810",
    renderer: renderGlacier,
  },
  {
    id: "verdant",
    name: "Verdant",
    description:
      "Organic vine tendrils grow and branch across the canvas while firefly particles drift through a lush canopy.",
    vibe: "Balanced & Growth-Minded",
    background: "#050D06",
    renderer: renderVerdant,
  },
  {
    id: "neon",
    name: "Neon",
    description:
      "Pulsing neon grid lines recede into perspective while light streaks race along the horizon in synthwave style.",
    vibe: "Dynamic & Ambitious",
    background: "#08050E",
    renderer: renderNeon,
  },
  {
    id: "topo",
    name: "Topo",
    description:
      "Animated topographic contour lines shift and morph with noise, creating living elevation maps.",
    vibe: "Analytical & Precise",
    background: "#070808",
    renderer: renderTopo,
  },
  {
    id: "luxe",
    name: "Luxe",
    description:
      "Golden light rays slowly sweep through darkness while metallic flecks drift and catch the light.",
    vibe: "Prestigious & Confident",
    background: "#0A0808",
    renderer: renderLuxe,
  },
  {
    id: "dusk",
    name: "Dusk",
    description:
      "Warm sunset gradient bands drift horizontally with floating dust motes caught in the fading light.",
    vibe: "Warm & Reflective",
    background: "#0E0710",
    renderer: renderDusk,
  },
  {
    id: "matrix",
    name: "Matrix",
    description:
      "Falling code rain columns with glowing lead characters and faint scanline overlay.",
    vibe: "Hacker & Cryptic",
    background: "#020804",
    renderer: renderMatrix,
  },
  {
    id: "coral",
    name: "Coral",
    description:
      "Underwater coral reef with swaying tendrils, caustic light patterns, and rising bubbles.",
    vibe: "Deep & Immersive",
    background: "#040A0D",
    renderer: renderCoral,
  },
  {
    id: "stardust",
    name: "Stardust",
    description:
      "Spiraling galaxy arms with dense particle fields and softly glowing nebula clouds.",
    vibe: "Cosmic & Expansive",
    background: "#050510",
    renderer: renderStardust,
  },
  {
    id: "ink",
    name: "Ink",
    description:
      "Ink drops spreading through water with blooming organic shapes and delicate tendrils.",
    vibe: "Artistic & Contemplative",
    background: "#080A10",
    renderer: renderInk,
  },
];

export const THEME_MAP = THEME_REGISTRY.reduce<Record<ThemeId, ThemeDefinition>>((acc, theme) => {
  acc[theme.id] = theme;
  return acc;
}, {} as Record<ThemeId, ThemeDefinition>);

export function getTheme(themeId: string): ThemeDefinition | undefined {
  return THEME_REGISTRY.find((theme) => theme.id === themeId);
}
