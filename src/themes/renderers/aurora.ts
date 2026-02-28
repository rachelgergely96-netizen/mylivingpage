import { fbm } from "../shared/noise";
import type { ThemeRenderer } from "../types";

/** Layered spectral curtains ripple with noise-driven displacement while shimmer particles rain through the bands */
export const renderAurora: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  // Background star field (upper half)
  for (let i = 0; i < 70; i++) {
    const seed = i * 173.9;
    const x = (Math.sin(seed * 3.7) * 0.5 + 0.5) * w;
    const y = (Math.sin(seed * 1.3) * 0.5 + 0.5) * h * 0.55;
    const twinkle = 0.3 + Math.sin(t * 1.5 + seed * 2.1) * 0.3;
    const size = 0.3 + Math.sin(seed * 0.7) * 0.2;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(200, 20%, 85%, ${twinkle * 0.1})`;
    ctx.fill();
  }

  // Aurora bands with luminous curtain edge
  for (let band = 0; band < 7; band++) {
    const baseY = h * (0.15 + band * 0.07);
    const hue = 160 + band * 22 + Math.sin(t * 0.2 + band) * 15;

    // Compute band shape
    const points: [number, number][] = [];
    for (let x = 0; x <= w; x += 3) {
      const nVal = fbm(x * 0.003 + t * 0.08 + band * 0.5, band * 2 + t * 0.03, 3);
      const mouseInfluence = Math.exp(-Math.pow(x / w - mx, 2) * 8) * 20 * (my - 0.5);
      const y = baseY + nVal * 50 + mouseInfluence;
      points.push([x, y]);
    }

    // Filled band
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (const [x, y] of points) ctx.lineTo(x, y);
    ctx.lineTo(w, h);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, baseY - 40, 0, h);
    grad.addColorStop(0, `hsla(${hue}, 65%, 55%, 0.06)`);
    grad.addColorStop(0.3, `hsla(${hue}, 55%, 40%, 0.03)`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fill();

    // Luminous curtain edge stroke
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      if (i === 0) ctx.moveTo(points[i][0], points[i][1]);
      else ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.strokeStyle = `hsla(${hue}, 70%, 65%, ${0.08 + Math.sin(t * 0.4 + band) * 0.03})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Aurora reflection in bottom 20%
  for (let band = 0; band < 4; band++) {
    const baseY = h * (0.88 - band * 0.04);
    const hue = 160 + band * 25 + Math.sin(t * 0.2 + band) * 10;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 6) {
      const nVal = fbm(x * 0.003 + t * 0.06 + band * 0.5, band * 2 + t * 0.03 + 10, 2);
      const y = baseY + nVal * 15;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = `hsla(${hue}, 50%, 40%, ${0.02 + Math.sin(t * 0.3 + band) * 0.008})`;
    ctx.fill();
  }

  // Ground mist
  const mist = ctx.createLinearGradient(0, h, 0, h * 0.78);
  mist.addColorStop(0, "hsla(210, 30%, 8%, 0.12)");
  mist.addColorStop(1, "transparent");
  ctx.fillStyle = mist;
  ctx.fillRect(0, 0, w, h);

  const mxp = mx * w;
  const myp = my * h;

  // Falling shimmer particles
  for (let i = 0; i < 40; i++) {
    const seed = i * 89.3;
    const x = ((Math.sin(seed * 2.1) * 0.5 + 0.5) * w + Math.sin(t * 0.2 + i) * 15) % w;
    const fallSpeed = 0.3 + (i % 5) * 0.1;
    const y = ((t * 10 * fallSpeed + seed * 7) % (h * 1.2)) - h * 0.1;
    const hue = 170 + Math.sin(i * 0.7) * 50;

    // Mouse proximity brightness
    const md = Math.hypot(x - mxp, y - myp);
    const mouseBoost = md < 100 ? (1 - md / 100) * 0.15 : 0;
    const alpha = 0.15 + Math.sin(t * 1.5 + seed) * 0.1 + mouseBoost;

    ctx.beginPath();
    ctx.arc(x, y, 1.2 + mouseBoost * 2, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 70%, 70%, ${alpha})`;
    ctx.fill();

    // Trail
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 8 - Math.random() * 4);
    ctx.strokeStyle = `hsla(${hue}, 60%, 65%, ${alpha * 0.3})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Horizontal curtain sparkles
  for (let i = 0; i < 30; i++) {
    const seed = i * 131.7;
    const band = Math.floor(Math.sin(seed) * 3.5 + 3.5);
    const bandBaseY = h * (0.15 + band * 0.07);
    const nVal = fbm(((Math.sin(seed * 2.3) * 0.5 + 0.5) * w) * 0.003 + t * 0.08 + band * 0.5, band * 2 + t * 0.03, 2);
    const x = ((Math.sin(seed * 2.3) * 0.5 + 0.5) * w + t * (5 + (i % 4) * 2)) % w;
    const y = bandBaseY + nVal * 50 + Math.sin(t * 0.8 + seed) * 5;
    const alpha = 0.1 + Math.sin(t * 2 + seed) * 0.08;
    const hue = 160 + band * 22;

    ctx.beginPath();
    ctx.arc(x, y, 0.8, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 75%, 75%, ${alpha})`;
    ctx.fill();
  }

  // Horizon glow
  const horizonG = ctx.createRadialGradient(w * 0.5, h * 0.2, 0, w * 0.5, h * 0.3, w * 0.6);
  horizonG.addColorStop(0, `hsla(${200 + Math.sin(t * 0.15) * 20}, 50%, 40%, 0.04)`);
  horizonG.addColorStop(1, "transparent");
  ctx.fillStyle = horizonG;
  ctx.fillRect(0, 0, w, h);
};
