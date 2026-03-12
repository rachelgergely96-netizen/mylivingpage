import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

export const renderHalo: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const background = ctx.createLinearGradient(0, 0, 0, h);
  background.addColorStop(0, "#150913");
  background.addColorStop(0.52, "#10060F");
  background.addColorStop(1, "#050204");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const centers: Array<[number, number, number]> = [
    [w * 0.34, h * 0.36, Math.min(w, h) * 0.12],
    [w * 0.66, h * 0.42, Math.min(w, h) * 0.16],
    [w * 0.5, h * 0.68, Math.min(w, h) * 0.22],
  ];

  for (let i = 0; i < centers.length; i += 1) {
    const [baseX, baseY, baseRadius] = centers[i];
    const x = baseX + Math.sin(t * (0.16 + i * 0.03) + i) * 12 + (mx - 0.5) * 14;
    const y = baseY + Math.cos(t * (0.14 + i * 0.02) + i) * 10 + (my - 0.5) * 10;

    for (let ring = 0; ring < 4; ring += 1) {
      const rx = baseRadius * (1 + ring * 0.42);
      const ry = rx * (0.52 + ring * 0.04);
      const pulse = 0.92 + Math.sin(t * 0.55 + i + ring) * 0.08;
      ctx.beginPath();
      ctx.ellipse(x, y, rx * pulse, ry * pulse, t * 0.08 + i * 0.18 + ring * 0.12, 0, TAU);
      ctx.strokeStyle = `rgba(${214 + ring * 4}, ${170 + ring * 9}, ${196 + ring * 6}, ${0.11 - ring * 0.018})`;
      ctx.lineWidth = 1.2 - ring * 0.12;
      ctx.stroke();
    }

    const bloom = ctx.createRadialGradient(x, y, 0, x, y, baseRadius * 3.4);
    bloom.addColorStop(0, "rgba(255, 235, 222, 0.1)");
    bloom.addColorStop(0.48, "rgba(255, 181, 202, 0.06)");
    bloom.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = bloom;
    ctx.fillRect(x - baseRadius * 3.5, y - baseRadius * 3.5, baseRadius * 7, baseRadius * 7);
  }

  for (let i = 0; i < 50; i += 1) {
    const seed = i * 0.83 + 0.2;
    const x = (Math.sin(seed * 4.1) * 0.5 + 0.5) * w + Math.sin(t * 0.16 + seed) * 12;
    const y = (Math.cos(seed * 3.4) * 0.5 + 0.5) * h + Math.cos(t * 0.14 + seed * 0.8) * 8;
    const alpha = 0.03 + (0.5 + 0.5 * Math.sin(t * 1.2 + seed * 8)) * 0.12;

    ctx.beginPath();
    ctx.arc(x, y, 1.2, 0, TAU);
    ctx.fillStyle = `rgba(255, 224, 214, ${alpha})`;
    ctx.fill();
  }

  const pointerX = mx * w;
  const pointerY = my * h;
  const pointerGlow = ctx.createRadialGradient(pointerX, pointerY, 0, pointerX, pointerY, Math.min(w, h) * 0.22);
  pointerGlow.addColorStop(0, "rgba(255, 199, 215, 0.16)");
  pointerGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = pointerGlow;
  ctx.fillRect(0, 0, w, h);
};
