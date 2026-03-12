import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

export const renderSolstice: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const background = ctx.createLinearGradient(0, 0, 0, h);
  background.addColorStop(0, "#1A0E0B");
  background.addColorStop(0.45, "#20110D");
  background.addColorStop(1, "#0A0605");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const suns: Array<[number, number, number, string]> = [
    [w * (0.28 + (mx - 0.5) * 0.04), h * (0.28 + (my - 0.5) * 0.04), Math.min(w, h) * 0.16, "rgba(255, 189, 124, 0.28)"],
    [w * 0.78, h * (0.58 - (my - 0.5) * 0.03), Math.min(w, h) * 0.11, "rgba(255, 146, 118, 0.2)"],
  ];

  for (const [x, y, radius, color] of suns) {
    const disc = ctx.createRadialGradient(x, y, 0, x, y, radius);
    disc.addColorStop(0, "rgba(255, 245, 232, 0.52)");
    disc.addColorStop(0.34, color);
    disc.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();

    for (let ring = 0; ring < 3; ring += 1) {
      ctx.beginPath();
      ctx.arc(x, y, radius * (1.22 + ring * 0.28), t * 0.06 + ring * 0.6, t * 0.06 + ring * 0.6 + Math.PI * 1.24);
      ctx.strokeStyle = `rgba(255, 208, 170, ${0.12 - ring * 0.02})`;
      ctx.lineWidth = 1.4 - ring * 0.2;
      ctx.stroke();
    }
  }

  for (let i = 0; i < 5; i += 1) {
    const x = w * (0.08 + i * 0.2) + Math.sin(t * 0.18 + i) * 16;
    const y = h * (0.44 + Math.sin(i * 0.9 + t * 0.12) * 0.08);
    ctx.beginPath();
    ctx.arc(x, y, 8 + i * 2, 0, TAU);
    ctx.fillStyle = `rgba(255, 226, 202, ${0.04 + i * 0.01})`;
    ctx.fill();
  }

  for (let i = 0; i < 56; i += 1) {
    const seed = i * 0.56 + 0.2;
    const progress = (t * (0.05 + (i % 4) * 0.01) + seed * 0.18) % 1;
    const x = (Math.sin(seed * 4.2) * 0.5 + 0.5) * w;
    const y = h * 0.92 - progress * h * 0.88;
    ctx.beginPath();
    ctx.arc(x, y, 1.1, 0, TAU);
    ctx.fillStyle = `rgba(255, 215, 172, ${(1 - progress) * 0.14})`;
    ctx.fill();
  }
};
