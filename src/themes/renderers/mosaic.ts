import { noise2D } from "../shared/noise";
import type { ThemeRenderer } from "../types";

function drawDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - ry);
  ctx.lineTo(cx + rx, cy);
  ctx.lineTo(cx, cy + ry);
  ctx.lineTo(cx - rx, cy);
  ctx.closePath();
}

export const renderMosaic: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const background = ctx.createLinearGradient(0, 0, w, h);
  background.addColorStop(0, "#090E1B");
  background.addColorStop(0.45, "#091320");
  background.addColorStop(1, "#05060B");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const tile = Math.max(34, Math.min(62, Math.min(w, h) * 0.09));
  const ry = tile * 0.54;
  const rows = Math.ceil(h / ry) + 2;
  const cols = Math.ceil(w / tile) + 2;
  const pointerX = mx * w;
  const pointerY = my * h;

  for (let row = -1; row < rows; row += 1) {
    for (let col = -1; col < cols; col += 1) {
      const cx = col * tile + (row % 2 === 0 ? 0 : tile * 0.5);
      const cy = row * ry;
      const noise = noise2D(cx * 0.009 + t * 0.08, cy * 0.009 - t * 0.06);
      const hue = 190 + noise * 44 + Math.sin((cx + cy) * 0.002 + t * 0.2) * 16;
      const sat = 38 + (noise * 0.5 + 0.5) * 30;
      const light = 18 + (noise * 0.5 + 0.5) * 20;
      const dist = Math.hypot(cx - pointerX, cy - pointerY);
      const pointerBoost = dist < tile * 2.2 ? (1 - dist / (tile * 2.2)) * 18 : 0;
      const sweep = Math.sin((cx * 0.012 + cy * 0.01) - t * 1.4) * 0.5 + 0.5;

      drawDiamond(ctx, cx, cy, tile * 0.52, ry);
      ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light + pointerBoost}%, ${0.74 + sweep * 0.08})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(235, 247, 255, ${0.05 + sweep * 0.06})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      if (sweep > 0.9 || pointerBoost > 4) {
        drawDiamond(ctx, cx, cy, tile * 0.36, ry * 0.7);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.04 + sweep * 0.1 + pointerBoost * 0.002})`;
        ctx.fill();
      }
    }
  }

  const caustic = ctx.createLinearGradient(0, 0, w, h);
  caustic.addColorStop(0, "rgba(255, 255, 255, 0)");
  caustic.addColorStop(0.46, "rgba(176, 220, 255, 0.04)");
  caustic.addColorStop(0.54, "rgba(255, 213, 233, 0.09)");
  caustic.addColorStop(0.62, "rgba(255, 255, 255, 0)");
  ctx.save();
  ctx.translate(Math.sin(t * 0.28) * w * 0.08, Math.cos(t * 0.22) * h * 0.04);
  ctx.rotate(-0.18);
  ctx.fillStyle = caustic;
  ctx.fillRect(-w * 0.25, h * 0.18, w * 1.5, h * 0.22);
  ctx.restore();
};
