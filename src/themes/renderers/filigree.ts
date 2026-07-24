import { finiteClamp, resolveThemeMotion } from "../shared/motion";
import type { ThemeRenderer } from "../types";

type CubicCurve = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

interface FiligreePoint {
  normalX: number;
  normalY: number;
  tangentX: number;
  tangentY: number;
  u: number;
  x: number;
  y: number;
}

interface ScrollSpec {
  lift: number;
  reach: number;
  side: -1 | 1;
  twist: number;
  u: number;
  variant: 0 | 1 | 2;
}

type StrokePaint = string | CanvasGradient | CanvasPattern;

const DESKTOP_SPINE: readonly CubicCurve[] = [
  [0.97, 0.04, 0.96, 0.11, 0.9, 0.16, 0.92, 0.24],
  [0.92, 0.24, 0.89, 0.34, 0.97, 0.39, 0.94, 0.48],
  [0.94, 0.48, 0.92, 0.58, 0.86, 0.64, 0.9, 0.73],
  [0.9, 0.73, 0.93, 0.84, 0.98, 0.92, 0.95, 1.04],
];

const PORTRAIT_SPINE: readonly CubicCurve[] = [
  [1.02, 0.12, 0.99, 0.18, 0.92, 0.23, 0.94, 0.32],
  [0.94, 0.32, 0.9, 0.43, 0.99, 0.48, 0.96, 0.57],
  [0.96, 0.57, 0.93, 0.67, 0.88, 0.72, 0.92, 0.81],
  [0.92, 0.81, 0.95, 0.9, 1, 0.96, 0.97, 1.04],
];

const DESKTOP_SCROLLS: readonly ScrollSpec[] = [
  {
    u: 0.29,
    side: -1,
    reach: 0.12,
    lift: 0.21,
    twist: -0.14,
    variant: 0,
  },
  {
    u: 0.39,
    side: 1,
    reach: 0.065,
    lift: 0.11,
    twist: 0.1,
    variant: 1,
  },
  {
    u: 0.52,
    side: 1,
    reach: 0.12,
    lift: 0.205,
    twist: -0.1,
    variant: 2,
  },
  {
    u: 0.65,
    side: -1,
    reach: 0.06,
    lift: 0.1,
    twist: 0.12,
    variant: 0,
  },
  {
    u: 0.82,
    side: -1,
    reach: 0.11,
    lift: 0.2,
    twist: -0.08,
    variant: 1,
  },
];

const PORTRAIT_SCROLLS: readonly ScrollSpec[] = [
  {
    u: 0.34,
    side: -1,
    reach: 0.11,
    lift: 0.18,
    twist: -0.1,
    variant: 0,
  },
  {
    u: 0.58,
    side: 1,
    reach: 0.12,
    lift: 0.2,
    twist: -0.08,
    variant: 2,
  },
  {
    u: 0.82,
    side: -1,
    reach: 0.1,
    lift: 0.18,
    twist: 0.12,
    variant: 1,
  },
];

function cubicValue(
  start: number,
  controlA: number,
  controlB: number,
  end: number,
  progress: number,
): number {
  const inverse = 1 - progress;
  return (
    inverse * inverse * inverse * start +
    3 * inverse * inverse * progress * controlA +
    3 * inverse * progress * progress * controlB +
    progress * progress * progress * end
  );
}

function cubicDerivative(
  start: number,
  controlA: number,
  controlB: number,
  end: number,
  progress: number,
): number {
  const inverse = 1 - progress;
  return (
    3 * inverse * inverse * (controlA - start) +
    6 * inverse * progress * (controlB - controlA) +
    3 * progress * progress * (end - controlB)
  );
}

function buildSpinePoints(
  curves: readonly CubicCurve[],
  w: number,
  h: number,
): FiligreePoint[] {
  const points: FiligreePoint[] = [];
  const samplesPerCurve = 16;
  const totalSamples = curves.length * samplesPerCurve;

  for (let sample = 0; sample <= totalSamples; sample += 1) {
    const curveIndex = Math.min(
      curves.length - 1,
      Math.floor(sample / samplesPerCurve),
    );
    const localSample =
      sample === totalSamples ? samplesPerCurve : sample % samplesPerCurve;
    const progress = localSample / samplesPerCurve;
    const [x0, y0, cx1, cy1, cx2, cy2, x1, y1] = curves[curveIndex];
    const x = cubicValue(x0, cx1, cx2, x1, progress) * w;
    const y = cubicValue(y0, cy1, cy2, y1, progress) * h;
    const tangentRawX =
      cubicDerivative(x0, cx1, cx2, x1, progress) * w;
    const tangentRawY =
      cubicDerivative(y0, cy1, cy2, y1, progress) * h;
    const tangentLength = Math.max(
      1,
      Math.hypot(tangentRawX, tangentRawY),
    );
    const tangentX = tangentRawX / tangentLength;
    const tangentY = tangentRawY / tangentLength;

    points.push({
      normalX: -tangentY,
      normalY: tangentX,
      tangentX,
      tangentY,
      u: sample / totalSamples,
      x,
      y,
    });
  }

  return points;
}

function pointAt(
  points: readonly FiligreePoint[],
  u: number,
): FiligreePoint {
  const index = Math.round(
    finiteClamp(u, 0, 1, 0.5) * (points.length - 1),
  );
  return points[index];
}

function traceSpine(
  ctx: CanvasRenderingContext2D,
  points: readonly FiligreePoint[],
): void {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x, points[index].y);
  }
}

function traceScroll(
  ctx: CanvasRenderingContext2D,
  anchor: FiligreePoint,
  scroll: ScrollSpec,
  minSide: number,
): void {
  const reach = scroll.reach * minSide;
  const lift = scroll.lift * minSide;
  const twist = scroll.twist;

  ctx.save();
  ctx.transform(
    anchor.normalX * scroll.side,
    anchor.normalY * scroll.side,
    anchor.tangentX,
    anchor.tangentY,
    anchor.x,
    anchor.y,
  );
  ctx.beginPath();
  ctx.moveTo(0, 0);
  if (scroll.reach < 0.08) {
    ctx.bezierCurveTo(
      reach * 0.06,
      -lift * 0.12,
      reach * 0.72,
      -lift * 0.62,
      reach * 0.94,
      -lift * 0.18,
    );
    ctx.bezierCurveTo(
      reach * 1.05,
      lift * 0.26,
      reach * 0.54,
      lift * 0.7,
      reach * 0.16,
      lift * 0.48,
    );
  } else {
    const upperScale =
      scroll.variant === 0 ? 0.92 : scroll.variant === 1 ? 1.04 : 0.98;
    const lowerScale =
      scroll.variant === 0 ? 1.04 : scroll.variant === 1 ? 0.9 : 0.98;
    const apexGap = finiteClamp(
      (minSide * 0.015) / (2 * lift),
      0.025,
      0.08,
      0.04,
    );

    ctx.bezierCurveTo(
      reach * (0.08 + twist * 0.04),
      -lift * 0.1,
      reach * 0.44 * upperScale,
      -lift * (0.74 - twist * 0.08),
      reach * 0.78 * upperScale,
      -lift * 0.62,
    );
    ctx.bezierCurveTo(
      reach * 1.02 * upperScale,
      -lift * 0.48,
      reach * 0.94 * upperScale,
      lift * 0.04,
      reach * 0.98 * upperScale,
      -lift * apexGap,
    );

    ctx.moveTo(0, lift * 0.04);
    ctx.bezierCurveTo(
      reach * (0.08 - twist * 0.04),
      lift * 0.12,
      reach * 0.44 * lowerScale,
      lift * (0.74 + twist * 0.08),
      reach * 0.78 * lowerScale,
      lift * 0.62,
    );
    ctx.bezierCurveTo(
      reach * 1.02 * lowerScale,
      lift * 0.48,
      reach * 0.94 * lowerScale,
      -lift * 0.04,
      reach * 0.98 * lowerScale,
      lift * apexGap,
    );
  }
  ctx.restore();
}

function traceCompanionScroll(
  ctx: CanvasRenderingContext2D,
  anchor: FiligreePoint,
  scroll: ScrollSpec,
  minSide: number,
): void {
  const reach = scroll.reach * minSide;
  const lift = scroll.lift * minSide;
  const verticalDirection = scroll.variant === 1 ? 1 : -1;

  ctx.save();
  ctx.transform(
    anchor.normalX * scroll.side,
    anchor.normalY * scroll.side,
    anchor.tangentX,
    anchor.tangentY,
    anchor.x,
    anchor.y,
  );
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(
    reach * 0.08,
    lift * 0.05 * verticalDirection,
    reach * 0.3,
    lift * 0.44 * verticalDirection,
    reach * 0.52,
    lift * 0.36 * verticalDirection,
  );
  ctx.bezierCurveTo(
    reach * 0.66,
    lift * 0.28 * verticalDirection,
    reach * 0.68,
    lift * 0.08 * verticalDirection,
    reach * 0.58,
    lift * 0.03 * verticalDirection,
  );
  ctx.restore();
}

function traceHeroBridge(
  ctx: CanvasRenderingContext2D,
  anchor: FiligreePoint,
  scroll: ScrollSpec,
  minSide: number,
): void {
  const reach = scroll.reach * minSide;
  const lift = scroll.lift * minSide;

  ctx.save();
  ctx.transform(
    anchor.normalX * scroll.side,
    anchor.normalY * scroll.side,
    anchor.tangentX,
    anchor.tangentY,
    anchor.x,
    anchor.y,
  );
  ctx.beginPath();
  ctx.moveTo(reach * 0.14, -lift * 0.03);
  ctx.bezierCurveTo(
    reach * 0.38,
    -lift * 0.18,
    reach * 0.82,
    -lift * 0.08,
    reach * 1.02,
    lift * 0.16,
  );
  ctx.bezierCurveTo(
    reach * 1.2,
    lift * 0.34,
    reach * 1.12,
    lift * 0.58,
    reach * 0.92,
    lift * 0.58,
  );
  ctx.bezierCurveTo(
    reach * 0.78,
    lift * 0.58,
    reach * 0.74,
    lift * 0.44,
    reach * 0.86,
    lift * 0.36,
  );
  ctx.restore();
}

function drawHeroBridge(
  ctx: CanvasRenderingContext2D,
  points: readonly FiligreePoint[],
  scroll: ScrollSpec,
  minSide: number,
  strokeStyle: StrokePaint,
  lineWidth: number,
  alpha: number,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = "round";
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  traceHeroBridge(ctx, pointAt(points, scroll.u), scroll, minSide);
  ctx.stroke();
  ctx.restore();
}

function drawOpenwork(
  ctx: CanvasRenderingContext2D,
  points: readonly FiligreePoint[],
  scrolls: readonly ScrollSpec[],
  minSide: number,
  strokeStyle: StrokePaint,
  spineWidth: number,
  scrollWidth: number,
  alpha: number,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = strokeStyle;

  traceSpine(ctx, points);
  ctx.lineWidth = spineWidth;
  ctx.stroke();

  for (const scroll of scrolls) {
    ctx.globalAlpha = alpha;
    traceScroll(ctx, pointAt(points, scroll.u), scroll, minSide);
    ctx.lineWidth = scrollWidth;
    ctx.stroke();

    if (scroll.reach >= 0.08) {
      ctx.globalAlpha = alpha * 0.62;
      traceCompanionScroll(
        ctx,
        pointAt(points, scroll.u),
        scroll,
        minSide,
      );
      ctx.lineWidth = scrollWidth * 0.7;
      ctx.stroke();
    }
  }

  ctx.restore();
}

export const renderFiligree: ThemeRenderer = (
  ctx,
  w,
  h,
  t,
  _mx,
  _my,
  _deltaSeconds,
  motion,
) => {
  if (!(w > 0) || !(h > 0)) return;

  const M = resolveThemeMotion(motion);
  const effectiveTime = motion?.reducedMotion ? 0 : t;
  const portrait = h > w * 1.05;
  const minSide = Math.min(w, h);
  const maxSide = Math.max(w, h);
  const curves = portrait ? PORTRAIT_SPINE : DESKTOP_SPINE;
  const scrolls = portrait ? PORTRAIT_SCROLLS : DESKTOP_SCROLLS;
  const points = buildSpinePoints(curves, w, h);
  const heroScroll = scrolls.find((scroll) => scroll.variant === 2);
  const velocity = finiteClamp(M.scrollVelocity / 4, -1, 1);
  const hasStory = M.sectionCount > 0;
  const ambientRidgeU =
    0.5 + Math.sin(effectiveTime * 0.105 - 0.65) * 0.36;
  const storyLightOffset = motion?.reducedMotion
    ? 0
    : (ambientRidgeU - 0.5) * 0.28;
  let ridgeU = hasStory
    ? 0.1 + M.storyProgress * 0.8 + storyLightOffset
    : ambientRidgeU;

  if (M.hasFocus) {
    const focusU = finiteClamp(
      (M.focusY - (portrait ? 0.1 : 0.04)) /
        (portrait ? 0.86 : 0.94),
      0.06,
      0.94,
      0.5,
    );
    ridgeU += (focusU - ridgeU) * 0.58;
  }
  ridgeU += velocity * 0.035;
  ridgeU = finiteClamp(ridgeU, 0.06, 0.94, 0.28);

  const ridgePoint = pointAt(points, ridgeU);
  const ridgeSigma = 0.14 - M.interactionImpulse * 0.035;
  const ridgeRange = Math.max(
    minSide * 0.1,
    h * ridgeSigma * (portrait ? 0.78 : 0.92),
  );
  const lean = velocity * 0.012;
  const spineWidth = Math.max(
    2,
    minSide * (portrait ? 0.0045 : 0.005),
  );
  const scrollWidth = Math.max(
    1.3,
    minSide * (portrait ? 0.003 : 0.0036),
  );

  ctx.save();
  try {
    ctx.fillStyle = "#05060A";
    ctx.fillRect(0, 0, w, h);

    const lacquer = ctx.createLinearGradient(0, 0, w, h);
    lacquer.addColorStop(0, "rgba(7, 7, 12, 0.96)");
    lacquer.addColorStop(0.52, "rgba(7, 6, 11, 0.82)");
    lacquer.addColorStop(0.78, "rgba(28, 16, 19, 0.42)");
    lacquer.addColorStop(1, "rgba(8, 7, 11, 0.86)");
    ctx.fillStyle = lacquer;
    ctx.fillRect(0, 0, w, h);

    const galleryPool = ctx.createRadialGradient(
      w * (portrait ? 0.84 : 0.82),
      h * 0.48,
      minSide * 0.02,
      w * (portrait ? 0.84 : 0.82),
      h * 0.48,
      minSide * 0.48,
    );
    galleryPool.addColorStop(0, "rgba(116, 73, 30, 0.19)");
    galleryPool.addColorStop(0.44, "rgba(62, 35, 22, 0.08)");
    galleryPool.addColorStop(1, "rgba(5, 6, 10, 0)");
    ctx.fillStyle = galleryPool;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w * 0.84, h * 0.5);
    ctx.rotate(lean);
    ctx.translate(-w * 0.84, -h * 0.5);

    ctx.save();
    ctx.translate(minSide * 0.003, minSide * 0.006);
    drawOpenwork(
      ctx,
      points,
      scrolls,
      minSide,
      "rgba(0, 0, 0, 0.72)",
      spineWidth * 1.4,
      scrollWidth * 1.42,
      1,
    );
    ctx.restore();

    const metal = ctx.createLinearGradient(
      w * 0.66,
      h * 0.1,
      w * 1.02,
      h * 0.86,
    );
    metal.addColorStop(0, "rgba(88, 58, 27, 0.98)");
    metal.addColorStop(0.25, "rgba(154, 108, 43, 0.98)");
    metal.addColorStop(0.48, "rgba(226, 190, 112, 0.98)");
    metal.addColorStop(0.58, "rgba(250, 231, 180, 0.96)");
    metal.addColorStop(0.67, "rgba(191, 143, 51, 0.98)");
    metal.addColorStop(1, "rgba(82, 48, 24, 0.98)");
    drawOpenwork(
      ctx,
      points,
      scrolls,
      minSide,
      metal,
      spineWidth,
      scrollWidth,
      0.92,
    );

    if (heroScroll) {
      drawHeroBridge(
        ctx,
        points,
        heroScroll,
        minSide,
        "rgba(5, 6, 10, 0.98)",
        scrollWidth * 2.2,
        1,
      );
      drawHeroBridge(
        ctx,
        points,
        heroScroll,
        minSide,
        metal,
        scrollWidth * 0.96,
        0.96,
      );
      drawHeroBridge(
        ctx,
        points,
        heroScroll,
        minSide,
        "rgba(248, 232, 189, 0.2)",
        Math.max(0.45, scrollWidth * 0.16),
        0.72,
      );
    }

    const broadReflection = ctx.createLinearGradient(
      0,
      ridgePoint.y - ridgeRange * 1.18,
      0,
      ridgePoint.y + ridgeRange * 1.18,
    );
    broadReflection.addColorStop(0, "rgba(221, 187, 118, 0)");
    broadReflection.addColorStop(0.34, "rgba(221, 187, 118, 0.045)");
    broadReflection.addColorStop(
      0.5,
      `rgba(248, 232, 189, ${
        0.18 + M.interactionImpulse * 0.06
      })`,
    );
    broadReflection.addColorStop(0.66, "rgba(221, 187, 118, 0.045)");
    broadReflection.addColorStop(1, "rgba(221, 187, 118, 0)");

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    drawOpenwork(
      ctx,
      points,
      scrolls,
      minSide,
      broadReflection,
      spineWidth * 1.35,
      scrollWidth * 1.38,
      1,
    );

    const jewelersLight = ctx.createLinearGradient(
      0,
      ridgePoint.y - ridgeRange,
      0,
      ridgePoint.y + ridgeRange,
    );
    jewelersLight.addColorStop(0, "rgba(248, 232, 189, 0)");
    jewelersLight.addColorStop(0.36, "rgba(248, 232, 189, 0.08)");
    jewelersLight.addColorStop(
      0.5,
      `rgba(255, 239, 197, ${
        0.46 + M.interactionImpulse * 0.04
      })`,
    );
    jewelersLight.addColorStop(0.64, "rgba(248, 232, 189, 0.08)");
    jewelersLight.addColorStop(1, "rgba(248, 232, 189, 0)");
    drawOpenwork(
      ctx,
      points,
      scrolls,
      minSide,
      jewelersLight,
      Math.max(0.75, spineWidth * 0.24),
      Math.max(0.5, scrollWidth * 0.26),
      portrait ? 0.72 : 0.84,
    );
    if (heroScroll) {
      drawHeroBridge(
        ctx,
        points,
        heroScroll,
        minSide,
        jewelersLight,
        Math.max(0.5, scrollWidth * 0.26),
        portrait ? 0.7 : 0.82,
      );
    }
    ctx.restore();

    drawOpenwork(
      ctx,
      points,
      scrolls,
      minSide,
      "rgba(248, 232, 189, 0.18)",
      Math.max(0.65, spineWidth * 0.12),
      Math.max(0.45, scrollWidth * 0.14),
      0.72,
    );

    ctx.restore();

    const readingLane = ctx.createLinearGradient(
      0,
      0,
      w * (portrait ? 0.8 : 0.72),
      0,
    );
    readingLane.addColorStop(0, "rgba(5, 6, 10, 0.98)");
    readingLane.addColorStop(0.52, "rgba(5, 6, 10, 0.88)");
    readingLane.addColorStop(0.82, "rgba(5, 6, 10, 0.46)");
    readingLane.addColorStop(1, "rgba(5, 6, 10, 0)");
    ctx.fillStyle = readingLane;
    ctx.fillRect(0, 0, w * (portrait ? 0.82 : 0.75), h);

    if (portrait) {
      const portraitVeil = ctx.createLinearGradient(0, 0, w, 0);
      portraitVeil.addColorStop(0, "rgba(5, 6, 10, 0.3)");
      portraitVeil.addColorStop(0.7, "rgba(5, 6, 10, 0.08)");
      portraitVeil.addColorStop(1, "rgba(5, 6, 10, 0)");
      ctx.fillStyle = portraitVeil;
      ctx.fillRect(0, 0, w, h);
    }

    const vignette = ctx.createRadialGradient(
      w * 0.82,
      h * 0.48,
      minSide * 0.12,
      w * 0.58,
      h * 0.5,
      maxSide * 0.88,
    );
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(0.72, "rgba(0, 0, 0, 0.08)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.58)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  } finally {
    ctx.restore();
  }
};
