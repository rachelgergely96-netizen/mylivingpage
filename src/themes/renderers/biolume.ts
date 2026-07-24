import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { softGlow } from "../shared/draw";
import { wrapSoft } from "../shared/wrap";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

const CFG = (function () {
  const rnd = createSeededRandom(90731);
  const R = function () { return rnd(); };
  const jellies = [];
  const jCount = 9;
  for (let i = 0; i < jCount; i++) {
    const depth = R();
    jellies.push({
      bx: 0.1 + R() * 0.8,
      by: 0.16 + R() * 0.68,
      ax: 0.14 + R() * 0.2,
      ay: 0.1 + R() * 0.16,
      sx: 0.028 + R() * 0.05,
      sy: 0.022 + R() * 0.04,
      phx: R() * TAU,
      phy: R() * TAU,
      size: 15 + depth * 46,
      hue: 158 + R() * 34,
      depth: depth,
      pulseSpeed: 0.5 + R() * 0.7,
      pulsePh: R() * TAU,
      tent: 6 + Math.floor(R() * 4),
      tail: 0.65 + R() * 0.8,
      wob: 0.7 + R() * 0.7
    });
  }
  jellies.sort(function (a, b) { return a.depth - b.depth; });
  const plankton = [];
  const pCount = 80;
  for (let i = 0; i < pCount; i++) {
    plankton.push({
      x: R(), y: R(),
      layer: R(),
      drift: 0.4 + R() * 1.3,
      ph: R() * TAU,
      flashPh: R() * TAU,
      flashRate: 0.6 + R() * 1.7,
      hue: 150 + R() * 40,
      size: 0.6 + R() * 1.5
    });
  }
  const snow = [];
  const sCount = 120;
  for (let i = 0; i < sCount; i++) {
    const layer = Math.floor(R() * 3);
    snow.push({
      x: R(), y: R(),
      layer: layer,
      speed: (0.006 + R() * 0.013) * (1 + layer * 0.85),
      sway: 0.4 + R() * 1.4,
      swayPh: R() * TAU,
      size: 0.5 + layer * 0.55 + R() * 0.7,
      bright: 0.05 + R() * 0.1 + layer * 0.05
    });
  }
  const rays = [];
  const rCount = 7;
  for (let i = 0; i < rCount; i++) {
    rays.push({
      x: (i + 0.5) / rCount + (R() - 0.5) * 0.06,
      w: 0.05 + R() * 0.08,
      sway: 0.02 + R() * 0.03,
      swayPh: R() * TAU,
      swaySpeed: 0.07 + R() * 0.12,
      bright: 0.5 + R() * 0.5,
      tilt: (R() - 0.5) * 0.5
    });
  }
  const currents = [];
  const cCount = 16;
  for (let i = 0; i < cCount; i++) {
    currents.push({
      x: R(), y: R(),
      len: 26 + Math.floor(R() * 16),
      ph: R() * TAU,
      hue: 168 + R() * 20,
      op: 0.018 + R() * 0.03
    });
  }
  const fog = [];
  const fCount = 14;
  for (let i = 0; i < fCount; i++) {
    fog.push({
      x: R(), y: 0.28 + R() * 0.62,
      r: 0.16 + R() * 0.2,
      drift: 0.01 + R() * 0.02,
      ph: R() * TAU,
      op: 0.02 + R() * 0.03
    });
  }
  const chains = [];
  const chCount = 3;
  for (let i = 0; i < chCount; i++) {
    chains.push({
      x: 0.15 + R() * 0.7,
      y: 0.14 + R() * 0.5,
      ax: 0.09 + R() * 0.13,
      sx: 0.02 + R() * 0.03,
      phx: R() * TAU,
      nodes: 12 + Math.floor(R() * 8),
      seg: 10 + R() * 8,
      hue: 160 + R() * 26,
      wobble: 0.4 + R() * 0.5,
      speed: 0.5 + R() * 0.5,
      bob: 0.02 + R() * 0.03
    });
  }
  return { jellies: jellies, plankton: plankton, snow: snow, rays: rays, currents: currents, fog: fog, chains: chains };
})();
// Per-context cache for the two fully-static full-screen gradients (col + vignette).
const GRAD: {
  key: string;
  ctx: CanvasRenderingContext2D | null;
  col: CanvasGradient | null;
  vig: CanvasGradient | null;
} = { key: "", ctx: null, col: null, vig: null };

export const renderBiolume: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const C = CFG;
  const mxp = mx * w, myp = my * h;
  const px = mx - 0.5, py = my - 0.5;
  const prev = ctx.globalCompositeOperation;

  // Cache fully-static full-screen gradients; rebuild only on resize / ctx change.
  const gkey = w + "x" + h;
  if (GRAD.key !== gkey || GRAD.ctx !== ctx) {
    GRAD.ctx = ctx;
    GRAD.key = gkey;
    const colG = ctx.createLinearGradient(0, 0, 0, h);
    colG.addColorStop(0, "rgba(24, 104, 96, 0.07)");
    colG.addColorStop(0.35, "rgba(12, 62, 60, 0.045)");
    colG.addColorStop(0.7, "rgba(4, 22, 26, 0.02)");
    colG.addColorStop(1, "rgba(0,0,0,0)");
    GRAD.col = colG;
    const vigG = ctx.createRadialGradient(w * 0.5, h * 0.46, Math.min(w, h) * 0.3, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
    vigG.addColorStop(0, "rgba(3, 11, 12, 0.14)");
    vigG.addColorStop(0.7, "rgba(2, 9, 10, 0.30)");
    vigG.addColorStop(1, "rgba(1, 5, 6, 0.62)");
    GRAD.vig = vigG;
  }

  ctx.globalCompositeOperation = "lighter";

  ctx.fillStyle = GRAD.col!;
  ctx.fillRect(0, 0, w, h);

  const amb = ctx.createRadialGradient(w * (0.5 + px * 0.1), h * 0.32, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
  amb.addColorStop(0, "rgba(20, 92, 84, 0.08)");
  amb.addColorStop(0.5, "rgba(8, 44, 46, 0.035)");
  amb.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = amb;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < C.rays.length; i++) {
    const r = C.rays[i];
    const sway = Math.sin(t * r.swaySpeed + r.swayPh) * r.sway;
    const cx = (r.x + sway + px * 0.05) * w;
    const topX = cx + r.tilt * w * 0.12;
    const halfTop = r.w * w * 0.5;
    const halfBot = halfTop * 2.4;
    const a = (0.05 + 0.03 * Math.sin(t * 0.2 + r.swayPh)) * r.bright * 0.82;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(108, 216, 196, " + a + ")");
    g.addColorStop(0.5, "rgba(70, 200, 180, " + (a * 0.4) + ")");
    g.addColorStop(1, "rgba(60, 180, 170, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(topX - halfTop, 0);
    ctx.lineTo(topX + halfTop, 0);
    ctx.lineTo(cx + halfBot, h);
    ctx.lineTo(cx - halfBot, h);
    ctx.closePath();
    ctx.fill();
  }

  for (let i = 0; i < C.fog.length; i++) {
    const f = C.fog[i];
    const drift = Math.sin(t * f.drift + f.ph);
    const fx = (f.x + drift * 0.05) * w;
    const fy = (f.y + Math.cos(t * f.drift * 0.7 + f.ph) * 0.03) * h;
    const rad = f.r * Math.min(w, h);
    const n = 0.55 + 0.45 * fbm(f.x * 3 + t * 0.03, f.y * 3, 3);
    const a = f.op * n;
    softGlow(ctx, fx, fy, rad, "rgba(40, 150, 140, " + a + ")", "transparent");
  }

  for (let i = 0; i < 3; i++) {
    const by = h * (0.28 + i * 0.24) + Math.sin(t * 0.12 + i * 2) * 14;
    const ba = 0.02 + Math.sin(t * 0.18 + i) * 0.008;
    const band = ctx.createLinearGradient(0, by - 70, 0, by + 70);
    band.addColorStop(0, "rgba(30,120,110,0)");
    band.addColorStop(0.5, "rgba(30,120,110," + Math.max(0, ba) + ")");
    band.addColorStop(1, "rgba(30,120,110,0)");
    ctx.fillStyle = band;
    ctx.fillRect(0, by - 70, w, 140);
  }

  ctx.lineWidth = 0.8;
  for (let i = 0; i < C.currents.length; i++) {
    const c = C.currents[i];
    let cpx = c.x * w, cpy = c.y * h;
    ctx.beginPath();
    ctx.moveTo(cpx, cpy);
    for (let s = 0; s < c.len; s++) {
      const ang = fbm(cpx * 0.0026 + t * 0.02 + c.ph, cpy * 0.0026, 2) * TAU;
      cpx += Math.cos(ang) * 5;
      cpy += Math.sin(ang) * 5;
      ctx.lineTo(cpx, cpy);
    }
    const op = c.op + Math.sin(t * 0.3 + c.ph) * 0.01;
    ctx.strokeStyle = "hsla(" + c.hue + ", 72%, 56%, " + Math.max(0, op) + ")";
    ctx.stroke();
  }

  const snowN = C.snow.length < 72 ? C.snow.length : 72;
  for (let i = 0; i < snowN; i++) {
    const s = C.snow[i];
    const par = (s.layer + 1) * 0.012;
    // Wrap the intrinsic drift only and fade at the seam; parallax shifts the
    // wrapped position afterwards so pointer motion can never cause a pop.
    const wy = wrapSoft(s.y + t * s.speed, 1, 0.05);
    const wx = wrapSoft(s.x + Math.sin(t * 0.1 * s.sway + s.swayPh) * 0.01, 1, 0.05);
    const sx = (wx.u - px * par) * w;
    const nxs = wx.u - 0.42, nys = wy.u - 0.46;
    let rf = Math.sqrt(nxs * nxs * 1.2 + nys * nys) / 0.42;
    rf = rf > 1 ? 1 : rf;
    rf = 0.5 + 0.5 * rf;
    ctx.beginPath();
    ctx.arc(sx, wy.u * h, s.size, 0, TAU);
    ctx.fillStyle = "rgba(150, 232, 212, " + (s.bright * rf * wx.alpha * wy.alpha) + ")";
    ctx.fill();
  }

  for (let i = 0; i < C.plankton.length; i++) {
    const p = C.plankton[i];
    const par = 0.02 + p.layer * 0.04;
    const wbx = wrapSoft(p.x + Math.sin(t * 0.08 * p.drift + p.ph) * 0.02, 1, 0.06);
    const wby = wrapSoft(p.y + Math.cos(t * 0.07 * p.drift + p.ph) * 0.015, 1, 0.06);
    const wrapA = wbx.alpha * wby.alpha;
    const bx = wbx.u - px * par;
    const by = wby.u - py * par;
    let x = bx * w, y = by * h;
    const ddx = mxp - x, ddy = myp - y;
    const dd = Math.hypot(ddx, ddy);
    if (dd < 140 && dd > 0.001) {
      const pull = (1 - dd / 140) * 18;
      x += (ddx / dd) * pull;
      y += (ddy / dd) * pull;
    }
    const rdx = bx - 0.42, rdy = by - 0.46;
    let readF = Math.sqrt(rdx * rdx * 1.2 + rdy * rdy) / 0.42;
    readF = readF > 1 ? 1 : readF;
    readF = 0.5 + 0.5 * readF;
    const ftv = Math.sin(t * p.flashRate + p.flashPh);
    let flash = ftv > 0.9 ? (ftv - 0.9) / 0.1 : 0;
    flash *= readF;
    const base = 0.12 + 0.1 * Math.sin(t * 1.1 + p.ph);
    const bri = Math.max(0.015, (base + flash * 0.5) * readF) * wrapA;
    if (flash * wrapA > 0.15) {
      softGlow(ctx, x, y, 6 + flash * 9, "hsla(" + p.hue + ", 82%, 66%, " + (flash * wrapA * 0.11) + ")", "transparent");
    }
    ctx.beginPath();
    ctx.arc(x, y, p.size + flash * 1.5, 0, TAU);
    ctx.fillStyle = "hsla(" + p.hue + ", 78%, " + (56 + flash * 18) + "%, " + bri + ")";
    ctx.fill();
  }

  for (let i = 0; i < C.chains.length; i++) {
    const ch = C.chains[i];
    const headX = (ch.x + Math.sin(t * ch.sx + ch.phx) * ch.ax - px * 0.05) * w;
    const headY = (ch.y + Math.sin(t * ch.bob + ch.phx) * 0.11) * h;
    ctx.beginPath();
    ctx.moveTo(headX, headY);
    for (let n = 1; n <= ch.nodes; n++) {
      const ny = headY + n * ch.seg;
      const nx = headX + Math.sin(t * ch.speed + n * 0.6 + ch.phx) * ch.seg * ch.wobble;
      ctx.lineTo(nx, ny);
    }
    ctx.strokeStyle = "hsla(" + ch.hue + ", 70%, 58%, 0.09)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    for (let n = 0; n <= ch.nodes; n += 2) {
      const ny = headY + n * ch.seg;
      const nx = headX + Math.sin(t * ch.speed + n * 0.6 + ch.phx) * ch.seg * ch.wobble;
      const pul = 0.5 + 0.5 * Math.sin(t * 1.4 + n * 0.5 + ch.phx);
      ctx.beginPath();
      ctx.arc(nx, ny, 1.5 + pul * 1.4, 0, TAU);
      ctx.fillStyle = "hsla(" + (ch.hue + 10) + ", 80%, 68%, " + (0.16 + 0.20 * pul) + ")";
      ctx.fill();
    }
  }

  ctx.lineCap = "round";
  for (let i = 0; i < C.jellies.length; i++) {
    const j = C.jellies[i];
    const dpar = 0.02 + j.depth * 0.1;
    let jx = (j.bx + Math.sin(t * j.sx + j.phx) * j.ax - px * dpar) * w;
    let jy = (j.by + Math.cos(t * j.sy + j.phy) * j.ay + Math.sin(t * 0.3 + j.phx) * 0.01 - py * dpar) * h;
    const rdx = jx - mxp, rdy = jy - myp;
    const rdist = Math.hypot(rdx, rdy);
    const reach = 180 + j.size * 2;
    if (rdist < reach && rdist > 0.001) {
      const push = (1 - rdist / reach) * (30 + j.size * 0.5);
      jx += (rdx / rdist) * push;
      jy += (rdy / rdist) * push;
    }
    const size = j.size;
    const pulse = 0.82 + Math.sin(t * j.pulseSpeed + j.pulsePh) * 0.18;
    const bw = size * pulse;
    const bh = size * (0.62 + (1 - pulse) * 0.5);
    const hue = j.hue;
    const glowA = 0.06 + 0.03 * pulse + j.depth * 0.03;

    softGlow(ctx, jx, jy - bh * 0.1, size * 2.6, "hsla(" + hue + ", 70%, 56%, " + glowA + ")", "transparent");

    for (let ten = 0; ten < j.tent; ten++) {
      const frac = j.tent > 1 ? ten / (j.tent - 1) : 0.5;
      const rootX = jx + (frac - 0.5) * bw * 1.5;
      const rootY = jy + bh * 0.2;
      ctx.beginPath();
      ctx.moveTo(rootX, rootY);
      for (let seg = 1; seg <= 10; seg++) {
        const sy = rootY + seg * (size * 0.2 * j.tail);
        const swy = Math.sin(t * 0.7 * j.pulseSpeed + i + ten * 0.6 + seg * 0.45) * (2 + seg * 0.9) * j.wob;
        const sx = rootX + (frac - 0.5) * seg * 1.2 + swy;
        ctx.lineTo(sx, sy);
      }
      ctx.strokeStyle = "hsla(" + (hue + 12) + ", 72%, 60%, " + (0.06 + 0.03 * pulse) + ")";
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }

    for (let oa = 0; oa < 4; oa++) {
      const rootX = jx + (oa - 1.5) * bw * 0.4;
      const rootY = jy + bh * 0.1;
      ctx.beginPath();
      ctx.moveTo(rootX, rootY);
      for (let seg = 1; seg <= 6; seg++) {
        const sy = rootY + seg * (size * 0.16);
        const swy = Math.sin(t * 0.9 + i * 1.3 + oa * 1.1 + seg * 0.7) * (1.5 + seg * 1.3);
        ctx.lineTo(rootX + swy, sy);
      }
      ctx.strokeStyle = "hsla(" + (hue - 6) + ", 65%, 64%, " + (0.08 + 0.04 * pulse) + ")";
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.ellipse(jx, jy, bw, bh, 0, Math.PI, TAU);
    ctx.closePath();
    const bell = ctx.createRadialGradient(jx, jy - bh * 0.5, 0, jx, jy, bw * 1.1);
    bell.addColorStop(0, "hsla(" + (hue + 8) + ", 80%, 68%, " + (0.20 + 0.10 * pulse) + ")");
    bell.addColorStop(0.5, "hsla(" + hue + ", 75%, 54%, 0.13)");
    bell.addColorStop(1, "hsla(" + (hue - 8) + ", 70%, 42%, 0)");
    ctx.fillStyle = bell;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(jx, jy - bh * 0.28, bw * 0.42, bh * 0.4, 0, 0, TAU);
    const core = ctx.createRadialGradient(jx, jy - bh * 0.3, 0, jx, jy - bh * 0.28, bw * 0.5);
    core.addColorStop(0, "hsla(" + (hue + 14) + ", 82%, 70%, " + (0.16 + 0.10 * pulse) + ")");
    core.addColorStop(1, "hsla(" + (hue + 6) + ", 80%, 56%, 0)");
    ctx.fillStyle = core;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(jx, jy, bw * 0.94, bh * 0.94, 0, Math.PI * 1.08, Math.PI * 1.92);
    ctx.strokeStyle = "hsla(" + (hue + 20) + ", 82%, 70%, " + (0.14 + 0.08 * pulse) + ")";
    ctx.lineWidth = 1.4;
    ctx.stroke();

    for (let m = 0; m < 5; m++) {
      const mf = m / 4;
      ctx.beginPath();
      ctx.arc(jx + (mf - 0.5) * bw * 1.9, jy, 1.1 + pulse, 0, TAU);
      ctx.fillStyle = "hsla(" + (hue + 18) + ", 82%, 70%, " + (0.18 * pulse) + ")";
      ctx.fill();
    }
  }
  ctx.lineCap = "butt";

  const pointerOff = Math.hypot(px, py);
  let wf = (pointerOff - 0.03) / 0.11;
  wf = wf < 0 ? 0 : (wf > 1 ? 1 : wf);
  wf = wf * wf * (3 - 2 * wf);
  if (wf > 0.001) {
    const wob = 0.5 + 0.5 * Math.sin(t * 2.4);
    softGlow(ctx, mxp, myp, 120, "hsla(172, 82%, 62%, " + ((0.05 + wob * 0.03) * wf) + ")", "transparent");
    for (let r = 0; r < 3; r++) {
      const rr = (t * 40 + r * 40) % 120;
      const a = (1 - rr / 120) * 0.12 * wf;
      ctx.beginPath();
      ctx.arc(mxp, myp, rr + 8, 0, TAU);
      ctx.strokeStyle = "hsla(168, 82%, 64%, " + a + ")";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = GRAD.vig!;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = prev;
};
