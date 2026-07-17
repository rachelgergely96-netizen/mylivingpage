import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

function drawRidge(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  baseline: number,
  amplitude: number,
  offset: number,
  color: string,
) {
  ctx.beginPath();
  ctx.moveTo(-20, h + 20);
  ctx.lineTo(-20, baseline);
  for (let x = -20; x <= w + 20; x += Math.max(16, w / 28)) {
    const normalized = x / Math.max(w, 1);
    const y = baseline - Math.abs(Math.sin(normalized * 8.1 + offset)) * amplitude - Math.sin(normalized * 19 + offset) * amplitude * 0.18;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w + 20, h + 20);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export const renderNocturne: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#060B1A");
  sky.addColorStop(0.52, "#0A1023");
  sky.addColorStop(0.78, "#080B15");
  sky.addColorStop(1, "#020307");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const moonX = w * (0.76 + (mx - 0.5) * 0.055);
  const moonY = h * (0.2 + (my - 0.5) * 0.035);
  const moonR = Math.min(w, h) * 0.115;
  const moonGlow = ctx.createRadialGradient(moonX, moonY, moonR * 0.5, moonX, moonY, moonR * 4.2);
  moonGlow.addColorStop(0, "rgba(213, 224, 255, 0.28)");
  moonGlow.addColorStop(0.34, "rgba(126, 148, 224, 0.1)");
  moonGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = moonGlow;
  ctx.fillRect(moonX - moonR * 4.2, moonY - moonR * 4.2, moonR * 8.4, moonR * 8.4);

  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, TAU);
  const moon = ctx.createRadialGradient(moonX - moonR * 0.35, moonY - moonR * 0.4, 0, moonX, moonY, moonR);
  moon.addColorStop(0, "rgba(255,255,255,0.96)");
  moon.addColorStop(0.62, "rgba(221,229,255,0.88)");
  moon.addColorStop(1, "rgba(143,158,211,0.72)");
  ctx.fillStyle = moon;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(moonX + moonR * 0.44, moonY - moonR * 0.12, moonR * 0.94, 0, TAU);
  ctx.fillStyle = "#070C1B";
  ctx.fill();

  const stars: Array<[number, number]> = [];
  for (let i = 0; i < 92; i += 1) {
    const seed = i * 0.697 + 0.11;
    const x = (Math.sin(seed * 5.4) * 0.5 + 0.5) * w;
    const y = (Math.cos(seed * 4.3) * 0.5 + 0.5) * h * 0.66;
    stars.push([x, y]);
    const pulse = 0.5 + 0.5 * Math.sin(t * (0.6 + (i % 5) * 0.13) + seed * 9);
    const radius = i % 13 === 0 ? 1.45 : 0.45 + (i % 3) * 0.22;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fillStyle = `rgba(220, 229, 255, ${0.045 + pulse * 0.2})`;
    ctx.fill();
  }

  ctx.beginPath();
  [5, 21, 38, 57, 73].forEach((index, pointIndex) => {
    const point = stars[index];
    if (!point) return;
    if (pointIndex === 0) ctx.moveTo(point[0], point[1]);
    else ctx.lineTo(point[0], point[1]);
  });
  ctx.strokeStyle = "rgba(181, 198, 255, 0.09)";
  ctx.lineWidth = 0.8;
  ctx.stroke();

  drawRidge(ctx, w, h, h * 0.7, h * 0.11, 0.2, "rgba(25, 30, 51, 0.76)");
  drawRidge(ctx, w, h, h * 0.79, h * 0.14, 1.7, "rgba(13, 17, 31, 0.9)");
  drawRidge(ctx, w, h, h * 0.9, h * 0.12, 3.1, "rgba(5, 7, 13, 0.98)");

  for (let layer = 0; layer < 4; layer += 1) {
    const y = h * (0.58 + layer * 0.1) + Math.sin(t * 0.12 + layer) * 9;
    const fog = ctx.createLinearGradient(0, y - 20, 0, y + 34);
    fog.addColorStop(0, "rgba(159, 177, 221, 0)");
    fog.addColorStop(0.52, `rgba(159, 177, 221, ${0.025 + layer * 0.009})`);
    fog.addColorStop(1, "rgba(159, 177, 221, 0)");
    ctx.fillStyle = fog;
    ctx.beginPath();
    ctx.moveTo(-20, y);
    ctx.bezierCurveTo(w * 0.22, y - 20, w * 0.48, y + 18, w * 0.7, y - 8);
    ctx.bezierCurveTo(w * 0.84, y - 20, w * 0.95, y + 10, w + 20, y - 6);
    ctx.lineTo(w + 20, y + 42);
    ctx.lineTo(-20, y + 42);
    ctx.closePath();
    ctx.fill();
  }
};
