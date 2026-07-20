import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "../shared/motion";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

interface Drape {
  x: number;
  y: number;
  width: number;
  height: number;
  amplitude: number;
  sag: number;
  phase: number;
  color: readonly [number, number, number];
}

function fabricPoint(
  drape: Drape,
  u: number,
  v: number,
  phase: number,
  pullX: number,
  pullY: number,
): readonly [number, number] {
  const anchored = v * v;
  const billow = Math.sin(v * Math.PI * 1.55 + phase + u * 1.8);
  const crossFold = Math.sin(u * Math.PI * 2.4 - phase * 0.45) * Math.sin(v * Math.PI);
  const x =
    drape.x +
    u * drape.width +
    billow * drape.amplitude * (0.18 + anchored * 0.82) +
    pullX * anchored;
  const y =
    drape.y +
    v * drape.height +
    Math.sin(u * Math.PI) * drape.sag * Math.sin(v * Math.PI) +
    crossFold * drape.sag * 0.18 +
    pullY * anchored;
  return [x, y];
}

function traceDrape(
  ctx: CanvasRenderingContext2D,
  drape: Drape,
  phase: number,
  pullX: number,
  pullY: number,
) {
  const segments = 16;
  ctx.beginPath();
  for (let i = 0; i <= segments; i += 1) {
    const point = fabricPoint(drape, i / segments, 0, phase, pullX, pullY);
    if (i === 0) ctx.moveTo(point[0], point[1]);
    else ctx.lineTo(point[0], point[1]);
  }
  for (let i = 1; i <= segments; i += 1) {
    const point = fabricPoint(drape, 1, i / segments, phase, pullX, pullY);
    ctx.lineTo(point[0], point[1]);
  }
  for (let i = segments - 1; i >= 0; i -= 1) {
    const point = fabricPoint(drape, i / segments, 1, phase, pullX, pullY);
    ctx.lineTo(point[0], point[1]);
  }
  for (let i = segments - 1; i > 0; i -= 1) {
    const point = fabricPoint(drape, 0, i / segments, phase, pullX, pullY);
    ctx.lineTo(point[0], point[1]);
  }
  ctx.closePath();
}

export const renderTulle: ThemeRenderer = (
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
  const pullX = pointerX * minSide * 0.11 + page.scrollVelocity * minSide * 0.012;
  const pullY = pointerY * minSide * 0.065 - page.interactionImpulse * minSide * 0.025;
  const phase = t * 0.055 + page.storyProgress * 0.9;
  const drapes: Drape[] = [
    {
      x: w * 0.55,
      y: -h * 0.08,
      width: minSide * 0.39,
      height: h * 1.12,
      amplitude: minSide * 0.065,
      sag: minSide * 0.055,
      phase: 0.2,
      color: [126, 151, 184],
    },
    {
      x: w * 0.69,
      y: -h * 0.12,
      width: minSide * 0.36,
      height: h * 1.15,
      amplitude: minSide * 0.09,
      sag: minSide * 0.07,
      phase: 1.8,
      color: [190, 174, 210],
    },
    {
      x: w * 0.79,
      y: -h * 0.05,
      width: minSide * 0.31,
      height: h * 1.08,
      amplitude: minSide * 0.075,
      sag: minSide * 0.05,
      phase: 3.4,
      color: [218, 210, 228],
    },
  ];

  ctx.save();

  const background = ctx.createLinearGradient(0, 0, w, h);
  background.addColorStop(0, "#0E1019");
  background.addColorStop(0.48, "#101321");
  background.addColorStop(1, "#04060A");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  // Far plane: a cool backlight reveals the fabric without filling the text lane.
  const backlight = ctx.createRadialGradient(w * 0.82, h * 0.36, 0, w * 0.82, h * 0.42, minSide * 0.72);
  backlight.addColorStop(0, "rgba(201, 214, 243, 0.22)");
  backlight.addColorStop(0.46, "rgba(108, 128, 173, 0.09)");
  backlight.addColorStop(1, "rgba(8, 9, 15, 0)");
  ctx.fillStyle = backlight;
  ctx.fillRect(w * 0.34, 0, w * 0.66, h);

  for (let drapeIndex = 0; drapeIndex < drapes.length; drapeIndex += 1) {
    const drape = drapes[drapeIndex];
    const drapePhase = phase * (0.72 + drapeIndex * 0.09) + drape.phase;
    const [red, green, blue] = drape.color;

    // Middle plane: translucent filled sheets create depth before the mesh is drawn.
    traceDrape(ctx, drape, drapePhase, pullX, pullY);
    const fabric = ctx.createLinearGradient(drape.x, 0, drape.x + drape.width, h);
    fabric.addColorStop(0, `rgba(${red}, ${green}, ${blue}, ${0.055 + drapeIndex * 0.018})`);
    fabric.addColorStop(0.48, `rgba(${red + 18}, ${green + 16}, ${blue + 12}, ${0.14 + drapeIndex * 0.025})`);
    fabric.addColorStop(1, `rgba(${red - 24}, ${green - 20}, ${blue - 14}, 0.035)`);
    ctx.fillStyle = fabric;
    ctx.fill();

    ctx.save();
    traceDrape(ctx, drape, drapePhase, pullX, pullY);
    ctx.clip();

    const columnCount = 7;
    const rowCount = 10;
    for (let column = 0; column <= columnCount; column += 1) {
      const u = column / columnCount;
      ctx.beginPath();
      for (let sample = 0; sample <= 18; sample += 1) {
        const point = fabricPoint(drape, u, sample / 18, drapePhase, pullX, pullY);
        if (sample === 0) ctx.moveTo(point[0], point[1]);
        else ctx.lineTo(point[0], point[1]);
      }
      ctx.strokeStyle = `rgba(222, 231, 250, ${0.055 + drapeIndex * 0.018})`;
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }

    for (let row = 0; row <= rowCount; row += 1) {
      const v = row / rowCount;
      ctx.beginPath();
      for (let sample = 0; sample <= 16; sample += 1) {
        const point = fabricPoint(drape, sample / 16, v, drapePhase, pullX, pullY);
        if (sample === 0) ctx.moveTo(point[0], point[1]);
        else ctx.lineTo(point[0], point[1]);
      }
      ctx.strokeStyle = `rgba(232, 225, 247, ${0.04 + drapeIndex * 0.015})`;
      ctx.lineWidth = 0.65;
      ctx.stroke();
    }
    ctx.restore();

    const edgeWeight = storyStepWeight(page.storyProgress, drapeIndex, drapes.length);
    ctx.beginPath();
    for (let sample = 0; sample <= 20; sample += 1) {
      const point = fabricPoint(drape, 0, sample / 20, drapePhase, pullX, pullY);
      if (sample === 0) ctx.moveTo(point[0], point[1]);
      else ctx.lineTo(point[0], point[1]);
    }
    ctx.strokeStyle = `rgba(246, 240, 255, ${0.12 + edgeWeight * 0.28})`;
    ctx.lineWidth = 0.9 + edgeWeight * 1.2;
    ctx.stroke();
  }

  // Foreground: a few pearl knots make the tulle read as tactile material.
  for (let i = 0; i < 18; i += 1) {
    const drapeIndex = i % drapes.length;
    const drape = drapes[drapeIndex];
    const u = ((i * 5) % 8) / 7;
    const v = (1 + ((i * 7) % 10)) / 11;
    const point = fabricPoint(
      drape,
      u,
      v,
      phase * (0.72 + drapeIndex * 0.09) + drape.phase,
      pullX,
      pullY,
    );
    const shimmer = 0.5 + 0.5 * Math.sin(t * 0.42 + i * 1.9);
    ctx.beginPath();
    ctx.arc(point[0], point[1], 0.75 + shimmer * 1.15, 0, TAU);
    ctx.fillStyle = `rgba(247, 243, 255, ${0.12 + shimmer * 0.24})`;
    ctx.fill();
  }

  if (page.hasFocus) {
    const target = fabricPoint(drapes[0], 0.08, 0.52, phase + drapes[0].phase, pullX, pullY);
    ctx.beginPath();
    ctx.moveTo(page.focusX * w, page.focusY * h);
    ctx.quadraticCurveTo(w * 0.62, page.focusY * h, target[0], target[1]);
    ctx.strokeStyle = "rgba(225, 229, 250, 0.2)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const clearSpace = ctx.createLinearGradient(0, 0, w * 0.69, 0);
  clearSpace.addColorStop(0, "rgba(8, 9, 15, 0.84)");
  clearSpace.addColorStop(0.64, "rgba(8, 9, 15, 0.52)");
  clearSpace.addColorStop(1, "rgba(8, 9, 15, 0)");
  ctx.fillStyle = clearSpace;
  ctx.fillRect(0, 0, w * 0.69, h);

  const vignette = ctx.createRadialGradient(w * 0.78, h * 0.42, minSide * 0.1, w * 0.56, h * 0.5, Math.max(w, h) * 0.82);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.37)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
};
