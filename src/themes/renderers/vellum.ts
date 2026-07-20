import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "../shared/motion";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

const SHEET_TONES = [
  [238, 226, 216],
  [218, 211, 216],
  [229, 218, 205],
  [204, 202, 213],
  [238, 225, 207],
] as const;

function traceSheet(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  layer: number,
  t: number,
  pointerX: number,
  pointerY: number,
  storyProgress: number,
  velocity: number,
) {
  const depth = layer / (SHEET_TONES.length - 1);
  const chapterWeight = storyStepWeight(
    storyProgress,
    layer,
    SHEET_TONES.length,
  );
  const phase = t * (0.075 + layer * 0.009) + layer * 0.82;
  const left =
    w * (0.43 + depth * 0.035) +
    (pointerX - 0.5) * w * (0.012 + depth * 0.008) +
    velocity * w * 0.006;
  const top =
    h * (0.06 + layer * 0.135) +
    Math.sin(phase) * h * 0.012 +
    (pointerY - 0.5) * h * (0.009 + depth * 0.006) -
    chapterWeight * h * 0.008;
  const height = h * (0.245 + depth * 0.025);
  const lower = top + height;
  const lift = h * (0.035 + depth * 0.012);

  ctx.beginPath();
  ctx.moveTo(left, top + lift * 0.55);
  ctx.bezierCurveTo(
    w * 0.59,
    top - lift,
    w * 0.78,
    top + lift * 0.74,
    w + 24,
    top - lift * 0.16,
  );
  ctx.lineTo(w + 24, lower + lift * 0.42);
  ctx.bezierCurveTo(
    w * 0.82,
    lower + lift,
    w * 0.62,
    lower - lift * 0.58,
    left,
    lower + lift * 0.24,
  );
  ctx.closePath();

  return { chapterWeight, left, lower, top };
}

/** Translucent paper leaves drift at the right edge of a calm editorial stage. */
export const renderVellum: ThemeRenderer = (
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

  ctx.save();

  const background = ctx.createLinearGradient(0, 0, w, h);
  background.addColorStop(0, "#100D13");
  background.addColorStop(0.5, "#17151B");
  background.addColorStop(1, "#08070B");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  // Far plane: a soft window of paper-colored light and barely visible grain.
  const lightX = w * (0.79 + (mx - 0.5) * 0.018);
  const paperLight = ctx.createRadialGradient(
    lightX,
    h * 0.3,
    0,
    lightX,
    h * 0.34,
    Math.max(w, h) * 0.62,
  );
  paperLight.addColorStop(0, "rgba(244, 228, 208, 0.12)");
  paperLight.addColorStop(0.42, "rgba(191, 174, 182, 0.05)");
  paperLight.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = paperLight;
  ctx.fillRect(w * 0.32, 0, w * 0.68, h);

  ctx.save();
  ctx.fillStyle = "rgba(255, 244, 231, 0.06)";
  for (let grain = 0; grain < 58; grain += 1) {
    const seed = grain * 0.731 + 0.19;
    const depth = 0.35 + (grain % 5) * 0.13;
    const x = w * (0.4 + (Math.sin(seed * 5.9) * 0.5 + 0.5) * 0.64);
    const y =
      (Math.cos(seed * 4.3) * 0.5 + 0.5) * h +
      Math.sin(t * (0.04 + depth * 0.025) + seed) * h * 0.008;
    ctx.globalAlpha = 0.018 + depth * 0.025;
    ctx.fillRect(x, y, 0.5 + depth * 0.8, 0.5 + depth * 0.8);
  }
  ctx.restore();

  // Middle plane: separate translucent leaves with shadow, tooth, and folded
  // edge light. Each chapter gently brings one leaf forward.
  const sheetAnchors: Array<{ x: number; y: number }> = [];
  for (let layer = 0; layer < SHEET_TONES.length; layer += 1) {
    const [red, green, blue] = SHEET_TONES[layer];
    const geometry = traceSheet(
      ctx,
      w,
      h,
      layer,
      t,
      mx,
      my,
      storyProgress,
      velocity,
    );
    sheetAnchors.push({
      x: w * (0.73 + layer * 0.025),
      y: (geometry.top + geometry.lower) * 0.5,
    });

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.42)";
    ctx.shadowBlur = 18 + layer * 2;
    ctx.shadowOffsetY = 5 + layer;
    const fill = ctx.createLinearGradient(geometry.left, 0, w, 0);
    fill.addColorStop(0, `rgba(${red}, ${green}, ${blue}, 0.025)`);
    fill.addColorStop(
      0.38,
      `rgba(${red}, ${green}, ${blue}, ${0.075 + layer * 0.012})`,
    );
    fill.addColorStop(
      0.78,
      `rgba(${red}, ${green}, ${blue}, ${0.13 + geometry.chapterWeight * 0.045})`,
    );
    fill.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0.055)`);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.clip();
    for (let fiber = 0; fiber < 6; fiber += 1) {
      const ratio = (fiber + 1) / 7;
      const y =
        geometry.top +
        (geometry.lower - geometry.top) * ratio +
        Math.sin(fiber * 1.7 + layer) * h * 0.006;
      ctx.beginPath();
      ctx.moveTo(geometry.left, y);
      ctx.bezierCurveTo(w * 0.62, y - 5, w * 0.82, y + 7, w + 16, y - 3);
      ctx.strokeStyle = `rgba(255, 248, 239, ${0.018 + (fiber % 2) * 0.012})`;
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
    ctx.restore();

    traceSheet(ctx, w, h, layer, t, mx, my, storyProgress, velocity);
    ctx.strokeStyle = `rgba(255, 247, 235, ${0.1 + geometry.chapterWeight * 0.14})`;
    ctx.lineWidth = 0.8 + geometry.chapterWeight * 0.55;
    ctx.stroke();
  }

  // Foreground plane: a narrow deckled edge and chapter-linked focus stitch.
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const edge = ctx.createLinearGradient(w * 0.68, 0, w, 0);
  edge.addColorStop(0, "rgba(255, 242, 225, 0)");
  edge.addColorStop(0.78, "rgba(255, 242, 225, 0.035)");
  edge.addColorStop(1, "rgba(255, 250, 242, 0.11)");
  ctx.fillStyle = edge;
  ctx.fillRect(w * 0.6, 0, w * 0.4, h);
  ctx.restore();

  if (pageMotion.hasFocus && sheetAnchors.length > 0) {
    const activeIndex = Math.min(
      sheetAnchors.length - 1,
      Math.round(storyProgress * (sheetAnchors.length - 1)),
    );
    const anchor = sheetAnchors[activeIndex];
    const focusX = pageMotion.focusX * w;
    const focusY = pageMotion.focusY * h;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(anchor.x, anchor.y);
    ctx.quadraticCurveTo(w * 0.84, focusY, focusX, focusY);
    ctx.setLineDash([2, 6]);
    ctx.strokeStyle = `rgba(246, 232, 217, ${0.12 + pageMotion.interactionImpulse * 0.16})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    const echo = 8 + (1 - pageMotion.interactionImpulse) * 18;
    ctx.strokeRect(focusX - echo * 0.5, focusY - echo * 0.5, echo, echo);
    ctx.restore();
  }

  const clearSpace = ctx.createLinearGradient(0, 0, w * 0.58, 0);
  clearSpace.addColorStop(0, "rgba(8, 6, 10, 0.58)");
  clearSpace.addColorStop(0.76, "rgba(8, 6, 10, 0.2)");
  clearSpace.addColorStop(1, "rgba(8, 6, 10, 0)");
  ctx.fillStyle = clearSpace;
  ctx.fillRect(0, 0, w * 0.62, h);

  const vignette = ctx.createRadialGradient(
    w * 0.76,
    h * 0.43,
    minSide * 0.14,
    w * 0.62,
    h * 0.46,
    Math.max(w, h) * 0.78,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(3, 2, 5, 0.4)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  // Keep the static frame visually finished even at very small preview sizes.
  ctx.beginPath();
  ctx.arc(w * 0.94, h * 0.11, minSide * 0.0025, 0, TAU);
  ctx.fillStyle = "rgba(255, 248, 238, 0.34)";
  ctx.fill();

  ctx.restore();
};
