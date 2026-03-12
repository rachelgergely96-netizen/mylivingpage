import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

export const renderOpaline: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const background = ctx.createLinearGradient(0, 0, 0, h);
  background.addColorStop(0, "#0C1022");
  background.addColorStop(0.48, "#0A1020");
  background.addColorStop(1, "#060813");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const pointerX = mx * w;
  const pointerY = my * h;
  const minSide = Math.min(w, h);

  for (let i = 0; i < 11; i += 1) {
    const seed = i * 0.81 + 0.4;
    const baseX = (Math.sin(seed * 4.2) * 0.5 + 0.5) * w;
    const baseY = (Math.cos(seed * 3.1) * 0.5 + 0.5) * h;
    const radius = minSide * (0.07 + (Math.sin(seed * 5.4) * 0.5 + 0.5) * 0.08);
    const x = baseX + Math.sin(t * (0.18 + (i % 3) * 0.03) + seed) * 18;
    const y = baseY + Math.cos(t * (0.14 + (i % 4) * 0.02) + seed) * 14;
    const dist = Math.hypot(x - pointerX, y - pointerY);
    const interaction = dist < radius * 2.4 ? 1 - dist / (radius * 2.4) : 0;

    const orb = ctx.createRadialGradient(
      x - radius * 0.18,
      y - radius * 0.22,
      radius * 0.1,
      x,
      y,
      radius,
    );
    orb.addColorStop(0, `rgba(255, 248, 246, ${0.36 + interaction * 0.12})`);
    orb.addColorStop(0.35, `rgba(219, 221, 255, ${0.2 + interaction * 0.08})`);
    orb.addColorStop(0.7, `rgba(196, 234, 255, ${0.12 + interaction * 0.07})`);
    orb.addColorStop(1, "rgba(255, 198, 228, 0.02)");
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fillStyle = orb;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, radius * (0.7 + interaction * 0.08), seed, seed + Math.PI * 1.4);
    ctx.strokeStyle = `rgba(148, 228, 255, ${0.14 + interaction * 0.14})`;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, radius * 0.54, seed + 1.6, seed + 2.9);
    ctx.strokeStyle = `rgba(255, 194, 226, ${0.12 + interaction * 0.14})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  for (let i = 0; i < 38; i += 1) {
    const seed = i * 0.61 + 0.2;
    const x = (Math.sin(seed * 3.7) * 0.5 + 0.5) * w + Math.sin(t * 0.22 + seed) * 10;
    const y = (Math.cos(seed * 4.4) * 0.5 + 0.5) * h + Math.cos(t * 0.18 + seed) * 8;
    const size = 3 + (Math.sin(seed * 8.3) * 0.5 + 0.5) * 4;
    const alpha = 0.03 + (0.5 + 0.5 * Math.sin(t * 1.4 + seed * 7)) * 0.09;

    ctx.strokeStyle = `rgba(255, 249, 243, ${alpha})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x + size, y);
    ctx.moveTo(x, y - size);
    ctx.lineTo(x, y + size);
    ctx.stroke();
  }

  const pointerGlow = ctx.createRadialGradient(pointerX, pointerY, 0, pointerX, pointerY, minSide * 0.22);
  pointerGlow.addColorStop(0, "rgba(204, 242, 255, 0.14)");
  pointerGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = pointerGlow;
  ctx.fillRect(0, 0, w, h);
};
