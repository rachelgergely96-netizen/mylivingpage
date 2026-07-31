import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { finiteClamp, resolveThemeMotion } from "../shared/motion";
import { softGlow } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

interface NeonStar {
  x: number;
  y: number;
  ph: number;
  sp: number;
  br: number;
}

interface NeonStreak {
  speed: number;
  lane: number;
  hue: number;
  phase: number;
  mag: number;
}

interface NeonCache {
  w: number;
  h: number;
  sunY: number;
  sunR: number;
  sky: CanvasGradient | null;
  sun: CanvasGradient | null;
  mtnFill: CanvasGradient | null;
  refl: CanvasGradient | null;
  hglow: CanvasGradient | null;
  ridge: number[] | null;
}

const _neonRng = createSeededRandom(0x4e454f4e);
const _neonStars: NeonStar[] = [];
for (let i = 0; i < 68; i++) {
  _neonStars.push({ x: _neonRng(), y: _neonRng(), ph: _neonRng() * TAU, sp: 0.7 + _neonRng() * 1.3, br: 0.4 + _neonRng() * 0.6 });
}
const _neonStreaks: NeonStreak[] = [];
for (let i = 0; i < 8; i++) {
  const r = _neonRng();
  _neonStreaks.push({ speed: 0.26 + (i % 4) * 0.13, lane: Math.round((r - 0.5) * 9), hue: 165 + r * 150, phase: _neonRng() * 3, mag: 0.55 + _neonRng() * 0.45 });
}
const _neonCache: NeonCache = { w: 0, h: 0, sunY: 0, sunR: 0, sky: null, sun: null, mtnFill: null, refl: null, hglow: null, ridge: null };

export const renderNeon: ThemeRenderer = (
  ctx,
  w,
  h,
  time,
  mx,
  _my,
  _deltaSeconds,
  motion,
) => {
  if (!(w > 0) || !(h > 0)) return;
  // Uniform motion plumbing: resolve the page-motion contract once per frame.
  // Neon's approved composition predates page-level motion nuance (and it
  // deliberately ignores pointer Y), so the resolved fields stay unread
  // (keeping motion-active output identical to the legacy renderer); only the
  // reducedMotion gate below consumes the contract, freezing time so the
  // theme holds its canonical still frame.
  resolveThemeMotion(motion);
  const reduced = !!(motion && motion.reducedMotion);
  const t = reduced ? 0 : finiteClamp(time, 0, 1e6);
  const mxx = finiteClamp(mx, 0, 1, 0.5);
  const horizonY = h * 0.56;
  const vpX = w * (0.5 + (mxx - 0.5) * 0.1);
  const denom = h - horizonY;

  // Rebuild dimension-dependent gradients + the static ridge only on resize.
  if (_neonCache.w !== w || _neonCache.h !== h) {
    _neonCache.w = w; _neonCache.h = h;
    const sunR = Math.min(w, h) * 0.2;
    const sunY = horizonY - 2;
    _neonCache.sunR = sunR; _neonCache.sunY = sunY;
    const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
    sky.addColorStop(0, "#0a0619"); sky.addColorStop(0.55, "#1a0a2e"); sky.addColorStop(0.85, "#3a1145"); sky.addColorStop(1, "#5a1550");
    _neonCache.sky = sky;
    const sg = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
    sg.addColorStop(0, "#f2bf67"); sg.addColorStop(0.42, "#f0742f"); sg.addColorStop(0.78, "#ff2d95"); sg.addColorStop(1, "#c81fff");
    _neonCache.sun = sg;
    const mtn = ctx.createLinearGradient(0, horizonY - h * 0.16, 0, horizonY);
    mtn.addColorStop(0, "rgba(20,6,30,0.92)"); mtn.addColorStop(1, "rgba(40,10,45,0.4)");
    _neonCache.mtnFill = mtn;
    const refl = ctx.createLinearGradient(0, horizonY, 0, h);
    refl.addColorStop(0, "hsla(320,85%,52%,0.14)"); refl.addColorStop(0.5, "hsla(300,80%,45%,0.05)"); refl.addColorStop(1, "transparent");
    _neonCache.refl = refl;
    const hglow = ctx.createLinearGradient(0, horizonY - h * 0.06, 0, horizonY + h * 0.12);
    hglow.addColorStop(0, "transparent"); hglow.addColorStop(0.4, "hsla(315,80%,56%,0.11)"); hglow.addColorStop(1, "transparent");
    _neonCache.hglow = hglow;
    const step = w / 40;
    const pts: number[] = [];
    for (let x = 0; x <= w + 0.5; x += step) {
      const ry = horizonY - Math.max(0, fbm(x * 0.006, 7.7, 3)) * h * 0.16 - Math.abs(Math.sin(x * 0.02)) * 6;
      pts.push(x, ry);
    }
    _neonCache.ridge = pts;
  }
  const { sky, sun, mtnFill, refl, hglow, ridge } = _neonCache;
  if (!sky || !sun || !mtnFill || !refl || !hglow || !ridge) return;

  const sunR = _neonCache.sunR, sunY = _neonCache.sunY;

  // Sky.
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, horizonY);

  // Star field (positions precomputed; only the twinkle animates).
  for (let i = 0; i < _neonStars.length; i++) {
    const s = _neonStars[i];
    const tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
    ctx.fillStyle = `hsla(280,38%,82%,${s.br * (0.14 + 0.22 * tw)})`;
    ctx.fillRect(s.x * w, s.y * horizonY * 0.82, 1.2, 1.2);
  }

  // Synthwave sun — centered, amber-capped top so the bright-pass cannot blow it white.
  const sunX = vpX;
  ctx.save();
  ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, TAU); ctx.clip();
  ctx.fillStyle = sun;
  ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);
  for (let i = 0; i < 10; i++) {
    const gy = sunY - sunR * 0.1 + i * (sunR * 0.12);
    ctx.fillStyle = "rgba(8,5,20,0.92)";
    ctx.fillRect(sunX - sunR, gy, sunR * 2, 2 + i * 0.9);
  }
  ctx.restore();
  // Capped bloom (was 0.16-0.24 -> 0.08-0.12); magenta so it never reads as white.
  softGlow(ctx, sunX, sunY, sunR * 1.7, `hsla(322,88%,58%,${0.1 + Math.sin(t * 0.4) * 0.02})`, "transparent");

  // Soft horizon haze — cheap stand-in for the removed grid shadowBlur, biased below the horizon.
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = hglow;
  ctx.fillRect(0, horizonY - h * 0.06, w, h * 0.18);
  ctx.restore();

  // Wireframe mountain ridge (precomputed polyline).
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  for (let i = 0; i < ridge.length; i += 2) ctx.lineTo(ridge[i], ridge[i + 1]);
  ctx.lineTo(w, horizonY);
  ctx.strokeStyle = "rgba(230,90,200,0.42)"; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = mtnFill; ctx.fill();
  ctx.restore();

  // Reflective ground plane.
  ctx.fillStyle = "#07030f";
  ctx.fillRect(0, horizonY, w, denom);

  // Sun reflection on the floor (cached gradient).
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = refl;
  ctx.fillRect(sunX - sunR * 1.1, horizonY, sunR * 2.2, denom);
  ctx.restore();

  // Glowing perspective grid — screen blend keeps the neon without any shadowBlur.
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.strokeStyle = "rgba(240,120,255,0.5)";
  for (let i = 1; i <= 18; i++) {
    const ratio = i / 18;
    const y = horizonY + denom * Math.pow(ratio, 1.9);
    ctx.globalAlpha = Math.max(0, 0.05 + ratio * 0.14 + Math.sin(t * 0.6 + i * 0.4) * 0.03);
    ctx.lineWidth = 0.6 + ratio * 1.2;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (let i = -10; i <= 10; i++) {
    const bx = vpX + i * (w / 9);
    ctx.globalAlpha = 0.05 + Math.max(0, 1 - Math.abs(i) / 10) * 0.14;
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(vpX + i * 2, horizonY); ctx.lineTo(bx + (bx - vpX) * 0.6, h); ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  // Light streaks racing forward (precomputed lanes; capped, cyan-to-magenta).
  for (let i = 0; i < _neonStreaks.length; i++) {
    const s = _neonStreaks[i];
    const ratio = 0.08 + ((t * s.speed + s.phase) % 3) / 3;
    const y = horizonY + denom * Math.pow(ratio, 1.9);
    const x = vpX + s.lane * (w * (ratio * 0.7) / 5);
    const size = 1.5 + ratio * 4;
    const pRatio = Math.max(0.08, ratio - 0.09);
    const pY = horizonY + denom * Math.pow(pRatio, 1.9);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const g = ctx.createLinearGradient(x, pY, x, y);
    g.addColorStop(0, "transparent");
    g.addColorStop(1, `hsla(${s.hue},85%,62%,${0.42 * ratio * s.mag})`);
    ctx.strokeStyle = g; ctx.lineWidth = size * 0.6;
    ctx.beginPath(); ctx.moveTo(x, pY); ctx.lineTo(x, y); ctx.stroke();
    softGlow(ctx, x, y, size * 4.5, `hsla(${s.hue},80%,58%,${0.12 * ratio})`, "transparent");
    ctx.restore();
  }
};
