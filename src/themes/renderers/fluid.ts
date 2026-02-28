import { fbm } from "../shared/noise";
import type { ThemeRenderer } from "../types";

/** Noise-driven flow field with trailing particles that carve luminous rivers through a deep ocean canvas */
export const renderFluid: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const bg = ctx.createRadialGradient(
    w * (0.3 + Math.sin(t * 0.1) * 0.1),
    h * (0.4 + Math.cos(t * 0.08) * 0.1),
    0,
    w * 0.5,
    h * 0.5,
    w * 0.8,
  );
  bg.addColorStop(0, "rgba(10, 40, 60, 0.15)");
  bg.addColorStop(1, "transparent");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const resolution = 0.006;

  // Flow paths with slight color variety
  for (let i = 0; i < 35; i++) {
    ctx.beginPath();
    let px = (i * 37.7 + t * 5) % w;
    let py = (i * 53.1 + t * 3) % h;
    ctx.moveTo(px, py);

    for (let step = 0; step < 60; step++) {
      const n = fbm(px * resolution + t * 0.05, py * resolution + t * 0.03, 3);
      const angle = n * Math.PI * 3;
      const mdx = mx * w - px;
      const mdy = my * h - py;
      const md = Math.sqrt(mdx * mdx + mdy * mdy);
      const mouseAngle = md < 150 ? Math.atan2(mdy, mdx) * (1 - md / 150) * 0.3 : 0;

      px += Math.cos(angle + mouseAngle) * 4;
      py += Math.sin(angle + mouseAngle) * 4;
      ctx.lineTo(px, py);
    }

    // Every 5th path gets a teal-green tint
    const isVariant = i % 5 === 0;
    const hue = isVariant ? (165 + (i % 8) * 3) : (195 + (i % 8) * 5 - 15);
    const alpha = 0.04 + Math.sin(t * 0.3 + i * 0.5) * 0.02;
    ctx.strokeStyle = `hsla(${hue}, 75%, 55%, ${alpha})`;
    ctx.lineWidth = 1.5 + Math.sin(i) * 0.8;
    ctx.stroke();
  }

  // Bubble/froth particles following the flow field
  for (let i = 0; i < 20; i++) {
    const seed = i * 79.3;
    let bx = (Math.sin(seed * 2.1) * 0.5 + 0.5) * w;
    let by = (Math.cos(seed * 1.7) * 0.5 + 0.5) * h;
    const n = fbm(bx * resolution + t * 0.05, by * resolution + t * 0.03, 2);
    const angle = n * Math.PI * 3;
    bx += Math.cos(angle) * (10 + Math.sin(t * 0.4 + seed) * 5);
    by += Math.sin(angle) * (10 + Math.cos(t * 0.3 + seed) * 5);

    const size = 1 + Math.sin(seed * 0.6) * 0.5;
    const alpha = 0.08 + Math.sin(t * 1 + seed) * 0.04;
    ctx.beginPath();
    ctx.arc(bx, by, size, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(195, 60%, 65%, ${alpha})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Orb glows
  for (let i = 0; i < 10; i++) {
    const ox = (Math.sin(t * 0.12 + i * 1.8) * 0.4 + 0.5) * w;
    const oy = (Math.cos(t * 0.1 + i * 1.4) * 0.4 + 0.5) * h;
    const or = 6 + Math.sin(t * 0.4 + i) * 3;
    const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, or * 6);
    g.addColorStop(0, `hsla(${195 + i * 10}, 80%, 60%, 0.15)`);
    g.addColorStop(0.5, `hsla(${195 + i * 10}, 70%, 50%, 0.04)`);
    g.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(ox, oy, or * 6, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }
};
