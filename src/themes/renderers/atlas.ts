import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "../shared/motion";
import type { ThemeRenderer } from "../types";

const ROUTE = [
  [0.5, 0.72],
  [0.58, 0.57],
  [0.69, 0.62],
  [0.76, 0.42],
  [0.86, 0.49],
  [0.92, 0.27],
] as const;

const CONTOURS = [
  { x: 0.74, y: 0.39, width: 0.17, height: 0.1, rotation: -0.16 },
  { x: 0.74, y: 0.39, width: 0.23, height: 0.145, rotation: -0.16 },
  { x: 0.74, y: 0.39, width: 0.3, height: 0.19, rotation: -0.16 },
  { x: 0.82, y: 0.67, width: 0.12, height: 0.075, rotation: 0.18 },
  { x: 0.82, y: 0.67, width: 0.18, height: 0.11, rotation: 0.18 },
] as const;

function routeForSection(section: string | null): number | null {
  switch (section) {
    case "summary":
    case "proof":
      return 1;
    case "testimonials":
    case "experience":
      return 2;
    case "projects":
      return 3;
    case "education":
    case "skills":
    case "certifications":
      return 4;
    default:
      return null;
  }
}

function routePosition(
  route: readonly (readonly [number, number])[],
  progress: number,
): readonly [number, number] {
  const segmentProgress = finiteClamp(progress, 0, 0.9999) * (route.length - 1);
  const index = Math.floor(segmentProgress);
  const local = segmentProgress - index;
  const start = route[index];
  const end = route[Math.min(route.length - 1, index + 1)];
  return [
    start[0] + (end[0] - start[0]) * local,
    start[1] + (end[1] - start[1]) * local,
  ];
}

export const renderAtlas: ThemeRenderer = (
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
  const velocity = finiteClamp(pageMotion.scrollVelocity / 4, -1, 1);
  const activeRoute = routeForSection(pageMotion.activeSection);
  const shiftX = (mx - 0.5) * w * 0.014;
  const shiftY = (my - 0.5) * h * 0.01 + velocity * h * 0.005;
  const background = ctx.createLinearGradient(0, 0, w, h);
  background.addColorStop(0, "#02090E");
  background.addColorStop(0.52, "#04131D");
  background.addColorStop(1, "#010609");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const chartLeft = w * 0.44 + shiftX;
  const chartTop = h * 0.07 + shiftY;
  const chartRight = w * 0.96 + shiftX;
  const chartBottom = h * 0.91 + shiftY;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;

  const chartWash = ctx.createLinearGradient(chartLeft, chartTop, chartRight, chartBottom);
  chartWash.addColorStop(0, "rgba(17, 69, 91, 0.14)");
  chartWash.addColorStop(0.58, "rgba(6, 30, 43, 0.08)");
  chartWash.addColorStop(1, "rgba(0, 0, 0, 0.08)");
  ctx.fillStyle = chartWash;
  ctx.fillRect(chartLeft, chartTop, chartWidth, chartHeight);

  ctx.strokeStyle = "rgba(109, 213, 255, 0.24)";
  ctx.lineWidth = 1;
  ctx.strokeRect(chartLeft + 0.5, chartTop + 0.5, chartWidth - 1, chartHeight - 1);
  ctx.strokeStyle = "rgba(109, 213, 255, 0.08)";
  ctx.strokeRect(chartLeft + 6.5, chartTop + 6.5, chartWidth - 13, chartHeight - 13);

  // Drafting grid: precise and quiet, with stronger major divisions.
  for (let column = 0; column <= 12; column += 1) {
    const x = chartLeft + (column / 12) * chartWidth;
    ctx.strokeStyle = column % 3 === 0
      ? "rgba(103, 214, 255, 0.11)"
      : "rgba(103, 214, 255, 0.045)";
    ctx.beginPath();
    ctx.moveTo(x, chartTop);
    ctx.lineTo(x, chartBottom);
    ctx.stroke();
  }
  for (let row = 0; row <= 16; row += 1) {
    const y = chartTop + (row / 16) * chartHeight;
    ctx.strokeStyle = row % 4 === 0
      ? "rgba(103, 214, 255, 0.11)"
      : "rgba(103, 214, 255, 0.045)";
    ctx.beginPath();
    ctx.moveTo(chartLeft, y);
    ctx.lineTo(chartRight, y);
    ctx.stroke();
  }

  // Registration ticks make the chart feel authored rather than generated.
  ctx.fillStyle = "rgba(158, 229, 255, 0.28)";
  for (let tick = 0; tick <= 24; tick += 1) {
    const x = chartLeft + (tick / 24) * chartWidth;
    const length = tick % 6 === 0 ? 9 : tick % 2 === 0 ? 5 : 3;
    ctx.fillRect(x, chartTop - length, 1, length);
    ctx.fillRect(x, chartBottom, 1, length);
  }
  for (let tick = 0; tick <= 20; tick += 1) {
    const y = chartTop + (tick / 20) * chartHeight;
    const length = tick % 5 === 0 ? 9 : tick % 2 === 0 ? 5 : 3;
    ctx.fillRect(chartLeft - length, y, length, 1);
    ctx.fillRect(chartRight, y, length, 1);
  }

  ctx.save();
  ctx.strokeStyle = "rgba(121, 218, 255, 0.14)";
  ctx.lineWidth = 1;
  CONTOURS.forEach((contour, index) => {
    const chapterWeight = storyStepWeight(
      pageMotion.storyProgress,
      index,
      CONTOURS.length,
    );
    ctx.globalAlpha = 0.7 + chapterWeight * 0.3;
    ctx.beginPath();
    ctx.ellipse(
      contour.x * w + shiftX,
      contour.y * h + shiftY,
      contour.width * w,
      contour.height * h,
      contour.rotation,
      0,
      Math.PI * 1.72,
    );
    ctx.stroke();
  });
  ctx.restore();

  const route = ROUTE.map(([x, y]) => [x * w + shiftX, y * h + shiftY] as const);
  ctx.beginPath();
  route.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "rgba(103, 214, 255, 0.35)";
  ctx.lineWidth = 1.15;
  ctx.setLineDash([5, 7]);
  ctx.lineDashOffset = -effectiveTime * 3.5 - pageMotion.storyProgress * 18;
  ctx.stroke();
  ctx.setLineDash([]);

  route.forEach(([x, y], index) => {
    const chapterWeight = storyStepWeight(pageMotion.storyProgress, index, route.length);
    const isActive = index === activeRoute;
    const size = 5 + chapterWeight * 3 + (isActive ? 2 : 0);
    ctx.fillStyle = isActive || chapterWeight > 0.5
      ? "rgba(201, 243, 255, 0.94)"
      : "rgba(103, 214, 255, 0.44)";
    ctx.fillRect(x - size * 0.5, y - size * 0.5, size, size);
    ctx.strokeStyle = `rgba(103, 214, 255, ${0.2 + chapterWeight * 0.35})`;
    ctx.strokeRect(x - size, y - size, size * 2, size * 2);
  });

  const signalProgress =
    (effectiveTime * 0.045 + pageMotion.storyProgress * 0.72 + velocity * 0.02 + 1) % 1;
  const signal = routePosition(ROUTE, signalProgress);
  const signalX = signal[0] * w + shiftX;
  const signalY = signal[1] * h + shiftY;
  ctx.fillStyle = "rgba(218, 248, 255, 0.96)";
  ctx.fillRect(signalX - 2, signalY - 2, 4, 4);
  ctx.strokeStyle = "rgba(103, 214, 255, 0.36)";
  ctx.strokeRect(signalX - 7, signalY - 7, 14, 14);

  // Inset locator and scale rule add practical cartographic hierarchy.
  const insetX = chartLeft + chartWidth * 0.07;
  const insetY = chartTop + chartHeight * 0.09;
  const insetSize = Math.min(chartWidth, chartHeight) * 0.16;
  ctx.strokeStyle = "rgba(103, 214, 255, 0.2)";
  ctx.strokeRect(insetX, insetY, insetSize, insetSize);
  ctx.beginPath();
  ctx.moveTo(insetX + insetSize * 0.2, insetY + insetSize * 0.72);
  ctx.lineTo(insetX + insetSize * 0.42, insetY + insetSize * 0.35);
  ctx.lineTo(insetX + insetSize * 0.58, insetY + insetSize * 0.52);
  ctx.lineTo(insetX + insetSize * 0.8, insetY + insetSize * 0.22);
  ctx.stroke();
  const scaleY = chartBottom - chartHeight * 0.06;
  const scaleX = chartLeft + chartWidth * 0.08;
  const unit = chartWidth * 0.045;
  for (let index = 0; index < 4; index += 1) {
    ctx.fillStyle = index % 2 === 0
      ? "rgba(201, 243, 255, 0.5)"
      : "rgba(103, 214, 255, 0.14)";
    ctx.fillRect(scaleX + unit * index, scaleY, unit, 3);
  }

  if (pageMotion.hasFocus) {
    const focusX = pageMotion.focusX * w;
    const focusY = pageMotion.focusY * h;
    const anchorIndex = activeRoute ?? Math.round(pageMotion.storyProgress * (route.length - 1));
    const anchor = route[Math.min(route.length - 1, Math.max(0, anchorIndex))];
    ctx.save();
    ctx.strokeStyle = `rgba(157, 231, 255, ${0.2 + pageMotion.interactionImpulse * 0.28})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 7]);
    ctx.beginPath();
    ctx.moveTo(anchor[0], anchor[1]);
    ctx.lineTo(focusX, focusY);
    ctx.stroke();
    ctx.setLineDash([]);
    const echoSize = 10 + (1 - pageMotion.interactionImpulse) * 24;
    ctx.strokeRect(
      focusX - echoSize * 0.5,
      focusY - echoSize * 0.5,
      echoSize,
      echoSize,
    );
    ctx.fillStyle = "rgba(201, 243, 255, 0.85)";
    ctx.fillRect(focusX - 1.5, focusY - 1.5, 3, 3);
    ctx.restore();
  }

  // A disciplined left wash keeps text readable without a generic glow.
  const textWash = ctx.createLinearGradient(0, 0, w * 0.62, 0);
  textWash.addColorStop(0, "rgba(2, 9, 14, 0.88)");
  textWash.addColorStop(0.74, "rgba(2, 9, 14, 0.48)");
  textWash.addColorStop(1, "rgba(2, 9, 14, 0)");
  ctx.fillStyle = textWash;
  ctx.fillRect(0, 0, w * 0.64, h);
};
