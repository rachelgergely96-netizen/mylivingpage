import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

function drawCurl(ctx: CanvasRenderingContext2D, radius: number) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(radius * 0.18, -radius * 0.1, radius * 0.46, -radius * 0.28, radius * 0.58, -radius * 0.02);
  ctx.bezierCurveTo(radius * 0.7, radius * 0.2, radius * 0.36, radius * 0.32, radius * 0.22, radius * 0.08);
}

export const renderFiligree: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const background = ctx.createLinearGradient(0, 0, w, h);
  background.addColorStop(0, "#120C1B");
  background.addColorStop(0.45, "#0C1020");
  background.addColorStop(1, "#05060A");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.5;
  const cy = h * 0.5;
  const baseRotation = t * 0.08 + (mx - 0.5) * 0.2;

  for (let arm = 0; arm < 8; arm += 1) {
    const angle = baseRotation + (arm / 8) * TAU;
    for (let layer = 0; layer < 3; layer += 1) {
      const radius = Math.min(w, h) * (0.14 + layer * 0.09);
      ctx.save();
      ctx.translate(cx, cy + (my - 0.5) * 20);
      ctx.rotate(angle + layer * 0.08);
      drawCurl(ctx, radius);
      ctx.strokeStyle = `rgba(${215 + layer * 12}, ${188 + layer * 10}, ${154 + layer * 8}, ${0.16 - layer * 0.03})`;
      ctx.lineWidth = 1.3 - layer * 0.18;
      ctx.stroke();

      drawCurl(ctx, radius * 0.62);
      ctx.strokeStyle = `rgba(255, 244, 227, ${0.12 - layer * 0.02})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();

      const dotX = cx + Math.cos(angle) * radius * 0.6;
      const dotY = cy + Math.sin(angle) * radius * 0.6;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 2, 0, TAU);
      ctx.fillStyle = `rgba(255, 236, 214, ${0.18 - layer * 0.03})`;
      ctx.fill();
    }
  }

  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.45);
  halo.addColorStop(0, "rgba(255, 219, 182, 0.08)");
  halo.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);
};
