import type { ThemeId, ThemeRenderer } from "./types";

type RendererModule = Record<string, unknown>;
type RendererLoader = () => Promise<RendererModule>;

// Keeping the import paths explicit lets both Next/Webpack and the Vitest/Vite
// pipeline verify every chunk at build time while still emitting one lazy
// chunk per renderer.
const RENDERER_LOADERS = {
  "cosmic": () => import("./renderers/cosmic"),
  "fluid": () => import("./renderers/fluid"),
  "ember": () => import("./renderers/ember"),
  "monolith": () => import("./renderers/monolith"),
  "aurora": () => import("./renderers/aurora"),
  "terracotta": () => import("./renderers/terracotta"),
  "prism": () => import("./renderers/prism"),
  "biolume": () => import("./renderers/biolume"),
  "circuit": () => import("./renderers/circuit"),
  "sakura": () => import("./renderers/sakura"),
  "glacier": () => import("./renderers/glacier"),
  "verdant": () => import("./renderers/verdant"),
  "neon": () => import("./renderers/neon"),
  "topo": () => import("./renderers/topo"),
  "luxe": () => import("./renderers/luxe"),
  "dusk": () => import("./renderers/dusk"),
  "matrix": () => import("./renderers/matrix"),
  "coral": () => import("./renderers/coral"),
  "stardust": () => import("./renderers/stardust"),
  "ink": () => import("./renderers/ink"),
  "bloom": () => import("./renderers/bloom"),
  "silk": () => import("./renderers/silk"),
  "tempest": () => import("./renderers/tempest"),
  "obsidian": () => import("./renderers/obsidian"),
  "apex": () => import("./renderers/apex"),
  "atlas": () => import("./renderers/atlas"),
  "forge": () => import("./renderers/forge"),
  "vector": () => import("./renderers/vector"),
  "vault": () => import("./renderers/vault"),
  "velvet": () => import("./renderers/velvet"),
  "opaline": () => import("./renderers/opaline"),
  "halo": () => import("./renderers/halo"),
  "sonata": () => import("./renderers/sonata"),
  "mosaic": () => import("./renderers/mosaic"),
  "bastion": () => import("./renderers/bastion"),
  "carbon": () => import("./renderers/carbon"),
  "caliber": () => import("./renderers/caliber"),
  "quarry": () => import("./renderers/quarry"),
  "harbor": () => import("./renderers/harbor"),
  "relay": () => import("./renderers/relay"),
  "meridian": () => import("./renderers/meridian"),
  "atelier": () => import("./renderers/atelier"),
  "porcelain": () => import("./renderers/porcelain"),
  "filigree": () => import("./renderers/filigree"),
  "cameo": () => import("./renderers/cameo"),
  "solstice": () => import("./renderers/solstice"),
  "tulle": () => import("./renderers/tulle"),
  "parasol": () => import("./renderers/parasol"),
  "gossamer": () => import("./renderers/gossamer"),
  "citadel": () => import("./renderers/citadel"),
  "axiom": () => import("./renderers/axiom"),
  "helix": () => import("./renderers/helix"),
  "jetstream": () => import("./renderers/jetstream"),
  "echelon": () => import("./renderers/echelon"),
  "vellum": () => import("./renderers/vellum"),
  "nocturne": () => import("./renderers/nocturne"),
  "lustre": () => import("./renderers/lustre"),
  "fresco": () => import("./renderers/fresco"),
  "rosaline": () => import("./renderers/rosaline"),
} satisfies Record<ThemeId, RendererLoader>;

// Resolved renderers are cached for the lifetime of the module.
const rendererCache = new Map<ThemeId, ThemeRenderer>();
const pending = new Map<ThemeId, Promise<ThemeRenderer>>();

function rendererExportName(id: ThemeId): string {
  return `render${id.charAt(0).toUpperCase()}${id.slice(1)}`;
}

export function getLoadedRenderer(id: ThemeId): ThemeRenderer | null {
  return rendererCache.get(id) ?? null;
}

export function loadRenderer(id: ThemeId): Promise<ThemeRenderer> {
  const cached = rendererCache.get(id);
  if (cached) {
    return Promise.resolve(cached);
  }
  const inFlight = pending.get(id);
  if (inFlight) {
    return inFlight;
  }

  const loader = RENDERER_LOADERS[id];
  if (!loader) {
    return Promise.reject(new Error(`Unable to load theme renderer "${id}". Unknown theme id.`));
  }

  const promise = loader()
    .then((module: Record<string, unknown>) => {
      const renderer = module[rendererExportName(id)];
      if (typeof renderer !== "function") {
        throw new Error(`Theme renderer module "${id}" has no ${rendererExportName(id)} export.`);
      }
      const typed = renderer as ThemeRenderer;
      rendererCache.set(id, typed);
      return typed;
    })
    .catch((error: unknown) => {
      const detail = error instanceof Error ? ` ${error.message}` : "";
      throw new Error(`Unable to load theme renderer "${id}".${detail}`);
    })
    .finally(() => {
      pending.delete(id);
    });

  pending.set(id, promise);
  return promise;
}
