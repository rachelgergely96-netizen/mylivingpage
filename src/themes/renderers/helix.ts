import { finiteClamp, resolveThemeMotion } from "../shared/motion";
import { createSeededRandom } from "../shared/random";
import { softGlow } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

interface HelixBead {
  progress: number;
  speed: number;
  orbit: number;
  orbitSpeed: number;
  strand: -1 | 1;
  size: number;
}

interface HelixNode {
  y: number;
  phase: number;
  xA: number;
  xB: number;
  depthA: number;
  depthB: number;
  widthA: number;
  widthB: number;
}

const BEADS: HelixBead[] = (() => {
  const random = createSeededRandom(20240717);
  return Array.from({ length: 3 }, (_, index) => ({
    progress: random(),
    speed: 0.017 + random() * 0.011,
    orbit: random() * TAU,
    orbitSpeed: 0.12 + random() * 0.1,
    strand: index % 2 === 0 ? 1 : -1,
    size: 2.8 + random() * 1.8,
  }));
})();

export const renderHelix: ThemeRenderer = (
  ctx,
  w,
  h,
  t,
  mx,
  my,
  _deltaSeconds,
  motion,
) => {
  if (!(w > 0) || !(h > 0)) return;

  const M = resolveThemeMotion(motion);
  const effectiveTime = motion?.reducedMotion ? 0 : t;
  const pointerX = finiteClamp(mx, 0, 1, 0.5) - 0.5;
  const portrait = h > w * 1.05;
  const centerX =
    w * (portrait ? 0.82 : 0.78) + pointerX * w * 0.012;
  const amplitude = Math.min(
    w * (portrait ? 0.13 : 0.125),
    centerX - w * 0.62,
  );
  const minSide = Math.min(w, h);
  const ribbonWidth = Math.max(2.8, w * 0.0046);
  const pitch = 0.026;
  const storyPhase =
    (M.sectionCount > 0 ? M.storyProgress - 0.5 : 0) * 0.45;
  const velocityPhase = finiteClamp(M.scrollVelocity / 4, -1, 1) * 0.07;
  const phaseOffset =
    -effectiveTime * 0.13 + storyPhase + velocityPhase;

  ctx.save();

  const atmosphere = ctx.createLinearGradient(0, 0, w, h);
  atmosphere.addColorStop(0, "rgba(3, 8, 16, 0.58)");
  atmosphere.addColorStop(0.58, "rgba(7, 23, 34, 0.2)");
  atmosphere.addColorStop(1, "rgba(2, 7, 14, 0.64)");
  ctx.fillStyle = atmosphere;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const hazePositions: Array<[number, number, number, string]> = [
    [0.73, 0.2, 0.25, "rgba(52, 126, 154, 0.07)"],
    [0.86, 0.5, 0.31, "rgba(57, 151, 164, 0.08)"],
    [0.72, 0.82, 0.24, "rgba(54, 111, 164, 0.06)"],
  ];
  hazePositions.forEach(([x, y, radius, color], index) => {
    const driftX =
      motion?.reducedMotion
        ? 0
        : Math.sin(effectiveTime * (0.035 + index * 0.009) + index) *
          minSide *
          0.012;
    const driftY =
      motion?.reducedMotion
        ? 0
        : Math.cos(effectiveTime * (0.03 + index * 0.007) + index * 1.7) *
          minSide *
          0.01;
    softGlow(
      ctx,
      w * x + driftX,
      h * y + driftY,
      minSide * radius,
      color,
      "transparent",
    );
  });
  ctx.restore();

  const nodes: HelixNode[] = [];
  for (let y = -24; y <= h + 24; y += 11) {
    const phase = y * pitch + phaseOffset;
    const wave = Math.sin(phase);
    const depth = Math.cos(phase);
    const depthA = 0.5 + 0.5 * depth;
    const depthB = 1 - depthA;
    nodes.push({
      y,
      phase,
      xA: centerX + wave * amplitude,
      xB: centerX - wave * amplitude,
      depthA,
      depthB,
      widthA: ribbonWidth * (0.38 + depthA * 0.88),
      widthB: ribbonWidth * (0.38 + depthB * 0.88),
    });
  }

  for (let index = 0; index < nodes.length; index += 2) {
    const node = nodes[index];
    const front = Math.max(node.depthA, node.depthB);
    const rungAlpha = 0.035 + front * 0.14;
    ctx.strokeStyle = `rgba(137, 214, 231, ${rungAlpha})`;
    ctx.lineWidth = 0.7 + front * 0.7;
    ctx.beginPath();
    ctx.moveTo(node.xA, node.y);
    ctx.lineTo(node.xB, node.y);
    ctx.stroke();
  }

  const drawRibbon = (
    xKey: "xA" | "xB",
    widthKey: "widthA" | "widthB",
    depthKey: "depthA" | "depthB",
    colors: readonly [string, string, string],
  ) => {
    ctx.beginPath();
    nodes.forEach((node, index) => {
      const x = node[xKey] - node[widthKey];
      if (index === 0) ctx.moveTo(x, node.y);
      else ctx.lineTo(x, node.y);
    });
    for (let index = nodes.length - 1; index >= 0; index -= 1) {
      const node = nodes[index];
      ctx.lineTo(node[xKey] + node[widthKey], node.y);
    }
    ctx.closePath();
    const metal = ctx.createLinearGradient(0, 0, 0, h);
    metal.addColorStop(0, colors[0]);
    metal.addColorStop(0.5, colors[1]);
    metal.addColorStop(1, colors[2]);
    ctx.fillStyle = metal;
    ctx.fill();
    ctx.strokeStyle = "rgba(180, 226, 240, 0.12)";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.lineCap = "round";
    for (let index = 0; index < nodes.length - 1; index += 1) {
      const node = nodes[index];
      const next = nodes[index + 1];
      const depth = node[depthKey];
      if (depth < 0.18) continue;
      const sheen =
        0.06 +
        depth * 0.13 +
        0.035 *
          Math.max(
            0,
            Math.sin(effectiveTime * 0.25 - node.y * 0.012),
          );
      ctx.strokeStyle = `rgba(216, 239, 248, ${sheen})`;
      ctx.lineWidth = Math.max(0.8, node[widthKey] * 0.42);
      ctx.beginPath();
      ctx.moveTo(node[xKey], node.y);
      ctx.lineTo(next[xKey], next.y);
      ctx.stroke();
    }
    ctx.restore();
  };

  drawRibbon(
    "xB",
    "widthB",
    "depthB",
    [
      "rgba(125, 185, 218, 0.42)",
      "rgba(78, 139, 184, 0.54)",
      "rgba(31, 70, 116, 0.44)",
    ],
  );
  drawRibbon(
    "xA",
    "widthA",
    "depthA",
    [
      "rgba(196, 225, 239, 0.46)",
      "rgba(126, 184, 211, 0.58)",
      "rgba(45, 91, 125, 0.48)",
    ],
  );

  if (!motion?.reducedMotion) {
    BEADS.forEach((bead) => {
      const progress =
        (bead.progress + effectiveTime * bead.speed) % 1;
      const y = -20 + progress * (h + 40);
      const phase = y * pitch + phaseOffset;
      const strandX =
        centerX + bead.strand * Math.sin(phase) * amplitude;
      const depth =
        0.5 + 0.5 * bead.strand * Math.cos(phase);
      const orbit = effectiveTime * bead.orbitSpeed + bead.orbit;
      const x = strandX + Math.cos(orbit) * (8 + depth * 7);
      const beadY = y + Math.sin(orbit) * 5;
      const size = bead.size * (0.72 + depth * 0.42);

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      softGlow(
        ctx,
        x,
        beadY,
        size * 4.5,
        `rgba(112, 213, 229, ${0.07 + depth * 0.09})`,
        "transparent",
      );
      ctx.fillStyle = `rgba(205, 236, 246, ${0.28 + depth * 0.2})`;
      ctx.beginPath();
      ctx.arc(x, beadY, size, 0, TAU);
      ctx.fill();
      ctx.restore();
    });
  }

  const hasStory = M.sectionCount > 0;
  if (hasStory || M.hasFocus) {
    const storyY = h * (0.16 + M.storyProgress * 0.68);
    const targetY = M.hasFocus
      ? storyY * 0.45 + finiteClamp(M.focusY, 0, 1, 0.5) * h * 0.55
      : storyY;
    const signalPhase = targetY * pitch + phaseOffset;
    const frontStrand = Math.cos(signalPhase) >= 0 ? 1 : -1;
    const signalX =
      centerX + frontStrand * Math.sin(signalPhase) * amplitude;
    const trailLength =
      motion?.reducedMotion
        ? 0
        : Math.abs(finiteClamp(M.scrollVelocity, -4, 4)) * 3.5;
    const signalRadius = minSide * (M.hasFocus ? 0.052 : 0.038);

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    softGlow(
      ctx,
      signalX,
      targetY,
      signalRadius,
      `rgba(151, 231, 242, ${0.12 + M.interactionImpulse * 0.06})`,
      "transparent",
    );
    ctx.strokeStyle = "rgba(213, 241, 248, 0.52)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(signalX, targetY - trailLength);
    ctx.lineTo(signalX, targetY + trailLength);
    ctx.stroke();
    ctx.fillStyle = "rgba(218, 244, 250, 0.7)";
    ctx.beginPath();
    ctx.arc(signalX, targetY, 2.4, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  const readingLane = ctx.createLinearGradient(0, 0, w * 0.7, 0);
  readingLane.addColorStop(0, "rgba(3, 8, 16, 0.9)");
  readingLane.addColorStop(0.62, "rgba(3, 8, 16, 0.58)");
  readingLane.addColorStop(1, "rgba(3, 8, 16, 0)");
  ctx.fillStyle = readingLane;
  ctx.fillRect(0, 0, w * 0.72, h);

  const vignette = ctx.createRadialGradient(
    centerX,
    h * 0.48,
    minSide * 0.2,
    w * 0.58,
    h * 0.5,
    Math.max(w, h) * 0.8,
  );
  vignette.addColorStop(0, "rgba(2, 4, 10, 0)");
  vignette.addColorStop(1, "rgba(1, 3, 8, 0.58)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
};
