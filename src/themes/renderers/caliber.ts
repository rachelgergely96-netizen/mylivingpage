import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

export const renderCaliber: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const background = ctx.createLinearGradient(0, 0, 0, h);
  background.addColorStop(0, "#090E1B");
  background.addColorStop(0.55, "#080C15");
  background.addColorStop(1, "#03050A");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.5;
  const cy = h * (0.52 + (my - 0.5) * 0.05);
  const minSide = Math.min(w, h);
  const sweepAngle = t * 0.72 + mx * TAU;

  for (let ring = 0; ring < 5; ring += 1) {
    const radius = minSide * (0.12 + ring * 0.06);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, TAU);
    ctx.strokeStyle = `rgba(132, 190, 255, ${0.08 - ring * 0.01})`;
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }

  for (let tick = 0; tick < 72; tick += 1) {
    const angle = (tick / 72) * TAU + sweepAngle * 0.08;
    const outer = minSide * 0.37;
    const inner = outer - (tick % 6 === 0 ? 16 : 8);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.strokeStyle = `rgba(205, 227, 255, ${tick % 6 === 0 ? 0.2 : 0.08})`;
    ctx.lineWidth = tick % 6 === 0 ? 1.2 : 0.8;
    ctx.stroke();
  }

  for (let i = 0; i < 4; i += 1) {
    const start = sweepAngle + i * 1.3;
    const end = start + 0.42 + i * 0.06;
    ctx.beginPath();
    ctx.arc(cx, cy, minSide * (0.18 + i * 0.05), start, end);
    ctx.strokeStyle = `rgba(${112 + i * 18}, ${178 + i * 10}, 255, ${0.12 - i * 0.02})`;
    ctx.lineWidth = 4 - i * 0.5;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(sweepAngle) * minSide * 0.34, cy + Math.sin(sweepAngle) * minSide * 0.34);
  ctx.strokeStyle = "rgba(244, 249, 255, 0.4)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, TAU);
  ctx.fillStyle = "rgba(233, 244, 255, 0.75)";
  ctx.fill();

  for (let i = 0; i < 18; i += 1) {
    const angle = t * (0.18 + (i % 5) * 0.02) + i * 0.7;
    const radius = minSide * (0.14 + (i % 4) * 0.07);
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, TAU);
    ctx.fillStyle = `rgba(161, 210, 255, ${0.16 + (i % 3) * 0.05})`;
    ctx.fill();
  }
};
