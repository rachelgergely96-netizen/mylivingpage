import { noise2D } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { softGlow } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

interface PrismBand {
  angle: number;
  pos: number;
  width: number;
  drift: number;
  wob: number;
  wobAmp: number;
  phase: number;
  warm: number;
  alpha: number;
  hs: number;
}

interface PrismCaustic {
  x: number;
  y: number;
  rx: number;
  ry: number;
  hue: number;
  hueRate: number;
  driftX: number;
  ripple: number;
  phase: number;
  alpha: number;
}

interface PrismMote {
  x: number;
  y: number;
  r: number;
  hue: number;
  driftA: number;
  driftR: number;
  speed: number;
  tw: number;
  phase: number;
  alpha: number;
}

interface PrismBandCache {
  grad: CanvasGradient;
  hw: number;
}

const rand = createSeededRandom(9137);
const bands: PrismBand[] = [];
const baseAngles = [-0.58, -0.92, 2.33];
for (let i = 0; i < 3; i++) {
  bands.push({
    angle: baseAngles[i] + (rand() - 0.5) * 0.14,
    pos: (rand() - 0.5) * 0.5,
    width: 0.22 + rand() * 0.13,
    drift: 0.024 + rand() * 0.028,
    wob: 0.05 + rand() * 0.05,
    wobAmp: 0.045 + rand() * 0.05,
    phase: rand() * TAU,
    warm: rand() < 0.5 ? 1 : -1,
    alpha: 0.085 + rand() * 0.045,
    hs: (rand() - 0.5) * 24,
  });
}
const caustics: PrismCaustic[] = [];
for (let i = 0; i < 9; i++) {
  caustics.push({
    x: 0.34 + rand() * 0.62,
    y: 0.6 + rand() * 0.36,
    rx: 0.07 + rand() * 0.1,
    ry: 0.02 + rand() * 0.03,
    hue: rand() * 360,
    hueRate: 5 + rand() * 9,
    driftX: (rand() - 0.5) * 0.06,
    ripple: 0.6 + rand() * 0.9,
    phase: rand() * TAU,
    alpha: 0.045 + rand() * 0.04,
  });
}
const motes: PrismMote[] = [];
for (let i = 0; i < 26; i++) {
  motes.push({
    x: rand(),
    y: rand(),
    r: 0.004 + rand() * 0.009,
    hue: rand() * 360,
    driftA: rand() * TAU,
    driftR: 0.015 + rand() * 0.04,
    speed: 0.04 + rand() * 0.11,
    tw: 0.35 + rand() * 1.1,
    phase: rand() * TAU,
    alpha: 0.05 + rand() * 0.06,
  });
}
const glows = [
  { x: 0.22, y: 0.2, r: 0.46, col: "196,183,255", a: 0.042, s: 1 },
  { x: 0.8, y: 0.26, r: 0.4, col: "150,196,255", a: 0.042, s: -1 },
  { x: 0.5, y: 0.86, r: 0.52, col: "170,150,220", a: 0.038, s: 1 },
];
const readAnchors = [[0.33, 0.27], [0.43, 0.48]];
let bandCache: PrismBandCache[] | null = null;
let bandCacheKey = 0;

export const renderPrism: ThemeRenderer = (ctx,w,h,t,mx,my)=>{
  const minWH = Math.min(w, h);
  const cx = w * 0.5, cy = h * 0.5;
  const span = Math.hypot(w, h) * 0.78;
  const pmx = (mx - 0.5) || 0;
  const pmy = (my - 0.5) || 0;

  // Cache the time-invariant band gradients once (colors never change; only geometry moves).
  // Built in local space so we can reuse them via translate/rotate each frame -> no per-frame
  // gradient or string allocation for the biggest elements. Rebuilt only if the canvas resizes.
  if (!bandCache || bandCacheKey !== minWH) {
    bandCache = [];
    for (let i = 0; i < bands.length; i++) {
      const b = bands[i];
      const hw = Math.max(1, b.width * minWH * 0.5);
      const a = b.alpha, hs = b.hs;
      const coreA = Math.min(a * 0.62, 0.07);
      const g = ctx.createLinearGradient(0, -hw, 0, hw);
      const stops: Array<[number, string]> = [
        [0.0, "rgba(255,110,128,0)"],
        [0.12, `hsla(${2 + hs},85%,62%,${a * 0.5})`],
        [0.25, `hsla(${26 + hs},86%,63%,${a * 0.56})`],
        [0.38, `hsla(${46 + hs},68%,70%,${a * 0.44})`],
        [0.5, `hsla(${255 + hs},60%,80%,${coreA})`],
        [0.62, `hsla(${190 + hs},80%,66%,${a * 0.54})`],
        [0.75, `hsla(${226 + hs},80%,64%,${a * 0.52})`],
        [0.88, `hsla(${272 + hs},78%,66%,${a * 0.46})`],
        [1.0, `hsla(${292 + hs},78%,60%,0)`],
      ];
      for (let k = 0; k < stops.length; k++) {
        const sp = b.warm > 0 ? stops[k][0] : 1 - stops[k][0];
        g.addColorStop(sp, stops[k][1]);
      }
      bandCache.push({ grad: g, hw: hw });
    }
    bandCacheKey = minWH;
  }

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  // Faint reflective floor sheen so caustics read as sitting on a dark surface
  const floorTop = h * 0.6;
  const floor = ctx.createLinearGradient(0, floorTop, 0, h);
  floor.addColorStop(0, "rgba(120,110,170,0)");
  floor.addColorStop(1, `rgba(150,134,205,${0.05 + Math.sin(t * 0.15) * 0.012})`);
  ctx.fillStyle = floor;
  ctx.fillRect(0, floorTop, w, h - floorTop);

  // Ambient spectral depth glows, soft and off-center (radii trimmed to ease fill-rate)
  for (let i = 0; i < glows.length; i++) {
    const g = glows[i];
    const gx = g.x * w + pmx * w * 0.06 * g.s;
    const gy = g.y * h + pmy * h * 0.05 * g.s;
    const pulse = 0.72 + Math.sin(t * 0.11 + i * 1.9) * 0.28;
    softGlow(ctx, gx, gy, g.r * minWH, `rgba(${g.col},${g.a * pulse})`, `rgba(${g.col},0)`);
  }

  // Very slow collective rotation so the spectral shards gently turn (0 at rest -> static frame intact)
  const spin = Math.sin(t * 0.017) * 0.1;

  // Large soft spectral bands drifting diagonally with red->violet edge dispersion
  for (let i = 0; i < bands.length; i++) {
    const b = bands[i];
    const bc = bandCache[i];
    const hw = bc.hw;
    const ang = b.angle + spin + Math.sin(t * b.wob + b.phase) * b.wobAmp;
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    const off = (b.pos + Math.sin(t * b.drift + b.phase) * 0.22) * minWH;
    const bcx = cx + nx * off + pmx * w * 0.085;
    const bcy = cy + ny * off + pmy * h * 0.075;

    // Reading-column guard: dim a band when its bright core sweeps near where resume text sits.
    // Distance from each text anchor to the band's core line (along the band normal).
    let overlap = 0;
    for (let r = 0; r < readAnchors.length; r++) {
      const ax = readAnchors[r][0] * w, ay = readAnchors[r][1] * h;
      const d = Math.abs((ax - bcx) * nx + (ay - bcy) * ny);
      const reach = hw + 0.16 * minWH;
      const o = 1 - Math.min(1, d / reach);
      if (o > overlap) overlap = o;
    }
    const guard = 1 - 0.42 * overlap;

    ctx.save();
    ctx.globalAlpha = guard;
    ctx.translate(bcx, bcy);
    ctx.rotate(ang);
    ctx.fillStyle = bc.grad;
    ctx.fillRect(-span, -hw, span * 2, hw * 2);
    ctx.restore();
  }

  // Rainbow caustics rippling on the dark floor (biased right/lower, clear of the reading column)
  for (let i = 0; i < caustics.length; i++) {
    const c = caustics[i];
    const rip = noise2D(c.phase * 2.7 + t * 0.14 * c.ripple, i * 0.63);
    const rip2 = Math.sin(t * 0.5 * c.ripple + c.phase);
    const cxp = (c.x + c.driftX * Math.sin(t * 0.09 + c.phase)) * w + rip * minWH * 0.02 + pmx * w * 0.05;
    const cyp = c.y * h + rip2 * minWH * 0.012 + pmy * h * 0.02;
    const rx = Math.max(2, c.rx * w * (0.85 + 0.25 * Math.sin(t * 0.4 + c.phase)));
    const ry = Math.max(1, c.ry * h * (0.8 + 0.35 * rip2));
    const hue = (c.hue + t * c.hueRate) % 360;
    const alpha = c.alpha * (0.55 + 0.45 * (0.5 + 0.5 * rip2));
    ctx.save();
    ctx.translate(cxp, cyp);
    ctx.scale(1, ry / rx);
    const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    rg.addColorStop(0, `hsla(${hue},84%,64%,${alpha})`);
    rg.addColorStop(0.5, `hsla(${(hue + 40) % 360},80%,57%,${alpha * 0.4})`);
    rg.addColorStop(1, `hsla(${(hue + 75) % 360},78%,54%,0)`);
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, TAU);
    ctx.fillStyle = rg;
    ctx.fill();
    ctx.restore();
  }

  // Soft floating spectral motes (gently dimmed where they drift over the reading column)
  for (let i = 0; i < motes.length; i++) {
    const m = motes[i];
    const ph = t * m.speed + m.phase;
    const mxp = m.x * w + Math.cos(ph + m.driftA) * m.driftR * w + noise2D(i * 1.7, t * 0.05) * minWH * 0.02 + pmx * w * 0.03;
    const myp = m.y * h + Math.sin(ph * 0.8 + m.driftA) * m.driftR * h * 0.7 + pmy * h * 0.03;
    const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * m.tw + m.phase));
    const mr = Math.max(1, m.r * minWH * (0.8 + 0.5 * tw));
    const hue = (m.hue + t * 4) % 360;
    const fx = mxp / w, fy = myp / h;
    const inCol = Math.max(0, 1 - Math.abs(fx - 0.36) / 0.42) * Math.max(0, 1 - Math.abs(fy - 0.32) / 0.44);
    const mGuard = 1 - 0.4 * inCol;
    softGlow(ctx, mxp, myp, mr * 4, `hsla(${hue},80%,72%,${m.alpha * tw * mGuard})`, `hsla(${hue},80%,72%,0)`);
  }

  ctx.restore();
};
