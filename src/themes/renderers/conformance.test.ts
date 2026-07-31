import { describe, expect, it } from "vitest";
import {
  THEME_IDS,
  type ThemeId,
  type ThemeMotionContext,
  type ThemeRenderer,
} from "@/themes/types";

/**
 * Theme ids whose renderer consumes the page-motion contract through
 * resolveThemeMotion (the uniform 8-arg motion-aware format).
 *
 * This list must only grow: upgrading a legacy renderer to the uniform format
 * adds its id here, and no id is ever removed. Legacy renderers are exercised
 * through the same raw exports the loadRenderer adapter calls today — the
 * host always passes all eight arguments and legacy signatures simply ignore
 * the trailing deltaSeconds/motion pair.
 */
const MOTION_AWARE: readonly ThemeId[] = [
  "apex",
  "atelier",
  "atlas",
  "aurora",
  "axiom",
  "bastion",
  "biolume",
  "bloom",
  "caliber",
  "cameo",
  "carbon",
  "circuit",
  "citadel",
  "coral",
  "cosmic",
  "dusk",
  "echelon",
  "ember",
  "filigree",
  "fluid",
  "forge",
  "fresco",
  "glacier",
  "gossamer",
  "halo",
  "harbor",
  "helix",
  "ink",
  "jetstream",
  "lustre",
  "luxe",
  "matrix",
  "meridian",
  "monolith",
  "mosaic",
  "neon",
  "nocturne",
  "obsidian",
  "opaline",
  "parasol",
  "porcelain",
  "prism",
  "quarry",
  "relay",
  "rosaline",
  "sakura",
  "silk",
  "solstice",
  "sonata",
  "stardust",
  "tempest",
  "terracotta",
  "topo",
  "tulle",
  "vault",
  "vector",
  "vellum",
  "velvet",
  "verdant",
];

const FRAME_TIMES = [0, 0.75, 2.5, 6.25];
const DELTA_SECONDS = 1 / 60;
const POINTER_X = 0.3;
const POINTER_Y = 0.7;

type LogEntry = [kind: string, ...detail: unknown[]];

interface StubContext {
  ctx: CanvasRenderingContext2D;
  log: LogEntry[];
  saveRestoreDepth: () => number;
  resetTokens: () => void;
}

const CTX_PROPERTY_DEFAULTS: Record<string, unknown> = {
  fillStyle: "#000000",
  strokeStyle: "#000000",
  globalAlpha: 1,
  globalCompositeOperation: "source-over",
  lineWidth: 1,
  lineCap: "butt",
  lineJoin: "miter",
  miterLimit: 10,
  font: "10px sans-serif",
  textAlign: "start",
  textBaseline: "alphabetic",
  shadowBlur: 0,
  shadowColor: "rgba(0, 0, 0, 0)",
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  filter: "none",
  imageSmoothingEnabled: true,
  imageSmoothingQuality: "low",
  lineDashOffset: 0,
  direction: "ltr",
};

/**
 * A recording stand-in for CanvasRenderingContext2D: every method call and
 * property set lands on an ordered log, save/restore depth is tracked, and
 * gradient factories return stubs whose color stops are logged against a
 * stable token. Property reads return the last written value so read-modify-
 * write patterns (`ctx.globalAlpha *= 1.4`) behave like the real context.
 */
function createStubContext(width: number, height: number): StubContext {
  const log: LogEntry[] = [];
  const props: Record<string, unknown> = { ...CTX_PROPERTY_DEFAULTS };
  const methodCache = new Map<string, (...args: unknown[]) => unknown>();
  let depth = 0;
  let objectId = 0;

  const serialize = (value: unknown): unknown => {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : `num:${String(value)}`;
    }
    if (
      typeof value === "string" ||
      typeof value === "boolean" ||
      value === null
    ) {
      return value;
    }
    if (value === undefined) return "undefined";
    if (Array.isArray(value)) return value.map(serialize);
    if (
      typeof value === "object" &&
      typeof (value as { __token?: unknown }).__token === "string"
    ) {
      return (value as { __token: string }).__token;
    }
    return `obj:${String(value)}`;
  };

  const makeGradient = (kind: string, args: unknown[]) => {
    const token = `${kind}#${objectId}`;
    objectId += 1;
    log.push(["create", token, args.map(serialize)]);
    return {
      __token: token,
      addColorStop(offset: number, color: string) {
        log.push(["stop", token, serialize(offset), serialize(color)]);
      },
    };
  };

  const makeMethod = (name: string) => {
    return (...args: unknown[]): unknown => {
      if (name === "save") {
        depth += 1;
        log.push(["call", "save"]);
        return undefined;
      }
      if (name === "restore") {
        depth -= 1;
        log.push(["call", "restore"]);
        return undefined;
      }
      if (
        name === "createLinearGradient" ||
        name === "createRadialGradient" ||
        name === "createConicGradient"
      ) {
        return makeGradient(name.replace("create", "").toLowerCase(), args);
      }
      log.push(["call", name, args.map(serialize)]);
      if (name === "measureText") {
        return { width: 0 };
      }
      if (name === "getLineDash") {
        return [];
      }
      if (name === "isPointInPath" || name === "isPointInStroke") {
        return false;
      }
      return undefined;
    };
  };

  const ctx = new Proxy(
    {},
    {
      get(_target, key) {
        if (typeof key !== "string") return undefined;
        if (key === "canvas") return { width, height };
        if (Object.prototype.hasOwnProperty.call(props, key)) {
          return props[key];
        }
        let method = methodCache.get(key);
        if (!method) {
          method = makeMethod(key);
          methodCache.set(key, method);
        }
        return method;
      },
      set(_target, key, value) {
        if (typeof key === "string") {
          log.push(["set", key, serialize(value)]);
          props[key] = value;
        }
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;

  return {
    ctx,
    log,
    saveRestoreDepth: () => depth,
    resetTokens: () => {
      objectId = 0;
    },
  };
}

function motionContext(
  overrides: Partial<ThemeMotionContext> = {},
): ThemeMotionContext {
  return {
    scrollProgress: 0.42,
    scrollVelocity: 0.6,
    scrollDirection: 1,
    activeSection: "projects",
    activeSectionIndex: 2,
    sectionCount: 6,
    sectionProgress: 0.35,
    focusedItem: "item-3",
    focusKind: "project",
    focusX: 0.64,
    focusY: 0.38,
    focusStrength: 0.5,
    interactionImpulse: 0.4,
    pointerVelocityX: 0.12,
    pointerVelocityY: -0.08,
    pointerSpeed: 0.25,
    reducedMotion: false,
    ...overrides,
  };
}

// Mirrors loadRenderer's export resolution, but returns the raw un-polished
// renderer so the contract is checked on what each theme module itself ships.
function rendererExportName(id: ThemeId): string {
  return `render${id.charAt(0).toUpperCase()}${id.slice(1)}`;
}

async function loadRawRenderer(id: ThemeId): Promise<ThemeRenderer> {
  const rendererModule = (await import(`./${id}.ts`)) as Record<
    string,
    unknown
  >;
  const renderer = rendererModule[rendererExportName(id)];
  expect(typeof renderer, `${id} exports ${rendererExportName(id)}`).toBe(
    "function",
  );
  return renderer as ThemeRenderer;
}

/**
 * Renders one warm-up frame (fills any module-level, context-keyed gradient
 * caches) and returns the log of a second, comparable frame. Token numbering
 * restarts before the compared frame so two behaviorally identical frames
 * serialize identically even when their warm-ups created different numbers of
 * cached objects.
 */
function renderComparableFrame(
  renderer: ThemeRenderer,
  motion: ThemeMotionContext,
): LogEntry[] {
  const stub = createStubContext(800, 600);
  renderer(stub.ctx, 800, 600, 2.5, POINTER_X, POINTER_Y, DELTA_SECONDS, motion);
  const start = stub.log.length;
  stub.resetTokens();
  renderer(stub.ctx, 800, 600, 2.5, POINTER_X, POINTER_Y, DELTA_SECONDS, motion);
  return stub.log.slice(start);
}

describe("renderer conformance", () => {
  expect(new Set(MOTION_AWARE).size).toBe(MOTION_AWARE.length);

  for (const id of THEME_IDS) {
    describe(id, () => {
      it("renders motion-active frames with balanced canvas state", async () => {
        const renderer = await loadRawRenderer(id);
        const stub = createStubContext(800, 600);

        for (const time of FRAME_TIMES) {
          renderer(
            stub.ctx,
            800,
            600,
            time,
            POINTER_X,
            POINTER_Y,
            DELTA_SECONDS,
            motionContext(),
          );
          expect(stub.saveRestoreDepth(), `motion-active t=${time}`).toBe(0);
        }
      });

      it("renders without a motion context (legacy 6-arg call)", async () => {
        const renderer = await loadRawRenderer(id);
        const stub = createStubContext(800, 600);

        for (const time of FRAME_TIMES) {
          renderer(stub.ctx, 800, 600, time, POINTER_X, POINTER_Y);
          expect(stub.saveRestoreDepth(), `motion-undefined t=${time}`).toBe(0);
        }
      });

      it("renders under reducedMotion", async () => {
        const renderer = await loadRawRenderer(id);
        const stub = createStubContext(800, 600);

        for (const time of FRAME_TIMES) {
          renderer(
            stub.ctx,
            800,
            600,
            time,
            POINTER_X,
            POINTER_Y,
            DELTA_SECONDS,
            motionContext({ reducedMotion: true }),
          );
          expect(stub.saveRestoreDepth(), `reduced-motion t=${time}`).toBe(0);
        }
      });

      it("survives zero-sized canvases", async () => {
        const renderer = await loadRawRenderer(id);

        for (const [width, height] of [
          [0, 0],
          [0, 600],
          [800, 0],
        ] as const) {
          const stub = createStubContext(width, height);
          renderer(
            stub.ctx,
            width,
            height,
            1.5,
            POINTER_X,
            POINTER_Y,
            DELTA_SECONDS,
            motionContext(),
          );
          expect(stub.saveRestoreDepth(), `size ${width}x${height}`).toBe(0);
        }
      });

      if (MOTION_AWARE.includes(id)) {
        it("declares the full 8-arg motion-aware signature", async () => {
          const renderer = await loadRawRenderer(id);
          expect(renderer.length).toBe(8);
        });

        it("ignores transient page motion under reducedMotion", async () => {
          // resolveThemeMotion zeroes scroll velocity, interaction impulse,
          // and pointer speed under reducedMotion, so wildly different
          // transient values must not change a single draw call.
          const renderer = await loadRawRenderer(id);
          // Prime module-level caches keyed by canvas size (the zero-size
          // test above may have invalidated them) so both compared runs see
          // identical warm cache state.
          renderComparableFrame(renderer, motionContext());
          const still = renderComparableFrame(
            renderer,
            motionContext({
              reducedMotion: true,
              scrollVelocity: 0,
              scrollDirection: 0,
              interactionImpulse: 0,
              pointerSpeed: 0,
              pointerVelocityX: 0,
              pointerVelocityY: 0,
            }),
          );
          const agitated = renderComparableFrame(
            renderer,
            motionContext({
              reducedMotion: true,
              scrollVelocity: 3.2,
              scrollDirection: 1,
              interactionImpulse: 0.9,
              pointerSpeed: 2.5,
              pointerVelocityX: 1.2,
              pointerVelocityY: -0.7,
            }),
          );

          expect(agitated).toEqual(still);
        });
      }
    });
  }
});
