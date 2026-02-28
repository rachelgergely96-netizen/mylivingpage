import { fbm } from "../shared/noise";
import type { ThemeRenderer } from "../types";

/** Ink drops spreading through water with blooming organic shapes */
export const renderInk: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  // Ink blooms with noise-distorted edges
  for (let i = 0; i < 7; i++) {
    const seed = i * 127.3;
    const baseX = (Math.sin(seed * 1.1) * 0.5 + 0.5) * w;
    const baseY = (Math.cos(seed * 0.9) * 0.5 + 0.5) * h;
    const drift = t * 3 + seed;
    const x = baseX + Math.sin(drift * 0.15) * 40 + (mx - 0.5) * 25;
    const y = baseY + Math.cos(drift * 0.12) * 30 + (my - 0.5) * 25;

    // Main bloom with noise-modulated radius
    const baseRadius = 50 + Math.sin(t * 0.3 + seed) * 20 + Math.sin(t * 0.7 + i) * 10;
    const hue = 220 + Math.sin(seed * 0.3) * 40;

    // Draw noise-distorted bloom shape
    ctx.beginPath();
    for (let a = 0; a <= 48; a++) {
      const angle = (a / 48) * Math.PI * 2;
      const nR = baseRadius * (1 + fbm(Math.cos(angle) * 2 + i + t * 0.03, Math.sin(angle) * 2 + i, 2) * 0.35);
      const px = x + Math.cos(angle) * nR;
      const py = y + Math.sin(angle) * nR;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = `hsla(${hue}, 40%, 20%, ${0.05 + Math.sin(t * 0.5 + seed) * 0.02})`;
    ctx.fill();

    // Inner bloom glow
    const bloom = ctx.createRadialGradient(x, y, 0, x, y, baseRadius * 0.6);
    bloom.addColorStop(0, `hsla(${hue + 15}, 35%, 25%, ${0.04 + Math.sin(t * 0.3 + seed) * 0.015})`);
    bloom.addColorStop(1, "transparent");
    ctx.fillStyle = bloom;
    ctx.fillRect(x - baseRadius, y - baseRadius, baseRadius * 2, baseRadius * 2);

    // Watercolor edge bleed — splatter dots
    for (let s = 0; s < 8; s++) {
      const sAngle = (s / 8) * Math.PI * 2 + seed;
      const sDist = baseRadius * (1.1 + Math.sin(t * 0.4 + s + seed) * 0.15);
      const sx = x + Math.cos(sAngle) * sDist;
      const sy = y + Math.sin(sAngle) * sDist;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5 + Math.sin(seed + s) * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 30%, 25%, ${0.03 + Math.sin(t * 0.6 + s) * 0.01})`;
      ctx.fill();
    }

    // Tendrils reaching out
    for (let t2 = 0; t2 < 5; t2++) {
      const tAngle = (t2 / 5) * Math.PI * 2 + t * 0.1 + seed;
      const tLen = baseRadius * (0.8 + Math.sin(t * 0.4 + t2 + seed) * 0.3);
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

    // Ink drip trails descending from bloom center
    if (i < 5) {
      ctx.beginPath();
      let dripX = x;
      let dripY = y + baseRadius * 0.5;
      ctx.moveTo(dripX, dripY);
      for (let d = 0; d < 8; d++) {
        dripX += Math.sin(t * 0.2 + seed + d * 1.3) * 2;
        dripY += 6;
        ctx.lineTo(dripX, dripY);
      }
      ctx.strokeStyle = `hsla(${hue}, 30%, 20%, 0.03)`;
      ctx.lineWidth = 0.5;
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
