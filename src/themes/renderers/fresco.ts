import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "../shared/motion";
import { fbm, noise2D } from "../shared/noise";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

const PIGMENTS = [
  [178, 116, 82],
  [126, 142, 130],
  [185, 151, 102],
  [137, 89, 78],
  [92, 116, 126],
  [204, 169, 124],
] as const;

interface WashAnchor {
  x: number;
  y: number;
}

/** Mineral plaster, pigment veils, and hairline cracks form a collected wall. */
export const renderFresco: ThemeRenderer = (
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
  const washAnchors: WashAnchor[] = [];

  ctx.save();

  const background = ctx.createLinearGradient(0, 0, w, h);
  background.addColorStop(0, "#18120E");
  background.addColorStop(0.52, "#110E0C");
  background.addColorStop(1, "#070605");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  // Far plane: a continuous lime-plaster substrate with soft trowel variation.
  const tile = Math.max(30, minSide * 0.055);
  const noiseDriftX = Math.sin(t * 0.033) * 0.08;
  const noiseDriftY = Math.cos(t * 0.027) * 0.065;
  for (let x = 0; x < w; x += tile) {
    for (let y = 0; y < h; y += tile) {
      const mineral = fbm(x * 0.008 + noiseDriftX, y * 0.008 + noiseDriftY, 4);
      const warm = noise2D(x * 0.015 + 37.4, y * 0.015 - 12.6);
      const light = noise2D(x * 0.004 - 19, y * 0.004 + 8);
      const red = 64 + mineral * 22 + warm * 13 + light * 10;
      const green = 49 + mineral * 17 + warm * 9 + light * 8;
      const blue = 38 + mineral * 12 + warm * 7 + light * 6;
      ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, 0.34)`;
      ctx.fillRect(x, y, tile + 1.5, tile + 1.5);
    }
  }

  const plasterLight = ctx.createRadialGradient(
    w * (0.78 + (mx - 0.5) * 0.016),
    h * (0.38 + (my - 0.5) * 0.012),
    0,
    w * 0.76,
    h * 0.42,
    maxSide * 0.62,
  );
  plasterLight.addColorStop(0, "rgba(228, 194, 151, 0.13)");
  plasterLight.addColorStop(0.46, "rgba(151, 113, 84, 0.045)");
  plasterLight.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = plasterLight;
  ctx.fillRect(w * 0.33, 0, w * 0.67, h);

  // Trowel marks sit behind the pigment and make the wall read as material.
  ctx.save();
  ctx.lineCap = "round";
  for (let mark = 0; mark < 16; mark += 1) {
    const seed = mark * 0.853 + 0.17;
    const x = w * (0.43 + (Math.sin(seed * 5.3) * 0.5 + 0.5) * 0.62);
    const y = (Math.cos(seed * 4.2) * 0.5 + 0.5) * h;
    const length = minSide * (0.08 + (mark % 5) * 0.027);
    ctx.beginPath();
    ctx.moveTo(x - length * 0.5, y);
    ctx.quadraticCurveTo(
      x,
      y + Math.sin(seed * 9) * minSide * 0.015,
      x + length * 0.5,
      y - minSide * 0.004,
    );
    ctx.strokeStyle = `rgba(238, 216, 184, ${0.018 + (mark % 4) * 0.009})`;
    ctx.lineWidth = minSide * (0.006 + (mark % 3) * 0.0025);
    ctx.stroke();
  }
  ctx.restore();

  // Middle plane: translucent pigment veils cluster toward the right edge.
  for (let index = 0; index < PIGMENTS.length; index += 1) {
    const [red, green, blue] = PIGMENTS[index];
    const chapterWeight = storyStepWeight(
      pageMotion.storyProgress,
      index,
      PIGMENTS.length,
    );
    const seed = index * 1.37 + 0.29;
    const x =
      w * (0.56 + (index % 3) * 0.17) +
      Math.sin(t * (0.038 + index * 0.003) + seed) * minSide * 0.012 +
      (mx - 0.5) * minSide * 0.012;
    const y =
      h * (0.18 + Math.floor(index / 3) * 0.43 + (index % 2) * 0.11) +
      Math.cos(t * (0.034 + index * 0.002) + seed) * minSide * 0.01 +
      (my - 0.5) * minSide * 0.01 +
      velocity * minSide * 0.012;
    const radius = minSide * (0.125 + (index % 3) * 0.025);
    washAnchors.push({ x, y });

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(seed * 0.31 + Math.sin(t * 0.028 + seed) * 0.025);
    ctx.scale(1.32 + (index % 2) * 0.16, 0.72 + (index % 3) * 0.08);
    const wash = ctx.createRadialGradient(
      -radius * 0.22,
      -radius * 0.18,
      radius * 0.04,
      0,
      0,
      radius,
    );
    wash.addColorStop(
      0,
      `rgba(${red + 18}, ${green + 14}, ${blue + 10}, ${0.14 + chapterWeight * 0.08})`,
    );
    wash.addColorStop(
      0.46,
      `rgba(${red}, ${green}, ${blue}, ${0.075 + chapterWeight * 0.04})`,
    );
    wash.addColorStop(
      0.82,
      `rgba(${red - 16}, ${green - 13}, ${blue - 9}, 0.025)`,
    );
    wash.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0)`);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    ctx.fillStyle = wash;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.72, -Math.PI * 0.88, Math.PI * 0.56);
    ctx.strokeStyle = `rgba(245, 220, 184, ${0.035 + chapterWeight * 0.045})`;
    ctx.lineWidth = minSide * 0.002;
    ctx.stroke();
    ctx.restore();
  }

  // Foreground plane: deterministic fracture paths with a dark recess and a
  // mineral-lit lip. Active chapters make one family of cracks catch light.
  const crackCount = 18;
  for (let crack = 0; crack < crackCount; crack += 1) {
    const seed = crack * 0.713 + 0.26;
    const chapterWeight = storyStepWeight(
      pageMotion.storyProgress,
      crack,
      crackCount,
    );
    let x = w * (0.47 + (Math.sin(seed * 6.4) * 0.5 + 0.5) * 0.56);
    let y = (Math.cos(seed * 5.1) * 0.5 + 0.5) * h;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let step = 0; step < 7; step += 1) {
      const angle =
        noise2D(
          x * 0.018 + crack * 0.43 + noiseDriftX,
          y * 0.018 - step * 0.21 + noiseDriftY,
        ) *
          Math.PI *
          1.35 +
        (crack % 2 === 0 ? 0.22 : -0.22);
      x = Math.max(
        w * 0.43,
        Math.min(w + minSide * 0.04, x + Math.cos(angle) * minSide * 0.028),
      );
      y += Math.sin(angle) * minSide * 0.021 + minSide * 0.003;
      ctx.lineTo(x, y);
    }
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(19, 13, 10, 0.46)";
    ctx.lineWidth = minSide * (0.0026 + chapterWeight * 0.0007);
    ctx.stroke();
    ctx.strokeStyle = `rgba(226, 201, 166, ${0.065 + chapterWeight * 0.14})`;
    ctx.lineWidth = Math.max(0.45, minSide * 0.00075);
    ctx.stroke();
  }

  // Chalk bloom and grains create a shallow near-camera layer.
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let grain = 0; grain < 46; grain += 1) {
    const seed = grain * 0.619 + 0.44;
    const depth = 0.3 + (grain % 5) * 0.14;
    const x = w * (0.45 + (Math.sin(seed * 6.7) * 0.5 + 0.5) * 0.59);
    const y =
      (Math.cos(seed * 4.8) * 0.5 + 0.5) * h +
      Math.sin(t * (0.028 + depth * 0.014) + seed * 8.4) * h * 0.004;
    const radius = minSide * (0.00065 + depth * 0.0011);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fillStyle = `rgba(242, 221, 190, ${0.026 + depth * 0.045})`;
    ctx.fill();
  }
  ctx.restore();

  const activeIndex = Math.min(
    washAnchors.length - 1,
    Math.round(pageMotion.storyProgress * (washAnchors.length - 1)),
  );
  const activeAnchor = washAnchors[activeIndex];
  if (pageMotion.hasFocus && activeAnchor) {
    const focusX = pageMotion.focusX * w;
    const focusY = pageMotion.focusY * h;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(activeAnchor.x, activeAnchor.y);
    ctx.bezierCurveTo(
      w * 0.72,
      activeAnchor.y,
      w * 0.65,
      focusY,
      focusX,
      focusY,
    );
    ctx.strokeStyle = `rgba(225, 190, 149, ${0.065 + pageMotion.interactionImpulse * 0.12})`;
    ctx.lineWidth = Math.max(0.55, minSide * 0.0008);
    ctx.setLineDash([minSide * 0.0025, minSide * 0.011]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // A translucent plaster glaze protects the reading lane on the left.
  const clearSpace = ctx.createLinearGradient(0, 0, w * 0.64, 0);
  clearSpace.addColorStop(0, "rgba(12, 9, 7, 0.76)");
  clearSpace.addColorStop(0.7, "rgba(13, 10, 8, 0.34)");
  clearSpace.addColorStop(1, "rgba(13, 10, 8, 0)");
  ctx.fillStyle = clearSpace;
  ctx.fillRect(0, 0, w * 0.67, h);

  const vignette = ctx.createRadialGradient(
    w * 0.77,
    h * 0.43,
    minSide * 0.16,
    w * 0.66,
    h * 0.48,
    maxSide * 0.82,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(3, 2, 1, 0.48)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
};
