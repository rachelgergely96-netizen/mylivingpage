import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

function sampleRibbonY(x: number, baseY: number, amplitude: number, frequency: number, t: number, phase: number) {
  return (
    baseY
    + Math.sin(x * frequency + t * 0.8 + phase) * amplitude
    + Math.sin(x * frequency * 0.42 - t * 0.42 + phase * 1.6) * amplitude * 0.45
  );
}

export const renderSonata: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const background = ctx.createLinearGradient(0, 0, 0, h);
  background.addColorStop(0, "#140814");
  background.addColorStop(0.58, "#100610");
  background.addColorStop(1, "#060205");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const pointerLift = (my - 0.5) * h * 0.1;
  const ribbons = 5;

  for (let i = 0; i < ribbons; i += 1) {
    const baseY = h * (0.24 + i * 0.12);
    const amplitude = h * (0.028 + i * 0.004) + Math.abs(mx - 0.5) * 18;
    const frequency = 0.008 + i * 0.0009;
    const phase = i * 0.7;

    ctx.beginPath();
    for (let x = 0; x <= w; x += 18) {
      const y = sampleRibbonY(x, baseY + pointerLift * (0.24 - i * 0.03), amplitude, frequency, t, phase);
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.strokeStyle = `rgba(${219 - i * 8}, ${164 + i * 9}, ${214 + i * 6}, ${0.18 - i * 0.018})`;
    ctx.lineWidth = 1.6 - i * 0.12;
    ctx.stroke();

    for (let bead = 0; bead < 4; bead += 1) {
      const progress = (t * (0.06 + bead * 0.01) + bead * 0.2 + i * 0.12) % 1;
      const x = progress * w;
      const y = sampleRibbonY(x, baseY + pointerLift * (0.24 - i * 0.03), amplitude, frequency, t, phase);
      const glow = 6 + bead * 2;

      ctx.beginPath();
      ctx.arc(x, y, 2.1, 0, TAU);
      ctx.fillStyle = `rgba(255, 231, 210, ${0.6 - i * 0.05})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, glow, 0, TAU);
      ctx.fillStyle = `rgba(255, 187, 214, ${0.08 - i * 0.01})`;
      ctx.fill();

      if ((bead + i) % 2 === 0) {
        ctx.beginPath();
        ctx.moveTo(x + 1, y - 1);
        ctx.lineTo(x + 1, y - 16);
        ctx.strokeStyle = "rgba(255, 229, 214, 0.16)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  for (let i = 0; i < 42; i += 1) {
    const seed = i * 0.52 + 0.4;
    const progress = (t * (0.04 + (i % 3) * 0.01) + seed * 0.18) % 1;
    const x = (Math.sin(seed * 4.1) * 0.5 + 0.5) * w + Math.sin(t * 0.25 + seed) * 12;
    const y = h * 0.9 - progress * h * 0.88;
    ctx.beginPath();
    ctx.arc(x, y, 1.1, 0, TAU);
    ctx.fillStyle = `rgba(255, 215, 193, ${(1 - progress) * 0.14})`;
    ctx.fill();
  }
};
