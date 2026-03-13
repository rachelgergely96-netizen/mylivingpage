import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

export const renderHelix: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#090E18");
  bg.addColorStop(0.56, "#080C14");
  bg.addColorStop(1, "#030509");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const cx = w * (0.5 + (mx - 0.5) * 0.08);
  const amplitude = w * 0.12;
  const strandWidth = 4;

  const strandA: Array<[number, number]> = [];
  const strandB: Array<[number, number]> = [];

  for (let y = -20; y <= h + 20; y += 8) {
    const phase = y * 0.032 - t * 1.8;
    const xA = cx + Math.sin(phase) * amplitude;
    const xB = cx - Math.sin(phase) * amplitude;
    strandA.push([xA, y]);
    strandB.push([xB, y]);

    if (Math.cos(phase) > 0) {
      ctx.beginPath();
      ctx.moveTo(xA, y);
      ctx.lineTo(xB, y);
      ctx.strokeStyle = "rgba(196,214,240,0.16)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  const drawStrand = (points: Array<[number, number]>, stroke: string) => {
    ctx.beginPath();
    points.forEach(([x, y], index) => {
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strandWidth;
    ctx.stroke();
  };

  drawStrand(strandA, "rgba(220,228,240,0.72)");
  drawStrand(strandB, "rgba(124,168,230,0.72)");

  for (let i = 0; i < 6; i += 1) {
    const progress = (t * (0.08 + i * 0.01) + i * 0.16) % 1;
    const y = progress * h;
    const phase = y * 0.032 - t * 1.8;
    const orbitRadius = 22 + Math.sin(i) * 4 + (my - 0.5) * 10;
    const orbitAngle = t * 1.6 + i;
    const x = cx + Math.sin(phase) * amplitude + Math.cos(orbitAngle) * orbitRadius * 0.35;
    const size = 2 + (0.5 + 0.5 * Math.sin(orbitAngle)) * 2;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, TAU);
    ctx.fillStyle = "rgba(240,246,255,0.84)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, size * 4, 0, TAU);
    ctx.fillStyle = "rgba(126,182,255,0.08)";
    ctx.fill();
  }
};
