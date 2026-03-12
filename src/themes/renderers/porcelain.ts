import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

export const renderPorcelain: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const background = ctx.createLinearGradient(0, 0, w, h);
  background.addColorStop(0, "#18202D");
  background.addColorStop(0.42, "#202A39");
  background.addColorStop(1, "#11161F");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const glaze = ctx.createRadialGradient(w * (0.34 + (mx - 0.5) * 0.06), h * (0.28 + (my - 0.5) * 0.04), 0, w * 0.5, h * 0.42, Math.min(w, h) * 0.62);
  glaze.addColorStop(0, "rgba(240, 245, 255, 0.18)");
  glaze.addColorStop(0.56, "rgba(196, 220, 242, 0.08)");
  glaze.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glaze;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 26; i += 1) {
    const seed = i * 0.61 + 0.14;
    let x = (Math.sin(seed * 3.9) * 0.5 + 0.5) * w;
    let y = (Math.cos(seed * 3.4) * 0.5 + 0.5) * h;
    const angle = seed * 9.2 + t * 0.02;

    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let seg = 0; seg < 4; seg += 1) {
      const length = 24 + seg * 18 + (Math.sin(seed * (seg + 2)) * 0.5 + 0.5) * 16;
      const bend = angle + Math.sin(t * 0.12 + seed * 6 + seg) * 0.4 + seg * 0.55;
      x += Math.cos(bend) * length;
      y += Math.sin(bend) * length;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(63, 75, 95, 0.38)";
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.beginPath();
    x = (Math.sin(seed * 3.9) * 0.5 + 0.5) * w;
    y = (Math.cos(seed * 3.4) * 0.5 + 0.5) * h;
    ctx.moveTo(x, y);
    for (let seg = 0; seg < 4; seg += 1) {
      const length = 24 + seg * 18 + (Math.sin(seed * (seg + 2)) * 0.5 + 0.5) * 16;
      const bend = angle + Math.sin(t * 0.12 + seed * 6 + seg) * 0.4 + seg * 0.55;
      x += Math.cos(bend) * length;
      y += Math.sin(bend) * length;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(226, 188, 140, 0.16)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  for (let i = 0; i < 64; i += 1) {
    const seed = i * 0.48 + 0.1;
    const x = (Math.sin(seed * 4.8) * 0.5 + 0.5) * w;
    const y = (Math.cos(seed * 4.1) * 0.5 + 0.5) * h;
    ctx.beginPath();
    ctx.arc(x, y, 0.7, 0, TAU);
    ctx.fillStyle = `rgba(243, 247, 255, ${0.04 + (i % 5) * 0.01})`;
    ctx.fill();
  }
};
