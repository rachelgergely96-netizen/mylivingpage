import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

function strataY(x: number, w: number, h: number, layer: number, t: number) {
  const normalized = x / Math.max(w, 1);
  return (
    h * (0.1 + layer * 0.115) +
    Math.sin(normalized * 6.2 + layer * 0.82 + t * 0.08) * (8 + layer * 0.8) +
    Math.sin(normalized * 14.5 - layer * 0.34) * 3
  );
}

export const renderQuarry: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const background = ctx.createLinearGradient(0, 0, w, h);
  background.addColorStop(0, "#120D09");
  background.addColorStop(0.5, "#0A0705");
  background.addColorStop(1, "#030302");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const palette = [
    [62, 42, 29],
    [79, 51, 35],
    [50, 37, 29],
    [91, 59, 38],
    [55, 40, 31],
    [77, 50, 34],
    [43, 33, 27],
    [66, 45, 33],
  ];

  for (let layer = 0; layer < palette.length; layer += 1) {
    const top: Array<[number, number]> = [];
    const bottom: Array<[number, number]> = [];
    const thickness = h * (0.13 + (layer % 3) * 0.008);
    for (let x = -12; x <= w + 12; x += Math.max(20, w / 18)) {
      const topY = strataY(x, w, h, layer, t) + (my - 0.5) * (layer + 1) * 1.5;
      top.push([x, topY]);
      bottom.push([x, topY + thickness + Math.cos(x * 0.012 + layer) * 5]);
    }

    ctx.beginPath();
    ctx.moveTo(top[0][0], top[0][1]);
    top.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
    bottom.slice().reverse().forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.closePath();

    const [r, g, b] = palette[layer];
    const fill = ctx.createLinearGradient(0, top[0][1], w, bottom[0][1]);
    fill.addColorStop(0, `rgba(${Math.max(0, r - 18)}, ${Math.max(0, g - 12)}, ${Math.max(0, b - 8)}, 0.9)`);
    fill.addColorStop(0.58, `rgba(${r}, ${g}, ${b}, 0.96)`);
    fill.addColorStop(1, `rgba(${r + 18}, ${g + 12}, ${b + 7}, 0.88)`);
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.beginPath();
    top.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = `rgba(239, 177, 113, ${0.12 + (layer % 3) * 0.025})`;
    ctx.lineWidth = 1.15;
    ctx.stroke();
  }

  const faultX = w * (0.7 + (mx - 0.5) * 0.08);
  const faultPoints: Array<[number, number]> = [];
  for (let y = -20; y <= h + 20; y += h / 12) {
    const normalized = y / Math.max(h, 1);
    const x = faultX + Math.sin(normalized * 10.4 + t * 0.12) * w * 0.035 + Math.sin(normalized * 27) * w * 0.01;
    faultPoints.push([x, y]);
  }

  ctx.save();
  ctx.shadowColor = "rgba(255, 143, 61, 0.52)";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  faultPoints.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "rgba(255, 166, 91, 0.34)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  faultPoints.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "rgba(255, 220, 174, 0.52)";
  ctx.lineWidth = 0.65;
  ctx.stroke();

  for (let branch = 0; branch < 5; branch += 1) {
    const anchor = faultPoints[2 + branch * 2];
    if (!anchor) continue;
    const direction = branch % 2 === 0 ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(anchor[0], anchor[1]);
    ctx.lineTo(anchor[0] + direction * w * (0.06 + branch * 0.012), anchor[1] + h * 0.045);
    ctx.lineTo(anchor[0] + direction * w * (0.1 + branch * 0.008), anchor[1] + h * 0.09);
    ctx.strokeStyle = "rgba(236, 144, 77, 0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  for (let i = 0; i < 86; i += 1) {
    const seed = i * 0.621 + 0.16;
    const x = (Math.sin(seed * 5.1) * 0.5 + 0.5) * w;
    const y = (Math.cos(seed * 3.9) * 0.5 + 0.5) * h;
    const radius = 0.45 + (i % 4) * 0.24;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fillStyle = `rgba(246, 218, 188, ${0.025 + (i % 5) * 0.008})`;
    ctx.fill();
  }

  const light = ctx.createLinearGradient(w * 0.42, 0, w, 0);
  light.addColorStop(0, "rgba(255, 201, 143, 0)");
  light.addColorStop(1, "rgba(255, 190, 125, 0.07)");
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, w, h);
};
