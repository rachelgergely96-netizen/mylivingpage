import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

function drawVaultArch(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  width: number,
  height: number,
  stroke: string,
) {
  const wallHeight = height * 0.58;
  ctx.beginPath();
  ctx.moveTo(cx - width / 2, baseY);
  ctx.lineTo(cx - width / 2, baseY - wallHeight);
  ctx.quadraticCurveTo(cx, baseY - height, cx + width / 2, baseY - wallHeight);
  ctx.lineTo(cx + width / 2, baseY);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

export const renderVault: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const background = ctx.createLinearGradient(0, 0, 0, h);
  background.addColorStop(0, "#0B0E17");
  background.addColorStop(0.52, "#080C13");
  background.addColorStop(1, "#030406");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.5;
  const lightX = w * (0.5 + (mx - 0.5) * 0.18);
  const lightY = h * (0.1 + (my - 0.5) * 0.06);

  for (let depth = 0; depth < 8; depth += 1) {
    const scale = 1 - depth * 0.085;
    const archWidth = w * 0.82 * scale;
    const archHeight = h * 0.84 * scale;
    const baseY = h * (0.96 - depth * 0.038);
    const alpha = 0.1 - depth * 0.008;
    drawVaultArch(ctx, cx, baseY, archWidth, archHeight, `rgba(186, 208, 255, ${alpha})`);
  }

  for (let i = 0; i < 3; i += 1) {
    const beamWidth = w * (0.07 + i * 0.02);
    const sweep = Math.sin(t * 0.22 + i) * w * 0.08;
    const beam = ctx.createLinearGradient(lightX, lightY, lightX, h);
    beam.addColorStop(0, `rgba(182, 210, 255, ${0.08 - i * 0.018})`);
    beam.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(lightX + sweep, lightY);
    ctx.lineTo(cx - beamWidth, h);
    ctx.lineTo(cx + beamWidth, h);
    ctx.closePath();
    ctx.fill();
  }

  ctx.beginPath();
  ctx.moveTo(cx, lightY);
  ctx.lineTo(cx, h);
  ctx.strokeStyle = "rgba(210, 228, 255, 0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();

  for (let i = 0; i < 54; i += 1) {
    const seed = i * 0.67 + 0.1;
    const progress = (t * (0.03 + (i % 4) * 0.008) + seed * 0.17) % 1;
    const spread = (Math.sin(seed * 6.1) * 0.5 + 0.5) * w * 0.34;
    const x = cx - spread / 2 + (spread * ((Math.sin(seed * 3.8) * 0.5 + 0.5))) + Math.sin(t * 0.18 + seed) * 8;
    const y = h * 0.92 - progress * h * 0.78;
    ctx.beginPath();
    ctx.arc(x, y, 1.1, 0, TAU);
    ctx.fillStyle = `rgba(231, 240, 255, ${(1 - progress) * 0.13})`;
    ctx.fill();
  }

  const source = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, w * 0.2);
  source.addColorStop(0, "rgba(230, 241, 255, 0.18)");
  source.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = source;
  ctx.fillRect(0, 0, w, h);
};
