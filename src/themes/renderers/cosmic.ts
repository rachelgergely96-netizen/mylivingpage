import type { ThemeRenderer } from "../types";

export const renderCosmic: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const nebX = w * 0.4 + Math.sin(t * 0.15) * w * 0.1;
  const nebY = h * 0.35 + Math.cos(t * 0.12) * h * 0.08;
  const neb = ctx.createRadialGradient(nebX, nebY, 0, w * 0.5, h * 0.5, w * 0.8);
  neb.addColorStop(0, "rgba(60, 20, 120, 0.08)");
  neb.addColorStop(0.4, "rgba(20, 10, 60, 0.04)");
  neb.addColorStop(1, "transparent");
  ctx.fillStyle = neb;
  ctx.fillRect(0, 0, w, h);

  const n2 = ctx.createRadialGradient(w * 0.7 + Math.cos(t * 0.1) * 40, h * 0.6, 0, w * 0.6, h * 0.5, w * 0.5);
  n2.addColorStop(0, "rgba(120, 80, 20, 0.05)");
  n2.addColorStop(1, "transparent");
  ctx.fillStyle = n2;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 80; i += 1) {
    const seed = i * 137.508;
    const depth = (i % 3) + 1;
    const parallax = depth * 0.3;
    const px = ((Math.sin(seed) * 0.5 + 0.5) * w + Math.sin(t * 0.2 * parallax + i * 0.1) * 6) % w;
    const py = ((Math.cos(seed * 1.3) * 0.5 + 0.5) * h + Math.cos(t * 0.15 * parallax + i * 0.12) * 5) % h;
    const r = (0.8 + Math.sin(t * 0.7 + i * 0.8) * 0.4) * (4 - depth) * 0.5;
    const twinkle = 0.25 + Math.sin(t * 1.2 + seed) * 0.2 + Math.sin(t * 0.4 + i) * 0.1;
    const hue = 42 + Math.sin(i * 0.3) * 20;
    const dx = mx * w - px;
    const dy = my * h - py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const mouseBoost = dist < 120 ? (1 - dist / 120) * 0.3 : 0;

    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 65%, ${65 + mouseBoost * 30}%, ${twinkle + mouseBoost})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(px, py, r * 5, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 60%, 60%, ${twinkle * 0.1 + mouseBoost * 0.15})`;
    ctx.fill();
  }

  const stars: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 80; i += 1) {
    const seed = i * 137.508;
    stars.push({
      x: ((Math.sin(seed) * 0.5 + 0.5) * w + Math.sin(t * 0.06 + i * 0.1) * 6) % w,
      y: ((Math.cos(seed * 1.3) * 0.5 + 0.5) * h + Math.cos(t * 0.045 + i * 0.12) * 5) % h,
    });
  }

  ctx.lineWidth = 0.5;
  for (let i = 0; i < stars.length; i += 1) {
    for (let j = i + 1; j < Math.min(i + 6, stars.length); j += 1) {
      const d = Math.hypot(stars[i].x - stars[j].x, stars[i].y - stars[j].y);
      if (d < w * 0.12) {
        const alpha = (1 - d / (w * 0.12)) * 0.07;
        ctx.beginPath();
        ctx.moveTo(stars[i].x, stars[i].y);
        ctx.lineTo(stars[j].x, stars[j].y);
        ctx.strokeStyle = `hsla(42, 60%, 65%, ${alpha})`;
        ctx.stroke();
      }
    }
  }
};
