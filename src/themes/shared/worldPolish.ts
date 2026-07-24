import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "./motion";
import { wrapSoft } from "./wrap";
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

/**
 * Light-ground detection mirroring the host bloom gate: additive screen-blend
 * light moves and bokeh would wash out a pale scene, so they are skipped.
 */
export function isLightGround(background: string): boolean {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(background);
  if (!match) return false;
  return (
    0.299 * parseInt(match[1], 16) +
      0.587 * parseInt(match[2], 16) +
      0.114 * parseInt(match[3], 16) >
    90
  );
}

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
    // Wrap the intrinsic path only; parallax is added after so the seam never
    // moves with the pointer, and the edge fade hides the crossing itself.
    const wrapX = wrapSoft(
      unitValue(seed + 0.4) + drift + storyProgress * 0.035 * depth,
      1,
      0.06,
    );
    const wrapY = wrapSoft(
      unitValue(seed + 4.8) +
        Math.sin(time * (0.08 + depth * 0.06) + seed * 4) * 0.025,
      1,
      0.06,
    );
    const x =
      width * wrapX.u +
      (pointerX - 0.5) * width * (0.012 + depth * 0.018);
    const y =
      height * wrapY.u +
      (pointerY - 0.5) * height * (0.009 + depth * 0.015);
    const size = 0.45 + depth * 1.05;
    ctx.globalAlpha = (0.025 + depth * 0.07) * wrapX.alpha * wrapY.alpha;

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

/**
 * A handful of large, soft, near-field discs with pronounced pointer parallax.
 * They sit closest to the viewer, so their drift separates the scene into
 * depth planes; alpha stays whisper-quiet and dims over the reading column.
 */
function drawDepthBokeh(
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

  for (let index = 0; index < 4; index += 1) {
    const seed = profile.seed * 0.00003 + index * 7.917;
    const depth = 0.55 + unitValue(seed + 1.3) * 0.45;
    const drift = time * (0.0024 + depth * 0.003);
    const wrapX = wrapSoft(
      unitValue(seed + 0.7) + drift + storyProgress * 0.05 * depth,
      1,
      0.12,
    );
    const wrapY = wrapSoft(
      unitValue(seed + 3.9) * 0.9 +
        0.05 +
        Math.sin(time * (0.05 + depth * 0.04) + seed * 3) * 0.04,
      1,
      0.12,
    );
    // Keep the reading column calm: fade discs down as they cross the left half.
    const readColumnDim =
      0.3 + 0.7 * finiteClamp((wrapX.u - 0.34) / 0.2, 0, 1);
    const x =
      width * wrapX.u + (pointerX - 0.5) * width * (0.03 + depth * 0.035);
    const y =
      height * wrapY.u + (pointerY - 0.5) * height * (0.024 + depth * 0.028);
    const radius =
      Math.min(width, height) *
      (0.05 + unitValue(seed + 5.2) * 0.06) *
      (0.7 + depth * 0.3);
    const alpha =
      (0.02 + depth * 0.03) * wrapX.alpha * wrapY.alpha * readColumnDim;
    if (alpha <= 0.002) continue;

    const glow = ctx.createRadialGradient(x, y, radius * 0.2, x, y, radius);
    glow.addColorStop(0, accent);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.globalAlpha = alpha;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();
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

/**
 * Executive-tech light move: a thin specular band that slides down the grid on
 * a slow period with mild scroll coupling — brushed metal, not neon.
 */
function drawSpecularSweep(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  storyProgress: number,
  accentBright: string,
  impulse: number,
) {
  const cycle = (time * 0.011 + storyProgress * 0.22) % 1;
  const presence = Math.sin(cycle * Math.PI);
  if (presence <= 0.02) return;
  const y = height * (0.22 + cycle * 0.54);
  const grad = ctx.createLinearGradient(width * 0.5, y, width, y);
  grad.addColorStop(0, "rgba(0, 0, 0, 0)");
  grad.addColorStop(0.6, accentBright);
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = grad;
  ctx.globalAlpha = presence * (0.018 + impulse * 0.012);
  ctx.fillRect(width * 0.5, y - 8, width * 0.5, 16);
  ctx.globalAlpha = presence * (0.045 + impulse * 0.025);
  ctx.fillRect(width * 0.5, y - 1.5, width * 0.5, 3);
  ctx.restore();
}

/**
 * Editorial-luxe light move: a small glint that skates along the ribbon
 * corridor — the gold catch of light on a printed page. Parametric stand-in
 * for the ribbon path (same phase family as drawEditorialRibbons, ribbon 1),
 * so no bezier sampling is needed.
 */
function drawPrintGlint(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  pointerX: number,
  storyProgress: number,
  accentBright: string,
  seed: number,
) {
  const s = (time * 0.12 + storyProgress * 0.15 + seed * 0.0001) % 1;
  const presence = Math.sin(Math.PI * s);
  if (presence <= 0.02) return;
  const phase = time * 0.092 + seed * 0.0004 + 1;
  const yBase = height * 0.37;
  const x = width * (0.52 + 0.48 * s) + (pointerX - 0.5) * width * 0.025 * (1 - s);
  const y =
    yBase -
    Math.sin(phase) * height * 0.08 * presence +
    Math.cos(phase) * height * 0.02 * presence;
  const radius = Math.min(width, height) * 0.012;

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
  glow.addColorStop(0, accentBright);
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.globalAlpha = 0.07 * presence;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();

  const lineLength = Math.min(width, height) * 0.04;
  const dx = Math.cos(-0.4) * lineLength * 0.5;
  const dy = Math.sin(-0.4) * lineLength * 0.5;
  ctx.globalAlpha = 0.06 * presence;
  ctx.strokeStyle = accentBright;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - dx, y - dy);
  ctx.lineTo(x + dx, y + dy);
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
  accentBright: string,
  impulse: number,
  pointerX: number,
  lightMove: boolean,
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

  // Anamorphic streak: two elongated soft ellipses breathing through the
  // anchor — the lens-light move of the cinematic collection.
  if (!lightMove) {
    ctx.restore();
    return;
  }
  const drift = (pointerX - 0.5) * width * 0.02;
  const streakHalf =
    Math.min(width, height) * (0.32 + Math.sin(time * 0.07) * 0.03);
  const streak = ctx.createLinearGradient(
    anchorX - streakHalf + drift,
    anchorY,
    anchorX + streakHalf + drift,
    anchorY,
  );
  streak.addColorStop(0, "rgba(0, 0, 0, 0)");
  streak.addColorStop(0.5, accentBright);
  streak.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = streak;
  ctx.globalAlpha = 0.045 + impulse * 0.025;
  ctx.beginPath();
  ctx.ellipse(anchorX + drift, anchorY, streakHalf, 1.4, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = (0.045 + impulse * 0.025) * 0.5;
  ctx.beginPath();
  ctx.ellipse(anchorX + drift, anchorY, streakHalf * 0.7, 4.5, 0, 0, TAU);
  ctx.fill();
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
  accentBright: string,
  impulse: number,
  lightMove: boolean,
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

    // Wet-light catch on one contour: the same curve re-struck hairline-thin,
    // nudged up, in the bright accent — light grazing a ridge.
    if (lightMove && layer === 1) {
      ctx.globalAlpha = 0.05 + impulse * 0.04;
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = accentBright;
      ctx.beginPath();
      ctx.moveTo(width * 0.48, y - 1.4);
      ctx.bezierCurveTo(
        width * 0.61,
        y - 1.4 - height * (0.045 + layer * 0.004),
        width * 0.78,
        y - 1.4 + height * 0.055,
        width * 1.04,
        y - 1.4 - height * 0.02,
      );
      ctx.stroke();
      ctx.strokeStyle = accent;
    }
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
  accentBright: string,
  lightMove: boolean,
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

    // Aperture glint: a short bright dash orbiting the outermost frame edge.
    if (lightMove && frame === 4) {
      const perimeter = 2 * (size * 2 + size * 1.16);
      ctx.setLineDash([perimeter * 0.1, perimeter * 0.9]);
      ctx.lineDashOffset = -((time * 0.05) % 1) * perimeter;
      ctx.globalAlpha = 0.1 + chapterWeight * 0.05;
      ctx.strokeStyle = accentBright;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-size, -size * 0.58, size * 2, size * 1.16);
      ctx.setLineDash([]);
      ctx.strokeStyle = accent;
    }
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

  const accentBright = theme.presentation.accentBright;
  const lightMoves = !isLightGround(theme.background);

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
      if (lightMoves) {
        drawSpecularSweep(
          ctx,
          width,
          height,
          effectiveTime,
          pageMotion.storyProgress,
          accentBright,
          pageMotion.interactionImpulse,
        );
      }
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
        accentBright,
        pageMotion.interactionImpulse,
        targetX,
        lightMoves,
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
        accentBright,
        pageMotion.interactionImpulse,
        lightMoves,
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
      if (lightMoves) {
        drawPrintGlint(
          ctx,
          width,
          height,
          effectiveTime,
          targetX,
          pageMotion.storyProgress,
          accentBright,
          profile.seed,
        );
      }
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
        accentBright,
        lightMoves,
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
    accentBright,
    profile,
  );

  if (lightMoves) {
    drawDepthBokeh(
      ctx,
      width,
      height,
      effectiveTime,
      targetX,
      targetY,
      pageMotion.storyProgress,
      accent,
      profile,
    );
  }

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
