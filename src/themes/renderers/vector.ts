import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

function drawReticle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, alpha: number) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.strokeStyle = `rgba(165, 212, 255, ${alpha})`;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x - radius - 10, y);
  ctx.lineTo(x + radius + 10, y);
  ctx.moveTo(x, y - radius - 10);
  ctx.lineTo(x, y + radius + 10);
  ctx.strokeStyle = `rgba(165, 212, 255, ${alpha * 0.6})`;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, radius * 0.42, 0, TAU);
  ctx.strokeStyle = `rgba(232, 247, 255, ${alpha * 0.7})`;
  ctx.stroke();
}

export const renderVector: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const background = ctx.createLinearGradient(0, 0, 0, h);
  background.addColorStop(0, "#091225");
  background.addColorStop(0.54, "#071120");
  background.addColorStop(1, "#040811");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const minor = 28;
  const major = minor * 4;
  for (let x = 0; x <= w; x += minor) {
    ctx.strokeStyle = `rgba(111, 164, 255, ${x % major === 0 ? 0.08 : 0.03})`;
    ctx.lineWidth = x % major === 0 ? 1 : 0.6;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += minor) {
    ctx.strokeStyle = `rgba(111, 164, 255, ${y % major === 0 ? 0.08 : 0.03})`;
    ctx.lineWidth = y % major === 0 ? 1 : 0.6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  ctx.setLineDash([8, 10]);
  ctx.strokeStyle = "rgba(180, 220, 255, 0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.2);
  ctx.lineTo(w, h * 0.8);
  ctx.moveTo(0, h * 0.78);
  ctx.lineTo(w, h * 0.24);
  ctx.stroke();
  ctx.setLineDash([]);

  const scanX = (t * 85) % (w + 80) - 40;
  const scanY = (t * 52) % (h + 80) - 40;
  ctx.fillStyle = "rgba(140, 204, 255, 0.08)";
  ctx.fillRect(scanX, 0, 22, h);
  ctx.fillRect(0, scanY, w, 14);

  const points: Array<[number, number, number]> = [
    [w * 0.2 + Math.sin(t * 0.4) * 30, h * 0.26 + Math.cos(t * 0.35) * 20, 28],
    [w * 0.78 + Math.cos(t * 0.52) * 24, h * 0.36 + Math.sin(t * 0.48) * 16, 34],
    [mx * w, my * h, 38],
  ];

  ctx.strokeStyle = "rgba(150, 209, 255, 0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  ctx.lineTo(points[1][0], points[1][1]);
  ctx.lineTo(points[2][0], points[2][1]);
  ctx.stroke();

  for (let i = 0; i < points.length; i += 1) {
    const [x, y, radius] = points[i];
    drawReticle(ctx, x, y, radius + Math.sin(t * 0.8 + i) * 4, 0.28 - i * 0.05);

    const orbitAngle = t * (0.6 + i * 0.14) + i;
    const orbitX = x + Math.cos(orbitAngle) * (radius + 16);
    const orbitY = y + Math.sin(orbitAngle) * (radius + 16);
    ctx.beginPath();
    ctx.rect(orbitX - 4, orbitY - 4, 8, 8);
    ctx.strokeStyle = "rgba(233, 245, 255, 0.24)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  for (let i = 0; i < 24; i += 1) {
    const seed = i * 0.49 + 0.2;
    const x = (Math.sin(seed * 4.6) * 0.5 + 0.5) * w;
    const y = (Math.cos(seed * 3.2) * 0.5 + 0.5) * h;
    const alpha = 0.03 + (0.5 + 0.5 * Math.sin(t * 1.2 + seed * 7)) * 0.08;

    ctx.beginPath();
    ctx.arc(x, y, 1.2, 0, TAU);
    ctx.fillStyle = `rgba(214, 240, 255, ${alpha})`;
    ctx.fill();
  }
};
