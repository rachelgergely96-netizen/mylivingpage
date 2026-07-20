import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "../shared/motion";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

const PLEAT_COLORS = [
  [100, 39, 69],
  [139, 61, 88],
  [174, 86, 103],
  [195, 113, 118],
  [133, 53, 82],
] as const;

export const renderParasol: ThemeRenderer = (
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
  const pivotX = w * 0.87 + pointerX * minSide * 0.025;
  const pivotY = h * 0.9 + pointerY * minSide * 0.018;
  const radius = minSide * 0.64;
  const startAngle = -2.72 + pointerX * 0.025;
  const span = 2.22 + page.storyProgress * 0.16;
  const endAngle = startAngle + span;
  const pleatCount = 22;

  ctx.save();

  const background = ctx.createLinearGradient(0, 0, w, h);
  background.addColorStop(0, "#180A14");
  background.addColorStop(0.5, "#120810");
  background.addColorStop(1, "#050305");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  // Far plane: a radial shadow and lacquer glow establish the fan's scale.
  const glow = ctx.createRadialGradient(pivotX, pivotY, radius * 0.18, pivotX, pivotY, radius * 1.25);
  glow.addColorStop(0, "rgba(221, 120, 132, 0.17)");
  glow.addColorStop(0.58, "rgba(116, 49, 78, 0.09)");
  glow.addColorStop(1, "rgba(10, 4, 8, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(w * 0.35, 0, w * 0.65, h);

  ctx.save();
  ctx.translate(-radius * 0.025, radius * 0.035);
  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY);
  ctx.arc(pivotX, pivotY, radius * 1.02, startAngle, endAngle);
  ctx.closePath();
  ctx.fillStyle = "rgba(0, 0, 0, 0.36)";
  ctx.shadowColor = "rgba(0, 0, 0, 0.66)";
  ctx.shadowBlur = minSide * 0.045;
  ctx.fill();
  ctx.restore();

  for (let ghost = 0; ghost < 3; ghost += 1) {
    ctx.beginPath();
    ctx.arc(
      pivotX,
      pivotY,
      radius * (0.42 + ghost * 0.18),
      startAngle + 0.1,
      endAngle - 0.08,
    );
    ctx.strokeStyle = `rgba(230, 158, 157, ${0.045 - ghost * 0.008})`;
    ctx.lineWidth = minSide * (0.018 - ghost * 0.003);
    ctx.stroke();
  }

  // Middle plane: rigid alternating folds radiate from one dominant pivot.
  for (let pleat = 0; pleat < pleatCount; pleat += 1) {
    const angleA = startAngle + (span * pleat) / pleatCount;
    const angleB = startAngle + (span * (pleat + 1)) / pleatCount;
    const midAngle = (angleA + angleB) * 0.5;
    const color = PLEAT_COLORS[pleat % PLEAT_COLORS.length];
    const ridge = pleat % 2 === 0 ? 1 : 0;
    const storyIndex = Math.floor((pleat / pleatCount) * 6);
    const weight = storyStepWeight(page.storyProgress, storyIndex, 6);
    const tipX = pivotX + Math.cos(midAngle) * radius;
    const tipY = pivotY + Math.sin(midAngle) * radius;
    const pleatGradient = ctx.createLinearGradient(pivotX, pivotY, tipX, tipY);
    pleatGradient.addColorStop(0, `rgba(${color[0] - 20}, ${color[1] - 14}, ${color[2] - 12}, 0.78)`);
    pleatGradient.addColorStop(
      0.58,
      `rgba(${color[0] + ridge * 17}, ${color[1] + ridge * 12}, ${color[2] + ridge * 11}, ${0.78 + weight * 0.1})`,
    );
    pleatGradient.addColorStop(1, `rgba(${color[0] + 35}, ${color[1] + 28}, ${color[2] + 22}, 0.88)`);

    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(pivotX + Math.cos(angleA) * radius, pivotY + Math.sin(angleA) * radius);
    ctx.arc(pivotX, pivotY, radius, angleA, angleB);
    ctx.closePath();
    ctx.fillStyle = pleatGradient;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(pivotX + Math.cos(angleA) * radius, pivotY + Math.sin(angleA) * radius);
    ctx.strokeStyle = `rgba(255, 220, 195, ${0.1 + ridge * 0.12 + weight * 0.13})`;
    ctx.lineWidth = ridge ? 1.25 : 0.7;
    ctx.stroke();
  }

  // Foreground: lacquered ribs, a scalloped rim, and a brass hinge.
  for (let rib = 0; rib <= 11; rib += 1) {
    const angle = startAngle + (span * rib) / 11;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(pivotX + Math.cos(angle) * radius * 0.985, pivotY + Math.sin(angle) * radius * 0.985);
    ctx.strokeStyle = "rgba(234, 177, 128, 0.3)";
    ctx.lineWidth = Math.max(0.9, minSide * 0.0015);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(pivotX, pivotY, radius, startAngle, endAngle);
  ctx.strokeStyle = "rgba(255, 221, 195, 0.5)";
  ctx.lineWidth = Math.max(1.5, minSide * 0.003);
  ctx.shadowColor = "rgba(231, 128, 137, 0.5)";
  ctx.shadowBlur = minSide * 0.012;
  ctx.stroke();
  ctx.shadowBlur = 0;

  for (let scallop = 0; scallop < 11; scallop += 1) {
    const angle = startAngle + (span * (scallop + 0.5)) / 11;
    const x = pivotX + Math.cos(angle) * radius;
    const y = pivotY + Math.sin(angle) * radius;
    ctx.beginPath();
    ctx.arc(x, y, minSide * 0.0065, angle - Math.PI * 0.5, angle + Math.PI * 0.5);
    ctx.strokeStyle = "rgba(255, 226, 205, 0.28)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const hinge = ctx.createRadialGradient(pivotX - minSide * 0.008, pivotY - minSide * 0.008, 0, pivotX, pivotY, minSide * 0.034);
  hinge.addColorStop(0, "#FFF0C9");
  hinge.addColorStop(0.42, "#C59459");
  hinge.addColorStop(1, "#5A3629");
  ctx.fillStyle = hinge;
  ctx.beginPath();
  ctx.arc(pivotX, pivotY, minSide * 0.034, 0, TAU);
  ctx.fill();

  for (let i = 0; i < 30; i += 1) {
    const seed = i + 1;
    const progress = (0.5 + 0.5 * Math.sin(seed * 3.17 + t * 0.09)) * 0.9;
    const x = w * (0.48 + (0.5 + 0.5 * Math.sin(seed * 7.13)) * 0.5);
    const y = h * (0.08 + progress * 0.82);
    ctx.beginPath();
    ctx.arc(x, y, 0.45 + (i % 3) * 0.3, 0, TAU);
    ctx.fillStyle = `rgba(255, 209, 179, ${0.025 + (i % 5) * 0.013})`;
    ctx.fill();
  }

  if (page.hasFocus) {
    const targetAngle = startAngle + span * page.storyProgress;
    const targetX = pivotX + Math.cos(targetAngle) * radius * 0.72;
    const targetY = pivotY + Math.sin(targetAngle) * radius * 0.72;
    ctx.beginPath();
    ctx.moveTo(page.focusX * w, page.focusY * h);
    ctx.quadraticCurveTo(w * 0.63, page.focusY * h, targetX, targetY);
    ctx.strokeStyle = "rgba(245, 197, 166, 0.22)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const clearSpace = ctx.createLinearGradient(0, 0, w * 0.67, 0);
  clearSpace.addColorStop(0, "rgba(10, 4, 8, 0.84)");
  clearSpace.addColorStop(0.62, "rgba(10, 4, 8, 0.48)");
  clearSpace.addColorStop(1, "rgba(10, 4, 8, 0)");
  ctx.fillStyle = clearSpace;
  ctx.fillRect(0, 0, w * 0.67, h);

  const vignette = ctx.createRadialGradient(w * 0.8, h * 0.5, minSide * 0.12, w * 0.56, h * 0.5, Math.max(w, h) * 0.82);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.38)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
};
