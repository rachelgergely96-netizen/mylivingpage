import type { ThemeRenderer } from "../types";

/** Ink drops spreading through water with blooming organic shapes */
export const renderInk: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  // Ink blooms
  for (let i = 0; i < 7; i++) {
    const seed = i * 127.3;
    const baseX = (Math.sin(seed * 1.1) * 0.5 + 0.5) * w;
    const baseY = (Math.cos(seed * 0.9) * 0.5 + 0.5) * h;
    const drift = t * 3 + seed;
    const x = baseX + Math.sin(drift * 0.15) * 40 + (mx - 0.5) * 25;
    const y = baseY + Math.cos(drift * 0.12) * 30 + (my - 0.5) * 25;

    // Main bloom
    const radius = 50 + Math.sin(t * 0.3 + seed) * 20 + Math.sin(t * 0.7 + i) * 10;
    const hue = 220 + Math.sin(seed * 0.3) * 40;

    const bloom = ctx.createRadialGradient(x, y, 0, x, y, radius);
    bloom.addColorStop(0, `hsla(${hue}, 40%, 20%, ${0.08 + Math.sin(t * 0.5 + seed) * 0.03})`);
    bloom.addColorStop(0.4, `hsla(${hue + 15}, 35%, 15%, ${0.05 + Math.sin(t * 0.3 + seed) * 0.02})`);
    bloom.addColorStop(1, "transparent");
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, w, h);

    // Tendrils reaching out
    for (let t2 = 0; t2 < 5; t2++) {
      const tAngle = (t2 / 5) * Math.PI * 2 + t * 0.1 + seed;
      const tLen = radius * (0.8 + Math.sin(t * 0.4 + t2 + seed) * 0.3);
      const tx = x + Math.cos(tAngle) * tLen;
      const ty = y + Math.sin(tAngle) * tLen;

      ctx.beginPath();
      ctx.moveTo(x, y);

      const cpx = (x + tx) / 2 + Math.sin(t * 0.6 + t2 * 2 + seed) * 25;
      const cpy = (y + ty) / 2 + Math.cos(t * 0.5 + t2 * 1.5 + seed) * 25;
      ctx.quadraticCurveTo(cpx, cpy, tx, ty);

      ctx.strokeStyle = `hsla(${hue}, 35%, 25%, ${0.06 + Math.sin(t * 0.4 + t2) * 0.02})`;
      ctx.lineWidth = 2 + Math.sin(t * 0.3 + t2) * 1;
      ctx.stroke();
    }
  }

  // Floating ink particles
  for (let i = 0; i < 40; i++) {
    const seed = i * 57.9;
    const x = ((Math.sin(seed * 1.5 + t * 0.08) * 0.5 + 0.5) * w);
    const y = ((Math.cos(seed * 1.2 + t * 0.06) * 0.5 + 0.5) * h);
    const size = 1 + Math.sin(seed) * 0.8;
    const pulse = 0.3 + Math.sin(t * 1.8 + seed) * 0.25;
    const hue = 230 + Math.sin(seed * 0.6) * 30;

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 30%, 50%, ${pulse * 0.5})`;
    ctx.fill();
  }

  // Paper texture overlay - fine dots
  for (let i = 0; i < 30; i++) {
    const seed = i * 199.1;
    const x = (Math.sin(seed * 3.7) * 0.5 + 0.5) * w;
    const y = (Math.cos(seed * 2.9) * 0.5 + 0.5) * h;
    ctx.beginPath();
    ctx.arc(x, y, 0.5, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(0, 0%, 100%, ${0.02 + Math.sin(t * 0.5 + seed) * 0.01})`;
    ctx.fill();
  }
};
