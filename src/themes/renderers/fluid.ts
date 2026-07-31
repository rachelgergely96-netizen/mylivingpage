import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { finiteClamp, resolveThemeMotion } from "../shared/motion";
import { softGlow } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

const CFG = (function () {
  const rnd = createSeededRandom(90124);
  const P2 = Math.PI * 2;
  // three parallax depth bands: far/thin -> near/bold. width is full ribbon px.
  const layers = [
    { count: 6, res: 0.0015, speed: 0.015, step: 8.6, len: 16, oct: 2, width: 11, sat: 46, lit: 41, aBody: 0.050, aCore: 0.00, mouse: 0.08, hueBase: 198, hueSpread: 12, par: 8 },
    { count: 8, res: 0.0021, speed: 0.025, step: 9.2, len: 18, oct: 2, width: 19, sat: 58, lit: 51, aBody: 0.078, aCore: 0.11, mouse: 0.18, hueBase: 184, hueSpread: 18, par: 20 },
    { count: 5, res: 0.0029, speed: 0.037, step: 10.6, len: 18, oct: 3, width: 30, sat: 68, lit: 58, aBody: 0.100, aCore: 0.17, mouse: 0.30, hueBase: 174, hueSpread: 22, par: 38 }
  ];
  const rivers = [];
  for (let li = 0; li < layers.length; li++) {
    const L = layers[li];
    for (let i = 0; i < L.count; i++) {
      const variant = rnd() < 0.24;
      rivers.push({
        layer: li, sx: rnd(), sy: rnd(), phase: rnd() * P2,
        hue: variant ? 150 + rnd() * 14 : L.hueBase + (rnd() * 2 - 1) * L.hueSpread,
        litJ: 0.92 + rnd() * 0.2, wobble: 0.55 + rnd() * 0.75, spd: 0.75 + rnd() * 0.6,
        wJit: 0.8 + rnd() * 0.5, wSeed: rnd() * 40, wf: 2.0 + rnd() * 1.4
      });
    }
  }
  const particles = [];
  for (let i = 0; i < 32; i++) {
    particles.push({ sx: rnd(), sy: rnd(), res: 0.0022 + rnd() * 0.0016, speed: 0.028 + rnd() * 0.045, size: 0.6 + rnd() * 1.9, hue: 166 + rnd() * 28, bright: rnd(), tw: rnd() * P2, tws: 0.6 + rnd() * 1.5, drift: 10 + rnd() * 20, par: 14 + rnd() * 26 });
  }
  const bubbles = [];
  for (let i = 0; i < 16; i++) {
    bubbles.push({ x: rnd(), rise: 0.02 + rnd() * 0.05, phase: rnd(), swayF: 0.3 + rnd() * 0.9, swayA: 5 + rnd() * 16, r: 1.3 + rnd() * 3.2, hue: 172 + rnd() * 20 });
  }
  const blooms = [];
  for (let i = 0; i < 8; i++) {
    blooms.push({ ox: rnd(), oy: rnd(), dx: rnd() * 2 - 1, dy: rnd() * 2 - 1, dphase: rnd() * P2, dspeed: 0.05 + rnd() * 0.10, r: 55 + rnd() * 150, hue: 168 + rnd() * 26, pulse: rnd() * P2, par: 12 + rnd() * 26 });
  }
  const shafts = [];
  for (let i = 0; i < 5; i++) {
    shafts.push({ x: rnd(), w: 0.05 + rnd() * 0.10, tilt: (rnd() * 2 - 1) * 0.16, sway: 0.15 + rnd() * 0.4, swayA: 0.015 + rnd() * 0.03, alpha: 0.028 + rnd() * 0.04, hue: 176 + rnd() * 14, ph: rnd() * P2 });
  }
  // fog trimmed 5 -> 4: fog is the last RNG consumer, so every other element and fog[0..3]
  // stay byte-identical to the approved rewrite; this drops one large additive full-screen fill.
  const fog = [];
  for (let i = 0; i < 4; i++) {
    fog.push({ ox: rnd(), oy: rnd(), r: 0.32 + rnd() * 0.4, hue: 188 + rnd() * 18, phase: rnd() * P2, speed: 0.025 + rnd() * 0.05, alpha: 0.045 + rnd() * 0.05 });
  }
  return { layers, rivers, particles, bubbles, blooms, shafts, fog };
})();

// cross-frame caches for the two static full-screen gradients (rebuilt only on resize)
let GRADE: CanvasGradient | null = null, GRADE_H = 0;
let VIG: CanvasGradient | null = null, VIG_W = 0, VIG_H = 0;

export const renderFluid: ThemeRenderer = (
  ctx,
  w,
  h,
  t,
  mx,
  my,
  _deltaSeconds,
  motion,
) => {
  // Uniform motion contract: resolve the page-motion model once at the top.
  // The fluid composition is parity-locked, so only reducedMotion (frozen
  // time) is consumed from it today; page motion hooks in here later.
  resolveThemeMotion(motion);
  const reduced = !!(motion && motion.reducedMotion);
  const T = reduced ? 0 : finiteClamp(t, 0, 1e6);
  const cx = mx * w, cy = my * h;
  const diag = Math.hypot(w, h) || 1;
  const parX = mx - 0.5, parY = my - 0.5;
  ctx.globalCompositeOperation = "source-over";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // deep-ocean vertical color grade (static — cached, rebuilt only when height changes)
  if (!GRADE || GRADE_H !== h) {
    GRADE = ctx.createLinearGradient(0, 0, 0, h);
    GRADE.addColorStop(0, "rgba(16,54,68,0.30)");
    GRADE.addColorStop(0.42, "rgba(8,30,46,0.12)");
    GRADE.addColorStop(1, "rgba(2,7,14,0.46)");
    GRADE_H = h;
  }
  ctx.fillStyle = GRADE;
  ctx.fillRect(0, 0, w, h);

  // key light sinking from the surface — soft round bloom, dimmed over the top-left reading column
  const lx = w * (0.32 + Math.sin(T * 0.05) * 0.12);
  const ly = h * (0.06 + Math.cos(T * 0.04) * 0.05);
  const key = ctx.createRadialGradient(lx, ly, 0, lx, ly, diag * 0.75);
  key.addColorStop(0, "rgba(80,168,176,0.12)");
  key.addColorStop(0.44, "rgba(28,80,100,0.045)");
  key.addColorStop(1, "transparent");
  ctx.fillStyle = key;
  ctx.fillRect(0, 0, w, h);

  ctx.globalCompositeOperation = "lighter";

  // volumetric depth fog (fbm-modulated teal masses)
  for (const f of CFG.fog) {
    const fx = w * (f.ox + Math.sin(T * f.speed + f.phase) * 0.06) - parX * 10;
    const fy = h * (f.oy + Math.cos(T * f.speed * 0.8 + f.phase) * 0.05) - parY * 10;
    const n = fbm(f.ox * 3 + T * 0.03, f.oy * 3 - T * 0.02, 2);
    const rr = f.r * diag * 0.5 * (0.86 + n * 0.18);
    softGlow(ctx, fx, fy, rr, "hsla(" + f.hue + ",58%,26%," + (f.alpha * (0.8 + n * 0.2)) + ")", "transparent");
  }

  // surface glimmer band — dimmed so the header/top reading zone stays legible under bloom
  const surf = ctx.createLinearGradient(0, 0, 0, h * 0.34);
  surf.addColorStop(0, "hsla(180,68%,56%," + (0.028 + Math.sin(T * 0.4) * 0.012) + ")");
  surf.addColorStop(1, "transparent");
  ctx.fillStyle = surf;
  ctx.fillRect(0, 0, w, h * 0.34);

  // soft god-ray shafts (wide, tapered, blurred gradient wedges)
  for (const s of CFG.shafts) {
    const baseX = (s.x + Math.sin(T * s.sway + s.ph) * s.swayA) * w;
    const topW = s.w * w;
    const botX = baseX + s.tilt * w + Math.sin(T * 0.1 + s.ph) * w * 0.02;
    const a = s.alpha * (0.6 + Math.sin(T * 0.5 + s.ph) * 0.4);
    const g = ctx.createLinearGradient(baseX, 0, botX, h);
    g.addColorStop(0, "hsla(" + s.hue + ",70%,74%," + a + ")");
    g.addColorStop(0.5, "hsla(" + s.hue + ",64%,56%," + (a * 0.35) + ")");
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(baseX - topW * 0.6, 0);
    ctx.lineTo(baseX + topW * 0.6, 0);
    ctx.lineTo(botX + topW * 1.8, h);
    ctx.lineTo(botX - topW * 1.8, h);
    ctx.closePath();
    ctx.fill();
  }

  // ---- luminous flow-field rivers: tapered, variable-width currents with body ----
  // reusable per-vertex buffers (center, unit-perp, half-width)
  const MX: number[] = [], MY: number[] = [], NX: number[] = [], NY: number[] = [], HW: number[] = [];
  const ribbon = (n: number, scale: number) => {
    ctx.beginPath();
    ctx.moveTo(MX[0] + NX[0] * HW[0] * scale, MY[0] + NY[0] * HW[0] * scale);
    for (let s = 1; s <= n; s++) ctx.lineTo(MX[s] + NX[s] * HW[s] * scale, MY[s] + NY[s] * HW[s] * scale);
    for (let s = n; s >= 0; s--) ctx.lineTo(MX[s] - NX[s] * HW[s] * scale, MY[s] - NY[s] * HW[s] * scale);
    ctx.closePath();
  };
  const spine = (n: number) => {
    ctx.beginPath();
    ctx.moveTo(MX[0], MY[0]);
    for (let s = 1; s <= n; s++) ctx.lineTo(MX[s], MY[s]);
  };

  for (const r of CFG.rivers) {
    const L = CFG.layers[r.layer];
    const N = L.len;
    const dxb = Math.sin(T * 0.03 * r.spd + r.phase) * 0.10;
    const dyb = Math.cos(T * 0.025 * r.spd + r.phase * 1.3) * 0.08;
    let px = (0.03 + r.sx * 0.94 + dxb) * w - parX * L.par;
    let py = (0.03 + r.sy * 0.94 + dyb) * h - parY * L.par;
    const halfW = L.width * 0.5;
    for (let s = 0; s <= N; s++) {
      const u = N > 0 ? s / N : 0;
      const n = fbm(px * L.res + T * L.speed + r.phase, py * L.res - T * L.speed * 0.6, L.oct);
      let ang = n * TAU * r.wobble + T * 0.02;
      const ddx = cx - px, ddy = cy - py;
      const dd = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
      if (dd < 240) {
        const infl = (1 - dd / 240) * L.mouse;
        ang += (Math.atan2(ddy, ddx) + Math.PI * 0.5) * infl;
      }
      const tx = Math.cos(ang), ty = Math.sin(ang);
      // taper both ends to a point; swell in the middle
      const env = Math.pow(Math.sin(Math.PI * u), 0.7);
      // organic width variation along the current (bulges and pinches)
      const wn = 0.45 + 0.6 * (0.5 + fbm(px * L.res * r.wf + r.wSeed, py * L.res * r.wf - T * 0.05, 2));
      const hw = halfW * env * (wn > 0.12 ? wn : 0.12) * r.wJit;
      MX[s] = px; MY[s] = py;
      NX[s] = -ty; NY[s] = tx;
      HW[s] = hw;
      px += tx * L.step;
      py += ty * L.step;
    }
    const shimmer = 0.7 + Math.sin(T * 0.6 + r.phase) * 0.3;
    const lit = L.lit * r.litJ;
    // near currents get a soft outer bloom for glowing edges
    if (r.layer === 2) {
      ribbon(N, 1.7);
      ctx.fillStyle = "hsla(" + r.hue + "," + L.sat + "%," + lit + "%," + (L.aBody * 0.45 * shimmer) + ")";
      ctx.fill();
    }
    // the water body itself
    ribbon(N, 1.0);
    ctx.fillStyle = "hsla(" + r.hue + "," + L.sat + "%," + lit + "%," + (L.aBody * shimmer) + ")";
    ctx.fill();
    // luminous core vein — peak lightness capped (was 84) so the bright-pass bloom can't blow it white
    if (r.layer >= 1) {
      spine(N);
      ctx.strokeStyle = "hsla(" + r.hue + "," + Math.min(92, L.sat + 16) + "%," + Math.min(78, lit + 16) + "%," + (L.aCore * shimmer) + ")";
      ctx.lineWidth = r.layer === 2 ? 1.6 : 1.1;
      ctx.stroke();
    }
  }

  // bioluminescent plankton — lightness + peak alpha capped so points don't pre-bloom to hot dots
  for (const p of CFG.particles) {
    let bx = (p.sx + Math.sin(T * p.speed + p.tw) * 0.14) * w - parX * p.par;
    let by = (p.sy + Math.cos(T * p.speed * 0.9 + p.tw) * 0.12) * h - parY * p.par;
    const n = fbm(bx * p.res + T * 0.04, by * p.res - T * 0.03, 2);
    const ang = n * TAU;
    const adv = p.drift * (0.6 + Math.sin(T * 0.5 + p.tw) * 0.4);
    bx += Math.cos(ang) * adv;
    by += Math.sin(ang) * adv;
    const tw = 0.55 + Math.sin(T * p.tws + p.tw) * 0.45;
    const a = (0.10 + p.bright * 0.20) * tw;
    if (p.bright > 0.72) {
      softGlow(ctx, bx, by, p.size * 7, "hsla(" + p.hue + ",82%,70%," + (a * 0.5) + ")", "transparent");
    }
    ctx.beginPath();
    ctx.arc(bx, by, p.size, 0, TAU);
    ctx.fillStyle = "hsla(" + p.hue + ",80%," + (62 + p.bright * 10) + "%," + a + ")";
    ctx.fill();
  }

  // rising rim-lit bubbles (highlight lightness clamped so tiny bright dots don't bloom hot)
  for (const b of CFG.bubbles) {
    const prog = (T * b.rise + b.phase) % 1;
    const by = h * (1.05 - prog * 1.12);
    const bx = b.x * w + Math.sin(T * 0.5 * b.swayF + b.phase * 6.283) * b.swayA;
    const edge = Math.max(0, Math.min(1, prog / 0.12, (1 - prog) / 0.12));
    const a = 0.20 * edge;
    ctx.beginPath();
    ctx.arc(bx, by, b.r, 0, TAU);
    ctx.strokeStyle = "hsla(" + b.hue + ",70%,72%," + a + ")";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(bx - b.r * 0.3, by - b.r * 0.3, b.r * 0.3, 0, TAU);
    ctx.fillStyle = "hsla(" + b.hue + ",78%,76%," + (a * 0.8) + ")";
    ctx.fill();
  }

  // pulsing bioluminescent blooms — core lightness (74->70) and alpha (0.13->0.10) capped;
  // outer wash eased to 0.08 to protect the central reading column as blooms drift through it
  for (const bl of CFG.blooms) {
    const ox = w * (bl.ox + Math.sin(T * bl.dspeed + bl.dphase) * 0.10 * bl.dx) - parX * bl.par;
    const oy = h * (bl.oy + Math.cos(T * bl.dspeed * 0.85 + bl.dphase) * 0.09 * bl.dy) - parY * bl.par;
    const pulse = 0.6 + Math.sin(T * 0.5 + bl.pulse) * 0.4;
    softGlow(ctx, ox, oy, bl.r * pulse, "hsla(" + bl.hue + ",85%,55%," + (0.08 * pulse) + ")", "transparent");
    softGlow(ctx, ox, oy, bl.r * 0.3 * pulse, "hsla(" + bl.hue + ",88%,70%," + (0.10 * pulse) + ")", "transparent");
  }

  // soft vignette that also extends a gentle scrim inward to hold the central reading column (static — cached)
  ctx.globalCompositeOperation = "source-over";
  if (!VIG || VIG_W !== w || VIG_H !== h) {
    VIG = ctx.createRadialGradient(w * 0.5, h * 0.5, diag * 0.14, w * 0.5, h * 0.5, diag * 0.66);
    VIG.addColorStop(0, "rgba(3,8,15,0.04)");
    VIG.addColorStop(0.55, "rgba(2,7,13,0.14)");
    VIG.addColorStop(1, "rgba(2,6,12,0.56)");
    VIG_W = w; VIG_H = h;
  }
  ctx.fillStyle = VIG;
  ctx.fillRect(0, 0, w, h);
};
