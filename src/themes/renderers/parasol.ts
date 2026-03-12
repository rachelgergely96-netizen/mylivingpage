import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

export const renderParasol: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const background = ctx.createLinearGradient(0, 0, 0, h);
  background.addColorStop(0, "#140913");
  background.addColorStop(0.55, "#110811");
  background.addColorStop(1, "#060306");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const fans: Array<[number, number, number, number, number]> = [
    [w * 0.18, h * 0.86, Math.min(w, h) * 0.42, -1.2, 0.2],
    [w * 0.86, h * 0.72, Math.min(w, h) * 0.34, Math.PI * 0.95, Math.PI * 1.55],
    [w * 0.52, h * 0.96, Math.min(w, h) * 0.28, -1.55, -0.1],
  ];

  for (let i = 0; i < fans.length; i += 1) {
    const [cx, baseCy, radius, startAngle, endAngle] = fans[i];
    const cy = baseCy + (my - 0.5) * (12 - i * 2);
    const pleats = 16 + i * 4;
    const shift = Math.sin(t * 0.24 + i) * 0.06 + (mx - 0.5) * 0.08;

    for (let pleat = 0; pleat < pleats; pleat += 1) {
      const a1 = startAngle + ((endAngle - startAngle) * pleat) / pleats + shift;
      const a2 = startAngle + ((endAngle - startAngle) * (pleat + 1)) / pleats + shift;
      const hue = 320 + pleat * 2 + i * 12;
      const light = 24 + (pleat % 2 === 0 ? 8 : 2);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a1) * radius, cy + Math.sin(a1) * radius);
      ctx.lineTo(cx + Math.cos(a2) * radius, cy + Math.sin(a2) * radius);
      ctx.closePath();
      ctx.fillStyle = `hsla(${hue}, 42%, ${light}%, 0.62)`;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a1) * radius, cy + Math.sin(a1) * radius);
      ctx.strokeStyle = "rgba(255, 227, 219, 0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle + shift, endAngle + shift);
    ctx.strokeStyle = "rgba(255, 238, 228, 0.14)";
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  for (let i = 0; i < 28; i += 1) {
    const seed = i * 0.57 + 0.2;
    const x = (Math.sin(seed * 4.4) * 0.5 + 0.5) * w;
    const y = (Math.cos(seed * 3.7) * 0.5 + 0.5) * h - Math.sin(t * 0.14 + seed) * 12;
    ctx.beginPath();
    ctx.arc(x, y, 1.2, 0, TAU);
    ctx.fillStyle = `rgba(255, 219, 196, ${0.04 + (i % 4) * 0.02})`;
    ctx.fill();
  }
};
