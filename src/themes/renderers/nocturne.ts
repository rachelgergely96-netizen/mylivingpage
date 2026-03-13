import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

export const renderNocturne: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#0A1022");
  sky.addColorStop(0.52, "#090E1A");
  sky.addColorStop(1, "#04050A");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const moonX = w * (0.72 + (mx - 0.5) * 0.08);
  const moonY = h * (0.22 + (my - 0.5) * 0.05);
  const moonR = Math.min(w, h) * 0.12;

  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, TAU);
  ctx.fillStyle = "rgba(240,244,255,0.62)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(moonX + moonR * 0.34, moonY - moonR * 0.14, moonR * 0.92, 0, TAU);
  ctx.fillStyle = "#0A1022";
  ctx.fill();

  for (let i = 0; i < 4; i += 1) {
    const y = h * (0.26 + i * 0.16) + Math.sin(t * 0.12 + i) * 12;
    ctx.beginPath();
    ctx.moveTo(-20, y);
    ctx.bezierCurveTo(w * 0.18, y - 28, w * 0.44, y + 24, w * 0.66, y - 10);
    ctx.bezierCurveTo(w * 0.82, y - 22, w * 0.94, y + 8, w + 20, y - 14);
    ctx.lineTo(w + 20, h + 20);
    ctx.lineTo(-20, h + 20);
    ctx.closePath();
    ctx.fillStyle = `rgba(${18 + i * 6},${22 + i * 4},${34 + i * 6},${0.22 - i * 0.035})`;
    ctx.fill();
  }

  for (let i = 0; i < 70; i += 1) {
    const seed = i * 0.61;
    const x = (Math.sin(seed * 4.3) * 0.5 + 0.5) * w;
    const y = (Math.cos(seed * 3.8) * 0.5 + 0.5) * h * 0.7;
    const alpha = 0.04 + (0.5 + 0.5 * Math.sin(t * 1.3 + seed * 7)) * 0.12;
    ctx.beginPath();
    ctx.arc(x, y, 1 + (i % 3) * 0.3, 0, TAU);
    ctx.fillStyle = `rgba(214,226,255,${alpha})`;
    ctx.fill();
  }
};
