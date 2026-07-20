import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "../shared/motion";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

const RIDGES = [
  [0.72, 0.68, 0.7, 0.61, 0.66, 0.59, 0.64, 0.57, 0.62, 0.6, 0.65, 0.63, 0.69],
  [0.82, 0.78, 0.76, 0.72, 0.75, 0.68, 0.73, 0.66, 0.71, 0.69, 0.75, 0.72, 0.78],
  [0.94, 0.89, 0.91, 0.84, 0.88, 0.82, 0.86, 0.8, 0.85, 0.83, 0.9, 0.86, 0.92],
] as const;

const CONSTELLATION = [
  [0.58, 0.2],
  [0.65, 0.16],
  [0.71, 0.24],
  [0.79, 0.18],
  [0.87, 0.27],
] as const;

function stableUnit(seed: number): number {
  const value = Math.sin(seed * 73.37 + 8.19) * 43758.5453;
  return value - Math.floor(value);
}

function drawRidge(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  values: readonly number[],
  color: string,
  offset: number,
) {
  ctx.beginPath();
  ctx.moveTo(0, h + 2);
  values.forEach((value, index) => {
    const x = (index / (values.length - 1)) * w;
    const y = value * h + offset;
    ctx.lineTo(x, y);
  });
  ctx.lineTo(w, h + 2);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export const renderNocturne: ThemeRenderer = (
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
  const reducedMotion = motion?.reducedMotion ?? false;
  const effectiveTime = reducedMotion ? 0 : finiteClamp(t, 0, 1_000_000);
  const targetX = pageMotion.hasFocus ? mx * 0.28 + pageMotion.focusX * 0.72 : mx;
  const targetY = pageMotion.hasFocus ? my * 0.28 + pageMotion.focusY * 0.72 : my;
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#050817");
  sky.addColorStop(0.48, "#0A1022");
  sky.addColorStop(0.74, "#080B16");
  sky.addColorStop(1, "#020307");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const moonRadius = Math.min(w, h) * (w < h ? 0.28 : 0.3);
  const moonX = w * (w < h ? 0.86 : 0.81) + (targetX - 0.5) * w * 0.018;
  const moonY = h * 0.27 + (targetY - 0.5) * h * 0.014;
  const halo = ctx.createRadialGradient(
    moonX,
    moonY,
    moonRadius * 0.72,
    moonX,
    moonY,
    moonRadius * 1.65,
  );
  halo.addColorStop(0, "rgba(194, 208, 255, 0.11)");
  halo.addColorStop(0.55, "rgba(112, 130, 196, 0.045)");
  halo.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = halo;
  ctx.fillRect(
    moonX - moonRadius * 1.7,
    moonY - moonRadius * 1.7,
    moonRadius * 3.4,
    moonRadius * 3.4,
  );

  ctx.save();
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonRadius, 0, TAU);
  ctx.clip();
  const moon = ctx.createLinearGradient(
    moonX - moonRadius,
    moonY - moonRadius,
    moonX + moonRadius,
    moonY + moonRadius,
  );
  moon.addColorStop(0, "#F0F2F8");
  moon.addColorStop(0.45, "#C6CDE0");
  moon.addColorStop(1, "#77819D");
  ctx.fillStyle = moon;
  ctx.fillRect(
    moonX - moonRadius,
    moonY - moonRadius,
    moonRadius * 2,
    moonRadius * 2,
  );

  for (let index = 0; index < 22; index += 1) {
    const angle = stableUnit(index * 2.3) * TAU;
    const distance = Math.sqrt(stableUnit(index * 3.9 + 2)) * moonRadius * 0.78;
    const x = moonX + Math.cos(angle) * distance;
    const y = moonY + Math.sin(angle) * distance;
    const radius = moonRadius * (0.018 + stableUnit(index * 5.1 + 7) * 0.065);
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * 0.62, angle, 0, TAU);
    ctx.fillStyle = `rgba(42, 48, 66, ${0.07 + (index % 4) * 0.018})`;
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(42, 48, 66, 0.11)";
  ctx.lineWidth = 0.65;
  for (let line = -moonRadius * 2; line < moonRadius * 2; line += Math.max(7, moonRadius * 0.055)) {
    ctx.beginPath();
    ctx.moveTo(moonX - moonRadius, moonY + line);
    ctx.lineTo(moonX + moonRadius, moonY + line - moonRadius * 0.7);
    ctx.stroke();
  }

  const phaseOffset = moonRadius * (0.32 - pageMotion.storyProgress * 0.42);
  const shadow = ctx.createLinearGradient(
    moonX - moonRadius,
    moonY,
    moonX + moonRadius,
    moonY,
  );
  shadow.addColorStop(0, "rgba(5, 8, 20, 0.08)");
  shadow.addColorStop(0.48, "rgba(5, 8, 20, 0.22)");
  shadow.addColorStop(1, "rgba(5, 8, 20, 0.68)");
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(
    moonX + phaseOffset,
    moonY,
    moonRadius * 0.88,
    moonRadius * 1.05,
    0,
    0,
    TAU,
  );
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(moonX, moonY, moonRadius, 0, TAU);
  ctx.strokeStyle = "rgba(225, 231, 255, 0.42)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // An engraved constellation axis replaces the usual dense twinkling field.
  ctx.save();
  ctx.strokeStyle = "rgba(188, 202, 255, 0.14)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  CONSTELLATION.forEach(([px, py], index) => {
    const x = px * w;
    const y = py * h;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  CONSTELLATION.forEach(([px, py], index) => {
    const chapterWeight = storyStepWeight(
      pageMotion.storyProgress,
      index,
      CONSTELLATION.length,
    );
    const pulse = 0.5 + Math.sin(effectiveTime * 0.22 + index) * 0.12;
    ctx.fillStyle = `rgba(226, 233, 255, ${0.22 + chapterWeight * 0.42 + pulse * 0.08})`;
    ctx.fillRect(px * w - 1, py * h - 1, 2 + chapterWeight, 2 + chapterWeight);
  });
  ctx.restore();

  for (let index = 0; index < 26; index += 1) {
    const x = stableUnit(index * 2.81 + 3) * w;
    const y = stableUnit(index * 4.17 + 9) * h * 0.56;
    const alpha = 0.05 + stableUnit(index + 11) * 0.13;
    ctx.fillStyle = `rgba(217, 225, 255, ${alpha})`;
    ctx.fillRect(x, y, index % 7 === 0 ? 1.4 : 0.8, index % 7 === 0 ? 1.4 : 0.8);
  }

  // Quiet atmosphere bands and authored ridge silhouettes ground the edition.
  for (let band = 0; band < 3; band += 1) {
    const y = h * (0.56 + band * 0.08);
    const fog = ctx.createLinearGradient(0, y - 18, 0, y + 24);
    fog.addColorStop(0, "rgba(150, 165, 212, 0)");
    fog.addColorStop(0.5, `rgba(150, 165, 212, ${0.022 + band * 0.01})`);
    fog.addColorStop(1, "rgba(150, 165, 212, 0)");
    ctx.fillStyle = fog;
    ctx.fillRect(0, y - 18, w, 42);
  }
  drawRidge(ctx, w, h, RIDGES[0], "rgba(25, 29, 47, 0.86)", 0);
  drawRidge(ctx, w, h, RIDGES[1], "rgba(13, 16, 29, 0.94)", 0);
  drawRidge(ctx, w, h, RIDGES[2], "rgba(4, 6, 11, 0.99)", 0);

  const frameX = w * 0.52;
  ctx.strokeStyle = "rgba(190, 203, 245, 0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(frameX, h * 0.08);
  ctx.lineTo(frameX, h * 0.9);
  ctx.stroke();
  for (let tick = 0; tick <= 8; tick += 1) {
    const y = h * (0.08 + tick * 0.1025);
    ctx.fillStyle = "rgba(190, 203, 245, 0.18)";
    ctx.fillRect(frameX, y, tick % 2 === 0 ? 11 : 6, 1);
  }

  if (pageMotion.hasFocus) {
    const focusX = pageMotion.focusX * w;
    const focusY = pageMotion.focusY * h;
    const size = 7 + (1 - pageMotion.interactionImpulse) * 10;
    ctx.save();
    ctx.strokeStyle = `rgba(226, 233, 255, ${0.4 + pageMotion.interactionImpulse * 0.3})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(focusX - size, focusY);
    ctx.lineTo(focusX + size, focusY);
    ctx.moveTo(focusX, focusY - size);
    ctx.lineTo(focusX, focusY + size);
    ctx.stroke();
    ctx.fillStyle = "rgba(241, 244, 255, 0.9)";
    ctx.fillRect(focusX - 1, focusY - 1, 2, 2);
    ctx.restore();
  }
};
