import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "../shared/motion";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

interface LeafSpec {
  x: number;
  y: number;
  length: number;
  angle: number;
  hue: number;
  depth: number;
}

const LEAVES: readonly LeafSpec[] = [
  { x: 0.57, y: 0.72, length: 0.095, angle: -1.12, hue: 126, depth: 0.52 },
  { x: 0.62, y: 0.57, length: 0.105, angle: -2.22, hue: 112, depth: 0.68 },
  { x: 0.67, y: 0.42, length: 0.087, angle: -0.92, hue: 135, depth: 0.58 },
  { x: 0.73, y: 0.29, length: 0.102, angle: -2.38, hue: 105, depth: 0.76 },
  { x: 0.82, y: 0.2, length: 0.112, angle: -1.1, hue: 123, depth: 0.88 },
  { x: 0.91, y: 0.28, length: 0.09, angle: 0.08, hue: 98, depth: 0.72 },
  { x: 0.88, y: 0.43, length: 0.12, angle: -0.12, hue: 130, depth: 0.94 },
  { x: 0.93, y: 0.59, length: 0.105, angle: 0.32, hue: 114, depth: 0.82 },
  { x: 0.86, y: 0.7, length: 0.13, angle: 0.76, hue: 128, depth: 1 },
  { x: 0.74, y: 0.76, length: 0.11, angle: 1.93, hue: 104, depth: 0.78 },
  { x: 0.64, y: 0.84, length: 0.1, angle: -2.48, hue: 138, depth: 0.7 },
  { x: 0.78, y: 0.51, length: 0.085, angle: 2.66, hue: 119, depth: 0.62 },
  { x: 0.7, y: 0.63, length: 0.078, angle: 2.95, hue: 145, depth: 0.55 },
  { x: 0.83, y: 0.34, length: 0.075, angle: 2.33, hue: 110, depth: 0.64 },
] as const;

function drawLeaf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  angle: number,
  hue: number,
  depth: number,
  light: number,
) {
  const width = length * (0.32 + depth * 0.08);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(
    length * 0.26,
    -width,
    length * 0.78,
    -width * 0.72,
    length,
    0,
  );
  ctx.bezierCurveTo(
    length * 0.72,
    width * 0.82,
    length * 0.22,
    width * 0.76,
    0,
    0,
  );
  ctx.closePath();
  const fill = ctx.createLinearGradient(0, -width, length, width);
  fill.addColorStop(
    0,
    `hsla(${hue + 12}, ${44 + depth * 16}%, ${
      23 + depth * 15 + light * 8
    }%, ${0.38 + depth * 0.38})`,
  );
  fill.addColorStop(
    0.48,
    `hsla(${hue}, ${50 + depth * 13}%, ${
      16 + depth * 12 + light * 5
    }%, ${0.46 + depth * 0.4})`,
  );
  fill.addColorStop(
    1,
    `hsla(${hue - 12}, 58%, ${10 + depth * 8}%, ${
      0.34 + depth * 0.35
    })`,
  );
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(length * 0.04, 0);
  ctx.quadraticCurveTo(length * 0.53, -width * 0.05, length * 0.92, 0);
  ctx.strokeStyle = `rgba(184, 224, 151, ${0.1 + depth * 0.2 + light * 0.2})`;
  ctx.lineWidth = 0.55 + depth * 0.5;
  ctx.stroke();

  for (let vein = 1; vein <= 3; vein += 1) {
    const progress = vein / 4;
    ctx.beginPath();
    ctx.moveTo(length * progress, 0);
    ctx.lineTo(length * (progress + 0.13), -width * (0.42 - vein * 0.05));
    ctx.strokeStyle = `rgba(176, 212, 144, ${0.035 + depth * 0.055})`;
    ctx.lineWidth = 0.45;
    ctx.stroke();
  }
  ctx.restore();
}

/** A living botanical arch grows through a deep, rain-lit glasshouse. */
export const renderVerdant: ThemeRenderer = (
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
  const story = pageMotion.storyProgress;
  const minSide = Math.min(w, h);
  const maxSide = Math.max(w, h);
  const pointerX = finiteClamp(mx, 0, 1, 0.5) - 0.5;
  const pointerY = finiteClamp(my, 0, 1, 0.5) - 0.5;
  const archX = w * 0.78 + pointerX * minSide * 0.025;
  const archY = h * 0.48 + pointerY * minSide * 0.018;

  ctx.save();

  const background = ctx.createLinearGradient(0, 0, w, h);
  background.addColorStop(0, "#030905");
  background.addColorStop(0.5, "#07150B");
  background.addColorStop(1, "#020704");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  // Far plane: layered canopy light and distant trunks establish a humid,
  // architectural glasshouse rather than a flat particle field.
  const canopyLight = ctx.createRadialGradient(
    archX,
    h * 0.26,
    minSide * 0.03,
    archX,
    archY,
    minSide * 0.68,
  );
  canopyLight.addColorStop(0, "rgba(145, 213, 126, 0.2)");
  canopyLight.addColorStop(0.38, "rgba(48, 128, 69, 0.09)");
  canopyLight.addColorStop(0.72, "rgba(17, 61, 30, 0.04)");
  canopyLight.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = canopyLight;
  ctx.fillRect(w * 0.34, 0, w * 0.66, h);

  for (let trunk = 0; trunk < 9; trunk += 1) {
    const seed = trunk * 0.83 + 0.17;
    const x = w * (0.48 + trunk * 0.07);
    const sway = Math.sin(t * 0.025 + seed * 4.7) * minSide * 0.008;
    ctx.beginPath();
    ctx.moveTo(x, h * 1.04);
    ctx.bezierCurveTo(
      x - minSide * 0.025,
      h * 0.7,
      x + sway + minSide * 0.018,
      h * 0.33,
      x + sway,
      -h * 0.04,
    );
    ctx.strokeStyle = `rgba(56, ${84 + trunk * 4}, 55, ${
      0.055 + (trunk % 3) * 0.025
    })`;
    ctx.lineWidth = minSide * (0.009 + (trunk % 3) * 0.003);
    ctx.stroke();
  }

  // Fine rain catches the canopy light on a separate depth plane.
  ctx.save();
  ctx.lineCap = "round";
  for (let drop = 0; drop < 34; drop += 1) {
    const seed = drop * 0.619 + 0.28;
    const progress = ((seed * 0.37 + t * (0.018 + (drop % 4) * 0.004)) % 1 + 1) % 1;
    const x = w * (0.43 + (Math.sin(seed * 7.1) * 0.5 + 0.5) * 0.59);
    const y = progress * h;
    const length = minSide * (0.008 + (drop % 4) * 0.004);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - length * 0.12, y + length);
    ctx.strokeStyle = `rgba(185, 225, 185, ${0.035 + (drop % 5) * 0.014})`;
    ctx.lineWidth = 0.55 + (drop % 3) * 0.18;
    ctx.stroke();
  }
  ctx.restore();

  // Middle plane: a thick, illuminated vine describes a single botanical
  // portal on the right side of the page.
  const trunkGradient = ctx.createLinearGradient(
    w * 0.52,
    h,
    w * 0.96,
    h * 0.08,
  );
  trunkGradient.addColorStop(0, "rgba(24, 64, 29, 0.92)");
  trunkGradient.addColorStop(0.44, "rgba(72, 124, 57, 0.92)");
  trunkGradient.addColorStop(0.72, "rgba(111, 154, 73, 0.86)");
  trunkGradient.addColorStop(1, "rgba(34, 79, 37, 0.72)");

  const sway = Math.sin(t * 0.04) * minSide * 0.008 + velocity * minSide * 0.012;
  ctx.save();
  ctx.shadowColor = "rgba(103, 172, 82, 0.24)";
  ctx.shadowBlur = minSide * 0.022;
  ctx.beginPath();
  ctx.moveTo(w * 0.55, h * 1.03);
  ctx.bezierCurveTo(
    w * 0.58,
    h * 0.72,
    w * 0.61 + sway,
    h * 0.3,
    w * 0.78,
    h * 0.16,
  );
  ctx.bezierCurveTo(
    w * 0.91,
    h * 0.05,
    w * 0.99 - sway,
    h * 0.25,
    w * 0.95,
    h * 0.58,
  );
  ctx.bezierCurveTo(w * 0.92, h * 0.78, w * 0.89, h * 0.91, w * 0.86, h * 1.03);
  ctx.strokeStyle = trunkGradient;
  ctx.lineWidth = minSide * 0.025;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = "rgba(187, 214, 130, 0.22)";
  ctx.lineWidth = minSide * 0.003;
  ctx.stroke();
  ctx.restore();

  // Secondary tendrils orbit the portal and keep the motion slow and bounded.
  for (let tendril = 0; tendril < 5; tendril += 1) {
    const chapterWeight = storyStepWeight(story, tendril, 5);
    const startY = h * (0.75 - tendril * 0.12);
    const endX = w * (0.7 + tendril * 0.058);
    const endY = h * (0.2 + tendril * 0.035);
    const curl = Math.sin(t * 0.035 + tendril * 0.9) * minSide * 0.012;
    ctx.beginPath();
    ctx.moveTo(w * (0.58 + tendril * 0.075), startY);
    ctx.bezierCurveTo(
      w * (0.68 + tendril * 0.04),
      startY - h * 0.16,
      endX - minSide * 0.08 + curl,
      endY + h * 0.14,
      endX,
      endY,
    );
    ctx.strokeStyle = `rgba(115, 180, 91, ${
      0.18 + chapterWeight * 0.38
    })`;
    ctx.lineWidth = minSide * (0.0024 + chapterWeight * 0.0017);
    ctx.lineCap = "round";
    ctx.stroke();
  }

  // Foreground leaves use authored greens, lit veins, and page-story emphasis.
  LEAVES.forEach((leaf, index) => {
    const chapterWeight = storyStepWeight(
      story,
      index % 6,
      Math.min(6, LEAVES.length),
    );
    const flutter =
      Math.sin(t * (0.045 + leaf.depth * 0.02) + index * 1.27) *
        (0.012 + leaf.depth * 0.018) +
      velocity * 0.018;
    const x = leaf.x * w + pointerX * minSide * 0.012 * leaf.depth;
    const y =
      leaf.y * h +
      pointerY * minSide * 0.009 * leaf.depth -
      story * minSide * 0.006 * leaf.depth;
    drawLeaf(
      ctx,
      x,
      y,
      leaf.length * minSide,
      leaf.angle + flutter,
      leaf.hue,
      leaf.depth,
      chapterWeight,
    );
  });

  // Bounded fireflies form a near-camera plane and stay visible at t=0.
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let firefly = 0; firefly < 20; firefly += 1) {
    const seed = firefly * 1.713 + 0.41;
    const depth = 0.35 + (firefly % 5) * 0.14;
    const x =
      w * (0.48 + (Math.sin(seed * 5.7) * 0.5 + 0.5) * 0.53) +
      Math.sin(t * (0.07 + depth * 0.025) + seed) * minSide * 0.014;
    const y =
      h * (0.08 + (Math.cos(seed * 4.3) * 0.5 + 0.5) * 0.84) +
      Math.cos(t * (0.06 + depth * 0.02) + seed * 1.8) * minSide * 0.011;
    const pulse = 0.62 + Math.sin(t * 0.34 + seed * 3.1) * 0.24;
    const glowRadius = minSide * (0.008 + depth * 0.005);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
    glow.addColorStop(0, `rgba(226, 244, 142, ${0.54 * pulse})`);
    glow.addColorStop(0.18, `rgba(163, 222, 105, ${0.24 * pulse})`);
    glow.addColorStop(1, "rgba(104, 184, 74, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, glowRadius, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  if (pageMotion.hasFocus) {
    const focusX = pageMotion.focusX * w;
    const focusY = pageMotion.focusY * h;
    const budX = archX - minSide * 0.08;
    const budY = archY - minSide * (0.08 + story * 0.12);
    ctx.beginPath();
    ctx.moveTo(budX, budY);
    ctx.bezierCurveTo(w * 0.68, budY, w * 0.61, focusY, focusX, focusY);
    ctx.strokeStyle = `rgba(154, 213, 123, ${
      0.12 + pageMotion.interactionImpulse * 0.2
    })`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(
      focusX,
      focusY,
      4 + pageMotion.interactionImpulse * 6,
      0,
      TAU,
    );
    ctx.strokeStyle = "rgba(206, 235, 168, 0.42)";
    ctx.stroke();
  }

  // Deep foliage glass protects the copy lane while preserving the luminous
  // portal at the far edge.
  const clearSpace = ctx.createLinearGradient(0, 0, w * 0.67, 0);
  clearSpace.addColorStop(0, "rgba(2, 7, 4, 0.86)");
  clearSpace.addColorStop(0.68, "rgba(2, 8, 4, 0.5)");
  clearSpace.addColorStop(1, "rgba(2, 8, 4, 0)");
  ctx.fillStyle = clearSpace;
  ctx.fillRect(0, 0, w * 0.7, h);

  const floorMist = ctx.createLinearGradient(0, h, 0, h * 0.7);
  floorMist.addColorStop(0, "rgba(38, 91, 48, 0.16)");
  floorMist.addColorStop(1, "rgba(10, 34, 17, 0)");
  ctx.fillStyle = floorMist;
  ctx.fillRect(w * 0.36, h * 0.66, w * 0.64, h * 0.34);

  const vignette = ctx.createRadialGradient(
    archX,
    archY,
    minSide * 0.13,
    w * 0.63,
    h * 0.5,
    maxSide * 0.82,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 3, 1, 0.46)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
};
