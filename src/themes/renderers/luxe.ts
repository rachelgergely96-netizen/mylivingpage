import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "../shared/motion";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;
const FACET_COUNT = 10;

function traceFanFacet(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
): void {
  ctx.beginPath();
  ctx.arc(originX, originY, innerRadius, startAngle, endAngle);
  ctx.arc(originX, originY, outerRadius, endAngle, startAngle, true);
  ctx.closePath();
}

/** A cut-brass Art Deco aperture staged against black lacquer. */
export const renderLuxe: ThemeRenderer = (
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
  const focusPull = pageMotion.hasFocus ? 0.025 : 0;
  const apertureX =
    w * 0.805 +
    pointerX * minSide * 0.026 +
    (pageMotion.focusX - 0.5) * minSide * focusPull;
  const apertureY =
    h * 0.42 +
    pointerY * minSide * 0.02 +
    (pageMotion.focusY - 0.5) * minSide * focusPull;
  const innerRadius = minSide * 0.082;
  const outerRadius = minSide * 0.33;
  const slowTurn = t * 0.018 + pageMotion.storyProgress * 0.11 + velocity * 0.018;

  ctx.save();
  try {
    // Far plane: deep lacquer with a restrained pool of warm reflected light.
    const lacquer = ctx.createLinearGradient(0, 0, w, h);
    lacquer.addColorStop(0, "#080707");
    lacquer.addColorStop(0.48, "#0D0908");
    lacquer.addColorStop(0.76, "#171008");
    lacquer.addColorStop(1, "#050403");
    ctx.fillStyle = lacquer;
    ctx.fillRect(0, 0, w, h);

    const roomLight = ctx.createRadialGradient(
      apertureX,
      apertureY,
      innerRadius * 0.35,
      apertureX,
      apertureY,
      maxSide * 0.57,
    );
    roomLight.addColorStop(0, "rgba(255, 225, 156, 0.25)");
    roomLight.addColorStop(0.25, "rgba(213, 154, 65, 0.14)");
    roomLight.addColorStop(0.58, "rgba(107, 61, 24, 0.055)");
    roomLight.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = roomLight;
    ctx.fillRect(w * 0.34, 0, w * 0.66, h);

    // Architectural depth lines make the piece feel installed in a room rather
    // than floating on a flat background.
    ctx.save();
    ctx.strokeStyle = "rgba(222, 177, 91, 0.12)";
    ctx.lineWidth = Math.max(0.75, minSide * 0.0011);
    for (let frame = 0; frame < 4; frame += 1) {
      const inset = minSide * (0.026 + frame * 0.035);
      const left = w * (0.57 + frame * 0.025);
      const top = inset;
      const right = w - inset;
      const bottom = h - inset;
      ctx.globalAlpha = 0.85 - frame * 0.14;
      ctx.beginPath();
      ctx.moveTo(left, top);
      ctx.lineTo(right, top);
      ctx.lineTo(right, bottom);
      ctx.lineTo(left, bottom);
      ctx.stroke();
    }
    ctx.restore();

    // Middle plane: ten individually shaded brass facets. Their fixed-frame
    // value range is deliberately legible; motion only shifts the reflections.
    for (let facet = 0; facet < FACET_COUNT; facet += 1) {
      const chapterWeight = storyStepWeight(
        pageMotion.storyProgress,
        facet,
        FACET_COUNT,
      );
      const angle = -Math.PI * 0.82 + facet * (TAU / FACET_COUNT) + slowTurn;
      const gap = 0.022;
      const startAngle = angle + gap;
      const endAngle = angle + TAU / FACET_COUNT - gap;
      const facetInner = innerRadius * (0.9 + (facet % 2) * 0.08);
      const facetOuter = outerRadius * (0.9 + (facet % 3) * 0.05);

      traceFanFacet(
        ctx,
        apertureX,
        apertureY,
        facetInner,
        facetOuter,
        startAngle,
        endAngle,
      );
      const edgeX = apertureX + Math.cos(angle + 0.24) * facetOuter;
      const edgeY = apertureY + Math.sin(angle + 0.24) * facetOuter;
      const brass = ctx.createLinearGradient(
        apertureX,
        apertureY,
        edgeX,
        edgeY,
      );
      const alternate = facet % 2 === 0;
      brass.addColorStop(
        0,
        alternate ? "rgba(89, 50, 19, 0.84)" : "rgba(44, 25, 12, 0.88)",
      );
      brass.addColorStop(
        0.38,
        alternate ? "rgba(229, 177, 79, 0.84)" : "rgba(145, 92, 31, 0.76)",
      );
      brass.addColorStop(
        0.72,
        alternate ? "rgba(255, 228, 155, 0.68)" : "rgba(200, 139, 54, 0.66)",
      );
      brass.addColorStop(1, "rgba(70, 39, 17, 0.2)");
      ctx.fillStyle = brass;
      ctx.globalAlpha = 0.7 + chapterWeight * 0.25;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(
        apertureX + Math.cos(startAngle) * facetInner,
        apertureY + Math.sin(startAngle) * facetInner,
      );
      ctx.lineTo(
        apertureX + Math.cos(startAngle) * facetOuter,
        apertureY + Math.sin(startAngle) * facetOuter,
      );
      ctx.strokeStyle = `rgba(255, 235, 184, ${0.18 + chapterWeight * 0.34})`;
      ctx.lineWidth = Math.max(0.8, minSide * (0.0012 + chapterWeight * 0.0012));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // A stepped onyx center and crisp rings give the fan an authored focal
    // hierarchy: ambient room, brass blades, polished jewel, sharp glint.
    const centerShadow = ctx.createRadialGradient(
      apertureX,
      apertureY,
      0,
      apertureX,
      apertureY,
      innerRadius * 1.42,
    );
    centerShadow.addColorStop(0, "#050403");
    centerShadow.addColorStop(0.58, "#120C08");
    centerShadow.addColorStop(0.78, "#D19B42");
    centerShadow.addColorStop(0.83, "#4D2C13");
    centerShadow.addColorStop(1, "rgba(20, 12, 7, 0)");
    ctx.fillStyle = centerShadow;
    ctx.beginPath();
    ctx.arc(apertureX, apertureY, innerRadius * 1.42, 0, TAU);
    ctx.fill();

    const onyx = ctx.createRadialGradient(
      apertureX - innerRadius * 0.27,
      apertureY - innerRadius * 0.32,
      0,
      apertureX,
      apertureY,
      innerRadius,
    );
    onyx.addColorStop(0, "#43301D");
    onyx.addColorStop(0.2, "#17110D");
    onyx.addColorStop(0.7, "#050505");
    onyx.addColorStop(1, "#1A1008");
    ctx.fillStyle = onyx;
    ctx.beginPath();
    ctx.arc(apertureX, apertureY, innerRadius * 0.94, 0, TAU);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(apertureX, apertureY, innerRadius * 0.68, -0.9, 1.25);
    ctx.strokeStyle = "rgba(255, 241, 202, 0.48)";
    ctx.lineWidth = Math.max(1, minSide * 0.0022);
    ctx.stroke();

    // Foreground plane: bounded filings catch the same moving light without a
    // noisy full-screen particle field.
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let mote = 0; mote < 32; mote += 1) {
      const seed = mote * 0.713 + 0.19;
      const depth = 0.35 + (mote % 5) * 0.13;
      const x =
        w * (0.46 + (Math.sin(seed * 7.1) * 0.5 + 0.5) * 0.56) +
        Math.sin(t * (0.03 + depth * 0.025) + seed * 8) * minSide * 0.012;
      const y =
        (Math.cos(seed * 4.9) * 0.5 + 0.5) * h +
        Math.cos(t * 0.045 + seed * 5) * minSide * 0.009;
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.42 + seed * 11);
      const radius = minSide * (0.0007 + depth * 0.0013);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, TAU);
      ctx.fillStyle = `rgba(255, 224, 157, ${0.1 + pulse * 0.18})`;
      ctx.fill();
    }
    ctx.restore();

    const activeFacet = Math.min(
      FACET_COUNT - 1,
      Math.round(pageMotion.storyProgress * (FACET_COUNT - 1)),
    );
    const activeAngle =
      -Math.PI * 0.82 +
      activeFacet * (TAU / FACET_COUNT) +
      slowTurn +
      TAU / FACET_COUNT / 2;
    const glintX = apertureX + Math.cos(activeAngle) * outerRadius * 0.74;
    const glintY = apertureY + Math.sin(activeAngle) * outerRadius * 0.74;
    const glintRadius = minSide * (0.035 + pageMotion.interactionImpulse * 0.02);
    const glint = ctx.createRadialGradient(
      glintX,
      glintY,
      0,
      glintX,
      glintY,
      glintRadius,
    );
    glint.addColorStop(0, "rgba(255, 255, 231, 0.82)");
    glint.addColorStop(0.12, "rgba(255, 224, 149, 0.42)");
    glint.addColorStop(1, "rgba(255, 195, 91, 0)");
    ctx.fillStyle = glint;
    ctx.fillRect(
      glintX - glintRadius,
      glintY - glintRadius,
      glintRadius * 2,
      glintRadius * 2,
    );

    if (pageMotion.hasFocus) {
      const focusX = pageMotion.focusX * w;
      const focusY = pageMotion.focusY * h;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(glintX, glintY);
      ctx.bezierCurveTo(w * 0.69, glintY, w * 0.66, focusY, focusX, focusY);
      ctx.setLineDash([minSide * 0.005, minSide * 0.012]);
      ctx.strokeStyle = `rgba(255, 222, 150, ${0.13 + pageMotion.interactionImpulse * 0.2})`;
      ctx.lineWidth = Math.max(0.8, minSide * 0.0011);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Preserve a high-contrast reading lane on the left.
    const clearSpace = ctx.createLinearGradient(0, 0, w * 0.64, 0);
    clearSpace.addColorStop(0, "rgba(4, 4, 4, 0.9)");
    clearSpace.addColorStop(0.62, "rgba(5, 4, 4, 0.58)");
    clearSpace.addColorStop(1, "rgba(5, 4, 4, 0)");
    ctx.fillStyle = clearSpace;
    ctx.fillRect(0, 0, w * 0.66, h);

    const vignette = ctx.createRadialGradient(
      apertureX,
      apertureY,
      minSide * 0.16,
      w * 0.62,
      h * 0.47,
      maxSide * 0.82,
    );
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.48)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  } finally {
    ctx.restore();
  }
};
