import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "../shared/motion";
import type { ThemeRenderer } from "../types";

function stableUnit(seed: number): number {
  const value = Math.sin(seed * 83.11 + 19.7) * 43758.5453;
  return value - Math.floor(value);
}

export const renderVelvet: ThemeRenderer = (
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
  const reducedMotion = motion?.reducedMotion ?? false;
  const effectiveTime = reducedMotion ? 0 : finiteClamp(t, 0, 1_000_000);
  const targetX = pageMotion.hasFocus ? mx * 0.35 + pageMotion.focusX * 0.65 : mx;
  const targetY = pageMotion.hasFocus ? my * 0.35 + pageMotion.focusY * 0.65 : my;
  const background = ctx.createLinearGradient(0, 0, w, h);
  background.addColorStop(0, "#2A0714");
  background.addColorStop(0.5, "#16040C");
  background.addColorStop(1, "#070205");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  // Fine deterministic nap reads as material at both preview and full-page size.
  ctx.save();
  ctx.lineWidth = 0.7;
  for (let index = 0; index < 180; index += 1) {
    const x = stableUnit(index * 2.31) * w;
    const y = stableUnit(index * 4.07 + 3) * h;
    const length = 2 + stableUnit(index * 1.73 + 8) * 7;
    const lean = (stableUnit(index * 3.2 + 1) - 0.5) * 4;
    ctx.strokeStyle = index % 4 === 0
      ? "rgba(255, 205, 214, 0.055)"
      : "rgba(63, 4, 25, 0.22)";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + lean, y + length);
    ctx.stroke();
  }
  ctx.restore();

  // A restrained light rake replaces the familiar glowing orb.
  const rakeCenter = w * (0.42 + (targetX - 0.5) * 0.08);
  const rake = ctx.createLinearGradient(
    rakeCenter - w * 0.24,
    0,
    rakeCenter + w * 0.24,
    h,
  );
  rake.addColorStop(0, "rgba(255, 207, 220, 0)");
  rake.addColorStop(0.48, "rgba(224, 94, 135, 0.09)");
  rake.addColorStop(0.58, "rgba(255, 210, 221, 0.035)");
  rake.addColorStop(1, "rgba(255, 207, 220, 0)");
  ctx.fillStyle = rake;
  ctx.fillRect(0, 0, w, h);

  // The folio gutter anchors the artwork to the right of the readable column.
  const gutterX = w * (0.73 + (targetX - 0.5) * 0.012);
  const gutter = ctx.createLinearGradient(gutterX - w * 0.09, 0, gutterX + w * 0.08, 0);
  gutter.addColorStop(0, "rgba(0, 0, 0, 0)");
  gutter.addColorStop(0.46, "rgba(0, 0, 0, 0.46)");
  gutter.addColorStop(0.53, "rgba(245, 150, 178, 0.08)");
  gutter.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gutter;
  ctx.fillRect(gutterX - w * 0.1, 0, w * 0.2, h);

  const margin = Math.max(16, Math.min(w, h) * 0.035);
  ctx.strokeStyle = "rgba(224, 181, 112, 0.34)";
  ctx.lineWidth = 1;
  ctx.strokeRect(margin + 0.5, margin + 0.5, w - margin * 2 - 1, h - margin * 2 - 1);
  ctx.strokeStyle = "rgba(224, 181, 112, 0.11)";
  ctx.strokeRect(
    margin + 5.5,
    margin + 5.5,
    w - margin * 2 - 11,
    h - margin * 2 - 11,
  );

  // Blind-embossed folio device: geometric, quiet, and intentionally not text.
  const deviceSize = Math.min(w, h) * 0.15;
  const deviceX = w * 0.82;
  const deviceY = h * 0.24;
  ctx.save();
  ctx.translate(deviceX, deviceY);
  ctx.rotate(-0.04 + (targetY - 0.5) * 0.025);
  ctx.strokeStyle = "rgba(230, 178, 193, 0.12)";
  ctx.fillStyle = "rgba(91, 12, 41, 0.22)";
  ctx.lineWidth = 1;
  ctx.fillRect(-deviceSize * 0.5, -deviceSize * 0.62, deviceSize, deviceSize * 1.24);
  ctx.strokeRect(-deviceSize * 0.5, -deviceSize * 0.62, deviceSize, deviceSize * 1.24);
  ctx.strokeRect(-deviceSize * 0.37, -deviceSize * 0.49, deviceSize * 0.74, deviceSize * 0.98);
  ctx.beginPath();
  ctx.moveTo(-deviceSize * 0.22, deviceSize * 0.18);
  ctx.lineTo(0, -deviceSize * 0.26);
  ctx.lineTo(deviceSize * 0.22, deviceSize * 0.18);
  ctx.stroke();
  ctx.restore();

  // Chapter rules respond to the actual sections in the Living Resume.
  const sectionCount = Math.max(4, pageMotion.sectionCount || 6);
  const railX = w - margin - 12;
  const railTop = margin + 24;
  const railHeight = h - margin * 2 - 48;
  ctx.strokeStyle = "rgba(224, 181, 112, 0.16)";
  ctx.beginPath();
  ctx.moveTo(railX, railTop);
  ctx.lineTo(railX, railTop + railHeight);
  ctx.stroke();

  for (let index = 0; index < sectionCount; index += 1) {
    const y = railTop + (index / Math.max(1, sectionCount - 1)) * railHeight;
    const weight = storyStepWeight(pageMotion.storyProgress, index, sectionCount);
    ctx.fillStyle = `rgba(229, 190, 127, ${0.22 + weight * 0.56})`;
    ctx.fillRect(railX - 8 - weight * 8, y, 8 + weight * 8, 1 + weight);
  }

  const markerY = railTop + pageMotion.storyProgress * railHeight;
  ctx.fillStyle = "rgba(255, 221, 164, 0.86)";
  ctx.fillRect(railX - 3, markerY - 3, 6, 6);
  ctx.strokeStyle = `rgba(255, 221, 164, ${0.24 + pageMotion.interactionImpulse * 0.42})`;
  const echo = 8 + (1 - pageMotion.interactionImpulse) * 14;
  ctx.strokeRect(railX - echo * 0.5, markerY - echo * 0.5, echo, echo);

  // Issue rules and a page-edge notch provide editorial detail without labels.
  ctx.fillStyle = "rgba(224, 181, 112, 0.24)";
  ctx.fillRect(margin + 14, h - margin - 15, w * 0.08, 1);
  ctx.fillRect(margin + 14, h - margin - 10, w * 0.035, 1);
  ctx.fillRect(w - margin - 46, margin + 15, 31, 1);
  ctx.fillRect(w - margin - 20, margin + 10, 1, 11);

  if (pageMotion.hasFocus) {
    const focusX = pageMotion.focusX * w;
    const focusY = pageMotion.focusY * h;
    ctx.save();
    ctx.strokeStyle = `rgba(238, 202, 144, ${0.24 + pageMotion.interactionImpulse * 0.32})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 6]);
    ctx.beginPath();
    ctx.moveTo(railX, markerY);
    ctx.lineTo(focusX, focusY);
    ctx.stroke();
    ctx.setLineDash([]);
    const size = 8 + (1 - pageMotion.interactionImpulse) * 10;
    ctx.strokeRect(focusX - size * 0.5, focusY - size * 0.5, size, size);
    ctx.restore();
  }

  const vignette = ctx.createRadialGradient(
    w * 0.52,
    h * 0.42,
    Math.min(w, h) * 0.12,
    w * 0.52,
    h * 0.45,
    Math.max(w, h) * 0.78,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.34)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  // Time only moves the light by a fraction; the folio itself never breathes.
  if (!reducedMotion) {
    const shimmerX = w * (0.64 + Math.sin(effectiveTime * 0.055) * 0.08);
    const shimmer = ctx.createLinearGradient(shimmerX - 20, 0, shimmerX + 20, 0);
    shimmer.addColorStop(0, "rgba(255, 222, 166, 0)");
    shimmer.addColorStop(0.5, "rgba(255, 222, 166, 0.035)");
    shimmer.addColorStop(1, "rgba(255, 222, 166, 0)");
    ctx.fillStyle = shimmer;
    ctx.fillRect(shimmerX - 20, 0, 40, h);
  }
};
