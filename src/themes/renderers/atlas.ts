import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

function projectRoutePoint(cx: number, cy: number, radius: number, angle: number, lift: number): [number, number] {
  return [cx + Math.cos(angle) * radius, cy + Math.sin(angle * 1.2) * radius * 0.38 - lift];
}

export const renderAtlas: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const background = ctx.createLinearGradient(0, 0, 0, h);
  background.addColorStop(0, "#06131D");
  background.addColorStop(0.55, "#071019");
  background.addColorStop(1, "#03070B");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.5;
  const cy = h * 0.54;
  const globeRadius = Math.min(w, h) * 0.34;
  const yaw = (mx - 0.5) * 0.95 + t * 0.06;
  const pitch = (my - 0.5) * 0.22;

  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, globeRadius * 1.25);
  halo.addColorStop(0, "rgba(73, 198, 255, 0.16)");
  halo.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);

  ctx.beginPath();
  ctx.arc(cx, cy, globeRadius, 0, TAU);
  ctx.strokeStyle = "rgba(134, 209, 255, 0.12)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  for (let i = 0; i < 11; i += 1) {
    const angle = yaw + (i / 10) * Math.PI;
    const rx = Math.max(globeRadius * 0.08, Math.abs(Math.cos(angle)) * globeRadius);
    const alpha = 0.05 + Math.max(0, Math.cos(angle)) * 0.12;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, globeRadius, 0, 0, TAU);
    ctx.strokeStyle = `rgba(138, 216, 255, ${alpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  for (let j = -4; j <= 4; j += 1) {
    const latitude = (j / 5) * 1.08 + pitch;
    const y = cy + Math.sin(latitude) * globeRadius * 0.78;
    const rx = Math.cos(latitude) * globeRadius;
    if (rx <= 0) continue;
    ctx.beginPath();
    ctx.ellipse(cx, y, rx, rx * 0.18, 0, 0, TAU);
    ctx.strokeStyle = `rgba(168, 231, 255, ${0.05 + (1 - Math.abs(j) / 5) * 0.08})`;
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }

  ctx.setLineDash([5, 7]);
  for (let i = 0; i < 6; i += 1) {
    const seed = i * 1.27 + 0.3;
    const start = projectRoutePoint(cx, cy, globeRadius * 0.74, seed + t * 0.05, 10 + i * 4);
    const end = projectRoutePoint(cx, cy, globeRadius * 0.74, seed + 1.8 + t * 0.05, 22 + i * 4);
    const controlY = cy - globeRadius * (0.28 + (i % 3) * 0.07);
    ctx.beginPath();
    ctx.moveTo(start[0], start[1]);
    ctx.quadraticCurveTo(cx, controlY, end[0], end[1]);
    ctx.strokeStyle = `rgba(112, 214, 255, ${0.08 + (i % 2) * 0.04})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.setLineDash([]);

  for (let i = 0; i < 18; i += 1) {
    const seed = i * 0.77 + 0.2;
    const angle = t * (0.18 + (i % 4) * 0.02) + seed;
    const radius = globeRadius * (0.22 + ((i % 6) + 1) * 0.11);
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(seed * 1.4) * globeRadius * 0.5 + Math.sin(angle * 1.1) * 10;
    const glow = 0.08 + 0.09 * (0.5 + 0.5 * Math.sin(t * 1.4 + seed * 5));

    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, TAU);
    ctx.fillStyle = `rgba(188, 239, 255, ${0.55 + glow})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, 10, 0, TAU);
    ctx.fillStyle = `rgba(72, 202, 255, ${glow * 0.26})`;
    ctx.fill();
  }

  for (let i = 0; i < 5; i += 1) {
    const phase = (t * 0.08 + i * 0.18) % 1;
    const y = cy - globeRadius + phase * globeRadius * 2;
    ctx.fillStyle = `rgba(155, 220, 255, ${(1 - phase) * 0.03})`;
    ctx.fillRect(cx - globeRadius * 1.3, y, globeRadius * 2.6, 1.2);
  }
};
