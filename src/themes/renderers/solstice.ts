import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "../shared/motion";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

export const renderSolstice: ThemeRenderer = (
  ctx,
  w,
  h,
  t,
  mx,
  my,
  _deltaSeconds,
  motion,
) => {
  const page = resolveThemeMotion(motion);
  const pointerX = finiteClamp(mx, 0, 1, 0.5) - 0.5;
  const pointerY = finiteClamp(my, 0, 1, 0.5) - 0.5;
  const minSide = Math.min(w, h);
  const horizonY = h * 0.62;
  const sunX = w * 0.79 + pointerX * minSide * 0.04;
  const sunY = horizonY - h * (0.105 - page.storyProgress * 0.055) + pointerY * minSide * 0.02;
  const sunRadius = minSide * 0.115;

  ctx.save();

  // Far plane: a full cinematic sky, darkest where copy is expected to sit.
  const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
  sky.addColorStop(0, "#130D1A");
  sky.addColorStop(0.37, "#32151E");
  sky.addColorStop(0.72, "#7D3028");
  sky.addColorStop(1, "#D36E3B");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, horizonY);

  const horizonGlow = ctx.createRadialGradient(sunX, horizonY, 0, sunX, horizonY, minSide * 0.72);
  horizonGlow.addColorStop(0, "rgba(255, 177, 88, 0.48)");
  horizonGlow.addColorStop(0.36, "rgba(219, 85, 63, 0.18)");
  horizonGlow.addColorStop(1, "rgba(33, 13, 24, 0)");
  ctx.fillStyle = horizonGlow;
  ctx.fillRect(w * 0.34, 0, w * 0.66, horizonY + sunRadius);

  for (let band = 0; band < 4; band += 1) {
    const y = horizonY - h * (0.28 - band * 0.075) + Math.sin(t * 0.035 + band) * minSide * 0.006;
    ctx.beginPath();
    ctx.moveTo(w * (0.43 + band * 0.025), y);
    ctx.bezierCurveTo(
      w * 0.58,
      y - minSide * (0.018 + band * 0.004),
      w * 0.75,
      y + minSide * 0.017,
      w,
      y - minSide * 0.006,
    );
    ctx.lineTo(w, y + minSide * (0.024 + band * 0.006));
    ctx.bezierCurveTo(w * 0.76, y + minSide * 0.034, w * 0.6, y + minSide * 0.008, w * 0.43, y + minSide * 0.02);
    ctx.closePath();
    ctx.fillStyle = `rgba(58, 23, 39, ${0.09 - band * 0.012})`;
    ctx.fill();
  }

  const corona = ctx.createRadialGradient(sunX, sunY, sunRadius * 0.25, sunX, sunY, sunRadius * 2.75);
  corona.addColorStop(0, "rgba(255, 246, 205, 0.64)");
  corona.addColorStop(0.3, "rgba(255, 166, 89, 0.24)");
  corona.addColorStop(1, "rgba(216, 68, 53, 0)");
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunRadius * 2.75, 0, TAU);
  ctx.fill();

  const sun = ctx.createRadialGradient(
    sunX - sunRadius * 0.28,
    sunY - sunRadius * 0.34,
    0,
    sunX,
    sunY,
    sunRadius,
  );
  sun.addColorStop(0, "#FFF9D8");
  sun.addColorStop(0.52, "#FFD080");
  sun.addColorStop(1, "#EE754F");
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunRadius, 0, TAU);
  ctx.fill();

  // Middle plane: three landscape layers put the sun into a place, not an orbit.
  ctx.beginPath();
  ctx.moveTo(0, horizonY + minSide * 0.025);
  ctx.lineTo(w * 0.38, horizonY + minSide * 0.008);
  ctx.quadraticCurveTo(w * 0.54, horizonY - minSide * 0.085, w * 0.68, horizonY - minSide * 0.018);
  ctx.quadraticCurveTo(w * 0.82, horizonY - minSide * 0.07, w, horizonY - minSide * 0.025);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = "rgba(82, 31, 35, 0.72)";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, horizonY + minSide * 0.075);
  ctx.bezierCurveTo(w * 0.38, horizonY + minSide * 0.02, w * 0.53, horizonY - minSide * 0.022, w * 0.69, horizonY + minSide * 0.03);
  ctx.bezierCurveTo(w * 0.83, horizonY + minSide * 0.082, w * 0.91, horizonY - minSide * 0.005, w, horizonY + minSide * 0.025);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = "#27151B";
  ctx.fill();

  const foreground = ctx.createLinearGradient(0, horizonY, 0, h);
  foreground.addColorStop(0, "#1A1015");
  foreground.addColorStop(1, "#070609");
  ctx.fillStyle = foreground;
  ctx.beginPath();
  ctx.moveTo(0, horizonY + minSide * 0.13);
  ctx.bezierCurveTo(w * 0.34, horizonY + minSide * 0.08, w * 0.64, horizonY + minSide * 0.17, w, horizonY + minSide * 0.09);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  // Foreground light stretches toward the viewer in a few broad, bounded strokes.
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let reflection = 0; reflection < 7; reflection += 1) {
    const y = horizonY + minSide * (0.035 + reflection * 0.042);
    const width = minSide * (0.045 + reflection * 0.032);
    const offset = Math.sin(t * 0.07 + reflection * 1.4) * minSide * 0.006;
    const reflectionGradient = ctx.createLinearGradient(sunX - width, y, sunX + width, y);
    reflectionGradient.addColorStop(0, "rgba(255, 139, 83, 0)");
    reflectionGradient.addColorStop(0.5, `rgba(255, 181, 98, ${0.14 - reflection * 0.014})`);
    reflectionGradient.addColorStop(1, "rgba(255, 139, 83, 0)");
    ctx.beginPath();
    ctx.moveTo(sunX - width + offset, y);
    ctx.lineTo(sunX + width + offset, y);
    ctx.strokeStyle = reflectionGradient;
    ctx.lineWidth = Math.max(1, minSide * (0.004 + reflection * 0.0015));
    ctx.stroke();
  }
  ctx.restore();

  const stepCount = Math.max(4, Math.min(7, page.sectionCount || 5));
  for (let step = 0; step < stepCount; step += 1) {
    const weight = storyStepWeight(page.storyProgress, step, stepCount);
    const x = w * (0.52 + (step / Math.max(1, stepCount - 1)) * 0.43);
    ctx.beginPath();
    ctx.arc(x, horizonY + minSide * 0.012, 1.3 + weight * 2.1, 0, TAU);
    ctx.fillStyle = `rgba(255, 202, 130, ${0.15 + weight * 0.58})`;
    ctx.fill();
  }

  for (let i = 0; i < 30; i += 1) {
    const seed = i + 1;
    const x = w * (0.48 + (0.5 + 0.5 * Math.sin(seed * 7.3)) * 0.5);
    const progress = (0.5 + 0.5 * Math.cos(seed * 4.9 + t * 0.08)) * 0.9;
    const y = h * (0.1 + progress * 0.78);
    ctx.beginPath();
    ctx.arc(x, y, 0.45 + (i % 3) * 0.25, 0, TAU);
    ctx.fillStyle = `rgba(255, 194, 126, ${0.025 + (i % 4) * 0.015})`;
    ctx.fill();
  }

  if (page.hasFocus) {
    ctx.beginPath();
    ctx.moveTo(page.focusX * w, page.focusY * h);
    ctx.quadraticCurveTo(w * 0.63, page.focusY * h, sunX - sunRadius * 1.25, sunY);
    ctx.strokeStyle = "rgba(255, 184, 116, 0.22)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const clearSpace = ctx.createLinearGradient(0, 0, w * 0.68, 0);
  clearSpace.addColorStop(0, "rgba(12, 8, 14, 0.84)");
  clearSpace.addColorStop(0.64, "rgba(12, 8, 14, 0.5)");
  clearSpace.addColorStop(1, "rgba(12, 8, 14, 0)");
  ctx.fillStyle = clearSpace;
  ctx.fillRect(0, 0, w * 0.68, h);

  const vignette = ctx.createRadialGradient(sunX, horizonY, minSide * 0.16, w * 0.56, h * 0.5, Math.max(w, h) * 0.86);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.44)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
};
