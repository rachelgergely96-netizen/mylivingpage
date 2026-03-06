import type { ThemeRenderer } from "../types";

// Pre-computed thread configs (seeded, stable across frames)
interface ThreadConfig {
  baseY: number;   // 0–1 fraction of height
  A1: number;      // amplitude 1
  A2: number;      // amplitude 2
  k1: number;      // spatial frequency 1
  k2: number;      // spatial frequency 2
  s1: number;      // time speed 1
  s2: number;      // time speed 2
  baseHue: number; // base hue (200–360)
  lineWidth: number;
  alpha: number;
}

const threads: ThreadConfig[] = [];
let threadsInit = false;

function initThreads() {
  threads.length = 0;
  const count = 28;
  for (let i = 0; i < count; i++) {
    const seed = i * 47.9;
    const s = (v: number) => Math.sin(seed * v);
    threads.push({
      baseY: (i + 0.5) / count,
      A1: 20 + Math.abs(s(73.1)) * 60,
      A2: 10 + Math.abs(s(127.3)) * 35,
      k1: 0.003 + Math.abs(s(53.7)) * 0.006,
      k2: 0.007 + Math.abs(s(89.3)) * 0.008,
      s1: 0.4 + Math.abs(s(31.7)) * 0.8,
      s2: -(0.3 + Math.abs(s(19.1)) * 0.6),
      baseHue: 180 + Math.abs(s(43.7)) * 180,
      lineWidth: 0.6 + Math.abs(s(67.3)) * 2.2,
      alpha: 0.28 + Math.abs(s(37.1)) * 0.55,
    });
  }
}

export const renderSilk: ThemeRenderer = (ctx, width, height, time, mouseX, mouseY) => {
  if (!threadsInit) {
    initThreads();
    threadsInit = true;
  }

  // Clear with slight trail for silkier motion
  ctx.fillStyle = "rgba(4,6,18,0.88)";
  ctx.fillRect(0, 0, width, height);

  const mx = mouseX * width;
  const my = mouseY * height;
  const steps = Math.ceil(width / 2); // sample every 2px for performance

  for (const thread of threads) {
    const baseY = thread.baseY * height;
    const mouseInfluenceRadius = 220;

    ctx.save();
    ctx.globalAlpha = thread.alpha;
    ctx.lineWidth = thread.lineWidth;
    ctx.beginPath();

    let firstPoint = true;
    for (let sx = 0; sx <= steps; sx++) {
      const x = (sx / steps) * width;

      // Sine wave path
      let y = baseY
        + thread.A1 * Math.sin(thread.k1 * x + time * thread.s1)
        + thread.A2 * Math.sin(thread.k2 * x + time * thread.s2);

      // Gaussian mouse displacement
      const dx = x - mx;
      const dy = y - my;
      const dist = Math.hypot(dx, dy);
      if (dist < mouseInfluenceRadius) {
        const strength = 40 * (1 - dist / mouseInfluenceRadius);
        const gaussFactor = Math.exp(-(dist * dist) / (mouseInfluenceRadius * mouseInfluenceRadius * 0.3));
        y += (y - my) / (dist + 1) * strength * gaussFactor;
      }

      if (firstPoint) {
        ctx.moveTo(x, y);
        firstPoint = false;
      } else {
        ctx.lineTo(x, y);
      }

      // Color changes along the thread (iridescence)
      if (sx % 40 === 39 || sx === steps) {
        // Close current segment and draw with current hue
        const progress = sx / steps;
        const hue = (thread.baseHue + progress * 80 + time * 18) % 360;
        const lightness = 40 + 20 * Math.sin(thread.k1 * sx * 2 + time * 0.7);
        ctx.strokeStyle = `hsl(${hue}, 65%, ${lightness}%)`;
        ctx.stroke();
        ctx.beginPath();
        firstPoint = true;
      }
    }

    ctx.restore();
  }

  // Highlight shimmer — thin bright threads layered on top
  for (let i = 0; i < 6; i++) {
    const seed = i * 113.7;
    const s = (v: number) => Math.sin(seed * v);
    const baseY = (0.1 + Math.abs(s(73.1)) * 0.8) * height;
    const A = 15 + Math.abs(s(53.7)) * 40;
    const k = 0.004 + Math.abs(s(31.7)) * 0.005;
    const sp = 0.5 + Math.abs(s(19.1)) * 0.7;

    ctx.save();
    ctx.globalAlpha = 0.12 + Math.abs(s(89.3)) * 0.18;
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = `hsl(${(200 + i * 30 + time * 25) % 360}, 90%, 85%)`;
    ctx.beginPath();
    for (let sx = 0; sx <= steps; sx++) {
      const x = (sx / steps) * width;
      const y = baseY + A * Math.sin(k * x + time * sp);
      if (sx === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
    }
    ctx.stroke();
    ctx.restore();
  }

  // Dark vignette edges
  const vignette = ctx.createRadialGradient(
    width / 2, height / 2, height * 0.15,
    width / 2, height / 2, height * 0.9,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(2,3,8,0.6)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
};
