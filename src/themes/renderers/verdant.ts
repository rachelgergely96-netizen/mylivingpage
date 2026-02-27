import { fbm } from "../shared/noise";
import type { ThemeRenderer } from "../types";

export const renderVerdant: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  // Canopy ambient glow
  const canopy = ctx.createRadialGradient(w * 0.4, h * 0.3, 0, w * 0.5, h * 0.5, w * 0.55);
  canopy.addColorStop(0, `hsla(120, 50%, 20%, ${0.05 + Math.sin(t * 0.15) * 0.01})`);
  canopy.addColorStop(0.6, "hsla(135, 40%, 12%, 0.03)");
  canopy.addColorStop(1, "transparent");
  ctx.fillStyle = canopy;
  ctx.fillRect(0, 0, w, h);

  // Vine tendrils
  for (let i = 0; i < 12; i += 1) {
    const seed = i * 53.7;
    const startX = (Math.sin(seed * 1.7) * 0.5 + 0.5) * w;
    const startY = h + 20;
    const hue = 115 + Math.sin(seed * 0.5) * 25;

    ctx.beginPath();
    ctx.moveTo(startX, startY);

    let vx = startX;
    let vy = startY;
    const segments = 40;
    const segLen = (h * 0.8) / segments;

    for (let s = 0; s < segments; s += 1) {
      const progress = s / segments;
      const noiseVal = fbm(vx * 0.004 + seed, vy * 0.004 + t * 0.04, 3);
      const angle = -Math.PI / 2 + noiseVal * 0.8;
      vx += Math.cos(angle) * segLen * 0.7;
      vy += Math.sin(angle) * segLen;
      ctx.lineTo(vx, vy);

      // Leaf at branch tips
      if (s > 25 && s % 6 === 0) {
        ctx.save();
        ctx.translate(vx, vy);
        ctx.rotate(angle + Math.sin(t * 0.5 + seed + s) * 0.3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(4, -3, 0, -7 - progress * 3);
        ctx.quadraticCurveTo(-4, -3, 0, 0);
        ctx.fillStyle = `hsla(${hue + 10}, 55%, 40%, ${0.08 + progress * 0.04})`;
        ctx.fill();
        ctx.restore();
        ctx.beginPath();
        ctx.moveTo(vx, vy);
      }
    }

    const alpha = 0.04 + Math.sin(t * 0.2 + seed) * 0.015;
    ctx.strokeStyle = `hsla(${hue}, 45%, 35%, ${alpha})`;
    ctx.lineWidth = 1.2 - i * 0.05;
    ctx.stroke();
  }

  // Fireflies
  for (let i = 0; i < 20; i += 1) {
    const seed = i * 89.1;
    const baseX = (Math.sin(seed * 2.1) * 0.5 + 0.5) * w;
    const baseY = (Math.cos(seed * 1.4) * 0.5 + 0.5) * h;
    const orbitX = baseX + Math.sin(t * 0.3 + seed) * 30 + Math.cos(t * 0.17 + i) * 15;
    const orbitY = baseY + Math.cos(t * 0.25 + seed) * 20 + Math.sin(t * 0.13 + i) * 12;

    // Mouse attraction
    const dx = mx * w - orbitX;
    const dy = my * h - orbitY;
    const dist = Math.hypot(dx, dy);
    const attract = dist < 150 ? (1 - dist / 150) * 20 : 0;
    const fx = orbitX + (dist > 0 ? (dx / dist) * attract : 0);
    const fy = orbitY + (dist > 0 ? (dy / dist) * attract : 0);

    const pulse = 0.15 + Math.sin(t * 1.5 + seed * 3) * 0.1;
    const hue = 85 + Math.sin(seed) * 30;

    // Outer glow
    ctx.beginPath();
    ctx.arc(fx, fy, 10 + Math.sin(t * 1.2 + seed) * 3, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 65%, 55%, ${pulse * 0.08})`;
    ctx.fill();

    // Core
    ctx.beginPath();
    ctx.arc(fx, fy, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 70%, 65%, ${pulse})`;
    ctx.fill();
  }

  // Floor mist
  const floor = ctx.createLinearGradient(0, h, 0, h * 0.7);
  floor.addColorStop(0, "hsla(130, 40%, 15%, 0.06)");
  floor.addColorStop(1, "transparent");
  ctx.fillStyle = floor;
  ctx.fillRect(0, 0, w, h);
};
