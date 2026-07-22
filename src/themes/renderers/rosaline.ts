import { createSeededRandom } from "../shared/random";
import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "../shared/motion";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

type RosalinePoint = [number, number];

const CFG = (function () {
  const rnd = createSeededRandom(20260721);
  const OUTER = [
    [-0.08, -1],
    [0.31, -0.79],
    [0.66, -0.43],
    [0.9, 0.03],
    [0.63, 0.58],
    [0.2, 0.96],
    [-0.28, 0.84],
    [-0.69, 0.45],
    [-0.82, -0.12],
    [-0.49, -0.67],
  ];
  const INNER = [
    [-0.03, 0.02],
    [-0.08, -0.53],
    [0.43, -0.12],
    [0.08, 0.57],
    [-0.42, 0.02],
  ];
  const FACETS = [
    [0, 1, 11],
    [1, 2, 12, 11],
    [2, 3, 12],
    [3, 4, 13, 12],
    [4, 5, 13],
    [5, 6, 13],
    [6, 7, 14, 13],
    [7, 8, 14],
    [8, 9, 11, 14],
    [9, 0, 11],
    [11, 12, 10],
    [12, 13, 10],
    [13, 14, 10],
    [14, 11, 10],
  ];
  const FACET_COLORS = [
    [235, 151, 181],
    [190, 93, 139],
    [247, 185, 203],
    [151, 67, 119],
    [220, 119, 159],
    [247, 173, 194],
    [174, 78, 128],
    [232, 140, 171],
    [135, 61, 109],
    [213, 110, 153],
    [250, 192, 211],
    [190, 91, 141],
    [228, 132, 168],
    [162, 71, 124],
  ];
  const FACET_TEX = [];
  for (let i = 0; i < FACETS.length; i++) {
    FACET_TEX.push(rnd());
  }
  const STORY = [];
  for (let i = 0; i < FACETS.length; i++) {
    STORY.push(i % 7);
  }
  const motes = [];
  for (let i = 0; i < 40; i++) {
    const layer = i % 3;
    motes.push({
      x: rnd(),
      y: rnd(),
      layer: layer,
      r: 0.5 + rnd() * 1.5 + layer * 0.35,
      ph: rnd() * TAU,
      tw: 0.5 + rnd() * 1.2,
      br: 0.28 + rnd() * 0.6,
      warm: rnd(),
    });
  }
  const splinters = [];
  for (let i = 0; i < 10; i++) {
    splinters.push({
      ox: rnd() * 2 - 1,
      oy: rnd() * 2 - 1,
      len: 0.018 + rnd() * 0.026,
      rat: 0.34 + rnd() * 0.2,
      ang: rnd() * TAU,
      spin: (rnd() - 0.5) * 0.045,
      ph: rnd() * TAU,
      a: 0.035 + rnd() * 0.055,
      warm: rnd(),
    });
  }
  const atmos = [
    { ox: 0.05, oy: -0.42, rf: 0.72, type: 0, a: 0.3, sp: 0.05, ph: 0.4 },
    { ox: 0.3, oy: 0.28, rf: 0.66, type: 2, a: 0.24, sp: 0.043, ph: 4.0 },
    { ox: -0.3, oy: 0.14, rf: 0.6, type: 1, a: 0.22, sp: 0.037, ph: 2.1 },
    { ox: 0.22, oy: -0.05, rf: 0.5, type: 0, a: 0.26, sp: 0.06, ph: 1.2 },
    { ox: -0.05, oy: 0.46, rf: 0.55, type: 1, a: 0.18, sp: 0.03, ph: 5.2 },
    { ox: 0.4, oy: -0.28, rf: 0.5, type: 2, a: 0.2, sp: 0.048, ph: 3.1 },
  ];
  const glints = [0, 2, 4, 9, 12];
  return {
    OUTER: OUTER,
    INNER: INNER,
    FACETS: FACETS,
    FACET_COLORS: FACET_COLORS,
    FACET_TEX: FACET_TEX,
    STORY: STORY,
    motes: motes,
    splinters: splinters,
    atmos: atmos,
    glints: glints,
  };
})();

export const renderRosaline: ThemeRenderer = (
  ctx,
  w,
  h,
  t,
  mx,
  my,
  _deltaSeconds,
  motion,
) => {
  const M = resolveThemeMotion(motion);
  const clamp = (v: number, a: number, b: number) =>
    v < a ? a : v > b ? b : v;
  const px = finiteClamp(mx, 0, 1, 0.5) - 0.5;
  const py = finiteClamp(my, 0, 1, 0.5) - 0.5;
  const minSide = Math.min(w, h) || 1;
  const vBoost = clamp(Math.abs(M.scrollVelocity) * 0.2, 0, 0.6);
  const pBoost = clamp(M.pointerSpeed * 0.14, 0, 0.5);
  const sparkBoost = clamp(pBoost + M.interactionImpulse * 0.25, 0, 0.5);
  const focusLift = M.hasFocus ? 0.07 : 0;
  const act = clamp(M.storyProgress, 0, 1);
  const breath = 1 + Math.sin(t * 0.16) * 0.012 + vBoost * 0.008;
  const cx = w * 0.79 + px * minSide * 0.045;
  const cy = h * 0.5 + py * minSide * 0.035;
  const rx = minSide * 0.33 * breath;
  const ry = minSide * 0.42 * breath;
  const ryD = ry || 1;
  const nodes: RosalinePoint[] = [];
  for (let i = 0; i < CFG.OUTER.length; i++) {
    nodes.push([cx + CFG.OUTER[i][0] * rx, cy + CFG.OUTER[i][1] * ry]);
  }
  for (let i = 0; i < CFG.INNER.length; i++) {
    nodes.push([cx + CFG.INNER[i][0] * rx, cy + CFG.INNER[i][1] * ry]);
  }
  const outer = nodes.slice(0, CFG.OUTER.length);
  const trace = (pp: RosalinePoint[]) => {
    ctx.beginPath();
    ctx.moveTo(pp[0][0], pp[0][1]);
    for (let k = 1; k < pp.length; k++) {
      ctx.lineTo(pp[k][0], pp[k][1]);
    }
    ctx.closePath();
  };
  const gHalo = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  gHalo.addColorStop(0, "rgba(236,150,186,0.85)");
  gHalo.addColorStop(0.55, "rgba(214,120,164,0.28)");
  gHalo.addColorStop(1, "rgba(236,150,186,0)");
  const gDeep = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  gDeep.addColorStop(0, "rgba(150,66,112,0.70)");
  gDeep.addColorStop(0.6, "rgba(120,50,96,0.22)");
  gDeep.addColorStop(1, "rgba(120,50,96,0)");
  const gMid = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  gMid.addColorStop(0, "rgba(247,178,200,0.70)");
  gMid.addColorStop(0.55, "rgba(230,140,178,0.24)");
  gMid.addColorStop(1, "rgba(247,178,200,0)");
  const gSpark = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  gSpark.addColorStop(0, "rgba(255,214,228,0.95)");
  gSpark.addColorStop(0.4, "rgba(255,196,214,0.30)");
  gSpark.addColorStop(1, "rgba(255,214,228,0)");
  const atmosGrad = (ty: number) =>
    ty === 1 ? gDeep : ty === 2 ? gMid : gHalo;
  const paintGlow = (
    grad: CanvasGradient,
    gx: number,
    gy: number,
    sx: number,
    sy: number,
    alpha: number,
  ) => {
    const a = clamp(alpha, 0, 1);
    if (a <= 0 || sx <= 0 || sy <= 0) {
      return;
    }
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(gx, gy);
    ctx.scale(sx, sy);
    ctx.fillStyle = grad;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  };
  ctx.save();
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#170B16");
  bg.addColorStop(0.5, "#100810");
  bg.addColorStop(1, "#040305");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(w * 0.4, 0, w * 0.6, h);
  ctx.clip();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < CFG.atmos.length; i++) {
    const al = CFG.atmos[i];
    const dx = Math.sin(t * al.sp + al.ph) * minSide * 0.04;
    const dy = Math.cos(t * al.sp * 0.85 + al.ph) * minSide * 0.038;
    const gx = cx + al.ox * rx + dx;
    const gy = cy + al.oy * ry + dy;
    const rr = minSide * al.rf;
    const n = 0.5 + 0.5 * Math.sin(t * 0.05 + al.ph * 1.7);
    let a = al.a * (0.75 + 0.35 * n);
    if (M.hasFocus) {
      const fd = Math.hypot(M.focusX * w - gx, M.focusY * h - gy);
      a += clamp(1 - fd / (minSide * 0.6), 0, 1) * 0.1;
    }
    paintGlow(atmosGrad(al.type), gx, gy, rr, rr * 0.92, a);
  }
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < CFG.motes.length; i++) {
    const m = CFG.motes[i];
    const depth = (m.layer + 1) / 3;
    const dxp = -px * minSide * 0.055 * depth;
    const dyp = -py * minSide * 0.045 * depth;
    const mxp =
      m.x * w + Math.sin(t * 0.03 * depth + m.ph) * minSide * 0.015 + dxp;
    const myp =
      m.y * h + Math.cos(t * 0.025 * depth + m.ph) * minSide * 0.012 + dyp;
    const tw =
      0.3 +
      0.7 * (0.5 + 0.5 * Math.sin(t * (m.tw * (1 + vBoost * 0.6)) + m.ph));
    const a = clamp(m.br * tw * (0.3 + 0.4 * depth) * (0.85 + vBoost), 0, 0.6);
    const rr = m.r * (0.6 + depth * 0.9);
    const col = m.warm > 0.5 ? "250,220,232" : "232,158,190";
    ctx.beginPath();
    ctx.arc(mxp, myp, rr, 0, TAU);
    ctx.fillStyle = "rgba(" + col + "," + a + ")";
    ctx.fill();
  }
  ctx.restore();
  ctx.save();
  ctx.translate(rx * 0.045, ry * 0.045);
  trace(outer);
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = minSide * 0.04;
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  paintGlow(gHalo, cx - rx * 0.06, cy - ry * 0.06, rx * 0.9, ry * 0.8, 0.16);
  paintGlow(gSpark, cx, cy, rx * 0.5, ry * 0.5, 0.12 + focusLift);
  ctx.restore();
  const body = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
  body.addColorStop(0, "rgba(250,196,214,0.82)");
  body.addColorStop(0.38, "rgba(186,84,134,0.90)");
  body.addColorStop(0.7, "rgba(116,44,93,0.95)");
  body.addColorStop(1, "rgba(236,138,172,0.75)");
  trace(outer);
  ctx.fillStyle = body;
  ctx.fill();
  const lightAng = t * 0.13 + px * 0.7 + M.storyProgress * 1.15;
  const lx = Math.cos(lightAng);
  const ly = Math.sin(lightAng);
  const storyCount = 7;
  const fdat = [];
  for (let i = 0; i < CFG.FACETS.length; i++) {
    const f = CFG.FACETS[i];
    const pts: RosalinePoint[] = [];
    let sx = 0;
    let sy = 0;
    for (let k = 0; k < f.length; k++) {
      const nd = nodes[f[k]];
      pts.push(nd);
      sx += nd[0];
      sy += nd[1];
    }
    const fl = f.length || 1;
    const ccx = sx / fl;
    const ccy = sy / fl;
    let nx = ccx - cx;
    let ny = ccy - cy;
    const nl = Math.hypot(nx, ny) || 1;
    nx /= nl;
    ny /= nl;
    const lam = Math.max(0, nx * lx + ny * ly);
    const rim = clamp(nl / (minSide * 0.42), 0, 1);
    const amb = 0.86 + 0.14 * (1 - clamp(((ccy - cy) / ryD) * 0.5 + 0.5, 0, 1));
    const shim = 0.5 + 0.5 * Math.sin(t * (0.5 + vBoost * 0.5) + i * 1.27);
    const storyLift =
      act * storyStepWeight(M.storyProgress, CFG.STORY[i], storyCount);
    fdat.push({
      pts: pts,
      col: CFG.FACET_COLORS[i],
      ccx: ccx,
      ccy: ccy,
      lam: lam,
      rim: rim,
      amb: amb,
      shim: shim,
      tex: CFG.FACET_TEX[i],
      storyLift: storyLift,
    });
  }
  for (let i = 0; i < fdat.length; i++) {
    const d = fdat[i];
    const tex = 0.6 + 0.4 * Math.sin(t * 0.05 + d.tex * TAU);
    trace(d.pts);
    const ao = 1 - d.rim * 0.28;
    const a = clamp(
      (0.14 + d.lam * 0.4 + d.shim * 0.06 + d.storyLift * 0.12) *
        (0.78 + 0.22 * tex) *
        ao *
        d.amb,
      0,
      0.92,
    );
    const lift = (0.52 + 0.46 * d.lam) * ao;
    const rC = Math.round(clamp(d.col[0] * lift + 38 * d.lam, 0, 252));
    const gC = Math.round(clamp(d.col[1] * lift + 22 * d.lam, 0, 240));
    const bC = Math.round(clamp(d.col[2] * lift + 28 * d.lam, 0, 246));
    ctx.fillStyle = "rgba(" + rC + "," + gC + "," + bC + "," + a + ")";
    ctx.fill();
    ctx.strokeStyle =
      "rgba(255," +
      Math.round(210 + d.lam * 26) +
      ",232," +
      (0.09 + d.lam * 0.3 + d.storyLift * 0.14) +
      ")";
    ctx.lineWidth = 0.7 + d.lam * 1.2;
    ctx.stroke();
  }
  ctx.save();
  trace(outer);
  ctx.clip();
  const depthG = ctx.createRadialGradient(
    cx - rx * 0.08,
    cy - ry * 0.05,
    minSide * 0.02,
    cx,
    cy,
    Math.max(rx, ry) * 1.05,
  );
  depthG.addColorStop(0, "rgba(20,6,16,0)");
  depthG.addColorStop(0.7, "rgba(18,5,14,0.10)");
  depthG.addColorStop(1, "rgba(12,3,10,0.40)");
  ctx.fillStyle = depthG;
  ctx.fillRect(cx - rx * 1.3, cy - ry * 1.3, rx * 2.6, ry * 2.6);
  ctx.globalCompositeOperation = "screen";
  paintGlow(
    gSpark,
    cx - rx * 0.05,
    cy - ry * 0.03,
    rx * 0.55,
    ry * 0.55,
    0.13 + focusLift,
  );
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  let specCount = 0;
  for (let i = 0; i < fdat.length && specCount < 4; i++) {
    const d = fdat[i];
    if (d.lam < 0.62) {
      continue;
    }
    specCount++;
    const spec = Math.pow(d.lam, 3) * (0.6 + 0.4 * d.shim);
    const hr = minSide * (0.02 + spec * 0.045);
    const sa = clamp(0.07 + spec * 0.2 + sparkBoost * 0.06, 0, 0.32);
    paintGlow(
      gSpark,
      d.ccx + lx * minSide * 0.014,
      d.ccy + ly * minSide * 0.014,
      hr,
      hr,
      sa,
    );
  }
  ctx.restore();
  trace(outer);
  ctx.strokeStyle =
    "rgba(255,212,228," + (0.34 + 0.16 * (0.5 + 0.5 * Math.sin(t * 0.4))) + ")";
  ctx.lineWidth = Math.max(1.4, minSide * 0.003);
  ctx.stroke();
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  trace(outer);
  ctx.strokeStyle = "rgba(255,198,220,0.18)";
  ctx.lineWidth = Math.max(0.8, minSide * 0.0013);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < CFG.glints.length; i++) {
    const p = nodes[CFG.glints[i]];
    const sh = 0.5 + 0.5 * Math.sin(t * (0.8 + vBoost * 0.6) + i * 1.6);
    const gr = minSide * (0.006 + sh * 0.011);
    const ga = clamp(0.14 + sh * 0.26 + sparkBoost * 0.08, 0, 0.42);
    paintGlow(gSpark, p[0], p[1], gr, gr, ga);
  }
  ctx.restore();
  for (let i = 0; i < CFG.splinters.length; i++) {
    const s = CFG.splinters[i];
    const sx2 =
      cx +
      s.ox * rx * 1.5 +
      Math.sin(t * 0.08 + s.ph) * minSide * 0.02 -
      px * minSide * 0.03;
    const sy2 =
      cy +
      s.oy * ry * 1.4 +
      Math.cos(t * 0.07 + s.ph) * minSide * 0.02 -
      py * minSide * 0.025;
    const a2 = s.ang + t * s.spin;
    const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 0.6 + s.ph));
    const L = minSide * s.len;
    const Wd = L * s.rat;
    const ca = Math.cos(a2);
    const sa = Math.sin(a2);
    ctx.beginPath();
    ctx.moveTo(sx2 + ca * L, sy2 + sa * L);
    ctx.lineTo(sx2 - sa * Wd, sy2 + ca * Wd);
    ctx.lineTo(sx2 - ca * L, sy2 - sa * L);
    ctx.lineTo(sx2 + sa * Wd, sy2 - ca * Wd);
    ctx.closePath();
    const col = s.warm > 0.5 ? "250,198,218" : "224,150,188";
    ctx.fillStyle = "rgba(" + col + "," + s.a * tw + ")";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,222,236," + s.a * tw * 1.05 + ")";
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }
  const inset = minSide * 0.045;
  ctx.strokeStyle = "rgba(230,175,194,0.18)";
  ctx.lineWidth = Math.max(1.1, minSide * 0.0017);
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  const inset2 = inset + minSide * 0.013;
  ctx.strokeStyle = "rgba(255,208,224,0.10)";
  ctx.lineWidth = Math.max(0.7, minSide * 0.001);
  ctx.strokeRect(inset2, inset2, w - inset2 * 2, h - inset2 * 2);
  const clearSpace = ctx.createLinearGradient(0, 0, w * 0.66, 0);
  clearSpace.addColorStop(0, "rgba(9,6,10,0.92)");
  clearSpace.addColorStop(0.55, "rgba(9,6,10,0.60)");
  clearSpace.addColorStop(1, "rgba(9,6,10,0)");
  ctx.fillStyle = clearSpace;
  ctx.fillRect(0, 0, w * 0.66, h);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const rc = [
    [w - inset, inset],
    [w - inset, h - inset],
  ];
  for (let i = 0; i < 2; i++) {
    const gsh = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 0.5 + i * 1.7));
    const rr2 = minSide * (0.02 + gsh * 0.018);
    paintGlow(gSpark, rc[i][0], rc[i][1], rr2, rr2, 0.06 + gsh * 0.08);
  }
  ctx.restore();
  const vig = ctx.createRadialGradient(
    cx,
    cy,
    minSide * 0.16,
    w * 0.56,
    h * 0.5,
    Math.max(w, h) * 0.84,
  );
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(0.7, "rgba(6,3,7,0.16)");
  vig.addColorStop(1, "rgba(3,1,4,0.46)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
};
