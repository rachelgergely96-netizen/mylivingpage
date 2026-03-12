import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

export const renderForge: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const background = ctx.createLinearGradient(0, 0, 0, h);
  background.addColorStop(0, "#120705");
  background.addColorStop(0.62, "#090405");
  background.addColorStop(1, "#020101");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.5;
  const cy = h * (0.6 + (my - 0.5) * 0.04);
  const minSide = Math.min(w, h);
  const heatAngle = t * 0.85 + mx * TAU;

  const forgeGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, minSide * 0.45);
  forgeGlow.addColorStop(0, "rgba(255, 120, 52, 0.28)");
  forgeGlow.addColorStop(0.55, "rgba(255, 70, 18, 0.08)");
  forgeGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = forgeGlow;
  ctx.fillRect(0, 0, w, h);

  for (let ring = 0; ring < 4; ring += 1) {
    const radius = minSide * (0.14 + ring * 0.08);
    const segments = 10;
    for (let seg = 0; seg < segments; seg += 1) {
      const start = (seg / segments) * TAU + t * (0.06 - ring * 0.01) + ring * 0.2;
      const end = start + 0.42;
      const mid = (start + end) / 2;
      const heat = Math.max(0, Math.cos(mid - heatAngle));
      const alpha = 0.08 + heat * 0.3;
      const lineWidth = 1.4 + heat * 2.4;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, start, end);
      ctx.strokeStyle = `rgba(${110 + heat * 120}, ${72 + heat * 40}, ${54 + heat * 10}, ${alpha})`;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  }

  for (let i = 0; i < 7; i += 1) {
    const angle = heatAngle + i * (TAU / 7);
    const radius = minSide * 0.09;
    const outer = minSide * 0.24;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.strokeStyle = "rgba(255, 148, 84, 0.08)";
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }

  for (let i = 0; i < 140; i += 1) {
    const seed = i * 0.73 + 0.11;
    const speed = 0.18 + (Math.sin(seed * 2.4) * 0.5 + 0.5) * 0.34;
    const progress = (t * speed + seed * 0.19) % 1;
    const launchX = cx + Math.sin(seed * 6.2) * minSide * 0.16;
    const x = launchX + Math.sin(seed * 4.1 + progress * 8 + t * 1.6) * 22 + (mx - 0.5) * 18 * (1 - progress);
    const y = h * 0.95 - progress * h * 0.82 + Math.cos(seed * 3.5) * 10;
    const radius = 0.8 + (1 - progress) * 1.4;
    const alpha = (1 - progress) * (0.14 + (Math.sin(seed * 8) * 0.5 + 0.5) * 0.22);

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fillStyle = `rgba(255, ${150 + Math.sin(seed * 1.3) * 40}, 70, ${alpha})`;
    ctx.fill();
  }

  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, minSide * 0.14);
  core.addColorStop(0, "rgba(255, 215, 175, 0.5)");
  core.addColorStop(0.45, "rgba(255, 113, 42, 0.28)");
  core.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, minSide * 0.14, 0, TAU);
  ctx.fill();

  const vignette = ctx.createLinearGradient(0, 0, 0, h);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0.05)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.4)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
};
