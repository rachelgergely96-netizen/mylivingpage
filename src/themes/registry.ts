import { renderBloom } from "./renderers/bloom";
import { renderObsidian } from "./renderers/obsidian";
import { renderSilk } from "./renderers/silk";
import { renderTempest } from "./renderers/tempest";
import { renderApex } from "./renderers/apex";
import { renderAurora } from "./renderers/aurora";
import { renderAtlas } from "./renderers/atlas";
import { renderBiolume } from "./renderers/biolume";
import { renderCircuit } from "./renderers/circuit";
import { renderCoral } from "./renderers/coral";
import { renderCosmic } from "./renderers/cosmic";
import { renderDusk } from "./renderers/dusk";
import { renderEmber } from "./renderers/ember";
import { renderFluid } from "./renderers/fluid";
import { renderForge } from "./renderers/forge";
import { renderGlacier } from "./renderers/glacier";
import { renderHalo } from "./renderers/halo";
import { renderInk } from "./renderers/ink";
import { renderLuxe } from "./renderers/luxe";
import { renderMatrix } from "./renderers/matrix";
import { renderMonolith } from "./renderers/monolith";
import { renderMosaic } from "./renderers/mosaic";
import { renderNeon } from "./renderers/neon";
import { renderOpaline } from "./renderers/opaline";
import { renderPrism } from "./renderers/prism";
import { renderSakura } from "./renderers/sakura";
import { renderSonata } from "./renderers/sonata";
import { renderStardust } from "./renderers/stardust";
import { renderTerracotta } from "./renderers/terracotta";
import { renderTopo } from "./renderers/topo";
import { renderVector } from "./renderers/vector";
import { renderVerdant } from "./renderers/verdant";
import { renderVault } from "./renderers/vault";
import { renderVelvet } from "./renderers/velvet";
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
  {
    id: "bloom",
    name: "Bloom",
    description:
      "Generative botanical flowers open and breathe with Bézier-curve petals while golden pollen drifts upward.",
    vibe: "Lush & Radiant",
    background: "#0a0514",
    renderer: renderBloom,
  },
  {
    id: "silk",
    name: "Silk",
    description:
      "Iridescent flowing fabric threads undulate across a midnight canvas with interference color and fluid mouse response.",
    vibe: "Iridescent & Fluid",
    background: "#040612",
    renderer: renderSilk,
  },
  {
    id: "tempest",
    name: "Tempest",
    description:
      "Atmospheric storm with FBM cloud masses, fractal forking lightning, and relentless diagonal rain.",
    vibe: "Electric & Relentless",
    background: "#020306",
    renderer: renderTempest,
  },
  {
    id: "obsidian",
    name: "Obsidian",
    description:
      "Volcanic glass fractured by glowing magma veins that pulse and breathe while heat particles rise from the cracks.",
    vibe: "Fierce & Primal",
    background: "#040100",
    renderer: renderObsidian,
  },
  {
    id: "apex",
    name: "Apex",
    description:
      "Architectural light towers rise from a precision floor grid while beacon lines sweep toward a moving horizon.",
    vibe: "Decisive & Elite",
    background: "#03060B",
    renderer: renderApex,
  },
  {
    id: "atlas",
    name: "Atlas",
    description:
      "Luminous globe meridians, latitude bands, and route signals pulse through a dark cartographic field.",
    vibe: "Strategic & Worldly",
    background: "#03070B",
    renderer: renderAtlas,
  },
  {
    id: "forge",
    name: "Forge",
    description:
      "Forged steel rings orbit a heated core while disciplined sparks rise through industrial darkness.",
    vibe: "Powerful & Driven",
    background: "#020101",
    renderer: renderForge,
  },
  {
    id: "vector",
    name: "Vector",
    description:
      "Blueprint grids, targeting reticles, and scanning measurement lines animate like a living design system.",
    vibe: "Precise & Technical",
    background: "#040811",
    renderer: renderVector,
  },
  {
    id: "vault",
    name: "Vault",
    description:
      "Monumental arches recede through atmospheric light shafts with dust drifting down a central aisle.",
    vibe: "Stately & Monumental",
    background: "#030406",
    renderer: renderVault,
  },
  {
    id: "velvet",
    name: "Velvet",
    description:
      "Plush jewel-toned folds breathe with soft sheen and floating gold dust across a dark editorial stage.",
    vibe: "Rich & Poised",
    background: "#080307",
    renderer: renderVelvet,
  },
  {
    id: "opaline",
    name: "Opaline",
    description:
      "Pearlescent opal discs drift through iridescent haze with subtle refraction and crystalline sparkles.",
    vibe: "Luminous & Graceful",
    background: "#060813",
    renderer: renderOpaline,
  },
  {
    id: "halo",
    name: "Halo",
    description:
      "Rose-gold halos pulse in layered ellipses with atmospheric bloom and refined floating particles.",
    vibe: "Polished & Magnetic",
    background: "#050204",
    renderer: renderHalo,
  },
  {
    id: "sonata",
    name: "Sonata",
    description:
      "Elegant ribbon staves sweep across the frame while luminous notes travel in choreographed motion.",
    vibe: "Expressive & Composed",
    background: "#060205",
    renderer: renderSonata,
  },
  {
    id: "mosaic",
    name: "Mosaic",
    description:
      "Faceted glass tiles shimmer with caustic light sweeps and polished editorial color transitions.",
    vibe: "Artful & Modern",
    background: "#05060B",
    renderer: renderMosaic,
  },
];

export const THEME_MAP = THEME_REGISTRY.reduce<Record<ThemeId, ThemeDefinition>>((acc, theme) => {
  acc[theme.id] = theme;
  return acc;
}, {} as Record<ThemeId, ThemeDefinition>);

export function getTheme(themeId: string): ThemeDefinition | undefined {
  return THEME_REGISTRY.find((theme) => theme.id === themeId);
}
