import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "../shared/motion";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

function traceProfile(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
) {
  ctx.beginPath();
  ctx.moveTo(cx + rx * 0.14, cy - ry * 0.67);
  ctx.bezierCurveTo(
    cx - rx * 0.17,
    cy - ry * 0.7,
    cx - rx * 0.34,
    cy - ry * 0.52,
    cx - rx * 0.34,
    cy - ry * 0.31,
  );
  ctx.bezierCurveTo(
    cx - rx * 0.35,
    cy - ry * 0.22,
    cx - rx * 0.5,
    cy - ry * 0.15,
    cx - rx * 0.51,
    cy - ry * 0.08,
  );
  ctx.quadraticCurveTo(cx - rx * 0.47, cy - ry * 0.03, cx - rx * 0.38, cy - ry * 0.03);
  ctx.bezierCurveTo(
    cx - rx * 0.42,
    cy + ry * 0.02,
    cx - rx * 0.48,
    cy + ry * 0.05,
    cx - rx * 0.44,
    cy + ry * 0.11,
  );
  ctx.bezierCurveTo(
    cx - rx * 0.39,
    cy + ry * 0.17,
    cx - rx * 0.31,
    cy + ry * 0.19,
    cx - rx * 0.27,
    cy + ry * 0.28,
  );
  ctx.bezierCurveTo(
    cx - rx * 0.2,
    cy + ry * 0.42,
    cx - rx * 0.27,
    cy + ry * 0.55,
    cx - rx * 0.47,
    cy + ry * 0.7,
  );
  ctx.bezierCurveTo(
    cx - rx * 0.18,
    cy + ry * 0.77,
    cx + rx * 0.18,
    cy + ry * 0.78,
    cx + rx * 0.5,
    cy + ry * 0.63,
  );
  ctx.bezierCurveTo(
    cx + rx * 0.24,
    cy + ry * 0.4,
    cx + rx * 0.34,
    cy + ry * 0.12,
    cx + rx * 0.45,
    cy - ry * 0.18,
  );
  ctx.bezierCurveTo(
    cx + rx * 0.52,
    cy - ry * 0.39,
    cx + rx * 0.38,
    cy - ry * 0.59,
    cx + rx * 0.14,
    cy - ry * 0.67,
  );
  ctx.closePath();
}

export const renderCameo: ThemeRenderer = (
  ctx,
  w,
  h,
  t,
  mx,
  my,
  _deltaSeconds,
  motion,
) => {
  const page = resolveThemeMotion(motion);
  const pointerX = finiteClamp(mx, 0, 1, 0.5) - 0.5;
  const pointerY = finiteClamp(my, 0, 1, 0.5) - 0.5;
  const minSide = Math.min(w, h);
  const cx = w * 0.78 + pointerX * minSide * 0.035;
  const cy = h * 0.5 + pointerY * minSide * 0.025;
  const rx = minSide * 0.285;
  const ry = minSide * 0.39;
  const tilt = (pointerX + page.scrollVelocity * 0.06) * 0.025;

  ctx.save();

  const background = ctx.createLinearGradient(0, 0, w, h);
  background.addColorStop(0, "#1A0D18");
  background.addColorStop(0.48, "#100A12");
  background.addColorStop(1, "#050407");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  // Far plane: velvet depth, a suspended chain, and soft gallery light.
  const velvet = ctx.createRadialGradient(cx, cy - ry * 0.3, 0, cx, cy, ry * 2.1);
  velvet.addColorStop(0, "rgba(138, 73, 105, 0.18)");
  velvet.addColorStop(0.58, "rgba(72, 38, 66, 0.08)");
  velvet.addColorStop(1, "rgba(5, 4, 7, 0)");
  ctx.fillStyle = velvet;
  ctx.fillRect(w * 0.35, 0, w * 0.65, h);

  ctx.beginPath();
  ctx.moveTo(cx - rx * 0.63, -h * 0.08);
  ctx.bezierCurveTo(cx - rx * 0.58, cy - ry * 0.86, cx - rx * 0.32, cy - ry * 0.96, cx, cy - ry * 0.98);
  ctx.bezierCurveTo(cx + rx * 0.32, cy - ry * 0.96, cx + rx * 0.58, cy - ry * 0.86, cx + rx * 0.63, -h * 0.08);
  ctx.strokeStyle = "rgba(224, 183, 161, 0.18)";
  ctx.lineWidth = Math.max(1, minSide * 0.0022);
  ctx.setLineDash([minSide * 0.012, minSide * 0.009]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt);
  ctx.translate(-cx, -cy);

  ctx.beginPath();
  ctx.ellipse(cx + rx * 0.07, cy + ry * 0.06, rx * 1.13, ry * 1.07, 0, 0, TAU);
  ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
  ctx.shadowColor = "rgba(0, 0, 0, 0.72)";
  ctx.shadowBlur = minSide * 0.055;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Middle plane: one carved medallion with layered bevels.
  const frame = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
  frame.addColorStop(0, "#FFF2E6");
  frame.addColorStop(0.24, "#CBAE9F");
  frame.addColorStop(0.53, "#F3DCD1");
  frame.addColorStop(0.78, "#9D7788");
  frame.addColorStop(1, "#E7C8B9");
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 1.12, ry * 1.06, 0, 0, TAU);
  ctx.fillStyle = frame;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 1.02, ry * 0.97, 0, 0, TAU);
  ctx.fillStyle = "#6F495F";
  ctx.fill();

  const innerField = ctx.createRadialGradient(
    cx - rx * 0.25,
    cy - ry * 0.3,
    0,
    cx,
    cy,
    ry,
  );
  innerField.addColorStop(0, "#B98291");
  innerField.addColorStop(0.62, "#8E5A72");
  innerField.addColorStop(1, "#5C354D");
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.92, ry * 0.89, 0, 0, TAU);
  ctx.fillStyle = innerField;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.91, ry * 0.88, 0, 0, TAU);
  ctx.clip();

  traceProfile(ctx, cx + rx * 0.035, cy + ry * 0.025, rx, ry);
  ctx.fillStyle = "rgba(55, 27, 43, 0.38)";
  ctx.translate(rx * 0.035, ry * 0.035);
  ctx.fill();
  ctx.translate(-rx * 0.035, -ry * 0.035);

  const relief = ctx.createLinearGradient(cx - rx * 0.5, cy - ry * 0.5, cx + rx * 0.42, cy + ry * 0.55);
  relief.addColorStop(0, "#FFF4E9");
  relief.addColorStop(0.46, "#E8D1C5");
  relief.addColorStop(0.78, "#B99891");
  relief.addColorStop(1, "#F0D8CC");
  traceProfile(ctx, cx, cy, rx, ry);
  ctx.fillStyle = relief;
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 250, 241, 0.46)";
  ctx.lineWidth = Math.max(1, minSide * 0.0018);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - rx * 0.26, cy - ry * 0.31);
  ctx.quadraticCurveTo(cx - rx * 0.19, cy - ry * 0.34, cx - rx * 0.12, cy - ry * 0.3);
  ctx.strokeStyle = "rgba(105, 76, 77, 0.34)";
  ctx.lineWidth = Math.max(0.8, minSide * 0.0013);
  ctx.stroke();

  ctx.restore();

  // Foreground: a beaded edge lights in the order of the page story.
  const beadCount = 30;
  for (let bead = 0; bead < beadCount; bead += 1) {
    const angle = (bead / beadCount) * TAU - Math.PI / 2;
    const storyIndex = Math.floor((bead / beadCount) * 6);
    const weight = storyStepWeight(page.storyProgress, storyIndex, 6);
    const x = cx + Math.cos(angle) * rx * 1.065;
    const y = cy + Math.sin(angle) * ry * 1.01;
    ctx.beginPath();
    ctx.arc(x, y, minSide * (0.003 + weight * 0.0018), 0, TAU);
    ctx.fillStyle = `rgba(255, 235, 222, ${0.2 + weight * 0.5})`;
    ctx.fill();
  }

  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 1.12, ry * 1.06, 0, Math.PI * 1.03, Math.PI * 1.86);
  ctx.strokeStyle = "rgba(255, 249, 238, 0.42)";
  ctx.lineWidth = Math.max(1.1, minSide * 0.0024);
  ctx.stroke();
  ctx.restore();

  for (let i = 0; i < 24; i += 1) {
    const seed = i + 1;
    const x = w * (0.5 + (0.5 + 0.5 * Math.sin(seed * 8.1)) * 0.48);
    const y = h * (0.08 + (0.5 + 0.5 * Math.cos(seed * 5.7)) * 0.84);
    const shimmer = 0.5 + 0.5 * Math.sin(t * 0.5 + seed);
    ctx.beginPath();
    ctx.arc(x, y, 0.45 + (i % 3) * 0.3, 0, TAU);
    ctx.fillStyle = `rgba(255, 225, 214, ${0.025 + shimmer * 0.065})`;
    ctx.fill();
  }

  if (page.hasFocus) {
    ctx.beginPath();
    ctx.moveTo(page.focusX * w, page.focusY * h);
    ctx.quadraticCurveTo(w * 0.62, page.focusY * h, cx - rx * 1.08, cy);
    ctx.strokeStyle = "rgba(248, 218, 205, 0.22)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const clearSpace = ctx.createLinearGradient(0, 0, w * 0.68, 0);
  clearSpace.addColorStop(0, "rgba(10, 6, 10, 0.82)");
  clearSpace.addColorStop(0.64, "rgba(10, 6, 10, 0.5)");
  clearSpace.addColorStop(1, "rgba(10, 6, 10, 0)");
  ctx.fillStyle = clearSpace;
  ctx.fillRect(0, 0, w * 0.68, h);

  const vignette = ctx.createRadialGradient(cx, cy, minSide * 0.18, w * 0.56, h * 0.5, Math.max(w, h) * 0.82);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.38)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
};
