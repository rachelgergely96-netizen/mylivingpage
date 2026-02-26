import type { ThemeRenderer } from "../types";

export const renderEmber: ThemeRenderer = (ctx, w, h, t, mx) => {
  const haze = ctx.createLinearGradient(0, h, 0, 0);
  haze.addColorStop(0, `hsla(10, 70%, 12%, ${0.15 + Math.sin(t * 0.3) * 0.03})`);
  haze.addColorStop(0.3, "hsla(20, 50%, 6%, 0.08)");
  haze.addColorStop(1, "transparent");
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 70; i += 1) {
    const seed = i * 73.7;
    const speed = 0.4 + (i % 7) * 0.15;
    const drift = Math.sin(t * 0.3 + seed) * 30 + Math.sin(t * 0.7 + i * 0.5) * 10;
    const windX = (mx - 0.5) * 40;
    const rawX = (Math.sin(seed * 1.7) * 0.5 + 0.5) * w + drift + windX * speed;
    const cycle = (t * 15 * speed + seed * 5) % (h * 1.5);
    const rawY = h + h * 0.2 - cycle;
    const life = Math.max(0, Math.min(1, 1 - cycle / (h * 1.5)));
    if (life <= 0) {
      continue;
    }

    const x = ((rawX % w) + w) % w;
    const y = rawY;
    const size = (1 + Math.sin(seed) * 0.6) * life;
    const hue = 10 + Math.sin(seed * 0.5) * 18 + life * 20;

    ctx.beginPath();
    ctx.arc(x, y, size * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 85%, ${55 + life * 20}%, ${life * 0.6})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, size * 10, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 75%, 50%, ${life * 0.06})`;
    ctx.fill();

    for (let tr = 1; tr < 4; tr += 1) {
      const trY = y + tr * 5 * speed;
      const trAlpha = life * 0.2 * (1 - tr / 4);
      ctx.beginPath();
      ctx.arc(x - drift * 0.02 * tr, trY, size * (1 - tr * 0.2), 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue - tr * 5}, 70%, 45%, ${trAlpha})`;
      ctx.fill();
    }
  }

  const fire = ctx.createRadialGradient(w * 0.5, h * 1.1, 0, w * 0.5, h, w * 0.6);
  fire.addColorStop(0, `hsla(20, 80%, 30%, ${0.08 + Math.sin(t * 0.5) * 0.03})`);
  fire.addColorStop(1, "transparent");
  ctx.fillStyle = fire;
  ctx.fillRect(0, 0, w, h);
};
