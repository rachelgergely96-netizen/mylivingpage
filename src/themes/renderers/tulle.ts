import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import {
  finiteClamp,
  resolveThemeMotion,
  storyStepWeight,
} from "../shared/motion";
import { softGlow } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

interface TulleDrape {
  x: number;
  w: number;
  yTop: number;
  hMul: number;
  amp: number;
  sag: number;
  depth: number;
  phase: number;
  speed: number;
  color: number[];
  cols: number;
  rows: number;
  sheenSpeed: number;
  sheenPhase: number;
  sheenW: number;
}

interface TulleGradientCache {
  key: string;
  bg: CanvasGradient | null;
  clear: CanvasGradient | null;
  grade: CanvasGradient | null;
  vig: CanvasGradient | null;
}

const CFG = (function () {
  const rnd = createSeededRandom(2130741);
  const palette = [
    [126, 151, 184],
    [150, 150, 190],
    [190, 174, 210],
    [201, 190, 221],
    [224, 214, 234],
  ];
  const drapeDefs = [
    { x: 0.5, w: 0.44, amp: 0.055, sag: 0.05, depth: 0.2, ci: 0 },
    { x: 0.605, w: 0.41, amp: 0.086, sag: 0.07, depth: 0.42, ci: 1 },
    { x: 0.7, w: 0.37, amp: 0.074, sag: 0.06, depth: 0.62, ci: 2 },
    { x: 0.795, w: 0.34, amp: 0.096, sag: 0.076, depth: 0.8, ci: 3 },
    { x: 0.885, w: 0.3, amp: 0.07, sag: 0.05, depth: 1.0, ci: 4 },
  ];
  const drapes: TulleDrape[] = [];
  for (let i = 0; i < drapeDefs.length; i++) {
    const d = drapeDefs[i];
    drapes.push({
      x: d.x,
      w: d.w,
      yTop: -0.06 - rnd() * 0.08,
      hMul: 1.12 + rnd() * 0.06,
      amp: d.amp,
      sag: d.sag,
      depth: d.depth,
      phase: rnd() * TAU,
      speed: 0.7 + rnd() * 0.5,
      color: palette[d.ci],
      cols: 5 + (i % 2),
      rows: 5 + (i % 2),
      sheenSpeed: 0.05 + i * 0.03 + rnd() * 0.02,
      sheenPhase: rnd() * TAU,
      sheenW: 0.15 + rnd() * 0.1,
    });
  }
  const massColors = [
    [201, 214, 243],
    [150, 132, 196],
    [201, 190, 221],
    [120, 140, 180],
    [230, 222, 240],
  ];
  const masses = [];
  for (let i = 0; i < 5; i++) {
    const m = {
      x: 0.63 + rnd() * 0.3,
      y: 0.18 + rnd() * 0.54,
      r: 0.28 + rnd() * 0.24,
      color: massColors[i],
      amp: 0.03 + rnd() * 0.04,
      phase: rnd() * TAU,
      speed: 0.045 + rnd() * 0.07,
      alpha: 0.05 + rnd() * 0.045,
    };
    if (i < 3) masses.push(m);
  }
  const wisps = [];
  for (let i = 0; i < 6; i++) {
    wisps.push({
      bx: 0.52 + i * 0.075,
      seed: i,
      col: [190, 180, 214],
      phase: rnd() * TAU,
    });
  }
  const motes = [];
  for (let i = 0; i < 40; i++) {
    motes.push({
      x: 0.32 + rnd() * 0.7,
      y: rnd(),
      r: 0.4 + rnd() * 1.5,
      depth: rnd(),
      phase: rnd() * TAU,
      driftX: rnd() - 0.5,
      driftY: rnd() - 0.5,
      driftSpeed: 0.03 + rnd() * 0.06,
      twPhase: rnd() * TAU,
      twSpeed: 0.3 + rnd() * 0.9,
    });
  }
  const pearls = [];
  for (let i = 0; i < 24; i++) {
    pearls.push({
      di: i % drapeDefs.length,
      u: rnd(),
      v: 0.1 + rnd() * 0.82,
      r: 0.9 + rnd() * 1.6,
      phase: rnd() * TAU,
      twSpeed: 0.22 + rnd() * 0.7,
    });
  }
  return {
    drapes: drapes,
    masses: masses,
    wisps: wisps,
    motes: motes,
    pearls: pearls,
  };
})();
const GRAD: TulleGradientCache = {
  key: "",
  bg: null,
  clear: null,
  grade: null,
  vig: null,
};

export const renderTulle: ThemeRenderer = (
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
  const minSide = Math.min(w, h) || 1;
  const maxSide = Math.max(w, h) || 1;
  const px = finiteClamp(mx, 0, 1, 0.5) - 0.5;
  const py = finiteClamp(my, 0, 1, 0.5) - 0.5;
  const pullX = px * minSide * 0.11 + M.scrollVelocity * minSide * 0.012;
  const pullY = py * minSide * 0.065 - M.interactionImpulse * minSide * 0.025;
  const story = M.storyProgress;
  const fp = (
    d: TulleDrape,
    u: number,
    v: number,
    ph: number,
  ): [number, number] => {
    const anchored = v * v;
    const billow = Math.sin(v * Math.PI * 1.55 + ph + u * 1.8);
    const secondary = Math.sin(u * Math.PI * 3.1 + ph * 0.7 - v * 2.0);
    const cross =
      Math.sin(u * Math.PI * 2.4 - ph * 0.45) * Math.sin(v * Math.PI);
    const amp = d.amp * minSide;
    const sag = d.sag * minSide;
    const x =
      d.x * w +
      u * d.w * minSide +
      billow * amp * (0.18 + anchored * 0.82) +
      secondary * amp * 0.28 +
      pullX * anchored * d.depth;
    const y =
      d.yTop * h +
      v * d.hMul * h +
      Math.sin(u * Math.PI) * sag * Math.sin(v * Math.PI) +
      cross * sag * 0.2 +
      pullY * anchored * d.depth;
    return [x, y];
  };
  const trace = (d: TulleDrape, ph: number) => {
    const seg = 12;
    ctx.beginPath();
    for (let i = 0; i <= seg; i++) {
      const p = fp(d, i / seg, 0, ph);
      if (i) ctx.lineTo(p[0], p[1]);
      else ctx.moveTo(p[0], p[1]);
    }
    for (let i = 1; i <= seg; i++) {
      const p = fp(d, 1, i / seg, ph);
      ctx.lineTo(p[0], p[1]);
    }
    for (let i = seg - 1; i >= 0; i--) {
      const p = fp(d, i / seg, 1, ph);
      ctx.lineTo(p[0], p[1]);
    }
    for (let i = seg - 1; i > 0; i--) {
      const p = fp(d, 0, i / seg, ph);
      ctx.lineTo(p[0], p[1]);
    }
    ctx.closePath();
  };
  ctx.save();
  const gkey = w + "x" + h;
  if (GRAD.key !== gkey) {
    GRAD.key = gkey;
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "rgba(19,21,37,0.55)");
    bg.addColorStop(0.5, "rgba(15,18,32,0.34)");
    bg.addColorStop(1, "rgba(3,4,9,0.62)");
    GRAD.bg = bg;
    const clear = ctx.createLinearGradient(0, 0, w * 0.7, 0);
    clear.addColorStop(0, "rgba(6,7,11,0.88)");
    clear.addColorStop(0.5, "rgba(6,7,11,0.56)");
    clear.addColorStop(1, "rgba(6,7,11,0)");
    GRAD.clear = clear;
    const grade = ctx.createRadialGradient(
      w * 0.78,
      h * 0.34,
      0,
      w * 0.78,
      h * 0.4,
      minSide * 0.85,
    );
    grade.addColorStop(0, "rgba(201,190,221,0.05)");
    grade.addColorStop(0.5, "rgba(150,132,196,0.02)");
    grade.addColorStop(1, "rgba(6,7,11,0)");
    GRAD.grade = grade;
    const vig = ctx.createRadialGradient(
      w * 0.72,
      h * 0.44,
      minSide * 0.15,
      w * 0.55,
      h * 0.5,
      maxSide * 0.85,
    );
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.42)");
    GRAD.vig = vig;
  }
  ctx.fillStyle = GRAD.bg!;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(w * 0.34, 0, w * 0.66, h);
  ctx.clip();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < CFG.masses.length; i++) {
    const m = CFG.masses[i];
    const c = m.color;
    const mxp =
      m.x * w +
      Math.cos(t * m.speed + m.phase) * m.amp * w +
      px * minSide * 0.05 * m.r;
    const myp =
      m.y * h +
      Math.sin(t * m.speed * 0.8 + m.phase) * m.amp * h +
      py * minSide * 0.05 * m.r;
    const pulse = 0.7 + 0.3 * Math.sin(t * 0.2 + m.phase);
    const nz = fbm(m.x * 3 + t * 0.05, m.y * 3, 3);
    const a = m.alpha * pulse * (0.55 + 0.45 * (nz * 0.5 + 0.5));
    softGlow(
      ctx,
      mxp,
      myp,
      m.r * maxSide * 0.42,
      "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a.toFixed(4) + ")",
      "transparent",
    );
  }
  for (let i = 0; i < CFG.wisps.length; i++) {
    const wp = CFG.wisps[i];
    const nx = fbm(wp.seed * 1.7 + t * 0.06, 3.1, 3);
    const ny = fbm(wp.seed * 2.3, t * 0.05 + 1.7, 3);
    const hx = wp.bx * w + nx * minSide * 0.12;
    const hy = (0.4 + ny * 0.28) * h;
    const hr =
      minSide * (0.14 + 0.06 * (0.5 + 0.5 * Math.sin(t * 0.1 + wp.phase)));
    const ha =
      0.022 + 0.024 * (0.5 + 0.5 * Math.sin(t * 0.13 + wp.phase * 1.3));
    softGlow(
      ctx,
      hx,
      hy,
      hr,
      "rgba(" +
        wp.col[0] +
        "," +
        wp.col[1] +
        "," +
        wp.col[2] +
        "," +
        ha.toFixed(4) +
        ")",
      "transparent",
    );
  }
  ctx.restore();
  for (let i = 0; i < CFG.drapes.length; i++) {
    const d = CFG.drapes[i];
    const ph = t * 0.05 * d.speed + d.phase + story * 0.9;
    const c = d.color;
    const baseA = 0.05 + d.depth * 0.09;
    trace(d, ph);
    const g = ctx.createLinearGradient(d.x * w, 0, d.x * w + d.w * minSide, h);
    g.addColorStop(
      0,
      "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + baseA.toFixed(4) + ")",
    );
    g.addColorStop(
      0.48,
      "rgba(" +
        (c[0] + 18) +
        "," +
        (c[1] + 16) +
        "," +
        (c[2] + 12) +
        "," +
        (baseA * 2.2).toFixed(4) +
        ")",
    );
    g.addColorStop(
      1,
      "rgba(" +
        Math.max(0, c[0] - 24) +
        "," +
        Math.max(0, c[1] - 20) +
        "," +
        Math.max(0, c[2] - 14) +
        "," +
        (baseA * 0.5).toFixed(4) +
        ")",
    );
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    const le = d.x * w + pullX * d.depth;
    const shW = Math.max(1, d.w * minSide * 0.34);
    const sh = ctx.createLinearGradient(
      le - d.amp * minSide * 2,
      0,
      le + shW,
      0,
    );
    sh.addColorStop(
      0,
      "rgba(4,5,10," + (0.16 + d.depth * 0.12).toFixed(4) + ")",
    );
    sh.addColorStop(1, "rgba(4,5,10,0)");
    ctx.fillStyle = sh;
    ctx.fillRect(le - d.amp * minSide * 2, 0, shW + d.amp * minSide * 2, h);
    ctx.globalCompositeOperation = "lighter";
    const l = d.x * w - d.amp * minSide * 1.5 + pullX * d.depth;
    const r = d.x * w + d.w * minSide + d.amp * minSide * 1.5 + pullX * d.depth;
    const sg = ctx.createLinearGradient(l, 0, r, 0);
    const s = 0.5 + 0.42 * Math.sin(t * d.sheenSpeed + d.sheenPhase);
    const sheenA = 0.04 + d.depth * 0.075;
    sg.addColorStop(Math.max(0, s - d.sheenW), "rgba(232,234,250,0)");
    sg.addColorStop(
      Math.min(1, Math.max(0.0001, s)),
      "rgba(236,236,250," + sheenA.toFixed(4) + ")",
    );
    sg.addColorStop(Math.min(1, s + d.sheenW), "rgba(232,234,250,0)");
    ctx.fillStyle = sg;
    ctx.fillRect(l, 0, Math.max(1, r - l), h);
    for (let col = 0; col <= d.cols; col++) {
      const u = col / d.cols;
      ctx.beginPath();
      for (let s2 = 0; s2 <= 6; s2++) {
        const p = fp(d, u, s2 / 6, ph);
        if (s2) ctx.lineTo(p[0], p[1]);
        else ctx.moveTo(p[0], p[1]);
      }
      const lit = 0.5 + 0.5 * Math.sin(u * Math.PI * 2 + ph * 1.5);
      ctx.strokeStyle =
        "rgba(224,229,248," +
        ((0.03 + d.depth * 0.04) * (0.45 + lit * 0.9)).toFixed(4) +
        ")";
      ctx.lineWidth = 0.6 + d.depth * 0.5;
      ctx.stroke();
    }
    for (let row = 0; row <= d.rows; row++) {
      const v = row / d.rows;
      ctx.beginPath();
      for (let s2 = 0; s2 <= 6; s2++) {
        const p = fp(d, s2 / 6, v, ph);
        if (s2) ctx.lineTo(p[0], p[1]);
        else ctx.moveTo(p[0], p[1]);
      }
      ctx.strokeStyle =
        "rgba(230,224,245," +
        (
          (0.025 + d.depth * 0.032) *
          (0.55 + 0.5 * Math.sin(v * Math.PI))
        ).toFixed(4) +
        ")";
      ctx.lineWidth = 0.55 + d.depth * 0.4;
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalCompositeOperation = "lighter";
    const ew = storyStepWeight(story, i, CFG.drapes.length);
    ctx.beginPath();
    for (let s2 = 0; s2 <= 16; s2++) {
      const p = fp(d, 0, s2 / 16, ph);
      if (s2) ctx.lineTo(p[0], p[1]);
      else ctx.moveTo(p[0], p[1]);
    }
    ctx.strokeStyle =
      "rgba(240,238,252," +
      (0.05 + d.depth * 0.06 + ew * 0.13).toFixed(4) +
      ")";
    ctx.lineWidth = 0.9 + d.depth * 0.9 + ew * 0.8;
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
    ctx.beginPath();
    for (let s2 = 0; s2 <= 16; s2++) {
      const p = fp(d, 1, s2 / 16, ph);
      if (s2) ctx.lineTo(p[0], p[1]);
      else ctx.moveTo(p[0], p[1]);
    }
    ctx.strokeStyle =
      "rgba(60,68,96," + (0.06 + d.depth * 0.09).toFixed(4) + ")";
    ctx.lineWidth = 0.8 + d.depth * 0.9;
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < CFG.pearls.length; i++) {
    const pl = CFG.pearls[i];
    const d = CFG.drapes[pl.di];
    const ph = t * 0.05 * d.speed + d.phase + story * 0.9;
    const p = fp(d, pl.u, pl.v, ph);
    const tw = 0.5 + 0.5 * Math.sin(t * pl.twSpeed + pl.phase);
    let fb = 0;
    if (M.hasFocus) {
      const fdx = p[0] - M.focusX * w;
      const fdy = p[1] - M.focusY * h;
      fb = Math.max(0, 1 - Math.sqrt(fdx * fdx + fdy * fdy) / (minSide * 0.3));
    }
    const rr = Math.max(
      0.5,
      pl.r * minSide * 0.0015 * (0.7 + d.depth * 0.5) * (0.75 + tw * 0.5),
    );
    softGlow(
      ctx,
      p[0],
      p[1],
      rr * 5 + 3,
      "rgba(232,230,248," + (0.045 + tw * 0.075 + fb * 0.05).toFixed(4) + ")",
      "transparent",
    );
    ctx.beginPath();
    ctx.arc(p[0], p[1], rr, 0, TAU);
    ctx.fillStyle =
      "rgba(238,236,250," + (0.15 + tw * 0.18 + fb * 0.12).toFixed(4) + ")";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p[0] - rr * 0.3, p[1] - rr * 0.3, Math.max(0.2, rr * 0.4), 0, TAU);
    ctx.fillStyle =
      "rgba(244,242,252," + (0.14 + tw * 0.16 + fb * 0.08).toFixed(4) + ")";
    ctx.fill();
  }
  for (let i = 0; i < CFG.motes.length; i++) {
    const mo = CFG.motes[i];
    const x =
      mo.x * w +
      Math.sin(t * mo.driftSpeed + mo.phase) * minSide * 0.03 * mo.driftX -
      px * minSide * 0.05 * mo.depth;
    const y =
      mo.y * h +
      Math.cos(t * mo.driftSpeed * 0.9 + mo.phase) *
        minSide *
        0.025 *
        mo.driftY -
      py * minSide * 0.05 * mo.depth;
    const tw = 0.5 + 0.5 * Math.sin(t * mo.twSpeed + mo.twPhase);
    const rr = Math.max(
      0.3,
      mo.r * (0.5 + mo.depth) * (0.4 + tw * 0.8) * minSide * 0.0011,
    );
    const a = (0.03 + mo.depth * 0.06) * tw;
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, TAU);
    ctx.fillStyle = "rgba(222,220,242," + a.toFixed(4) + ")";
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  if (M.hasFocus) {
    const d0 = CFG.drapes[0];
    const tp = fp(d0, 0.08, 0.52, t * 0.05 * d0.speed + d0.phase + story * 0.9);
    ctx.beginPath();
    ctx.moveTo(M.focusX * w, M.focusY * h);
    ctx.quadraticCurveTo(w * 0.6, M.focusY * h, tp[0], tp[1]);
    ctx.strokeStyle = "rgba(214,210,236,0.14)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.fillStyle = GRAD.clear!;
  ctx.fillRect(0, 0, w * 0.7, h);
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = GRAD.grade!;
  ctx.fillRect(w * 0.34, 0, w * 0.66, h);
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = GRAD.vig!;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
};
