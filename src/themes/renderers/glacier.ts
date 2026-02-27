import type { ThemeRenderer } from "../types";

export const renderGlacier: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  // Ambient mist
  const mist = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.5, w * 0.6);
  mist.addColorStop(0, `hsla(205, 60%, 55%, ${0.04 + Math.sin(t * 0.2) * 0.01})`);
  mist.addColorStop(0.5, "hsla(210, 50%, 40%, 0.02)");
  mist.addColorStop(1, "transparent");
  ctx.fillStyle = mist;
  ctx.fillRect(0, 0, w, h);

  // Ice crystals (hexagons)
  for (let i = 0; i < 8; i += 1) {
    const seed = i * 107.3;
    const cx = (Math.sin(seed * 1.3 + t * 0.02) * 0.4 + 0.5) * w;
    const cy = (Math.cos(seed * 0.9 + t * 0.015) * 0.4 + 0.5) * h;
    const size = 20 + Math.sin(seed) * 12;
    const rot = t * 0.05 + seed;

    // Mouse push
    const dx = cx - mx * w;
    const dy = cy - my * h;
    const dist = Math.hypot(dx, dy);
    const push = dist < 120 ? (1 - dist / 120) * 25 : 0;
    const px = cx + (dist > 0 ? (dx / dist) * push : 0);
    const py = cy + (dist > 0 ? (dy / dist) * push : 0);

    // Glow behind crystal
    const glow = ctx.createRadialGradient(px, py, 0, px, py, size * 3);
    glow.addColorStop(0, `hsla(205, 70%, 70%, 0.04)`);
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(px, py, size * 3, 0, Math.PI * 2);
    ctx.fill();

    // Hexagon outline
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    ctx.beginPath();
    for (let v = 0; v < 6; v += 1) {
      const angle = (Math.PI / 3) * v - Math.PI / 6;
      const vx = Math.cos(angle) * size;
      const vy = Math.sin(angle) * size;
      if (v === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    const alpha = 0.08 + Math.sin(t * 0.3 + seed) * 0.03;
    ctx.strokeStyle = `hsla(200, 65%, 75%, ${alpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Inner spokes
    for (let v = 0; v < 6; v += 1) {
      const angle = (Math.PI / 3) * v - Math.PI / 6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * size * 0.6, Math.sin(angle) * size * 0.6);
      ctx.strokeStyle = `hsla(205, 60%, 80%, ${alpha * 0.5})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Frost particles
  for (let i = 0; i < 25; i += 1) {
    const seed = i * 67.9;
    const wind = (mx - 0.5) * 15 + Math.sin(t * 0.25 + seed) * 10;
    const x = ((Math.sin(seed * 2.3) * 0.5 + 0.5) * w + wind + Math.sin(t * 0.15 + i) * 8) % w;
    const fallSpeed = 0.1 + (i % 5) * 0.04;
    const cycle = (t * 6 * fallSpeed + seed * 4) % (h * 1.3);
    const y = cycle - h * 0.15;
    const life = Math.min(1, Math.max(0, 1 - Math.abs(y - h * 0.5) / (h * 0.6)));
    const size = 1 + Math.sin(seed) * 0.5;

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(205, 70%, 85%, ${life * 0.25})`;
    ctx.fill();

    // Shimmer glow
    ctx.beginPath();
    ctx.arc(x, y, size * 4, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(200, 60%, 75%, ${life * 0.03})`;
    ctx.fill();
  }
};
