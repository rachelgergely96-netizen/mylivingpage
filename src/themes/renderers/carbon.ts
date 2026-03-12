import type { ThemeRenderer } from "../types";

export const renderCarbon: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  ctx.fillStyle = "#050608";
  ctx.fillRect(0, 0, w, h);

  const weave = Math.max(22, Math.min(34, Math.min(w, h) * 0.055));
  const offsetA = (t * 38) % (weave * 2);
  const offsetB = (t * 28) % (weave * 2);

  for (let i = -h; i < w + h; i += weave) {
    ctx.beginPath();
    ctx.moveTo(i + offsetA, 0);
    ctx.lineTo(i + h + offsetA, h);
    ctx.strokeStyle = "rgba(34, 39, 46, 0.72)";
    ctx.lineWidth = weave * 0.7;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i + weave * 0.45 + offsetB, 0);
    ctx.lineTo(i + h + weave * 0.45 + offsetB, h);
    ctx.strokeStyle = "rgba(12, 14, 18, 0.8)";
    ctx.lineWidth = weave * 0.38;
    ctx.stroke();
  }

  for (let i = 0; i < w + h; i += weave) {
    ctx.beginPath();
    ctx.moveTo(i - offsetB, 0);
    ctx.lineTo(i - h - offsetB, h);
    ctx.strokeStyle = "rgba(24, 28, 34, 0.55)";
    ctx.lineWidth = weave * 0.46;
    ctx.stroke();
  }

  for (let y = 0; y < h; y += 6) {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.008 + (y / h) * 0.008})`;
    ctx.fillRect(0, y, w, 1);
  }

  const shineX = (t * 120) % (w + 220) - 110 + (mx - 0.5) * 80;
  const shine = ctx.createLinearGradient(shineX - 80, 0, shineX + 80, 0);
  shine.addColorStop(0, "rgba(255, 255, 255, 0)");
  shine.addColorStop(0.5, `rgba(198, 225, 255, ${0.12 + Math.abs(my - 0.5) * 0.08})`);
  shine.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.save();
  ctx.translate(0, -h * 0.14);
  ctx.rotate(-0.22);
  ctx.fillStyle = shine;
  ctx.fillRect(-w * 0.2, h * 0.14, w * 1.5, h * 0.24);
  ctx.restore();
};
