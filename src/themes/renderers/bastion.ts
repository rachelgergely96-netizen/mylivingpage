import { noise2D } from "../shared/noise";
import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "../shared/motion";
import type { ThemeRenderer } from "../types";

type Point = readonly [number, number];

const REAR_TOP: readonly Point[] = [
  [0.67, 0.04],
  [0.96, 0.02],
  [1.04, 0.22],
  [0.91, 0.42],
  [0.69, 0.35],
  [0.61, 0.18],
];

const REAR_BOTTOM: readonly Point[] = [
  [0.69, 0.48],
  [1.03, 0.37],
  [1.06, 0.94],
  [0.76, 1.03],
  [0.61, 0.78],
];

const MAIN_SHIELD: readonly Point[] = [
  [0.67, 0.1],
  [0.91, 0.09],
  [1.01, 0.27],
  [0.96, 0.73],
  [0.79, 0.94],
  [0.61, 0.76],
  [0.58, 0.29],
];

function platePath(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
  w: number,
  h: number,
  offsetX = 0,
  offsetY = 0,
) {
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    const px = x * w + offsetX;
    const py = y * h + offsetY;
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
}

export const renderBastion: ThemeRenderer = (
  ctx,
  w,
  h,
  t,
  mx,
  my,
  _deltaSeconds,
  motion,
) => {
  if (!(w > 0) || !(h > 0)) return;

  const M = resolveThemeMotion(motion);
  const effectiveTime = motion?.reducedMotion ? 0 : t;
  const pointerX = finiteClamp(mx, 0, 1, 0.5) - 0.5;
  const pointerY = finiteClamp(my, 0, 1, 0.5) - 0.5;
  const hasStory = M.sectionCount > 0;
  const story = hasStory ? M.storyProgress : 0;
  const rake = 0.5 + 0.5 * Math.sin(effectiveTime * 0.14);
  const offsetX = pointerX * w * 0.006;
  const offsetY = pointerY * h * 0.004;

  ctx.save();

  const field = ctx.createLinearGradient(0, 0, w, h);
  field.addColorStop(0, "rgba(2, 3, 5, 0.86)");
  field.addColorStop(0.58, "rgba(5, 7, 10, 0.52)");
  field.addColorStop(1, "rgba(2, 3, 5, 0.84)");
  ctx.fillStyle = field;
  ctx.fillRect(0, 0, w, h);

  for (let band = 0; band < 48; band += 1) {
    const y = (band / 47) * h;
    const grain = noise2D(band * 0.31, 8.7);
    ctx.strokeStyle =
      grain > 0
        ? `rgba(169, 184, 201, ${0.008 + grain * 0.012})`
        : `rgba(0, 0, 0, ${0.012 + Math.abs(grain) * 0.014})`;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(w * 0.44, y);
    ctx.lineTo(w, y - h * 0.035);
    ctx.stroke();
  }

  const drawPlate = (
    points: readonly Point[],
    depth: number,
    xShift: number,
    yShift: number,
  ) => {
    platePath(ctx, points, w, h, offsetX + xShift, offsetY + yShift);
    const face = ctx.createLinearGradient(
      w * (0.56 + rake * 0.18),
      h * 0.08,
      w * (0.94 - rake * 0.1),
      h * 0.9,
    );
    face.addColorStop(0, `rgba(28, 36, 48, ${0.72 + depth * 0.08})`);
    face.addColorStop(
      Math.max(0.12, Math.min(0.88, 0.24 + rake * 0.48)),
      `rgba(126, 145, 166, ${0.16 + depth * 0.11})`,
    );
    face.addColorStop(0.74, `rgba(11, 15, 21, ${0.86 - depth * 0.08})`);
    face.addColorStop(1, "rgba(3, 5, 8, 0.96)");
    ctx.fillStyle = face;
    ctx.fill();
    ctx.strokeStyle = `rgba(185, 202, 220, ${0.08 + depth * 0.08})`;
    ctx.lineWidth = 1.1 + depth * 0.7;
    ctx.stroke();
  };

  drawPlate(REAR_TOP, 0.25, w * 0.03, h * 0.015);
  drawPlate(REAR_BOTTOM, 0.42, w * 0.02, h * 0.02);

  platePath(ctx, MAIN_SHIELD, w, h, offsetX + w * 0.012, offsetY + h * 0.018);
  ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
  ctx.fill();
  drawPlate(MAIN_SHIELD, 1, 0, 0);

  const insetPanels: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    slant: number;
  }> = [
    { x: 0.67, y: 0.24, width: 0.2, height: 0.19, slant: 0.035 },
    { x: 0.69, y: 0.51, width: 0.18, height: 0.18, slant: -0.028 },
  ];

  insetPanels.forEach((panel, index) => {
    const active = hasStory
      ? storyStepWeight(story, index, insetPanels.length)
      : 0;
    const x = panel.x * w + offsetX;
    const y = panel.y * h + offsetY;
    const width = panel.width * w;
    const height = panel.height * h;
    const slant = panel.slant * w;

    ctx.beginPath();
    ctx.moveTo(x + slant, y);
    ctx.lineTo(x + width, y + h * 0.015);
    ctx.lineTo(x + width - slant * 0.3, y + height);
    ctx.lineTo(x, y + height - h * 0.012);
    ctx.closePath();
    const inset = ctx.createLinearGradient(x, y, x + width, y + height);
    inset.addColorStop(0, "rgba(2, 4, 7, 0.78)");
    inset.addColorStop(0.58, `rgba(58, 72, 89, ${0.13 + active * 0.12})`);
    inset.addColorStop(1, "rgba(3, 5, 8, 0.9)");
    ctx.fillStyle = inset;
    ctx.fill();
    ctx.strokeStyle = `rgba(199, 214, 229, ${0.1 + active * 0.24})`;
    ctx.lineWidth = 1 + active * 0.8;
    ctx.stroke();
  });

  const seams: Array<[number, number, number, number]> = [
    [0.62, 0.29, 0.88, 0.24],
    [0.6, 0.49, 0.91, 0.47],
    [0.63, 0.7, 0.86, 0.76],
    [0.72, 0.13, 0.69, 0.88],
  ];

  seams.forEach(([x0, y0, x1, y1], index) => {
    const active = hasStory
      ? storyStepWeight(story, index, seams.length)
      : 0;
    const focusLift =
      M.hasFocus &&
      Math.abs(((y0 + y1) * 0.5) - finiteClamp(M.focusY, 0, 1, 0.5)) < 0.16
        ? 0.12
        : 0;
    ctx.strokeStyle = `rgba(231, 237, 244, ${0.09 + active * 0.38 + focusLift})`;
    ctx.lineWidth = 0.8 + active * 1.1;
    ctx.beginPath();
    ctx.moveTo(x0 * w + offsetX, y0 * h + offsetY);
    ctx.lineTo(x1 * w + offsetX, y1 * h + offsetY);
    ctx.stroke();
  });

  const rakeX = w * (0.61 + rake * 0.34);
  const reflection = ctx.createLinearGradient(
    rakeX - w * 0.09,
    0,
    rakeX + w * 0.08,
    h,
  );
  reflection.addColorStop(0, "rgba(169, 184, 201, 0)");
  reflection.addColorStop(0.48, "rgba(231, 237, 244, 0.08)");
  reflection.addColorStop(0.53, "rgba(231, 237, 244, 0.13)");
  reflection.addColorStop(1, "rgba(169, 184, 201, 0)");
  platePath(ctx, MAIN_SHIELD, w, h, offsetX, offsetY);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = reflection;
  ctx.fillRect(w * 0.55, 0, w * 0.5, h);
  ctx.restore();

  const readingLane = ctx.createLinearGradient(0, 0, w * 0.68, 0);
  readingLane.addColorStop(0, "rgba(2, 3, 5, 0.92)");
  readingLane.addColorStop(0.64, "rgba(2, 3, 5, 0.64)");
  readingLane.addColorStop(1, "rgba(2, 3, 5, 0)");
  ctx.fillStyle = readingLane;
  ctx.fillRect(0, 0, w * 0.71, h);

  const topVeil = ctx.createLinearGradient(0, 0, 0, h * 0.34);
  topVeil.addColorStop(0, "rgba(2, 3, 5, 0.4)");
  topVeil.addColorStop(1, "rgba(2, 3, 5, 0)");
  ctx.fillStyle = topVeil;
  ctx.fillRect(0, 0, w, h * 0.34);

  ctx.restore();
};
