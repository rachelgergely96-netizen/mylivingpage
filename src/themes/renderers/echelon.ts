import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "../shared/motion";
import type { ThemeRenderer } from "../types";

interface PlateGeometry {
  left: number;
  right: number;
  y: number;
  halfHeight: number;
  notch: number;
}

function tracePlate(ctx: CanvasRenderingContext2D, plate: PlateGeometry) {
  const { left, right, y, halfHeight, notch } = plate;
  ctx.beginPath();
  ctx.moveTo(left + notch, y - halfHeight);
  ctx.lineTo(right - notch * 0.72, y - halfHeight);
  ctx.lineTo(right, y);
  ctx.lineTo(right - notch * 0.72, y + halfHeight);
  ctx.lineTo(left + notch, y + halfHeight);
  ctx.lineTo(left, y);
  ctx.closePath();
}

/** Staggered command planes advancing through a calm, content-safe corridor. */
export const renderEchelon: ThemeRenderer = (
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
  const plateCount = 7;

  ctx.save();

  const background = ctx.createLinearGradient(0, 0, w, h);
  background.addColorStop(0, "#05080D");
  background.addColorStop(0.5, "#09111B");
  background.addColorStop(1, "#020509");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  // Far plane: a right-side command horizon with sparse perspective guides.
  const horizonX = w * (0.83 + (mx - 0.5) * 0.018);
  const horizonY = h * (0.23 + (my - 0.5) * 0.018);
  const horizonGlow = ctx.createRadialGradient(
    horizonX,
    horizonY,
    0,
    horizonX,
    horizonY,
    minSide * 0.62,
  );
  horizonGlow.addColorStop(0, "rgba(96, 155, 213, 0.14)");
  horizonGlow.addColorStop(0.54, "rgba(39, 81, 127, 0.05)");
  horizonGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = horizonGlow;
  ctx.fillRect(w * 0.36, 0, w * 0.64, h);

  ctx.save();
  ctx.strokeStyle = "rgba(111, 158, 204, 0.04)";
  ctx.lineWidth = 1;
  for (let guide = 0; guide < 8; guide += 1) {
    const endY = h * (0.12 + guide * 0.12);
    ctx.beginPath();
    ctx.moveTo(horizonX, horizonY);
    ctx.lineTo(w, endY);
    ctx.stroke();
  }
  for (let band = 0; band < 6; band += 1) {
    const y = h * (0.19 + band * 0.13);
    ctx.beginPath();
    ctx.moveTo(w * 0.45, y);
    ctx.lineTo(w, y - minSide * 0.035);
    ctx.stroke();
  }
  ctx.restore();

  // Middle plane: individually shaded plates with story-linked emphasis.
  const plates: PlateGeometry[] = [];
  for (let layer = 0; layer < plateCount; layer += 1) {
    const depth = layer / Math.max(1, plateCount - 1);
    const chapterWeight = storyStepWeight(storyProgress, layer, plateCount);
    const width = w * (0.35 + depth * 0.19);
    const halfHeight = h * (0.033 + depth * 0.012);
    const left =
      w * (0.51 + depth * 0.025) +
      Math.sin(t * 0.12 + layer * 0.72) * minSide * 0.006 +
      velocity * minSide * (0.006 + depth * 0.008);
    const right = left + width;
    const y =
      h * (0.2 + layer * 0.102) +
      (storyProgress - 0.5) * h * (0.008 + depth * 0.01);
    const notch = minSide * (0.026 + depth * 0.012);
    const plate = { left, right, y, halfHeight, notch };
    plates.push(plate);

    ctx.save();
    tracePlate(ctx, plate);
    const fill = ctx.createLinearGradient(left, y - halfHeight, right, y + halfHeight);
    fill.addColorStop(0, `rgba(${26 + layer * 4}, ${36 + layer * 5}, ${48 + layer * 7}, 0.9)`);
    fill.addColorStop(0.62, `rgba(${39 + layer * 5}, ${56 + layer * 6}, ${72 + layer * 8}, ${0.62 + chapterWeight * 0.12})`);
    fill.addColorStop(1, "rgba(8, 13, 20, 0.9)");
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = `rgba(151, 196, 236, ${0.1 + depth * 0.035 + chapterWeight * 0.2})`;
    ctx.lineWidth = 0.8 + depth * 0.35 + chapterWeight * 0.45;
    ctx.stroke();

    tracePlate(ctx, {
      left: left + notch * 0.45,
      right: right - notch * 0.72,
      y,
      halfHeight: halfHeight * 0.48,
      notch: notch * 0.42,
    });
    ctx.strokeStyle = `rgba(191, 221, 247, ${0.035 + chapterWeight * 0.09})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    const sweepProgress = ((t * 0.08 + layer * 0.17 + storyProgress * 0.34) % 1 + 1) % 1;
    const sweepX = left + sweepProgress * (right - left);
    const sweep = ctx.createLinearGradient(sweepX - notch * 1.8, y, sweepX + notch * 1.8, y);
    sweep.addColorStop(0, "rgba(207, 234, 255, 0)");
    sweep.addColorStop(0.5, `rgba(207, 234, 255, ${0.035 + chapterWeight * 0.12})`);
    sweep.addColorStop(1, "rgba(207, 234, 255, 0)");
    tracePlate(ctx, plate);
    ctx.clip();
    ctx.fillStyle = sweep;
    ctx.fillRect(sweepX - notch * 1.8, y - halfHeight, notch * 3.6, halfHeight * 2);
    ctx.restore();
  }

  // Foreground plane: formation spine and leading command marker.
  ctx.save();
  ctx.beginPath();
  plates.forEach((plate, index) => {
    const x = plate.left + plate.notch * 0.52;
    if (index === 0) ctx.moveTo(x, plate.y);
    else ctx.lineTo(x, plate.y);
  });
  ctx.strokeStyle = "rgba(132, 186, 231, 0.14)";
  ctx.lineWidth = 1;
  ctx.stroke();

  plates.forEach((plate, index) => {
    const weight = storyStepWeight(storyProgress, index, plateCount);
    const markerX = plate.left + plate.notch * 0.52;
    const size = 2 + weight * 2.5;
    ctx.fillStyle = `rgba(220, 240, 255, ${0.3 + weight * 0.62})`;
    ctx.fillRect(markerX - size * 0.5, plate.y - size * 0.5, size, size);
  });
  ctx.restore();

  for (let particle = 0; particle < 42; particle += 1) {
    const seed = particle * 0.673 + 0.21;
    const progress = ((t * (0.012 + (particle % 4) * 0.002) + seed * 0.14) % 1 + 1) % 1;
    const x = w * (0.48 + (Math.sin(seed * 5.7) * 0.5 + 0.5) * 0.54);
    const y = h * 0.96 - progress * h * 0.82;
    ctx.fillStyle = `rgba(172, 209, 236, ${(1 - progress) * 0.07})`;
    ctx.fillRect(x, y, 1, 1);
  }

  if (pageMotion.hasFocus) {
    const focusX = pageMotion.focusX * w;
    const focusY = pageMotion.focusY * h;
    const activeIndex = Math.min(
      plateCount - 1,
      Math.round(storyProgress * (plateCount - 1)),
    );
    const activePlate = plates[activeIndex];
    const anchorX = activePlate.right - activePlate.notch;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(anchorX, activePlate.y);
    ctx.lineTo(focusX, focusY);
    ctx.setLineDash([3, 7]);
    ctx.strokeStyle = `rgba(155, 205, 243, ${0.12 + pageMotion.interactionImpulse * 0.14})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    const focusSize = 9 + pageMotion.interactionImpulse * 8;
    ctx.strokeStyle = "rgba(207, 233, 252, 0.44)";
    ctx.strokeRect(
      focusX - focusSize * 0.5,
      focusY - focusSize * 0.5,
      focusSize,
      focusSize,
    );
    ctx.restore();
  }

  const clearSpace = ctx.createLinearGradient(0, 0, w * 0.6, 0);
  clearSpace.addColorStop(0, "rgba(2, 5, 9, 0.58)");
  clearSpace.addColorStop(0.74, "rgba(2, 5, 9, 0.22)");
  clearSpace.addColorStop(1, "rgba(2, 5, 9, 0)");
  ctx.fillStyle = clearSpace;
  ctx.fillRect(0, 0, w * 0.64, h);

  const vignette = ctx.createRadialGradient(
    w * 0.76,
    h * 0.47,
    minSide * 0.14,
    w * 0.65,
    h * 0.48,
    Math.max(w, h) * 0.78,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 2, 5, 0.42)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
};
