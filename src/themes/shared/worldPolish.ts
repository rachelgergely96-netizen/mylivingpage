import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "./motion";
import type {
  ThemeCollectionId,
  ThemeId,
  ThemeMeta,
  ThemeMotionContext,
  ThemeRenderer,
} from "../types";

const TAU = Math.PI * 2;

type WorldMotif =
  | "cinematic-orbit"
  | "editorial-ribbon"
  | "experimental-frame"
  | "material-contour"
  | "technical-grid";

export interface WorldPolishProfile {
  motif: WorldMotif;
  seed: number;
  anchorX: number;
  anchorY: number;
  particleCount: number;
}

const COLLECTION_PROFILES = {
  cinematic: {
    motif: "cinematic-orbit",
    anchorX: 0.76,
    anchorY: 0.34,
    particleCount: 26,
  },
  "editorial-luxe": {
    motif: "editorial-ribbon",
    anchorX: 0.74,
    anchorY: 0.38,
    particleCount: 18,
  },
  "art-lab": {
    motif: "experimental-frame",
    anchorX: 0.72,
    anchorY: 0.4,
    particleCount: 20,
  },
  "organic-material": {
    motif: "material-contour",
    anchorX: 0.75,
    anchorY: 0.42,
    particleCount: 22,
  },
  "executive-tech": {
    motif: "technical-grid",
    anchorX: 0.76,
    anchorY: 0.39,
    particleCount: 16,
  },
} as const satisfies Record<
  ThemeCollectionId,
  Omit<WorldPolishProfile, "seed">
>;

/** Stable FNV-1a hash used to give every theme its own spatial arrangement. */
export function hashThemeId(themeId: ThemeId): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < themeId.length; index += 1) {
    hash ^= themeId.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function unitValue(value: number): number {
  const raw = Math.sin(value * 12.9898 + 78.233) * 43758.5453;
  return raw - Math.floor(raw);
}

export function getWorldPolishProfile(
  theme: Pick<ThemeMeta, "collection" | "id">,
): WorldPolishProfile {
  const base = COLLECTION_PROFILES[theme.collection];
  const seed = hashThemeId(theme.id);
  const variationX = (unitValue(seed * 0.0001) - 0.5) * 0.08;
  const variationY = (unitValue(seed * 0.00017) - 0.5) * 0.06;

  return {
    ...base,
    seed,
    anchorX: finiteClamp(base.anchorX + variationX, 0.66, 0.82),
    anchorY: finiteClamp(base.anchorY + variationY, 0.28, 0.48),
  };
}

function drawAtmosphere(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  accent: string,
  anchorX: number,
  anchorY: number,
  impulse: number,
) {
  const radius = Math.max(width, height) * (0.46 + impulse * 0.04);
  const glow = ctx.createRadialGradient(
    anchorX,
    anchorY,
    0,
    anchorX,
    anchorY,
    radius,
  );
  glow.addColorStop(0, accent);
  glow.addColorStop(0.34, accent);
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.035 + impulse * 0.035;
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawDepthParticles(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  pointerX: number,
  pointerY: number,
  storyProgress: number,
  accent: string,
  profile: WorldPolishProfile,
) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = accent;

  for (let index = 0; index < profile.particleCount; index += 1) {
    const seed = profile.seed * 0.00001 + index * 1.731;
    const depth = 0.25 + unitValue(seed + 2.1) * 0.75;
    const drift = time * (0.004 + depth * 0.008);
    const xProgress = (unitValue(seed + 0.4) + drift + storyProgress * 0.035 * depth) % 1;
    const yProgress =
      (unitValue(seed + 4.8) +
        Math.sin(time * (0.08 + depth * 0.06) + seed * 4) * 0.025 +
        1) %
      1;
    const x =
      width * xProgress +
      (pointerX - 0.5) * width * (0.008 + depth * 0.012);
    const y =
      height * yProgress +
      (pointerY - 0.5) * height * (0.006 + depth * 0.01);
    const size = 0.45 + depth * 1.05;
    ctx.globalAlpha = 0.025 + depth * 0.07;

    if (
      profile.motif === "technical-grid" ||
      profile.motif === "experimental-frame"
    ) {
      ctx.fillRect(x, y, size, size);
    } else {
      ctx.beginPath();
      ctx.arc(x, y, size * 0.62, 0, TAU);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawTechnicalGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  storyProgress: number,
  accent: string,
  anchorX: number,
  anchorY: number,
) {
  const horizon = height * (0.68 - storyProgress * 0.05);
  const chapter = storyProgress * 5;

  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.055;
  for (let ray = -3; ray <= 4; ray += 1) {
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY);
    ctx.lineTo(width * (0.54 + ray * 0.1), height * 1.04);
    ctx.stroke();
  }

  for (let row = 0; row < 5; row += 1) {
    const progress = (row + 1) / 6;
    const y = horizon + Math.pow(progress, 1.7) * (height - horizon);
    const activeWeight = storyStepWeight(storyProgress, row, 5);
    ctx.globalAlpha = 0.035 + activeWeight * 0.055;
    ctx.beginPath();
    ctx.moveTo(width * (0.5 - progress * 0.12), y);
    ctx.lineTo(width * (0.96 + progress * 0.04), y);
    ctx.stroke();
  }

  const scanY = horizon + ((time * 0.018 + chapter * 0.08) % 1) * (height - horizon);
  const scan = ctx.createLinearGradient(width * 0.5, scanY, width, scanY);
  scan.addColorStop(0, "rgba(0, 0, 0, 0)");
  scan.addColorStop(0.62, accent);
  scan.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = scan;
  ctx.beginPath();
  ctx.moveTo(width * 0.5, scanY);
  ctx.lineTo(width, scanY);
  ctx.stroke();
  ctx.restore();
}

function drawCinematicOrbit(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  storyProgress: number,
  accent: string,
  anchorX: number,
  anchorY: number,
  seed: number,
) {
  const radius = Math.min(width, height) * 0.2;
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;
  for (let ring = 0; ring < 4; ring += 1) {
    const chapterWeight = storyStepWeight(storyProgress, ring, 4);
    ctx.globalAlpha = 0.035 + chapterWeight * 0.075;
    ctx.beginPath();
    ctx.ellipse(
      anchorX,
      anchorY,
      radius * (1 + ring * 0.36),
      radius * (0.24 + ring * 0.055),
      -0.28 + ring * 0.12,
      time * 0.025 + unitValue(seed + ring) * TAU,
      time * 0.025 + unitValue(seed + ring) * TAU + Math.PI * 1.34,
    );
    ctx.stroke();
  }

  const flare = ctx.createLinearGradient(width * 0.46, anchorY, width, anchorY);
  flare.addColorStop(0, "rgba(0, 0, 0, 0)");
  flare.addColorStop(0.55, accent);
  flare.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.globalAlpha = 0.085;
  ctx.strokeStyle = flare;
  ctx.beginPath();
  ctx.moveTo(width * 0.46, anchorY);
  ctx.lineTo(width, anchorY);
  ctx.stroke();
  ctx.restore();
}

function drawMaterialContours(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  pointerY: number,
  storyProgress: number,
  accent: string,
  seed: number,
) {
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineCap = "round";
  for (let layer = 0; layer < 5; layer += 1) {
    const chapterWeight = storyStepWeight(storyProgress, layer, 5);
    const y =
      height * (0.19 + layer * 0.145) +
      Math.sin(time * (0.09 + layer * 0.012) + seed * 0.001 + layer) *
        height *
        0.018 +
      (pointerY - 0.5) * height * 0.02;
    ctx.globalAlpha = 0.035 + chapterWeight * 0.06;
    ctx.lineWidth = 0.8 + chapterWeight * 0.7;
    ctx.beginPath();
    ctx.moveTo(width * 0.48, y);
    ctx.bezierCurveTo(
      width * 0.61,
      y - height * (0.045 + layer * 0.004),
      width * 0.78,
      y + height * 0.055,
      width * 1.04,
      y - height * 0.02,
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawEditorialRibbons(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  pointerX: number,
  storyProgress: number,
  accent: string,
  seed: number,
) {
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineCap = "round";
  for (let ribbon = 0; ribbon < 4; ribbon += 1) {
    const chapterWeight = storyStepWeight(storyProgress, ribbon, 4);
    const phase = time * (0.08 + ribbon * 0.012) + seed * 0.0004 + ribbon;
    const y = height * (0.18 + ribbon * 0.19);
    const shift = (pointerX - 0.5) * width * 0.025;
    ctx.globalAlpha = 0.035 + chapterWeight * 0.055;
    ctx.lineWidth = 5 + ribbon * 2.5;
    ctx.beginPath();
    ctx.moveTo(width * 0.5, y);
    ctx.bezierCurveTo(
      width * 0.62 + shift,
      y - Math.sin(phase) * height * 0.08,
      width * 0.82 - shift,
      y + Math.cos(phase) * height * 0.07,
      width * 1.04,
      y - Math.sin(phase * 0.8) * height * 0.04,
    );
    ctx.stroke();

    ctx.globalAlpha *= 1.4;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  ctx.restore();
}

function drawExperimentalFrames(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  storyProgress: number,
  accent: string,
  anchorX: number,
  anchorY: number,
  seed: number,
) {
  const scale = Math.min(width, height);
  ctx.save();
  ctx.translate(anchorX, anchorY);
  ctx.strokeStyle = accent;
  for (let frame = 0; frame < 5; frame += 1) {
    const chapterWeight = storyStepWeight(storyProgress, frame, 5);
    const size = scale * (0.08 + frame * 0.045);
    ctx.save();
    ctx.rotate(
      unitValue(seed + frame) * Math.PI +
        time * (0.015 + frame * 0.004) +
        storyProgress * 0.18,
    );
    ctx.globalAlpha = 0.035 + chapterWeight * 0.07;
    ctx.lineWidth = 0.8 + chapterWeight * 0.8;
    ctx.strokeRect(-size, -size * 0.58, size * 2, size * 1.16);
    ctx.restore();
  }
  ctx.restore();
}

function drawFocusEcho(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  accent: string,
  anchorX: number,
  anchorY: number,
  focusX: number,
  focusY: number,
  impulse: number,
  motif: WorldMotif,
) {
  const x = focusX * width;
  const y = focusY * height;
  const echoSize = 8 + (1 - impulse) * 30;

  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.12 + impulse * 0.22;
  ctx.setLineDash([3, 7]);
  ctx.beginPath();
  ctx.moveTo(anchorX, anchorY);
  ctx.quadraticCurveTo(width * 0.82, y, x, y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.globalAlpha = 0.28 + impulse * 0.32;
  if (motif === "technical-grid" || motif === "experimental-frame") {
    ctx.strokeRect(
      x - echoSize * 0.5,
      y - echoSize * 0.5,
      echoSize,
      echoSize,
    );
  } else {
    ctx.beginPath();
    ctx.arc(x, y, echoSize * 0.5, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function drawVignette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  anchorX: number,
  anchorY: number,
) {
  const vignette = ctx.createRadialGradient(
    anchorX,
    anchorY,
    Math.min(width, height) * 0.12,
    width * 0.54,
    height * 0.44,
    Math.max(width, height) * 0.82,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(0.72, "rgba(0, 0, 0, 0.04)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.22)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

function drawWorldPolish(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  pointerX: number,
  pointerY: number,
  motion: Readonly<ThemeMotionContext> | undefined,
  theme: ThemeMeta,
  profile: WorldPolishProfile,
) {
  const pageMotion = resolveThemeMotion(motion);
  const effectiveTime = motion?.reducedMotion ? 0 : finiteClamp(time, 0, 1_000_000);
  const targetX = pageMotion.hasFocus
    ? pointerX * 0.25 + pageMotion.focusX * 0.75
    : pointerX;
  const targetY = pageMotion.hasFocus
    ? pointerY * 0.25 + pageMotion.focusY * 0.75
    : pointerY;
  const velocity = finiteClamp(pageMotion.scrollVelocity / 4, -1, 1);
  const anchorX =
    width *
    finiteClamp(
      profile.anchorX +
        (targetX - 0.5) * 0.055 +
        (pageMotion.storyProgress - 0.5) * 0.035,
      0.58,
      0.9,
    );
  const anchorY =
    height *
    finiteClamp(
      profile.anchorY + (targetY - 0.5) * 0.04 + velocity * 0.012,
      0.2,
      0.58,
    );
  const accent = theme.presentation.accent;

  drawAtmosphere(
    ctx,
    width,
    height,
    accent,
    anchorX,
    anchorY,
    pageMotion.interactionImpulse,
  );

  switch (profile.motif) {
    case "technical-grid":
      drawTechnicalGrid(
        ctx,
        width,
        height,
        effectiveTime,
        pageMotion.storyProgress,
        accent,
        anchorX,
        anchorY,
      );
      break;
    case "cinematic-orbit":
      drawCinematicOrbit(
        ctx,
        width,
        height,
        effectiveTime,
        pageMotion.storyProgress,
        accent,
        anchorX,
        anchorY,
        profile.seed,
      );
      break;
    case "material-contour":
      drawMaterialContours(
        ctx,
        width,
        height,
        effectiveTime,
        targetY,
        pageMotion.storyProgress,
        accent,
        profile.seed,
      );
      break;
    case "editorial-ribbon":
      drawEditorialRibbons(
        ctx,
        width,
        height,
        effectiveTime,
        targetX,
        pageMotion.storyProgress,
        accent,
        profile.seed,
      );
      break;
    case "experimental-frame":
      drawExperimentalFrames(
        ctx,
        width,
        height,
        effectiveTime,
        pageMotion.storyProgress,
        accent,
        anchorX,
        anchorY,
        profile.seed,
      );
      break;
  }

  drawDepthParticles(
    ctx,
    width,
    height,
    effectiveTime,
    targetX,
    targetY,
    pageMotion.storyProgress,
    theme.presentation.accentBright,
    profile,
  );

  if (pageMotion.hasFocus) {
    drawFocusEcho(
      ctx,
      width,
      height,
      theme.presentation.accentBright,
      anchorX,
      anchorY,
      pageMotion.focusX,
      pageMotion.focusY,
      pageMotion.interactionImpulse,
      profile.motif,
    );
  }

  drawVignette(ctx, width, height, anchorX, anchorY);
}

/**
 * Adds a bounded, deterministic depth and page-motion pass to catalog themes.
 * Signature renderers keep their bespoke compositions unchanged.
 */
export function withWorldPolish(
  theme: ThemeMeta,
  renderer: ThemeRenderer,
): ThemeRenderer {
  if (theme.signature) {
    return renderer;
  }

  const profile = getWorldPolishProfile(theme);
  return (ctx, width, height, time, pointerX, pointerY, deltaSeconds, motion) => {
    ctx.save();
    try {
      renderer(
        ctx,
        width,
        height,
        time,
        pointerX,
        pointerY,
        deltaSeconds,
        motion,
      );
    } finally {
      ctx.restore();
    }

    ctx.save();
    try {
      drawWorldPolish(
        ctx,
        width,
        height,
        time,
        pointerX,
        pointerY,
        motion,
        theme,
        profile,
      );
    } finally {
      ctx.restore();
    }
  };
}
