import type { ThemeRenderer } from "../types";

export const renderVellum: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#17131A");
  bg.addColorStop(0.46, "#14131A");
  bg.addColorStop(1, "#0A090D");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  for (let layer = 0; layer < 5; layer += 1) {
    const top = h * (0.08 + layer * 0.12) + Math.sin(t * (0.18 + layer * 0.04) + layer) * 18 + (my - 0.5) * 18;
    const bottom = top + h * (0.22 + layer * 0.015);
    const drift = (mx - 0.5) * (16 + layer * 4);

    ctx.beginPath();
    ctx.moveTo(-20, bottom);
    ctx.bezierCurveTo(w * 0.16 + drift, top + 18, w * 0.34 + drift, top - 10, w * 0.52 + drift, top + 16);
    ctx.bezierCurveTo(w * 0.72 + drift, top + 28, w * 0.9 + drift, top - 8, w + 20, top + 24);
    ctx.lineTo(w + 20, h + 20);
    ctx.lineTo(-20, h + 20);
    ctx.closePath();

    ctx.fillStyle = `rgba(${242 - layer * 10},${232 - layer * 8},${226 - layer * 6},${0.08 + layer * 0.03})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(255,248,240,${0.08 + layer * 0.02})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
};
