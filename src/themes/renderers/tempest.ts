import { fbm } from "../shared/noise";
import type { ThemeRenderer } from "../types";

// Lightning bolt state — module-level so it persists across frames
interface Bolt {
  points: Array<[number, number]>;
  alpha: number;
  life: number; // 0–1, countdown
}

const bolts: Bolt[] = [];
let lastLightningTick = -1;

// Rain drops (seeded, stable)
interface Raindrop {
  x: number;
  yOffset: number;
  speed: number;
  length: number;
  alpha: number;
}

const rain: Raindrop[] = [];
let rainInit = false;

function initRain(w: number) {
  rain.length = 0;
  for (let i = 0; i < 250; i++) {
    const seed = i * 41.7;
    rain.push({
      x: Math.abs(Math.sin(seed * 127.1)) * w,
      yOffset: Math.abs(Math.sin(seed * 311.7)) * 1000,
      speed: 600 + Math.abs(Math.sin(seed * 73.1)) * 800,
      length: 8 + Math.abs(Math.sin(seed * 53.9)) * 18,
      alpha: 0.12 + Math.abs(Math.sin(seed * 89.3)) * 0.22,
    });
  }
}

function buildBoltPoints(
  x1: number, y1: number,
  x2: number, y2: number,
  depth: number,
  points: Array<[number, number]>,
) {
  if (depth === 0) {
    points.push([x2, y2]);
    return;
  }
  const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * 60 * depth;
  const my = (y1 + y2) / 2 + (Math.random() - 0.5) * 20;

  buildBoltPoints(x1, y1, mx, my, depth - 1, points);

  // Occasional fork
  if (depth >= 2 && Math.random() < 0.45) {
    const forkPoints: Array<[number, number]> = [[mx, my]];
    const forkX = mx + (Math.random() - 0.5) * 120;
    const forkY = my + (y2 - y1) * 0.5;
    buildBoltPoints(mx, my, forkX, forkY, depth - 2, forkPoints);
    bolts.push({ points: forkPoints, alpha: 1, life: 1 });
  }

  buildBoltPoints(mx, my, x2, y2, depth - 1, points);
}

function spawnLightning(targetX: number, h: number) {
  const boltPoints: Array<[number, number]> = [[targetX, 0]];
  buildBoltPoints(targetX, 0, targetX + (Math.random() - 0.5) * 80, h * 0.85, 4, boltPoints);
  bolts.push({ points: boltPoints, alpha: 1, life: 1 });
}

function drawBoltPath(ctx: CanvasRenderingContext2D, points: Array<[number, number]>, alpha: number, lineWidth: number) {
  if (points.length < 2) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.stroke();
  ctx.restore();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const renderTempest: ThemeRenderer = (ctx, width, height, time, mouseX, _mouseY) => {
  if (!rainInit) {
    initRain(width);
    rainInit = true;
  }

  // Background
  ctx.fillStyle = "#020306";
  ctx.fillRect(0, 0, width, height);

  // ── Clouds via FBM ──────────────────────────────────────────────
  const cloudSamples = 48;
  for (let cx = 0; cx < cloudSamples; cx++) {
    for (let cy = 0; cy < 14; cy++) {
      const nx = cx / cloudSamples + time * 0.018;
      const ny = cy / 14;
      const n = fbm(nx * 3, ny * 2, 4);
      const alpha = Math.max(0, n * 0.7 + 0.05);
      if (alpha < 0.02) continue;
      const x = (cx / cloudSamples) * width;
      const y = (cy / 14) * height * 0.65;
      const sz = width / cloudSamples + 4;
      const grey = 35 + n * 60;
      ctx.fillStyle = `rgba(${grey},${grey},${grey + 8},${alpha * 0.85})`;
      ctx.fillRect(x, y, sz + 2, (height * 0.65) / 14 + 2);
    }
  }

  // ── Lightning trigger: approx every 0.65s ──────────────────────
  const tick = Math.floor(time * 1.54);
  if (tick !== lastLightningTick) {
    lastLightningTick = tick;
    if (Math.random() < 0.72) {
      // bias strike x toward mouse
      const baseX = Math.random() * width;
      const targetX = baseX + (mouseX * width - baseX) * 0.65;
      spawnLightning(targetX, height);
    }
  }

  // ── Draw and age bolts ─────────────────────────────────────────
  const decayRate = 0.055;
  for (let bi = bolts.length - 1; bi >= 0; bi--) {
    const bolt = bolts[bi];
    bolt.life -= decayRate;
    bolt.alpha = Math.max(0, bolt.life);

    if (bolt.alpha <= 0) {
      bolts.splice(bi, 1);
      continue;
    }

    // White core
    ctx.strokeStyle = `rgba(255,255,255,${bolt.alpha})`;
    drawBoltPath(ctx, bolt.points, bolt.alpha, 1.5);

    // Cyan glow
    ctx.strokeStyle = `rgba(100,200,255,${bolt.alpha * 0.6})`;
    drawBoltPath(ctx, bolt.points, bolt.alpha * 0.6, 4);

    // Flash bloom on fresh bolt
    if (bolt.life > 0.85) {
      const flashX = bolt.points[0][0];
      const flashY = 0;
      const grad = ctx.createRadialGradient(flashX, flashY, 0, flashX, flashY, 180);
      grad.addColorStop(0, `rgba(150,210,255,${bolt.alpha * 0.25})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  }

  // ── Rain ────────────────────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = "rgba(160,185,210,1)";
  for (const drop of rain) {
    const y = (drop.yOffset + time * drop.speed) % (height + 100) - 20;
    const x = drop.x;
    ctx.save();
    ctx.globalAlpha = drop.alpha;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    // Diagonal rain: slight right slant
    ctx.moveTo(x, y);
    ctx.lineTo(x + drop.length * 0.18, y + drop.length);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // ── Ground atmosphere — dark fog at base ───────────────────────
  const fog = ctx.createLinearGradient(0, height * 0.7, 0, height);
  fog.addColorStop(0, "rgba(2,3,6,0)");
  fog.addColorStop(1, "rgba(2,3,6,0.65)");
  ctx.fillStyle = fog;
  ctx.fillRect(0, height * 0.7, width, height * 0.3);
};
