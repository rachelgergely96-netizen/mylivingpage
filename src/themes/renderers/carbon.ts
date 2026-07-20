import {
  finiteClamp,
  resolveThemeMotion,
} from "../shared/motion";
import type { ThemeRenderer } from "../types";

function drawFixedWeave(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  spacing: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(w * 0.34, 0, w * 0.66, h);
  ctx.clip();

  // The substrate never depends on time or pointer position. Motion belongs to
  // the light above it, which keeps the carbon material feeling physically set.
  for (let offset = -h; offset < w + h; offset += spacing) {
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset + h, h);
    ctx.strokeStyle = "rgba(54, 62, 70, 0.54)";
    ctx.lineWidth = spacing * 0.62;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(offset + spacing * 0.42, 0);
    ctx.lineTo(offset + h + spacing * 0.42, h);
    ctx.strokeStyle = "rgba(12, 15, 19, 0.82)";
    ctx.lineWidth = spacing * 0.3;
    ctx.stroke();
  }

  for (let offset = 0; offset < w + h * 2; offset += spacing) {
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset - h, h);
    ctx.strokeStyle = "rgba(28, 33, 39, 0.52)";
    ctx.lineWidth = spacing * 0.42;
    ctx.stroke();
  }

  for (let y = 0; y < h; y += Math.max(5, spacing * 0.22)) {
    ctx.fillStyle = `rgba(225, 239, 249, ${0.006 + (y / Math.max(h, 1)) * 0.008})`;
    ctx.fillRect(w * 0.34, y, w * 0.66, 1);
  }
  ctx.restore();
}

/** Fixed carbon weave under a moving, page-linked architectural light study. */
export const renderCarbon: ThemeRenderer = (
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
  background.addColorStop(0, "#030507");
  background.addColorStop(0.5, "#080B0F");
  background.addColorStop(1, "#020305");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  // Far plane: fixed woven substrate.
  const weave = Math.max(20, Math.min(34, minSide * 0.052));
  drawFixedWeave(ctx, w, h, weave);

  // Middle plane: an inset composite plate creates a stable architectural
  // focal surface on the right, with a bevel and restrained seam detail.
  const plateLeft = w * (0.53 + velocity * 0.006);
  const plateTop = h * 0.12;
  const plateRight = w * 1.035;
  const plateBottom = h * 0.9;
  const bevel = minSide * 0.035;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(plateLeft + bevel, plateTop);
  ctx.lineTo(plateRight, plateTop + bevel * 0.25);
  ctx.lineTo(plateRight, plateBottom - bevel);
  ctx.lineTo(plateLeft, plateBottom);
  ctx.lineTo(plateLeft - bevel * 0.58, plateTop + bevel);
  ctx.closePath();
  const plate = ctx.createLinearGradient(plateLeft, plateTop, plateRight, plateBottom);
  plate.addColorStop(0, "rgba(31, 37, 44, 0.58)");
  plate.addColorStop(0.46, "rgba(10, 13, 17, 0.42)");
  plate.addColorStop(1, "rgba(2, 4, 6, 0.84)");
  ctx.fillStyle = plate;
  ctx.fill();
  ctx.strokeStyle = "rgba(170, 198, 218, 0.13)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  for (let seam = 0; seam < 4; seam += 1) {
    const y = plateTop + (seam + 1) * ((plateBottom - plateTop) / 5);
    ctx.beginPath();
    ctx.moveTo(plateLeft + bevel * 0.35, y);
    ctx.lineTo(plateRight, y - bevel * 0.3);
    ctx.strokeStyle = `rgba(137, 166, 187, ${0.035 + seam * 0.008})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  const railX = plateLeft + (plateRight - plateLeft) * (0.26 + storyProgress * 0.43);
  ctx.fillStyle = "rgba(155, 190, 214, 0.07)";
  ctx.fillRect(railX, plateTop + bevel, 1, plateBottom - plateTop - bevel * 2);
  ctx.restore();

  // Foreground plane: only the specular system moves. Pointer position and the
  // ordered page story steer the highlight without disturbing the weave.
  const sweepProgress = ((t * 0.035 + storyProgress * 0.7 + 0.18) % 1 + 1) % 1;
  const shineX =
    w * (0.46 + sweepProgress * 0.64) +
    (mx - 0.5) * w * 0.035 +
    velocity * w * 0.012;
  const shineWidth = minSide * (0.1 + pageMotion.pointerSpeed * 0.008);
  ctx.save();
  ctx.beginPath();
  ctx.rect(w * 0.37, 0, w * 0.63, h);
  ctx.clip();
  ctx.translate(shineX, h * (0.44 + (my - 0.5) * 0.025));
  ctx.rotate(-0.24 + velocity * 0.012);
  const shine = ctx.createLinearGradient(-shineWidth, 0, shineWidth, 0);
  shine.addColorStop(0, "rgba(199, 229, 247, 0)");
  shine.addColorStop(0.42, "rgba(199, 229, 247, 0.035)");
  shine.addColorStop(0.5, "rgba(225, 245, 255, 0.16)");
  shine.addColorStop(0.58, "rgba(199, 229, 247, 0.035)");
  shine.addColorStop(1, "rgba(199, 229, 247, 0)");
  ctx.fillStyle = shine;
  ctx.fillRect(-shineWidth, -h, shineWidth * 2, h * 2);
  ctx.restore();

  const edgeGlow = ctx.createLinearGradient(w * 0.5, 0, w, 0);
  edgeGlow.addColorStop(0, "rgba(118, 166, 197, 0)");
  edgeGlow.addColorStop(0.76, "rgba(118, 166, 197, 0.025)");
  edgeGlow.addColorStop(1, "rgba(186, 220, 239, 0.075)");
  ctx.fillStyle = edgeGlow;
  ctx.fillRect(w * 0.48, 0, w * 0.52, h);

  if (pageMotion.hasFocus) {
    const focusX = pageMotion.focusX * w;
    const focusY = pageMotion.focusY * h;
    const size = 9 + pageMotion.interactionImpulse * 10;
    ctx.save();
    ctx.strokeStyle = `rgba(200, 229, 246, ${0.24 + pageMotion.interactionImpulse * 0.3})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(focusX - size * 0.5, focusY - size * 0.5, size, size);
    ctx.beginPath();
    ctx.moveTo(focusX + size * 0.5, focusY);
    ctx.lineTo(railX, focusY);
    ctx.strokeStyle = "rgba(151, 189, 214, 0.09)";
    ctx.stroke();
    ctx.restore();
  }

  const clearSpace = ctx.createLinearGradient(0, 0, w * 0.58, 0);
  clearSpace.addColorStop(0, "rgba(1, 3, 5, 0.58)");
  clearSpace.addColorStop(0.72, "rgba(1, 3, 5, 0.22)");
  clearSpace.addColorStop(1, "rgba(1, 3, 5, 0)");
  ctx.fillStyle = clearSpace;
  ctx.fillRect(0, 0, w * 0.62, h);

  const vignette = ctx.createRadialGradient(
    w * 0.72,
    h * 0.46,
    minSide * 0.16,
    w * 0.62,
    h * 0.5,
    Math.max(w, h) * 0.78,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 1, 3, 0.42)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
};
