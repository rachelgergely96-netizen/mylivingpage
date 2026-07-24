import { noise2D } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { softGlow } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

const SILK_BANDS = 12;
const SILK_N = 26;
const _rng = createSeededRandom(73412);
interface SilkBandConfig {
  baseY: number;
  A1: number;
  A2: number;
  c1: number;
  c2: number;
  sp1: number;
  sp2: number;
  envC: number;
  envSp: number;
  thick: number;
  hue: number;
  phase: number;
  drift: number;
  nseed: number;
}

const SILK_CFG: SilkBandConfig[] = [];
for (let b = 0; b < SILK_BANDS; b++) {
  SILK_CFG.push({
    baseY: (b + 0.5) / SILK_BANDS,
    A1: 15 + _rng() * 38,
    A2: 6 + _rng() * 18,
    c1: 1.1 + _rng() * 1.7,
    c2: 2.4 + _rng() * 3.2,
    sp1: 0.16 + _rng() * 0.26,
    sp2: -(0.10 + _rng() * 0.20),
    envC: 0.35 + _rng() * 0.7,
    envSp: 0.06 + _rng() * 0.12,
    thick: 8 + _rng() * 18,
    hue: 205 + _rng() * 135,
    phase: _rng() * TAU,
    drift: _rng() * TAU,
    nseed: _rng() * 40,
  });
}
const SILK_S = { init: false, px: 0, py: 0, vx: 0, vy: 0, lift: 0 };
// reusable point buffers -> no per-frame array churn (smoother on phones)
const SILK_TOPX = new Float64Array(SILK_N);
const SILK_TOPY = new Float64Array(SILK_N);
const SILK_BOTX = new Float64Array(SILK_N);
const SILK_BOTY = new Float64Array(SILK_N);

export const renderSilk: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const S = SILK_S, CFG = SILK_CFG, BANDS = SILK_BANDS, N = SILK_N;
  const TOPX = SILK_TOPX, TOPY = SILK_TOPY, BOTX = SILK_BOTX, BOTY = SILK_BOTY;
  const nx = (typeof mx === "number" && isFinite(mx)) ? mx : 0.5;
  const ny = (typeof my === "number" && isFinite(my)) ? my : 0.5;
  const tx = nx * w, ty = ny * h;
  if (!S.init) { S.px = tx; S.py = ty; S.init = true; }
  // host smooths the pointer now — track it directly; per-frame delta still feeds the lift envelope
  S.vx = tx - S.px; S.vy = ty - S.py;
  S.px = tx; S.py = ty;
  const speed = Math.hypot(S.vx, S.vy);
  const liftTarget = Math.min(1, speed * 0.045);
  S.lift += (liftTarget - S.lift) * (liftTarget > S.lift ? 0.16 : 0.05);
  const R = Math.max(200, Math.min(w, h) * 0.30);
  const invR2 = 1 / (R * R * 0.5);

  // ambient base wash (translucent depth over the already-painted bg)
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, "rgba(10,13,34,0.28)");
  wash.addColorStop(0.55, "rgba(5,7,20,0.10)");
  wash.addColorStop(1, "rgba(3,4,12,0.30)");
  ctx.fillStyle = wash; ctx.fillRect(0, 0, w, h);

  // slow drifting ambient sheen (soft round bloom) — biased toward the scrim-protected
  // left/lower field so the low-scrim right stays dark behind resume text
  ctx.save(); ctx.globalCompositeOperation = "screen";
  const ax = w * 0.34 + Math.sin(t * 0.05) * w * 0.24;
  const ay = h * 0.46 + Math.cos(t * 0.06) * h * 0.22;
  softGlow(ctx, ax, ay, Math.max(w, h) * 0.5, "rgba(150,170,255,0.045)", "rgba(150,170,255,0)");
  ctx.restore();

  // flowing fabric ribbons
  ctx.save(); ctx.globalCompositeOperation = "screen";
  for (let b = 0; b < BANDS; b++) {
    const c = CFG[b];
    const by = c.baseY * h;
    const dyb = by - S.py;
    const bandFall = Math.exp(-(dyb * dyb) * invR2 * 0.7);
    for (let i = 0; i < N; i++) {
      const fx = i / (N - 1);
      const x = fx * w;
      const p1 = TAU * c.c1 * fx + t * c.sp1 + c.phase;
      const p2 = TAU * c.c2 * fx + t * c.sp2 + c.phase * 0.7;
      // amplitude envelope travels opposite the crests -> waves swell as they propagate
      const env = 0.55 + 0.45 * Math.sin(TAU * c.envC * fx - t * c.envSp + c.drift);
      const nz = noise2D(fx * 2.1 + c.nseed, t * 0.05 + b * 0.6);
      let y = by + (c.A1 * Math.sin(p1) + c.A2 * Math.sin(p2)) * env + nz * 7;
      // drape toward the (inertial) pointer + soft brush ripple that spreads around it
      const ddx = x - S.px, ddy = y - S.py;
      const d2 = ddx * ddx + ddy * ddy;
      const fall = Math.exp(-d2 * invR2);
      y += (S.py - y) * fall * 0.26;
      const dist = Math.sqrt(d2);
      y += Math.sin(dist * 0.012 - t * 1.6) * fall * S.lift * 8;
      const wob = c.thick * (0.62 + 0.38 * Math.sin(p2 * 1.1 + b));
      TOPX[i] = x; TOPY[i] = y - wob;
      BOTX[i] = x; BOTY[i] = y + wob;
    }
    // filled ribbon (smooth quadratic edges)
    ctx.beginPath();
    ctx.moveTo(TOPX[0], TOPY[0]);
    for (let i = 1; i < N - 1; i++) { const mX = (TOPX[i] + TOPX[i + 1]) * 0.5, mY = (TOPY[i] + TOPY[i + 1]) * 0.5; ctx.quadraticCurveTo(TOPX[i], TOPY[i], mX, mY); }
    ctx.lineTo(TOPX[N - 1], TOPY[N - 1]);
    ctx.lineTo(BOTX[N - 1], BOTY[N - 1]);
    for (let i = N - 2; i > 0; i--) { const mX = (BOTX[i] + BOTX[i - 1]) * 0.5, mY = (BOTY[i] + BOTY[i - 1]) * 0.5; ctx.quadraticCurveTo(BOTX[i], BOTY[i], mX, mY); }
    ctx.lineTo(BOTX[0], BOTY[0]);
    ctx.closePath();
    const hue = (c.hue + t * 10) % 360;
    // iridescent fill — luminance biased to the scrim-protected left, dim on the low-scrim
    // right, peak lightness capped so the bright-pass bloom can't blow it toward white
    const g = ctx.createLinearGradient(0, by - 60, w, by + 60);
    g.addColorStop(0, `hsla(${hue},72%,62%,0.13)`);
    g.addColorStop(0.45, `hsla(${(hue + 38) % 360},78%,64%,0.12)`);
    g.addColorStop(1, `hsla(${(hue + 82) % 360},66%,54%,0.05)`);
    ctx.fillStyle = g; ctx.fill();
    // specular fold sheen — mostly motion-driven so the resting centre stays calm;
    // alpha + lightness capped against the additive HD bloom
    ctx.beginPath();
    ctx.moveTo(TOPX[0], TOPY[0]);
    for (let i = 1; i < N - 1; i++) { const mX = (TOPX[i] + TOPX[i + 1]) * 0.5, mY = (TOPY[i] + TOPY[i + 1]) * 0.5; ctx.quadraticCurveTo(TOPX[i], TOPY[i], mX, mY); }
    ctx.lineTo(TOPX[N - 1], TOPY[N - 1]);
    const sheen = Math.min(0.26, 0.07 + bandFall * (0.12 + S.lift * 0.30));
    ctx.strokeStyle = `hsla(${(hue + 46) % 360},92%,82%,${sheen})`;
    ctx.lineWidth = 0.9; ctx.stroke();
  }
  ctx.restore();

  // faint vertical weave for cloth texture (batched)
  ctx.save(); ctx.globalAlpha = 0.04; ctx.strokeStyle = "#aab6ff"; ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let x = 0; x < w; x += 22) { const off = Math.sin(t * 0.35 + x * 0.008) * 3; ctx.moveTo(x + off, 0); ctx.lineTo(x, h); }
  ctx.stroke(); ctx.restore();

  // soft specular bloom that follows the hand — low rest floor so the centre-parked
  // pointer stays calm behind headings; gentle rise on motion, capped for the HD bloom
  ctx.save(); ctx.globalCompositeOperation = "screen";
  const gi = 0.022 + Math.min(0.09, S.lift * 0.12);
  softGlow(ctx, S.px, S.py, R * 1.15, `rgba(190,206,255,${gi})`, "rgba(190,206,255,0)");
  ctx.restore();

  // vignette
  const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.95);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(2,3,8,0.6)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
};
