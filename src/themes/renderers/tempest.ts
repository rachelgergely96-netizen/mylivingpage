import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { finiteClamp, resolveThemeMotion } from "../shared/motion";
import { softGlow, star4 } from "../shared/draw";
import { wrapSoft } from "../shared/wrap";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

interface TempestCloud {
  x: number;
  y: number;
  r: number;
  ph: number;
  depth: number;
  drift: number;
  baseA: number;
  tone: number;
  sx: number;
}

interface TempestRain {
  x: number;
  y: number;
  spd: number;
  len: number;
  a: number;
  depth: number;
  wsp: number;
}

type TempestPoint = [number, number];

const CFG = (function () {
  const rnd = createSeededRandom(0x7e4e57);
  const clouds: TempestCloud[] = [];
  function layer(
    count: number,
    yLo: number,
    yHi: number,
    rLo: number,
    rHi: number,
    depth: number,
    drift: number,
    baseA: number,
    toneLo: number,
    toneHi: number,
  ) {
    for (let i = 0; i < count; i++) {
      clouds.push({
        x: rnd(),
        y: yLo + rnd() * (yHi - yLo),
        r: rLo + rnd() * (rHi - rLo),
        ph: rnd() * TAU,
        depth: depth,
        drift: drift,
        baseA: baseA,
        tone: toneLo + rnd() * (toneHi - toneLo),
        sx: 1.0 + rnd() * 0.7,
      });
    }
  }
  layer(15, 0.0, 0.24, 0.15, 0.28, 0.22, 3, 0.4, 14, 26);
  layer(15, 0.03, 0.38, 0.13, 0.24, 0.55, 6, 0.5, 18, 30);
  layer(11, 0.08, 0.5, 0.2, 0.4, 1.0, 10, 0.62, 22, 36);
  const rainFar: TempestRain[] = [];
  const rainNear: TempestRain[] = [];
  function rainLayer(
    arr: TempestRain[],
    count: number,
    depth: number,
    spdLo: number,
    spdHi: number,
    lenLo: number,
    lenHi: number,
    aLo: number,
    aHi: number,
    wsp: number,
  ) {
    for (let i = 0; i < count; i++) {
      arr.push({
        x: rnd(),
        y: rnd(),
        spd: spdLo + rnd() * (spdHi - spdLo),
        len: lenLo + rnd() * (lenHi - lenLo),
        a: aLo + rnd() * (aHi - aLo),
        depth: depth,
        wsp: wsp,
      });
    }
  }
  rainLayer(rainFar, 90, 0.5, 240, 400, 0.01, 0.02, 0.05, 0.16, 26);
  rainLayer(rainNear, 95, 1.0, 600, 940, 0.02, 0.046, 0.16, 0.4, 60);
  return { clouds: clouds, rainFar: rainFar, rainNear: rainNear };
})();
const GCACHE = new WeakMap();

export const renderTempest: ThemeRenderer = (
  ctx,
  w,
  h,
  time,
  mx,
  my,
  _deltaSeconds,
  motion,
) => {
  // Uniform motion contract: resolve page motion once at the top. All resolved
  // values are zero/centered at rest and in the preview; tempest keeps its base
  // composition untouched by page motion, so M is plumbing only for now and
  // reducedMotion freezes time (and skips strikes) for the canonical t=0 pose.
  const M = resolveThemeMotion(motion);
  const reduced = !!(motion && motion.reducedMotion);
  const t = reduced ? 0 : finiteClamp(time, 0, 1e6);
  void M;
  const clamp = (v: number, a: number, b: number) =>
    v < a ? a : v > b ? b : v;
  const px = mx - 0.5,
    py = my - 0.5;
  let GC = GCACHE.get(ctx);
  if (!GC || GC.w !== w || GC.h !== h) {
    GC = { w: w, h: h };
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "rgba(11,21,33,0.55)");
    sky.addColorStop(0.42, "rgba(6,12,20,0.28)");
    sky.addColorStop(0.75, "rgba(3,6,11,0.16)");
    sky.addColorStop(1, "rgba(1,2,4,0.58)");
    GC.sky = sky;
    const fogL = ctx.createLinearGradient(0, h * 0.6, 0, h);
    fogL.addColorStop(0, "rgba(2,3,6,0)");
    fogL.addColorStop(0.55, "rgba(3,6,11,0.34)");
    fogL.addColorStop(1, "rgba(1,2,4,0.74)");
    GC.fogL = fogL;
    const vig = ctx.createRadialGradient(
      w * 0.5,
      h * 0.44,
      h * 0.25,
      w * 0.5,
      h * 0.5,
      h * 0.98,
    );
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(0.7, "rgba(1,2,4,0.18)");
    vig.addColorStop(1, "rgba(0,1,3,0.6)");
    GC.vig = vig;
    GC.ambR = w * 0.72;
    const ag = ctx.createRadialGradient(0, 0, 0, 0, 0, GC.ambR);
    ag.addColorStop(0, "rgba(32,74,104,1)");
    ag.addColorStop(1, "rgba(0,0,0,0)");
    GC.amb = ag;
    GC.vapR = w * 0.3;
    const vap = ctx.createRadialGradient(0, 0, 0, 0, 0, GC.vapR);
    vap.addColorStop(0, "rgba(26,54,80,1)");
    vap.addColorStop(1, "rgba(0,0,0,0)");
    GC.vap = vap;
    GC.fogbR = w * 0.24;
    const fogb = ctx.createRadialGradient(0, 0, 0, 0, 0, GC.fogbR);
    fogb.addColorStop(0, "rgba(34,64,90,1)");
    fogb.addColorStop(1, "rgba(0,0,0,0)");
    GC.fogb = fogb;
    GC.flashR = h * 0.66;
    const fl = ctx.createRadialGradient(0, 0, 0, 0, 0, GC.flashR);
    fl.addColorStop(0, "rgba(66,124,168,1)");
    fl.addColorStop(1, "rgba(0,0,0,0)");
    GC.flash = fl;
    GC.clouds = [];
    for (let i = 0; i < CFG.clouds.length; i++) {
      const c = CFG.clouds[i];
      const R = c.r * w;
      const r0 = (c.tone * 0.55) | 0,
        g0 = (c.tone * 0.82) | 0,
        b0 = (c.tone * 1.15 + 7) | 0;
      const gb = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
      gb.addColorStop(0, "rgba(" + r0 + "," + g0 + "," + b0 + ",1)");
      gb.addColorStop(0.55, "rgba(" + r0 + "," + g0 + "," + b0 + ",0.5)");
      gb.addColorStop(1, "rgba(0,0,0,0)");
      const litR = R * 0.85;
      const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, litR);
      gl.addColorStop(0, "rgba(120,178,212,1)");
      gl.addColorStop(1, "rgba(0,0,0,0)");
      GC.clouds.push({ R: R, litR: litR, body: gb, lit: gl });
    }
    GCACHE.set(ctx, GC);
  }
  const BEAT = 2.4;
  const kNow = Math.floor(t / BEAT);
  const strikes = [];
  let flash = 0;
  if (!reduced) {
    for (let k = kNow - 3; k <= kNow; k++) {
      const r = createSeededRandom((k + 2000) * 7919 + 13);
      const fire = r();
      const jitter = r() * 0.5 * BEAT;
      const tStart = k * BEAT + jitter;
      const age = t - tStart;
      if (fire > 0.3) {
        continue;
      }
      if (age < 0 || age > 0.62) {
        continue;
      }
      const baseX = r();
      const xN = baseX + (mx - baseX) * 0.45;
      const endXN = xN + (r() - 0.5) * 0.1;
      const boltSeed = 100 + Math.floor(r() * 900000);
      let e = Math.exp(-age * 8.5);
      const z1 = (age - 0.08) / 0.028;
      e += 0.55 * Math.exp(-(z1 * z1));
      const z2 = (age - 0.19) / 0.045;
      e += 0.3 * Math.exp(-(z2 * z2));
      if (e > 1.4) e = 1.4;
      strikes.push({ xN: xN, endXN: endXN, e: e, seed: boltSeed });
      flash += e;
    }
    if (t < 0.9) {
      let ge = 0.34 * Math.exp(-t * 3.4);
      const gz = (t - 0.06) / 0.05;
      ge += 0.1 * Math.exp(-(gz * gz));
      if (ge > 0.5) ge = 0.5;
      if (ge > 0.02) {
        const gx0 = 0.66 + (mx - 0.66) * 0.3;
        strikes.push({ xN: gx0, endXN: gx0 - 0.05, e: ge, seed: 530041 });
        flash += ge;
      }
    }
  }
  if (flash > 0.72) flash = 0.72;
  ctx.fillStyle = GC.sky;
  ctx.fillRect(0, 0, w, h);
  const gy = h * (0.3 + 0.03 * Math.sin(t * 0.5));
  const gx = w * (0.5 + px * 0.12);
  const amb = clamp(0.05 + 0.035 * Math.sin(t * 0.7) + 0.06 * flash, 0, 0.22);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = amb;
  ctx.translate(gx, gy);
  ctx.fillStyle = GC.amb;
  ctx.beginPath();
  ctx.arc(0, 0, GC.ambR, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 7; i++) {
    const wxv = wrapSoft((i / 7 + t * 0.008) * w, w, 0.06);
    const vx = wxv.u;
    const vy = h * (0.22 + (i % 3) * 0.13);
    const n = fbm(i * 0.7 + t * 0.03, i * 1.3, 3);
    const va = clamp(0.03 + 0.05 * (n * 0.5 + 0.5), 0, 0.12) * wxv.alpha;
    ctx.save();
    ctx.globalAlpha = va;
    ctx.translate(vx, vy);
    ctx.fillStyle = GC.vap;
    ctx.beginPath();
    ctx.arc(0, 0, GC.vapR, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  // wrapSoft on intrinsic drift only (parallax applied after) so the wrap seam can't pop with the pointer
  const cpos = [];
  for (let i = 0; i < CFG.clouds.length; i++) {
    const c = CFG.clouds[i];
    const par = c.depth * 46;
    const R = c.r * w;
    const margin = R * c.sx + 40;
    const span = w + margin * 2;
    const wxc = wrapSoft(c.x * w + t * c.drift + margin, span, 0.04);
    const X = wxc.u - margin - px * par;
    const Y = c.y * h + py * par * 0.35 + Math.sin(t * 0.12 + c.ph) * 10;
    const dens = fbm(c.x * 3 + t * 0.02, c.y * 3 + c.ph, 4);
    const a = c.baseA * (0.42 + 0.58 * (dens * 0.5 + 0.5)) * wxc.alpha;
    cpos.push({ X: X, Y: Y, R: R, a: a, c: c });
  }
  for (let i = 0; i < cpos.length; i++) {
    const p = cpos[i];
    if (p.a < 0.02) continue;
    const c = p.c;
    const cg = GC.clouds[i];
    ctx.save();
    ctx.globalAlpha = p.a;
    ctx.translate(p.X, p.Y);
    ctx.scale(c.sx, 0.72);
    ctx.fillStyle = cg.body;
    ctx.beginPath();
    ctx.arc(0, 0, cg.R, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  if (flash > 0.04) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < cpos.length; i++) {
      const p = cpos[i];
      const c = p.c;
      const cg = GC.clouds[i];
      const litA = clamp(
        p.a * (0.06 + 0.42 * flash + 0.02 * Math.sin(t * 0.6 + c.ph)),
        0,
        0.3,
      );
      if (litA < 0.012) continue;
      const ly = p.Y - p.R * 0.25;
      ctx.save();
      ctx.globalAlpha = litA;
      ctx.translate(p.X, ly);
      ctx.scale(c.sx, 0.72);
      ctx.fillStyle = cg.lit;
      ctx.beginPath();
      ctx.arc(0, 0, cg.litR, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  if (flash > 0.002) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < strikes.length; i++) {
      const s = strikes[i];
      const sx2 = s.xN * w;
      ctx.save();
      ctx.globalAlpha = clamp(0.09 * s.e, 0, 0.24);
      ctx.translate(sx2, h * 0.1);
      ctx.fillStyle = GC.flash;
      ctx.beginPath();
      ctx.arc(0, 0, GC.flashR, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = clamp(0.025 * flash, 0, 0.16);
    ctx.fillStyle = "rgba(40,80,112,1)";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  const drawRain = (list: TempestRain[], bright: number, near: boolean) => {
    ctx.save();
    ctx.lineCap = "round";
    const margin = 70;
    const yspan = h + margin * 2;
    const xspan = w + margin * 2;
    for (let i = 0; i < list.length; i++) {
      const d = list[i];
      const wy = wrapSoft(d.y * h + t * d.spd, yspan, 0.05);
      const y = wy.u - margin;
      const wind = d.wsp + Math.sin(t * 0.3 + d.x * 11) * 18;
      const wx = wrapSoft(d.x * w + t * wind * 0.14, xspan, 0.05);
      const x = wx.u - margin + px * 140 * d.depth;
      const L = d.len * h;
      const dx = L * (0.17 + px * 0.16);
      const al = clamp(d.a * bright, 0, 0.7) * wx.alpha * wy.alpha;
      ctx.globalAlpha = al * 0.55;
      ctx.strokeStyle = "rgba(150,186,216,1)";
      ctx.lineWidth = near ? 1.1 : 0.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + dx, y + L);
      ctx.stroke();
      if (near) {
        ctx.globalAlpha = al;
        ctx.strokeStyle = "rgba(202,230,255,1)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x + dx * 0.62, y + L * 0.62);
        ctx.lineTo(x + dx, y + L);
        ctx.stroke();
      }
    }
    ctx.restore();
  };
  drawRain(CFG.rainFar, 0.7 + 0.25 * flash, false);
  if (strikes.length) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const buildBolt = (
      seed: number,
      x0: number,
      y0: number,
      x1: number,
      y1: number,
      iters: number,
      disp0: number,
      jy: number,
    ) => {
      const rr = createSeededRandom(seed);
      let pts: TempestPoint[] = [
        [x0, y0],
        [x1, y1],
      ];
      for (let it = 0; it < iters; it++) {
        const np: TempestPoint[] = [];
        const disp = disp0 / (it + 1);
        for (let j = 0; j < pts.length - 1; j++) {
          const a = pts[j],
            b = pts[j + 1];
          np.push(a);
          np.push([
            (a[0] + b[0]) / 2 + (rr() - 0.5) * disp,
            (a[1] + b[1]) / 2 + (rr() - 0.5) * disp * jy,
          ]);
        }
        np.push(pts[pts.length - 1]);
        pts = np;
      }
      return pts;
    };
    const strokePts = (pts: TempestPoint[], width: number, color: string) => {
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j][0], pts[j][1]);
      ctx.stroke();
    };
    for (let i = 0; i < strikes.length; i++) {
      const s = strikes[i];
      const e = s.e;
      if (e < 0.02) continue;
      ctx.globalAlpha = 1;
      const x0 = s.xN * w,
        y0 = 0;
      const y1 = h * (0.56 + 0.08 * (0.5 + 0.5 * Math.sin(s.seed)));
      const x1 = s.endXN * w;
      const main = buildBolt(s.seed, x0, y0, x1, y1, 6, w * 0.06, 0.32);
      strokePts(main, 10, "rgba(46,120,175," + 0.1 * e + ")");
      strokePts(main, 5, "rgba(96,178,230," + 0.28 * e + ")");
      strokePts(main, 2.2, "rgba(175,225,255," + 0.58 * e + ")");
      strokePts(main, 0.9, "rgba(255,255,255," + clamp(0.88 * e, 0, 0.9) + ")");
      const nf = 3 + Math.floor(clamp(e, 0, 1) * 3);
      for (let f = 0; f < nf; f++) {
        const idx = Math.floor(
          (0.18 + (0.72 * (f + 0.5)) / nf) * (main.length - 1),
        );
        const p = main[idx];
        const ang = Math.PI * 0.5 + Math.sin(s.seed * 0.13 + f * 1.7) * 0.85;
        const len =
          h * (0.06 + 0.06 * Math.abs(Math.sin(s.seed * 0.07 + f * 2.1)));
        const ex = p[0] + Math.cos(ang) * len,
          ey = p[1] + Math.abs(Math.sin(ang)) * len;
        const fk = buildBolt(
          s.seed + f * 29 + 7,
          p[0],
          p[1],
          ex,
          ey,
          4,
          w * 0.03,
          0.7,
        );
        strokePts(fk, 2.4, "rgba(92,172,222," + 0.2 * e + ")");
        strokePts(fk, 0.8, "rgba(210,240,255," + 0.46 * e + ")");
      }
      softGlow(
        ctx,
        x0,
        y0 + 4,
        54 + 90 * e,
        "rgba(150,214,255," + 0.28 * e + ")",
        "transparent",
      );
      softGlow(
        ctx,
        x1,
        y1,
        34 + 70 * e,
        "rgba(150,214,255," + 0.2 * e + ")",
        "transparent",
      );
      if (e > 0.75) {
        const se = clamp((e - 0.7) * 1.8, 0, 1);
        star4(
          ctx,
          x0,
          y0 + 6,
          50 + 50 * e,
          2.0,
          "rgba(210,236,255," + 0.34 * se + ")",
        );
      }
    }
    ctx.restore();
  }
  drawRain(CFG.rainNear, 0.85 + 0.25 * flash, true);
  ctx.fillStyle = GC.fogL;
  ctx.fillRect(0, h * 0.6, w, h * 0.4);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 6; i++) {
    const wxf = wrapSoft((i / 6 + t * 0.012) * w, w, 0.06);
    const fx = wxf.u;
    const n = fbm(i * 1.3 + t * 0.05, 7.0, 3);
    const fa =
      clamp(0.02 + 0.05 * (n * 0.5 + 0.5) + 0.05 * flash, 0, 0.14) * wxf.alpha;
    const fyy = h * (0.82 + 0.05 * Math.sin(t * 0.4 + i));
    ctx.save();
    ctx.globalAlpha = fa;
    ctx.translate(fx, fyy);
    ctx.fillStyle = GC.fogb;
    ctx.beginPath();
    ctx.arc(0, 0, GC.fogbR, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  ctx.fillStyle = GC.vig;
  ctx.fillRect(0, 0, w, h);
};
