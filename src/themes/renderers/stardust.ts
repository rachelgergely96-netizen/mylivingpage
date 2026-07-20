import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "../shared/motion";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;
const ARM_COUNT = 4;
const ARM_SAMPLES = 44;

interface SpiralPoint {
  x: number;
  y: number;
}

function getSpiralPoint(
  centerX: number,
  centerY: number,
  minSide: number,
  armIndex: number,
  progress: number,
  turn: number,
  radialOffset = 0,
): SpiralPoint {
  const radius =
    minSide * (0.028 + progress * 0.41) + radialOffset;
  const angle =
    armIndex * (TAU / ARM_COUNT) +
    progress * TAU * 1.34 +
    turn;
  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius * 0.7,
  };
}

function traceSpiralBand(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  minSide: number,
  armIndex: number,
  turn: number,
): void {
  ctx.beginPath();
  for (let sample = 0; sample <= ARM_SAMPLES; sample += 1) {
    const progress = sample / ARM_SAMPLES;
    const width = minSide * (0.011 + progress * 0.033);
    const point = getSpiralPoint(
      centerX,
      centerY,
      minSide,
      armIndex,
      progress,
      turn,
      width,
    );
    if (sample === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  }

  for (let sample = ARM_SAMPLES; sample >= 0; sample -= 1) {
    const progress = sample / ARM_SAMPLES;
    const width = minSide * (0.009 + progress * 0.025);
    const point = getSpiralPoint(
      centerX,
      centerY,
      minSide,
      armIndex,
      progress,
      turn,
      -width,
    );
    ctx.lineTo(point.x, point.y);
  }
  ctx.closePath();
}

function traceDustLane(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  minSide: number,
  armIndex: number,
  turn: number,
): void {
  ctx.beginPath();
  for (let sample = 2; sample <= ARM_SAMPLES; sample += 1) {
    const progress = sample / ARM_SAMPLES;
    const point = getSpiralPoint(
      centerX,
      centerY,
      minSide,
      armIndex,
      progress,
      turn + 0.07,
      minSide * (0.004 + progress * 0.012),
    );
    if (sample === 2) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  }
}

/** A right-biased spiral galaxy with painted nebula volume and a story orbit. */
export const renderStardust: ThemeRenderer = (
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
  const pointerX = finiteClamp(mx, 0, 1, 0.5) - 0.5;
  const pointerY = finiteClamp(my, 0, 1, 0.5) - 0.5;
  const velocity = finiteClamp(pageMotion.scrollVelocity / 4, -1, 1);
  const minSide = Math.min(w, h);
  const maxSide = Math.max(w, h);
  const focusPull = pageMotion.hasFocus ? 0.018 : 0;
  const centerX =
    w * 0.79 +
    pointerX * minSide * 0.025 +
    (pageMotion.focusX - 0.5) * minSide * focusPull;
  const centerY =
    h * 0.43 +
    pointerY * minSide * 0.02 +
    (pageMotion.focusY - 0.5) * minSide * focusPull;
  const turn =
    t * 0.014 + pageMotion.storyProgress * 0.15 + velocity * 0.014;

  ctx.save();
  try {
    // Far plane: layered indigo space, brighter toward the galaxy while the
    // left remains calm enough for long-form copy.
    const space = ctx.createLinearGradient(0, 0, w, h);
    space.addColorStop(0, "#03040C");
    space.addColorStop(0.46, "#07091A");
    space.addColorStop(0.76, "#171036");
    space.addColorStop(1, "#070817");
    ctx.fillStyle = space;
    ctx.fillRect(0, 0, w, h);

    const violetCloud = ctx.createRadialGradient(
      centerX - minSide * 0.08,
      centerY + minSide * 0.02,
      minSide * 0.03,
      centerX,
      centerY,
      minSide * 0.55,
    );
    violetCloud.addColorStop(0, "rgba(179, 129, 255, 0.26)");
    violetCloud.addColorStop(0.3, "rgba(102, 71, 202, 0.17)");
    violetCloud.addColorStop(0.67, "rgba(54, 34, 111, 0.075)");
    violetCloud.addColorStop(1, "rgba(8, 7, 27, 0)");
    ctx.fillStyle = violetCloud;
    ctx.fillRect(w * 0.34, 0, w * 0.66, h);

    const cyanCloud = ctx.createRadialGradient(
      centerX + minSide * 0.11,
      centerY - minSide * 0.12,
      0,
      centerX + minSide * 0.06,
      centerY - minSide * 0.03,
      minSide * 0.39,
    );
    cyanCloud.addColorStop(0, "rgba(126, 218, 255, 0.2)");
    cyanCloud.addColorStop(0.36, "rgba(84, 130, 220, 0.095)");
    cyanCloud.addColorStop(1, "rgba(44, 61, 141, 0)");
    ctx.fillStyle = cyanCloud;
    ctx.fillRect(w * 0.47, 0, w * 0.53, h * 0.86);

    const roseCloud = ctx.createRadialGradient(
      centerX - minSide * 0.04,
      centerY + minSide * 0.18,
      0,
      centerX,
      centerY + minSide * 0.1,
      minSide * 0.34,
    );
    roseCloud.addColorStop(0, "rgba(247, 119, 187, 0.16)");
    roseCloud.addColorStop(0.42, "rgba(165, 66, 151, 0.075)");
    roseCloud.addColorStop(1, "rgba(92, 38, 109, 0)");
    ctx.fillStyle = roseCloud;
    ctx.fillRect(w * 0.42, h * 0.22, w * 0.58, h * 0.78);

    // Distant star plane: deterministic, bounded, and intentionally quieter on
    // the reading side than around the galactic focal point.
    for (let star = 0; star < 68; star += 1) {
      const seed = star * 0.731 + 0.17;
      const x = (Math.sin(seed * 6.7) * 0.5 + 0.5) * w;
      const y = (Math.cos(seed * 4.3) * 0.5 + 0.5) * h;
      const depth = 0.3 + (star % 5) * 0.14;
      const rightWeight = 0.38 + 0.62 * finiteClamp(x / Math.max(w, 1), 0, 1);
      const twinkle = 0.5 + 0.5 * Math.sin(t * (0.22 + depth * 0.18) + seed * 9);
      const radius = minSide * (0.00045 + depth * 0.0007);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, TAU);
      ctx.fillStyle = `rgba(214, 225, 255, ${(0.08 + twinkle * 0.18) * rightWeight})`;
      ctx.fill();
    }

    // Middle plane: four filled spiral arms create clear volume at t=0. Each
    // chapter brightens one arm without changing the overall composition.
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let arm = 0; arm < ARM_COUNT; arm += 1) {
      const chapterWeight = storyStepWeight(
        pageMotion.storyProgress,
        arm,
        ARM_COUNT,
      );
      traceSpiralBand(ctx, centerX, centerY, minSide, arm, turn);
      const armLight = ctx.createRadialGradient(
        centerX,
        centerY,
        minSide * 0.025,
        centerX,
        centerY,
        minSide * 0.46,
      );
      const palette = arm % 2 === 0;
      armLight.addColorStop(
        0,
        palette
          ? "rgba(241, 236, 255, 0.86)"
          : "rgba(210, 239, 255, 0.8)",
      );
      armLight.addColorStop(
        0.3,
        palette
          ? `rgba(177, 137, 255, ${0.34 + chapterWeight * 0.18})`
          : `rgba(107, 193, 255, ${0.3 + chapterWeight * 0.16})`,
      );
      armLight.addColorStop(
        0.72,
        palette ? "rgba(214, 91, 183, 0.17)" : "rgba(96, 104, 224, 0.15)",
      );
      armLight.addColorStop(1, "rgba(74, 45, 151, 0)");
      ctx.fillStyle = armLight;
      ctx.globalAlpha = 0.68 + chapterWeight * 0.22;
      ctx.globalCompositeOperation = "screen";
      ctx.fill();

      traceDustLane(ctx, centerX, centerY, minSide, arm, turn);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "rgba(4, 5, 20, 0.46)";
      ctx.lineWidth = minSide * 0.012;
      ctx.lineCap = "round";
      ctx.stroke();
    }
    ctx.restore();

    // Star-forming knots sit along the arms as a nearer, sharper plane.
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let particle = 0; particle < 96; particle += 1) {
      const seed = particle * 0.619 + 0.23;
      const arm = particle % ARM_COUNT;
      const progress =
        0.07 + ((Math.sin(seed * 5.9) * 0.5 + 0.5) * 0.91);
      const spread =
        Math.sin(seed * 8.1) * minSide * (0.004 + progress * 0.018);
      const point = getSpiralPoint(
        centerX,
        centerY,
        minSide,
        arm,
        progress,
        turn,
        spread,
      );
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.5 + seed * 13);
      const radius = minSide * (0.00065 + (particle % 4) * 0.00032);
      const warm = particle % 5 === 0;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius * (1 + pulse * 0.25), 0, TAU);
      ctx.fillStyle = warm
        ? `rgba(255, 215, 234, ${0.28 + pulse * 0.38})`
        : `rgba(211, 223, 255, ${0.2 + pulse * 0.35})`;
      ctx.fill();

      if (particle % 12 === 0) {
        const haloRadius = radius * 9;
        const halo = ctx.createRadialGradient(
          point.x,
          point.y,
          0,
          point.x,
          point.y,
          haloRadius,
        );
        halo.addColorStop(0, "rgba(239, 226, 255, 0.28)");
        halo.addColorStop(1, "rgba(145, 111, 255, 0)");
        ctx.fillStyle = halo;
        ctx.fillRect(
          point.x - haloRadius,
          point.y - haloRadius,
          haloRadius * 2,
          haloRadius * 2,
        );
      }
    }
    ctx.restore();

    // Foreground plane: a bright core, lens ellipse, and an ordered six-node
    // orbit tie the galaxy to the Living Page's current story position.
    const coreRadius = minSide * 0.068;
    const coreGlow = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      coreRadius * 3.8,
    );
    coreGlow.addColorStop(0, "rgba(255, 255, 246, 0.95)");
    coreGlow.addColorStop(0.12, "rgba(224, 218, 255, 0.78)");
    coreGlow.addColorStop(0.38, "rgba(151, 111, 245, 0.31)");
    coreGlow.addColorStop(1, "rgba(91, 57, 190, 0)");
    ctx.fillStyle = coreGlow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreRadius * 3.8, 0, TAU);
    ctx.fill();

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-0.22 + velocity * 0.02);
    ctx.scale(1, 0.26);
    ctx.beginPath();
    ctx.arc(0, 0, minSide * 0.23, 0, TAU);
    ctx.strokeStyle = "rgba(215, 205, 255, 0.28)";
    ctx.lineWidth = Math.max(1, minSide * 0.0023);
    ctx.stroke();
    ctx.restore();

    const nodeCount = 6;
    let previousNode: SpiralPoint | null = null;
    let activeNode: SpiralPoint | null = null;
    for (let node = 0; node < nodeCount; node += 1) {
      const weight = storyStepWeight(
        pageMotion.storyProgress,
        node,
        nodeCount,
      );
      const angle = -1.15 + node * 0.39;
      const nodePoint = {
        x: centerX + Math.cos(angle) * minSide * 0.31,
        y: centerY + Math.sin(angle) * minSide * 0.15,
      };
      if (previousNode) {
        ctx.beginPath();
        ctx.moveTo(previousNode.x, previousNode.y);
        ctx.lineTo(nodePoint.x, nodePoint.y);
        ctx.strokeStyle = "rgba(195, 184, 255, 0.15)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      const nodeRadius = minSide * (0.0021 + weight * 0.0036);
      ctx.beginPath();
      ctx.arc(nodePoint.x, nodePoint.y, nodeRadius, 0, TAU);
      ctx.fillStyle = `rgba(236, 232, 255, ${0.3 + weight * 0.65})`;
      ctx.fill();
      if (weight > 0.5) activeNode = nodePoint;
      previousNode = nodePoint;
    }

    if (pageMotion.hasFocus && activeNode) {
      const focusX = pageMotion.focusX * w;
      const focusY = pageMotion.focusY * h;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(activeNode.x, activeNode.y);
      ctx.bezierCurveTo(w * 0.68, activeNode.y, w * 0.65, focusY, focusX, focusY);
      ctx.setLineDash([minSide * 0.004, minSide * 0.011]);
      ctx.strokeStyle = `rgba(198, 188, 255, ${0.13 + pageMotion.interactionImpulse * 0.2})`;
      ctx.lineWidth = Math.max(0.8, minSide * 0.0011);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    const clearSpace = ctx.createLinearGradient(0, 0, w * 0.65, 0);
    clearSpace.addColorStop(0, "rgba(2, 3, 10, 0.92)");
    clearSpace.addColorStop(0.6, "rgba(3, 4, 13, 0.62)");
    clearSpace.addColorStop(1, "rgba(3, 4, 13, 0)");
    ctx.fillStyle = clearSpace;
    ctx.fillRect(0, 0, w * 0.67, h);

    const vignette = ctx.createRadialGradient(
      centerX,
      centerY,
      minSide * 0.14,
      w * 0.62,
      h * 0.48,
      maxSide * 0.83,
    );
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.46)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  } finally {
    ctx.restore();
  }
};
