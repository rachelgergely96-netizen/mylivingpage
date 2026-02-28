import { fbm } from "../shared/noise";
import type { ThemeRenderer } from "../types";

/** Rising ember sparks with heat distortion, fading trails, and a molten base glow that shifts with the wind */
export const renderEmber: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  // Bottom haze gradient
  const haze = ctx.createLinearGradient(0, h, 0, 0);
  haze.addColorStop(0, `hsla(10, 70%, 12%, ${0.15 + Math.sin(t * 0.3) * 0.03})`);
  haze.addColorStop(0.3, "hsla(20, 50%, 6%, 0.08)");
  haze.addColorStop(1, "transparent");
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, w, h);

  // Heat intensity from mouse Y
  const heatFactor = 0.7 + my * 0.6; // 0.7 at top, 1.3 at bottom

  // Smoke wisps rising from bottom
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    const seed = i * 97.3;
    const baseX = (Math.sin(seed * 1.3) * 0.5 + 0.5) * w;
    ctx.beginPath();
    ctx.moveTo(baseX, h);
    let sx = baseX;
    let sy = h;
    for (let s = 0; s < 10; s++) {
      const n = fbm(sx * 0.005 + t * 0.03 + seed, sy * 0.005 + t * 0.02, 2);
      sx += n * 20 + (mx - 0.5) * (s * 2);
      sy -= h * 0.06;
      ctx.lineTo(sx, sy);
    }
    const smokeAlpha = 0.025 + Math.sin(t * 0.3 + seed) * 0.01;
    ctx.strokeStyle = `hsla(0, 10%, 30%, ${smokeAlpha})`;
    ctx.stroke();
  }

  // Coal bed at bottom — pulsing irregular shapes
  for (let i = 0; i < 18; i++) {
    const seed = i * 61.3;
    const cx2 = (Math.sin(seed * 2.1) * 0.5 + 0.5) * w;
    const cy2 = h - 8 - Math.sin(seed * 1.7) * 10;
    const coalPulse = 0.5 + Math.sin(t * 1.5 + seed * 2.3) * 0.5;
    const hue = 10 + Math.sin(seed * 0.5) * 12;
    const sides = 4 + Math.floor(Math.sin(seed * 0.9) * 2);
    ctx.beginPath();
    for (let s = 0; s <= sides; s++) {
      const angle = (s / sides) * Math.PI * 2;
      const r = (3 + Math.sin(seed + s) * 1.5) * (1 + coalPulse * 0.3);
      const px = cx2 + Math.cos(angle) * r;
      const py = cy2 + Math.sin(angle) * r * 0.6;
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = `hsla(${hue}, 80%, ${30 + coalPulse * 25}%, ${0.12 + coalPulse * 0.12})`;
    ctx.fill();
    // Coal glow
    ctx.beginPath();
    ctx.arc(cx2, cy2, 10 + coalPulse * 5, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue + 5}, 70%, 40%, ${coalPulse * 0.04})`;
    ctx.fill();
  }

  // Main embers (70 standard + 30 small sparks)
  for (let i = 0; i < 100; i++) {
    const seed = i * 73.7;
    const isSpark = i >= 70;
    const speed = isSpark ? (0.8 + (i % 5) * 0.2) : (0.4 + (i % 7) * 0.15);
    const drift = Math.sin(t * 0.3 + seed) * 30 + Math.sin(t * 0.7 + i * 0.5) * 10;
    const windX = (mx - 0.5) * 40;

    // Heat shimmer using noise
    const rawX = (Math.sin(seed * 1.7) * 0.5 + 0.5) * w + drift + windX * speed;
    const cycle = (t * 15 * speed * heatFactor + seed * 5) % (h * 1.5);
    const rawY = h + h * 0.2 - cycle;
    const life = Math.max(0, Math.min(1, 1 - cycle / (h * 1.5)));
    if (life <= 0) continue;

    // Noise-based convection wobble (more at higher positions)
    const heightRatio = 1 - rawY / h;
    const shimmer = fbm(rawX * 0.01 + t * 0.1 + seed, rawY * 0.01, 2) * heightRatio * 15;

    const x = (((rawX + shimmer) % w) + w) % w;
    const y = rawY;
    const baseSize = isSpark ? (0.5 + Math.sin(seed) * 0.3) : (1 + Math.sin(seed) * 0.6);
    const size = baseSize * life;
    const hue = 10 + Math.sin(seed * 0.5) * 18 + life * 20;

    // Core
    ctx.beginPath();
    ctx.arc(x, y, size * (isSpark ? 1.5 : 2.5), 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 85%, ${55 + life * 20}%, ${life * (isSpark ? 0.8 : 0.6)})`;
    ctx.fill();

    // Glow
    if (!isSpark) {
      ctx.beginPath();
      ctx.arc(x, y, size * 10, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 75%, 50%, ${life * 0.06})`;
      ctx.fill();
    }

    // Trails
    for (let tr = 1; tr < (isSpark ? 2 : 4); tr++) {
      const trY = y + tr * 5 * speed;
      const trAlpha = life * 0.2 * (1 - tr / 4);
      ctx.beginPath();
      ctx.arc(x - drift * 0.02 * tr, trY, size * (1 - tr * 0.2), 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue - tr * 5}, 70%, 45%, ${trAlpha})`;
      ctx.fill();
    }
  }

  // Falling ash particles (contrast with rising embers)
  for (let i = 0; i < 25; i++) {
    const seed = i * 107.9;
    const x = ((Math.sin(seed * 2.3) * 0.5 + 0.5) * w + Math.sin(t * 0.2 + seed) * 10 + (mx - 0.5) * 8) % w;
    const ashCycle = (t * 5 + seed * 8) % (h * 1.2);
    const y = ashCycle - h * 0.1;
    const alpha = 0.04 + Math.sin(t * 0.5 + seed) * 0.02;
    ctx.beginPath();
    ctx.arc(x, y, 0.4, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(0, 5%, 40%, ${alpha})`;
    ctx.fill();
  }

  // Bottom fire glow
  const fire = ctx.createRadialGradient(w * 0.5, h * 1.1, 0, w * 0.5, h, w * 0.6);
  fire.addColorStop(0, `hsla(20, 80%, 30%, ${(0.08 + Math.sin(t * 0.5) * 0.03) * heatFactor})`);
  fire.addColorStop(1, "transparent");
  ctx.fillStyle = fire;
  ctx.fillRect(0, 0, w, h);
};
