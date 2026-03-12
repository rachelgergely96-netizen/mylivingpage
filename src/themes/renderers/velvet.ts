import type { ThemeRenderer } from "../types";

function drawFold(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  width: number,
  height: number,
  phase: number,
  t: number,
) {
  const pointsLeft: Array<[number, number]> = [];
  const pointsRight: Array<[number, number]> = [];

  for (let y = 0; y <= height; y += 14) {
    const sway = Math.sin(y * 0.007 + t * 0.6 + phase) * 14;
    const pinch = Math.sin(y * 0.012 + phase) * width * 0.08;
    pointsLeft.push([centerX - width / 2 + sway - pinch, y]);
    pointsRight.push([centerX + width / 2 + sway + pinch, y]);
  }

  ctx.beginPath();
  ctx.moveTo(pointsLeft[0][0], pointsLeft[0][1]);
  for (let i = 1; i < pointsLeft.length; i += 1) {
    ctx.lineTo(pointsLeft[i][0], pointsLeft[i][1]);
  }
  for (let i = pointsRight.length - 1; i >= 0; i -= 1) {
    ctx.lineTo(pointsRight[i][0], pointsRight[i][1]);
  }
  ctx.closePath();
}

export const renderVelvet: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const background = ctx.createLinearGradient(0, 0, 0, h);
  background.addColorStop(0, "#1A0711");
  background.addColorStop(0.5, "#14060E");
  background.addColorStop(1, "#080307");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const highlightShift = (mx - 0.5) * w * 0.14;
  const foldCount = 7;
  const verticalDrift = (my - 0.5) * 10;

  for (let i = 0; i < foldCount; i += 1) {
    const centerX = w * (0.08 + i * 0.14) + highlightShift * (0.3 + i * 0.08);
    const foldWidth = w * 0.13;
    const phase = i * 0.8;
    drawFold(ctx, centerX, foldWidth, h, phase + verticalDrift * 0.02, t);

    const gradient = ctx.createLinearGradient(centerX - foldWidth / 2, 0, centerX + foldWidth / 2, 0);
    gradient.addColorStop(0, "rgba(49, 7, 27, 0.86)");
    gradient.addColorStop(0.28, "rgba(94, 14, 48, 0.92)");
    gradient.addColorStop(0.52, `rgba(${166 + i * 8}, ${58 + i * 3}, ${104 + i * 4}, 0.62)`);
    gradient.addColorStop(0.78, "rgba(87, 12, 46, 0.92)");
    gradient.addColorStop(1, "rgba(40, 6, 20, 0.88)");
    ctx.fillStyle = gradient;
    ctx.fill();

    const sheenX = centerX + Math.sin(t * 0.5 + phase) * 18 + highlightShift * 0.4;
    const sheen = ctx.createLinearGradient(sheenX - 10, 0, sheenX + 10, 0);
    sheen.addColorStop(0, "rgba(255, 255, 255, 0)");
    sheen.addColorStop(0.5, "rgba(255, 221, 204, 0.12)");
    sheen.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = sheen;
    ctx.fill();
  }

  for (let i = 0; i < 52; i += 1) {
    const seed = i * 0.58 + 0.2;
    const x = (Math.sin(seed * 4.4) * 0.5 + 0.5) * w + Math.sin(t * 0.14 + seed) * 8;
    const y = (Math.cos(seed * 3.5) * 0.5 + 0.5) * h + Math.cos(t * 0.12 + seed) * 8;
    const alpha = 0.03 + (0.5 + 0.5 * Math.sin(t * 1.2 + seed * 6)) * 0.08;
    ctx.beginPath();
    ctx.arc(x, y, 1.1, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 221, 175, ${alpha})`;
    ctx.fill();
  }
};
