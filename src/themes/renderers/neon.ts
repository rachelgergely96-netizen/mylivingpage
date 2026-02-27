import type { ThemeRenderer } from "../types";

export const renderNeon: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const vpX = w * (0.5 + (mx - 0.5) * 0.15);
  const vpY = h * (0.25 + (my - 0.5) * 0.1);

  // Horizon glow
  const horizon = ctx.createRadialGradient(vpX, h * 0.65, 0, vpX, h * 0.6, w * 0.7);
  horizon.addColorStop(0, "hsla(295, 80%, 40%, 0.06)");
  horizon.addColorStop(0.4, "hsla(280, 70%, 25%, 0.03)");
  horizon.addColorStop(1, "transparent");
  ctx.fillStyle = horizon;
  ctx.fillRect(0, 0, w, h);

  // Perspective grid — horizontal lines
  const horizonY = h * 0.55;
  for (let i = 1; i <= 14; i += 1) {
    const ratio = i / 14;
    const y = horizonY + (h - horizonY) * Math.pow(ratio, 1.8);
    const spread = ratio * 0.8 + 0.2;
    const x1 = vpX - (w * spread);
    const x2 = vpX + (w * spread);
    const pulse = Math.sin(t * 0.5 + i * 0.4) * 0.02;
    const alpha = 0.03 + ratio * 0.04 + pulse;

    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.strokeStyle = `hsla(290, 85%, 60%, ${alpha})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // Perspective grid — vertical lines
  for (let i = -6; i <= 6; i += 1) {
    const baseX = vpX + i * (w / 8);
    const alpha = 0.02 + Math.abs(i) * 0.005;

    ctx.beginPath();
    ctx.moveTo(vpX, vpY);
    ctx.lineTo(baseX, h);
    ctx.strokeStyle = `hsla(310, 80%, 55%, ${alpha})`;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  // Scan line
  const scanY = horizonY + ((t * 20) % (h - horizonY));
  const scanGrad = ctx.createLinearGradient(0, scanY - 2, 0, scanY + 2);
  scanGrad.addColorStop(0, "transparent");
  scanGrad.addColorStop(0.5, "hsla(180, 90%, 65%, 0.06)");
  scanGrad.addColorStop(1, "transparent");
  ctx.fillStyle = scanGrad;
  ctx.fillRect(0, scanY - 2, w, 4);

  // Light streaks racing along grid
  for (let i = 0; i < 8; i += 1) {
    const seed = i * 71.3;
    const speed = 0.3 + (i % 4) * 0.15;
    const progress = ((t * speed + seed) % 4) / 4;
    const lane = Math.floor(Math.sin(seed) * 5);
    const ratio = 0.1 + progress * 0.9;
    const y = horizonY + (h - horizonY) * Math.pow(ratio, 1.8);
    const spread = ratio * 0.6;
    const x = vpX + lane * (w * spread / 5);
    const size = 2 + ratio * 3;
    const hue = 180 + Math.sin(seed) * 120;

    // Streak trail
    const prevRatio = Math.max(0.1, ratio - 0.05);
    const prevY = horizonY + (h - horizonY) * Math.pow(prevRatio, 1.8);
    const grad = ctx.createLinearGradient(x, prevY, x, y);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(1, `hsla(${hue}, 90%, 65%, ${0.15 * ratio})`);
    ctx.beginPath();
    ctx.moveTo(x, prevY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = grad;
    ctx.lineWidth = size * 0.5;
    ctx.stroke();

    // Streak head
    ctx.beginPath();
    ctx.arc(x, y, size * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 85%, 70%, ${0.3 * ratio})`;
    ctx.fill();

    // Glow
    ctx.beginPath();
    ctx.arc(x, y, size * 4, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${0.04 * ratio})`;
    ctx.fill();
  }

  // Sun/vanishing point glow
  const sun = ctx.createRadialGradient(vpX, vpY, 0, vpX, vpY, w * 0.15);
  sun.addColorStop(0, `hsla(300, 80%, 60%, ${0.06 + Math.sin(t * 0.4) * 0.02})`);
  sun.addColorStop(0.5, "hsla(280, 70%, 50%, 0.02)");
  sun.addColorStop(1, "transparent");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);
};
