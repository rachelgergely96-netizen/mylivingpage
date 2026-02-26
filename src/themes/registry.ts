import { renderAurora } from "./renderers/aurora";
import { renderBiolume } from "./renderers/biolume";
import { renderCircuit } from "./renderers/circuit";
import { renderCosmic } from "./renderers/cosmic";
import { renderEmber } from "./renderers/ember";
import { renderFluid } from "./renderers/fluid";
import { renderMonolith } from "./renderers/monolith";
import { renderPrism } from "./renderers/prism";
import { renderSakura } from "./renderers/sakura";
import { renderTerracotta } from "./renderers/terracotta";
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
];

export const THEME_MAP = THEME_REGISTRY.reduce<Record<ThemeId, ThemeDefinition>>((acc, theme) => {
  acc[theme.id] = theme;
  return acc;
}, {} as Record<ThemeId, ThemeDefinition>);

export function getTheme(themeId: string): ThemeDefinition | undefined {
  return THEME_REGISTRY.find((theme) => theme.id === themeId);
}
