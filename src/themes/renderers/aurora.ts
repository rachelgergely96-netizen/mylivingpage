import { fbm } from "../shared/noise";
import { finiteClamp, resolveThemeMotion } from "../shared/motion";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

function drawAuroraRibbon(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  band: number,
  mx: number,
  my: number,
  scrollProgress: number,
  scrollVelocity: number,
  active: boolean,
) {
  const phaseTime = t + scrollProgress * 1.8 + scrollVelocity * 0.08;
  const baseY = h * (0.1 + band * 0.065) + scrollProgress * h * 0.018;
  const hue =
    148 +
    band * 24 +
    Math.sin(t * 0.16 + band * 0.8) * 12 +
    scrollProgress * 28;
  const points: Array<[number, number]> = [];

  for (let x = -8; x <= w + 8; x += 5) {
    const normalizedX = x / Math.max(w, 1);
    const wave = Math.sin(normalizedX * 5.2 + phaseTime * 0.35 + band * 0.78) * (20 + band * 3);
    const noise = fbm(normalizedX * 2.2 + phaseTime * 0.045, band * 1.6 + phaseTime * 0.022, 3) * 52;
    const pointer = Math.exp(-Math.pow(normalizedX - mx, 2) * 9) * (my - 0.5) * 32;
    const scrollShear = scrollVelocity * (normalizedX - 0.5) * 18;
    points.push([x, baseY + wave + noise + pointer + scrollShear]);
  }

  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.lineTo(w + 8, h * 0.78);
  ctx.lineTo(-8, h * 0.72);
  ctx.closePath();

  const fill = ctx.createLinearGradient(0, baseY - 36, 0, h * 0.74);
  fill.addColorStop(0, `hsla(${hue}, 86%, 68%, ${0.13 - band * 0.009 + (active ? 0.025 : 0)})`);
  fill.addColorStop(0.18, `hsla(${hue + 10}, 78%, 53%, ${0.095 - band * 0.006 + (active ? 0.018 : 0)})`);
  fill.addColorStop(0.6, `hsla(${hue + 24}, 70%, 37%, 0.022)`);
  fill.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = `hsla(${hue}, 92%, 78%, ${0.24 - band * 0.015 + (active ? 0.08 : 0)})`;
  ctx.lineWidth = 1.2 + (band % 2) * 0.5 + (active ? 0.35 : 0);
  ctx.shadowColor = `hsla(${hue}, 90%, 65%, 0.32)`;
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function bandForSection(section: string | null): number | null {
  switch (section) {
    case "summary":
      return 0;
    case "proof":
      return 1;
    case "testimonials":
    case "experience":
      return 2;
    case "projects":
      return 3;
    case "education":
      return 4;
    case "skills":
    case "certifications":
      return 5;
    default:
      return null;
  }
}

export const renderAurora: ThemeRenderer = (ctx, w, h, t, mx, my, _deltaSeconds, motion) => {
  const pageMotion = resolveThemeMotion(motion);
  const velocity = finiteClamp(pageMotion.scrollVelocity / 3, -1, 1);
  const activeBand = bandForSection(pageMotion.activeSection);
  const targetX = pageMotion.hasFocus ? mx * 0.25 + pageMotion.focusX * 0.75 : mx;
  const targetY = pageMotion.hasFocus ? my * 0.25 + pageMotion.focusY * 0.75 : my;
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#030A1A");
  sky.addColorStop(0.52, "#071329");
  sky.addColorStop(0.76, "#071724");
  sky.addColorStop(1, "#02070D");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const horizonX = w * (0.72 - pageMotion.scrollProgress * 0.12);
  const horizon = ctx.createRadialGradient(horizonX, h * 0.38, 0, horizonX, h * 0.4, w * 0.68);
  horizon.addColorStop(0, "rgba(47, 202, 185, 0.12)");
  horizon.addColorStop(0.5, "rgba(60, 100, 205, 0.06)");
  horizon.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = horizon;
  ctx.fillRect(0, 0, w, h);

  if (pageMotion.hasFocus) {
    const focusX = pageMotion.focusX * w;
    const focusY = pageMotion.focusY * h;
    const focusGlow = ctx.createRadialGradient(
      focusX,
      focusY,
      0,
      focusX,
      focusY,
      Math.max(w, h) * 0.24,
    );
    focusGlow.addColorStop(
      0,
      `rgba(104, 245, 221, ${0.08 + pageMotion.interactionImpulse * 0.14})`,
    );
    focusGlow.addColorStop(1, "rgba(54, 142, 218, 0)");
    ctx.fillStyle = focusGlow;
    ctx.fillRect(0, 0, w, h);
  }

  for (let i = 0; i < 88; i += 1) {
    const seed = i * 0.679 + 0.17;
    const x = (Math.sin(seed * 5.7) * 0.5 + 0.5) * w;
    const y = (Math.cos(seed * 4.1) * 0.5 + 0.5) * h * 0.68;
    const twinkle = 0.5 + 0.5 * Math.sin(t * (0.7 + (i % 4) * 0.15) + seed * 10);
    const size = 0.45 + (i % 5 === 0 ? 0.8 : 0.15);
    ctx.beginPath();
    ctx.arc(x, y, size, 0, TAU);
    ctx.fillStyle = `rgba(218, 242, 255, ${0.04 + twinkle * 0.16})`;
    ctx.fill();
  }

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let band = 0; band < 6; band += 1) {
    drawAuroraRibbon(
      ctx,
      w,
      h,
      t,
      band,
      targetX,
      targetY,
      pageMotion.scrollProgress,
      velocity,
      band === activeBand,
    );
  }
  ctx.restore();

  const waterY = h * 0.76;
  const water = ctx.createLinearGradient(0, waterY, 0, h);
  water.addColorStop(0, "rgba(5, 18, 30, 0.2)");
  water.addColorStop(1, "rgba(1, 5, 9, 0.92)");
  ctx.fillStyle = water;
  ctx.fillRect(0, waterY, w, h - waterY);

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 28; i += 1) {
    const seed = i * 0.93 + 0.2;
    const x = (Math.sin(seed * 3.8) * 0.5 + 0.5) * w;
    const y = waterY + (Math.cos(seed * 5.1) * 0.5 + 0.5) * (h - waterY);
    const width = w * (0.012 + (i % 4) * 0.01);
    const alpha = 0.03 + (0.5 + 0.5 * Math.sin(t * 0.9 + seed * 8)) * 0.08;
    const hue = 158 + (i % 5) * 22;
    const reflection = ctx.createLinearGradient(x - width, 0, x + width, 0);
    reflection.addColorStop(0, `hsla(${hue}, 80%, 68%, 0)`);
    reflection.addColorStop(0.5, `hsla(${hue}, 80%, 68%, ${alpha})`);
    reflection.addColorStop(1, `hsla(${hue}, 80%, 68%, 0)`);
    ctx.fillStyle = reflection;
    ctx.fillRect(x - width, y, width * 2, 1);
  }
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(0, waterY + 1);
  ctx.lineTo(w, waterY + 1);
  ctx.strokeStyle = "rgba(142, 231, 224, 0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();
};
