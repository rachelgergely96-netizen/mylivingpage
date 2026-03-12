import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

export const renderAtelier: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const background = ctx.createLinearGradient(0, 0, w, h);
  background.addColorStop(0, "#120D16");
  background.addColorStop(0.45, "#0E111C");
  background.addColorStop(1, "#06070B");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const palette = [
    [245, 152, 120],
    [121, 193, 244],
    [245, 210, 128],
    [232, 145, 191],
    [145, 214, 195],
  ];

  for (let i = 0; i < 6; i += 1) {
    const seed = i * 0.88 + 0.2;
    const startX = -w * 0.08;
    const startY = h * (0.12 + i * 0.12) + Math.sin(t * 0.24 + seed) * 28;
    const endX = w * 1.08;
    const endY = h * (0.2 + i * 0.11) + Math.cos(t * 0.18 + seed) * 24;
    const controlX1 = w * (0.24 + (Math.sin(seed * 3.1) * 0.5 + 0.5) * 0.14) + (mx - 0.5) * 80;
    const controlY1 = h * (0.08 + i * 0.1) + (my - 0.5) * 60;
    const controlX2 = w * (0.68 + (Math.cos(seed * 4.2) * 0.5 + 0.5) * 0.12) - (mx - 0.5) * 80;
    const controlY2 = h * (0.34 + i * 0.08) - (my - 0.5) * 50;
    const [r, g, b] = palette[i % palette.length];

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(controlX1, controlY1, controlX2, controlY2, endX, endY);
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.18 - i * 0.01})`;
    ctx.lineWidth = 18 + i * 4;
    ctx.lineCap = "round";
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(startX, startY + 4);
    ctx.bezierCurveTo(controlX1, controlY1 + 8, controlX2, controlY2 - 8, endX, endY - 4);
    ctx.strokeStyle = `rgba(255, 246, 235, ${0.04 + i * 0.01})`;
    ctx.lineWidth = 4 + i;
    ctx.stroke();
  }

  for (let i = 0; i < 46; i += 1) {
    const seed = i * 0.59 + 0.1;
    const progress = (t * (0.05 + (i % 4) * 0.01) + seed * 0.2) % 1;
    const x = (Math.sin(seed * 3.8) * 0.5 + 0.5) * w + Math.sin(t * 0.2 + seed) * 10;
    const y = h * 0.9 - progress * h * 0.86 + Math.cos(seed * 4.1) * 10;
    const radius = 1 + (1 - progress) * 1.6;
    const alpha = (1 - progress) * 0.12;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fillStyle = `rgba(255, 220, 196, ${alpha})`;
    ctx.fill();
  }

  const glow = ctx.createRadialGradient(mx * w, my * h, 0, mx * w, my * h, Math.min(w, h) * 0.26);
  glow.addColorStop(0, "rgba(255, 230, 210, 0.12)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
};
