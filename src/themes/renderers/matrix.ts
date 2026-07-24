import { finiteClamp, resolveThemeMotion } from "../shared/motion";
import { createSeededRandom } from "../shared/random";
import type { ThemeRenderer } from "../types";

interface MatrixCell {
  coefficient: number;
  phase: number;
  depth: number;
}

const ROWS = 7;
const COLUMNS = 6;
const CELLS: MatrixCell[] = (() => {
  const random = createSeededRandom(0x4d415452);
  return Array.from({ length: ROWS * COLUMNS }, () => ({
    coefficient: random(),
    phase: random() * Math.PI * 2,
    depth: 0.45 + random() * 0.55,
  }));
})();

export const renderMatrix: ThemeRenderer = (
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
  const hasStory = M.sectionCount > 0;
  const story = hasStory ? M.storyProgress : 0.5;
  const pointerX = finiteClamp(mx, 0, 1, 0.5) - 0.5;
  const pointerY = finiteClamp(my, 0, 1, 0.5) - 0.5;
  const minSide = Math.min(w, h);

  ctx.save();

  const ground = ctx.createLinearGradient(0, 0, w, h);
  ground.addColorStop(0, "rgba(1, 5, 3, 0.82)");
  ground.addColorStop(0.56, "rgba(2, 10, 6, 0.36)");
  ground.addColorStop(1, "rgba(1, 4, 3, 0.72)");
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, w, h);

  const artLeft = w * 0.59 + pointerX * w * 0.008;
  const artTop = h * 0.095 + pointerY * h * 0.006;
  const cellWidth = Math.min(76, Math.max(42, w * 0.061));
  const cellHeight = Math.min(58, Math.max(34, h * 0.076));
  const skewX = -cellWidth * 0.24;
  const skewY = cellHeight * 0.12;
  const planeWidth = cellWidth * (COLUMNS + 0.72);
  const planeHeight = cellHeight * (ROWS + 0.45);

  const backplate = ctx.createLinearGradient(
    artLeft,
    artTop,
    artLeft + planeWidth,
    artTop + planeHeight,
  );
  backplate.addColorStop(0, "rgba(8, 32, 20, 0.16)");
  backplate.addColorStop(0.58, "rgba(13, 58, 35, 0.1)");
  backplate.addColorStop(1, "rgba(1, 9, 5, 0.34)");
  ctx.fillStyle = backplate;
  ctx.beginPath();
  ctx.moveTo(artLeft + skewX * 0.7, artTop);
  ctx.lineTo(artLeft + planeWidth, artTop + skewY * COLUMNS);
  ctx.lineTo(
    artLeft + planeWidth + skewX * ROWS,
    artTop + planeHeight + skewY * COLUMNS,
  );
  ctx.lineTo(artLeft + skewX * ROWS, artTop + planeHeight);
  ctx.closePath();
  ctx.fill();

  const activeColumn = story * (COLUMNS - 1);
  const focusRow = M.hasFocus
    ? finiteClamp(M.focusY, 0, 1, 0.5) * (ROWS - 1)
    : story * (ROWS - 1);
  const rake =
    0.18 +
    (0.5 + 0.5 * Math.sin(effectiveTime * 0.17)) * 0.64 +
    M.scrollVelocity * 0.015;

  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const cell = CELLS[row * COLUMNS + column];
      const x = artLeft + column * cellWidth + row * skewX;
      const y = artTop + row * cellHeight + column * skewY;
      const columnWeight = Math.max(0, 1 - Math.abs(column - activeColumn));
      const rowWeight = Math.max(0, 1 - Math.abs(row - focusRow));
      const storyWeight = hasStory ? columnWeight * (0.42 + rowWeight * 0.58) : 0;
      const normalizedX = (column + row * 0.18) / (COLUMNS + ROWS * 0.18);
      const rakeWeight = Math.max(0, 1 - Math.abs(normalizedX - rake) / 0.24);
      const ambient =
        0.5 + 0.5 * Math.sin(effectiveTime * 0.12 + cell.phase);
      const lift =
        0.018 +
        rakeWeight * 0.08 * cell.depth +
        storyWeight * (0.08 + M.interactionImpulse * 0.05) +
        ambient * 0.012;

      const face = ctx.createLinearGradient(
        x,
        y,
        x + cellWidth * 0.82,
        y + cellHeight * 0.72,
      );
      face.addColorStop(0, `rgba(118, 239, 153, ${lift * 0.48})`);
      face.addColorStop(0.42, `rgba(44, 153, 91, ${lift})`);
      face.addColorStop(1, "rgba(3, 24, 13, 0.08)");

      ctx.beginPath();
      ctx.moveTo(x, y + cellHeight * 0.08);
      ctx.lineTo(x + cellWidth * 0.76, y);
      ctx.lineTo(
        x + cellWidth * 0.88,
        y + cellHeight * 0.7,
      );
      ctx.lineTo(x + cellWidth * 0.1, y + cellHeight * 0.82);
      ctx.closePath();
      ctx.fillStyle = face;
      ctx.fill();
      ctx.strokeStyle = `rgba(105, 232, 135, ${0.055 + rakeWeight * 0.08 + storyWeight * 0.16})`;
      ctx.lineWidth = storyWeight > 0.5 ? 1.25 : 0.75;
      ctx.stroke();

      const markLength = cellWidth * (0.14 + cell.coefficient * 0.28);
      const markY = y + cellHeight * (0.34 + cell.coefficient * 0.24);
      ctx.strokeStyle = `rgba(213, 255, 223, ${0.035 + rakeWeight * 0.08 + storyWeight * 0.18})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x + cellWidth * 0.2, markY);
      ctx.lineTo(x + cellWidth * 0.2 + markLength, markY - cellHeight * 0.035);
      ctx.stroke();
    }
  }

  if (hasStory) {
    const pathPoints: Array<[number, number]> = [];
    for (let column = 0; column < COLUMNS; column += 1) {
      const row =
        (column * 2 + Math.floor(story * ROWS)) % ROWS;
      pathPoints.push([
        artLeft +
          column * cellWidth +
          row * skewX +
          cellWidth * 0.43,
        artTop +
          row * cellHeight +
          column * skewY +
          cellHeight * 0.39,
      ]);
    }

    ctx.strokeStyle = "rgba(105, 232, 135, 0.2)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    pathPoints.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    const pathPosition = story * (pathPoints.length - 1);
    const pathIndex = Math.min(
      pathPoints.length - 2,
      Math.floor(pathPosition),
    );
    const pathProgress = pathPosition - pathIndex;
    const from = pathPoints[pathIndex];
    const to = pathPoints[pathIndex + 1];
    const signalX = from[0] + (to[0] - from[0]) * pathProgress;
    const signalY = from[1] + (to[1] - from[1]) * pathProgress;
    const signalSize = 7 + M.interactionImpulse * 3;

    ctx.strokeStyle = "rgba(213, 255, 223, 0.66)";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      signalX - signalSize,
      signalY - signalSize,
      signalSize * 2,
      signalSize * 2,
    );
    ctx.fillStyle = "rgba(213, 255, 223, 0.58)";
    ctx.fillRect(signalX - 1.5, signalY - 1.5, 3, 3);
  }

  const readingLane = ctx.createLinearGradient(0, 0, w * 0.66, 0);
  readingLane.addColorStop(0, "rgba(1, 5, 3, 0.9)");
  readingLane.addColorStop(0.62, "rgba(1, 5, 3, 0.56)");
  readingLane.addColorStop(1, "rgba(1, 5, 3, 0)");
  ctx.fillStyle = readingLane;
  ctx.fillRect(0, 0, w * 0.69, h);

  const vignette = ctx.createRadialGradient(
    w * 0.74,
    h * 0.42,
    minSide * 0.15,
    w * 0.56,
    h * 0.5,
    Math.max(w, h) * 0.82,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(0.72, "rgba(0, 0, 0, 0.06)");
  vignette.addColorStop(1, "rgba(0, 3, 1, 0.58)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
};
