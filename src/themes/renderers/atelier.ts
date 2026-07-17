import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

const PALETTE = [
  [247, 139, 103],
  [95, 182, 234],
  [241, 199, 102],
  [219, 116, 172],
  [105, 205, 179],
] as const;

function drawBrushStroke(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  index: number,
  t: number,
  mx: number,
  my: number,
) {
  const [r, g, b] = PALETTE[index % PALETTE.length];
  const seed = index * 0.91 + 0.24;
  const startX = w * (0.36 + (index % 2) * 0.06);
  const startY = h * (0.08 + index * 0.125) + Math.sin(t * 0.18 + seed) * 20;
  const endX = w * 1.08;
  const endY = h * (0.24 + index * 0.105) + Math.cos(t * 0.14 + seed) * 24;
  const controlX1 = w * (0.5 + (mx - 0.5) * 0.12);
  const controlY1 = h * (0.04 + index * 0.14) + (my - 0.5) * 42;
  const controlX2 = w * (0.76 - (mx - 0.5) * 0.08);
  const controlY2 = h * (0.38 + index * 0.07) - (my - 0.5) * 38;
  const width = 24 + index * 7;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.bezierCurveTo(controlX1, controlY1, controlX2, controlY2, endX, endY);
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.26 - index * 0.018})`;
  ctx.lineWidth = width;
  ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.2)`;
  ctx.shadowBlur = 20;
  ctx.stroke();
  ctx.shadowBlur = 0;

  for (let bristle = 0; bristle < 5; bristle += 1) {
    const offset = (bristle - 2) * width * 0.13;
    ctx.beginPath();
    ctx.moveTo(startX, startY + offset);
    ctx.bezierCurveTo(controlX1, controlY1 + offset, controlX2, controlY2 - offset * 0.6, endX, endY - offset * 0.3);
    ctx.strokeStyle = `rgba(255, 246, 235, ${0.026 + (bristle % 2) * 0.012})`;
    ctx.lineWidth = 1 + (bristle % 2);
    ctx.stroke();
  }
  ctx.restore();
}

export const renderAtelier: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const background = ctx.createLinearGradient(0, 0, w, h);
  background.addColorStop(0, "#100A14");
  background.addColorStop(0.48, "#0D111C");
  background.addColorStop(1, "#05070B");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const paperGlow = ctx.createRadialGradient(w * 0.78, h * 0.3, 0, w * 0.78, h * 0.3, Math.max(w, h) * 0.62);
  paperGlow.addColorStop(0, "rgba(255, 221, 202, 0.1)");
  paperGlow.addColorStop(0.5, "rgba(136, 100, 153, 0.045)");
  paperGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = paperGlow;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(235, 222, 215, 0.035)";
  ctx.lineWidth = 1;
  for (let x = w * 0.45; x < w; x += Math.max(32, w * 0.055)) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += Math.max(32, h * 0.075)) {
    ctx.beginPath();
    ctx.moveTo(w * 0.4, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 6; i += 1) {
    drawBrushStroke(ctx, w, h, i, t, mx, my);
  }
  ctx.restore();

  const blocks = [
    [0.69, 0.18, 0],
    [0.86, 0.34, 2],
    [0.62, 0.68, 4],
    [0.9, 0.77, 3],
  ] as const;
  blocks.forEach(([px, py, colorIndex], index) => {
    const [r, g, b] = PALETTE[colorIndex];
    const x = w * px + Math.sin(t * 0.12 + index) * 6;
    const y = h * py + Math.cos(t * 0.1 + index) * 6;
    const radius = Math.min(w, h) * (0.055 + index * 0.008);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(index * 0.47 + Math.sin(t * 0.08 + index) * 0.08);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.075 + index * 0.012})`;
    ctx.fillRect(-radius, -radius * 0.58, radius * 2, radius * 1.16);
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.2)`;
    ctx.lineWidth = 1;
    ctx.strokeRect(-radius, -radius * 0.58, radius * 2, radius * 1.16);
    ctx.restore();
  });

  for (let i = 0; i < 72; i += 1) {
    const seed = i * 0.587 + 0.14;
    const progress = (t * (0.012 + (i % 4) * 0.003) + seed * 0.18) % 1;
    const x = w * (0.4 + (Math.sin(seed * 4.2) * 0.5 + 0.5) * 0.62);
    const y = h * 0.95 - progress * h * 0.9 + Math.cos(seed * 5.1) * 9;
    const [r, g, b] = PALETTE[i % PALETTE.length];
    ctx.beginPath();
    ctx.arc(x, y, 0.6 + (i % 4) * 0.35, 0, TAU);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(1 - progress) * 0.13})`;
    ctx.fill();
  }

  const clearSpace = ctx.createLinearGradient(0, 0, w * 0.52, 0);
  clearSpace.addColorStop(0, "rgba(5, 5, 10, 0.34)");
  clearSpace.addColorStop(1, "rgba(5, 5, 10, 0)");
  ctx.fillStyle = clearSpace;
  ctx.fillRect(0, 0, w * 0.58, h);
};
