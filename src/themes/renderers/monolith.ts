import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "../shared/motion";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;
const FRAME_COUNT = 6;

function traceArchitecturalFrame(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  rotation: number,
) {
  ctx.beginPath();
  for (let corner = 0; corner <= 6; corner += 1) {
    const angle = rotation + (corner / 6) * TAU;
    const x = centerX + Math.cos(angle) * radiusX;
    const y = centerY + Math.sin(angle) * radiusY;
    if (corner === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** A faceted obsidian monument held inside a precise architectural field. */
export const renderMonolith: ThemeRenderer = (
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
  const story = pageMotion.storyProgress;
  const centerX =
    w * 0.78 +
    (mx - 0.5) * minSide * 0.025 +
    (story - 0.5) * minSide * 0.018;
  const centerY =
    h * 0.47 +
    (my - 0.5) * minSide * 0.018 -
    velocity * minSide * 0.012;
  const monumentHeight = Math.min(h * 0.67, minSide * 0.76);
  const monumentWidth = minSide * 0.22;
  const topY = centerY - monumentHeight * 0.5;
  const baseY = centerY + monumentHeight * 0.5;

  ctx.save();

  const background = ctx.createLinearGradient(0, 0, w, h);
  background.addColorStop(0, "#040506");
  background.addColorStop(0.5, "#090B0E");
  background.addColorStop(1, "#020305");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  // Far plane: a cool gallery light and a perspective datum grid give the
  // object a room without disturbing the reading lane.
  const galleryLight = ctx.createRadialGradient(
    centerX,
    centerY - monumentHeight * 0.18,
    minSide * 0.025,
    centerX,
    centerY,
    minSide * 0.62,
  );
  galleryLight.addColorStop(0, "rgba(177, 192, 211, 0.18)");
  galleryLight.addColorStop(0.38, "rgba(87, 103, 123, 0.075)");
  galleryLight.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = galleryLight;
  ctx.fillRect(w * 0.36, 0, w * 0.64, h);

  const horizonY = h * (0.7 - story * 0.025);
  ctx.save();
  ctx.strokeStyle = "rgba(174, 187, 204, 0.075)";
  ctx.lineWidth = 1;
  for (let ray = -4; ray <= 5; ray += 1) {
    ctx.beginPath();
    ctx.moveTo(centerX, horizonY);
    ctx.lineTo(w * (0.43 + ray * 0.095), h * 1.04);
    ctx.stroke();
  }
  for (let row = 0; row < 7; row += 1) {
    const progress = (row + 1) / 8;
    const y = horizonY + Math.pow(progress, 1.75) * (h - horizonY);
    ctx.beginPath();
    ctx.moveTo(w * (0.45 - progress * 0.08), y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();

  // Rear plane: nested, slowly counter-rotating survey frames preserve the
  // original geometric identity while making the composition directional.
  for (let frame = FRAME_COUNT - 1; frame >= 0; frame -= 1) {
    const depth = frame / Math.max(1, FRAME_COUNT - 1);
    const chapterWeight = storyStepWeight(story, frame, FRAME_COUNT);
    const rotation =
      -0.16 +
      frame * 0.035 +
      t * (0.006 + frame * 0.0015) * (frame % 2 === 0 ? 1 : -1);
    traceArchitecturalFrame(
      ctx,
      centerX + minSide * (0.018 + depth * 0.022),
      centerY - minSide * (0.01 + depth * 0.008),
      monumentWidth * (0.92 + depth * 1.18),
      monumentHeight * (0.39 + depth * 0.15),
      rotation,
    );
    ctx.strokeStyle = `rgba(193, 205, 220, ${
      0.075 + (1 - depth) * 0.07 + chapterWeight * 0.18
    })`;
    ctx.lineWidth = 0.75 + (1 - depth) * 0.45 + chapterWeight * 0.65;
    ctx.stroke();
  }

  // Middle plane: three offset slabs establish physical depth behind the
  // principal monument.
  const rearSlabs = [
    { offsetX: 0.105, offsetY: 0.055, scale: 0.78, alpha: 0.34 },
    { offsetX: 0.066, offsetY: -0.015, scale: 0.9, alpha: 0.52 },
  ] as const;
  rearSlabs.forEach((slab, index) => {
    const x = centerX + minSide * slab.offsetX;
    const slabTop = topY + monumentHeight * (1 - slab.scale) + minSide * slab.offsetY;
    const slabBase = baseY + minSide * slab.offsetY;
    const width = monumentWidth * (0.8 - index * 0.08);
    const face = ctx.createLinearGradient(x - width, slabTop, x + width, slabBase);
    face.addColorStop(0, `rgba(40, 47, 58, ${slab.alpha})`);
    face.addColorStop(0.55, `rgba(16, 20, 26, ${slab.alpha})`);
    face.addColorStop(1, `rgba(5, 7, 10, ${slab.alpha})`);
    ctx.beginPath();
    ctx.moveTo(x - width * 0.34, slabBase);
    ctx.lineTo(x - width * 0.26, slabTop + width * 0.2);
    ctx.lineTo(x + width * 0.08, slabTop);
    ctx.lineTo(x + width * 0.4, slabTop + width * 0.18);
    ctx.lineTo(x + width * 0.5, slabBase - width * 0.08);
    ctx.closePath();
    ctx.fillStyle = face;
    ctx.fill();
    ctx.strokeStyle = `rgba(191, 204, 220, ${0.09 + index * 0.035})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });

  // Foreground plane: a split obsidian prism with a cool metal bevel.
  const apexX = centerX - monumentWidth * 0.08;
  const leftX = centerX - monumentWidth * 0.54;
  const rightX = centerX + monumentWidth * 0.5;

  const leftFace = ctx.createLinearGradient(leftX, topY, apexX, baseY);
  leftFace.addColorStop(0, "#29323D");
  leftFace.addColorStop(0.36, "#171D24");
  leftFace.addColorStop(1, "#080A0D");
  ctx.beginPath();
  ctx.moveTo(apexX, topY);
  ctx.lineTo(leftX, topY + monumentWidth * 0.42);
  ctx.lineTo(leftX + monumentWidth * 0.08, baseY - monumentWidth * 0.04);
  ctx.lineTo(apexX, baseY);
  ctx.closePath();
  ctx.fillStyle = leftFace;
  ctx.fill();

  const rightFace = ctx.createLinearGradient(apexX, topY, rightX, baseY);
  rightFace.addColorStop(0, "#111821");
  rightFace.addColorStop(0.46, "#090D12");
  rightFace.addColorStop(1, "#030507");
  ctx.beginPath();
  ctx.moveTo(apexX, topY);
  ctx.lineTo(rightX, topY + monumentWidth * 0.38);
  ctx.lineTo(rightX - monumentWidth * 0.02, baseY - monumentWidth * 0.08);
  ctx.lineTo(apexX, baseY);
  ctx.closePath();
  ctx.fillStyle = rightFace;
  ctx.fill();

  const topFace = ctx.createLinearGradient(leftX, topY, rightX, topY);
  topFace.addColorStop(0, "rgba(116, 131, 150, 0.58)");
  topFace.addColorStop(0.5, "rgba(57, 68, 82, 0.72)");
  topFace.addColorStop(1, "rgba(24, 31, 40, 0.7)");
  ctx.beginPath();
  ctx.moveTo(apexX, topY);
  ctx.lineTo(leftX, topY + monumentWidth * 0.42);
  ctx.lineTo(centerX - monumentWidth * 0.02, topY + monumentWidth * 0.58);
  ctx.lineTo(rightX, topY + monumentWidth * 0.38);
  ctx.closePath();
  ctx.fillStyle = topFace;
  ctx.fill();

  ctx.save();
  ctx.shadowColor = "rgba(202, 216, 233, 0.45)";
  ctx.shadowBlur = minSide * 0.018;
  ctx.beginPath();
  ctx.moveTo(apexX, topY);
  ctx.lineTo(apexX, baseY);
  ctx.strokeStyle = "rgba(224, 231, 239, 0.72)";
  ctx.lineWidth = Math.max(1.2, minSide * 0.0021);
  ctx.stroke();
  ctx.restore();

  // Chapter marks turn the bevel into an ordered page-story indicator.
  const markerCount = Math.max(4, Math.min(7, pageMotion.sectionCount || 5));
  for (let marker = 0; marker < markerCount; marker += 1) {
    const weight = storyStepWeight(story, marker, markerCount);
    const progress = (marker + 1) / (markerCount + 1);
    const y = topY + monumentHeight * progress;
    ctx.fillStyle = `rgba(236, 241, 247, ${0.25 + weight * 0.7})`;
    const size = 1.5 + weight * 2;
    ctx.fillRect(apexX - size * 0.5, y - size * 0.5, size, size);
  }

  if (pageMotion.hasFocus) {
    const focusX = pageMotion.focusX * w;
    const focusY = pageMotion.focusY * h;
    const activeY = topY + monumentHeight * (0.12 + story * 0.76);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(apexX, activeY);
    ctx.quadraticCurveTo(w * 0.63, activeY, focusX, focusY);
    ctx.setLineDash([3, 8]);
    ctx.strokeStyle = `rgba(199, 211, 226, ${
      0.15 + pageMotion.interactionImpulse * 0.24
    })`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    const focusSize = 8 + pageMotion.interactionImpulse * 8;
    ctx.strokeStyle = "rgba(226, 234, 242, 0.48)";
    ctx.strokeRect(
      focusX - focusSize * 0.5,
      focusY - focusSize * 0.5,
      focusSize,
      focusSize,
    );
    ctx.restore();
  }

  const floorShadow = ctx.createRadialGradient(
    centerX,
    baseY,
    0,
    centerX,
    baseY,
    monumentWidth * 2.2,
  );
  floorShadow.addColorStop(0, "rgba(0, 0, 0, 0.76)");
  floorShadow.addColorStop(0.45, "rgba(0, 0, 0, 0.34)");
  floorShadow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = floorShadow;
  ctx.beginPath();
  ctx.ellipse(
    centerX,
    baseY,
    monumentWidth * 2.2,
    monumentWidth * 0.42,
    0,
    0,
    TAU,
  );
  ctx.fill();

  // A final black-glass wash guarantees calm type contrast on the left.
  const clearSpace = ctx.createLinearGradient(0, 0, w * 0.65, 0);
  clearSpace.addColorStop(0, "rgba(2, 3, 4, 0.84)");
  clearSpace.addColorStop(0.68, "rgba(2, 3, 4, 0.46)");
  clearSpace.addColorStop(1, "rgba(2, 3, 4, 0)");
  ctx.fillStyle = clearSpace;
  ctx.fillRect(0, 0, w * 0.68, h);

  const vignette = ctx.createRadialGradient(
    centerX,
    centerY,
    minSide * 0.14,
    w * 0.64,
    h * 0.48,
    maxSide * 0.8,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.5)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
};
