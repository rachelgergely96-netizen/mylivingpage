import type { ThemeRenderer } from "../types";

/** Refracting light shards rotate through spectral color splits while rainbow caustics dance on a dark surface */
export const renderPrism: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  // Prism center tracks toward mouse
  const cx = w / 2 + (mx - 0.5) * w * 0.12;
  const cy = h / 2 + (my - 0.5) * h * 0.12;

  // Spectral rays
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + t * 0.15;
    const len = w * 0.25 + Math.sin(t * 0.3 + i * 1.2) * w * 0.08;
    const spread = 0.06 + Math.sin(t * 0.2 + i) * 0.02;

    const offsets = [
      { hue: 0, offset: -spread },
      { hue: 120, offset: 0 },
      { hue: 240, offset: spread },
    ];

    for (const { hue, offset } of offsets) {
      const a = angle + offset;
      const x1 = cx + Math.cos(a) * 20;
      const y1 = cy + Math.sin(a) * 20;
      const x2 = cx + Math.cos(a) * len;
      const y2 = cy + Math.sin(a) * len;

      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, `hsla(${hue + i * 30 + t * 10}, 80%, 55%, 0.12)`);
      grad.addColorStop(0.5, `hsla(${hue + i * 30 + t * 10 + 20}, 75%, 50%, 0.06)`);
      grad.addColorStop(1, "transparent");

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Rainbow caustic patches on lower canvas
  for (let i = 0; i < 7; i++) {
    const seed = i * 89.1;
    const px = (Math.sin(seed * 1.7 + t * 0.08) * 0.4 + 0.5) * w;
    const py = h * (0.6 + Math.sin(seed * 0.9) * 0.15) + Math.sin(t * 0.3 + seed) * 10;
    const rx = 25 + Math.sin(seed) * 10;
    const ry = 8 + Math.sin(seed * 1.3) * 4;
    const hue = (i * 51 + t * 12) % 360;
    const alpha = 0.04 + Math.sin(t * 0.5 + seed) * 0.015;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.sin(t * 0.1 + seed) * 0.3);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 70%, 55%, ${alpha})`;
    ctx.fill();
    ctx.restore();
  }

  // Spectral dust particles that light up inside ray beams
  for (let i = 0; i < 30; i++) {
    const seed = i * 47.3;
    const px = (Math.sin(seed * 2.1 + t * 0.04) * 0.5 + 0.5) * w;
    const py = (Math.cos(seed * 1.7 + t * 0.03) * 0.5 + 0.5) * h;
    const angleToCenter = Math.atan2(py - cy, px - cx);
    const distToCenter = Math.hypot(px - cx, py - cy);

    // Check if near a ray beam
    const rayIndex = Math.round(((angleToCenter - t * 0.15) / (Math.PI * 2)) * 12) % 12;
    const rayAngle = (rayIndex / 12) * Math.PI * 2 + t * 0.15;
    const angleDiff = Math.abs(angleToCenter - rayAngle);
    const inBeam = angleDiff < 0.15 && distToCenter < w * 0.25;
    const hue = (rayIndex * 30 + t * 10) % 360;

    ctx.beginPath();
    ctx.arc(px, py, inBeam ? 1.5 : 0.6, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, ${inBeam ? 80 : 40}%, ${inBeam ? 70 : 50}%, ${inBeam ? 0.2 : 0.04})`;
    ctx.fill();
  }

  // Orbiting colored particles
  for (let i = 0; i < 20; i++) {
    const seed = i * 67.3;
    const x = (Math.sin(t * 0.15 + seed) * 0.4 + 0.5) * w;
    const y = (Math.cos(t * 0.12 + seed * 1.3) * 0.4 + 0.5) * h;
    const r = 3 + Math.sin(t * 0.5 + i) * 2;
    const hue = (i * 36 + t * 15) % 360;

    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
    g.addColorStop(0, `hsla(${hue}, 80%, 60%, 0.12)`);
    g.addColorStop(0.5, `hsla(${hue + 30}, 70%, 50%, 0.04)`);
    g.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(x, y, r * 5, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }

  // Center prism glow
  const prismG = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30);
  prismG.addColorStop(0, `rgba(255,255,255,${0.06 + Math.sin(t * 0.4) * 0.02})`);
  prismG.addColorStop(1, "transparent");
  ctx.fillStyle = prismG;
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.fill();
};
