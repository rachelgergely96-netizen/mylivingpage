import type { ThemeRenderer } from "../types";

export const renderPrism: ThemeRenderer = (ctx, w, h, t) => {
  const cx = w / 2;
  const cy = h / 2;

  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2 + t * 0.15;
    const len = w * 0.25 + Math.sin(t * 0.3 + i * 1.2) * w * 0.08;
    const spread = 0.06 + Math.sin(t * 0.2 + i) * 0.02;

    const offsets = [
      { hue: 0, offset: -spread },
      { hue: 120, offset: 0 },
      { hue: 240, offset: spread },
    ];

    offsets.forEach(({ hue, offset }) => {
      const a = angle + offset;
      const x1 = cx + Math.cos(a) * 20;
      const y1 = cy + Math.sin(a) * 20;
      const x2 = cx + Math.cos(a) * len;
      const y2 = cy + Math.sin(a) * len;

      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, `hsla(${hue + i * 30 + t * 10}, 80%, 55%, 0.12)`);
      grad.addColorStop(0.5, `hsla(${hue + i * 30 + t * 10 + 20}, 75%, 50%, 0.06)`);
      grad.addColorStop(1, "transparent");

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  for (let i = 0; i < 20; i += 1) {
    const seed = i * 67.3;
    const x = (Math.sin(t * 0.15 + seed) * 0.4 + 0.5) * w;
    const y = (Math.cos(t * 0.12 + seed * 1.3) * 0.4 + 0.5) * h;
    const r = 3 + Math.sin(t * 0.5 + i) * 2;
    const hue = (i * 36 + t * 15) % 360;

    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
    g.addColorStop(0, `hsla(${hue}, 80%, 60%, 0.12)`);
    g.addColorStop(0.5, `hsla(${hue + 30}, 70%, 50%, 0.04)`);
    g.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(x, y, r * 5, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }

  const prismG = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30);
  prismG.addColorStop(0, `rgba(255,255,255,${0.06 + Math.sin(t * 0.4) * 0.02})`);
  prismG.addColorStop(1, "transparent");
  ctx.fillStyle = prismG;
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.fill();
};
