import { createSeededRandom } from "../shared/random";
import { finiteClamp, resolveThemeMotion } from "../shared/motion";
import { softGlow } from "../shared/draw";
import { wrapSoft } from "../shared/wrap";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

interface CoralPoint {
  x: number;
  y: number;
  r: number;
}

interface CoralBranch {
  pts: CoralPoint[];
  w: number;
  main: boolean;
}

interface CoralGroove {
  o: number;
  p: number;
}

interface CoralClump {
  type: number;
  x: number;
  baseY: number;
  sizeFrac: number;
  pal: number;
  phase: number;
  branches?: CoralBranch[];
  rx?: number;
  ry?: number;
  grooves?: CoralGroove[];
  rib?: number;
  spread?: number;
  edge?: number[];
}

interface CoralLayer {
  aMul: number;
  haze: number;
  detail: number;
  swayMul: number;
}

interface CoralGradientCache {
  w: number;
  h: number;
  ctx: CanvasRenderingContext2D | null;
  top: CanvasGradient | null;
  hb: CanvasGradient | null;
  sf: CanvasGradient | null;
  vg: CanvasGradient | null;
}

interface CoralColumn {
  x: number;
  r: number;
  ph: number;
}

interface CoralCaustic {
  x: number;
  y: number;
  r: number;
  sp: number;
  ph: number;
  br: number;
}

interface CoralBubble {
  x: number;
  sz: number;
  sp: number;
  ph: number;
  dr: number;
}

interface CoralMote {
  x: number;
  y: number;
  sz: number;
  ph: number;
  vy: number;
  dr: number;
}

interface CoralFish {
  y: number;
  len: number;
  sp: number;
  ph: number;
  dir: number;
  col: number[];
  a: number;
}

const RND = createSeededRandom(0x00c02a17);
const R1 = (a: number, b: number) => a + (b - a) * RND();
const RI = (a: number, b: number) => Math.floor(a + (b - a + 1) * RND());
const CORAL_PAL = [
  { b: [238, 126, 102], s: [120, 46, 42], r: [255, 208, 188] },
  { b: [230, 112, 134], s: [112, 40, 54], r: [255, 196, 208] },
  { b: [240, 156, 96], s: [128, 64, 34], r: [255, 216, 172] },
  { b: [186, 120, 158], s: [78, 44, 74], r: [228, 196, 220] },
  { b: [224, 138, 110], s: [110, 52, 44], r: [255, 206, 186] },
];
const genStag = () => {
  const branches: CoralBranch[] = [];
  const nMain = RI(3, 4);
  const spawn = (
    ang: number,
    len: number,
    wid: number,
    sx: number,
    sy: number,
    depth: number,
    main: boolean,
  ): void => {
    if (branches.length > 13) return;
    const K = RI(5, 7);
    const pts: CoralPoint[] = [];
    let x = sx,
      y = sy,
      a = ang;
    const step = len / K;
    for (let k = 0; k <= K; k++) {
      const f = k / K;
      pts.push({ x: x, y: y, r: Math.max(0.02, wid * (1 - 0.8 * f)) });
      if (depth > 0 && k >= 2 && k <= K - 2 && RND() < 0.5) {
        spawn(
          a + (RND() < 0.5 ? 1 : -1) * R1(0.5, 1.05),
          len * R1(0.4, 0.62),
          wid * 0.62,
          x,
          y,
          depth - 1,
          false,
        );
      }
      a += R1(-0.22, 0.22);
      x += Math.cos(a) * step;
      y += Math.sin(a) * step;
    }
    branches.push({ pts: pts, w: wid, main: main });
  };
  for (let b = 0; b < nMain; b++) {
    spawn(
      -Math.PI / 2 + R1(-0.5, 0.5),
      R1(0.72, 1.0),
      R1(0.09, 0.13),
      R1(-0.16, 0.16),
      0,
      1,
      true,
    );
  }
  return branches;
};
const genBrain = () => {
  const grooves: CoralGroove[] = [];
  const ng = RI(4, 6);
  for (let i = 0; i < ng; i++)
    grooves.push({ o: R1(-0.55, 0.5), p: R1(0, 6.28) });
  return { rx: R1(0.55, 0.72), ry: R1(0.42, 0.56), grooves: grooves };
};
const genFan = () => {
  const N = RI(9, 12);
  const edge: number[] = [];
  for (let i = 0; i <= N; i++) {
    const f = i / N;
    const shape = 0.82 + 0.18 * Math.sin(f * Math.PI);
    edge.push(shape * (0.92 + 0.12 * RND()));
  }
  return { rib: N, spread: R1(0.62, 0.82), edge: edge };
};
const makeClump = (
  type: number,
  x: number,
  baseY: number,
  sizeFrac: number,
  pal: number,
  phase: number,
): CoralClump => {
  const c: CoralClump = {
    type: type,
    x: x,
    baseY: baseY,
    sizeFrac: sizeFrac,
    pal: pal,
    phase: phase,
  };
  if (type === 0) {
    c.branches = genStag();
  } else if (type === 1) {
    const g = genBrain();
    c.rx = g.rx;
    c.ry = g.ry;
    c.grooves = g.grooves;
  } else {
    const g = genFan();
    c.rib = g.rib;
    c.spread = g.spread;
    c.edge = g.edge;
  }
  return c;
};
const FAR: CoralClump[] = [];
const farTypes = [2, 1, 0, 1, 2, 0, 1];
for (let i = 0; i < farTypes.length; i++) {
  const x = (i + 0.5) / farTypes.length + R1(-0.05, 0.05);
  FAR.push(
    makeClump(
      farTypes[i],
      x,
      R1(0.66, 0.78),
      R1(0.085, 0.14),
      RI(0, 4),
      R1(0, 6.28),
    ),
  );
}
const NEAR: CoralClump[] = [];
const nearTypes = [1, 2, 0, 1, 2, 0, 1, 0];
for (let i = 0; i < nearTypes.length; i++) {
  const x = (i + 0.5) / nearTypes.length + R1(-0.06, 0.06);
  NEAR.push(
    makeClump(
      nearTypes[i],
      x,
      R1(0.97, 1.04),
      nearTypes[i] === 0 ? R1(0.17, 0.25) : R1(0.17, 0.3),
      RI(0, 4),
      R1(0, 6.28),
    ),
  );
}
const COLS: CoralColumn[] = [];
for (let i = 0; i < 3; i++)
  COLS.push({ x: R1(0.15, 0.85), r: RND(), ph: R1(0, 6.28) });
const CAU: CoralCaustic[] = [];
for (let i = 0; i < 12; i++) {
  const top = i < 7;
  CAU.push({
    x: R1(0.05, 0.95),
    y: top ? R1(0.05, 0.4) : R1(0.62, 0.9),
    r: R1(0.05, 0.12),
    sp: R1(0.2, 0.5),
    ph: R1(0, 6.28),
    br: top ? 1 : 0.7,
  });
}
const BUB: CoralBubble[] = [];
for (let i = 0; i < 26; i++)
  BUB.push({
    x: R1(0.04, 0.96),
    sz: R1(1.4, 4.2),
    sp: R1(0.05, 0.14),
    ph: R1(0, 1),
    dr: R1(0.2, 1),
  });
const MOTES: CoralMote[] = [];
for (let i = 0; i < 46; i++)
  MOTES.push({
    x: R1(0, 1),
    y: R1(0, 1),
    sz: R1(0.5, 1.7),
    ph: R1(0, 1),
    vy: R1(0.005, 0.02),
    dr: R1(0.002, 0.01),
  });
const FISH: CoralFish[] = [];
const FCOL = [
  [232, 172, 150],
  [210, 150, 140],
];
for (let i = 0; i < 2; i++)
  FISH.push({
    y: R1(0.28, 0.5),
    len: R1(7, 11),
    sp: R1(0.02, 0.04),
    ph: R1(0, 1),
    dir: i % 2 === 0 ? 1 : -1,
    col: FCOL[i % 2],
    a: R1(0.1, 0.16),
  });
const _CACHE: CoralGradientCache = {
  w: -1,
  h: -1,
  ctx: null,
  top: null,
  hb: null,
  sf: null,
  vg: null,
};

export const renderCoral: ThemeRenderer = (
  ctx,
  w,
  h,
  t,
  mx,
  my,
  _deltaSeconds,
  motion,
) => {
  // Uniform page-motion plumbing: the resolved model is all zero/centered at
  // rest and zeroes transients under reducedMotion. Coral's approved moving
  // composition predates the motion model, so no resolved term feeds the draw
  // math yet — reducedMotion only freezes time to the canonical t=0 pose.
  resolveThemeMotion(motion);
  const reduced = !!(motion && motion.reducedMotion);
  const T = reduced ? 0 : finiteClamp(t, 0, 1e6);
  const TP = TAU;
  const cl01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const rgba = (c: readonly number[], a: number) =>
    "rgba(" +
    (c[0] | 0) +
    "," +
    (c[1] | 0) +
    "," +
    (c[2] | 0) +
    "," +
    (a < 0 ? 0 : a) +
    ")";
  const HAZE = [24, 60, 70];
  const mix = (a: readonly number[], b: readonly number[], f: number) => [
    a[0] + (b[0] - a[0]) * f,
    a[1] + (b[1] - a[1]) * f,
    a[2] + (b[2] - a[2]) * f,
  ];
  const mxo = mx - 0.5,
    myo = my - 0.5;
  if (_CACHE.ctx !== ctx || _CACHE.w !== w || _CACHE.h !== h) {
    const gt = ctx.createLinearGradient(0, 0, 0, h * 0.62);
    gt.addColorStop(0, "rgba(120,214,214,0.12)");
    gt.addColorStop(0.45, "rgba(46,120,130,0.05)");
    gt.addColorStop(1, "rgba(8,26,32,0)");
    const gh = ctx.createLinearGradient(0, h * 0.5, 0, h * 0.82);
    gh.addColorStop(0, "rgba(14,44,52,0)");
    gh.addColorStop(0.5, "rgba(12,40,48,0.28)");
    gh.addColorStop(1, "rgba(6,20,26,0)");
    const gs = ctx.createLinearGradient(0, h * 0.82, 0, h);
    gs.addColorStop(0, "rgba(10,26,28,0)");
    gs.addColorStop(1, "rgba(10,22,24,0.5)");
    const gv = ctx.createRadialGradient(
      w * 0.5,
      h * 0.46,
      h * 0.2,
      w * 0.5,
      h * 0.5,
      Math.max(w, h) * 0.72,
    );
    gv.addColorStop(0, "rgba(2,6,9,0)");
    gv.addColorStop(1, "rgba(2,6,9,0.42)");
    _CACHE.top = gt;
    _CACHE.hb = gh;
    _CACHE.sf = gs;
    _CACHE.vg = gv;
    _CACHE.ctx = ctx;
    _CACHE.w = w;
    _CACHE.h = h;
  }
  ctx.fillStyle = _CACHE.top!;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < COLS.length; i++) {
    const c = COLS[i];
    const gx = (c.x + Math.sin(T * 0.05 + c.ph) * 0.02 + mxo * 0.03) * w;
    const gr = h * (0.42 + c.r * 0.15);
    const a = 0.05 + 0.03 * Math.sin(T * 0.3 + c.ph);
    softGlow(
      ctx,
      gx,
      -h * 0.06,
      gr,
      rgba([150, 225, 220], a > 0 ? a : 0),
      rgba([150, 225, 220], 0),
    );
  }
  for (let i = 0; i < CAU.length; i++) {
    const c = CAU[i];
    const x = (c.x + Math.sin(T * c.sp + c.ph) * 0.05 + mxo * 0.03) * w;
    const y = (c.y + Math.cos(T * c.sp * 0.8 + c.ph) * 0.035 + myo * 0.02) * h;
    const rp = c.r * h * (0.85 + 0.2 * Math.sin(T * 0.6 + c.ph));
    const a = (0.05 + 0.03 * Math.sin(T * 0.5 + c.ph * 1.3)) * c.br;
    softGlow(
      ctx,
      x,
      y,
      rp,
      rgba([140, 232, 224], a > 0 ? a : 0),
      rgba([140, 232, 224], 0),
    );
  }
  const drawStag = (c: CoralClump, L: CoralLayer) => {
    const branches = c.branches!;
    const px = c.x * w,
      py = c.baseY * h,
      S = c.sizeFrac * h;
    const pal = CORAL_PAL[c.pal];
    const base = mix(pal.b, HAZE, L.haze),
      shade = mix(pal.s, HAZE, L.haze * 0.8),
      rim = mix(pal.r, HAZE, L.haze * 0.4);
    const aB = 0.8 * L.aMul,
      aS = 0.85 * L.aMul,
      aR = 0.55 * L.aMul;
    const swayA = S * 0.06 * L.swayMul;
    ctx.save();
    ctx.translate(px, py);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    for (let b = 0; b < branches.length; b++) {
      const br = branches[b],
        pts = br.pts,
        lw = Math.max(1.2, br.w * S);
      const sp = [];
      for (let k = 0; k < pts.length; k++) {
        const p = pts[k];
        const hf = -p.y;
        const dx =
          swayA * Math.sin(T * 0.5 + c.phase + hf * 1.6 + mxo * 1.2) * hf;
        sp.push(p.x * S + dx, p.y * S);
      }
      ctx.beginPath();
      for (let k = 0; k < pts.length; k++) {
        const X = sp[k * 2] + lw * 0.16,
          Y = sp[k * 2 + 1] + lw * 0.16;
        if (k === 0) ctx.moveTo(X, Y);
        else ctx.lineTo(X, Y);
      }
      ctx.strokeStyle = rgba(shade, aS);
      ctx.lineWidth = lw;
      ctx.stroke();
      ctx.beginPath();
      for (let k = 0; k < pts.length; k++) {
        const X = sp[k * 2],
          Y = sp[k * 2 + 1];
        if (k === 0) ctx.moveTo(X, Y);
        else ctx.lineTo(X, Y);
      }
      ctx.strokeStyle = rgba(base, aB);
      ctx.lineWidth = lw * 0.84;
      ctx.stroke();
      if (br.main) {
        ctx.beginPath();
        for (let k = 0; k < pts.length; k++) {
          const X = sp[k * 2] - lw * 0.2,
            Y = sp[k * 2 + 1] - lw * 0.2;
          if (k === 0) ctx.moveTo(X, Y);
          else ctx.lineTo(X, Y);
        }
        ctx.strokeStyle = rgba(rim, aR * 0.7);
        ctx.lineWidth = lw * 0.32;
        ctx.stroke();
      }
    }
    ctx.restore();
  };
  const drawBrain = (c: CoralClump, L: CoralLayer) => {
    const grooves = c.grooves!;
    const S = c.sizeFrac * h;
    const swayX = S * 0.03 * Math.sin(T * 0.4 + c.phase + mxo);
    const px = c.x * w + swayX,
      py = c.baseY * h;
    const pal = CORAL_PAL[c.pal];
    const base = mix(pal.b, HAZE, L.haze),
      shade = mix(pal.s, HAZE, L.haze * 0.8),
      rim = mix(pal.r, HAZE, L.haze * 0.35);
    const rx = S * c.rx!,
      ry = S * c.ry!;
    const cyc = py - ry * 0.55;
    ctx.save();
    const g = ctx.createRadialGradient(
      px - rx * 0.32,
      cyc - ry * 0.5,
      ry * 0.1,
      px,
      cyc + ry * 0.2,
      rx * 1.25,
    );
    g.addColorStop(0, rgba(rim, 0.6 * L.aMul));
    g.addColorStop(0.45, rgba(base, 0.82 * L.aMul));
    g.addColorStop(1, rgba(shade, 0.92 * L.aMul));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(px, cyc, rx, ry, 0, 0, TP);
    ctx.fill();
    if (L.detail) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(px, cyc, rx * 0.98, ry * 0.98, 0, 0, TP);
      ctx.clip();
      for (let gI = 0; gI < grooves.length; gI++) {
        const gg = grooves[gI];
        const yy = cyc + gg.o * ry;
        ctx.beginPath();
        ctx.moveTo(px - rx, yy + Math.sin(T * 0.5 + gg.p) * ry * 0.03);
        for (let s = 1; s <= 6; s++) {
          const fx = px - rx + 2 * rx * (s / 6);
          const fy = yy + Math.sin(s * 1.3 + gg.p + T * 0.4) * ry * 0.1;
          ctx.lineTo(fx, fy);
        }
        ctx.strokeStyle = rgba(shade, 0.5);
        ctx.lineWidth = Math.max(1, S * 0.012);
        ctx.stroke();
        ctx.strokeStyle = rgba(rim, 0.14);
        ctx.lineWidth = Math.max(0.6, S * 0.006);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.beginPath();
    ctx.ellipse(
      px,
      cyc,
      rx * 0.94,
      ry * 0.94,
      0,
      Math.PI * 1.12,
      Math.PI * 1.9,
    );
    ctx.strokeStyle = rgba(rim, 0.2 * L.aMul);
    ctx.lineWidth = Math.max(1, S * 0.02);
    ctx.stroke();
    ctx.restore();
  };
  const drawFan = (c: CoralClump, L: CoralLayer) => {
    const edge = c.edge!;
    const S = c.sizeFrac * h;
    const px = c.x * w,
      py = c.baseY * h;
    const pal = CORAL_PAL[c.pal];
    const base = mix(pal.b, HAZE, L.haze),
      shade = mix(pal.s, HAZE, L.haze * 0.8),
      rim = mix(pal.r, HAZE, L.haze * 0.35);
    const swayA = 0.1 * L.swayMul * Math.sin(T * 0.45 + c.phase + mxo * 1.4);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(swayA);
    const N = c.rib!,
      spread = c.spread!;
    const ex = [],
      ey = [];
    for (let i = 0; i <= N; i++) {
      const f = i / N,
        ang = -Math.PI / 2 + (f - 0.5) * 2 * spread;
      const rr =
        S * edge[i] * (1 + 0.05 * Math.sin(T * 1.1 + i * 0.7 + c.phase));
      ex.push(Math.cos(ang) * rr);
      ey.push(Math.sin(ang) * rr);
    }
    const g = ctx.createLinearGradient(0, 0, 0, -S);
    g.addColorStop(0, rgba(shade, 0.32 * L.aMul));
    g.addColorStop(0.6, rgba(base, 0.2 * L.aMul));
    g.addColorStop(1, rgba(base, 0.05 * L.aMul));
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let i = 0; i <= N; i++) ctx.lineTo(ex[i], ey[i]);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    for (let i = 0; i <= N; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(
        ex[i] * 0.5 - ey[i] * 0.06,
        ey[i] * 0.5,
        ex[i],
        ey[i],
      );
      ctx.strokeStyle = rgba(rim, (L.detail ? 0.3 : 0.16) * L.aMul);
      ctx.lineWidth = Math.max(0.7, S * 0.01);
      ctx.stroke();
    }
    if (L.detail) {
      for (let a = 1; a <= 2; a++) {
        const rf = a / 2.6;
        ctx.beginPath();
        for (let i = 0; i <= N; i++) {
          const X = ex[i] * rf,
            Y = ey[i] * rf;
          if (i === 0) ctx.moveTo(X, Y);
          else ctx.lineTo(X, Y);
        }
        ctx.strokeStyle = rgba(rim, 0.14 * L.aMul);
        ctx.lineWidth = Math.max(0.6, S * 0.007);
        ctx.stroke();
      }
    }
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      if (i === 0) ctx.moveTo(ex[i], ey[i]);
      else ctx.lineTo(ex[i], ey[i]);
    }
    ctx.strokeStyle = rgba([235, 206, 186], 0.15 * L.aMul);
    ctx.lineWidth = Math.max(0.8, S * 0.012);
    ctx.stroke();
    ctx.restore();
  };
  const drawClump = (c: CoralClump, L: CoralLayer) => {
    if (c.type === 0) drawStag(c, L);
    else if (c.type === 1) drawBrain(c, L);
    else drawFan(c, L);
  };
  const Lfar = { aMul: 0.55, haze: 0.5, detail: 0, swayMul: 1.15 };
  const Lnear = { aMul: 1.0, haze: 0.0, detail: 1, swayMul: 1.0 };
  for (let i = 0; i < FAR.length; i++) drawClump(FAR[i], Lfar);
  ctx.fillStyle = _CACHE.hb!;
  ctx.fillRect(0, h * 0.48, w, h * 0.36);
  ctx.fillStyle = _CACHE.sf!;
  ctx.fillRect(0, h * 0.8, w, h * 0.2);
  for (let i = 0; i < NEAR.length; i++) drawClump(NEAR[i], Lnear);
  for (let i = 0; i < MOTES.length; i++) {
    const m = MOTES[i];
    const wy = wrapSoft(m.y + T * m.vy + m.ph, 1, 0.05);
    /* fade at the vertical seam so drifting motes don't teleport */ const y =
      wy.u * h;
    const x = m.x * w + Math.sin(T * 0.25 + m.ph * 6) * m.dr * w + mxo * 6;
    const a = (0.05 + 0.05 * Math.sin(T * 0.8 + m.ph * 10)) * wy.alpha;
    ctx.beginPath();
    ctx.arc(x, y, m.sz, 0, TP);
    ctx.fillStyle = rgba([200, 225, 225], a > 0 ? a : 0);
    ctx.fill();
  }
  for (let i = 0; i < BUB.length; i++) {
    const b = BUB[i];
    const cyc = (T * b.sp + b.ph) % 1;
    const y = h * 1.03 - cyc * (h * 1.12);
    const x =
      b.x * w + Math.sin(T * 0.6 + b.ph * 6) * b.dr * w * 0.02 + mxo * 8;
    const life = Math.min(1, cyc * 4) * (1 - cl01((cyc - 0.85) / 0.15));
    if (life <= 0) continue;
    const sz = b.sz * (0.7 + 0.5 * cyc);
    ctx.beginPath();
    ctx.arc(x, y, sz, 0, TP);
    ctx.fillStyle = rgba([150, 220, 225], 0.05 * life);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, sz, 0, TP);
    ctx.strokeStyle = rgba([175, 225, 232], 0.28 * life);
    ctx.lineWidth = Math.max(0.6, sz * 0.14);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - sz * 0.32, y - sz * 0.32, sz * 0.3, 0, TP);
    ctx.fillStyle = rgba([214, 240, 242], 0.32 * life);
    ctx.fill();
  }
  for (let i = 0; i < FISH.length; i++) {
    const f = FISH[i];
    const prog = (T * f.sp + f.ph) % 1;
    const x = f.dir > 0 ? prog * (w + 140) - 70 : w + 70 - prog * (w + 140);
    const y = f.y * h + Math.sin(T * 0.5 + f.ph * 6) * 14;
    const bob = Math.sin(T * 3 + f.ph * 10) * 0.1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(f.dir, 1);
    ctx.rotate(bob);
    const Ln = f.len;
    ctx.beginPath();
    ctx.ellipse(0, 0, Ln, Ln * 0.4, 0, 0, TP);
    ctx.fillStyle = rgba(f.col, f.a);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-Ln * 0.9, 0);
    ctx.lineTo(-Ln * 1.5, -Ln * 0.5);
    ctx.lineTo(-Ln * 1.5, Ln * 0.5);
    ctx.closePath();
    ctx.fillStyle = rgba(f.col, f.a * 0.8);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-Ln * 0.1, -Ln * 0.12, Ln * 0.7, Ln * 0.22, 0, Math.PI, TP);
    ctx.strokeStyle = rgba([255, 220, 200], f.a * 0.5);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
  const mgx = mx * w,
    mgy = my * h;
  softGlow(
    ctx,
    mgx,
    mgy,
    h * 0.14,
    rgba([150, 235, 225], 0.05),
    rgba([150, 235, 225], 0),
  );
  ctx.fillStyle = _CACHE.vg!;
  ctx.fillRect(0, 0, w, h);
};
