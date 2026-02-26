import { fbm } from "../shared/noise";
import type { ThemeRenderer } from "../types";

export const renderAurora: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  for (let band = 0; band < 7; band += 1) {
    const baseY = h * (0.15 + band * 0.07);
    const hue = 160 + band * 22 + Math.sin(t * 0.2 + band) * 15;
    ctx.beginPath();
    ctx.moveTo(0, h);

    for (let x = 0; x <= w; x += 3) {
      const nVal = fbm(x * 0.003 + t * 0.08 + band * 0.5, band * 2 + t * 0.03, 3);
      const mouseInfluence = Math.exp(-Math.pow(x / w - mx, 2) * 8) * 20 * (my - 0.5);
      const y = baseY + nVal * 50 + mouseInfluence;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, baseY - 40, 0, h);
    grad.addColorStop(0, `hsla(${hue}, 65%, 55%, 0.06)`);
    grad.addColorStop(0.3, `hsla(${hue}, 55%, 40%, 0.03)`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fill();
  }

  for (let i = 0; i < 40; i += 1) {
    const seed = i * 89.3;
    const x = ((Math.sin(seed * 2.1) * 0.5 + 0.5) * w + Math.sin(t * 0.2 + i) * 15) % w;
    const fallSpeed = 0.3 + (i % 5) * 0.1;
    const y = ((t * 10 * fallSpeed + seed * 7) % (h * 1.2)) - h * 0.1;
    const alpha = 0.15 + Math.sin(t * 1.5 + seed) * 0.1;
    const hue = 170 + Math.sin(i * 0.7) * 50;

    ctx.beginPath();
    ctx.arc(x, y, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 70%, 70%, ${alpha})`;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 8 - Math.random() * 4);
    ctx.strokeStyle = `hsla(${hue}, 60%, 65%, ${alpha * 0.3})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  const horizonG = ctx.createRadialGradient(w * 0.5, h * 0.2, 0, w * 0.5, h * 0.3, w * 0.6);
  horizonG.addColorStop(0, `hsla(${200 + Math.sin(t * 0.15) * 20}, 50%, 40%, 0.04)`);
  horizonG.addColorStop(1, "transparent");
  ctx.fillStyle = horizonG;
  ctx.fillRect(0, 0, w, h);
};
