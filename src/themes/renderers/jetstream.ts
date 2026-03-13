import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

export const renderJetstream: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#08111B");
  bg.addColorStop(0.52, "#09131F");
  bg.addColorStop(1, "#04070B");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 4; i += 1) {
    const y = h * (0.18 + i * 0.18) + Math.sin(t * (0.4 + i * 0.05) + i) * 22 + (my - 0.5) * 24;
    const bend = 0.12 + i * 0.03 + (mx - 0.5) * 0.08;
    ctx.beginPath();
    ctx.moveTo(-w * 0.08, y);
    ctx.bezierCurveTo(
      w * 0.22,
      y - h * bend,
      w * 0.58,
      y + h * bend * 0.6,
      w * 1.08,
      y - h * bend * 0.28,
    );
    ctx.strokeStyle = `rgba(${180 - i * 18},${214 - i * 10},255,${0.12 - i * 0.015})`;
    ctx.lineWidth = 22 - i * 4;
    ctx.lineCap = "round";
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-w * 0.08, y);
    ctx.bezierCurveTo(
      w * 0.22,
      y - h * bend * 0.5,
      w * 0.58,
      y + h * bend * 0.3,
      w * 1.08,
      y - h * bend * 0.14,
    );
    ctx.strokeStyle = "rgba(244,248,255,0.14)";
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  for (let i = 0; i < 48; i += 1) {
    const lane = i % 4;
    const progress = (t * (0.35 + lane * 0.08) + i * 0.07) % 1;
    const x = -40 + progress * (w + 80);
    const y = h * (0.18 + lane * 0.18) + Math.sin(progress * 6 + lane + t) * 12 + (my - 0.5) * 18;
    ctx.beginPath();
    ctx.moveTo(x - 22, y);
    ctx.lineTo(x + 10, y);
    ctx.strokeStyle = `rgba(225,240,255,${0.08 + (1 - progress) * 0.08})`;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  for (let i = 0; i < 60; i += 1) {
    const seed = i * 0.59;
    const progress = (t * 0.2 + seed * 0.1) % 1;
    const x = (Math.sin(seed * 4.2) * 0.5 + 0.5) * w;
    const y = h * 0.9 - progress * h * 0.82;
    ctx.beginPath();
    ctx.arc(x, y, 1.1, 0, TAU);
    ctx.fillStyle = `rgba(170,210,255,${(1 - progress) * 0.1})`;
    ctx.fill();
  }
};
