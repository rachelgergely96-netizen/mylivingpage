import { fbm, noise2D } from "../shared/noise";
import type { ThemeRenderer } from "../types";

export const renderFresco: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#16110E");
  bg.addColorStop(0.54, "#120F0D");
  bg.addColorStop(1, "#080706");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const tile = 36;
  for (let x = 0; x < w; x += tile) {
    for (let y = 0; y < h; y += tile) {
      const n = fbm(x * 0.01 + t * 0.04, y * 0.01 - t * 0.03, 4);
      const warm = 0.5 + 0.5 * noise2D(x * 0.02 + 40, y * 0.02);
      const r = 76 + n * 24 + warm * 18;
      const g = 58 + n * 18 + warm * 14;
      const b = 44 + n * 12 + warm * 10;
      ctx.fillStyle = `rgba(${r},${g},${b},0.3)`;
      ctx.fillRect(x, y, tile + 2, tile + 2);
    }
  }

  for (let i = 0; i < 9; i += 1) {
    const cx = w * (0.08 + i * 0.1) + Math.sin(t * 0.08 + i) * 18 + (mx - 0.5) * 20;
    const cy = h * (0.18 + (i % 4) * 0.18) + Math.cos(t * 0.09 + i) * 12 + (my - 0.5) * 16;
    const radius = 60 + (i % 3) * 22;
    const wash = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    wash.addColorStop(0, `rgba(${164 + i * 4},${118 + i * 3},${92 + i * 2},0.12)`);
    wash.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = wash;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 26; i += 1) {
    const startX = w * ((i % 7) / 7) + Math.sin(i * 0.7 + t * 0.1) * 10;
    const startY = h * ((i % 5) / 5) + Math.cos(i * 0.9 + t * 0.12) * 10;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    let x = startX;
    let y = startY;
    for (let step = 0; step < 7; step += 1) {
      const angle = noise2D(x * 0.02 + t * 0.06, y * 0.02 - t * 0.04) * Math.PI * 1.2;
      x += Math.cos(angle) * 20;
      y += Math.sin(angle) * 14;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(215,194,164,0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
};
