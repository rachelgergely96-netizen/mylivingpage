import type { ThemeRenderer } from "../types";

export const renderSakura: ThemeRenderer = (ctx, w, h, t, mx) => {
  for (let i = 0; i < 6; i += 1) {
    const cx2 = (Math.sin(t * 0.04 + i * 3) * 0.4 + 0.5) * w;
    const cy2 = (Math.cos(t * 0.035 + i * 2.2) * 0.4 + 0.5) * h;
    const r = w * 0.15 + Math.sin(t * 0.15 + i) * w * 0.03;
    const hue = 335 + Math.sin(i * 0.8) * 15;

    const g = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, r);
    g.addColorStop(0, `hsla(${hue}, 50%, 55%, 0.04)`);
    g.addColorStop(0.6, `hsla(${hue}, 40%, 45%, 0.02)`);
    g.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(cx2, cy2, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }

  for (let i = 0; i < 30; i += 1) {
    const seed = i * 83.7;
    const fallSpeed = 0.15 + (i % 6) * 0.05;
    const windInfluence = (mx - 0.5) * 30 + Math.sin(t * 0.3 + seed) * 20;
    const x = ((Math.sin(seed * 2.1) * 0.5 + 0.5) * w + windInfluence + Math.sin(t * 0.2 + i) * 15) % w;
    const cycle = (t * 8 * fallSpeed + seed * 5) % (h * 1.4);
    const y = cycle - h * 0.2;
    const rotation = t * 0.5 + seed + Math.sin(t * 0.3 + i) * 0.5;
    const life = Math.min(1, Math.max(0, 1 - Math.abs(y - h * 0.5) / (h * 0.6)));
    const hue = 335 + Math.sin(seed * 0.3) * 20;
    const size = 3 + Math.sin(seed) * 1.5;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(1, 0.6 + Math.sin(t * 0.8 + i) * 0.3);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(size * 1.5, -size, 0, -size * 2.5);
    ctx.quadraticCurveTo(-size * 1.5, -size, 0, 0);
    ctx.fillStyle = `hsla(${hue}, 55%, 65%, ${life * 0.2})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, -size, size * 3, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 45%, 60%, ${life * 0.02})`;
    ctx.fill();
    ctx.restore();
  }

  const ambient = ctx.createRadialGradient(w * 0.5, h * 0.3, 0, w * 0.5, h * 0.5, w * 0.5);
  ambient.addColorStop(0, "hsla(15, 40%, 50%, 0.03)");
  ambient.addColorStop(1, "transparent");
  ctx.fillStyle = ambient;
  ctx.fillRect(0, 0, w, h);
};
