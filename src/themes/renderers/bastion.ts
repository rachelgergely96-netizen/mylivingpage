import { noise2D } from "../shared/noise";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

function drawHexagon(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = -Math.PI / 2 + (i / 6) * TAU;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
}

export const renderBastion: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const background = ctx.createLinearGradient(0, 0, 0, h);
  background.addColorStop(0, "#0B1018");
  background.addColorStop(0.55, "#090D13");
  background.addColorStop(1, "#040507");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const radius = Math.max(24, Math.min(44, Math.min(w, h) * 0.07));
  const stepX = radius * 1.6;
  const stepY = radius * 1.4;
  const pointerX = mx * w;
  const pointerY = my * h;

  for (let row = -1; row < Math.ceil(h / stepY) + 2; row += 1) {
    for (let col = -1; col < Math.ceil(w / stepX) + 2; col += 1) {
      const cx = col * stepX + (row % 2 === 0 ? 0 : stepX * 0.5);
      const cy = row * stepY;
      const noise = noise2D(cx * 0.012 + t * 0.05, cy * 0.012 - t * 0.03);
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.9 + col * 0.4 + row * 0.35);
      const dist = Math.hypot(cx - pointerX, cy - pointerY);
      const mouseBoost = dist < radius * 2.6 ? 1 - dist / (radius * 2.6) : 0;
      const light = 16 + (noise * 0.5 + 0.5) * 18 + mouseBoost * 18;
      const alpha = 0.58 + pulse * 0.08;

      drawHexagon(ctx, cx, cy, radius);
      ctx.fillStyle = `hsla(${212 + noise * 18}, 22%, ${light}%, ${alpha})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(170, 206, 255, ${0.08 + pulse * 0.08 + mouseBoost * 0.18})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      if (pulse > 0.86 || mouseBoost > 0.16) {
        drawHexagon(ctx, cx, cy, radius * 0.58);
        ctx.strokeStyle = `rgba(228, 240, 255, ${0.08 + pulse * 0.14 + mouseBoost * 0.2})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }
  }

  const sweep = ctx.createLinearGradient(-w * 0.2, 0, w * 1.2, h);
  sweep.addColorStop(0.4, "rgba(0, 0, 0, 0)");
  sweep.addColorStop(0.5, "rgba(148, 196, 255, 0.06)");
  sweep.addColorStop(0.6, "rgba(0, 0, 0, 0)");
  ctx.save();
  ctx.translate(Math.sin(t * 0.2) * w * 0.1, 0);
  ctx.rotate(-0.16);
  ctx.fillStyle = sweep;
  ctx.fillRect(-w * 0.2, h * 0.08, w * 1.5, h * 0.26);
  ctx.restore();
};
