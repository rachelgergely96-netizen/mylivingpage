import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "../shared/motion";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

type SeamPoint = readonly [number, number];

const KINTSUGI_SEAMS: ReadonlyArray<ReadonlyArray<SeamPoint>> = [
  [
    [-0.24, 0.03],
    [-0.18, 0.18],
    [-0.31, 0.31],
    [-0.21, 0.48],
    [-0.29, 0.66],
    [-0.13, 0.88],
  ],
  [
    [-0.29, 0.31],
    [-0.53, 0.36],
    [-0.7, 0.48],
  ],
  [
    [-0.21, 0.48],
    [0.02, 0.55],
    [0.14, 0.7],
    [0.38, 0.79],
  ],
  [
    [0.47, 0.13],
    [0.34, 0.28],
    [0.43, 0.42],
    [0.29, 0.58],
  ],
  [
    [0.43, 0.42],
    [0.66, 0.5],
    [0.76, 0.61],
  ],
  [
    [0.14, 0.7],
    [0.03, 0.82],
    [0.08, 0.98],
  ],
];

function traceVessel(
  ctx: CanvasRenderingContext2D,
  cx: number,
  top: number,
  halfWidth: number,
  height: number,
) {
  ctx.beginPath();
  ctx.moveTo(cx - halfWidth * 0.27, top);
  ctx.bezierCurveTo(
    cx - halfWidth * 0.29,
    top + height * 0.08,
    cx - halfWidth * 0.67,
    top + height * 0.12,
    cx - halfWidth * 0.82,
    top + height * 0.27,
  );
  ctx.bezierCurveTo(
    cx - halfWidth * 1.08,
    top + height * 0.48,
    cx - halfWidth * 0.92,
    top + height * 0.82,
    cx - halfWidth * 0.52,
    top + height * 0.96,
  );
  ctx.quadraticCurveTo(cx, top + height * 1.03, cx + halfWidth * 0.52, top + height * 0.96);
  ctx.bezierCurveTo(
    cx + halfWidth * 0.92,
    top + height * 0.82,
    cx + halfWidth * 1.08,
    top + height * 0.48,
    cx + halfWidth * 0.82,
    top + height * 0.27,
  );
  ctx.bezierCurveTo(
    cx + halfWidth * 0.67,
    top + height * 0.12,
    cx + halfWidth * 0.29,
    top + height * 0.08,
    cx + halfWidth * 0.27,
    top,
  );
  ctx.closePath();
}

export const renderPorcelain: ThemeRenderer = (
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
  const cx = w * 0.79 + pointerX * minSide * 0.028;
  const top = h * 0.15 + pointerY * minSide * 0.018;
  const vesselHeight = Math.min(h * 0.76, minSide * 0.82);
  const halfWidth = minSide * 0.255;

  ctx.save();

  const background = ctx.createLinearGradient(0, 0, w, h);
  background.addColorStop(0, "#17202D");
  background.addColorStop(0.5, "#202D3B");
  background.addColorStop(1, "#0A1119");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  // Far plane: cool studio light and a quiet plinth.
  const studioLight = ctx.createRadialGradient(
    cx - halfWidth * 0.5,
    top + vesselHeight * 0.24,
    0,
    cx,
    top + vesselHeight * 0.45,
    vesselHeight * 0.92,
  );
  studioLight.addColorStop(0, "rgba(218, 235, 249, 0.2)");
  studioLight.addColorStop(0.55, "rgba(117, 153, 181, 0.08)");
  studioLight.addColorStop(1, "rgba(10, 17, 25, 0)");
  ctx.fillStyle = studioLight;
  ctx.fillRect(w * 0.36, 0, w * 0.64, h);

  const plinth = ctx.createLinearGradient(0, h * 0.79, 0, h);
  plinth.addColorStop(0, "rgba(108, 132, 151, 0)");
  plinth.addColorStop(1, "rgba(5, 10, 15, 0.42)");
  ctx.fillStyle = plinth;
  ctx.fillRect(w * 0.42, h * 0.72, w * 0.58, h * 0.28);

  ctx.save();
  ctx.translate(halfWidth * 0.08, vesselHeight * 0.035);
  traceVessel(ctx, cx, top, halfWidth, vesselHeight);
  ctx.fillStyle = "rgba(3, 7, 12, 0.42)";
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = minSide * 0.045;
  ctx.fill();
  ctx.restore();

  // Middle plane: one substantial glazed ceramic form.
  const ceramic = ctx.createLinearGradient(cx - halfWidth, top, cx + halfWidth, top + vesselHeight);
  ceramic.addColorStop(0, "#EFF4F4");
  ceramic.addColorStop(0.2, "#BFD1DA");
  ceramic.addColorStop(0.53, "#7895A8");
  ceramic.addColorStop(0.78, "#D5E0E1");
  ceramic.addColorStop(1, "#637B8B");
  traceVessel(ctx, cx, top, halfWidth, vesselHeight);
  ctx.fillStyle = ceramic;
  ctx.fill();
  ctx.strokeStyle = "rgba(233, 243, 245, 0.4)";
  ctx.lineWidth = Math.max(1.2, minSide * 0.002);
  ctx.stroke();

  ctx.save();
  traceVessel(ctx, cx, top, halfWidth, vesselHeight);
  ctx.clip();

  const glazeBloom = ctx.createRadialGradient(
    cx - halfWidth * 0.46,
    top + vesselHeight * 0.28,
    0,
    cx - halfWidth * 0.2,
    top + vesselHeight * 0.38,
    halfWidth * 1.35,
  );
  glazeBloom.addColorStop(0, "rgba(255, 255, 250, 0.56)");
  glazeBloom.addColorStop(0.38, "rgba(226, 240, 244, 0.18)");
  glazeBloom.addColorStop(1, "rgba(63, 90, 108, 0)");
  ctx.fillStyle = glazeBloom;
  ctx.fillRect(cx - halfWidth * 1.2, top, halfWidth * 2.4, vesselHeight);

  for (let band = 0; band < 5; band += 1) {
    const y = top + vesselHeight * (0.22 + band * 0.14);
    ctx.beginPath();
    ctx.ellipse(cx, y, halfWidth * (0.76 + band * 0.05), vesselHeight * 0.045, 0, 0, TAU);
    ctx.strokeStyle = `rgba(54, 92, 119, ${0.06 + band * 0.012})`;
    ctx.lineWidth = Math.max(1, minSide * 0.0016);
    ctx.stroke();
  }

  for (let i = 0; i < 38; i += 1) {
    const seed = i + 1;
    const x = cx + Math.sin(seed * 8.17) * halfWidth * 0.92;
    const y = top + (0.08 + (0.5 + 0.5 * Math.cos(seed * 5.63)) * 0.86) * vesselHeight;
    ctx.beginPath();
    ctx.arc(x, y, 0.5 + (i % 3) * 0.35, 0, TAU);
    ctx.fillStyle = `rgba(244, 250, 248, ${0.05 + (i % 4) * 0.02})`;
    ctx.fill();
  }

  // Foreground: fixed fracture geometry, repaired with page-linked gold seams.
  for (let seamIndex = 0; seamIndex < KINTSUGI_SEAMS.length; seamIndex += 1) {
    const seam = KINTSUGI_SEAMS[seamIndex];
    const weight = storyStepWeight(page.storyProgress, seamIndex, KINTSUGI_SEAMS.length);
    ctx.beginPath();
    for (let pointIndex = 0; pointIndex < seam.length; pointIndex += 1) {
      const [xRatio, yRatio] = seam[pointIndex];
      const x = cx + xRatio * halfWidth;
      const y = top + yRatio * vesselHeight;
      if (pointIndex === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(37, 50, 57, 0.72)";
    ctx.lineWidth = Math.max(2.4, minSide * 0.005);
    ctx.lineJoin = "round";
    ctx.stroke();

    ctx.strokeStyle = `rgba(239, 190, 92, ${0.45 + weight * 0.48})`;
    ctx.lineWidth = Math.max(0.9, minSide * (0.0016 + weight * 0.0012));
    ctx.shadowColor = "rgba(255, 201, 91, 0.55)";
    ctx.shadowBlur = weight * minSide * 0.018;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  const movingHighlight = ctx.createLinearGradient(
    cx - halfWidth + ((t * 0.012 + page.storyProgress * 0.22) % 1) * halfWidth * 2,
    top,
    cx + ((t * 0.012 + page.storyProgress * 0.22) % 1) * halfWidth * 2,
    top + vesselHeight,
  );
  movingHighlight.addColorStop(0, "rgba(255, 255, 255, 0)");
  movingHighlight.addColorStop(0.5, "rgba(255, 255, 255, 0.08)");
  movingHighlight.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = movingHighlight;
  ctx.fillRect(cx - halfWidth, top, halfWidth * 2, vesselHeight);
  ctx.restore();

  ctx.beginPath();
  ctx.ellipse(cx, top + vesselHeight * 0.01, halfWidth * 0.28, vesselHeight * 0.027, 0, 0, TAU);
  ctx.strokeStyle = "rgba(255, 255, 250, 0.58)";
  ctx.lineWidth = Math.max(1, minSide * 0.002);
  ctx.stroke();

  if (page.hasFocus) {
    ctx.beginPath();
    ctx.moveTo(page.focusX * w, page.focusY * h);
    ctx.quadraticCurveTo(w * 0.61, page.focusY * h, cx - halfWidth * 0.74, top + vesselHeight * 0.56);
    ctx.strokeStyle = "rgba(241, 196, 105, 0.2)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const clearSpace = ctx.createLinearGradient(0, 0, w * 0.67, 0);
  clearSpace.addColorStop(0, "rgba(15, 22, 31, 0.8)");
  clearSpace.addColorStop(0.62, "rgba(15, 22, 31, 0.46)");
  clearSpace.addColorStop(1, "rgba(15, 22, 31, 0)");
  ctx.fillStyle = clearSpace;
  ctx.fillRect(0, 0, w * 0.67, h);

  const vignette = ctx.createRadialGradient(cx, top + vesselHeight * 0.45, minSide * 0.12, w * 0.56, h * 0.5, Math.max(w, h) * 0.8);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.32)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
};
