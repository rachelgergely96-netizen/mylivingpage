import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

export const renderCameo: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const background = ctx.createLinearGradient(0, 0, 0, h);
  background.addColorStop(0, "#130C16");
  background.addColorStop(0.52, "#0F0A13");
  background.addColorStop(1, "#060508");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const medallions: Array<[number, number, number, number]> = [
    [w * 0.28, h * 0.34, Math.min(w, h) * 0.12, 0.76],
    [w * 0.7, h * 0.42, Math.min(w, h) * 0.15, 0.7],
    [w * 0.5, h * 0.72, Math.min(w, h) * 0.22, 0.62],
  ];

  for (let i = 0; i < medallions.length; i += 1) {
    const [baseX, baseY, radius, alpha] = medallions[i];
    const x = baseX + Math.sin(t * (0.16 + i * 0.02) + i) * 12 + (mx - 0.5) * 16;
    const y = baseY + Math.cos(t * (0.12 + i * 0.02) + i * 0.8) * 10 + (my - 0.5) * 10;

    ctx.beginPath();
    ctx.ellipse(x + radius * 0.1, y + radius * 0.12, radius * 1.12, radius * 0.8, 0, 0, TAU);
    ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
    ctx.fill();

    const outer = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
    outer.addColorStop(0, `rgba(248, 233, 225, ${alpha})`);
    outer.addColorStop(1, `rgba(196, 170, 181, ${alpha})`);
    ctx.beginPath();
    ctx.ellipse(x, y, radius * 1.05, radius * 0.74, 0, 0, TAU);
    ctx.fillStyle = outer;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(x, y, radius * 0.86, radius * 0.58, 0, 0, TAU);
    ctx.fillStyle = "rgba(112, 82, 103, 0.3)";
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(x - radius * 0.12, y - radius * 0.08, radius * 0.72, radius * 0.48, 0, 0, TAU);
    ctx.fillStyle = `rgba(255, 247, 240, ${0.16 + i * 0.02})`;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(x, y, radius * 1.05, radius * 0.74, 0, Math.PI * 1.08, Math.PI * 1.92);
    ctx.strokeStyle = "rgba(255, 252, 246, 0.16)";
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  for (let i = 0; i < 42; i += 1) {
    const seed = i * 0.64 + 0.2;
    const x = (Math.sin(seed * 4.2) * 0.5 + 0.5) * w + Math.sin(t * 0.18 + seed) * 10;
    const y = (Math.cos(seed * 3.8) * 0.5 + 0.5) * h + Math.cos(t * 0.12 + seed) * 8;
    const alpha = 0.03 + (0.5 + 0.5 * Math.sin(t * 1.3 + seed * 8)) * 0.08;
    ctx.beginPath();
    ctx.arc(x, y, 1.2, 0, TAU);
    ctx.fillStyle = `rgba(255, 236, 226, ${alpha})`;
    ctx.fill();
  }
};
