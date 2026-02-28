import type { ThemeRenderer } from "../types";

/** Falling code rain columns with glowing lead characters */
export const renderMatrix: ThemeRenderer = (ctx, w, h, t, mx) => {
  const cols = Math.floor(w / 18);
  const charH = 16;

  for (let c = 0; c < cols; c++) {
    const seed = c * 47.3;
    const speed = 0.6 + (Math.sin(seed * 1.7) * 0.5 + 0.5) * 0.8;
    const colX = c * 18 + 9;
    const offset = (t * 40 * speed + seed * 100) % (h + charH * 20);
    const mouseBoost = Math.max(0, 1 - Math.abs(colX / w - mx) * 4);

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

  // Scanline effect
  for (let y = 0; y < h; y += 3) {
    ctx.fillStyle = `rgba(0,0,0,${0.08 + Math.sin(y * 0.5 + t) * 0.02})`;
    ctx.fillRect(0, y, w, 1);
  }
};
