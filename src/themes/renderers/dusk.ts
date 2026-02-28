import { fbm } from "../shared/noise";
import type { ThemeRenderer } from "../types";

/** Warm sunset gradient bands drift horizontally with floating dust motes */
export const renderDusk: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  // Landscape silhouette at bottom
  const ground = ctx.createLinearGradient(0, h, 0, h * 0.82);
  ground.addColorStop(0, "hsla(270, 30%, 5%, 0.15)");
  ground.addColorStop(1, "transparent");
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, w, h);

  // Undulating horizon bands with noise
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(0, h);
    const baseYCenter = h * (0.25 + i * 0.12) + Math.sin(t * 0.2 + i * 1.4) * 20;
    for (let x = 0; x <= w; x += 4) {
      const nVal = fbm(x * 0.002 + t * 0.03 + i * 0.8, i * 2, 2);
      const yy = baseYCenter + nVal * 25;
      ctx.lineTo(x, yy);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    const hue = 280 + i * 15 + Math.sin(t * 0.15 + i) * 10;
    const grad = ctx.createLinearGradient(0, baseYCenter - 40, 0, baseYCenter + 80);
    grad.addColorStop(0, `hsla(${hue}, 45%, 18%, ${0.10 + Math.sin(t * 0.3 + i) * 0.03})`);
    grad.addColorStop(0.6, `hsla(${hue + 10}, 35%, 12%, 0.04)`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Sun glow with halo
  const sunX = w * (0.3 + Math.sin(t * 0.05) * 0.1) + (mx - 0.5) * 60;
  const sunY = h * 0.35 + (my - 0.5) * 30;
  const sun = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, w * 0.35);
  sun.addColorStop(0, `hsla(30, 80%, 55%, ${0.08 + Math.sin(t * 0.4) * 0.02})`);
  sun.addColorStop(0.3, "hsla(310, 50%, 30%, 0.04)");
  sun.addColorStop(1, "transparent");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);

  // Secondary halo ring
  ctx.beginPath();
  ctx.arc(sunX, sunY, w * 0.18, 0, Math.PI * 2);
  ctx.strokeStyle = `hsla(35, 70%, 60%, ${0.03 + Math.sin(t * 0.6) * 0.01})`;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Cloud silhouettes
  for (let i = 0; i < 5; i++) {
    const seed = i * 137.9;
    const cloudX = ((Math.sin(seed * 0.7) * 0.5 + 0.5) * w * 1.2 - w * 0.1 + t * (3 + i * 1.5)) % (w * 1.3) - w * 0.15;
    const cloudY = h * (0.22 + i * 0.06) + Math.sin(t * 0.1 + seed) * 8;
    const cloudW = 80 + Math.sin(seed) * 30;
    ctx.beginPath();
    for (let x = 0; x <= cloudW; x += 3) {
      const nVal = fbm(x * 0.02 + seed, i + t * 0.02, 2);
      const yOff = Math.sin(x / cloudW * Math.PI) * (15 + nVal * 10);
      if (x === 0) ctx.moveTo(cloudX + x, cloudY);
      else ctx.lineTo(cloudX + x, cloudY - yOff);
    }
    ctx.lineTo(cloudX + cloudW, cloudY);
    ctx.closePath();
    ctx.fillStyle = `hsla(285, 30%, 15%, ${0.05 + Math.sin(t * 0.2 + seed) * 0.02})`;
    ctx.fill();
  }

  // Twinkling stars in upper canvas
  for (let i = 0; i < 35; i++) {
    const seed = i * 197.3;
    const x = (Math.sin(seed * 3.1) * 0.5 + 0.5) * w;
    const y = (Math.sin(seed * 1.7) * 0.5 + 0.5) * h * 0.32;
    const twinkle = 0.5 + Math.sin(t * 1.2 + seed * 2.7) * 0.5;
    const size = 0.4 + Math.sin(seed * 0.9) * 0.3;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(50, 40%, 85%, ${twinkle * 0.12})`;
    ctx.fill();
  }

  // Parallax dust motes — 3 depth layers
  const mxp = mx * w;
  const myp = my * h;
  const layers = [
    { count: 25, speed: 2, sizeMin: 0.3, sizeMax: 0.6, alpha: 0.25 },  // far
    { count: 30, speed: 6, sizeMin: 0.6, sizeMax: 1.2, alpha: 0.4 },   // mid
    { count: 25, speed: 12, sizeMin: 1.0, sizeMax: 2.0, alpha: 0.55 }, // near
  ];

  for (const layer of layers) {
    for (let i = 0; i < layer.count; i++) {
      const seed = i * 91.3 + layer.speed * 17;
      const x = ((Math.sin(seed * 1.3) * 0.5 + 0.5) * w + t * (layer.speed + (i % 5) * (layer.speed * 0.3)) + Math.sin(t * 0.5 + seed) * 15) % w;
      const y = ((Math.cos(seed * 2.1) * 0.5 + 0.5) * h + Math.sin(t * 0.3 + seed * 0.7) * 25);
      const pulse = 0.3 + Math.sin(t * 1.5 + seed) * 0.3;
      const size = layer.sizeMin + Math.sin(seed * 0.8) * (layer.sizeMax - layer.sizeMin) * 0.5;
      const hue = 300 + Math.sin(seed * 0.4) * 40;

      // Mouse proximity boost
      const md = Math.hypot(x - mxp, y - myp);
      const mouseBoost = md < 100 ? (1 - md / 100) * 0.3 : 0;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 50%, 70%, ${pulse * layer.alpha + mouseBoost})`;
      ctx.fill();

      // Soft glow
      ctx.beginPath();
      ctx.arc(x, y, size * 5, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 40%, 60%, ${pulse * 0.04 + mouseBoost * 0.03})`;
      ctx.fill();
    }
  }
};
