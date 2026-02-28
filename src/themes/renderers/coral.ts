import type { ThemeRenderer } from "../types";

/** Underwater coral reef with swaying tendrils and bubbles */
export const renderCoral: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  // Deep water gradient
  const water = ctx.createLinearGradient(0, 0, 0, h);
  water.addColorStop(0, `hsla(210, 60%, 8%, ${0.06 + Math.sin(t * 0.2) * 0.02})`);
  water.addColorStop(1, `hsla(190, 50%, 5%, ${0.08 + Math.sin(t * 0.3) * 0.02})`);
  ctx.fillStyle = water;
  ctx.fillRect(0, 0, w, h);

  // Caustic light patterns on top
  for (let i = 0; i < 8; i++) {
    const cx = w * (0.1 + i * 0.12) + Math.sin(t * 0.4 + i * 2.1) * 50 + (mx - 0.5) * 30;
    const cy = h * 0.15 + Math.cos(t * 0.3 + i * 1.7) * 30 + (my - 0.5) * 20;
    const r = 60 + Math.sin(t * 0.5 + i) * 20;
    const caustic = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    caustic.addColorStop(0, `hsla(180, 50%, 40%, ${0.04 + Math.sin(t * 0.6 + i) * 0.02})`);
    caustic.addColorStop(1, "transparent");
    ctx.fillStyle = caustic;
    ctx.fillRect(0, 0, w, h);
  }

  // Coral tendrils growing from bottom
  for (let i = 0; i < 12; i++) {
    const seed = i * 63.7;
    const baseX = (i + 0.5) * (w / 12) + Math.sin(seed) * 20;
    const hue = 340 + Math.sin(seed * 0.7) * 30;
    const segments = 8 + Math.floor(Math.sin(seed * 1.3) * 3);

    ctx.beginPath();
    ctx.moveTo(baseX, h);

    let px = baseX;
    let py = h;
    for (let s = 0; s < segments; s++) {
      const sway = Math.sin(t * 0.8 + s * 0.6 + seed) * (8 + s * 2);
      const windSway = (mx - 0.5) * (s * 3);
      px += sway + windSway;
      py -= (h * 0.06);
      ctx.lineTo(px, py);
    }

    ctx.strokeStyle = `hsla(${hue}, 60%, 45%, ${0.25 + Math.sin(t * 0.4 + seed) * 0.08})`;
    ctx.lineWidth = 3 - (1.5 * (1 - 1));
    ctx.stroke();

    // Coral tip glow
    ctx.beginPath();
    ctx.arc(px, py, 4 + Math.sin(t + seed) * 2, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${0.3 + Math.sin(t * 1.2 + seed) * 0.15})`;
    ctx.fill();
  }

  // Floating bubbles
  for (let i = 0; i < 25; i++) {
    const seed = i * 83.1;
    const speed = 0.3 + (i % 5) * 0.1;
    const x = ((Math.sin(seed * 1.5) * 0.5 + 0.5) * w + Math.sin(t * 0.4 + seed) * 15);
    const cycle = (t * 20 * speed + seed * 10) % (h * 1.3);
    const y = h + 20 - cycle;
    const size = 2 + Math.sin(seed * 0.6) * 1.5;
    const life = Math.max(0, Math.min(1, 1 - cycle / (h * 1.3)));

    if (life <= 0) continue;

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(190, 60%, 70%, ${life * 0.35})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Bubble highlight
    ctx.beginPath();
    ctx.arc(x - size * 0.3, y - size * 0.3, size * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(190, 70%, 80%, ${life * 0.3})`;
    ctx.fill();
  }
};
