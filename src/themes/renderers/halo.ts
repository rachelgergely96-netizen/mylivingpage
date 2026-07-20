import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "../shared/motion";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

export const renderHalo: ThemeRenderer = (
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
  const eclipseX = w * 0.78 + pointerX * minSide * 0.045;
  const eclipseY = h * (0.39 - page.storyProgress * 0.035) + pointerY * minSide * 0.035;
  const radius = minSide * 0.185;
  const drift = page.scrollVelocity * 0.02 + page.interactionImpulse * 0.025;

  ctx.save();

  const background = ctx.createLinearGradient(0, 0, w, h);
  background.addColorStop(0, "#170A18");
  background.addColorStop(0.48, "#0C0711");
  background.addColorStop(1, "#030307");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  // Far plane: a sparse field and a low atmospheric veil keep the scale vast.
  const atmosphere = ctx.createRadialGradient(
    eclipseX,
    eclipseY,
    radius * 0.3,
    eclipseX,
    eclipseY,
    radius * 3.5,
  );
  atmosphere.addColorStop(0, "rgba(204, 117, 165, 0.10)");
  atmosphere.addColorStop(0.52, "rgba(109, 66, 129, 0.07)");
  atmosphere.addColorStop(1, "rgba(3, 3, 7, 0)");
  ctx.fillStyle = atmosphere;
  ctx.fillRect(w * 0.34, 0, w * 0.66, h);

  for (let i = 0; i < 42; i += 1) {
    const seed = i + 1;
    const x = w * (0.42 + (0.5 + 0.5 * Math.sin(seed * 9.73)) * 0.57);
    const y = h * (0.04 + (0.5 + 0.5 * Math.cos(seed * 7.19)) * 0.9);
    const twinkle = 0.5 + 0.5 * Math.sin(t * 0.45 + seed * 2.13);
    ctx.beginPath();
    ctx.arc(x, y, 0.45 + (seed % 4) * 0.23, 0, TAU);
    ctx.fillStyle = `rgba(255, 220, 235, ${0.025 + twinkle * 0.075})`;
    ctx.fill();
  }

  // Middle plane: a monumental eclipse, with restrained orbital motion.
  const corona = ctx.createRadialGradient(
    eclipseX,
    eclipseY,
    radius * 0.76,
    eclipseX,
    eclipseY,
    radius * 2.35,
  );
  corona.addColorStop(0, "rgba(255, 245, 233, 0.62)");
  corona.addColorStop(0.08, "rgba(251, 192, 214, 0.34)");
  corona.addColorStop(0.34, "rgba(206, 112, 165, 0.12)");
  corona.addColorStop(1, "rgba(87, 44, 100, 0)");
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(eclipseX, eclipseY, radius * 2.35, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.translate(eclipseX, eclipseY);
  ctx.rotate(t * 0.012 + drift);
  for (let ray = 0; ray < 28; ray += 1) {
    const angle = (ray / 28) * TAU;
    const shimmer = 0.5 + 0.5 * Math.sin(ray * 4.7 + t * 0.28);
    const inner = radius * 1.07;
    const outer = radius * (1.28 + shimmer * 0.42);
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    ctx.strokeStyle = `rgba(255, 218, 226, ${0.025 + shimmer * 0.06})`;
    ctx.lineWidth = 0.7 + shimmer * 0.8;
    ctx.stroke();
  }
  ctx.restore();

  for (let orbit = 0; orbit < 3; orbit += 1) {
    const orbitRadius = radius * (1.42 + orbit * 0.36);
    const phase = t * (0.018 + orbit * 0.004) + page.storyProgress * 0.55;
    ctx.beginPath();
    ctx.ellipse(
      eclipseX,
      eclipseY,
      orbitRadius,
      orbitRadius * (0.48 + orbit * 0.06),
      -0.28 + orbit * 0.2 + drift,
      phase,
      phase + Math.PI * (1.22 + orbit * 0.13),
    );
    ctx.strokeStyle = `rgba(245, 190, 216, ${0.12 - orbit * 0.024})`;
    ctx.lineWidth = 1.1 - orbit * 0.16;
    ctx.stroke();
  }

  const disc = ctx.createRadialGradient(
    eclipseX - radius * 0.28,
    eclipseY - radius * 0.3,
    radius * 0.08,
    eclipseX,
    eclipseY,
    radius,
  );
  disc.addColorStop(0, "#120D17");
  disc.addColorStop(0.72, "#07070B");
  disc.addColorStop(1, "#020205");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(eclipseX, eclipseY, radius, 0, TAU);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(eclipseX, eclipseY, radius * 1.008, -1.18, 1.18);
  ctx.strokeStyle = "rgba(255, 239, 229, 0.84)";
  ctx.lineWidth = Math.max(1.4, radius * 0.016);
  ctx.shadowColor = "rgba(255, 184, 213, 0.8)";
  ctx.shadowBlur = radius * 0.08;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Foreground: page-linked waypoints turn the orbit into a quiet story rail.
  const stepCount = Math.max(4, Math.min(7, page.sectionCount || 5));
  for (let step = 0; step < stepCount; step += 1) {
    const weight = storyStepWeight(page.storyProgress, step, stepCount);
    const angle = -0.92 + (step / Math.max(1, stepCount - 1)) * 1.84;
    const markerRadius = radius * 1.62;
    const x = eclipseX + Math.cos(angle) * markerRadius;
    const y = eclipseY + Math.sin(angle) * markerRadius * 0.58;
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + weight * 2.4, 0, TAU);
    ctx.fillStyle = `rgba(255, 226, 236, ${0.18 + weight * 0.65})`;
    ctx.fill();
  }

  if (page.hasFocus) {
    const focusX = page.focusX * w;
    const focusY = page.focusY * h;
    const angle = Math.atan2(focusY - eclipseY, focusX - eclipseX);
    const edgeX = eclipseX + Math.cos(angle) * radius * 1.48;
    const edgeY = eclipseY + Math.sin(angle) * radius * 0.82;
    ctx.beginPath();
    ctx.moveTo(focusX, focusY);
    ctx.quadraticCurveTo(w * 0.61, focusY, edgeX, edgeY);
    ctx.strokeStyle = "rgba(255, 211, 228, 0.22)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const clearSpace = ctx.createLinearGradient(0, 0, w * 0.68, 0);
  clearSpace.addColorStop(0, "rgba(8, 5, 11, 0.76)");
  clearSpace.addColorStop(0.62, "rgba(8, 5, 11, 0.42)");
  clearSpace.addColorStop(1, "rgba(8, 5, 11, 0)");
  ctx.fillStyle = clearSpace;
  ctx.fillRect(0, 0, w * 0.68, h);

  const vignette = ctx.createRadialGradient(w * 0.7, h * 0.42, minSide * 0.1, w * 0.55, h * 0.5, Math.max(w, h) * 0.78);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.34)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
};
