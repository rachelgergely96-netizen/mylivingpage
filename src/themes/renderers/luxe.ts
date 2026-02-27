import type { ThemeRenderer } from "../types";

export const renderLuxe: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  // Vignette
  const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.15, w * 0.5, h * 0.5, w * 0.75);
  vig.addColorStop(0, "transparent");
  vig.addColorStop(1, "hsla(20, 30%, 4%, 0.15)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // Light rays (conic sweep)
  const rayOriginX = w * (0.5 + (mx - 0.5) * 0.12);
  const rayOriginY = h * (0.4 + (my - 0.5) * 0.08);

  for (let i = 0; i < 4; i += 1) {
    const baseAngle = t * 0.06 + i * (Math.PI / 2) + Math.sin(t * 0.1 + i) * 0.15;
    const spread = 0.25 + Math.sin(t * 0.15 + i * 2) * 0.08;
    const rayLen = Math.max(w, h) * 1.2;

    const a1 = baseAngle - spread;
    const a2 = baseAngle + spread;

    ctx.beginPath();
    ctx.moveTo(rayOriginX, rayOriginY);
    ctx.lineTo(rayOriginX + Math.cos(a1) * rayLen, rayOriginY + Math.sin(a1) * rayLen);
    ctx.lineTo(rayOriginX + Math.cos(a2) * rayLen, rayOriginY + Math.sin(a2) * rayLen);
    ctx.closePath();

    const hue = 42 + Math.sin(i * 1.5) * 6;
    const grad = ctx.createRadialGradient(rayOriginX, rayOriginY, 0, rayOriginX, rayOriginY, rayLen * 0.6);
    grad.addColorStop(0, `hsla(${hue}, 80%, 55%, 0.04)`);
    grad.addColorStop(0.4, `hsla(${hue}, 70%, 45%, 0.02)`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Metallic flecks
  for (let i = 0; i < 30; i += 1) {
    const seed = i * 83.1;
    const fx = ((Math.sin(seed * 2.3) * 0.5 + 0.5) * w + Math.sin(t * 0.08 + seed) * 20) % w;
    const fy = ((Math.cos(seed * 1.7) * 0.5 + 0.5) * h + Math.cos(t * 0.06 + i) * 15) % h;

    // Check if fleck is in a ray
    const dx = fx - rayOriginX;
    const dy = fy - rayOriginY;
    const fleckAngle = Math.atan2(dy, dx);
    let inRay = false;
    for (let r = 0; r < 4; r += 1) {
      const baseAngle = t * 0.06 + r * (Math.PI / 2) + Math.sin(t * 0.1 + r) * 0.15;
      const spread = 0.25 + Math.sin(t * 0.15 + r * 2) * 0.08;
      let diff = fleckAngle - baseAngle;
      // Normalize angle difference
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) < spread) {
        inRay = true;
        break;
      }
    }

    const shimmer = Math.sin(t * 2 + seed * 5) * 0.5 + 0.5;
    const baseAlpha = inRay ? 0.12 + shimmer * 0.15 : 0.02 + shimmer * 0.03;
    const hue = 40 + Math.sin(seed * 0.7) * 8;
    const lightness = inRay ? 65 + shimmer * 15 : 50;

    // Fleck core
    ctx.beginPath();
    ctx.arc(fx, fy, 1 + shimmer * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 75%, ${lightness}%, ${baseAlpha})`;
    ctx.fill();

    // Glow when lit
    if (inRay) {
      ctx.beginPath();
      ctx.arc(fx, fy, 6 + shimmer * 4, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${baseAlpha * 0.15})`;
      ctx.fill();
    }
  }

  // Warm center glow
  const center = ctx.createRadialGradient(rayOriginX, rayOriginY, 0, rayOriginX, rayOriginY, w * 0.2);
  center.addColorStop(0, `hsla(42, 75%, 55%, ${0.04 + Math.sin(t * 0.3) * 0.01})`);
  center.addColorStop(0.5, "hsla(40, 60%, 45%, 0.015)");
  center.addColorStop(1, "transparent");
  ctx.fillStyle = center;
  ctx.fillRect(0, 0, w, h);
};
