import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

export const renderQuarry: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const background = ctx.createLinearGradient(0, 0, 0, h);
  background.addColorStop(0, "#110D0B");
  background.addColorStop(0.56, "#0B0807");
  background.addColorStop(1, "#050403");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const layers = 7;
  const lightShift = (mx - 0.5) * 40;
  for (let layer = 0; layer < layers; layer += 1) {
    const topY = h * (0.14 + layer * 0.12) + Math.sin(t * 0.16 + layer) * 10;
    const bottomY = topY + h * (0.14 + layer * 0.008);
    const segments = 6;
    const points: Array<[number, number]> = [];

    for (let i = 0; i <= segments; i += 1) {
      const x = (i / segments) * w;
      const y = topY + Math.sin(i * 0.9 + layer * 0.6 + t * 0.18) * 12 + (my - 0.5) * 10;
      points.push([x, y]);
    }
    for (let i = segments; i >= 0; i -= 1) {
      const x = (i / segments) * w;
      const y = bottomY + Math.cos(i * 0.8 + layer * 0.5 + t * 0.14) * 10;
      points.push([x, y]);
    }

    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i += 1) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();

    const fill = ctx.createLinearGradient(0, topY, w, bottomY);
    fill.addColorStop(0, `rgba(${60 + layer * 8}, ${44 + layer * 6}, ${35 + layer * 4}, 0.76)`);
    fill.addColorStop(1, `rgba(${26 + layer * 5}, ${20 + layer * 4}, ${16 + layer * 3}, 0.94)`);
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.beginPath();
    for (let i = 0; i <= segments; i += 1) {
      const x = (i / segments) * w;
      const y = topY + Math.sin(i * 0.9 + layer * 0.6 + t * 0.18) * 12 + (my - 0.5) * 10;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.strokeStyle = `rgba(${166 + layer * 6}, ${116 + layer * 4}, ${82 + layer * 2}, ${0.1 + layer * 0.01})`;
    ctx.lineWidth = 1.3;
    ctx.stroke();

    const seamX = ((layer * 73 + t * 36) % (w + 180)) - 90 + lightShift;
    const seam = ctx.createLinearGradient(seamX - 50, topY, seamX + 50, topY);
    seam.addColorStop(0, "rgba(255, 215, 170, 0)");
    seam.addColorStop(0.5, "rgba(255, 212, 170, 0.12)");
    seam.addColorStop(1, "rgba(255, 215, 170, 0)");
    ctx.fillStyle = seam;
    ctx.fillRect(seamX - 50, topY - 10, 100, bottomY - topY + 20);
  }

  for (let i = 0; i < 44; i += 1) {
    const seed = i * 0.63 + 0.2;
    const progress = (t * (0.03 + (i % 3) * 0.008) + seed * 0.2) % 1;
    const x = (Math.sin(seed * 4.1) * 0.5 + 0.5) * w;
    const y = h * 0.92 - progress * h * 0.84;
    ctx.beginPath();
    ctx.arc(x, y, 1.1, 0, TAU);
    ctx.fillStyle = `rgba(230, 205, 180, ${(1 - progress) * 0.12})`;
    ctx.fill();
  }
};
