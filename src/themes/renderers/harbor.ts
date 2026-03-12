import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

export const renderHarbor: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const background = ctx.createLinearGradient(0, 0, 0, h);
  background.addColorStop(0, "#08111B");
  background.addColorStop(0.5, "#091521");
  background.addColorStop(1, "#04070B");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const horizon = h * (0.5 + (my - 0.5) * 0.04);
  const leftTowerX = w * 0.18;
  const rightTowerX = w * 0.82;
  const beamAngleA = -0.34 + Math.sin(t * 0.34) * 0.16 + (mx - 0.5) * 0.25;
  const beamAngleB = Math.PI + 0.34 + Math.cos(t * 0.28) * 0.16 + (mx - 0.5) * 0.25;
  const beamLength = Math.max(w, h) * 0.82;

  const drawBeam = (x: number, angle: number, tint: string) => {
    ctx.beginPath();
    ctx.moveTo(x, horizon - 24);
    ctx.lineTo(x + Math.cos(angle - 0.12) * beamLength, horizon - 24 + Math.sin(angle - 0.12) * beamLength);
    ctx.lineTo(x + Math.cos(angle + 0.12) * beamLength, horizon - 24 + Math.sin(angle + 0.12) * beamLength);
    ctx.closePath();

    const beam = ctx.createLinearGradient(x, horizon - 24, x + Math.cos(angle) * beamLength, horizon + Math.sin(angle) * beamLength);
    beam.addColorStop(0, tint);
    beam.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = beam;
    ctx.fill();
  };

  drawBeam(leftTowerX, beamAngleA, "rgba(154, 211, 255, 0.11)");
  drawBeam(rightTowerX, beamAngleB, "rgba(255, 218, 166, 0.09)");

  ctx.strokeStyle = "rgba(150, 192, 225, 0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  ctx.lineTo(w, horizon);
  ctx.stroke();

  const lights = [
    [leftTowerX, "#9ED4FF"],
    [w * 0.42, "#FFD296"],
    [rightTowerX, "#9ED4FF"],
    [w * 0.66, "#FFD296"],
  ] as const;

  for (const [x, color] of lights) {
    ctx.beginPath();
    ctx.arc(x, horizon - 6, 2.4, 0, TAU);
    ctx.fillStyle = color;
    ctx.fill();

    const reflection = ctx.createLinearGradient(x, horizon, x, h);
    reflection.addColorStop(0, color === "#9ED4FF" ? "rgba(158, 212, 255, 0.18)" : "rgba(255, 210, 150, 0.16)");
    reflection.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = reflection;
    ctx.fillRect(x - 3, horizon, 6, h - horizon);
  }

  for (let y = horizon; y < h; y += 8) {
    const depth = (y - horizon) / Math.max(1, h - horizon);
    const wave = Math.sin(y * 0.045 + t * 1.4) * 8;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 22) {
      const beamLiftA = Math.max(0, 1 - Math.abs(x - (leftTowerX + Math.cos(beamAngleA) * depth * beamLength * 0.5)) / 120);
      const beamLiftB = Math.max(0, 1 - Math.abs(x - (rightTowerX + Math.cos(beamAngleB) * depth * beamLength * 0.5)) / 120);
      const yOffset = Math.sin(x * 0.014 + t * 1.8 + depth * 8) * (2 + depth * 5) + wave * 0.1;
      ctx.lineTo(x, y + yOffset);
      ctx.strokeStyle = `rgba(120, 156, 190, ${0.04 + (1 - depth) * 0.06 + beamLiftA * 0.05 + beamLiftB * 0.05})`;
    }
    ctx.lineWidth = 1;
    ctx.stroke();
  }
};
