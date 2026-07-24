import { finiteClamp, resolveThemeMotion } from "../shared/motion";
import { softGlow } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

export const renderVector: ThemeRenderer = (
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
  const portrait = h > w * 1.05;
  const pointerScale = motion?.reducedMotion ? 0 : 1;
  const pointerX =
    (finiteClamp(mx, 0, 1, 0.5) - 0.5) * pointerScale;
  const pointerY =
    (finiteClamp(my, 0, 1, 0.5) - 0.5) * pointerScale;
  const centerX =
    w * (portrait ? 0.82 : 0.76) + pointerX * w * 0.008;
  const centerY = h * 0.43 + pointerY * h * 0.006;
  const minSide = Math.min(w, h);
  const radius = Math.max(
    66,
    Math.min(
      minSide * 0.23,
      w * (portrait ? 0.2 : 0.18),
      h * 0.28,
    ),
  );
  const hasStory = M.sectionCount > 0;
  const velocityNudge =
    motion?.reducedMotion
      ? 0
      : finiteClamp(M.scrollVelocity / 4, -1, 1) * 0.052;
  const bearingAngle = hasStory
    ? -Math.PI * 0.75 + M.storyProgress * Math.PI + velocityNudge
    : -Math.PI * 0.5;
  const scaleRotation =
    motion?.reducedMotion ? 0 : effectiveTime * 0.032;
  const sheenAngle =
    motion?.reducedMotion ? -Math.PI * 0.18 : effectiveTime * 0.25;

  ctx.save();

  const field = ctx.createLinearGradient(0, 0, w, h);
  field.addColorStop(0, "rgba(3, 8, 18, 0.82)");
  field.addColorStop(0.56, "rgba(7, 18, 38, 0.42)");
  field.addColorStop(1, "rgba(2, 6, 14, 0.78)");
  ctx.fillStyle = field;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  softGlow(
    ctx,
    centerX,
    centerY,
    radius * 2.1,
    "rgba(70, 117, 190, 0.09)",
    "transparent",
  );
  ctx.restore();

  const body = ctx.createRadialGradient(
    centerX - radius * 0.28,
    centerY - radius * 0.32,
    radius * 0.06,
    centerX,
    centerY,
    radius * 1.08,
  );
  body.addColorStop(0, "rgba(111, 158, 222, 0.17)");
  body.addColorStop(0.42, "rgba(28, 58, 104, 0.15)");
  body.addColorStop(0.76, "rgba(7, 18, 37, 0.6)");
  body.addColorStop(1, "rgba(2, 7, 17, 0.9)");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, TAU);
  ctx.fill();

  const rings = [
    { radius: 1, alpha: 0.32, width: 1.4 },
    { radius: 0.82, alpha: 0.2, width: 1 },
    { radius: 0.58, alpha: 0.13, width: 0.9 },
  ];
  rings.forEach((ring) => {
    ctx.strokeStyle = `rgba(165, 212, 255, ${ring.alpha})`;
    ctx.lineWidth = ring.width;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * ring.radius, 0, TAU);
    ctx.stroke();
  });

  const minorTickCount = 36;
  const activeTick = hasStory
    ? Math.round(M.storyProgress * 11)
    : -1;
  for (let index = 0; index < minorTickCount; index += 1) {
    const major = index % 3 === 0;
    const majorIndex = Math.floor(index / 3);
    const selected = major && majorIndex === activeTick;
    const angle = -Math.PI * 0.5 + (index / minorTickCount) * TAU + scaleRotation;
    const innerRadius =
      radius *
      (major
        ? selected
          ? 0.72
          : 0.76
        : 0.84);
    const outerRadius = radius * 0.92;
    const alpha =
      (major ? 0.26 : 0.12) +
      (selected ? 0.34 + M.interactionImpulse * 0.1 : 0);

    ctx.strokeStyle = `rgba(190, 224, 255, ${alpha})`;
    ctx.lineWidth = selected ? 1.8 : major ? 1.15 : 0.7;
    ctx.beginPath();
    ctx.moveTo(
      centerX + Math.cos(angle) * innerRadius,
      centerY + Math.sin(angle) * innerRadius,
    );
    ctx.lineTo(
      centerX + Math.cos(angle) * outerRadius,
      centerY + Math.sin(angle) * outerRadius,
    );
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(125, 167, 255, 0.2)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(
    centerX,
    centerY,
    radius * 0.68,
    -Math.PI * 0.78,
    Math.PI * 0.28,
  );
  ctx.stroke();

  const sheenCenter = sheenAngle % TAU;
  const sheen = ctx.createConicGradient(
    sheenCenter,
    centerX,
    centerY,
  );
  sheen.addColorStop(0, "rgba(143, 190, 245, 0)");
  sheen.addColorStop(0.08, "rgba(190, 224, 255, 0.08)");
  sheen.addColorStop(0.12, "rgba(214, 240, 255, 0.13)");
  sheen.addColorStop(0.2, "rgba(143, 190, 245, 0)");
  sheen.addColorStop(1, "rgba(143, 190, 245, 0)");
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.97, 0, TAU);
  ctx.clip();
  ctx.fillStyle = sheen;
  ctx.fillRect(
    centerX - radius,
    centerY - radius,
    radius * 2,
    radius * 2,
  );
  ctx.restore();

  const needleLength = radius * 0.7;
  const needleTail = radius * 0.14;
  const needleGradient = ctx.createLinearGradient(
    centerX - Math.cos(bearingAngle) * needleTail,
    centerY - Math.sin(bearingAngle) * needleTail,
    centerX + Math.cos(bearingAngle) * needleLength,
    centerY + Math.sin(bearingAngle) * needleLength,
  );
  needleGradient.addColorStop(0, "rgba(92, 133, 191, 0.18)");
  needleGradient.addColorStop(0.38, "rgba(165, 212, 255, 0.56)");
  needleGradient.addColorStop(1, "rgba(214, 240, 255, 0.8)");
  ctx.strokeStyle = needleGradient;
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.moveTo(
    centerX - Math.cos(bearingAngle) * needleTail,
    centerY - Math.sin(bearingAngle) * needleTail,
  );
  ctx.lineTo(
    centerX + Math.cos(bearingAngle) * needleLength,
    centerY + Math.sin(bearingAngle) * needleLength,
  );
  ctx.stroke();

  ctx.fillStyle = "rgba(190, 224, 255, 0.58)";
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.035, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(125, 167, 255, 0.34)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.09, 0, TAU);
  ctx.stroke();

  if (M.hasFocus) {
    const focusAngle =
      Math.PI * 1.25 -
      finiteClamp(M.focusY, 0, 1, 0.5) * Math.PI * 0.5;
    const markerRadius = radius * 0.88;
    const impulseShift =
      motion?.reducedMotion ? 0 : M.interactionImpulse * 4;
    const markerX =
      centerX + Math.cos(focusAngle) * (markerRadius + impulseShift);
    const markerY =
      centerY + Math.sin(focusAngle) * (markerRadius + impulseShift);

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    softGlow(
      ctx,
      markerX,
      markerY,
      minSide * 0.05,
      "rgba(165, 212, 255, 0.09)",
      "transparent",
    );
    ctx.restore();
    ctx.strokeStyle = "rgba(214, 240, 255, 0.46)";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      markerX - radius * 0.035,
      markerY - radius * 0.035,
      radius * 0.07,
      radius * 0.07,
    );
  }

  const datumAngle = -Math.PI * 0.72;
  const datumX = centerX + Math.cos(datumAngle) * radius * 1.08;
  const datumY = centerY + Math.sin(datumAngle) * radius * 1.08;
  ctx.strokeStyle = "rgba(125, 167, 255, 0.22)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(datumX - radius * 0.12, datumY);
  ctx.lineTo(datumX + radius * 0.12, datumY);
  ctx.moveTo(datumX, datumY - radius * 0.08);
  ctx.lineTo(datumX, datumY + radius * 0.08);
  ctx.stroke();

  const readingLane = ctx.createLinearGradient(0, 0, w * 0.68, 0);
  readingLane.addColorStop(0, "rgba(3, 8, 18, 0.9)");
  readingLane.addColorStop(0.62, "rgba(3, 8, 18, 0.6)");
  readingLane.addColorStop(1, "rgba(3, 8, 18, 0)");
  ctx.fillStyle = readingLane;
  ctx.fillRect(0, 0, w * 0.71, h);

  const vignette = ctx.createRadialGradient(
    centerX,
    centerY,
    radius * 0.45,
    w * 0.58,
    h * 0.5,
    Math.max(w, h) * 0.78,
  );
  vignette.addColorStop(0, "rgba(2, 5, 12, 0)");
  vignette.addColorStop(0.72, "rgba(2, 5, 12, 0.1)");
  vignette.addColorStop(1, "rgba(1, 3, 8, 0.62)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
};
