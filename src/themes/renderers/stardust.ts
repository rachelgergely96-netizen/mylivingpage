import type { ThemeRenderer } from "../types";

/** Spiraling galaxy arms with dense particle fields and color nebulae */
export const renderStardust: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const cx = w * 0.5 + (mx - 0.5) * 40;
  const cy = h * 0.5 + (my - 0.5) * 40;

  // Background star field for depth
  for (let i = 0; i < 55; i++) {
    const seed = i * 211.3;
    const x = (Math.sin(seed * 3.1) * 0.5 + 0.5) * w;
    const y = (Math.cos(seed * 2.7) * 0.5 + 0.5) * h;
    const twinkle = 0.3 + Math.sin(t * 0.8 + seed * 1.9) * 0.3;
    const size = 0.3 + Math.sin(seed * 0.5) * 0.2;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(220, 15%, 75%, ${twinkle * 0.08})`;
    ctx.fill();
  }

  // Nebula clouds
  for (let i = 0; i < 4; i++) {
    const angle = t * 0.05 + i * Math.PI * 0.5;
    const dist = w * 0.2 + Math.sin(t * 0.2 + i) * 30;
    const nx = cx + Math.cos(angle) * dist;
    const ny = cy + Math.sin(angle) * dist;
    const nebula = ctx.createRadialGradient(nx, ny, 0, nx, ny, w * 0.25);
    const hue = 240 + i * 40 + Math.sin(t * 0.3 + i) * 20;
    nebula.addColorStop(0, `hsla(${hue}, 60%, 25%, ${0.06 + Math.sin(t * 0.4 + i) * 0.02})`);
    nebula.addColorStop(0.6, `hsla(${hue + 20}, 40%, 15%, 0.02)`);
    nebula.addColorStop(1, "transparent");
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, w, h);
  }

  // Dark dust lanes between spiral arms
  for (let i = 0; i < 3; i++) {
    const armAngle = (i * (Math.PI * 2 / 3)) + Math.PI / 3; // offset from spiral arms
    const laneStart = t * 0.08 + armAngle;
    ctx.beginPath();
    for (let p = 0; p < 40; p++) {
      const progress = p / 40;
      const spiralAngle = laneStart + progress * Math.PI * 2.5;
      const d = progress * Math.min(w, h) * 0.4;
      const lx = cx + Math.cos(spiralAngle) * d;
      const ly = cy + Math.sin(spiralAngle) * d;
      if (p === 0) ctx.moveTo(lx, ly);
      else ctx.lineTo(lx, ly);
    }
    ctx.strokeStyle = `hsla(240, 20%, 5%, ${0.02 + Math.sin(t * 0.2 + i) * 0.005})`;
    ctx.lineWidth = 8 + Math.sin(i * 2.3) * 3;
    ctx.stroke();
  }

  // Spiral arm particles
  for (let i = 0; i < 120; i++) {
    const seed = i * 37.7;
    const armIndex = i % 3;
    const armAngle = armIndex * (Math.PI * 2 / 3);
    const progress = (seed * 0.01) % 1;
    const spiralAngle = armAngle + progress * Math.PI * 3 + t * 0.08;
    const dist = progress * Math.min(w, h) * 0.42;
    const spread = Math.sin(seed * 2.3) * (10 + progress * 20);

    const x = cx + Math.cos(spiralAngle) * dist + Math.sin(seed * 1.7) * spread;
    const y = cy + Math.sin(spiralAngle) * dist + Math.cos(seed * 1.3) * spread;

    if (x < -10 || x > w + 10 || y < -10 || y > h + 10) continue;

    const pulse = 0.4 + Math.sin(t * 2 + seed) * 0.3;
    const size = 0.5 + Math.sin(seed * 0.9) * 0.5 + pulse * 0.3;
    const hue = 200 + progress * 60 + Math.sin(seed * 0.5) * 30;
    const brightness = 60 + pulse * 20;

    // Nova flash on occasional particles
    const novaFlash = Math.sin(t * 0.25 + seed * 7.3) > 0.98 ? 0.4 : 0;

    ctx.beginPath();
    ctx.arc(x, y, size * 1.5 + novaFlash * 3, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 60%, ${brightness + novaFlash * 25}%, ${pulse * 0.7 + novaFlash})`;
    ctx.fill();

    // Larger faint glow for brighter stars
    if (i % 4 === 0 || novaFlash > 0) {
      ctx.beginPath();
      ctx.arc(x, y, size * 8 + novaFlash * 10, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 50%, ${brightness}%, ${pulse * 0.04 + novaFlash * 0.1})`;
      ctx.fill();
    }
  }

  // Central core glow
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40);
  core.addColorStop(0, `hsla(240, 50%, 60%, ${0.08 + Math.sin(t * 0.6) * 0.03})`);
  core.addColorStop(1, "transparent");
  ctx.fillStyle = core;
  ctx.fillRect(cx - 40, cy - 40, 80, 80);
};
