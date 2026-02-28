import { fbm } from "../shared/noise";
import type { ThemeRenderer } from "../types";

/** Warm organic noise blobs drift like clay on water with fine grain texture and earthy color evolution */
export const renderTerracotta: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  // Warm vignette background
  const vignette = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.7);
  vignette.addColorStop(0, "hsla(25, 40%, 12%, 0.05)");
  vignette.addColorStop(1, "hsla(15, 30%, 5%, 0.08)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  const mxp = mx * w;
  const myp = my * h;

  // Noise circles with mouse repulsion and inner glow
  for (let i = 0; i < 14; i++) {
    let cx2 = (Math.sin(t * 0.06 + i * 2.3) * 0.38 + 0.5) * w;
    let cy2 = (Math.cos(t * 0.05 + i * 1.7) * 0.38 + 0.5) * h;
    const baseR = 40 + i * 7;

    // Mouse repulsion
    const dx = cx2 - mxp;
    const dy = cy2 - myp;
    const dist = Math.hypot(dx, dy);
    if (dist < 180 && dist > 0) {
      const push = (1 - dist / 180) * 25;
      cx2 += (dx / dist) * push;
      cy2 += (dy / dist) * push;
    }

    // Outer noise shape
    ctx.beginPath();
    for (let a = 0; a <= 64; a++) {
      const angle = (a / 64) * Math.PI * 2;
      const nR = baseR * (1 + fbm(Math.cos(angle) + i + t * 0.04, Math.sin(angle) + i, 2) * 0.4);
      const px = cx2 + Math.cos(angle) * nR;
      const py = cy2 + Math.sin(angle) * nR;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    const hue = 25 + i * 4 + Math.sin(t * 0.2 + i) * 5;
    ctx.fillStyle = `hsla(${hue}, 45%, 30%, 0.04)`;
    ctx.fill();

    // Inner glow
    ctx.beginPath();
    for (let a = 0; a <= 32; a++) {
      const angle = (a / 32) * Math.PI * 2;
      const nR = baseR * 0.5 * (1 + fbm(Math.cos(angle) + i + t * 0.06, Math.sin(angle) + i + 5, 2) * 0.3);
      const px = cx2 + Math.cos(angle) * nR;
      const py = cy2 + Math.sin(angle) * nR;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = `hsla(${hue + 5}, 50%, 38%, 0.03)`;
    ctx.fill();
  }

  // Flowing dust particles driven by noise field
  for (let i = 0; i < 100; i++) {
    const seed = i * 43.7;
    const baseX = (Math.sin(seed * 3.1) * 0.5 + 0.5) * w;
    const baseY = (Math.cos(seed * 2.7) * 0.5 + 0.5) * h;
    const n = fbm(baseX * 0.004 + t * 0.04, baseY * 0.004 + t * 0.03, 2);
    const angle = n * Math.PI * 3;
    const x = baseX + Math.cos(angle) * (8 + Math.sin(t * 0.2 + seed) * 4);
    const y = baseY + Math.sin(angle) * (8 + Math.cos(t * 0.15 + seed) * 4);

    // Heat effect near mouse
    const md = Math.hypot(x - mxp, y - myp);
    const heat = md < 120 ? (1 - md / 120) : 0;
    const hue = 30 + heat * 15;
    const alpha = 0.04 + heat * 0.12;

    ctx.beginPath();
    ctx.arc(x, y, 0.6 + heat * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, ${35 + heat * 25}%, ${50 + heat * 15}%, ${alpha})`;
    ctx.fill();
  }

  // Crackle texture — thin noise-warped line segments
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 25; i++) {
    const seed = i * 157.3;
    const sx = (Math.sin(seed * 2.3) * 0.5 + 0.5) * w;
    const sy = (Math.cos(seed * 1.8) * 0.5 + 0.5) * h;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    let px = sx;
    let py = sy;
    const len = 15 + Math.sin(seed) * 12;
    for (let s = 0; s < 6; s++) {
      const n2 = fbm(px * 0.01 + seed, py * 0.01, 2);
      px += Math.cos(n2 * Math.PI * 4) * (len / 6);
      py += Math.sin(n2 * Math.PI * 4) * (len / 6);
      ctx.lineTo(px, py);
    }
    ctx.strokeStyle = `hsla(20, 30%, 35%, ${0.03 + Math.sin(t * 0.4 + seed) * 0.01})`;
    ctx.stroke();
  }

  // Ambient floating sediment rising slowly
  for (let i = 0; i < 20; i++) {
    const seed = i * 89.7;
    const x = (Math.sin(seed * 1.9) * 0.5 + 0.5) * w + Math.sin(t * 0.3 + seed) * 5;
    const y = h - ((t * 4 + seed * 10) % (h * 1.2)) + h * 0.1;
    const alpha = 0.03 + Math.sin(t * 0.8 + seed) * 0.01;
    ctx.beginPath();
    ctx.arc(x, y, 0.4, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(30, 25%, 55%, ${alpha})`;
    ctx.fill();
  }

  // Mouse warm glow
  const mg = ctx.createRadialGradient(mxp, myp, 0, mxp, myp, 160);
  mg.addColorStop(0, "hsla(35, 60%, 45%, 0.07)");
  mg.addColorStop(0.6, "hsla(25, 50%, 35%, 0.02)");
  mg.addColorStop(1, "transparent");
  ctx.fillStyle = mg;
  ctx.fillRect(0, 0, w, h);
};
