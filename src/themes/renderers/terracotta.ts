import { fbm } from "../shared/noise";
import type { ThemeRenderer } from "../types";

export const renderTerracotta: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  for (let i = 0; i < 10; i += 1) {
    const cx2 = (Math.sin(t * 0.06 + i * 2.3) * 0.38 + 0.5) * w;
    const cy2 = (Math.cos(t * 0.05 + i * 1.7) * 0.38 + 0.5) * h;
    const baseR = 40 + i * 8;

    ctx.beginPath();
    for (let a = 0; a <= 64; a += 1) {
      const angle = (a / 64) * Math.PI * 2;
      const nR = baseR * (1 + fbm(Math.cos(angle) + i + t * 0.04, Math.sin(angle) + i, 2) * 0.4);
      const px = cx2 + Math.cos(angle) * nR;
      const py = cy2 + Math.sin(angle) * nR;
      if (a === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    const hue = 25 + i * 4 + Math.sin(t * 0.2 + i) * 5;
    ctx.fillStyle = `hsla(${hue}, 45%, 30%, 0.04)`;
    ctx.fill();
  }

  for (let i = 0; i < 150; i += 1) {
    const seed = i * 43.7;
    const x = (Math.sin(seed * 3.1) * 0.5 + 0.5) * w;
    const y = (Math.cos(seed * 2.7) * 0.5 + 0.5) * h;
    const drift = Math.sin(t * 0.1 + seed) * 2;
    ctx.beginPath();
    ctx.arc(x + drift, y, 0.6, 0, Math.PI * 2);
    ctx.fillStyle = "hsla(30, 35%, 50%, 0.04)";
    ctx.fill();
  }

  const mg = ctx.createRadialGradient(mx * w, my * h, 0, mx * w, my * h, 120);
  mg.addColorStop(0, "hsla(35, 60%, 45%, 0.06)");
  mg.addColorStop(1, "transparent");
  ctx.fillStyle = mg;
  ctx.fillRect(0, 0, w, h);
};
