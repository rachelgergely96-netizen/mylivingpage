"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import {
  createInitialThemeMotionContext,
  useLivingMotionBridge,
} from "@/hooks/useLivingMotionBridge";
import { MOTION_MODE_POLICIES, type MotionMode } from "@/lib/motion";
import { THEME_MAP } from "@/themes/registry";
import { createSeededRandom } from "@/themes/shared/random";
import { getLoadedRenderer, loadRenderer } from "@/themes/loadRenderer";
import {
  applySectionMotionToPointer,
  clearTransientThemeMotion,
  decayTransientThemeMotion,
} from "@/themes/shared/motion";
import { createMotionSampler, type MotionSampler } from "@/themes/shared/smoothing";
import { shouldPresentFrame } from "@/themes/shared/timing";
import type { ThemeId, ThemeMotionContext, ThemeRenderer } from "@/themes/types";

// Whether CanvasRenderingContext2D.filter accepts a blur — probed once per
// session on the bloom buffer; unsupported browsers use a separable fallback.
let canvasFilterSupported: boolean | null = null;

// The film-grain tile is deterministic, so every canvas can share one. The
// theme picker mounts all 59 previews at once; building a tile per instance
// meant 59 × 16k pixels of identical noise and 59 retained offscreen canvases.
let sharedNoiseTile: HTMLCanvasElement | null = null;

function getSharedNoiseTile(): HTMLCanvasElement | null {
  if (sharedNoiseTile) return sharedNoiseTile;
  const tile = document.createElement("canvas");
  tile.width = 128;
  tile.height = 128;
  const noiseContext = tile.getContext("2d");
  if (!noiseContext) return null;
  const image = noiseContext.createImageData(128, 128);
  const data = image.data;
  const random = createSeededRandom(0x9e3779b9);
  for (let i = 0; i < data.length; i += 4) {
    const value = Math.floor(random() * 255);
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = 255;
  }
  noiseContext.putImageData(image, 0, 0);
  sharedNoiseTile = tile;
  return sharedNoiseTile;
}

type ThemeCanvasStyle = React.CSSProperties & {
  "--theme-accent": string;
  "--theme-accent-bright": string;
  "--theme-accent-soft": string;
  "--theme-accent-border": string;
  "--theme-text": string;
  "--theme-text-muted": string;
  "--theme-text-subtle": string;
  "--theme-surface": string;
  "--theme-surface-strong": string;
  "--theme-border": string;
};

/**
 * Living Page foregrounds intentionally use one presentation system. Theme
 * metadata still belongs to the renderer, picker, and share card, while the
 * resume itself remains visually identical when a user changes backgrounds.
 */
const UNIFORM_LIVING_PAGE_STYLE: ThemeCanvasStyle = {
  "--theme-accent": "#9db8e8",
  "--theme-accent-bright": "#e9f0ff",
  "--theme-accent-soft": "rgba(157, 184, 232, 0.12)",
  "--theme-accent-border": "rgba(174, 197, 238, 0.26)",
  "--theme-text": "#f7f9fc",
  "--theme-text-muted": "rgba(237, 242, 250, 0.84)",
  "--theme-text-subtle": "rgba(221, 230, 243, 0.68)",
  "--theme-surface": "rgba(10, 13, 20, 0.66)",
  "--theme-surface-strong": "rgba(8, 11, 17, 0.78)",
  "--theme-border": "rgba(222, 231, 244, 0.14)",
  fontFamily: "var(--font-dm-sans), sans-serif",
};

const UNIFORM_LIVING_PAGE_SCRIM =
  "linear-gradient(180deg, rgba(3, 5, 9, 0.1) 0%, rgba(3, 5, 9, 0.02) 24%, rgba(3, 5, 9, 0.02) 76%, rgba(3, 5, 9, 0.14) 100%)";

interface ThemeCanvasProps {
  themeId: ThemeId;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
  interactive?: boolean;
  animated?: boolean;
  mobileAmbientMotion?: boolean;
  /** Override the saved device preference for an authored static surface. */
  motionMode?: MotionMode;
  /** Let supported renderers react to page sections, scroll, and focused cards. */
  motionAware?: boolean;
  /**
   * Animation frame-rate cap. Callers may override the 30fps default for a
   * deliberately higher- or lower-frequency presentation.
   */
  maxFps?: number;
  /** Apply the host-level HD post-process (bright-pass bloom + dithered film grain). */
  hd?: boolean;
  children?: React.ReactNode;
}

export default function ThemeCanvas({
  themeId,
  height = 320,
  className,
  style,
  interactive = true,
  animated = true,
  mobileAmbientMotion = false,
  motionMode: motionModeOverride,
  motionAware = false,
  maxFps = 30,
  hd = true,
  children,
}: ThemeCanvasProps) {
  const { mode: preferredMotionMode } = useMotionPreference();
  const activeMotionMode = motionModeOverride ?? preferredMotionMode;
  const motionPolicy = MOTION_MODE_POLICIES[activeMotionMode];
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const visibleRef = useRef(true);
  const elapsedRef = useRef(0);
  const lastFrameRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const staticPaintRef = useRef<(() => void) | null>(null);
  const samplerRef = useRef<MotionSampler | null>(null);
  if (!samplerRef.current) {
    samplerRef.current = createMotionSampler();
  }
  const touchActiveRef = useRef(false);
  const ambientResumeAtRef = useRef(0);
  const ambientEnabledRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const rendererRef = useRef<ThemeRenderer | null>(null);
  const motionRef = useRef<ThemeMotionContext>(createInitialThemeMotionContext());
  const theme = useMemo(() => THEME_MAP[themeId] ?? THEME_MAP.cosmic, [themeId]);
  const resolvedThemeId = theme.id;
  const themeStyle = UNIFORM_LIVING_PAGE_STYLE;

  motionRef.current.motionMode = activeMotionMode;
  motionRef.current.reducedMotion = activeMotionMode === "still";
  reducedMotionRef.current = activeMotionMode === "still";

  const requestMotionPaint = useCallback(() => {
    if (activeMotionMode === "full") {
      staticPaintRef.current?.();
    }
  }, [activeMotionMode]);

  useLivingMotionBridge({
    containerRef,
    motionRef,
    enabled: motionAware,
    onMotionChange: requestMotionPaint,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !theme) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const TOUCH_IDLE_MS = 1600;

    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

    const getAmbientPointer = (elapsed: number) => ({
      x: clamp(0.5 + Math.sin(elapsed * 0.18) * 0.15 + Math.cos(elapsed * 0.07) * 0.05, 0.2, 0.8),
      y: clamp(0.5 + Math.cos(elapsed * 0.15) * 0.115 + Math.sin(elapsed * 0.11) * 0.06, 0.24, 0.76),
    });

    const pointerCoarseQuery =
      typeof window.matchMedia === "function" ? window.matchMedia("(pointer: coarse)") : null;
    const pointerFineQuery =
      typeof window.matchMedia === "function" ? window.matchMedia("(pointer: fine)") : null;
    const anyPointerCoarseQuery =
      typeof window.matchMedia === "function" ? window.matchMedia("(any-pointer: coarse)") : null;

    const syncAmbientMode = () => {
      const hasTouchCapability = window.navigator.maxTouchPoints > 0;
      const coarsePrimary = pointerCoarseQuery?.matches ?? false;
      const finePrimary = pointerFineQuery?.matches ?? false;
      const anyCoarse = anyPointerCoarseQuery?.matches ?? false;

      reducedMotionRef.current = activeMotionMode === "still";
      motionRef.current.motionMode = activeMotionMode;
      motionRef.current.reducedMotion = activeMotionMode === "still";
      if (activeMotionMode !== "full") {
        clearTransientThemeMotion(motionRef.current);
      }

      ambientEnabledRef.current =
        mobileAmbientMotion &&
        motionPolicy.allowsAmbientMotion &&
        (coarsePrimary || (!finePrimary && (anyCoarse || hasTouchCapability)));

      if (ambientEnabledRef.current && !touchActiveRef.current && performance.now() >= ambientResumeAtRef.current) {
        mouseRef.current = getAmbientPointer(elapsedRef.current);
      }
    };

    let lastPointerSample = {
      x: mouseRef.current.x,
      y: mouseRef.current.y,
      at: performance.now(),
    };
    const updatePointer = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(rect.width, 1);
      const height = Math.max(rect.height, 1);
      const nextPointer = {
        x: clamp((clientX - rect.left) / width, 0, 1),
        y: clamp((clientY - rect.top) / height, 0, 1),
      };
      mouseRef.current = nextPointer;

      const now = performance.now();
      const elapsedSeconds = clamp((now - lastPointerSample.at) * 0.001, 1 / 120, 0.25);
      const velocityX = clamp((nextPointer.x - lastPointerSample.x) / elapsedSeconds, -4, 4);
      const velocityY = clamp((nextPointer.y - lastPointerSample.y) / elapsedSeconds, -4, 4);
      const motion = motionRef.current;
      motion.pointerVelocityX = velocityX;
      motion.pointerVelocityY = velocityY;
      motion.pointerSpeed = clamp(Math.hypot(velocityX, velocityY), 0, 4);
      lastPointerSample = { ...nextPointer, at: now };
    };

    const applyAmbientPointer = (elapsed: number, now: number) => {
      if (!ambientEnabledRef.current || touchActiveRef.current || now < ambientResumeAtRef.current) {
        return;
      }
      mouseRef.current = getAmbientPointer(elapsed);
    };

    // Preserve display-rate motion under load. The last quality tier reduces
    // internal canvas resolution instead of halving cursor/light cadence.
    let renderScale = 1;
    const resize = () => {
      const cappedDevicePixelRatio = Math.min(
        window.devicePixelRatio || 1,
        2,
      );
      const pixelRatio = clamp(
        cappedDevicePixelRatio * renderScale,
        0.85,
        2,
      );
      const w = Math.max(1, Math.floor(canvas.offsetWidth * pixelRatio));
      const h = Math.max(1, Math.floor(canvas.offsetHeight * pixelRatio));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        return true;
      }
      return false;
    };

    const container = containerRef.current;

    // ---- Host-level "HD" post-process: a bright-pass bloom so lit elements glow
    // (only genuinely bright pixels, via a multiply-by-self bright pass) plus a
    // low-alpha dithered film grain that breaks gradient banding. Bloom is
    // skipped on light-ground themes (it would wash them out); the grain freezes
    // under reduced motion.
    const lightGround = (() => {
      const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(theme.background);
      if (!match) return false;
      return 0.299 * parseInt(match[1], 16) + 0.587 * parseInt(match[2], 16) + 0.114 * parseInt(match[3], 16) > 90;
    })();
    let bloomBuffer: HTMLCanvasElement | null = null;
    let bloomContext: CanvasRenderingContext2D | null = null;
    let blurBuffer: HTMLCanvasElement | null = null;
    let blurContext: CanvasRenderingContext2D | null = null;
    let noiseTile: HTMLCanvasElement | null = null;
    let noisePattern: CanvasPattern | null = null;
    const ensureHdBuffers = () => {
      const bw = Math.max(1, Math.floor(canvas.width / 4));
      const bh = Math.max(1, Math.floor(canvas.height / 4));
      if (!bloomBuffer) {
        bloomBuffer = document.createElement("canvas");
        bloomContext = bloomBuffer.getContext("2d");
      }
      if (bloomBuffer.width !== bw || bloomBuffer.height !== bh) {
        bloomBuffer.width = bw;
        bloomBuffer.height = bh;
      }
      if (!blurBuffer) {
        blurBuffer = document.createElement("canvas");
        blurContext = blurBuffer.getContext("2d");
        if (blurContext && canvasFilterSupported === null) {
          try {
            blurContext.filter = "blur(2px)";
            canvasFilterSupported = blurContext.filter !== "none";
            blurContext.filter = "none";
          } catch {
            canvasFilterSupported = false;
          }
        }
      }
      if (blurBuffer.width !== bw || blurBuffer.height !== bh) {
        blurBuffer.width = bw;
        blurBuffer.height = bh;
      }
      if (!noiseTile) {
        noiseTile = getSharedNoiseTile();
      }
    };
    const applyHdPost = (elapsed: number, bloomEnabled: boolean) => {
      if (!hd) return;
      ensureHdBuffers();
      const w = canvas.width;
      const h = canvas.height;
      if (bloomEnabled && !lightGround && bloomBuffer && bloomContext) {
        const bw = bloomBuffer.width;
        const bh = bloomBuffer.height;
        bloomContext.globalCompositeOperation = "source-over";
        bloomContext.clearRect(0, 0, bw, bh);
        bloomContext.drawImage(canvas, 0, 0, bw, bh);
        bloomContext.globalCompositeOperation = "multiply"; // ~luminance^2 bright pass
        bloomContext.drawImage(bloomBuffer, 0, 0);
        bloomContext.globalCompositeOperation = "source-over";
        // Soften the bright pass so highlights halate instead of upscaling
        // with hard edges. Native filter blur when available, otherwise a
        // cheap separable two-pass approximation on the ¼-res buffers.
        let bloomSource: HTMLCanvasElement = bloomBuffer;
        if (blurBuffer && blurContext) {
          blurContext.globalCompositeOperation = "source-over";
          blurContext.clearRect(0, 0, bw, bh);
          if (canvasFilterSupported) {
            try {
              blurContext.filter = "blur(2px)";
              blurContext.drawImage(bloomBuffer, 0, 0);
            } finally {
              blurContext.filter = "none";
            }
            bloomSource = blurBuffer;
          } else {
            blurContext.globalAlpha = 0.25;
            blurContext.drawImage(bloomBuffer, -1, 0);
            blurContext.globalAlpha = 0.5;
            blurContext.drawImage(bloomBuffer, 0, 0);
            blurContext.globalAlpha = 0.25;
            blurContext.drawImage(bloomBuffer, 1, 0);
            blurContext.globalAlpha = 1;
            bloomContext.clearRect(0, 0, bw, bh);
            bloomContext.globalAlpha = 0.25;
            bloomContext.drawImage(blurBuffer, 0, -1);
            bloomContext.globalAlpha = 0.5;
            bloomContext.drawImage(blurBuffer, 0, 0);
            bloomContext.globalAlpha = 0.25;
            bloomContext.drawImage(blurBuffer, 0, 1);
            bloomContext.globalAlpha = 1;
            bloomSource = bloomBuffer;
          }
        }
        context.save();
        context.globalCompositeOperation = "lighter";
        context.globalAlpha = 0.32;
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(bloomSource, 0, 0, w, h);
        context.restore();
      }
      if (noiseTile) {
        // The tile never changes, so the pattern is built once per context
        // rather than reallocated on every painted frame.
        if (!noisePattern) {
          noisePattern = context.createPattern(noiseTile, "repeat");
        }
        const pattern = noisePattern;
        if (pattern) {
          const anim = reducedMotionRef.current ? 0 : 1;
          const ox = (Math.floor(elapsed * 53) % 128) * anim;
          const oy = (Math.floor(elapsed * 97) % 128) * anim;
          context.save();
          context.globalCompositeOperation = "overlay";
          context.globalAlpha = 0.04;
          context.fillStyle = pattern;
          context.translate(ox, oy);
          context.fillRect(-ox, -oy, w, h);
          context.restore();
        }
      }
    };

    // ---- Quality ladder: full HD → HD without bloom → reduced render scale.
    // Cursor/light presentation stays at the requested cadence at every tier;
    // lowering resolution under sustained load looks substantially smoother
    // than stepping the entire interaction down to 30fps. Driven by an
    // EMA of paint cost so a one-off GC hitch never degrades, with a hysteresis
    // band. Both degradations are one-way for this mount, preventing bloom or
    // sharpness from visibly popping in and out during a presentation.
    const QUALITY_BUDGET_MS = 12;
    const QUALITY_DEGRADE_FRAMES = 45;
    const QUALITY_EMA_ALPHA = 0.08;
    let qualityLevel = 0;
    let qualityCostEma: number | null = null;
    let overBudgetFrames = 0;
    const setQualityLevel = (level: number) => {
      qualityLevel = level;
      overBudgetFrames = 0;
      // Re-measure the new level from mid-band so one hitch cluster cannot
      // cascade straight through every level.
      qualityCostEma = QUALITY_BUDGET_MS * 0.8;
      renderScale = qualityLevel >= 2 ? 0.75 : 1;
      resize();
      container?.setAttribute(
        "data-theme-quality",
        qualityLevel === 0
          ? "full"
          : qualityLevel === 1
            ? "no-bloom"
            : "scaled",
      );
    };
    const recordFrameCost = (costMs: number) => {
      qualityCostEma =
        qualityCostEma === null
          ? costMs
          : qualityCostEma + QUALITY_EMA_ALPHA * (costMs - qualityCostEma);
      if (qualityCostEma > QUALITY_BUDGET_MS) {
        overBudgetFrames += 1;
        if (overBudgetFrames >= QUALITY_DEGRADE_FRAMES && qualityLevel < 2) {
          setQualityLevel(qualityLevel + 1);
        }
      } else {
        overBudgetFrames = Math.max(0, overBudgetFrames - 1);
      }
    };

    let consecutiveRenderFailures = 0;
    const renderFrame = (elapsed: number, deltaSeconds = 0) => {
      context.fillStyle = theme.background;
      context.fillRect(0, 0, canvas.width, canvas.height);
      const renderer = rendererRef.current;
      if (!renderer) {
        // Renderer chunk hasn't resolved yet — the solid background stands in so
        // there is no flash of empty canvas before the animation appears.
        return;
      }
      const sampler = samplerRef.current!;
      const presentationTarget = {
        x: 0.5 + (mouseRef.current.x - 0.5) * motionPolicy.pointerScale,
        y: 0.5 + (mouseRef.current.y - 0.5) * motionPolicy.pointerScale,
      };
      sampler.setPointerTarget(presentationTarget.x, presentationTarget.y);
      let stepSeconds = deltaSeconds;
      if (!runningRef.current) {
        // Static paints (initial, resize, reduced motion) show the settled
        // pose immediately instead of a mid-glide sample.
        sampler.snapPointer(presentationTarget.x, presentationTarget.y);
      } else if (deltaSeconds === 0) {
        // Out-of-band paint (e.g. resize) while animating: nudge the sampler
        // instead of passing 0, which would hard-snap every inertial sample.
        stepSeconds = 0.004;
      }
      const smoothedMotion = sampler.step(
        motionAware && activeMotionMode === "full"
          ? motionRef.current
          : undefined,
        stepSeconds,
      );
      const presentationPointer = applySectionMotionToPointer(
        sampler.pointer.x,
        sampler.pointer.y,
        smoothedMotion,
      );
      try {
        renderer(
          context,
          canvas.width,
          canvas.height,
          elapsed,
          presentationPointer.x,
          presentationPointer.y,
          deltaSeconds,
          smoothedMotion,
        );
        consecutiveRenderFailures = 0;
        applyHdPost(elapsed, qualityLevel === 0);
      } catch (error) {
        consecutiveRenderFailures += 1;
        if (consecutiveRenderFailures < 3) return;

        rendererRef.current = null;
        container?.setAttribute("data-theme-renderer-status", "fallback");
        container?.setAttribute("data-motion-running", "false");
        runningRef.current = false;
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        console.error(`[ThemeCanvas] Renderer for ${resolvedThemeId} failed repeatedly; using fallback.`, error);
      }
    };

    const minFrameMs = maxFps && maxFps > 0 ? 1000 / maxFps : 0;
    let scheduledStaticFrame: number | null = null;
    let lastStaticPaintAt: number | null = null;
    const getPaintTime = () => activeMotionMode === "full" ? elapsedRef.current : 0;
    const paintStaticFrame = () => {
      if (runningRef.current) return;
      if (activeMotionMode !== "full") {
        clearTransientThemeMotion(motionRef.current);
      }
      renderFrame(getPaintTime());
    };
    const drawStaticFrame = (now: number) => {
      if (runningRef.current) {
        scheduledStaticFrame = null;
        return;
      }
      if (
        lastStaticPaintAt !== null &&
        !shouldPresentFrame(now, lastStaticPaintAt, minFrameMs)
      ) {
        scheduledStaticFrame = requestAnimationFrame(drawStaticFrame);
        return;
      }
      scheduledStaticFrame = null;
      lastStaticPaintAt = now;
      paintStaticFrame();
    };
    const scheduleStaticPaint = () => {
      if (runningRef.current || scheduledStaticFrame !== null) return;
      scheduledStaticFrame = requestAnimationFrame(drawStaticFrame);
    };
    staticPaintRef.current = scheduleStaticPaint;

    const handleResize = () => {
      if (resize()) {
        scheduleStaticPaint();
      }
    };

    const stop = () => {
      runningRef.current = false;
      lastFrameRef.current = null;
      container?.setAttribute("data-motion-running", "false");
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };

    const draw = (now: number) => {
      if (!runningRef.current) {
        return;
      }
      animationRef.current = requestAnimationFrame(draw);
      if (lastFrameRef.current === null) {
        lastFrameRef.current = now;
      }
      if (!shouldPresentFrame(now, lastFrameRef.current, minFrameMs)) {
        // Below the frame budget — keep the rAF loop alive but skip this paint.
        return;
      }
      const delta = Math.min(0.05, (now - lastFrameRef.current) * 0.001);
      lastFrameRef.current = now;
      elapsedRef.current += delta * motionPolicy.rendererTimeScale;
      decayTransientThemeMotion(motionRef.current, delta);
      applyAmbientPointer(elapsedRef.current, now);
      const paintStart = performance.now();
      renderFrame(elapsedRef.current, delta);
      recordFrameCost(performance.now() - paintStart);
    };

    const start = () => {
      if (runningRef.current || document.hidden || !visibleRef.current) {
        return;
      }
      if (!rendererRef.current) {
        container?.setAttribute("data-motion-running", "false");
        paintStaticFrame();
        return;
      }
      if (!animated || !motionPolicy.allowsContinuousMotion) {
        container?.setAttribute("data-motion-running", "false");
        paintStaticFrame();
        return;
      }
      runningRef.current = true;
      container?.setAttribute("data-motion-running", "true");
      animationRef.current = requestAnimationFrame(draw);
    };

    const handleMove = (event: MouseEvent) => {
      if (activeMotionMode !== "full") return;
      updatePointer(event.clientX, event.clientY);
      if (!runningRef.current) {
        scheduleStaticPaint();
      }
    };
    const handleTouchStart = (event: TouchEvent) => {
      if (activeMotionMode !== "full") return;
      const touch = event.touches[0];
      if (!touch) return;
      touchActiveRef.current = true;
      ambientResumeAtRef.current = Number.POSITIVE_INFINITY;
      updatePointer(touch.clientX, touch.clientY);
    };
    const handleTouch = (event: TouchEvent) => {
      if (activeMotionMode !== "full") return;
      const touch = event.touches[0];
      if (!touch) return;
      touchActiveRef.current = true;
      ambientResumeAtRef.current = Number.POSITIVE_INFINITY;
      updatePointer(touch.clientX, touch.clientY);
    };
    const handleTouchEnd = () => {
      touchActiveRef.current = false;
      ambientResumeAtRef.current = performance.now() + TOUCH_IDLE_MS;
    };
    const handleMouseLeave = () => {
      mouseRef.current = { x: 0.5, y: 0.5 };
      lastPointerSample = {
        x: 0.5,
        y: 0.5,
        at: performance.now(),
      };
      if (activeMotionMode === "full" && !runningRef.current) {
        scheduleStaticPaint();
      }
    };
    const handleVisibility = () => {
      if (document.hidden || !visibleRef.current) {
        stop();
      } else {
        start();
      }
    };

    const mediaQueryDisposers: Array<() => void> = [];
    const watchMediaQuery = (query: MediaQueryList | null) => {
      if (!query) {
        return;
      }
      const handleChange = () => {
        syncAmbientMode();
        if (!animated || !motionPolicy.allowsContinuousMotion) {
          stop();
          scheduleStaticPaint();
        } else {
          start();
        }
      };
      if (typeof query.addEventListener === "function" && typeof query.removeEventListener === "function") {
        query.addEventListener("change", handleChange);
        mediaQueryDisposers.push(() => query.removeEventListener("change", handleChange));
        return;
      }
      const legacyQuery = query as MediaQueryList & {
        addListener?: (listener: () => void) => void;
        removeListener?: (listener: () => void) => void;
      };
      legacyQuery.addListener?.(handleChange);
      mediaQueryDisposers.push(() => legacyQuery.removeListener?.(handleChange));
    };

    let cancelled = false;
    let rendererLoading = false;
    let retryTimer: number | null = null;
    const setRendererStatus = (status: "loading" | "ready" | "fallback") => {
      container?.setAttribute("data-theme-renderer-status", status);
    };
    const requestRenderer = (attempt = 0) => {
      if (cancelled || rendererLoading) {
        return;
      }
      rendererLoading = true;
      setRendererStatus("loading");
      void loadRenderer(resolvedThemeId)
        .then((renderer) => {
          if (cancelled) {
            return;
          }
          rendererRef.current = renderer;
          setRendererStatus("ready");
          // Repaint now that the renderer exists. If the rAF loop is already
          // running it will pick this up on its own; this covers the static
          // (non-animated / reduced-motion) case where nothing repaints otherwise.
          paintStaticFrame();
          start();
        })
        .catch((error: unknown) => {
          if (cancelled) {
            return;
          }
          if (attempt === 0) {
            retryTimer = window.setTimeout(() => {
              retryTimer = null;
              requestRenderer(1);
            }, 300);
            return;
          }
          setRendererStatus("fallback");
          stop();
          paintStaticFrame();
          console.error(`[ThemeCanvas] Falling back to the ${resolvedThemeId} background.`, error);
        })
        .finally(() => {
          rendererLoading = false;
        });
    };
    const handleOnline = () => {
      if (rendererRef.current) {
        return;
      }
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
        retryTimer = null;
      }
      requestRenderer();
    };

    rendererRef.current = getLoadedRenderer(resolvedThemeId);
    if (rendererRef.current) {
      setRendererStatus("ready");
    } else {
      requestRenderer();
    }

    syncAmbientMode();
    resize();
    container?.setAttribute("data-theme-quality", "full");
    applyAmbientPointer(elapsedRef.current, performance.now());
    paintStaticFrame();
    window.addEventListener("resize", handleResize);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);
    watchMediaQuery(pointerCoarseQuery);
    watchMediaQuery(pointerFineQuery);
    watchMediaQuery(anyPointerCoarseQuery);

    // ResizeObserver catches late layout shifts that the initial resize() misses
    let observer: ResizeObserver | null = null;
    if (container) {
      observer = new ResizeObserver(handleResize);
      observer.observe(container);
    }

    let intersectionObserver: IntersectionObserver | null = null;
    if (container && "IntersectionObserver" in window) {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          visibleRef.current = entry?.isIntersecting ?? true;
          if (visibleRef.current) {
            start();
          } else {
            stop();
          }
        },
        { threshold: 0.05 },
      );
      intersectionObserver.observe(container);
    } else {
      visibleRef.current = true;
    }

    if (interactive && container) {
      container.addEventListener("mousemove", handleMove);
      container.addEventListener("mouseleave", handleMouseLeave);
      container.addEventListener("touchstart", handleTouchStart, { passive: true });
      container.addEventListener("touchmove", handleTouch, { passive: true });
      container.addEventListener("touchend", handleTouchEnd, { passive: true });
      container.addEventListener("touchcancel", handleTouchEnd, { passive: true });
    }
    start();

    return () => {
      cancelled = true;
      if (scheduledStaticFrame !== null) {
        cancelAnimationFrame(scheduledStaticFrame);
      }
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
      }
      if (staticPaintRef.current === scheduleStaticPaint) {
        staticPaintRef.current = null;
      }
      stop();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
      mediaQueryDisposers.forEach((dispose) => dispose());
      observer?.disconnect();
      intersectionObserver?.disconnect();
      if (interactive && container) {
        container.removeEventListener("mousemove", handleMove);
        container.removeEventListener("mouseleave", handleMouseLeave);
        container.removeEventListener("touchstart", handleTouchStart);
        container.removeEventListener("touchmove", handleTouch);
        container.removeEventListener("touchend", handleTouchEnd);
        container.removeEventListener("touchcancel", handleTouchEnd);
      }
    };
  }, [
    activeMotionMode,
    animated,
    hd,
    interactive,
    maxFps,
    mobileAmbientMotion,
    motionAware,
    motionPolicy,
    resolvedThemeId,
    theme,
  ]);

  return (
    <div
      ref={containerRef}
      data-living-output
      data-theme-id={theme.id}
      data-theme-collection={theme.collection}
      data-theme-format="uniform"
      data-theme-renderer-status="loading"
      data-motion-aware={motionAware ? "true" : undefined}
      data-motion-mode={activeMotionMode}
      data-motion-state={activeMotionMode}
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "var(--site-radius, 0px)",
        ...style,
        ...themeStyle,
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          width: "100%",
          height,
          display: "block",
          cursor: interactive ? "crosshair" : "default",
        }}
      />
      {children ? (
        <>
          <div
            aria-hidden="true"
            style={{
              pointerEvents: "none",
              position: "absolute",
              inset: 0,
              zIndex: 1,
              background: UNIFORM_LIVING_PAGE_SCRIM,
            }}
          />
          <div
            style={{
              pointerEvents: "auto",
              position: "absolute",
              inset: 0,
              zIndex: 2,
            }}
          >
            {children}
          </div>
        </>
      ) : null}
    </div>
  );
}
