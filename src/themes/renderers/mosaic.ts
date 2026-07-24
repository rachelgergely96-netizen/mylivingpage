import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "../shared/motion";
import type { ThemeRenderer } from "../types";

type Point = readonly [number, number];

interface GlassFacet {
  points: readonly Point[];
  colorA: readonly [number, number, number];
  colorB: readonly [number, number, number];
  phase: number;
}

const FACETS: readonly GlassFacet[] = [
  {
    points: [[0.57, 0.08], [0.74, 0.04], [0.7, 0.34], [0.53, 0.28]],
    colorA: [41, 119, 132],
    colorB: [18, 54, 82],
    phase: 0.03,
  },
  {
    points: [[0.75, 0.04], [0.94, 0.12], [0.86, 0.35], [0.71, 0.34]],
    colorA: [45, 95, 151],
    colorB: [18, 38, 83],
    phase: 0.16,
  },
  {
    points: [[0.95, 0.12], [1.04, 0.2], [1.02, 0.48], [0.87, 0.35]],
    colorA: [78, 118, 139],
    colorB: [24, 55, 73],
    phase: 0.28,
  },
  {
    points: [[0.53, 0.3], [0.7, 0.35], [0.65, 0.6], [0.47, 0.52]],
    colorA: [52, 132, 127],
    colorB: [14, 63, 67],
    phase: 0.41,
  },
  {
    points: [[0.71, 0.36], [0.87, 0.36], [0.82, 0.63], [0.65, 0.6]],
    colorA: [91, 75, 139],
    colorB: [28, 46, 92],
    phase: 0.54,
  },
  {
    points: [[0.88, 0.37], [1.03, 0.49], [0.98, 0.72], [0.82, 0.64]],
    colorA: [43, 136, 142],
    colorB: [15, 66, 80],
    phase: 0.67,
  },
  {
    points: [[0.47, 0.54], [0.65, 0.62], [0.58, 0.87], [0.39, 0.78]],
    colorA: [38, 91, 123],
    colorB: [13, 42, 68],
    phase: 0.79,
  },
  {
    points: [[0.66, 0.63], [0.82, 0.65], [0.78, 0.9], [0.59, 0.87]],
    colorA: [41, 121, 112],
    colorB: [14, 58, 65],
    phase: 0.91,
  },
  {
    points: [[0.83, 0.66], [0.99, 0.73], [0.94, 0.98], [0.78, 0.9]],
    colorA: [94, 67, 120],
    colorB: [35, 31, 77],
    phase: 0.22,
  },
  {
    points: [[0.4, 0.8], [0.58, 0.89], [0.54, 1.04], [0.34, 1.03]],
    colorA: [32, 102, 112],
    colorB: [11, 43, 60],
    phase: 0.35,
  },
  {
    points: [[0.59, 0.9], [0.78, 0.92], [0.82, 1.04], [0.54, 1.04]],
    colorA: [62, 110, 139],
    colorB: [18, 48, 78],
    phase: 0.48,
  },
];

function facetPath(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
  w: number,
  h: number,
  offsetX: number,
  offsetY: number,
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

export const renderMosaic: ThemeRenderer = (
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
  const offsetX = pointerX * w * 0.008;
  const offsetY = pointerY * h * 0.006;
  const ambientCaustic =
    0.22 + (0.5 + 0.5 * Math.sin(effectiveTime * 0.16)) * 0.56;
  const causticPosition = hasStory
    ? ambientCaustic * 0.32 + (0.15 + story * 0.72) * 0.68
    : ambientCaustic;
  const focusY = M.hasFocus
    ? finiteClamp(M.focusY, 0, 1, 0.5)
    : causticPosition;

  ctx.save();

  const ground = ctx.createLinearGradient(0, 0, w, h);
  ground.addColorStop(0, "rgba(5, 7, 13, 0.92)");
  ground.addColorStop(0.56, "rgba(6, 13, 22, 0.64)");
  ground.addColorStop(1, "rgba(3, 5, 9, 0.9)");
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, w, h);

  const underpainting = ctx.createLinearGradient(
    w * 0.48,
    h * 0.12,
    w,
    h * 0.88,
  );
  underpainting.addColorStop(0, "rgba(61, 143, 150, 0.04)");
  underpainting.addColorStop(0.5, "rgba(51, 94, 133, 0.08)");
  underpainting.addColorStop(1, "rgba(78, 47, 103, 0.04)");
  ctx.fillStyle = underpainting;
  ctx.beginPath();
  ctx.moveTo(w * 0.48 + offsetX, h * 0.04 + offsetY);
  ctx.lineTo(w * 1.04 + offsetX, h * 0.14 + offsetY);
  ctx.lineTo(w * 0.96 + offsetX, h * 1.04 + offsetY);
  ctx.lineTo(w * 0.31 + offsetX, h * 1.04 + offsetY);
  ctx.closePath();
  ctx.fill();

  FACETS.forEach((facet, index) => {
    const active = hasStory
      ? storyStepWeight(story, index, FACETS.length)
      : 0;
    const localCaustic = Math.max(
      0,
      1 -
        Math.abs(
          causticPosition -
            (facet.phase * 0.22 +
              facet.points.reduce((sum, point) => sum + point[1], 0) /
                facet.points.length),
        ) /
          0.2,
    );
    const focusLift =
      M.hasFocus &&
      Math.abs(
        focusY -
          facet.points.reduce((sum, point) => sum + point[1], 0) /
            facet.points.length,
      ) < 0.18
        ? 0.08
        : 0;
    const alpha = 0.28 + active * 0.16 + localCaustic * 0.12 + focusLift;

    facetPath(ctx, facet.points, w, h, offsetX, offsetY);
    const boundsX =
      (facet.points[0][0] + facet.points[2][0]) * 0.5 * w + offsetX;
    const boundsY =
      (facet.points[0][1] + facet.points[2][1]) * 0.5 * h + offsetY;
    const face = ctx.createLinearGradient(
      boundsX - w * 0.11,
      boundsY - h * 0.12,
      boundsX + w * 0.12,
      boundsY + h * 0.16,
    );
    face.addColorStop(
      0,
      `rgba(${facet.colorA[0]}, ${facet.colorA[1]}, ${facet.colorA[2]}, ${alpha})`,
    );
    face.addColorStop(
      0.62,
      `rgba(${facet.colorB[0]}, ${facet.colorB[1]}, ${facet.colorB[2]}, ${alpha * 0.86})`,
    );
    face.addColorStop(1, "rgba(3, 7, 12, 0.34)");
    ctx.fillStyle = face;
    ctx.fill();

    ctx.save();
    facetPath(ctx, facet.points, w, h, offsetX, offsetY);
    ctx.clip();
    const causticY = (causticPosition + facet.phase * 0.08) * h;
    const caustic = ctx.createLinearGradient(
      w * 0.46,
      causticY - h * 0.12,
      w,
      causticY + h * 0.08,
    );
    caustic.addColorStop(0, "rgba(215, 248, 247, 0)");
    caustic.addColorStop(0.46, "rgba(215, 248, 247, 0.02)");
    caustic.addColorStop(
      0.52,
      `rgba(215, 248, 247, ${0.05 + localCaustic * 0.13 + active * 0.08})`,
    );
    caustic.addColorStop(0.62, "rgba(130, 215, 219, 0.015)");
    caustic.addColorStop(1, "rgba(215, 248, 247, 0)");
    ctx.fillStyle = caustic;
    ctx.fillRect(w * 0.31, 0, w * 0.74, h);
    ctx.restore();

    facetPath(ctx, facet.points, w, h, offsetX, offsetY);
    ctx.strokeStyle = `rgba(2, 9, 15, ${0.84 - active * 0.08})`;
    ctx.lineWidth = 3.4;
    ctx.stroke();

    facetPath(ctx, facet.points, w, h, offsetX, offsetY);
    ctx.strokeStyle = `rgba(215, 248, 247, ${0.06 + localCaustic * 0.14 + active * 0.16})`;
    ctx.lineWidth = 0.85 + active * 0.65;
    ctx.stroke();
  });

  const readingLane = ctx.createLinearGradient(0, 0, w * 0.68, 0);
  readingLane.addColorStop(0, "rgba(5, 7, 13, 0.94)");
  readingLane.addColorStop(0.62, "rgba(5, 7, 13, 0.7)");
  readingLane.addColorStop(1, "rgba(5, 7, 13, 0)");
  ctx.fillStyle = readingLane;
  ctx.fillRect(0, 0, w * 0.72, h);

  const vignette = ctx.createRadialGradient(
    w * 0.76,
    h * 0.46,
    Math.min(w, h) * 0.16,
    w * 0.58,
    h * 0.52,
    Math.max(w, h) * 0.82,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(0.72, "rgba(0, 0, 0, 0.04)");
  vignette.addColorStop(1, "rgba(1, 3, 7, 0.52)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
};
