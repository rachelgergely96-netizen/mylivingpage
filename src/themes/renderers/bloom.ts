import type { ThemeRenderer } from "../types";

// Pollen particle state
interface Pollen {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  r: number;
}

const pollen: Pollen[] = [];
let pollenInit = false;

function initPollen(w: number, h: number) {
  pollen.length = 0;
  for (let i = 0; i < 120; i++) {
    const seed = i * 37.3;
    pollen.push({
      x: Math.abs(Math.sin(seed * 127.1)) * w,
      y: Math.abs(Math.sin(seed * 311.7)) * h,
      vx: (Math.sin(seed * 73.1) * 0.4),
      vy: -(0.3 + Math.abs(Math.sin(seed * 53.9)) * 0.5),
      alpha: 0.3 + Math.abs(Math.sin(seed * 89.3)) * 0.5,
      r: 1 + Math.abs(Math.sin(seed * 43.7)) * 1.5,
    });
  }
}

function drawPetal(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number,
  length: number,
  width: number,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(
    width, -length * 0.3,
    width, -length * 0.7,
    0, -length,
  );
  ctx.bezierCurveTo(
    -width, -length * 0.7,
    -width, -length * 0.3,
    0, 0,
  );
  ctx.closePath();
  ctx.restore();
}

export const renderBloom: ThemeRenderer = (ctx, width, height, time, mouseX, mouseY) => {
  if (!pollenInit) {
    initPollen(width, height);
    pollenInit = true;
  }

  // Clear
  ctx.fillStyle = "#0a0514";
  ctx.fillRect(0, 0, width, height);

  const mx = mouseX * width;
  const my = mouseY * height;

  // Flowers — 10 at seeded positions
  const flowerCount = 10;
  for (let i = 0; i < flowerCount; i++) {
    const seed = i * 61.3;
    const fx = Math.abs(Math.sin(seed * 127.1)) * width;
    const fy = Math.abs(Math.sin(seed * 311.7)) * height;

    // Mouse proximity boosts bloom speed
    const dist = Math.hypot(mx - fx, my - fy);
    const boost = dist < 200 ? 1 + (1 - dist / 200) * 2.5 : 1;

    const speed = (0.25 + Math.abs(Math.sin(seed * 53.9)) * 0.3) * boost;
    const phase = Math.abs(Math.sin(seed * 73.1)) * Math.PI * 2;
    const bloom = 0.5 + 0.5 * Math.sin(time * speed + phase);

    const petalCount = 5 + Math.floor(Math.abs(Math.sin(seed * 43.7)) * 4);
    const baseSize = (28 + Math.abs(Math.sin(seed * 89.3)) * 40) * bloom;
    const petalWidth = baseSize * 0.38;

    // Base hue: magenta (300) to lavender (270) range, varied per flower
    const hue = 270 + Math.abs(Math.sin(seed * 31.7)) * 60;
    const sat = 55 + Math.abs(Math.sin(seed * 19.1)) * 30;

    ctx.save();
    ctx.globalAlpha = 0.75 + bloom * 0.25;

    // Outer petals (slightly darker, larger)
    for (let p = 0; p < petalCount; p++) {
      const angle = (p / petalCount) * Math.PI * 2 + time * 0.04;
      const lightness = 28 + bloom * 18;
      ctx.fillStyle = `hsl(${hue}, ${sat}%, ${lightness}%)`;
      ctx.beginPath();
      drawPetal(ctx, fx, fy, angle, baseSize * 1.1, petalWidth * 1.05);
      ctx.fill();
    }

    // Inner petals (brighter, smaller)
    for (let p = 0; p < petalCount; p++) {
      const angle = (p / petalCount) * Math.PI * 2 + Math.PI / petalCount + time * 0.04;
      const lightness = 42 + bloom * 22;
      ctx.fillStyle = `hsl(${hue + 15}, ${sat + 10}%, ${lightness}%)`;
      ctx.beginPath();
      drawPetal(ctx, fx, fy, angle, baseSize * 0.72, petalWidth * 0.7);
      ctx.fill();
    }

    // Center — golden
    ctx.globalAlpha = 0.9;
    const centerR = baseSize * 0.18 + 2;
    const grad = ctx.createRadialGradient(fx, fy, 0, fx, fy, centerR);
    grad.addColorStop(0, `rgba(255, 220, 80, ${0.9 * bloom + 0.1})`);
    grad.addColorStop(1, `rgba(200, 140, 30, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(fx, fy, centerR, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Pollen particles
  for (const p of pollen) {
    p.x += p.vx + Math.sin(time * 0.8 + p.y * 0.005) * 0.3;
    p.y += p.vy;

    if (p.y < -10) {
      const fi = Math.floor(Math.random() * flowerCount);
      const fseed = fi * 61.3;
      p.x = Math.abs(Math.sin(fseed * 127.1)) * width;
      p.y = Math.abs(Math.sin(fseed * 311.7)) * height;
    }
    if (p.x < 0) p.x = width;
    if (p.x > width) p.x = 0;

    ctx.save();
    ctx.globalAlpha = p.alpha * (0.5 + 0.5 * Math.sin(time * 1.2 + p.x * 0.01));
    ctx.fillStyle = `rgba(255, 215, 60, 1)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Ambient glow overlay — soft bloom on top
  const vignette = ctx.createRadialGradient(
    width / 2, height / 2, height * 0.1,
    width / 2, height / 2, height * 0.85,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(5,2,10,0.55)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
};
