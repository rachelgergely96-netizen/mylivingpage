import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

export const renderRelay: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const background = ctx.createLinearGradient(0, 0, 0, h);
  background.addColorStop(0, "#071019");
  background.addColorStop(0.52, "#061119");
  background.addColorStop(1, "#03070A");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const ground = h * (0.82 + (my - 0.5) * 0.03);
  const towers = [0.12, 0.28, 0.46, 0.66, 0.84].map((pos, index) => {
    const x = w * pos + Math.sin(t * 0.18 + index) * 10;
    const height = h * (0.24 + index * 0.04);
    return { x, y: ground, top: ground - height };
  });

  for (const tower of towers) {
    ctx.beginPath();
    ctx.moveTo(tower.x, tower.y);
    ctx.lineTo(tower.x, tower.top);
    ctx.strokeStyle = "rgba(154, 206, 255, 0.16)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(tower.x - 10, tower.y);
    ctx.lineTo(tower.x, tower.top);
    ctx.lineTo(tower.x + 10, tower.y);
    ctx.strokeStyle = "rgba(154, 206, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(tower.x, tower.top, 4, 0, TAU);
    ctx.fillStyle = "rgba(212, 236, 255, 0.72)";
    ctx.fill();

    for (let ring = 0; ring < 3; ring += 1) {
      const phase = (t * 0.28 + ring * 0.3 + tower.x * 0.001) % 1;
      const radius = 10 + phase * 44;
      ctx.beginPath();
      ctx.arc(tower.x, tower.top, radius, Math.PI * 1.08, Math.PI * 1.92);
      ctx.strokeStyle = `rgba(126, 196, 255, ${(1 - phase) * 0.1})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  for (let i = 0; i < towers.length - 1; i += 1) {
    const from = towers[i];
    const to = towers[i + 1];
    const controlY = Math.min(from.top, to.top) - h * (0.08 + (i % 2) * 0.03) - (mx - 0.5) * 24;
    ctx.beginPath();
    ctx.moveTo(from.x, from.top);
    ctx.quadraticCurveTo((from.x + to.x) / 2, controlY, to.x, to.top);
    ctx.strokeStyle = "rgba(126, 196, 255, 0.12)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    for (let p = 0; p < 2; p += 1) {
      const progress = (t * (0.16 + p * 0.03) + i * 0.18 + p * 0.4) % 1;
      const x = (1 - progress) * (1 - progress) * from.x + 2 * (1 - progress) * progress * ((from.x + to.x) / 2) + progress * progress * to.x;
      const y = (1 - progress) * (1 - progress) * from.top + 2 * (1 - progress) * progress * controlY + progress * progress * to.top;

      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, TAU);
      ctx.fillStyle = "rgba(226, 243, 255, 0.72)";
      ctx.fill();
    }
  }

  ctx.fillStyle = "rgba(16, 28, 38, 0.68)";
  ctx.fillRect(0, ground, w, h - ground);
};
