import { fbm } from "../shared/noise";
import type { ThemeRenderer } from "../types";

/** Underwater coral reef with swaying tendrils and bubbles */
export const renderCoral: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  // Deep water gradient
  const water = ctx.createLinearGradient(0, 0, 0, h);
  water.addColorStop(0, `hsla(210, 60%, 8%, ${0.06 + Math.sin(t * 0.2) * 0.02})`);
  water.addColorStop(1, `hsla(190, 50%, 5%, ${0.08 + Math.sin(t * 0.3) * 0.02})`);
  ctx.fillStyle = water;
  ctx.fillRect(0, 0, w, h);

  // Caustic light patterns on top
  for (let i = 0; i < 8; i++) {
    const causticX = w * (0.1 + i * 0.12) + Math.sin(t * 0.4 + i * 2.1) * 50 + (mx - 0.5) * 30;
    const causticY = h * 0.15 + Math.cos(t * 0.3 + i * 1.7) * 30 + (my - 0.5) * 20;
    const r = 60 + Math.sin(t * 0.5 + i) * 20;
    const caustic = ctx.createRadialGradient(causticX, causticY, 0, causticX, causticY, r);
    caustic.addColorStop(0, `hsla(180, 50%, 40%, ${0.04 + Math.sin(t * 0.6 + i) * 0.02})`);
    caustic.addColorStop(1, "transparent");
    ctx.fillStyle = caustic;
    ctx.fillRect(0, 0, w, h);
  }

  // Seafloor sediment dots
  for (let i = 0; i < 35; i++) {
    const seed = i * 71.3;
    const x = (Math.sin(seed * 2.9) * 0.5 + 0.5) * w;
    const y = h - 10 - Math.sin(seed * 1.5) * (h * 0.12);
    ctx.beginPath();
    ctx.arc(x, y, 0.5 + Math.sin(seed * 0.7) * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(35, 25%, 30%, ${0.03 + Math.sin(t * 0.3 + seed) * 0.01})`;
    ctx.fill();
  }

  // Coral tendrils growing from bottom with fbm-driven sway
  for (let i = 0; i < 12; i++) {
    const seed = i * 63.7;
    const baseX = (i + 0.5) * (w / 12) + Math.sin(seed) * 20;
    const hue = 340 + Math.sin(seed * 0.7) * 30;
    const segments = 8 + Math.floor(Math.sin(seed * 1.3) * 3);

    ctx.beginPath();
    ctx.moveTo(baseX, h);

    let px = baseX;
    let py = h;
    for (let s = 0; s < segments; s++) {
      const noiseVal = fbm(px * 0.005 + seed, s * 0.2 + t * 0.05, 2);
      const sway = noiseVal * (12 + s * 2.5);
      const windSway = (mx - 0.5) * (s * 3);
      px += sway + windSway;
      py -= (h * 0.06);
      ctx.lineTo(px, py);
    }

    ctx.strokeStyle = `hsla(${hue}, 60%, 45%, ${0.25 + Math.sin(t * 0.4 + seed) * 0.08})`;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Coral tip glow
    ctx.beginPath();
    ctx.arc(px, py, 4 + Math.sin(t + seed) * 2, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${0.3 + Math.sin(t * 1.2 + seed) * 0.15})`;
    ctx.fill();
  }

  // Tiny fish silhouettes
  for (let i = 0; i < 4; i++) {
    const seed = i * 157.9;
    const fishX = ((Math.sin(seed * 0.7 + t * 0.12) * 0.4 + 0.5) * w + t * (10 + i * 5)) % (w + 40) - 20;
    const fishY = h * (0.25 + i * 0.12) + Math.sin(t * 0.3 + seed) * 15;
    const direction = Math.cos(seed) > 0 ? 1 : -1;
    ctx.save();
    ctx.translate(fishX, fishY);
    ctx.scale(direction, 1);
    // Fish body
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 2.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(200, 30%, 35%, ${0.06 + Math.sin(t * 0.5 + seed) * 0.02})`;
    ctx.fill();
    // Tail
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(-10, -3);
    ctx.lineTo(-10, 3);
    ctx.closePath();
    ctx.fillStyle = `hsla(200, 30%, 35%, ${0.04 + Math.sin(t * 0.5 + seed) * 0.015})`;
    ctx.fill();
    ctx.restore();
  }

  // Floating bubbles
  for (let i = 0; i < 25; i++) {
    const seed = i * 83.1;
    const speed = 0.3 + (i % 5) * 0.1;
    const x = ((Math.sin(seed * 1.5) * 0.5 + 0.5) * w + Math.sin(t * 0.4 + seed) * 15);
    const cycle = (t * 20 * speed + seed * 10) % (h * 1.3);
    const y = h + 20 - cycle;
    const size = 2 + Math.sin(seed * 0.6) * 1.5;
    const life = Math.max(0, Math.min(1, 1 - cycle / (h * 1.3)));

    if (life <= 0) continue;

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(190, 60%, 70%, ${life * 0.35})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Bubble highlight
    ctx.beginPath();
    ctx.arc(x - size * 0.3, y - size * 0.3, size * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(190, 70%, 80%, ${life * 0.3})`;
    ctx.fill();
  }
};
