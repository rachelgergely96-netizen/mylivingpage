import type { ThemeRenderer } from "../types";

/** Warm sunset gradient bands drift horizontally with floating dust motes */
export const renderDusk: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  // Drifting horizon bands
  for (let i = 0; i < 6; i++) {
    const yBase = h * (0.25 + i * 0.12) + Math.sin(t * 0.2 + i * 1.4) * 20;
    const hue = 280 + i * 15 + Math.sin(t * 0.15 + i) * 10;
    const grad = ctx.createLinearGradient(0, yBase - 40, 0, yBase + 40);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(0.5, `hsla(${hue}, 45%, 18%, ${0.12 + Math.sin(t * 0.3 + i) * 0.04})`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  // Subtle sun glow
  const sunX = w * (0.3 + Math.sin(t * 0.05) * 0.1) + (mx - 0.5) * 60;
  const sunY = h * 0.35 + (my - 0.5) * 30;
  const sun = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, w * 0.35);
  sun.addColorStop(0, `hsla(30, 80%, 55%, ${0.06 + Math.sin(t * 0.4) * 0.02})`);
  sun.addColorStop(0.4, "hsla(310, 50%, 30%, 0.03)");
  sun.addColorStop(1, "transparent");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);

  // Floating dust motes
  for (let i = 0; i < 50; i++) {
    const seed = i * 91.3;
    const x = ((Math.sin(seed * 1.3) * 0.5 + 0.5) * w + t * (8 + (i % 5) * 3) + Math.sin(t * 0.5 + seed) * 15) % w;
    const y = ((Math.cos(seed * 2.1) * 0.5 + 0.5) * h + Math.sin(t * 0.3 + seed * 0.7) * 25);
    const pulse = 0.3 + Math.sin(t * 1.5 + seed) * 0.3;
    const size = 1 + Math.sin(seed * 0.8) * 0.8;
    const hue = 300 + Math.sin(seed * 0.4) * 40;

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 50%, 70%, ${pulse * 0.5})`;
    ctx.fill();

    // Soft glow
    ctx.beginPath();
    ctx.arc(x, y, size * 5, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 40%, 60%, ${pulse * 0.04})`;
    ctx.fill();
  }
};
