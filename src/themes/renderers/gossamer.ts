import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

export const renderGossamer: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const background = ctx.createLinearGradient(0, 0, 0, h);
  background.addColorStop(0, "#0B1119");
  background.addColorStop(0.54, "#091019");
  background.addColorStop(1, "#04070C");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const webs: Array<[number, number, number]> = [
    [w * 0.24, h * 0.28, Math.min(w, h) * 0.16],
    [w * 0.72, h * 0.44, Math.min(w, h) * 0.13],
    [w * 0.5, h * 0.72, Math.min(w, h) * 0.19],
  ];

  for (let wi = 0; wi < webs.length; wi += 1) {
    const [cx, cy, radius] = webs[wi];
    const rings = 4;
    const spokes = 10;

    for (let ring = 1; ring <= rings; ring += 1) {
      ctx.beginPath();
      for (let spoke = 0; spoke <= spokes; spoke += 1) {
        const angle = (spoke / spokes) * TAU + wi * 0.3 + Math.sin(t * 0.14 + wi) * 0.08;
        const r = radius * (ring / rings) * (0.94 + Math.sin(spoke * 0.8 + ring + t * 0.3) * 0.04);
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r * (0.84 + ring * 0.03);
        if (spoke === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.strokeStyle = `rgba(198, 224, 255, ${0.06 + ring * 0.015})`;
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }

    for (let spoke = 0; spoke < spokes; spoke += 1) {
      const angle = (spoke / spokes) * TAU + wi * 0.3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let ring = 1; ring <= rings; ring += 1) {
        const r = radius * (ring / rings);
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r * (0.84 + ring * 0.03);
        ctx.lineTo(x, y);

        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, TAU);
        ctx.fillStyle = `rgba(219, 241, 255, ${0.12 + ring * 0.03})`;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
      }
      ctx.strokeStyle = "rgba(182, 214, 255, 0.06)";
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
  }

  const pointerGlow = ctx.createRadialGradient(mx * w, my * h, 0, mx * w, my * h, Math.min(w, h) * 0.18);
  pointerGlow.addColorStop(0, "rgba(205, 235, 255, 0.12)");
  pointerGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = pointerGlow;
  ctx.fillRect(0, 0, w, h);
};
