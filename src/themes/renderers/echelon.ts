import type { ThemeRenderer } from "../types";

export const renderEchelon: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#0A1017");
  bg.addColorStop(0.56, "#070B11");
  bg.addColorStop(1, "#030507");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  for (let layer = 0; layer < 7; layer += 1) {
    const y = h * (0.12 + layer * 0.11) + Math.sin(t * 0.18 + layer) * 8 + (my - 0.5) * 10;
    const width = w * (0.38 + layer * 0.06);
    const height = 20 + layer * 4;
    const offset = Math.sin(t * 0.22 + layer * 0.8) * 28 + (mx - 0.5) * 40;
    const centerX = w * 0.5 + offset;

    ctx.beginPath();
    ctx.moveTo(centerX - width / 2, y);
    ctx.lineTo(centerX - width / 2 + 34, y - height);
    ctx.lineTo(centerX + width / 2, y - height);
    ctx.lineTo(centerX + width / 2 - 34, y);
    ctx.closePath();
    ctx.fillStyle = `rgba(${30 + layer * 8},${38 + layer * 8},${48 + layer * 8},0.9)`;
    ctx.fill();

    const sweepX = centerX - width / 2 + ((t * 90 + layer * 70) % (width + 100)) - 50;
    const sweep = ctx.createLinearGradient(sweepX - 30, y - height, sweepX + 30, y);
    sweep.addColorStop(0, "rgba(255,255,255,0)");
    sweep.addColorStop(0.5, "rgba(180,210,255,0.18)");
    sweep.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sweep;
    ctx.fillRect(centerX - width / 2, y - height - 2, width, height + 4);

    ctx.strokeStyle = "rgba(150,185,235,0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
};
