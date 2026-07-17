import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

function drawCurtain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  side: -1 | 1,
  t: number,
  pointerShift: number,
) {
  const edge = side < 0 ? 0 : w;
  const reach = w * 0.4;
  const innerEdge = edge - side * reach;
  const sway = Math.sin(t * 0.38 + side) * w * 0.012 + pointerShift * side;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(edge, 0);
  ctx.lineTo(innerEdge + sway, 0);
  ctx.bezierCurveTo(
    innerEdge - side * w * 0.06 + sway,
    h * 0.24,
    innerEdge + side * w * 0.04 - sway,
    h * 0.62,
    innerEdge - side * w * 0.02,
    h,
  );
  ctx.lineTo(edge, h);
  ctx.closePath();
  ctx.clip();

  const fabric = ctx.createLinearGradient(edge, 0, innerEdge, 0);
  fabric.addColorStop(0, "#270512");
  fabric.addColorStop(0.18, "#650E31");
  fabric.addColorStop(0.38, "#2C0618");
  fabric.addColorStop(0.58, "#8E1949");
  fabric.addColorStop(0.78, "#36071D");
  fabric.addColorStop(1, "#12030B");
  ctx.fillStyle = fabric;
  ctx.fillRect(Math.min(edge, innerEdge) - 20, 0, reach + 40, h);

  for (let fold = 0; fold < 7; fold += 1) {
    const ratio = (fold + 0.5) / 7;
    const x = edge - side * reach * ratio;
    const foldWidth = reach * 0.15;
    const sheen = ctx.createLinearGradient(x - foldWidth, 0, x + foldWidth, 0);
    sheen.addColorStop(0, "rgba(255, 222, 226, 0)");
    sheen.addColorStop(0.48, `rgba(255, 190, 208, ${0.035 + (fold % 2) * 0.025})`);
    sheen.addColorStop(1, "rgba(255, 222, 226, 0)");
    ctx.fillStyle = sheen;
    ctx.beginPath();
    ctx.moveTo(x - foldWidth, 0);
    ctx.bezierCurveTo(
      x + Math.sin(t * 0.42 + fold) * 12,
      h * 0.32,
      x - Math.cos(t * 0.3 + fold) * 18,
      h * 0.7,
      x + foldWidth,
      h,
    );
    ctx.lineTo(x - foldWidth, h);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(innerEdge + sway, 0);
  ctx.bezierCurveTo(
    innerEdge - side * w * 0.06 + sway,
    h * 0.24,
    innerEdge + side * w * 0.04 - sway,
    h * 0.62,
    innerEdge - side * w * 0.02,
    h,
  );
  ctx.strokeStyle = "rgba(245, 190, 137, 0.24)";
  ctx.lineWidth = 1.25;
  ctx.stroke();
}

export const renderVelvet: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const background = ctx.createLinearGradient(0, 0, w, h);
  background.addColorStop(0, "#210711");
  background.addColorStop(0.48, "#10040A");
  background.addColorStop(1, "#050205");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const glowX = w * (0.56 + (mx - 0.5) * 0.12);
  const glowY = h * (0.18 + (my - 0.5) * 0.08);
  const glow = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, Math.max(w, h) * 0.68);
  glow.addColorStop(0, "rgba(212, 90, 132, 0.16)");
  glow.addColorStop(0.42, "rgba(105, 29, 62, 0.07)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  const pointerShift = (mx - 0.5) * w * 0.035;
  drawCurtain(ctx, w, h, -1, t, pointerShift);
  drawCurtain(ctx, w, h, 1, t, pointerShift);

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(w * 0.5, h * (0.13 + Math.sin(t * 0.28) * 0.01), w, 0);
  ctx.lineTo(w, h * 0.08);
  ctx.quadraticCurveTo(w * 0.5, h * 0.2, 0, h * 0.08);
  ctx.closePath();
  const valance = ctx.createLinearGradient(0, 0, 0, h * 0.2);
  valance.addColorStop(0, "rgba(114, 18, 54, 0.95)");
  valance.addColorStop(0.65, "rgba(56, 8, 28, 0.92)");
  valance.addColorStop(1, "rgba(17, 3, 10, 0.25)");
  ctx.fillStyle = valance;
  ctx.fill();

  for (let i = 0; i < 58; i += 1) {
    const seed = i * 0.754 + 0.21;
    const x = (Math.sin(seed * 5.3) * 0.5 + 0.5) * w;
    const y = (Math.cos(seed * 3.7) * 0.5 + 0.5) * h;
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.9 + seed * 7);
    ctx.beginPath();
    ctx.arc(x, y, 0.55 + (i % 3) * 0.22, 0, TAU);
    ctx.fillStyle = `rgba(255, 221, 178, ${0.025 + pulse * 0.07})`;
    ctx.fill();
  }

  const vignette = ctx.createRadialGradient(w * 0.5, h * 0.42, Math.min(w, h) * 0.08, w * 0.5, h * 0.45, Math.max(w, h) * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
};
