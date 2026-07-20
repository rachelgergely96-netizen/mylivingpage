import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "../shared/motion";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;
const RIBBON_COUNT = 5;

interface RibbonGeometry {
  left: number;
  right: number;
  y: number;
  thickness: number;
  bend: number;
  shift: number;
}

function traceRibbon(
  ctx: CanvasRenderingContext2D,
  geometry: RibbonGeometry,
): void {
  const { left, right, y, thickness, bend, shift } = geometry;
  const span = right - left;

  ctx.beginPath();
  ctx.moveTo(left, y - thickness * 0.16);
  ctx.bezierCurveTo(
    left + span * 0.24,
    y - thickness - bend,
    left + span * 0.49,
    y + thickness * 0.66 + shift,
    left + span * 0.7,
    y - thickness * 0.28,
  );
  ctx.bezierCurveTo(
    left + span * 0.84,
    y - thickness * 0.86,
    left + span * 0.94,
    y + thickness * 0.55,
    right,
    y - thickness * 0.14,
  );
  ctx.lineTo(right, y + thickness * 0.42);
  ctx.bezierCurveTo(
    left + span * 0.93,
    y + thickness * 1.02,
    left + span * 0.83,
    y - thickness * 0.2,
    left + span * 0.7,
    y + thickness * 0.42,
  );
  ctx.bezierCurveTo(
    left + span * 0.48,
    y + thickness * 1.2 + shift,
    left + span * 0.23,
    y - thickness * 0.4 - bend,
    left,
    y + thickness * 0.3,
  );
  ctx.closePath();
}

function traceRibbonGlint(
  ctx: CanvasRenderingContext2D,
  geometry: RibbonGeometry,
): void {
  const { left, right, y, thickness, bend, shift } = geometry;
  const span = right - left;

  ctx.beginPath();
  ctx.moveTo(left + span * 0.04, y - thickness * 0.02);
  ctx.bezierCurveTo(
    left + span * 0.27,
    y - thickness * 0.72 - bend * 0.7,
    left + span * 0.49,
    y + thickness * 0.42 + shift,
    left + span * 0.7,
    y - thickness * 0.15,
  );
  ctx.bezierCurveTo(
    left + span * 0.84,
    y - thickness * 0.58,
    left + span * 0.93,
    y + thickness * 0.34,
    right,
    y - thickness * 0.02,
  );
}

/** Molten champagne ribbons fold through a right-biased black-metal stage. */
export const renderLustre: ThemeRenderer = (
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
  const velocity = finiteClamp(pageMotion.scrollVelocity / 4, -1, 1);
  const minSide = Math.min(w, h);
  const maxSide = Math.max(w, h);
  const ribbonAnchors: Array<{ x: number; y: number }> = [];

  ctx.save();

  const background = ctx.createLinearGradient(0, 0, w, h);
  background.addColorStop(0, "#120F12");
  background.addColorStop(0.48, "#0B090B");
  background.addColorStop(1, "#030304");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  // Far plane: warm reflected light and a sparse metallic atmosphere.
  const bloomX = w * (0.79 + (mx - 0.5) * 0.018);
  const bloomY = h * (0.43 + (my - 0.5) * 0.014);
  const bloom = ctx.createRadialGradient(
    bloomX,
    bloomY,
    0,
    bloomX,
    bloomY,
    maxSide * 0.57,
  );
  bloom.addColorStop(0, "rgba(239, 194, 138, 0.16)");
  bloom.addColorStop(0.36, "rgba(161, 104, 71, 0.065)");
  bloom.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = bloom;
  ctx.fillRect(w * 0.31, 0, w * 0.69, h);

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let mote = 0; mote < 36; mote += 1) {
    const seed = mote * 0.819 + 0.23;
    const depth = 0.35 + (mote % 4) * 0.18;
    const x = w * (0.48 + (Math.sin(seed * 6.1) * 0.5 + 0.5) * 0.56);
    const y =
      (Math.cos(seed * 4.7) * 0.5 + 0.5) * h +
      Math.sin(t * (0.045 + depth * 0.025) + seed * 7) * h * 0.008;
    const radius = minSide * (0.0008 + depth * 0.0012);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fillStyle = `rgba(255, 224, 184, ${0.025 + depth * 0.04})`;
    ctx.fill();
  }
  ctx.restore();

  // Middle plane: liquid-metal folds with shadowed undersides and sharp
  // specular creases. Page chapters bring one ribbon gently to the surface.
  for (let index = 0; index < RIBBON_COUNT; index += 1) {
    const depth = index / (RIBBON_COUNT - 1);
    const chapterWeight = storyStepWeight(
      pageMotion.storyProgress,
      index,
      RIBBON_COUNT,
    );
    const phase = t * (0.105 + index * 0.011) + index * 1.13;
    const thickness = minSide * (0.038 - depth * 0.004);
    const geometry: RibbonGeometry = {
      left:
        w * (0.42 + depth * 0.018) + (mx - 0.5) * w * (0.01 + depth * 0.006),
      right: w + minSide * 0.12,
      y:
        h * (0.16 + index * 0.17) +
        Math.sin(phase) * h * 0.016 +
        (my - 0.5) * h * 0.012 -
        chapterWeight * minSide * 0.012,
      thickness: thickness * (1 + chapterWeight * 0.12),
      bend: Math.sin(phase * 0.71) * minSide * 0.018,
      shift: velocity * minSide * (0.02 + depth * 0.008),
    };
    ribbonAnchors.push({
      x: geometry.left + (geometry.right - geometry.left) * 0.68,
      y: geometry.y,
    });

    traceRibbon(ctx, geometry);
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.74)";
    ctx.shadowBlur = minSide * (0.025 + depth * 0.012);
    ctx.shadowOffsetY = minSide * 0.016;
    const metal = ctx.createLinearGradient(
      geometry.left,
      geometry.y - geometry.thickness,
      geometry.right,
      geometry.y + geometry.thickness,
    );
    metal.addColorStop(0, "rgba(102, 65, 45, 0.16)");
    metal.addColorStop(0.2, "rgba(224, 179, 124, 0.42)");
    metal.addColorStop(0.42, "rgba(255, 233, 199, 0.72)");
    metal.addColorStop(0.56, "rgba(129, 83, 57, 0.3)");
    metal.addColorStop(0.79, "rgba(247, 206, 151, 0.58)");
    metal.addColorStop(1, "rgba(78, 47, 36, 0.15)");
    ctx.fillStyle = metal;
    ctx.globalAlpha = 0.44 + depth * 0.07 + chapterWeight * 0.16;
    ctx.fill();
    ctx.restore();

    traceRibbonGlint(ctx, geometry);
    const glint = ctx.createLinearGradient(geometry.left, 0, geometry.right, 0);
    glint.addColorStop(0, "rgba(255, 246, 229, 0)");
    glint.addColorStop(0.23, "rgba(255, 246, 229, 0.34)");
    glint.addColorStop(0.54, "rgba(255, 255, 248, 0.72)");
    glint.addColorStop(0.74, "rgba(255, 225, 184, 0.2)");
    glint.addColorStop(1, "rgba(255, 244, 225, 0)");
    ctx.strokeStyle = glint;
    ctx.lineWidth = minSide * (0.0022 + chapterWeight * 0.0013);
    ctx.lineCap = "round";
    ctx.stroke();
  }

  // Foreground plane: polished caustic and a single chapter-responsive glint.
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const caustic = ctx.createLinearGradient(w * 0.58, 0, w, 0);
  caustic.addColorStop(0, "rgba(255, 215, 168, 0)");
  caustic.addColorStop(0.72, "rgba(255, 219, 174, 0.026)");
  caustic.addColorStop(1, "rgba(255, 239, 216, 0.1)");
  ctx.fillStyle = caustic;
  ctx.fillRect(w * 0.55, 0, w * 0.45, h);

  const activeIndex = Math.min(
    ribbonAnchors.length - 1,
    Math.round(pageMotion.storyProgress * (ribbonAnchors.length - 1)),
  );
  const activeAnchor = ribbonAnchors[activeIndex];
  if (activeAnchor) {
    const glintRadius =
      minSide * (0.012 + pageMotion.interactionImpulse * 0.018);
    const flare = ctx.createRadialGradient(
      activeAnchor.x,
      activeAnchor.y,
      0,
      activeAnchor.x,
      activeAnchor.y,
      glintRadius * 5,
    );
    flare.addColorStop(0, "rgba(255, 255, 244, 0.76)");
    flare.addColorStop(0.16, "rgba(255, 224, 180, 0.32)");
    flare.addColorStop(1, "rgba(255, 211, 154, 0)");
    ctx.fillStyle = flare;
    ctx.fillRect(
      activeAnchor.x - glintRadius * 5,
      activeAnchor.y - glintRadius * 5,
      glintRadius * 10,
      glintRadius * 10,
    );
  }
  ctx.restore();

  if (pageMotion.hasFocus && activeAnchor) {
    const focusX = pageMotion.focusX * w;
    const focusY = pageMotion.focusY * h;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(activeAnchor.x, activeAnchor.y);
    ctx.bezierCurveTo(
      w * 0.72,
      activeAnchor.y,
      w * 0.66,
      focusY,
      focusX,
      focusY,
    );
    ctx.strokeStyle = `rgba(255, 224, 184, ${0.08 + pageMotion.interactionImpulse * 0.12})`;
    ctx.lineWidth = Math.max(0.7, minSide * 0.0011);
    ctx.setLineDash([minSide * 0.004, minSide * 0.011]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Preserve a quiet, high-contrast reading lane on the left.
  const clearSpace = ctx.createLinearGradient(0, 0, w * 0.62, 0);
  clearSpace.addColorStop(0, "rgba(4, 3, 4, 0.72)");
  clearSpace.addColorStop(0.72, "rgba(5, 4, 5, 0.28)");
  clearSpace.addColorStop(1, "rgba(5, 4, 5, 0)");
  ctx.fillStyle = clearSpace;
  ctx.fillRect(0, 0, w * 0.64, h);

  const vignette = ctx.createRadialGradient(
    w * 0.79,
    h * 0.45,
    minSide * 0.18,
    w * 0.67,
    h * 0.48,
    maxSide * 0.77,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.52)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
};
