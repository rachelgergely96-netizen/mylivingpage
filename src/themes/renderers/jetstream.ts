import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "../shared/motion";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

function drawCloudBank(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha: number,
) {
  const cloud = ctx.createRadialGradient(
    x - radius * 0.18,
    y - radius * 0.2,
    0,
    x,
    y,
    radius,
  );
  cloud.addColorStop(0, `rgba(179, 211, 235, ${alpha})`);
  cloud.addColorStop(0.42, `rgba(96, 139, 179, ${alpha * 0.42})`);
  cloud.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = cloud;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function traceStreamRibbon(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  lift: number,
  width: number,
  pointerBend: number,
) {
  const controlX1 = startX + (endX - startX) * 0.32;
  const controlX2 = startX + (endX - startX) * 0.7;
  const controlY1 = startY - lift + pointerBend;
  const controlY2 = endY + lift * 0.42 - pointerBend * 0.55;

  ctx.beginPath();
  ctx.moveTo(startX, startY - width * 0.5);
  ctx.bezierCurveTo(
    controlX1,
    controlY1 - width * 0.35,
    controlX2,
    controlY2 - width * 0.3,
    endX,
    endY - width * 0.18,
  );
  ctx.lineTo(endX, endY + width * 0.18);
  ctx.bezierCurveTo(
    controlX2,
    controlY2 + width * 0.3,
    controlX1,
    controlY1 + width * 0.35,
    startX,
    startY + width * 0.5,
  );
  ctx.closePath();
}

/** High-altitude stream ribbons and contrails staged away from the reading lane. */
export const renderJetstream: ThemeRenderer = (
  ctx,
  w,
  h,
  t,
  mx,
  my,
  _deltaSeconds,
  motion,
) => {
  const pageMotion = resolveThemeMotion(motion);
  const velocity = finiteClamp(pageMotion.scrollVelocity / 3, -1, 1);
  const storyProgress = pageMotion.storyProgress;
  const minSide = Math.min(w, h);
  const horizonY =
    h * (0.68 - storyProgress * 0.055) +
    (my - 0.5) * h * 0.018;

  ctx.save();

  const sky = ctx.createLinearGradient(0, 0, w, h);
  sky.addColorStop(0, "#050B14");
  sky.addColorStop(0.48, "#0A1B2A");
  sky.addColorStop(0.74, "#102739");
  sky.addColorStop(1, "#050A10");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Far plane: atmospheric horizon and cloud banks concentrated on the right.
  const horizon = ctx.createLinearGradient(0, horizonY - h * 0.22, 0, horizonY + h * 0.2);
  horizon.addColorStop(0, "rgba(112, 174, 216, 0)");
  horizon.addColorStop(0.52, "rgba(112, 174, 216, 0.085)");
  horizon.addColorStop(1, "rgba(31, 61, 83, 0)");
  ctx.fillStyle = horizon;
  ctx.fillRect(w * 0.34, horizonY - h * 0.24, w * 0.66, h * 0.48);

  for (let cloudIndex = 0; cloudIndex < 7; cloudIndex += 1) {
    const seed = cloudIndex * 0.83 + 0.21;
    const drift = Math.sin(t * 0.035 + seed) * minSide * 0.018;
    const x =
      w * (0.46 + cloudIndex * 0.095) +
      drift +
      storyProgress * minSide * 0.012;
    const y =
      horizonY +
      Math.cos(seed * 4.1) * h * 0.08 +
      velocity * h * 0.012;
    const radius = minSide * (0.13 + (cloudIndex % 3) * 0.035);
    drawCloudBank(ctx, x, y, radius, 0.045 + (cloudIndex % 3) * 0.012);
  }

  ctx.save();
  ctx.strokeStyle = "rgba(158, 202, 232, 0.045)";
  ctx.lineWidth = 1;
  for (let altitude = 0; altitude < 5; altitude += 1) {
    const y = h * (0.15 + altitude * 0.105) - storyProgress * h * 0.016;
    ctx.beginPath();
    ctx.moveTo(w * 0.48, y);
    ctx.quadraticCurveTo(w * 0.74, y - h * 0.035, w, y + h * 0.012);
    ctx.stroke();
  }
  ctx.restore();

  // Middle plane: four translucent airflow ribbons with true filled volume.
  const ribbons: Array<{ endY: number; lift: number; width: number }> = [
    { endY: 0.18, lift: 0.16, width: 0.036 },
    { endY: 0.33, lift: 0.12, width: 0.03 },
    { endY: 0.48, lift: 0.1, width: 0.026 },
    { endY: 0.62, lift: 0.075, width: 0.022 },
  ];
  const pointerBend = (mx - 0.5) * h * 0.035;
  ribbons.forEach((ribbon, index) => {
    const chapterWeight = storyStepWeight(storyProgress, index, ribbons.length);
    const startX = w * (0.42 + index * 0.025);
    const startY = h * (0.78 - index * 0.035) + velocity * h * 0.018;
    const endX = w * 1.06;
    const endY = h * ribbon.endY - storyProgress * h * 0.025;
    const ribbonWidth = h * ribbon.width * (1 + chapterWeight * 0.24);
    traceStreamRibbon(
      ctx,
      startX,
      startY,
      endX,
      endY,
      h * ribbon.lift,
      ribbonWidth,
      pointerBend * (1 - index * 0.14),
    );
    const fill = ctx.createLinearGradient(startX, startY, endX, endY);
    fill.addColorStop(0, "rgba(93, 157, 204, 0)");
    fill.addColorStop(0.35, `rgba(121, 188, 231, ${0.055 + chapterWeight * 0.045})`);
    fill.addColorStop(0.72, `rgba(204, 231, 248, ${0.11 + chapterWeight * 0.08})`);
    fill.addColorStop(1, "rgba(234, 246, 253, 0)");
    ctx.fillStyle = fill;
    ctx.fill();

    traceStreamRibbon(
      ctx,
      startX + minSide * 0.018,
      startY,
      endX,
      endY,
      h * ribbon.lift,
      Math.max(1, ribbonWidth * 0.11),
      pointerBend * (1 - index * 0.14),
    );
    ctx.fillStyle = `rgba(231, 246, 255, ${0.1 + chapterWeight * 0.12})`;
    ctx.fill();
  });

  // Foreground plane: restrained speed traces and a route marker moving with
  // the ordered Living Page story.
  for (let streak = 0; streak < 54; streak += 1) {
    const seed = streak * 0.619 + 0.17;
    const speed = 0.028 + (streak % 5) * 0.004;
    const progress = ((t * speed + seed * 0.19 + storyProgress * 0.18) % 1 + 1) % 1;
    const x = w * (0.43 + progress * 0.63);
    const lane = streak % ribbons.length;
    const baseY = h * (0.74 - lane * 0.13);
    const y =
      baseY -
      progress * h * (0.35 + lane * 0.025) +
      Math.sin(seed * 5.2 + t * 0.12) * h * 0.012 +
      velocity * h * 0.012;
    const length = minSide * (0.012 + (streak % 4) * 0.006);
    ctx.beginPath();
    ctx.moveTo(x - length, y + length * 0.16);
    ctx.lineTo(x, y);
    ctx.strokeStyle = `rgba(207, 234, 250, ${(1 - progress) * 0.095})`;
    ctx.lineWidth = 0.7 + (streak % 3) * 0.2;
    ctx.stroke();
  }

  const routeProgress = 0.18 + storyProgress * 0.64;
  const routeX = w * (0.47 + routeProgress * 0.54);
  const routeY =
    h * (0.7 - routeProgress * 0.42) +
    Math.sin(t * 0.12 + storyProgress * 2) * minSide * 0.006;
  ctx.save();
  ctx.translate(routeX, routeY);
  ctx.rotate(-0.5 + velocity * 0.025);
  ctx.beginPath();
  ctx.moveTo(minSide * 0.014, 0);
  ctx.lineTo(-minSide * 0.009, -minSide * 0.006);
  ctx.lineTo(-minSide * 0.004, 0);
  ctx.lineTo(-minSide * 0.009, minSide * 0.006);
  ctx.closePath();
  ctx.fillStyle = "rgba(231, 247, 255, 0.72)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, minSide * 0.025, 0, TAU);
  ctx.strokeStyle = "rgba(149, 207, 241, 0.18)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  if (pageMotion.hasFocus) {
    const focusX = pageMotion.focusX * w;
    const focusY = pageMotion.focusY * h;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(routeX, routeY);
    ctx.lineTo(focusX, focusY);
    ctx.setLineDash([4, 8]);
    ctx.strokeStyle = `rgba(161, 213, 242, ${0.11 + pageMotion.interactionImpulse * 0.16})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    const focusSize = 8 + pageMotion.interactionImpulse * 9;
    ctx.strokeStyle = "rgba(215, 239, 252, 0.42)";
    ctx.strokeRect(
      focusX - focusSize * 0.5,
      focusY - focusSize * 0.5,
      focusSize,
      focusSize,
    );
    ctx.restore();
  }

  const clearSpace = ctx.createLinearGradient(0, 0, w * 0.6, 0);
  clearSpace.addColorStop(0, "rgba(2, 6, 12, 0.58)");
  clearSpace.addColorStop(0.72, "rgba(2, 6, 12, 0.23)");
  clearSpace.addColorStop(1, "rgba(2, 6, 12, 0)");
  ctx.fillStyle = clearSpace;
  ctx.fillRect(0, 0, w * 0.64, h);

  const vignette = ctx.createRadialGradient(
    w * 0.76,
    h * 0.43,
    minSide * 0.16,
    w * 0.64,
    h * 0.48,
    Math.max(w, h) * 0.8,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(1, 4, 9, 0.42)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
};
