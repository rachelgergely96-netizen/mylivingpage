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

interface FoldPoint {
  halfWidth: number;
  normalX: number;
  normalY: number;
  u: number;
  x: number;
  y: number;
}

const DESKTOP_CURVES: readonly [CubicCurve, CubicCurve] = [
  [1.08, -0.08, 0.88, 0.12, 0.92, 0.38, 0.8, 0.52],
  [0.8, 0.52, 0.7, 0.65, 0.92, 0.84, 0.88, 1.12],
];

const PORTRAIT_CURVES: readonly [CubicCurve, CubicCurve] = [
  [1.1, 0.3, 0.88, 0.43, 0.98, 0.56, 0.84, 0.69],
  [0.84, 0.69, 0.75, 0.8, 0.98, 0.95, 0.9, 1.15],
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

function buildFoldPoints(
  w: number,
  h: number,
  minSide: number,
  portrait: boolean,
  effectiveTime: number,
): FoldPoint[] {
  const curves = portrait ? PORTRAIT_CURVES : DESKTOP_CURVES;
  const points: FoldPoint[] = [];
  const stepCount = 48;

  for (let index = 0; index <= stepCount; index += 1) {
    const u = index / stepCount;
    const segmentIndex = u < 0.5 ? 0 : 1;
    const localProgress = segmentIndex === 0 ? u * 2 : (u - 0.5) * 2;
    const curve = curves[segmentIndex];
    const [x0, y0, cx1, cy1, cx2, cy2, x1, y1] = curve;
    const x =
      cubicValue(x0, cx1, cx2, x1, localProgress) * w;
    const y =
      cubicValue(y0, cy1, cy2, y1, localProgress) * h;
    const tangentX =
      cubicDerivative(x0, cx1, cx2, x1, localProgress) * w;
    const tangentY =
      cubicDerivative(y0, cy1, cy2, y1, localProgress) * h;
    const tangentLength = Math.max(1, Math.hypot(tangentX, tangentY));
    const normalX = -tangentY / tangentLength;
    const normalY = tangentX / tangentLength;
    const baseHalfWidth =
      minSide *
      (portrait ? 0.082 + u * 0.024 : 0.098 + u * 0.028);
    const bendTaper =
      1 - Math.exp(-Math.pow((u - 0.59) / 0.15, 2)) * 0.32;
    const viscousRipple =
      Math.sin(effectiveTime * 0.2 + u * Math.PI * 2.6) *
      minSide *
      0.004;

    points.push({
      halfWidth: baseHalfWidth * bendTaper + viscousRipple,
      normalX,
      normalY,
      u,
      x,
      y,
    });
  }

  return points;
}

function offsetPoint(
  point: FoldPoint,
  factor: number,
): readonly [number, number] {
  return [
    point.x + point.normalX * point.halfWidth * factor,
    point.y + point.normalY * point.halfWidth * factor,
  ];
}

function traceBand(
  ctx: CanvasRenderingContext2D,
  points: readonly FoldPoint[],
  lowFactor: number,
  highFactor: number,
): void {
  const first = offsetPoint(points[0], lowFactor);
  ctx.beginPath();
  ctx.moveTo(first[0], first[1]);

  for (let index = 1; index < points.length; index += 1) {
    const point = offsetPoint(points[index], lowFactor);
    ctx.lineTo(point[0], point[1]);
  }
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = offsetPoint(points[index], highFactor);
    ctx.lineTo(point[0], point[1]);
  }
  ctx.closePath();
}

function traceContour(
  ctx: CanvasRenderingContext2D,
  points: readonly FoldPoint[],
  factor: number,
): void {
  const first = offsetPoint(points[0], factor);
  ctx.beginPath();
  ctx.moveTo(first[0], first[1]);
  for (let index = 1; index < points.length; index += 1) {
    const point = offsetPoint(points[index], factor);
    ctx.lineTo(point[0], point[1]);
  }
}

export const renderLuxe: ThemeRenderer = (
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
  const hasStory = M.sectionCount > 0;
  const velocity = finiteClamp(M.scrollVelocity / 4, -1, 1);
  const points = buildFoldPoints(
    w,
    h,
    minSide,
    portrait,
    effectiveTime,
  );

  const ambientRidgeU =
    0.44 + Math.sin(effectiveTime * 0.115) * 0.13;
  let ridgeU = hasStory ? M.storyProgress : ambientRidgeU;
  if (M.hasFocus) {
    const focusU = finiteClamp(
      (M.focusY - (portrait ? 0.3 : 0.02)) /
        (portrait ? 0.82 : 0.96),
      0.08,
      0.92,
      0.5,
    );
    ridgeU += (focusU - ridgeU) * 0.55;
  }
  ridgeU = finiteClamp(ridgeU, 0.08, 0.92, 0.5);
  const ridgePoint =
    points[Math.round(ridgeU * (points.length - 1))];
  const ridgeHalfHeight = minSide * (portrait ? 0.16 : 0.2);
  const ridgeFactor =
    0.08 +
    Math.sin(effectiveTime * 0.21) * 0.3 +
    velocity * 0.04;

  ctx.save();
  try {
    const lacquerField = ctx.createLinearGradient(0, 0, w, h);
    lacquerField.addColorStop(0, "rgba(5, 4, 4, 0.9)");
    lacquerField.addColorStop(0.52, "rgba(8, 5, 4, 0.72)");
    lacquerField.addColorStop(0.78, "rgba(22, 10, 6, 0.54)");
    lacquerField.addColorStop(1, "rgba(7, 4, 3, 0.78)");
    ctx.fillStyle = lacquerField;
    ctx.fillRect(0, 0, w, h);

    const lacquerReflection = ctx.createRadialGradient(
      w * 0.83,
      h * 0.48,
      minSide * 0.06,
      w * 0.79,
      h * 0.48,
      maxSide * 0.6,
    );
    lacquerReflection.addColorStop(0, "rgba(115, 64, 20, 0.1)");
    lacquerReflection.addColorStop(0.45, "rgba(48, 22, 8, 0.055)");
    lacquerReflection.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = lacquerReflection;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(-minSide * 0.026, minSide * 0.018);
    traceBand(ctx, points, -1.08, 1.08);
    ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
    ctx.fill();
    ctx.restore();

    traceBand(ctx, points, -1, 1);
    const metalBody = ctx.createLinearGradient(
      w * (portrait ? 0.7 : 0.6),
      h * 0.14,
      w * 1.04,
      h * 0.74,
    );
    metalBody.addColorStop(0, "rgba(43, 22, 7, 0.98)");
    metalBody.addColorStop(0.18, "rgba(87, 45, 11, 0.98)");
    metalBody.addColorStop(0.38, "rgba(137, 82, 26, 0.99)");
    metalBody.addColorStop(0.56, "rgba(205, 157, 76, 0.98)");
    metalBody.addColorStop(0.605, "rgba(226, 189, 106, 0.96)");
    metalBody.addColorStop(0.64, "rgba(190, 126, 45, 0.99)");
    metalBody.addColorStop(0.74, "rgba(128, 68, 18, 0.99)");
    metalBody.addColorStop(0.86, "rgba(78, 38, 10, 0.99)");
    metalBody.addColorStop(1, "rgba(39, 18, 6, 0.99)");
    ctx.fillStyle = metalBody;
    ctx.fill();

    traceBand(ctx, points, -0.72, 0.34);
    const nestedFold = ctx.createLinearGradient(
      w * (portrait ? 0.72 : 0.62),
      h * 0.12,
      w,
      h * 0.9,
    );
    nestedFold.addColorStop(0, "rgba(48, 23, 7, 0.88)");
    nestedFold.addColorStop(0.28, "rgba(123, 70, 19, 0.78)");
    nestedFold.addColorStop(0.55, "rgba(185, 126, 43, 0.82)");
    nestedFold.addColorStop(0.72, "rgba(115, 62, 17, 0.86)");
    nestedFold.addColorStop(1, "rgba(38, 18, 6, 0.92)");
    ctx.fillStyle = nestedFold;
    ctx.fill();

    traceContour(ctx, points, 0.34);
    ctx.strokeStyle = "rgba(37, 17, 5, 0.48)";
    ctx.lineWidth = minSide * 0.014;
    ctx.lineJoin = "round";
    ctx.stroke();

    traceContour(ctx, points, 0.3);
    ctx.strokeStyle = "rgba(255, 225, 152, 0.22)";
    ctx.lineWidth = Math.max(0.7, minSide * 0.0012);
    ctx.stroke();

    const contourCount = portrait ? 12 : 16;
    for (let index = 0; index < contourCount; index += 1) {
      const factor =
        -0.76 + (index / Math.max(1, contourCount - 1)) * 1.48;
      traceContour(ctx, points, factor);
      const bright = index % 3 === 1;
      ctx.strokeStyle = bright
        ? "rgba(255, 232, 174, 0.2)"
        : "rgba(55, 27, 8, 0.28)";
      ctx.lineWidth = bright
        ? Math.max(0.55, minSide * 0.0008)
        : Math.max(0.7, minSide * 0.0011);
      ctx.stroke();
    }

    const ridgeGradient = ctx.createLinearGradient(
      0,
      ridgePoint.y - ridgeHalfHeight,
      0,
      ridgePoint.y + ridgeHalfHeight,
    );
    ridgeGradient.addColorStop(0, "rgba(255, 240, 187, 0)");
    ridgeGradient.addColorStop(0.34, "rgba(255, 224, 143, 0.09)");
    ridgeGradient.addColorStop(
      0.5,
      `rgba(255, 246, 211, ${0.78 + M.interactionImpulse * 0.1})`,
    );
    ridgeGradient.addColorStop(0.66, "rgba(255, 224, 143, 0.09)");
    ridgeGradient.addColorStop(1, "rgba(255, 240, 187, 0)");

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const ridgeWash = ctx.createLinearGradient(
      0,
      ridgePoint.y - ridgeHalfHeight * 1.35,
      0,
      ridgePoint.y + ridgeHalfHeight * 1.35,
    );
    ridgeWash.addColorStop(0, "rgba(232, 173, 72, 0)");
    ridgeWash.addColorStop(0.34, "rgba(232, 173, 72, 0.065)");
    ridgeWash.addColorStop(
      0.5,
      `rgba(255, 218, 135, ${0.26 + M.interactionImpulse * 0.05})`,
    );
    ridgeWash.addColorStop(0.66, "rgba(232, 173, 72, 0.065)");
    ridgeWash.addColorStop(1, "rgba(232, 173, 72, 0)");
    traceBand(
      ctx,
      points,
      ridgeFactor - 0.2,
      ridgeFactor + 0.2,
    );
    ctx.fillStyle = ridgeWash;
    ctx.fill();

    traceContour(ctx, points, ridgeFactor);
    ctx.strokeStyle = ridgeGradient;
    ctx.lineWidth = minSide * 0.014;
    ctx.globalAlpha = 0.07 + M.interactionImpulse * 0.03;
    ctx.stroke();
    traceContour(ctx, points, ridgeFactor);
    ctx.strokeStyle = ridgeGradient;
    ctx.lineWidth = Math.max(1.2, minSide * 0.0024);
    ctx.globalAlpha = portrait ? 0.7 : 0.82;
    ctx.stroke();
    ctx.restore();

    traceContour(ctx, points, -0.9);
    ctx.strokeStyle = "rgba(255, 234, 180, 0.18)";
    ctx.lineWidth = Math.max(0.7, minSide * 0.001);
    ctx.stroke();

    const readingLane = ctx.createLinearGradient(
      0,
      0,
      w * (portrait ? 0.78 : 0.74),
      0,
    );
    readingLane.addColorStop(0, "rgba(6, 4, 4, 0.96)");
    readingLane.addColorStop(0.52, "rgba(7, 4, 4, 0.84)");
    readingLane.addColorStop(0.82, "rgba(7, 4, 3, 0.44)");
    readingLane.addColorStop(1, "rgba(7, 4, 3, 0)");
    ctx.fillStyle = readingLane;
    ctx.fillRect(0, 0, w * (portrait ? 0.8 : 0.77), h);

    const vignette = ctx.createRadialGradient(
      w * 0.8,
      h * 0.48,
      minSide * 0.16,
      w * 0.58,
      h * 0.5,
      maxSide * 0.86,
    );
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(0.72, "rgba(0, 0, 0, 0.07)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.5)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  } finally {
    ctx.restore();
  }
};
