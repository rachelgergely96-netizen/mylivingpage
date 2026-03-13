import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

interface Facet {
  points: Array<[number, number]>;
  fill: string;
  stroke: string;
}

function drawFacet(ctx: CanvasRenderingContext2D, facet: Facet) {
  ctx.beginPath();
  ctx.moveTo(facet.points[0][0], facet.points[0][1]);
  for (let i = 1; i < facet.points.length; i += 1) {
    ctx.lineTo(facet.points[i][0], facet.points[i][1]);
  }
  ctx.closePath();
  ctx.fillStyle = facet.fill;
  ctx.fill();
  ctx.strokeStyle = facet.stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}

export const renderRosaline: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#120B14");
  bg.addColorStop(0.48, "#0F0911");
  bg.addColorStop(1, "#050305");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const clusters = [
    { x: w * (0.28 + (mx - 0.5) * 0.04), y: h * 0.34, r: Math.min(w, h) * 0.16 },
    { x: w * 0.66, y: h * (0.56 + (my - 0.5) * 0.04), r: Math.min(w, h) * 0.2 },
  ];

  for (const cluster of clusters) {
    for (let i = 0; i < 9; i += 1) {
      const angle = i * 0.68 + t * 0.04;
      const inner = cluster.r * (0.22 + (i % 3) * 0.1);
      const outer = cluster.r * (0.58 + (i % 4) * 0.08);
      const points: Array<[number, number]> = [
        [cluster.x + Math.cos(angle) * inner, cluster.y + Math.sin(angle) * inner],
        [cluster.x + Math.cos(angle + 0.5) * outer, cluster.y + Math.sin(angle + 0.5) * outer],
        [cluster.x + Math.cos(angle + 1.08) * (outer * 0.86), cluster.y + Math.sin(angle + 1.08) * (outer * 0.86)],
      ];
      drawFacet(ctx, {
        points,
        fill: `rgba(${214 + i * 2},${126 + i * 5},${162 + i * 4},${0.08 + (i % 3) * 0.02})`,
        stroke: "rgba(255,225,236,0.08)",
      });
    }

    const glow = ctx.createRadialGradient(cluster.x, cluster.y, 0, cluster.x, cluster.y, cluster.r * 1.4);
    glow.addColorStop(0, "rgba(255, 212, 228, 0.12)");
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cluster.x, cluster.y, cluster.r * 1.4, 0, TAU);
    ctx.fill();
  }

  for (let i = 0; i < 50; i += 1) {
    const seed = i * 0.58;
    const x = (Math.sin(seed * 4.1) * 0.5 + 0.5) * w;
    const y = (Math.cos(seed * 3.9) * 0.5 + 0.5) * h;
    const alpha = 0.03 + (0.5 + 0.5 * Math.sin(t * 1.4 + seed * 7)) * 0.08;
    ctx.beginPath();
    ctx.arc(x, y, 1.1, 0, TAU);
    ctx.fillStyle = `rgba(255,224,236,${alpha})`;
    ctx.fill();
  }
};
