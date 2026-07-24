import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { wrapSoft } from "../shared/wrap";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

interface EmberParticle {
  xf: number;
  phase: number;
  speed: number;
  hueBase: number;
  size: number;
  driftA: number;
  driftB: number;
  sway: number;
  isSpark: boolean;
  trailN: number;
}

interface EmberCoal {
  xf: number;
  yj: number;
  pulse: number;
  hue: number;
  sides: number;
  rSeed: number;
}

interface EmberFlame {
  xf: number;
  seed: number;
  flick: number;
  hw: number;
}

interface EmberSmoke {
  xf: number;
  seed: number;
  light: number;
  aSeed: number;
}

interface EmberAsh {
  xf: number;
  phase: number;
  drift: number;
  aSeed: number;
}

const emberRand = createSeededRandom(0x51b2e9a7);
const EMBERS: EmberParticle[] = [];
for (let i = 0; i < 84; i++) {
  const isSpark = emberRand() < 0.34;
  EMBERS.push({
    xf: emberRand(),
    phase: emberRand(),
    speed: isSpark ? (0.8 + emberRand() * 0.7) : (0.38 + emberRand() * 0.5),
    hueBase: 8 + emberRand() * 22,
    size: isSpark ? (0.5 + emberRand() * 0.4) : (1.0 + emberRand() * 0.9),
    driftA: emberRand() * TAU,
    driftB: emberRand() * TAU,
    sway: emberRand() * 6.0,
    isSpark,
    trailN: isSpark ? 2 : 4,
  });
}
const COALS: EmberCoal[] = [];
for (let i = 0; i < 14; i++) {
  COALS.push({
    xf: emberRand(),
    yj: emberRand(),
    pulse: emberRand() * TAU,
    hue: 6 + emberRand() * 16,
    sides: 5 + Math.floor(emberRand() * 3),
    rSeed: emberRand() * TAU,
  });
}
const FLAMES: EmberFlame[] = [];
for (let i = 0; i < 10; i++) {
  FLAMES.push({
    xf: (i + 0.5) / 10,
    seed: emberRand() * TAU,
    flick: emberRand() * TAU,
    hw: 8 + emberRand() * 4,
  });
}
const SMOKE: EmberSmoke[] = [];
for (let i = 0; i < 8; i++) {
  SMOKE.push({ xf: emberRand(), seed: emberRand() * 100, light: 20 + emberRand() * 8, aSeed: emberRand() * TAU });
}
const ASH: EmberAsh[] = [];
for (let i = 0; i < 22; i++) {
  ASH.push({ xf: emberRand(), phase: emberRand(), drift: emberRand() * TAU, aSeed: emberRand() * TAU });
}

export const renderEmber: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const sw = Math.max(1, w);
  const sh = Math.max(1, h);
  const heat = 0.7 + my * 0.6;
  const wind = (mx - 0.5) * 40;

  // Deep haze wash (single cached-shape gradient)
  const haze = ctx.createLinearGradient(0, sh, 0, 0);
  haze.addColorStop(0, `hsla(12,72%,13%,${0.18 + Math.sin(t * 0.3) * 0.025})`);
  haze.addColorStop(0.34, "hsla(20,52%,7%,0.09)");
  haze.addColorStop(1, "transparent");
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, sw, sh);

  // Volumetric smoke wisps (screen, thin strokes)
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.lineWidth = 2.2;
  for (let i = 0; i < SMOKE.length; i++) {
    const s = SMOKE[i];
    let sx = s.xf * sw;
    let sy = sh;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    for (let k = 0; k < 11; k++) {
      const n = fbm(sx * 0.004 + t * 0.03 + s.seed, sy * 0.004 + t * 0.02, 3);
      sx += n * 22 + (mx - 0.5) * (k * 2.2);
      sy -= sh * 0.058;
      ctx.lineTo(sx, sy);
    }
    ctx.strokeStyle = `hsla(18,28%,${s.light}%,${0.018 + Math.sin(t * 0.3 + s.aSeed) * 0.007})`;
    ctx.stroke();
  }
  ctx.restore();

  // Flame tongues at the base (additive, dimmed + shifted orange for bloom headroom)
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < FLAMES.length; i++) {
    const f = FLAMES[i];
    const fx = f.xf * sw + Math.sin(t * 0.6 + f.seed) * 12;
    const flick = 0.55 + 0.45 * Math.sin(t * 3 + f.flick);
    const fh = sh * (0.11 + 0.08 * flick) * (0.82 + fbm(fx * 0.01, t * 0.4, 2) * 0.36);
    ctx.beginPath();
    ctx.moveTo(fx - f.hw, sh);
    for (let k = 0; k <= 8; k++) {
      const yy = sh - (k / 8) * fh;
      const swy = Math.sin(t * 3 + f.seed + k * 0.6) * (k * 1.5) + fbm(fx * 0.02 + k, t * 0.5 + f.seed, 2) * 9;
      ctx.lineTo(fx + swy, yy);
    }
    for (let k = 8; k >= 0; k--) {
      const yy = sh - (k / 8) * fh;
      const swy = Math.sin(t * 3 + f.seed + k * 0.6 + 3.14) * (k * 1.3);
      ctx.lineTo(fx + swy, yy);
    }
    ctx.closePath();
    const fg = ctx.createLinearGradient(fx, sh, fx, sh - fh);
    const fa = 0.1 * flick;
    fg.addColorStop(0, `hsla(32,100%,60%,${fa})`);
    fg.addColorStop(0.45, `hsla(20,100%,50%,${fa * 0.85})`);
    fg.addColorStop(1, "hsla(8,90%,40%,0)");
    ctx.fillStyle = fg;
    ctx.fill();
  }
  ctx.restore();

  // Coal bed — layered flat facets keep the material dimensional without
  // adding per-coal gradients or blur.
  for (let i = 0; i < COALS.length; i++) {
    const c = COALS[i];
    const cx = c.xf * sw;
    const cy = sh - 8 - c.yj * 12;
    const pulse = 0.5 + Math.sin(t * 1.5 + c.pulse) * 0.5;
    const points: Array<[number, number]> = [];
    ctx.beginPath();
    for (let s = 0; s <= c.sides; s++) {
      const ang = (s / c.sides) * TAU;
      const r = (3 + Math.sin(c.rSeed + s) * 1.5) * (1 + pulse * 0.32);
      const px = cx + Math.cos(ang) * r;
      const py = cy + Math.sin(ang) * r * 0.6;
      points.push([px, py]);
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = `hsla(${c.hue},82%,${26 + pulse * 24}%,${0.12 + pulse * 0.12})`;
    ctx.fill();

    // A quiet lower plane and a thin upper heat catch make each irregular coal
    // read as a small faceted volume while preserving the existing silhouette.
    const lowerEnd = Math.floor(c.sides / 2);
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let s = 1; s <= lowerEnd; s++) {
      ctx.lineTo(points[s][0], points[s][1]);
    }
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fillStyle = `hsla(${c.hue - 4},54%,8%,${0.1 + pulse * 0.045})`;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(points[lowerEnd][0], points[lowerEnd][1]);
    for (let s = lowerEnd + 1; s < points.length; s++) {
      ctx.lineTo(points[s][0], points[s][1]);
    }
    ctx.strokeStyle = `hsla(${c.hue + 18},88%,62%,${0.07 + pulse * 0.08})`;
    ctx.lineWidth = 0.7;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 12 + pulse * 7, 0, TAU);
    ctx.fillStyle = `hsla(${c.hue + 6},80%,44%,${pulse * 0.05})`;
    ctx.fill();
  }

  // Rising embers, stateless helper so the two composite passes stay in sync
  const cycleLen = sh * 1.5;
  const emberAt = (e:EmberParticle) => {
    const drift = Math.sin(t * 0.3 + e.driftA) * 30 + Math.sin(t * 0.7 + e.driftB) * 11;
    const rawX = e.xf * sw + drift;
    const cycle = ((t * 16 * e.speed * heat) + e.phase * cycleLen) % cycleLen;
    const rawY = sh + sh * 0.2 - cycle;
    const life = 1 - cycle / cycleLen;
    if (life <= 0) return null;
    const heightRatio = 1 - rawY / sh;
    const shimmer = fbm(rawX * 0.01 + t * 0.1 + e.sway, rawY * 0.01, 2) * heightRatio * 16;
    // wrap intrinsic drift only, fade at the seam; wind (pointer) applies after so the seam can't move with the cursor
    const wx = wrapSoft(rawX + shimmer, sw, 0.05);
    const x = wx.u + wind * e.speed;
    const guard = 0.4 + 0.6 * Math.min(1, (x / sw) / 0.72);
    return { x, y: rawY, life, size: e.size * life, drift, guard, fade: wx.alpha };
  };

  // Pass 1 — soft halos (additive, low-alpha, dimmed in the left reading column)
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < EMBERS.length; i++) {
    const e = EMBERS[i];
    const st = emberAt(e);
    if (!st) continue;
    const halo = st.life * (e.isSpark ? 0.05 : 0.075) * st.guard * st.fade;
    if (halo <= 0.004) continue;
    const hue = e.hueBase + st.life * 18;
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.size * (e.isSpark ? 5 : 10), 0, TAU);
    ctx.fillStyle = `hsla(${hue},92%,${44 + st.life * 10}%,${halo})`;
    ctx.fill();
  }
  ctx.restore();

  // Pass 2 — cores + trails (source-over, lightness capped so bloom keeps ember-orange)
  for (let i = 0; i < EMBERS.length; i++) {
    const e = EMBERS[i];
    const st = emberAt(e);
    if (!st) continue;
    const hue = e.hueBase + 6 + st.life * 14;
    const coreA = st.life * (e.isSpark ? 0.7 : 0.6) * (0.55 + 0.45 * st.guard) * st.fade;
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.size * (e.isSpark ? 1.3 : 2.3), 0, TAU);
    ctx.fillStyle = `hsla(${hue},94%,${54 + st.life * 14}%,${coreA})`;
    ctx.fill();
    for (let tr = 1; tr < e.trailN; tr++) {
      const trY = st.y + tr * 5 * e.speed;
      ctx.beginPath();
      ctx.arc(st.x - st.drift * 0.02 * tr, trY, st.size * (1 - tr * 0.2), 0, TAU);
      ctx.fillStyle = `hsla(${hue - tr * 6},78%,46%,${st.life * st.fade * 0.16 * (1 - tr / 4)})`;
      ctx.fill();
    }
  }

  // Heat shimmer — coarse (width-independent count), dim, hugging the base
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const cols = 26;
  const bw = sw / cols;
  for (let c = 0; c < cols; c++) {
    const x = c * bw;
    const n = fbm(x * 0.02, t * 0.8, 2);
    const a = 0.012 + Math.max(0, n) * 0.018;
    ctx.fillStyle = `hsla(24,88%,52%,${a})`;
    ctx.fillRect(x, sh * 0.86 + n * 10, bw + 1, sh * 0.16);
  }
  ctx.restore();

  // Falling ash (source-over, faint)
  for (let i = 0; i < ASH.length; i++) {
    const a = ASH[i];
    const wx = wrapSoft(a.xf * sw + Math.sin(t * 0.2 + a.drift) * 10, sw, 0.05);
    const x = wx.u + (mx - 0.5) * 8;
    const y = ((t * 5 + a.phase * sh * 1.2) % (sh * 1.2)) - sh * 0.1;
    const alpha = (0.05 + Math.sin(t * 0.5 + a.aSeed) * 0.02) * wx.alpha;
    ctx.beginPath();
    ctx.arc(x, y, 0.6, 0, TAU);
    ctx.fillStyle = `hsla(20,14%,54%,${alpha})`;
    ctx.fill();
  }

  // Molten base glow (single radial, lightness capped)
  const fire = ctx.createRadialGradient(sw * 0.5, sh * 1.08, 0, sw * 0.5, sh, sw * 0.58);
  fire.addColorStop(0, `hsla(18,82%,28%,${(0.085 + Math.sin(t * 0.5) * 0.025) * heat})`);
  fire.addColorStop(1, "transparent");
  ctx.fillStyle = fire;
  ctx.fillRect(0, 0, sw, sh);
};
