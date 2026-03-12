import type { ThemeRenderer } from "../types";

function drawQuad(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  fill: CanvasGradient | string,
  stroke: string,
) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}

export const renderApex: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const background = ctx.createLinearGradient(0, 0, 0, h);
  background.addColorStop(0, "#08101F");
  background.addColorStop(0.58, "#050B16");
  background.addColorStop(1, "#03060B");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const vanishX = w * (0.5 + (mx - 0.5) * 0.22);
  const vanishY = h * (0.2 + (my - 0.5) * 0.08);
  const horizon = h * 0.68;
  const floorDepth = h - horizon;

  ctx.save();
  ctx.strokeStyle = "rgba(126, 175, 255, 0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 16; i += 1) {
    const x = (i / 16) * w;
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.lineTo(vanishX, horizon);
    ctx.stroke();
  }
  for (let i = 1; i <= 10; i += 1) {
    const depth = i / 10;
    const y = horizon + depth * depth * floorDepth;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.strokeStyle = `rgba(126, 175, 255, ${0.02 + (1 - depth) * 0.08})`;
    ctx.stroke();
  }
  ctx.restore();

  for (let i = 0; i < 9; i += 1) {
    const seed = i * 0.91 + 1.4;
    const centerX = w * (0.1 + i * 0.1 + Math.sin(seed * 1.7) * 0.015);
    const baseWidth = w * (0.045 + (Math.sin(seed * 2.1) * 0.5 + 0.5) * 0.05);
    const bodyHeight = h * (0.22 + (Math.sin(seed * 3.2) * 0.5 + 0.5) * 0.34);
    const pulse = 0.92 + Math.sin(t * (0.35 + i * 0.03) + seed) * 0.08;
    const panelHeight = bodyHeight * pulse;
    const baseY = horizon + 6;
    const topY = baseY - panelHeight;
    const skew = (centerX - vanishX) * 0.16;
    const topWidth = baseWidth * 0.42;
    const shimmer = 0.5 + 0.5 * Math.sin(t * 0.9 + seed * 4);

    const gradient = ctx.createLinearGradient(centerX, topY, centerX, baseY);
    gradient.addColorStop(0, `rgba(${28 + shimmer * 18}, ${70 + shimmer * 30}, 148, 0.52)`);
    gradient.addColorStop(1, "rgba(8, 16, 34, 0.18)");

    drawQuad(
      ctx,
      [
        [centerX - baseWidth / 2, baseY],
        [centerX - topWidth / 2 + skew, topY],
        [centerX + topWidth / 2 + skew, topY],
        [centerX + baseWidth / 2, baseY],
      ],
      gradient,
      `rgba(151, 197, 255, ${0.08 + shimmer * 0.22})`,
    );

    ctx.beginPath();
    ctx.moveTo(centerX + skew, topY);
    ctx.lineTo(vanishX, vanishY);
    ctx.strokeStyle = `rgba(130, 190, 255, ${0.04 + shimmer * 0.12})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    const beaconRadius = 2 + shimmer * 1.8;
    const beacon = ctx.createRadialGradient(centerX + skew, topY, 0, centerX + skew, topY, beaconRadius * 6);
    beacon.addColorStop(0, "rgba(187, 227, 255, 0.85)");
    beacon.addColorStop(1, "rgba(90, 140, 255, 0)");
    ctx.fillStyle = beacon;
    ctx.beginPath();
    ctx.arc(centerX + skew, topY, beaconRadius * 6, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 3; i += 1) {
    const sweep = t * (0.16 + i * 0.03) + i * 0.9;
    const beamX = vanishX + Math.sin(sweep) * w * 0.22;
    const beamWidth = w * (0.06 + i * 0.02);
    const beam = ctx.createLinearGradient(beamX, vanishY, beamX, h);
    beam.addColorStop(0, `rgba(140, 200, 255, ${0.08 - i * 0.015})`);
    beam.addColorStop(1, "rgba(20, 45, 90, 0)");
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(vanishX, vanishY);
    ctx.lineTo(beamX - beamWidth, h);
    ctx.lineTo(beamX + beamWidth, h);
    ctx.closePath();
    ctx.fill();
  }

  const halo = ctx.createRadialGradient(vanishX, vanishY, 0, vanishX, vanishY, w * 0.32);
  halo.addColorStop(0, "rgba(150, 205, 255, 0.18)");
  halo.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);
};
