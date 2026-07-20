import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "../shared/motion";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;
const CONTOUR_COUNT = 11;
const CONTOUR_SAMPLES = 84;

function drawContour(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  level: number,
  phase: number,
  velocity: number,
) {
  ctx.beginPath();
  for (let sample = 0; sample <= CONTOUR_SAMPLES; sample += 1) {
    const angle = (sample / CONTOUR_SAMPLES) * TAU;
    const lowFrequency = Math.sin(angle * 3 + level * 0.71 + phase) * 0.055;
    const midFrequency = Math.sin(angle * 5 - level * 0.43 - phase * 0.7) * 0.032;
    const ridge = Math.cos(angle * 9 + level * 0.37) * 0.014;
    const contourScale = 1 + lowFrequency + midFrequency + ridge;
    const shear = velocity * Math.sin(angle) * radiusX * 0.018;
    const x = centerX + Math.cos(angle) * radiusX * contourScale + shear;
    const y =
      centerY +
      Math.sin(angle) * radiusY * contourScale +
      Math.sin(angle * 2 + level) * radiusY * 0.018;

    if (sample === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Connected, bounded contour paths arranged around a content-safe survey map. */
export const renderTopo: ThemeRenderer = (
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
  const velocity = finiteClamp(pageMotion.scrollVelocity / 3, -1, 1);
  const storyProgress = pageMotion.storyProgress;
  const minSide = Math.min(w, h);
  const centerX =
    w * 0.73 +
    (mx - 0.5) * w * 0.025 +
    (storyProgress - 0.5) * w * 0.025;
  const centerY =
    h * (0.47 + (my - 0.5) * 0.025) +
    (storyProgress - 0.5) * h * 0.045;
  const phase = t * 0.025 + storyProgress * 0.72;

  ctx.save();

  const background = ctx.createLinearGradient(0, 0, w, h);
  background.addColorStop(0, "#050908");
  background.addColorStop(0.5, "#07110D");
  background.addColorStop(1, "#03100B");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  // Far plane: a dim terrain mass and sparse survey grid, confined mostly to
  // the art side so the resume's reading lane remains quiet.
  const terrainGlow = ctx.createRadialGradient(
    centerX,
    centerY,
    minSide * 0.04,
    centerX,
    centerY,
    minSide * 0.7,
  );
  terrainGlow.addColorStop(0, "rgba(65, 148, 103, 0.14)");
  terrainGlow.addColorStop(0.52, "rgba(28, 91, 65, 0.06)");
  terrainGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = terrainGlow;
  ctx.fillRect(w * 0.34, 0, w * 0.66, h);

  ctx.save();
  ctx.strokeStyle = "rgba(128, 190, 153, 0.035)";
  ctx.lineWidth = 1;
  const gridStep = Math.max(42, Math.round(minSide * 0.075));
  for (let x = w * 0.43; x <= w; x += gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = gridStep * 0.5; y <= h; y += gridStep) {
    ctx.beginPath();
    ctx.moveTo(w * 0.43, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();

  // Middle plane: eleven connected contours. Runtime is bounded to fewer than
  // one thousand points per frame, independent of canvas resolution.
  for (let level = CONTOUR_COUNT - 1; level >= 0; level -= 1) {
    const normalized = level / Math.max(1, CONTOUR_COUNT - 1);
    const radiusX = minSide * (0.09 + normalized * 0.38);
    const radiusY = minSide * (0.065 + normalized * 0.29);
    const chapterWeight = storyStepWeight(
      storyProgress,
      CONTOUR_COUNT - 1 - level,
      CONTOUR_COUNT,
    );

    drawContour(
      ctx,
      centerX + Math.sin(level * 0.91) * minSide * 0.018,
      centerY + Math.cos(level * 0.67) * minSide * 0.014,
      radiusX,
      radiusY,
      level,
      phase,
      velocity,
    );

    if (level % 3 === 0) {
      ctx.fillStyle = `rgba(28, 103, 69, ${0.012 + (1 - normalized) * 0.016})`;
      ctx.fill();
    }
    ctx.strokeStyle = `rgba(126, 221, 166, ${0.075 + (1 - normalized) * 0.12 + chapterWeight * 0.13})`;
    ctx.lineWidth = 0.75 + (1 - normalized) * 0.55 + chapterWeight * 0.45;
    ctx.stroke();
  }

  // Foreground plane: survey route, elevation markers, and the currently
  // focused resume item represented as a restrained map coordinate.
  const routePoints = [
    [0.57, 0.68],
    [0.65, 0.53],
    [0.75, 0.58],
    [0.83, 0.38],
    [0.91, 0.48],
  ] as const;
  ctx.save();
  ctx.beginPath();
  routePoints.forEach(([px, py], index) => {
    const x = w * px + storyProgress * w * 0.012;
    const y = h * py - velocity * h * 0.012;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.setLineDash([4, 7]);
  ctx.lineDashOffset = -t * 3 - storyProgress * 18;
  ctx.strokeStyle = "rgba(186, 240, 207, 0.2)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.setLineDash([]);

  routePoints.forEach(([px, py], index) => {
    const weight = storyStepWeight(storyProgress, index, routePoints.length);
    const x = w * px + storyProgress * w * 0.012;
    const y = h * py - velocity * h * 0.012;
    ctx.fillStyle = `rgba(214, 255, 228, ${0.34 + weight * 0.5})`;
    ctx.fillRect(x - 1.5 - weight, y - 1.5 - weight, 3 + weight * 2, 3 + weight * 2);
  });
  ctx.restore();

  if (pageMotion.hasFocus) {
    const focusX = pageMotion.focusX * w;
    const focusY = pageMotion.focusY * h;
    const size = 8 + pageMotion.interactionImpulse * 7;
    ctx.save();
    ctx.strokeStyle = `rgba(190, 242, 209, ${0.32 + pageMotion.interactionImpulse * 0.28})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(focusX - size * 0.5, focusY - size * 0.5, size, size);
    ctx.beginPath();
    ctx.moveTo(focusX + size * 0.5, focusY);
    ctx.lineTo(centerX, centerY);
    ctx.strokeStyle = "rgba(137, 211, 167, 0.1)";
    ctx.stroke();
    ctx.restore();
  }

  // Final reading-lane wash and edge finish.
  const clearSpace = ctx.createLinearGradient(0, 0, w * 0.58, 0);
  clearSpace.addColorStop(0, "rgba(2, 6, 5, 0.48)");
  clearSpace.addColorStop(0.72, "rgba(2, 6, 5, 0.2)");
  clearSpace.addColorStop(1, "rgba(2, 6, 5, 0)");
  ctx.fillStyle = clearSpace;
  ctx.fillRect(0, 0, w * 0.62, h);

  const vignette = ctx.createRadialGradient(
    w * 0.68,
    h * 0.48,
    minSide * 0.12,
    w * 0.62,
    h * 0.48,
    Math.max(w, h) * 0.78,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 3, 2, 0.36)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
};
