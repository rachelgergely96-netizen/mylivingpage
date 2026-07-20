import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "../shared/motion";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

interface WebGeometry {
  cx: number;
  cy: number;
  radius: number;
  rings: number;
  spokes: number;
  rotation: number;
  flatten: number;
  opacity: number;
  chapterWeight: number;
}

function webPoint(
  web: WebGeometry,
  spoke: number,
  ring: number,
): { x: number; y: number } {
  const angle = (spoke / web.spokes) * TAU + web.rotation;
  const ringProgress = ring / web.rings;
  const irregularity =
    1 +
    Math.sin(spoke * 1.61 + ring * 0.93 + web.rotation * 3.2) * 0.027 +
    Math.cos(spoke * 0.67 - ring * 1.34) * 0.018;
  const radius = web.radius * ringProgress * irregularity;

  return {
    x: web.cx + Math.cos(angle) * radius,
    y: web.cy + Math.sin(angle) * radius * web.flatten,
  };
}

function drawWeb(
  ctx: CanvasRenderingContext2D,
  web: WebGeometry,
  minSide: number,
): void {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.shadowColor = `rgba(143, 195, 237, ${0.08 + web.chapterWeight * 0.08})`;
  ctx.shadowBlur = minSide * (0.006 + web.chapterWeight * 0.006);

  // Orbital silk rings.
  for (let ring = 1; ring <= web.rings; ring += 1) {
    ctx.beginPath();
    for (let spoke = 0; spoke <= web.spokes; spoke += 1) {
      const point = webPoint(web, spoke % web.spokes, ring);
      if (spoke === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }
    ctx.closePath();
    const ringWeight = ring / web.rings;
    ctx.strokeStyle = `rgba(190, 222, 248, ${web.opacity * (0.54 + ringWeight * 0.46)})`;
    ctx.lineWidth =
      Math.max(0.48, minSide * 0.00075) + web.chapterWeight * minSide * 0.00045;
    ctx.stroke();
  }

  // Structural spokes. Each spoke remains one uninterrupted path; droplets
  // are painted in a separate pass below so beginPath never discards it.
  for (let spoke = 0; spoke < web.spokes; spoke += 1) {
    ctx.beginPath();
    ctx.moveTo(web.cx, web.cy);
    for (let ring = 1; ring <= web.rings; ring += 1) {
      const point = webPoint(web, spoke, ring);
      ctx.lineTo(point.x, point.y);
    }
    ctx.strokeStyle = `rgba(176, 214, 245, ${web.opacity * 0.66})`;
    ctx.lineWidth = Math.max(0.42, minSide * 0.00062);
    ctx.stroke();
  }
  ctx.restore();

  // Refractive dew sits above the silk as the foreground material plane.
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let spoke = 0; spoke < web.spokes; spoke += 1) {
    for (let ring = 1; ring <= web.rings; ring += 1) {
      if ((spoke * 2 + ring * 3) % 5 > 1) continue;
      const point = webPoint(web, spoke, ring);
      const depth = ring / web.rings;
      const radius =
        minSide * (0.0016 + depth * 0.0017 + web.chapterWeight * 0.0007);
      const droplet = ctx.createRadialGradient(
        point.x - radius * 0.35,
        point.y - radius * 0.42,
        0,
        point.x,
        point.y,
        radius * 1.8,
      );
      droplet.addColorStop(0, "rgba(255, 255, 255, 0.9)");
      droplet.addColorStop(0.27, "rgba(205, 238, 255, 0.48)");
      droplet.addColorStop(0.66, "rgba(116, 172, 219, 0.12)");
      droplet.addColorStop(1, "rgba(92, 151, 202, 0)");
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius * 1.8, 0, TAU);
      ctx.fillStyle = droplet;
      ctx.globalAlpha = web.opacity * (0.9 + web.chapterWeight * 0.35);
      ctx.fill();
    }
  }

  const centerRadius = minSide * (0.003 + web.chapterWeight * 0.002);
  const centerGlow = ctx.createRadialGradient(
    web.cx,
    web.cy,
    0,
    web.cx,
    web.cy,
    centerRadius * 6,
  );
  centerGlow.addColorStop(0, "rgba(244, 252, 255, 0.8)");
  centerGlow.addColorStop(0.2, "rgba(183, 225, 255, 0.3)");
  centerGlow.addColorStop(1, "rgba(122, 190, 239, 0)");
  ctx.fillStyle = centerGlow;
  ctx.globalAlpha = 1;
  ctx.fillRect(
    web.cx - centerRadius * 6,
    web.cy - centerRadius * 6,
    centerRadius * 12,
    centerRadius * 12,
  );
  ctx.restore();
}

/** Dew-strung silk structures shimmer at the edge of a moonlit stage. */
export const renderGossamer: ThemeRenderer = (
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

  ctx.save();

  const background = ctx.createLinearGradient(0, 0, w, h);
  background.addColorStop(0, "#0B1119");
  background.addColorStop(0.5, "#08101A");
  background.addColorStop(1, "#02050A");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  // Far plane: offset lunar glow, blue-black mist, and suspended moisture.
  const moonX = w * (0.83 + (mx - 0.5) * 0.018);
  const moonY = h * (0.2 + (my - 0.5) * 0.014);
  const moonRadius = minSide * 0.052;
  const moonGlow = ctx.createRadialGradient(
    moonX,
    moonY,
    moonRadius * 0.4,
    moonX,
    moonY,
    moonRadius * 7,
  );
  moonGlow.addColorStop(0, "rgba(224, 243, 255, 0.3)");
  moonGlow.addColorStop(0.2, "rgba(151, 204, 242, 0.14)");
  moonGlow.addColorStop(1, "rgba(45, 83, 121, 0)");
  ctx.fillStyle = moonGlow;
  ctx.fillRect(
    moonX - moonRadius * 7,
    moonY - moonRadius * 7,
    moonRadius * 14,
    moonRadius * 14,
  );

  ctx.beginPath();
  ctx.arc(moonX, moonY, moonRadius, 0, TAU);
  const moon = ctx.createRadialGradient(
    moonX - moonRadius * 0.3,
    moonY - moonRadius * 0.35,
    0,
    moonX,
    moonY,
    moonRadius,
  );
  moon.addColorStop(0, "rgba(250, 254, 255, 0.88)");
  moon.addColorStop(0.62, "rgba(191, 220, 242, 0.64)");
  moon.addColorStop(1, "rgba(95, 139, 179, 0.2)");
  ctx.fillStyle = moon;
  ctx.fill();

  ctx.save();
  for (let veil = 0; veil < 3; veil += 1) {
    const y = h * (0.29 + veil * 0.23) + Math.sin(t * 0.045 + veil) * h * 0.008;
    const mist = ctx.createLinearGradient(w * 0.4, y, w, y + h * 0.08);
    mist.addColorStop(0, "rgba(99, 142, 177, 0)");
    mist.addColorStop(0.58, `rgba(99, 142, 177, ${0.022 + veil * 0.009})`);
    mist.addColorStop(1, "rgba(99, 142, 177, 0)");
    ctx.beginPath();
    ctx.moveTo(w * 0.38, y);
    ctx.bezierCurveTo(
      w * 0.61,
      y - h * 0.045,
      w * 0.8,
      y + h * 0.05,
      w + 20,
      y - h * 0.018,
    );
    ctx.lineTo(w + 20, y + h * 0.08);
    ctx.bezierCurveTo(
      w * 0.78,
      y + h * 0.11,
      w * 0.62,
      y + h * 0.02,
      w * 0.38,
      y + h * 0.07,
    );
    ctx.closePath();
    ctx.fillStyle = mist;
    ctx.fill();
  }
  ctx.restore();

  const webSeeds = [
    { x: 0.77, y: 0.39, radius: 0.245, rings: 5, spokes: 12 },
    { x: 0.99, y: 0.76, radius: 0.2, rings: 4, spokes: 10 },
    { x: 0.64, y: 0.87, radius: 0.115, rings: 4, spokes: 9 },
  ] as const;

  // Middle and foreground planes: layered web systems plus refractive dew.
  const webCenters: Array<{ x: number; y: number }> = [];
  webSeeds.forEach((seed, index) => {
    const chapterWeight = storyStepWeight(
      pageMotion.storyProgress,
      index,
      webSeeds.length,
    );
    const depth = index / (webSeeds.length - 1);
    const web: WebGeometry = {
      cx: w * seed.x + (mx - 0.5) * minSide * (0.018 + depth * 0.012),
      cy:
        h * seed.y +
        (my - 0.5) * minSide * (0.014 + depth * 0.01) +
        velocity * minSide * 0.012,
      radius: minSide * seed.radius * (1 + chapterWeight * 0.035),
      rings: seed.rings,
      spokes: seed.spokes,
      rotation:
        index * 0.42 +
        Math.sin(t * (0.052 + index * 0.007) + index) * 0.045 +
        velocity * 0.035,
      flatten: 0.78 + depth * 0.08,
      opacity: 0.115 + depth * 0.012 + chapterWeight * 0.08,
      chapterWeight,
    };
    webCenters.push({ x: web.cx, y: web.cy });
    drawWeb(ctx, web, minSide);
  });

  // Fine floating beads establish a near-camera plane without visual noise.
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let bead = 0; bead < 24; bead += 1) {
    const seed = bead * 0.783 + 0.41;
    const x = w * (0.49 + (Math.sin(seed * 5.7) * 0.5 + 0.5) * 0.56);
    const y =
      (Math.cos(seed * 4.9) * 0.5 + 0.5) * h +
      Math.sin(t * 0.065 + seed * 8.1) * h * 0.006;
    const radius = minSide * (0.0009 + (bead % 4) * 0.00038);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fillStyle = `rgba(213, 241, 255, ${0.045 + (bead % 3) * 0.025})`;
    ctx.fill();
  }
  ctx.restore();

  const activeIndex = Math.min(
    webCenters.length - 1,
    Math.round(pageMotion.storyProgress * (webCenters.length - 1)),
  );
  const activeCenter = webCenters[activeIndex];
  if (pageMotion.hasFocus && activeCenter) {
    const focusX = pageMotion.focusX * w;
    const focusY = pageMotion.focusY * h;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(activeCenter.x, activeCenter.y);
    ctx.quadraticCurveTo(w * 0.72, focusY, focusX, focusY);
    ctx.setLineDash([minSide * 0.002, minSide * 0.009]);
    ctx.strokeStyle = `rgba(192, 229, 252, ${0.08 + pageMotion.interactionImpulse * 0.12})`;
    ctx.lineWidth = Math.max(0.55, minSide * 0.0008);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Protect the editorial content lane and softly close the frame edges.
  const clearSpace = ctx.createLinearGradient(0, 0, w * 0.61, 0);
  clearSpace.addColorStop(0, "rgba(2, 5, 9, 0.72)");
  clearSpace.addColorStop(0.74, "rgba(3, 7, 12, 0.3)");
  clearSpace.addColorStop(1, "rgba(3, 7, 12, 0)");
  ctx.fillStyle = clearSpace;
  ctx.fillRect(0, 0, w * 0.64, h);

  const vignette = ctx.createRadialGradient(
    w * 0.79,
    h * 0.43,
    minSide * 0.18,
    w * 0.67,
    h * 0.48,
    maxSide * 0.8,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 1, 4, 0.5)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
};
