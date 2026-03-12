import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

function drawTriangle(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number) {
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size);
  ctx.lineTo(x + Math.cos(angle + 2.4) * size * 0.7, y + Math.sin(angle + 2.4) * size * 0.7);
  ctx.lineTo(x + Math.cos(angle - 2.4) * size * 0.7, y + Math.sin(angle - 2.4) * size * 0.7);
  ctx.closePath();
}

export const renderMeridian: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const background = ctx.createLinearGradient(0, 0, 0, h);
  background.addColorStop(0, "#09111D");
  background.addColorStop(0.58, "#081018");
  background.addColorStop(1, "#04070B");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.5;
  const cy = h * (0.52 + (my - 0.5) * 0.04);
  const minSide = Math.min(w, h);
  const northAngle = -Math.PI / 2 + (mx - 0.5) * 0.42 + Math.sin(t * 0.2) * 0.14;

  for (let i = 0; i < 16; i += 1) {
    const angle = northAngle + (i / 16) * TAU;
    const inner = minSide * (i % 2 === 0 ? 0.08 : 0.14);
    const outer = minSide * (i % 2 === 0 ? 0.34 : 0.28);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.strokeStyle = `rgba(176, 214, 255, ${i % 2 === 0 ? 0.22 : 0.12})`;
    ctx.lineWidth = i % 2 === 0 ? 1.3 : 0.8;
    ctx.stroke();
  }

  for (let ring = 0; ring < 4; ring += 1) {
    const radius = minSide * (0.14 + ring * 0.07);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, TAU);
    ctx.strokeStyle = `rgba(120, 180, 255, ${0.12 - ring * 0.018})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  for (let i = 0; i < 3; i += 1) {
    const start = northAngle + i * 1.6 + t * 0.12;
    const end = start + 0.58;
    ctx.beginPath();
    ctx.arc(cx, cy, minSide * (0.22 + i * 0.06), start, end);
    ctx.strokeStyle = `rgba(${120 + i * 20}, ${190 + i * 8}, 255, ${0.12 - i * 0.02})`;
    ctx.lineWidth = 3 - i * 0.4;
    ctx.stroke();
  }

  drawTriangle(ctx, cx + Math.cos(northAngle) * minSide * 0.36, cy + Math.sin(northAngle) * minSide * 0.36, northAngle, 14);
  ctx.fillStyle = "rgba(230, 242, 255, 0.72)";
  ctx.fill();

  for (let i = 0; i < 24; i += 1) {
    const angle = northAngle + i * 0.31 + t * 0.18;
    const radius = minSide * (0.1 + (i % 5) * 0.05);
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, TAU);
    ctx.fillStyle = `rgba(154, 209, 255, ${0.12 + (i % 3) * 0.04})`;
    ctx.fill();
  }
};
