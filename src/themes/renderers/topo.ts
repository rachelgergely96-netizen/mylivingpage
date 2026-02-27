import { fbm } from "../shared/noise";
import type { ThemeRenderer } from "../types";

export const renderTopo: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  // Subtle dot grid
  const spacing = 32;
  const cols = Math.ceil(w / spacing) + 1;
  const rows = Math.ceil(h / spacing) + 1;

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const x = c * spacing;
      const y = r * spacing;
      ctx.beginPath();
      ctx.arc(x, y, 0.5, 0, Math.PI * 2);
      ctx.fillStyle = "hsla(155, 30%, 45%, 0.04)";
      ctx.fill();
    }
  }

  // Contour lines from noise field
  const levels = 10;
  const step = 3;

  for (let level = 0; level < levels; level += 1) {
    const threshold = (level + 1) / (levels + 1);
    const hue = 145 + level * 3;
    const alpha = 0.04 + (level % 3 === 0 ? 0.03 : 0);

    ctx.beginPath();

    for (let x = 0; x < w; x += step) {
      for (let y = 0; y < h; y += step) {
        // Noise value at this point
        const nx = x * 0.005;
        const ny = y * 0.005;
        const val = (fbm(nx + t * 0.015, ny + t * 0.01, 3) + 1) * 0.5;

        // Mouse creates a peak
        const dx = x - mx * w;
        const dy = y - my * h;
        const mouseDist = Math.hypot(dx, dy);
        const mouseInfluence = mouseDist < 150 ? (1 - mouseDist / 150) * 0.3 : 0;
        const adjusted = val + mouseInfluence;

        // Check if this point crosses the threshold
        const right = x + step < w
          ? (fbm((x + step) * 0.005 + t * 0.015, ny + t * 0.01, 3) + 1) * 0.5
            + (Math.hypot(x + step - mx * w, dy) < 150 ? (1 - Math.hypot(x + step - mx * w, dy) / 150) * 0.3 : 0)
          : adjusted;

        const below = y + step < h
          ? (fbm(nx + t * 0.015, (y + step) * 0.005 + t * 0.01, 3) + 1) * 0.5
            + (Math.hypot(dx, y + step - my * h) < 150 ? (1 - Math.hypot(dx, y + step - my * h) / 150) * 0.3 : 0)
          : adjusted;

        const crossH = (adjusted < threshold && right >= threshold) || (adjusted >= threshold && right < threshold);
        const crossV = (adjusted < threshold && below >= threshold) || (adjusted >= threshold && below < threshold);

        if (crossH) {
          const frac = (threshold - adjusted) / (right - adjusted);
          const ix = x + frac * step;
          ctx.moveTo(ix, y);
          ctx.arc(ix, y, 0.4, 0, Math.PI * 2);
        }
        if (crossV) {
          const frac = (threshold - adjusted) / (below - adjusted);
          const iy = y + frac * step;
          ctx.moveTo(x, iy);
          ctx.arc(x, iy, 0.4, 0, Math.PI * 2);
        }
      }
    }

    ctx.fillStyle = `hsla(${hue}, 40%, 50%, ${alpha})`;
    ctx.fill();
  }

  // Center ambient
  const ambient = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.4);
  ambient.addColorStop(0, `hsla(155, 35%, 40%, ${0.03 + Math.sin(t * 0.2) * 0.01})`);
  ambient.addColorStop(1, "transparent");
  ctx.fillStyle = ambient;
  ctx.fillRect(0, 0, w, h);
};
