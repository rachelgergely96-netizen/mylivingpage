import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

export const renderTulle: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const background = ctx.createLinearGradient(0, 0, w, h);
  background.addColorStop(0, "#0E0D16");
  background.addColorStop(0.42, "#10111D");
  background.addColorStop(1, "#06070B");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const spacing = Math.max(26, Math.min(42, Math.min(w, h) * 0.06));
  const pointerX = mx * w;
  const pointerY = my * h;

  for (let row = 0; row <= Math.ceil(h / spacing) + 1; row += 1) {
    for (let col = 0; col <= Math.ceil(w / spacing) + 1; col += 1) {
      const baseX = col * spacing;
      const baseY = row * spacing;
      const offsetX = Math.sin(baseY * 0.016 + t * 0.8 + col * 0.3) * 8;
      const offsetY = Math.cos(baseX * 0.016 - t * 0.7 + row * 0.22) * 8;
      const dist = Math.hypot(baseX - pointerX, baseY - pointerY);
      const pull = dist < spacing * 2.2 ? (1 - dist / (spacing * 2.2)) * 10 : 0;
      const x = baseX + offsetX + (pointerX - baseX) * (pull / Math.max(1, dist));
      const y = baseY + offsetY + (pointerY - baseY) * (pull / Math.max(1, dist));

      if (col < Math.ceil(w / spacing)) {
        const nextBaseX = (col + 1) * spacing;
        const nextOffsetX = Math.sin(baseY * 0.016 + t * 0.8 + (col + 1) * 0.3) * 8;
        const nextOffsetY = Math.cos(nextBaseX * 0.016 - t * 0.7 + row * 0.22) * 8;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(nextBaseX + nextOffsetX, baseY + nextOffsetY);
        ctx.strokeStyle = "rgba(213, 226, 255, 0.08)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      if (row < Math.ceil(h / spacing)) {
        const nextBaseY = (row + 1) * spacing;
        const nextOffsetX = Math.sin(nextBaseY * 0.016 + t * 0.8 + col * 0.3) * 8;
        const nextOffsetY = Math.cos(baseX * 0.016 - t * 0.7 + (row + 1) * 0.22) * 8;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(baseX + nextOffsetX, nextBaseY + nextOffsetY);
        ctx.strokeStyle = "rgba(213, 226, 255, 0.06)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      if ((row + col) % 3 === 0) {
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, TAU);
        ctx.fillStyle = "rgba(246, 241, 255, 0.2)";
        ctx.fill();
      }
    }
  }
};
