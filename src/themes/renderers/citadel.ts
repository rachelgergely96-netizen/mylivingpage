import type { ThemeRenderer } from "../types";

export const renderCitadel: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#0A1019");
  sky.addColorStop(0.58, "#070B12");
  sky.addColorStop(1, "#030406");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const vanishX = w * (0.5 + (mx - 0.5) * 0.18);
  const horizon = h * (0.3 + (my - 0.5) * 0.06);
  const corridorY = h * 0.8;

  const floor = ctx.createLinearGradient(0, horizon, 0, h);
  floor.addColorStop(0, "rgba(24,30,40,0)");
  floor.addColorStop(1, "rgba(8,10,14,0.95)");
  ctx.fillStyle = floor;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w * 0.18, corridorY);
  ctx.lineTo(w * 0.82, corridorY);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  const drawTower = (x: number, width: number, topY: number, lean: number, alpha: number) => {
    const offsetTop = (vanishX - x) * lean;
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.lineTo(x + offsetTop, topY);
    ctx.lineTo(x + width + offsetTop, topY);
    ctx.lineTo(x + width, h);
    ctx.closePath();

    const fill = ctx.createLinearGradient(x, topY, x + width, h);
    fill.addColorStop(0, `rgba(${26 + alpha * 24},${31 + alpha * 18},${40 + alpha * 18},0.94)`);
    fill.addColorStop(1, "rgba(6,8,10,0.98)");
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.strokeStyle = `rgba(126,160,214,${0.06 + alpha * 0.06})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    const slitCount = 6;
    for (let i = 0; i < slitCount; i += 1) {
      const progress = (i + 1) / (slitCount + 1);
      const y = topY + progress * (h - topY - 26);
      const sweep = (t * 0.35 + progress * 0.8 + alpha) % 1;
      const intensity = Math.max(0, 1 - Math.abs(sweep - progress) * 4);
      const slitX = x + width * (0.22 + (i % 3) * 0.2);
      const slitW = Math.max(2, width * 0.08);
      const slitH = 12 + intensity * 16;
      ctx.fillStyle = `rgba(190,214,255,${0.03 + intensity * 0.2})`;
      ctx.fillRect(slitX, y, slitW, slitH);
    }
  };

  for (let i = 0; i < 6; i += 1) {
    const x = w * (0.02 + i * 0.1);
    drawTower(x, w * (0.06 + i * 0.008), h * (0.12 + i * 0.06), 0.08, 0.2 + i * 0.08);
  }

  for (let i = 0; i < 6; i += 1) {
    const width = w * (0.06 + i * 0.008);
    const x = w - width - w * (0.02 + i * 0.1);
    drawTower(x, width, h * (0.12 + i * 0.06), -0.08, 0.2 + i * 0.08);
  }

  for (let i = 0; i < 9; i += 1) {
    const y = corridorY + (i / 9) * (h - corridorY);
    ctx.beginPath();
    ctx.moveTo(vanishX, horizon);
    ctx.lineTo(w * 0.18 + (i / 9) * w * 0.08, y);
    ctx.moveTo(vanishX, horizon);
    ctx.lineTo(w * 0.82 - (i / 9) * w * 0.08, y);
    ctx.strokeStyle = `rgba(118,150,210,${0.02 + (1 - i / 9) * 0.06})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
};
