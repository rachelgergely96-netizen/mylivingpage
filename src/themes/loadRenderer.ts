import type { ThemeId, ThemeRenderer } from "./types";

// Each renderer lives in ./renderers/<id> and exports a single function named
// render<Id> (e.g. "cosmic" -> renderCosmic). The template-literal dynamic
// import makes the bundler emit one lazy chunk per renderer, so a page that
// shows one theme never downloads the other ~58. Resolved renderers are cached
// for the lifetime of the module.
const rendererCache = new Map<ThemeId, ThemeRenderer>();
const pending = new Map<ThemeId, Promise<ThemeRenderer | null>>();

function rendererExportName(id: ThemeId): string {
  return `render${id.charAt(0).toUpperCase()}${id.slice(1)}`;
}

export function getLoadedRenderer(id: ThemeId): ThemeRenderer | null {
  return rendererCache.get(id) ?? null;
}

export function loadRenderer(id: ThemeId): Promise<ThemeRenderer | null> {
  const cached = rendererCache.get(id);
  if (cached) {
    return Promise.resolve(cached);
  }
  const inFlight = pending.get(id);
  if (inFlight) {
    return inFlight;
  }

  const promise = import(`./renderers/${id}`)
    .then((module: Record<string, unknown>) => {
      const renderer = module[rendererExportName(id)];
      if (typeof renderer !== "function") {
        return null;
      }
      const typed = renderer as ThemeRenderer;
      rendererCache.set(id, typed);
      return typed;
    })
    .catch(() => null)
    .finally(() => {
      pending.delete(id);
    });

  pending.set(id, promise);
  return promise;
}
