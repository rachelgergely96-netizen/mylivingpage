import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "../shared/motion";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;
const ARM_COUNT = 8;
const LAYER_COUNT = 3;

function traceCurl(ctx: CanvasRenderingContext2D, radius: number): void {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(
    radius * 0.13,
    -radius * 0.03,
    radius * 0.34,
    -radius * 0.34,
    radius * 0.56,
    -radius * 0.09,
  );
  ctx.bezierCurveTo(
    radius * 0.76,
    radius * 0.15,
    radius * 0.47,
    radius * 0.43,
    radius * 0.27,
    radius * 0.15,
  );
  ctx.bezierCurveTo(
    radius * 0.14,
    -radius * 0.02,
    radius * 0.33,
    -radius * 0.16,
    radius * 0.43,
    radius * 0.015,
  );
}

function traceInnerLeaf(ctx: CanvasRenderingContext2D, radius: number): void {
  ctx.beginPath();
  ctx.moveTo(radius * 0.08, 0);
  ctx.bezierCurveTo(
    radius * 0.19,
    -radius * 0.14,
    radius * 0.34,
    -radius * 0.13,
    radius * 0.41,
    0,
  );
  ctx.bezierCurveTo(
    radius * 0.32,
    radius * 0.1,
    radius * 0.18,
    radius * 0.12,
    radius * 0.08,
    0,
  );
  ctx.closePath();
}

/** Gilded arabesques gather into a right-set ornamental medallion. */
export const renderFiligree: ThemeRenderer = (
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
  const cx =
    w * 0.79 + (mx - 0.5) * minSide * 0.025 + velocity * minSide * 0.008;
  const cy = h * 0.48 + (my - 0.5) * minSide * 0.02;
  const boundedTurn =
    Math.sin(t * 0.052) * 0.055 + (pageMotion.storyProgress - 0.5) * 0.08;
  const armAnchors: Array<{ x: number; y: number }> = [];

  ctx.save();

  const background = ctx.createLinearGradient(0, 0, w, h);
  background.addColorStop(0, "#120C1B");
  background.addColorStop(0.47, "#0B0E1B");
  background.addColorStop(1, "#030407");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  // Far plane: a velvet light pool and ghosted engraved construction arcs.
  const halo = ctx.createRadialGradient(
    cx,
    cy,
    minSide * 0.035,
    cx,
    cy,
    minSide * 0.48,
  );
  halo.addColorStop(0, "rgba(244, 198, 143, 0.15)");
  halo.addColorStop(0.38, "rgba(137, 91, 105, 0.075)");
  halo.addColorStop(1, "rgba(15, 12, 24, 0)");
  ctx.fillStyle = halo;
  ctx.fillRect(cx - minSide * 0.5, 0, minSide, h);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-boundedTurn * 0.4);
  for (let guide = 0; guide < 5; guide += 1) {
    const radius = minSide * (0.09 + guide * 0.055);
    ctx.beginPath();
    ctx.arc(0, 0, radius, -Math.PI * 0.82, Math.PI * (0.55 + guide * 0.035));
    ctx.strokeStyle = `rgba(209, 174, 137, ${0.018 + guide * 0.008})`;
    ctx.lineWidth = Math.max(0.45, minSide * 0.00055);
    ctx.setLineDash([minSide * (0.007 + guide * 0.0015), minSide * 0.015]);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();

  // Middle plane: shadow, warm metal, and hairline highlights give every curl
  // an engraved cross-section. Story progress selects a subtle leading arm.
  const metal = ctx.createLinearGradient(
    cx - minSide * 0.26,
    cy - minSide * 0.24,
    cx + minSide * 0.3,
    cy + minSide * 0.28,
  );
  metal.addColorStop(0, "rgba(106, 65, 46, 0.35)");
  metal.addColorStop(0.23, "rgba(211, 164, 111, 0.74)");
  metal.addColorStop(0.48, "rgba(255, 231, 196, 0.86)");
  metal.addColorStop(0.67, "rgba(158, 105, 71, 0.64)");
  metal.addColorStop(0.86, "rgba(241, 199, 148, 0.78)");
  metal.addColorStop(1, "rgba(88, 54, 42, 0.36)");

  for (let arm = 0; arm < ARM_COUNT; arm += 1) {
    const chapterWeight = storyStepWeight(
      pageMotion.storyProgress,
      arm,
      ARM_COUNT,
    );
    const angle = boundedTurn + (arm / ARM_COUNT) * TAU;
    const anchorRadius = minSide * 0.205;
    armAnchors.push({
      x: cx + Math.cos(angle) * anchorRadius,
      y: cy + Math.sin(angle) * anchorRadius,
    });

    for (let layer = LAYER_COUNT - 1; layer >= 0; layer -= 1) {
      const depth = layer / (LAYER_COUNT - 1);
      const radius = minSide * (0.12 + layer * 0.066);
      const layerTurn = layer * 0.095 - depth * boundedTurn * 0.2;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle + layerTurn);

      traceCurl(ctx, radius);
      ctx.shadowColor = "rgba(0, 0, 0, 0.72)";
      ctx.shadowBlur = minSide * (0.006 + depth * 0.005);
      ctx.shadowOffsetY = minSide * 0.004;
      ctx.strokeStyle = "rgba(39, 21, 22, 0.72)";
      ctx.lineWidth = minSide * (0.0044 - depth * 0.00065);
      ctx.lineCap = "round";
      ctx.stroke();

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      traceCurl(ctx, radius);
      ctx.strokeStyle = metal;
      ctx.globalAlpha = 0.5 + depth * 0.09 + chapterWeight * 0.26;
      ctx.lineWidth = minSide * (0.0022 - depth * 0.00025);
      ctx.stroke();

      ctx.translate(0, -minSide * 0.0012);
      traceCurl(ctx, radius);
      ctx.strokeStyle = `rgba(255, 241, 219, ${0.18 + chapterWeight * 0.25})`;
      ctx.lineWidth = Math.max(0.42, minSide * 0.0006);
      ctx.stroke();

      traceInnerLeaf(ctx, radius);
      ctx.fillStyle = metal;
      ctx.globalAlpha = 0.12 + depth * 0.04 + chapterWeight * 0.09;
      ctx.fill();
      ctx.restore();
    }
  }

  // Foreground plane: raised central boss, pearl studs, and light-catching rim.
  ctx.save();
  ctx.translate(cx, cy);
  const bossRadius = minSide * 0.044;
  const boss = ctx.createRadialGradient(
    -bossRadius * 0.28,
    -bossRadius * 0.35,
    0,
    0,
    0,
    bossRadius,
  );
  boss.addColorStop(0, "rgba(255, 249, 226, 0.96)");
  boss.addColorStop(0.24, "rgba(231, 190, 137, 0.92)");
  boss.addColorStop(0.62, "rgba(119, 73, 56, 0.86)");
  boss.addColorStop(1, "rgba(47, 28, 31, 0.72)");
  ctx.beginPath();
  ctx.arc(0, 0, bossRadius, 0, TAU);
  ctx.shadowColor = "rgba(0, 0, 0, 0.76)";
  ctx.shadowBlur = minSide * 0.018;
  ctx.fillStyle = boss;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(0, 0, bossRadius * 1.18, 0, TAU);
  ctx.strokeStyle = "rgba(255, 224, 181, 0.42)";
  ctx.lineWidth = Math.max(0.7, minSide * 0.0014);
  ctx.stroke();
  ctx.restore();

  for (let arm = 0; arm < armAnchors.length; arm += 1) {
    const anchor = armAnchors[arm];
    const weight = storyStepWeight(pageMotion.storyProgress, arm, ARM_COUNT);
    const beadRadius = minSide * (0.0034 + weight * 0.0015);
    const bead = ctx.createRadialGradient(
      anchor.x - beadRadius * 0.35,
      anchor.y - beadRadius * 0.4,
      0,
      anchor.x,
      anchor.y,
      beadRadius,
    );
    bead.addColorStop(0, "rgba(255, 255, 246, 0.96)");
    bead.addColorStop(0.42, "rgba(244, 213, 170, 0.76)");
    bead.addColorStop(1, "rgba(115, 72, 61, 0.18)");
    ctx.beginPath();
    ctx.arc(anchor.x, anchor.y, beadRadius, 0, TAU);
    ctx.fillStyle = bead;
    ctx.fill();
  }

  const activeIndex = Math.min(
    armAnchors.length - 1,
    Math.round(pageMotion.storyProgress * (armAnchors.length - 1)),
  );
  const activeAnchor = armAnchors[activeIndex];
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
    ctx.strokeStyle = `rgba(241, 205, 159, ${0.075 + pageMotion.interactionImpulse * 0.13})`;
    ctx.lineWidth = Math.max(0.55, minSide * 0.0008);
    ctx.setLineDash([minSide * 0.003, minSide * 0.01]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let dust = 0; dust < 28; dust += 1) {
    const seed = dust * 0.737 + 0.31;
    const x = w * (0.48 + (Math.sin(seed * 5.2) * 0.5 + 0.5) * 0.55);
    const y =
      (Math.cos(seed * 4.6) * 0.5 + 0.5) * h +
      Math.sin(t * 0.05 + seed * 7.3) * h * 0.006;
    const radius = minSide * (0.00065 + (dust % 3) * 0.00038);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fillStyle = `rgba(255, 220, 174, ${0.035 + (dust % 4) * 0.018})`;
    ctx.fill();
  }
  ctx.restore();

  // The ornament recedes before the left reading column.
  const clearSpace = ctx.createLinearGradient(0, 0, w * 0.63, 0);
  clearSpace.addColorStop(0, "rgba(5, 5, 10, 0.72)");
  clearSpace.addColorStop(0.72, "rgba(6, 6, 13, 0.3)");
  clearSpace.addColorStop(1, "rgba(6, 6, 13, 0)");
  ctx.fillStyle = clearSpace;
  ctx.fillRect(0, 0, w * 0.66, h);

  const vignette = ctx.createRadialGradient(
    cx,
    cy,
    minSide * 0.13,
    w * 0.68,
    h * 0.48,
    maxSide * 0.8,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(1, 1, 4, 0.55)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
};
