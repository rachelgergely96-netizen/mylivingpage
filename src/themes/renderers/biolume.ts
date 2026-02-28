import { fbm } from "../shared/noise";
import type { ThemeRenderer } from "../types";

/** Deep sea bioluminescent organisms pulse and drift with cyan-green phosphorescence */
export const renderBiolume: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  // Deep water ambient glow
  const deep = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.5, w * 0.7);
  deep.addColorStop(0, "rgba(5, 30, 35, 0.06)");
  deep.addColorStop(1, "transparent");
  ctx.fillStyle = deep;
  ctx.fillRect(0, 0, w, h);

  // Depth fog bands
  for (let i = 0; i < 3; i++) {
    const bandY = h * (0.3 + i * 0.25) + Math.sin(t * 0.15 + i * 2) * 20;
    const fog = ctx.createLinearGradient(0, bandY - 60, 0, bandY + 60);
    fog.addColorStop(0, "transparent");
    fog.addColorStop(0.5, `hsla(185, 40%, 10%, ${0.04 + Math.sin(t * 0.2 + i) * 0.01})`);
    fog.addColorStop(1, "transparent");
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, w, h);
  }

  // Underwater current flow lines
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 18; i++) {
    const seed = i * 67.3;
    const startX = (Math.sin(seed * 1.7) * 0.5 + 0.5) * w;
    const startY = (Math.cos(seed * 2.3) * 0.5 + 0.5) * h;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    let px = startX;
    let py = startY;
    for (let s = 0; s < 30; s++) {
      const angle = fbm(px * 0.003 + t * 0.02, py * 0.003, 2) * Math.PI * 2;
      px += Math.cos(angle) * 4;
      py += Math.sin(angle) * 4;
    }
    ctx.lineTo(px, py);
    ctx.strokeStyle = `hsla(180, 40%, 30%, ${0.015 + Math.sin(t * 0.3 + seed) * 0.005})`;
    ctx.stroke();
  }

  // Mouse bioluminescent wake
  const mxp = mx * w;
  const myp = my * h;
  const wake = ctx.createRadialGradient(mxp, myp, 0, mxp, myp, 90);
  wake.addColorStop(0, `hsla(175, 80%, 60%, ${0.06 + Math.sin(t * 2) * 0.02})`);
  wake.addColorStop(0.5, "hsla(180, 60%, 45%, 0.02)");
  wake.addColorStop(1, "transparent");
  ctx.fillStyle = wake;
  ctx.fillRect(mxp - 90, myp - 90, 180, 180);

  // Jellyfish with mouse repulsion
  for (let i = 0; i < 10; i++) {
    let jx = (Math.sin(t * 0.08 + i * 2.5) * 0.35 + 0.5) * w;
    let jy = (Math.cos(t * 0.06 + i * 1.8) * 0.35 + 0.45) * h + Math.sin(t * 0.3 + i) * 10;

    // Repel from mouse
    const dx = jx - mxp;
    const dy = jy - myp;
    const dist = Math.hypot(dx, dy);
    if (dist < 200 && dist > 0) {
      const push = (1 - dist / 200) * 40;
      jx += (dx / dist) * push;
      jy += (dy / dist) * push;
    }

    const size = 12 + i * 3;
    const hue = 170 + Math.sin(i * 1.2) * 25;
    const pulse = 0.7 + Math.sin(t * 0.8 + i * 0.9) * 0.3;

    // Bell shape
    ctx.beginPath();
    ctx.ellipse(jx, jy, size * pulse, size * 0.6 * pulse, 0, Math.PI, 0);
    const bellG = ctx.createRadialGradient(jx, jy - size * 0.2, 0, jx, jy, size);
    bellG.addColorStop(0, `hsla(${hue}, 70%, 60%, ${0.12 * pulse})`);
    bellG.addColorStop(1, `hsla(${hue}, 60%, 40%, 0.02)`);
    ctx.fillStyle = bellG;
    ctx.fill();

    // Inner bell glow
    ctx.beginPath();
    ctx.ellipse(jx, jy - size * 0.15, size * 0.4 * pulse, size * 0.25 * pulse, 0, Math.PI, 0);
    ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${0.08 * pulse})`;
    ctx.fill();

    // Outer glow
    ctx.beginPath();
    ctx.arc(jx, jy, size * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 65%, 55%, ${0.03 * pulse})`;
    ctx.fill();

    // Tentacles (7 per jellyfish, 12 segments)
    for (let ten = 0; ten < 7; ten++) {
      ctx.beginPath();
      const tenX = jx + (ten - 3) * (size * 0.28);
      ctx.moveTo(tenX, jy + size * 0.3);
      for (let seg = 1; seg <= 12; seg++) {
        const sy = jy + size * 0.3 + seg * (size * 0.22);
        const sx = tenX + Math.sin(t * 0.6 + i + ten * 0.5 + seg * 0.4) * (3 + seg * 0.8);
        ctx.lineTo(sx, sy);
      }
      ctx.strokeStyle = `hsla(${hue + 10}, 65%, 60%, ${0.06 * pulse})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }

  // Plankton with mouse attraction and bioluminescent flash
  for (let i = 0; i < 80; i++) {
    const seed = i * 51.3;
    let x = ((Math.sin(seed * 2.3) * 0.5 + 0.5) * w + Math.sin(t * 0.15 + i) * 8) % w;
    let y = ((Math.cos(seed * 1.9) * 0.5 + 0.5) * h + Math.sin(t * 0.12 + i * 0.7) * 6) % h;

    // Attract toward mouse
    const pdx = mxp - x;
    const pdy = myp - y;
    const pdist = Math.hypot(pdx, pdy);
    if (pdist < 120 && pdist > 0) {
      const pull = (1 - pdist / 120) * 15;
      x += (pdx / pdist) * pull;
      y += (pdy / pdist) * pull;
    }

    // Occasional bioluminescent flash
    const flashTrigger = Math.sin(t * 1.8 + seed * 3.7);
    const flash = flashTrigger > 0.95 ? (flashTrigger - 0.95) * 20 : 0;
    const brightness = 0.1 + Math.sin(t * 1.2 + seed) * 0.08 + flash * 0.4;

    ctx.beginPath();
    ctx.arc(x, y, 1 + flash * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${165 + Math.sin(i) * 20}, 65%, ${60 + flash * 25}%, ${brightness})`;
    ctx.fill();

    // Flash glow ring
    if (flash > 0) {
      ctx.beginPath();
      ctx.arc(x, y, 8 + flash * 6, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(170, 70%, 65%, ${flash * 0.08})`;
      ctx.fill();
    }
  }

  // Floating organic debris
  for (let i = 0; i < 15; i++) {
    const seed = i * 113.7;
    const x = (Math.sin(seed * 1.9 + t * 0.03) * 0.5 + 0.5) * w;
    const y = (Math.cos(seed * 1.4 + t * 0.02) * 0.5 + 0.5) * h;
    const angle = t * 0.1 + seed;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, 2 + Math.sin(seed) * 1, 0.8, 0, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(175, 30%, 40%, ${0.03 + Math.sin(t * 0.5 + seed) * 0.01})`;
    ctx.fill();
    ctx.restore();
  }
};
