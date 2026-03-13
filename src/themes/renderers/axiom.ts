import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

interface NodePoint {
  x: number;
  y: number;
}

const NODES: NodePoint[] = [
  { x: 0.16, y: 0.26 },
  { x: 0.34, y: 0.2 },
  { x: 0.58, y: 0.24 },
  { x: 0.78, y: 0.18 },
  { x: 0.22, y: 0.56 },
  { x: 0.46, y: 0.48 },
  { x: 0.7, y: 0.58 },
  { x: 0.86, y: 0.42 },
];

const EDGES: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [0, 4],
  [1, 5],
  [2, 5],
  [2, 6],
  [3, 7],
  [4, 5],
  [5, 6],
  [6, 7],
];

export const renderAxiom: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#07111A");
  bg.addColorStop(0.55, "#071019");
  bg.addColorStop(1, "#03070B");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  for (let x = 0; x <= w; x += 36) {
    ctx.strokeStyle = "rgba(120,155,215,0.03)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += 36) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const points = NODES.map((node, index) => ({
    x: w * node.x + Math.sin(t * (0.25 + index * 0.02) + index) * 10 + (mx - 0.5) * 14,
    y: h * node.y + Math.cos(t * (0.2 + index * 0.03) + index) * 8 + (my - 0.5) * 12,
  }));

  for (const [fromIndex, toIndex] of EDGES) {
    const from = points[fromIndex];
    const to = points[toIndex];
    const pulse = (t * 0.18 + fromIndex * 0.13 + toIndex * 0.09) % 1;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = "rgba(142,186,255,0.14)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const px = from.x + (to.x - from.x) * pulse;
    const py = from.y + (to.y - from.y) * pulse;
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, TAU);
    ctx.fillStyle = "rgba(234,243,255,0.72)";
    ctx.fill();
  }

  for (let i = 0; i < points.length - 2; i += 2) {
    const a = points[i];
    const b = points[i + 1];
    const radius = Math.hypot(b.x - a.x, b.y - a.y) * 0.8;
    ctx.beginPath();
    ctx.arc((a.x + b.x) / 2, (a.y + b.y) / 2, radius, Math.PI * 1.1 + i * 0.08, Math.PI * 1.6 + i * 0.08);
    ctx.strokeStyle = `rgba(118,178,255,${0.08 + i * 0.01})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    const glow = 0.08 + 0.12 * (0.5 + 0.5 * Math.sin(t * 1.2 + i * 1.4));
    ctx.beginPath();
    ctx.arc(point.x, point.y, 6, 0, TAU);
    ctx.fillStyle = `rgba(130,180,255,${glow * 0.25})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2.4, 0, TAU);
    ctx.fillStyle = "rgba(235,245,255,0.8)";
    ctx.fill();
  }
};
