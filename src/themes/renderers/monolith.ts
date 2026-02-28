import { noise2D } from "../shared/noise";
import type { ThemeRenderer } from "../types";

/** Rotating concentric wireframes pulse over a dot matrix grid in minimalist geometric motion */
export const renderMonolith: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const cxC = w / 2;
  const cyC = h / 2;
  const mxp = mx * w;
  const myp = my * h;

  // Dot grid with noise displacement and mouse gravitational lens
  const spacing = 28;
  for (let gx = spacing / 2; gx < w; gx += spacing) {
    for (let gy = spacing / 2; gy < h; gy += spacing) {
      const d = Math.hypot(gx - cxC, gy - cyC);
      const md = Math.hypot(gx - mxp, gy - myp);
      const wave = Math.sin(d * 0.015 - t * 0.8) * 0.5 + 0.5;
      const mouseWave = md < 100 ? (1 - md / 100) * 0.4 : 0;

      // Noise displacement
      const nDisp = noise2D(gx * 0.008 + t * 0.1, gy * 0.008) * 3;
      const drawX = gx + nDisp;
      const drawY = gy + noise2D(gx * 0.008, gy * 0.008 + t * 0.1) * 3;

      // Mouse gravitational pull
      let finalX = drawX;
      let finalY = drawY;
      if (md < 80 && md > 0) {
        const pull = (1 - md / 80) * 8;
        finalX += ((mxp - gx) / md) * pull;
        finalY += ((myp - gy) / md) * pull;
      }

      // Scan line brightness boost
      const scanY = ((t * 0.125) % 1) * h;
      const scanDist = Math.abs(finalY - scanY);
      const scanBoost = scanDist < 15 ? (1 - scanDist / 15) * 0.3 : 0;

      const r = 0.5 + wave * 0.8 + mouseWave * 2 + scanBoost * 1.5;
      const alpha = 0.04 + wave * 0.04 + mouseWave * 0.15 + scanBoost;
      ctx.beginPath();
      ctx.arc(finalX, finalY, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();
    }
  }

  // Outer polygons with inner spokes
  for (let ring = 0; ring < 6; ring++) {
    const sides = 4 + ring;
    const radius = w * 0.08 + ring * (w * 0.055);
    const rot = t * (0.15 + ring * 0.03) * (ring % 2 === 0 ? 1 : -1);
    const breathe = 1 + Math.sin(t * 0.4 + ring * 0.8) * 0.03;
    const alpha = 0.06 + Math.sin(t * 0.3 + ring) * 0.02;
    const r = radius * breathe;

    // Outer shape
    ctx.beginPath();
    const vertices: [number, number][] = [];
    for (let i = 0; i <= sides; i++) {
      const angle = (i / sides) * Math.PI * 2 + rot;
      const px = cxC + Math.cos(angle) * r;
      const py = cyC + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
      if (i < sides) vertices.push([px, py]);
    }
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Spokes from center to vertices
    for (const [vx, vy] of vertices) {
      ctx.beginPath();
      ctx.moveTo(cxC, cyC);
      ctx.lineTo(vx, vy);
      ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.3})`;
      ctx.lineWidth = 0.3;
      ctx.stroke();
    }
  }

  // Inner counter-rotating polygons
  for (let ring = 0; ring < 4; ring++) {
    const sides = 4 + ring;
    const radius = w * 0.03 + ring * (w * 0.025);
    const rot = -t * (0.2 + ring * 0.04) * (ring % 2 === 0 ? 1 : -1);
    const breathe = 1 + Math.sin(t * 0.5 + ring * 1.2) * 0.04;
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const angle = (i / sides) * Math.PI * 2 + rot;
      const px = cxC + Math.cos(angle) * radius * breathe;
      const py = cyC + Math.sin(angle) * radius * breathe;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = `rgba(255,255,255,${0.04 + Math.sin(t * 0.4 + ring) * 0.015})`;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  // Orbiting geometric particles
  for (let i = 0; i < 28; i++) {
    const seed = i * 53.7;
    const orbitR = w * 0.12 + Math.sin(seed * 1.3) * (w * 0.15);
    const orbitSpeed = 0.08 + (i % 5) * 0.02;
    const angle = t * orbitSpeed + seed;
    const px = cxC + Math.cos(angle) * orbitR * (1 + Math.sin(t * 0.3 + seed) * 0.1);
    const py = cyC + Math.sin(angle) * orbitR * (0.6 + Math.sin(seed * 0.7) * 0.3);
    const alpha = 0.06 + Math.sin(t * 0.8 + seed) * 0.03;
    const size = 1 + Math.sin(seed * 0.5) * 0.5;

    // Alternate between shapes
    if (i % 3 === 0) {
      // Tiny square
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(px - size, py - size, size * 2, size * 2);
    } else {
      // Tiny circle
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();
    }
  }

  // Expanding pulse rings from center
  for (let i = 0; i < 3; i++) {
    const phase = ((t * 0.33 + i * 0.33) % 1);
    const ringR = phase * Math.max(w, h) * 0.5;
    const ringAlpha = (1 - phase) * 0.06;
    if (ringAlpha > 0.005) {
      ctx.beginPath();
      ctx.arc(cxC, cyC, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${ringAlpha})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  // Center pulse glow
  const pulseR = 3 + Math.sin(t * 0.6) * 1.5;
  const pulseG = ctx.createRadialGradient(cxC, cyC, 0, cxC, cyC, pulseR * 15);
  pulseG.addColorStop(0, "rgba(255,255,255,0.08)");
  pulseG.addColorStop(1, "transparent");
  ctx.fillStyle = pulseG;
  ctx.beginPath();
  ctx.arc(cxC, cyC, pulseR * 15, 0, Math.PI * 2);
  ctx.fill();
};
