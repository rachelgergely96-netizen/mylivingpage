import type { ThemeRenderer } from "../types";

/** Falling code rain columns with glowing lead characters */
export const renderMatrix: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const cols = Math.floor(w / 18);
  const charH = 16;

  // Background horizontal data streams
  for (let i = 0; i < 5; i++) {
    const seed = i * 193.7;
    const streamY = (Math.sin(seed * 1.3) * 0.5 + 0.5) * h;
    const streamX = ((t * (15 + i * 5) + seed * 50) % (w * 1.5)) - w * 0.25;
    const streamLen = 60 + Math.sin(seed) * 30;
    const grad = ctx.createLinearGradient(streamX, streamY, streamX + streamLen, streamY);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(0.5, `hsla(140, 50%, 35%, ${0.015 + Math.sin(t * 0.3 + seed) * 0.005})`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(streamX, streamY - 1, streamLen, 2);
  }

  // Code rain columns
  for (let c = 0; c < cols; c++) {
    const seed = c * 47.3;
    const speed = 0.6 + (Math.sin(seed * 1.7) * 0.5 + 0.5) * 0.8;

    // Mouse Y affects speed near cursor
    const colX = c * 18 + 9;
    const mouseDistX = Math.abs(colX / w - mx);
    const mouseDistY = Math.abs(0.5 - my);
    const speedMod = mouseDistX < 0.15 ? 1 + (1 - mouseDistX / 0.15) * mouseDistY * 0.8 : 1;

    const offset = (t * 40 * speed * speedMod + seed * 100) % (h + charH * 20);
    const mouseBoost = Math.max(0, 1 - mouseDistX * 4);

    // Draw column of fading characters
    const chars = 12 + Math.floor(Math.sin(seed * 2.3) * 4);
    for (let r = 0; r < chars; r++) {
      const y = offset - r * charH;
      if (y < -charH || y > h + charH) continue;

      const life = 1 - r / chars;
      const alpha = life * (0.4 + mouseBoost * 0.3);
      const brightness = r === 0 ? 85 : 40 + life * 20;

      ctx.font = "13px monospace";
      ctx.fillStyle = `hsla(140, 80%, ${brightness}%, ${alpha})`;

      // Pseudo-random character from seed
      const charCode = 0x30A0 + ((seed * 17 + r * 31 + Math.floor(t * 2 + r * 0.3)) % 96);
      ctx.fillText(String.fromCharCode(charCode), colX, y);
    }

    // Lead character glow
    const leadY = offset;
    if (leadY > 0 && leadY < h) {
      const glow = ctx.createRadialGradient(colX, leadY, 0, colX, leadY, 20);
      glow.addColorStop(0, `hsla(140, 90%, 65%, ${0.15 + mouseBoost * 0.1})`);
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(colX - 20, leadY - 20, 40, 40);
    }
  }

  // Occasional glitch flash
  const glitchPhase = Math.sin(t * 0.2 + 7.3);
  if (glitchPhase > 0.97) {
    const gx = (Math.sin(Math.floor(t * 0.2) * 137.5) * 0.5 + 0.5) * (w - 50);
    const gy = (Math.cos(Math.floor(t * 0.2) * 97.3) * 0.5 + 0.5) * (h - 50);
    ctx.fillStyle = `hsla(140, 80%, 50%, ${(glitchPhase - 0.97) * 3})`;
    ctx.fillRect(gx, gy, 50, 50);
  }

  // Ambient green glow at bottom
  const bottomGlow = ctx.createLinearGradient(0, h, 0, h * 0.85);
  bottomGlow.addColorStop(0, "hsla(140, 50%, 15%, 0.04)");
  bottomGlow.addColorStop(1, "transparent");
  ctx.fillStyle = bottomGlow;
  ctx.fillRect(0, 0, w, h);

  // Scanline effect
  for (let y = 0; y < h; y += 3) {
    ctx.fillStyle = `rgba(0,0,0,${0.08 + Math.sin(y * 0.5 + t) * 0.02})`;
    ctx.fillRect(0, y, w, 1);
  }
};
