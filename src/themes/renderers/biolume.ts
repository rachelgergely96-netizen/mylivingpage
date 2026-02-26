import type { ThemeRenderer } from "../types";

export const renderBiolume: ThemeRenderer = (ctx, w, h, t) => {
  const deep = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.5, w * 0.7);
  deep.addColorStop(0, "rgba(5, 30, 35, 0.06)");
  deep.addColorStop(1, "transparent");
  ctx.fillStyle = deep;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 8; i += 1) {
    const jx = (Math.sin(t * 0.08 + i * 2.5) * 0.35 + 0.5) * w;
    const jy = (Math.cos(t * 0.06 + i * 1.8) * 0.35 + 0.45) * h + Math.sin(t * 0.3 + i) * 10;
    const size = 12 + i * 3;
    const hue = 170 + Math.sin(i * 1.2) * 25;
    const pulse = 0.7 + Math.sin(t * 0.8 + i * 0.9) * 0.3;

    ctx.beginPath();
    ctx.ellipse(jx, jy, size * pulse, size * 0.6 * pulse, 0, Math.PI, 0);
    const bellG = ctx.createRadialGradient(jx, jy - size * 0.2, 0, jx, jy, size);
    bellG.addColorStop(0, `hsla(${hue}, 70%, 60%, ${0.12 * pulse})`);
    bellG.addColorStop(1, `hsla(${hue}, 60%, 40%, 0.02)`);
    ctx.fillStyle = bellG;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(jx, jy, size * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 65%, 55%, ${0.03 * pulse})`;
    ctx.fill();

    for (let ten = 0; ten < 5; ten += 1) {
      ctx.beginPath();
      const tenX = jx + (ten - 2) * (size * 0.35);
      ctx.moveTo(tenX, jy + size * 0.3);
      for (let seg = 1; seg <= 8; seg += 1) {
        const sy = jy + size * 0.3 + seg * (size * 0.25);
        const sx = tenX + Math.sin(t * 0.6 + i + ten * 0.5 + seg * 0.4) * (3 + seg * 0.8);
        ctx.lineTo(sx, sy);
      }
      ctx.strokeStyle = `hsla(${hue + 10}, 65%, 60%, ${0.06 * pulse})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }

  for (let i = 0; i < 50; i += 1) {
    const seed = i * 51.3;
    const x = ((Math.sin(seed * 2.3) * 0.5 + 0.5) * w + Math.sin(t * 0.15 + i) * 8) % w;
    const y = ((Math.cos(seed * 1.9) * 0.5 + 0.5) * h + Math.sin(t * 0.12 + i * 0.7) * 6) % h;
    const brightness = 0.1 + Math.sin(t * 1.2 + seed) * 0.08;
    ctx.beginPath();
    ctx.arc(x, y, 1, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${165 + Math.sin(i) * 20}, 65%, 60%, ${brightness})`;
    ctx.fill();
  }
};
