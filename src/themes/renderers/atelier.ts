import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "../shared/motion";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

const INKS = [
  { color: "#E66F55", x: 0.56, y: 0.16, width: 0.34, height: 0.25, rotation: -0.08 },
  { color: "#3157C8", x: 0.66, y: 0.34, width: 0.29, height: 0.32, rotation: 0.055 },
  { color: "#D6A92D", x: 0.51, y: 0.58, width: 0.4, height: 0.22, rotation: -0.035 },
] as const;

function stableUnit(seed: number): number {
  const value = Math.sin(seed * 91.173 + 17.71) * 43758.5453;
  return value - Math.floor(value);
}

function drawCropMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  directionX: -1 | 1,
  directionY: -1 | 1,
  length: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + directionX * length * 0.32, y);
  ctx.lineTo(x + directionX * length, y);
  ctx.moveTo(x, y + directionY * length * 0.32);
  ctx.lineTo(x, y + directionY * length);
  ctx.stroke();
}

function drawRegistrationMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.moveTo(x - radius * 1.5, y);
  ctx.lineTo(x + radius * 1.5, y);
  ctx.moveTo(x, y - radius * 1.5);
  ctx.lineTo(x, y + radius * 1.5);
  ctx.stroke();
}

function drawInkPlate(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  index: number,
  time: number,
  pointerX: number,
  pointerY: number,
  storyProgress: number,
  interactionImpulse: number,
) {
  const plate = INKS[index];
  const chapterWeight = storyStepWeight(storyProgress, index, INKS.length);
  const settle = 1 - interactionImpulse * 0.72;
  const driftX =
    (pointerX - 0.5) * (4 + index * 1.5) * settle +
    Math.sin(time * 0.08 + index * 1.7) * 1.5;
  const driftY =
    (pointerY - 0.5) * (3 + index) * settle +
    Math.cos(time * 0.07 + index * 1.2) * 1.2;
  const x = w * plate.x + driftX;
  const y = h * plate.y + driftY;
  const width = w * plate.width;
  const height = h * plate.height;

  ctx.save();
  ctx.translate(x + width * 0.5, y + height * 0.5);
  ctx.rotate(plate.rotation + (storyProgress - 0.5) * 0.025 * (index - 1));
  ctx.translate(-width * 0.5, -height * 0.5);

  ctx.globalAlpha = 0.19 + chapterWeight * 0.15;
  ctx.fillStyle = plate.color;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 0.22 + chapterWeight * 0.2;
  ctx.strokeStyle = plate.color;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  ctx.globalAlpha = 0.12 + chapterWeight * 0.08;
  const spacing = Math.max(8, Math.min(w, h) * 0.018);
  for (let line = -height; line < width + height; line += spacing) {
    ctx.beginPath();
    ctx.moveTo(line, 0);
    ctx.lineTo(line - height, height);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.7;
  drawCropMark(ctx, -5, -5, -1, -1, 12);
  drawCropMark(ctx, width + 5, -5, 1, -1, 12);
  drawCropMark(ctx, -5, height + 5, -1, 1, 12);
  drawCropMark(ctx, width + 5, height + 5, 1, 1, 12);
  ctx.restore();
}

export const renderAtelier: ThemeRenderer = (
  ctx,
  w,
  h,
  t,
  mx,
  my,
  _deltaSeconds,
  motion,
) => {
  const pageMotion = resolveThemeMotion(motion);
  const reducedMotion = motion?.reducedMotion ?? false;
  const effectiveTime = reducedMotion ? 0 : finiteClamp(t, 0, 1_000_000);
  const targetX = pageMotion.hasFocus ? mx * 0.3 + pageMotion.focusX * 0.7 : mx;
  const targetY = pageMotion.hasFocus ? my * 0.3 + pageMotion.focusY * 0.7 : my;
  const paper = ctx.createLinearGradient(0, 0, w, h);
  paper.addColorStop(0, "#F2EBDD");
  paper.addColorStop(0.56, "#E8DFCF");
  paper.addColorStop(1, "#D7CCB8");
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, w, h);

  // Deterministic paper fibres make the surface tactile without an image asset.
  ctx.save();
  ctx.lineWidth = 0.6;
  for (let index = 0; index < 140; index += 1) {
    const x = stableUnit(index * 2.13) * w;
    const y = stableUnit(index * 3.71 + 4) * h;
    const length = 3 + stableUnit(index * 1.43 + 8) * 14;
    ctx.strokeStyle = index % 3 === 0
      ? "rgba(58, 47, 38, 0.055)"
      : "rgba(255, 252, 240, 0.12)";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + length, y + (stableUnit(index + 12) - 0.5) * 1.8);
    ctx.stroke();
  }
  ctx.restore();

  const margin = Math.max(18, Math.min(w, h) * 0.04);
  ctx.strokeStyle = "rgba(24, 22, 27, 0.25)";
  ctx.lineWidth = 1;
  ctx.strokeRect(margin + 0.5, margin + 0.5, w - margin * 2 - 1, h - margin * 2 - 1);

  // Printer's ruler and baseline grid stay on the art side of the page.
  const gridStart = w * 0.46;
  ctx.save();
  ctx.strokeStyle = "rgba(24, 22, 27, 0.07)";
  for (let x = gridStart; x <= w; x += Math.max(24, w * 0.045)) {
    ctx.beginPath();
    ctx.moveTo(x, margin);
    ctx.lineTo(x, h - margin);
    ctx.stroke();
  }
  for (let y = margin; y <= h - margin; y += Math.max(24, h * 0.055)) {
    ctx.beginPath();
    ctx.moveTo(gridStart, y);
    ctx.lineTo(w - margin, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  for (let index = 0; index < INKS.length; index += 1) {
    drawInkPlate(
      ctx,
      w,
      h,
      index,
      effectiveTime,
      targetX,
      targetY,
      pageMotion.storyProgress,
      pageMotion.interactionImpulse,
    );
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(24, 22, 27, 0.55)";
  ctx.lineWidth = 1;
  drawRegistrationMark(ctx, w * 0.9, h * 0.12, Math.max(5, Math.min(w, h) * 0.012));
  drawRegistrationMark(ctx, w * 0.51, h * 0.86, Math.max(4, Math.min(w, h) * 0.009));
  drawCropMark(ctx, margin, margin, -1, -1, 13);
  drawCropMark(ctx, w - margin, margin, 1, -1, 13);
  drawCropMark(ctx, margin, h - margin, -1, 1, 13);
  drawCropMark(ctx, w - margin, h - margin, 1, 1, 13);
  ctx.restore();

  const swatchSize = Math.max(7, Math.min(w, h) * 0.018);
  INKS.forEach((ink, index) => {
    ctx.fillStyle = ink.color;
    ctx.fillRect(
      w - margin - swatchSize * (INKS.length - index),
      h - margin - swatchSize,
      swatchSize,
      swatchSize,
    );
  });
  ctx.fillStyle = "#18161B";
  ctx.fillRect(w - margin - swatchSize * 4, h - margin - swatchSize, swatchSize, swatchSize);

  if (pageMotion.hasFocus) {
    const focusX = pageMotion.focusX * w;
    const focusY = pageMotion.focusY * h;
    const size = 8 + (1 - pageMotion.interactionImpulse) * 10;
    ctx.save();
    ctx.strokeStyle = "rgba(49, 87, 200, 0.68)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(gridStart, focusY);
    ctx.lineTo(focusX, focusY);
    ctx.stroke();
    ctx.setLineDash([]);
    drawRegistrationMark(ctx, focusX, focusY, size * 0.5);
    ctx.restore();
  }

  // A paper wash protects the semantic text zone without hiding the print proof.
  const textWash = ctx.createLinearGradient(0, 0, w * 0.58, 0);
  textWash.addColorStop(0, "rgba(242, 235, 221, 0.9)");
  textWash.addColorStop(0.76, "rgba(242, 235, 221, 0.62)");
  textWash.addColorStop(1, "rgba(242, 235, 221, 0)");
  ctx.fillStyle = textWash;
  ctx.fillRect(0, 0, w * 0.6, h);
};
