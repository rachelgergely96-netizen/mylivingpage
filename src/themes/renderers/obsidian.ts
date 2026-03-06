import { fbm } from "../shared/noise";
import type { ThemeRenderer } from "../types";

// Crack path (array of [x,y] points)
type CrackPath = Array<[number, number]>;

const cracks: CrackPath[] = [];
let cracksInit = false;

function buildCracks(w: number, h: number) {
  cracks.length = 0;
  const count = 18;

  for (let i = 0; i < count; i++) {
    const seed = i * 67.3;
    const s = (v: number) => Math.sin(seed * v);

    // Random start point on canvas
    let x = Math.abs(s(127.1)) * w;
    let y = Math.abs(s(311.7)) * h;

    // Direction: mostly downward-outward from a rough center
    const cx = w * 0.5 + s(73.1) * w * 0.3;
    const cy = h * 0.4 + s(53.9) * h * 0.3;
    const dx = x - cx;
    const dy = y - cy;
    const len = Math.hypot(dx, dy) + 1;
    let dirX = dx / len;
    let dirY = dy / len;

    const path: CrackPath = [[x, y]];
    const steps = 18 + Math.floor(Math.abs(s(89.3)) * 22);
    const stepLen = (50 + Math.abs(s(43.7)) * 80) / steps * steps / 8;

    for (let step = 0; step < steps; step++) {
      // Wander direction with noise
      const angle = Math.atan2(dirY, dirX) + (Math.random() - 0.5) * 0.7;
      dirX = Math.cos(angle);
      dirY = Math.sin(angle);
      x += dirX * stepLen;
      y += dirY * stepLen;
      x = Math.max(0, Math.min(w, x));
      y = Math.max(0, Math.min(h, y));
      path.push([x, y]);
    }

    cracks.push(path);
  }
}

// Heat particles
interface Particle {
  x: number;
  y: number;
  vy: number;
  alpha: number;
  r: number;
  crackIdx: number;
}

const particles: Particle[] = [];
let particlesInit = false;

function resetParticle(p: Particle, w: number) {
  const crack = cracks[p.crackIdx];
  if (!crack || crack.length === 0) {
    p.x = Math.random() * w;
    p.y = Math.random() * 200 + 200;
  } else {
    const pt = crack[Math.floor(Math.random() * crack.length)];
    p.x = pt[0] + (Math.random() - 0.5) * 6;
    p.y = pt[1];
  }
  p.vy = -(0.4 + Math.random() * 0.8);
  p.alpha = 0.5 + Math.random() * 0.5;
  p.r = 0.8 + Math.random() * 1.4;
}

function initParticles(w: number) {
  particles.length = 0;
  for (let i = 0; i < 90; i++) {
    const p: Particle = {
      x: 0, y: 0, vy: 0, alpha: 0, r: 1,
      crackIdx: i % cracks.length,
    };
    resetParticle(p, w);
    // Scatter starting y
    p.y += Math.random() * 600;
    particles.push(p);
  }
}

function drawCrack(
  ctx: CanvasRenderingContext2D,
  path: CrackPath,
  alpha: number,
  mouseGlow: number,
) {
  if (path.length < 2) return;

  // Outer glow — thick orange
  ctx.save();
  ctx.globalAlpha = alpha * 0.55;
  ctx.strokeStyle = `rgba(255,70,0,1)`;
  ctx.lineWidth = 5 + mouseGlow * 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(255,80,0,0.9)";
  ctx.shadowBlur = 14 + mouseGlow * 10;
  ctx.beginPath();
  ctx.moveTo(path[0][0], path[0][1]);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i][0], path[i][1]);
  }
  ctx.stroke();
  ctx.restore();

  // Inner bright core
  ctx.save();
  ctx.globalAlpha = alpha * 0.85;
  ctx.strokeStyle = `rgba(255,160,50,1)`;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = "rgba(255,180,80,0.8)";
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.moveTo(path[0][0], path[0][1]);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i][0], path[i][1]);
  }
  ctx.stroke();
  ctx.restore();
}

export const renderObsidian: ThemeRenderer = (ctx, width, height, time, mouseX, mouseY) => {
  if (!cracksInit) {
    buildCracks(width, height);
    cracksInit = true;
  }
  if (!particlesInit && cracks.length > 0) {
    initParticles(width);
    particlesInit = true;
  }

  const mx = mouseX * width;
  const my = mouseY * height;

  // Background — near-black volcanic
  ctx.fillStyle = "#040100";
  ctx.fillRect(0, 0, width, height);

  // Subtle FBM surface texture
  const texSamples = 32;
  for (let tx = 0; tx < texSamples; tx++) {
    for (let ty = 0; ty < texSamples; ty++) {
      const n = fbm(tx / texSamples * 4 + time * 0.01, ty / texSamples * 4, 3);
      if (n < -0.05) continue;
      const alpha = n * 0.06;
      const x = (tx / texSamples) * width;
      const y = (ty / texSamples) * height;
      ctx.fillStyle = `rgba(40,10,0,${alpha})`;
      ctx.fillRect(x, y, width / texSamples + 1, height / texSamples + 1);
    }
  }

  // ── Cracks ──────────────────────────────────────────────────────
  for (let i = 0; i < cracks.length; i++) {
    const crack = cracks[i];
    const crackSeed = i * 0.71;

    // Breathing pulse per crack
    const alpha = 0.4 + 0.35 * Math.sin(time * 0.65 + crackSeed);

    // Mouse glow boost — check proximity to any point in the crack
    let mouseGlow = 0;
    const midPt = crack[Math.floor(crack.length / 2)];
    if (midPt) {
      const dist = Math.hypot(mx - midPt[0], my - midPt[1]);
      mouseGlow = Math.max(0, 1 - dist / 200);
    }

    // FBM along crack for flowing magma effect
    const flowN = fbm(i * 0.3 + time * 0.04, time * 0.07, 3);
    const finalAlpha = Math.min(1, alpha + mouseGlow * 0.45 + flowN * 0.15);

    drawCrack(ctx, crack, finalAlpha, mouseGlow);
  }

  // ── Heat particles ───────────────────────────────────────────────
  for (const p of particles) {
    p.y += p.vy;
    p.x += Math.sin(time * 1.1 + p.y * 0.02) * 0.4;
    p.alpha -= 0.004;

    if (p.alpha <= 0 || p.y < -10) {
      resetParticle(p, width);
    }

    // Particles near mouse rise faster
    const dist = Math.hypot(mx - p.x, my - p.y);
    if (dist < 100) {
      p.vy -= 0.02 * (1 - dist / 100);
    }

    const hue = 20 + Math.random() * 20; // orange-red
    ctx.save();
    ctx.globalAlpha = p.alpha * 0.75;
    ctx.fillStyle = `hsl(${hue}, 100%, 65%)`;
    ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Dark vignette ────────────────────────────────────────────────
  const vignette = ctx.createRadialGradient(
    width / 2, height / 2, height * 0.1,
    width / 2, height / 2, height * 0.9,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(2,1,0,0.7)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
};
