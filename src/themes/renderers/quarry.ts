import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "../shared/motion";
import type { ThemeRenderer } from "../types";

const STRATA = [
  { fill: "#302219", edge: "#8B5B37", left: 0.03, right: -0.02 },
  { fill: "#49301F", edge: "#A06A40", left: -0.015, right: 0.025 },
  { fill: "#241C17", edge: "#76513A", left: 0.025, right: 0.01 },
  { fill: "#563720", edge: "#B67842", left: -0.025, right: -0.01 },
  { fill: "#33261E", edge: "#856044", left: 0.01, right: 0.035 },
  { fill: "#402B1D", edge: "#9B653A", left: -0.01, right: -0.025 },
  { fill: "#211A16", edge: "#71513D", left: 0.018, right: 0.012 },
] as const;

function layerPoint(
  w: number,
  h: number,
  xRatio: number,
  layer: number,
  pointerShift: number,
  storyProgress: number,
): [number, number] {
  const offsets = [0, -0.025, 0.018, -0.012, 0.028, -0.02, 0.01];
  const segment = Math.min(offsets.length - 1, Math.round(xRatio * (offsets.length - 1)));
  const y =
    h * (0.08 + layer * 0.126) +
    h * offsets[segment] +
    h * ((layer % 2 === 0 ? 1 : -1) * (xRatio - 0.5) * 0.025) +
    storyProgress * h * 0.006 * layer;
  return [xRatio * w + pointerShift * (layer + 1) * 0.08, y];
}

export const renderQuarry: ThemeRenderer = (
  ctx,
  w,
  h,
  _t,
  mx,
  _my,
  _deltaSeconds,
  motion,
) => {
  const pageMotion = resolveThemeMotion(motion);
  const velocity = finiteClamp(pageMotion.scrollVelocity / 4, -1, 1);
  const pointerShift = (mx - 0.5) * w * 0.024;
  const background = ctx.createLinearGradient(0, 0, w, h);
  background.addColorStop(0, "#120D09");
  background.addColorStop(0.52, "#090705");
  background.addColorStop(1, "#030302");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const sectionCount = Math.max(4, Math.min(STRATA.length, pageMotion.sectionCount || 6));
  const activeIndex = pageMotion.activeSectionIndex >= 0
    ? Math.min(sectionCount - 1, pageMotion.activeSectionIndex)
    : Math.min(sectionCount - 1, Math.round(pageMotion.storyProgress * (sectionCount - 1)));
  const pointsPerLayer = 7;

  for (let layer = 0; layer < STRATA.length; layer += 1) {
    const stratum = STRATA[layer];
    const top = Array.from({ length: pointsPerLayer }, (_, pointIndex) =>
      layerPoint(
        w,
        h,
        pointIndex / (pointsPerLayer - 1),
        layer,
        pointerShift,
        pageMotion.storyProgress,
      ),
    );
    const nextLayer = Math.min(STRATA.length, layer + 1);
    const bottom = Array.from({ length: pointsPerLayer }, (_, pointIndex) => {
      if (nextLayer < STRATA.length) {
        return layerPoint(
          w,
          h,
          pointIndex / (pointsPerLayer - 1),
          nextLayer,
          pointerShift,
          pageMotion.storyProgress,
        );
      }
      return [
        (pointIndex / (pointsPerLayer - 1)) * w,
        h * 1.04,
      ] as [number, number];
    });
    const chapterWeight = storyStepWeight(
      pageMotion.storyProgress,
      Math.min(layer, sectionCount - 1),
      sectionCount,
    );
    const active = layer === activeIndex;

    ctx.beginPath();
    top.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    bottom.slice().reverse().forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.closePath();
    const fill = ctx.createLinearGradient(0, top[0][1], w, bottom[0][1]);
    fill.addColorStop(0, "#17110D");
    fill.addColorStop(0.44, stratum.fill);
    fill.addColorStop(1, active ? "#684125" : stratum.fill);
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.beginPath();
    top.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = active
      ? `rgba(255, 197, 137, ${0.44 + pageMotion.interactionImpulse * 0.18})`
      : stratum.edge;
    ctx.globalAlpha = active ? 0.95 : 0.24 + chapterWeight * 0.18;
    ctx.lineWidth = active ? 1.8 : 1;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Chisel hatching is restrained to alternating cut faces.
    if (layer % 2 === 1) {
      ctx.save();
      ctx.beginPath();
      top.forEach(([x, y], index) => {
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      bottom.slice().reverse().forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.closePath();
      ctx.clip();
      ctx.strokeStyle = "rgba(244, 213, 181, 0.045)";
      ctx.lineWidth = 0.7;
      const spacing = Math.max(9, Math.min(w, h) * 0.018);
      for (let x = -h; x < w + h; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x - h * 0.3, h);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // One mineral seam connects the active resume stratum to the art field.
  const seamBase = w * (0.73 + (mx - 0.5) * 0.025);
  const seamPoints = Array.from({ length: 10 }, (_, index) => {
    const y = (index / 9) * h;
    const jag = [0, -0.018, 0.012, -0.008, 0.024, -0.014, 0.008, -0.02, 0.015, 0][index];
    return [
      seamBase + w * jag + velocity * w * 0.006,
      y,
    ] as [number, number];
  });
  ctx.save();
  ctx.beginPath();
  seamPoints.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "rgba(255, 166, 91, 0.24)";
  ctx.lineWidth = 5;
  ctx.shadowColor = "rgba(255, 143, 61, 0.26)";
  ctx.shadowBlur = 14;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255, 222, 183, 0.58)";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();

  // Elevation ticks turn the scene into an architectural section drawing.
  const rulerX = w * 0.92;
  ctx.strokeStyle = "rgba(238, 192, 146, 0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rulerX, h * 0.08);
  ctx.lineTo(rulerX, h * 0.91);
  ctx.stroke();
  for (let tick = 0; tick <= 20; tick += 1) {
    const y = h * (0.08 + tick * 0.0415);
    const length = tick % 5 === 0 ? w * 0.026 : tick % 2 === 0 ? w * 0.014 : w * 0.008;
    ctx.fillStyle = tick % 5 === 0
      ? "rgba(255, 214, 169, 0.34)"
      : "rgba(238, 192, 146, 0.18)";
    ctx.fillRect(rulerX - length, y, length, 1);
  }

  if (pageMotion.hasFocus) {
    const focusX = pageMotion.focusX * w;
    const focusY = pageMotion.focusY * h;
    const seamIndex = Math.min(
      seamPoints.length - 1,
      Math.max(0, Math.round((focusY / Math.max(h, 1)) * (seamPoints.length - 1))),
    );
    const seam = seamPoints[seamIndex];
    ctx.save();
    ctx.strokeStyle = `rgba(255, 216, 174, ${0.24 + pageMotion.interactionImpulse * 0.28})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.moveTo(seam[0], seam[1]);
    ctx.lineTo(focusX, focusY);
    ctx.stroke();
    ctx.setLineDash([]);
    const size = 7 + (1 - pageMotion.interactionImpulse) * 10;
    ctx.strokeRect(focusX - size * 0.5, focusY - size * 0.5, size, size);
    ctx.restore();
  }

  const grazingLight = ctx.createLinearGradient(w * 0.45, 0, w, 0);
  grazingLight.addColorStop(0, "rgba(255, 202, 151, 0)");
  grazingLight.addColorStop(1, "rgba(255, 193, 132, 0.075)");
  ctx.fillStyle = grazingLight;
  ctx.fillRect(w * 0.4, 0, w * 0.6, h);
};
