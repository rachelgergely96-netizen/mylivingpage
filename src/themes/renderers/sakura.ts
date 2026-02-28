import { fbm } from "../shared/noise";
import type { ThemeRenderer } from "../types";

/** Soft petals drift and tumble through gentle air currents as watercolor washes bloom and dissolve */
export const renderSakura: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  // Sunlight rays from upper right
  for (let i = 0; i < 3; i++) {
    const angle = -0.6 + i * 0.15 + Math.sin(t * 0.05 + i) * 0.05;
    const startX = w * 0.85 + i * 20;
    const rayLen = Math.max(w, h) * 1.2;
    const endX = startX + Math.cos(angle) * rayLen;
    const endY = Math.sin(angle) * rayLen;
    const grad = ctx.createLinearGradient(startX, 0, endX, endY);
    grad.addColorStop(0, `hsla(40, 60%, 80%, ${0.025 + Math.sin(t * 0.3 + i) * 0.008})`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  // Watercolor bloom washes
  for (let i = 0; i < 6; i++) {
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

  // Branch silhouettes from edges
  for (let b = 0; b < 3; b++) {
    const seed = b * 213.7;
    const startX = b === 0 ? 0 : b === 1 ? w : w * 0.7;
    const startY = b * 30;
    const direction = b === 0 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    let bx = startX;
    let by = startY;
    for (let s = 0; s < 5; s++) {
      const n = fbm(s * 0.3 + seed, t * 0.01 + b, 2);
      bx += direction * (30 + n * 15);
      by += 20 + Math.sin(seed + s) * 10;
      ctx.lineTo(bx, by);
    }
    ctx.strokeStyle = `hsla(330, 15%, 12%, ${0.06 + Math.sin(t * 0.15 + seed) * 0.02})`;
    ctx.lineWidth = 2.5 - b * 0.5;
    ctx.stroke();
  }

  // Falling petals with 3 shape variations and noise-driven trajectories
  const windX = (mx - 0.5) * 30;
  const windY = (my - 0.5) * 15; // vertical wind from mouse
  for (let i = 0; i < 50; i++) {
    const seed = i * 83.7;
    const fallSpeed = 0.15 + (i % 6) * 0.05;
    const speedMod = 1 + windY * 0.04; // mouse Y affects fall speed
    const n = fbm(i * 0.5 + t * 0.05, seed * 0.01, 2);
    const windInfluence = windX + n * 25 + Math.sin(t * 0.2 + i) * 15;
    const x = ((Math.sin(seed * 2.1) * 0.5 + 0.5) * w + windInfluence) % w;
    const cycle = (t * 8 * fallSpeed * speedMod + seed * 5) % (h * 1.4);
    const y = cycle - h * 0.2;
    const rotation = t * 0.5 + seed + Math.sin(t * 0.3 + i) * 0.5;
    const life = Math.min(1, Math.max(0, 1 - Math.abs(y - h * 0.5) / (h * 0.6)));
    const hue = 335 + Math.sin(seed * 0.3) * 20;
    const size = 3 + Math.sin(seed) * 1.5;
    const variant = i % 3;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(1, 0.6 + Math.sin(t * 0.8 + i) * 0.3);

    ctx.beginPath();
    if (variant === 0) {
      // Standard petal
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(size * 1.5, -size, 0, -size * 2.5);
      ctx.quadraticCurveTo(-size * 1.5, -size, 0, 0);
    } else if (variant === 1) {
      // Wider/rounder petal
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(size * 2, -size * 0.8, 0, -size * 2);
      ctx.quadraticCurveTo(-size * 2, -size * 0.8, 0, 0);
    } else {
      // Curled petal (two overlapping curves)
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(size * 1.2, -size * 1.2, size * 0.3, -size * 2.3);
      ctx.quadraticCurveTo(-size * 0.8, -size * 1.5, 0, 0);
    }
    ctx.fillStyle = `hsla(${hue}, 55%, 65%, ${life * 0.2})`;
    ctx.fill();

    // Petal glow
    ctx.beginPath();
    ctx.arc(0, -size, size * 3, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 45%, 60%, ${life * 0.02})`;
    ctx.fill();
    ctx.restore();
  }

  // Ground accumulation — settled petals at bottom
  for (let i = 0; i < 18; i++) {
    const seed = i * 149.3;
    const x = (Math.sin(seed * 2.7) * 0.5 + 0.5) * w;
    const y = h - 8 - Math.sin(seed * 1.3) * 12;
    const rot = seed * 0.5;
    const size = 2 + Math.sin(seed * 0.8) * 1;
    const alpha = 0.06 + Math.sin(t * 0.2 + seed) * 0.02;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(size, -size * 0.5, 0, -size * 1.5);
    ctx.quadraticCurveTo(-size, -size * 0.5, 0, 0);
    ctx.fillStyle = `hsla(340, 40%, 55%, ${alpha})`;
    ctx.fill();
    ctx.restore();
  }

  // Pollen micro-particles
  for (let i = 0; i < 40; i++) {
    const seed = i * 67.1;
    const x = ((Math.sin(seed * 3.3) * 0.5 + 0.5) * w + Math.sin(t * 0.15 + seed) * 10 + t * 2) % w;
    const y = (Math.cos(seed * 2.5) * 0.5 + 0.5) * h + Math.sin(t * 0.2 + seed * 0.7) * 8;
    ctx.beginPath();
    ctx.arc(x, y, 0.3, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(45, 50%, 70%, ${0.08 + Math.sin(t * 1.2 + seed) * 0.04})`;
    ctx.fill();
  }

  // Ambient warm glow
  const ambient = ctx.createRadialGradient(w * 0.5, h * 0.3, 0, w * 0.5, h * 0.5, w * 0.5);
  ambient.addColorStop(0, "hsla(15, 40%, 50%, 0.03)");
  ambient.addColorStop(1, "transparent");
  ctx.fillStyle = ambient;
  ctx.fillRect(0, 0, w, h);
};
