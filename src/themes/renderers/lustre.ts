import type { ThemeRenderer } from "../types";

export const renderLustre: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#120F12");
  bg.addColorStop(0.52, "#0C0A0C");
  bg.addColorStop(1, "#050405");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 5; i += 1) {
    const y = h * (0.18 + i * 0.15) + Math.sin(t * (0.22 + i * 0.03) + i) * 18 + (my - 0.5) * 14;
    const thickness = 26 - i * 3;
    const shift = Math.sin(t * 0.18 + i * 0.7) * 20 + (mx - 0.5) * 40;

    ctx.beginPath();
    ctx.moveTo(-40, y);
    ctx.bezierCurveTo(
      w * 0.18 + shift,
      y - 32,
      w * 0.46 - shift * 0.4,
      y + 34,
      w * 0.74 + shift,
      y - 18,
    );
    ctx.bezierCurveTo(
      w * 0.88 + shift * 0.5,
      y - 8,
      w * 0.96,
      y + 24,
      w + 40,
      y - 12,
    );
    ctx.strokeStyle = `rgba(${232 - i * 8},${204 - i * 6},${170 - i * 4},${0.12 - i * 0.014})`;
    ctx.lineWidth = thickness;
    ctx.lineCap = "round";
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-40, y);
    ctx.bezierCurveTo(
      w * 0.18 + shift * 0.9,
      y - 14,
      w * 0.46 - shift * 0.2,
      y + 14,
      w * 0.74 + shift * 0.7,
      y - 6,
    );
    ctx.bezierCurveTo(w * 0.88, y, w * 0.96, y + 8, w + 40, y - 2);
    ctx.strokeStyle = "rgba(255,244,228,0.12)";
    ctx.lineWidth = 4;
    ctx.stroke();
  }
};
