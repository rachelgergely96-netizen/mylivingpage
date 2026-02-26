import type { ThemeRenderer } from "../types";

export const renderMonolith: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const cx = w / 2;
  const cy = h / 2;

  const spacing = 28;
  for (let gx = spacing / 2; gx < w; gx += spacing) {
    for (let gy = spacing / 2; gy < h; gy += spacing) {
      const d = Math.hypot(gx - cx, gy - cy);
      const md = Math.hypot(gx - mx * w, gy - my * h);
      const wave = Math.sin(d * 0.015 - t * 0.8) * 0.5 + 0.5;
      const mouseWave = md < 100 ? (1 - md / 100) * 0.4 : 0;
      const r = 0.5 + wave * 0.8 + mouseWave * 2;
      const alpha = 0.04 + wave * 0.04 + mouseWave * 0.15;
      ctx.beginPath();
      ctx.arc(gx, gy, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();
    }
  }

  for (let ring = 0; ring < 6; ring += 1) {
    const sides = 4 + ring;
    const radius = w * 0.08 + ring * (w * 0.055);
    const rot = t * (0.15 + ring * 0.03) * (ring % 2 === 0 ? 1 : -1);
    const breathe = 1 + Math.sin(t * 0.4 + ring * 0.8) * 0.03;
    const alpha = 0.06 + Math.sin(t * 0.3 + ring) * 0.02;

    ctx.beginPath();
    for (let i = 0; i <= sides; i += 1) {
      const angle = (i / sides) * Math.PI * 2 + rot;
      const r = radius * breathe;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  const pulseR = 3 + Math.sin(t * 0.6) * 1.5;
  const pulseG = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseR * 15);
  pulseG.addColorStop(0, "rgba(255,255,255,0.08)");
  pulseG.addColorStop(1, "transparent");
  ctx.fillStyle = pulseG;
  ctx.beginPath();
  ctx.arc(cx, cy, pulseR * 15, 0, Math.PI * 2);
  ctx.fill();
};
