import type { ThemeRenderer } from "../types";
import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "../shared/motion";

const TAU = Math.PI * 2;

function routePoint(
  cx: number,
  cy: number,
  radius: number,
  longitude: number,
  latitude: number,
  yaw: number,
): [number, number] {
  const rotated = longitude + yaw;
  const depth = Math.cos(latitude) * Math.cos(rotated);
  return [
    cx + Math.cos(latitude) * Math.sin(rotated) * radius,
    cy + Math.sin(latitude) * radius * 0.76 - depth * radius * 0.05,
  ];
}

function routeForSection(section: string | null): number | null {
  switch (section) {
    case "summary":
    case "proof":
      return 0;
    case "testimonials":
    case "experience":
      return 1;
    case "projects":
      return 2;
    case "education":
    case "skills":
    case "certifications":
      return 3;
    default:
      return null;
  }
}

export const renderAtlas: ThemeRenderer = (ctx, w, h, t, mx, my, _deltaSeconds, motion) => {
  const pageMotion = resolveThemeMotion(motion);
  const velocity = finiteClamp(pageMotion.scrollVelocity / 3, -1, 1);
  const activeRoute = routeForSection(pageMotion.activeSection);
  const background = ctx.createLinearGradient(0, 0, w, h);
  background.addColorStop(0, "#020A10");
  background.addColorStop(0.52, "#04121C");
  background.addColorStop(1, "#02070C");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 62; i += 1) {
    const seed = i * 0.733 + 0.31;
    const x = (Math.sin(seed * 6.1) * 0.5 + 0.5) * w;
    const y = (Math.cos(seed * 4.7) * 0.5 + 0.5) * h;
    const alpha = 0.035 + (0.5 + 0.5 * Math.sin(t * 0.8 + seed * 8)) * 0.09;
    ctx.fillStyle = `rgba(161, 224, 255, ${alpha})`;
    ctx.fillRect(x, y, 0.7 + (i % 3) * 0.3, 0.7 + (i % 3) * 0.3);
  }

  const cx = w * (w > h * 0.9 ? 0.73 : 0.68) + (mx - 0.5) * w * 0.045;
  const cy = h * 0.47 + (my - 0.5) * h * 0.035;
  const radius = Math.min(w * 0.34, h * 0.39);
  const yaw =
    t * 0.08 +
    (mx - 0.5) * 0.72 +
    pageMotion.storyProgress * 1.18 +
    velocity * 0.14;

  const halo = ctx.createRadialGradient(cx, cy, radius * 0.08, cx, cy, radius * 1.55);
  halo.addColorStop(0, "rgba(65, 203, 255, 0.2)");
  halo.addColorStop(0.48, "rgba(32, 151, 211, 0.08)");
  halo.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = halo;
  ctx.fillRect(cx - radius * 1.65, cy - radius * 1.65, radius * 3.3, radius * 3.3);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, TAU);
  ctx.clip();

  const ocean = ctx.createRadialGradient(cx - radius * 0.34, cy - radius * 0.4, 0, cx, cy, radius * 1.2);
  ocean.addColorStop(0, "rgba(18, 91, 125, 0.42)");
  ocean.addColorStop(0.55, "rgba(4, 35, 52, 0.72)");
  ocean.addColorStop(1, "rgba(1, 12, 20, 0.94)");
  ctx.fillStyle = ocean;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  for (let lat = -4; lat <= 4; lat += 1) {
    const latitude = (lat / 5) * 1.15;
    const y = cy + Math.sin(latitude) * radius * 0.76;
    const rx = Math.cos(latitude) * radius;
    ctx.beginPath();
    ctx.ellipse(cx, y, rx, Math.max(2, rx * 0.13), 0, 0, TAU);
    ctx.strokeStyle = `rgba(122, 219, 255, ${0.08 + (1 - Math.abs(lat) / 5) * 0.08})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  for (let lon = 0; lon < 12; lon += 1) {
    const angle = yaw + (lon / 12) * Math.PI;
    const rx = Math.max(radius * 0.055, Math.abs(Math.cos(angle)) * radius);
    const alpha = 0.055 + Math.max(0, Math.sin(angle)) * 0.13;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, radius, 0, 0, TAU);
    ctx.strokeStyle = `rgba(121, 218, 255, ${alpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  for (let i = 0; i < 4; i += 1) {
    const longitude = -1.6 + i * 1.03 + Math.sin(i * 4.2) * 0.35;
    const latitude = -0.54 + (i % 3) * 0.42;
    const [x, y] = routePoint(cx, cy, radius, longitude, latitude, yaw);
    const island = ctx.createRadialGradient(x, y, 0, x, y, radius * (0.18 + (i % 2) * 0.05));
    island.addColorStop(0, "rgba(101, 218, 218, 0.2)");
    island.addColorStop(1, "rgba(72, 157, 171, 0)");
    ctx.fillStyle = island;
    ctx.fillRect(x - radius * 0.3, y - radius * 0.3, radius * 0.6, radius * 0.6);
  }

  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, TAU);
  ctx.strokeStyle = "rgba(166, 233, 255, 0.34)";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  const routes = [
    [-1.45, -0.3, 0.75, 0.28],
    [-0.72, 0.42, 1.74, -0.22],
    [0.12, -0.5, 2.24, 0.18],
    [1.28, 0.34, 3.26, -0.34],
  ];
  let storyAnchorX = 0;
  let storyAnchorY = 0;
  let storyAnchorWeight = 0;
  routes.forEach(([startLon, startLat, endLon, endLat], index) => {
    const isActive = index === activeRoute;
    const chapterWeight =
      pageMotion.sectionCount > 0
        ? storyStepWeight(pageMotion.storyProgress, index, routes.length)
        : Number(isActive);
    const start = routePoint(cx, cy, radius * 0.94, startLon, startLat, yaw);
    const end = routePoint(cx, cy, radius * 0.94, endLon, endLat, yaw);
    storyAnchorX += end[0] * chapterWeight;
    storyAnchorY += end[1] * chapterWeight;
    storyAnchorWeight += chapterWeight;
    const lift = radius * (0.32 + index * 0.035);
    ctx.beginPath();
    ctx.moveTo(start[0], start[1]);
    ctx.quadraticCurveTo((start[0] + end[0]) / 2, Math.min(start[1], end[1]) - lift, end[0], end[1]);
    ctx.strokeStyle = `rgba(113, 222, 255, ${0.2 + index * 0.025 + chapterWeight * 0.2})`;
    ctx.lineWidth = 1.1 + chapterWeight * 0.65;
    ctx.setLineDash([4, 6]);
    ctx.lineDashOffset =
      -t * (7 + index) -
      pageMotion.storyProgress * 26 -
      velocity * 3;
    ctx.stroke();
    ctx.setLineDash([]);

    const rawPhase =
      t * (0.11 + index * 0.012) +
      index * 0.23 +
      pageMotion.storyProgress * 0.42 +
      velocity * 0.025;
    const phase = ((rawPhase % 1) + 1) % 1;
    const inv = 1 - phase;
    const qx = inv * inv * start[0] + 2 * inv * phase * ((start[0] + end[0]) / 2) + phase * phase * end[0];
    const qy = inv * inv * start[1] + 2 * inv * phase * (Math.min(start[1], end[1]) - lift) + phase * phase * end[1];
    ctx.beginPath();
    ctx.arc(qx, qy, 2.2 + chapterWeight, 0, TAU);
    ctx.fillStyle = `rgba(210, 248, 255, ${0.76 + chapterWeight * 0.18})`;
    ctx.fill();
  });

  if (pageMotion.hasFocus && storyAnchorWeight > 0) {
    const storyAnchor: [number, number] = [
      storyAnchorX / storyAnchorWeight,
      storyAnchorY / storyAnchorWeight,
    ];
    const focusX = pageMotion.focusX * w;
    const focusY = pageMotion.focusY * h;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(storyAnchor[0], storyAnchor[1]);
    ctx.lineTo(focusX, focusY);
    ctx.setLineDash([3, 7]);
    ctx.strokeStyle = `rgba(157, 231, 255, ${0.16 + pageMotion.interactionImpulse * 0.16})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(202, 244, 255, 0.68)";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(focusX - 5, focusY - 5, 10, 10);
    if (pageMotion.interactionImpulse > 0.01) {
      const echoSize = 10 + (1 - pageMotion.interactionImpulse) * 28;
      ctx.strokeStyle = `rgba(128, 223, 255, ${pageMotion.interactionImpulse * 0.38})`;
      ctx.strokeRect(
        focusX - echoSize * 0.5,
        focusY - echoSize * 0.5,
        echoSize,
        echoSize,
      );
    }
    ctx.restore();
  }

  for (let ring = 0; ring < 3; ring += 1) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius * (1.16 + ring * 0.14), radius * (0.25 + ring * 0.04), -0.2, 0, TAU);
    ctx.strokeStyle = `rgba(86, 195, 236, ${0.09 - ring * 0.018})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(102, 213, 255, 0.2)";
  for (let i = 0; i < 8; i += 1) {
    const y = h * (0.18 + i * 0.085);
    ctx.fillRect(w * 0.055, y, w * (0.035 + (i % 3) * 0.012), 1);
  }
};
