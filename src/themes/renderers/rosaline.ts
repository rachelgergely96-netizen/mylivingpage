import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "../shared/motion";
import type { ThemeRenderer } from "../types";

type Point = readonly [number, number];

const OUTER_POINTS: ReadonlyArray<Point> = [
  [-0.08, -1],
  [0.31, -0.79],
  [0.66, -0.43],
  [0.9, 0.03],
  [0.63, 0.58],
  [0.2, 0.96],
  [-0.28, 0.84],
  [-0.69, 0.45],
  [-0.82, -0.12],
  [-0.49, -0.67],
] as const;

const FACETS: ReadonlyArray<ReadonlyArray<number>> = [
  [0, 1, 11],
  [1, 2, 12, 11],
  [2, 3, 12],
  [3, 4, 13, 12],
  [4, 5, 13],
  [5, 6, 13],
  [6, 7, 14, 13],
  [7, 8, 14],
  [8, 9, 11, 14],
  [9, 0, 11],
  [11, 12, 10],
  [12, 13, 10],
  [13, 14, 10],
  [14, 11, 10],
] as const;

const FACET_COLORS = [
  [235, 151, 181],
  [190, 93, 139],
  [247, 185, 203],
  [151, 67, 119],
  [220, 119, 159],
  [247, 173, 194],
  [174, 78, 128],
  [232, 140, 171],
  [135, 61, 109],
  [213, 110, 153],
  [250, 192, 211],
  [190, 91, 141],
  [228, 132, 168],
  [162, 71, 124],
] as const;

function tracePolygon(ctx: CanvasRenderingContext2D, points: ReadonlyArray<Point>) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index][0], points[index][1]);
  }
  ctx.closePath();
}

export const renderRosaline: ThemeRenderer = (
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
  const cx = w * 0.79 + pointerX * minSide * 0.045;
  const cy = h * 0.5 + pointerY * minSide * 0.035;
  const rx = minSide * 0.33;
  const ry = minSide * 0.42;
  const nodes: Point[] = OUTER_POINTS.map(([x, y]) => [cx + x * rx, cy + y * ry]);
  nodes.push(
    [cx - rx * 0.03, cy + ry * 0.02],
    [cx - rx * 0.08, cy - ry * 0.53],
    [cx + rx * 0.43, cy - ry * 0.12],
    [cx + rx * 0.08, cy + ry * 0.57],
    [cx - rx * 0.42, cy + ry * 0.02],
  );

  ctx.save();

  const background = ctx.createLinearGradient(0, 0, w, h);
  background.addColorStop(0, "#170B16");
  background.addColorStop(0.5, "#100810");
  background.addColorStop(1, "#040305");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  // Far plane: rose haze and a handful of fixed crystal splinters.
  const haze = ctx.createRadialGradient(cx, cy - ry * 0.15, 0, cx, cy, ry * 1.85);
  haze.addColorStop(0, "rgba(235, 121, 165, 0.2)");
  haze.addColorStop(0.47, "rgba(123, 50, 96, 0.09)");
  haze.addColorStop(1, "rgba(5, 3, 6, 0)");
  ctx.fillStyle = haze;
  ctx.fillRect(w * 0.34, 0, w * 0.66, h);

  for (let shard = 0; shard < 14; shard += 1) {
    const seed = shard + 1;
    const x = w * (0.52 + (0.5 + 0.5 * Math.sin(seed * 7.71)) * 0.46);
    const y = h * (0.08 + (0.5 + 0.5 * Math.cos(seed * 5.37)) * 0.84);
    const length = minSide * (0.012 + (shard % 4) * 0.006);
    const angle = seed * 1.31 + t * 0.018;
    ctx.beginPath();
    ctx.moveTo(x, y - length);
    ctx.lineTo(x + Math.cos(angle) * length * 0.45, y);
    ctx.lineTo(x, y + length);
    ctx.lineTo(x - Math.cos(angle) * length * 0.28, y);
    ctx.closePath();
    ctx.fillStyle = `rgba(244, 165, 194, ${0.035 + (shard % 3) * 0.025})`;
    ctx.fill();
  }

  ctx.save();
  ctx.translate(rx * 0.045, ry * 0.045);
  tracePolygon(ctx, nodes.slice(0, OUTER_POINTS.length));
  ctx.fillStyle = "rgba(0, 0, 0, 0.46)";
  ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
  ctx.shadowBlur = minSide * 0.06;
  ctx.fill();
  ctx.restore();

  // Middle plane: one coherent rose crystal with an intentional facet map.
  const body = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
  body.addColorStop(0, "rgba(255, 199, 216, 0.82)");
  body.addColorStop(0.38, "rgba(183, 79, 132, 0.88)");
  body.addColorStop(0.7, "rgba(115, 44, 93, 0.94)");
  body.addColorStop(1, "rgba(239, 139, 172, 0.72)");
  tracePolygon(ctx, nodes.slice(0, OUTER_POINTS.length));
  ctx.fillStyle = body;
  ctx.fill();

  for (let facetIndex = 0; facetIndex < FACETS.length; facetIndex += 1) {
    const facet = FACETS[facetIndex].map((nodeIndex) => nodes[nodeIndex]);
    const color = FACET_COLORS[facetIndex];
    const storyIndex = facetIndex % 7;
    const weight = storyStepWeight(page.storyProgress, storyIndex, 7);
    tracePolygon(ctx, facet);
    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${0.18 + weight * 0.2})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 220, 232, ${0.11 + weight * 0.16})`;
    ctx.lineWidth = 0.8 + weight * 0.6;
    ctx.stroke();
  }

  tracePolygon(ctx, nodes.slice(0, OUTER_POINTS.length));
  ctx.strokeStyle = "rgba(255, 217, 231, 0.52)";
  ctx.lineWidth = Math.max(1.2, minSide * 0.0025);
  ctx.stroke();

  // Foreground: refracted beams and edge glints move independently of the stone.
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let beam = 0; beam < 4; beam += 1) {
    const angle = -1.15 + beam * 0.42 + Math.sin(t * 0.06 + beam) * 0.025;
    const length = minSide * (0.42 + beam * 0.06);
    const width = minSide * (0.025 + beam * 0.007);
    ctx.beginPath();
    ctx.moveTo(cx + rx * 0.04, cy - ry * 0.08);
    ctx.lineTo(cx + Math.cos(angle) * length - width, cy + Math.sin(angle) * length);
    ctx.lineTo(cx + Math.cos(angle) * length + width, cy + Math.sin(angle) * length);
    ctx.closePath();
    ctx.fillStyle = `rgba(255, 160, 200, ${0.025 + beam * 0.009})`;
    ctx.fill();
  }
  ctx.restore();

  const glintNodes = [0, 2, 4, 6, 9, 11, 12];
  for (let index = 0; index < glintNodes.length; index += 1) {
    const point = nodes[glintNodes[index]];
    const shimmer = 0.5 + 0.5 * Math.sin(t * 0.55 + index * 1.7);
    const size = minSide * (0.006 + shimmer * 0.006);
    ctx.beginPath();
    ctx.moveTo(point[0] - size, point[1]);
    ctx.lineTo(point[0] + size, point[1]);
    ctx.moveTo(point[0], point[1] - size);
    ctx.lineTo(point[0], point[1] + size);
    ctx.strokeStyle = `rgba(255, 235, 241, ${0.22 + shimmer * 0.48})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  if (page.hasFocus) {
    ctx.beginPath();
    ctx.moveTo(page.focusX * w, page.focusY * h);
    ctx.quadraticCurveTo(w * 0.63, page.focusY * h, nodes[8][0], nodes[8][1]);
    ctx.strokeStyle = "rgba(250, 181, 207, 0.22)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const clearSpace = ctx.createLinearGradient(0, 0, w * 0.68, 0);
  clearSpace.addColorStop(0, "rgba(10, 5, 10, 0.84)");
  clearSpace.addColorStop(0.64, "rgba(10, 5, 10, 0.5)");
  clearSpace.addColorStop(1, "rgba(10, 5, 10, 0)");
  ctx.fillStyle = clearSpace;
  ctx.fillRect(0, 0, w * 0.68, h);

  const vignette = ctx.createRadialGradient(cx, cy, minSide * 0.16, w * 0.56, h * 0.5, Math.max(w, h) * 0.84);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.4)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
};
