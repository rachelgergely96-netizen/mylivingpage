import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { finiteClamp, resolveThemeMotion } from "../shared/motion";
import { star4 } from "../shared/draw";
import { wrapSoft } from "../shared/wrap";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

// One cached frost-glow gradient reused for every bright particle: the per
// particle createRadialGradient allocations were the hottest line in this
// renderer. The gradient is authored at a fixed radius and scaled into place.
const GLOW_RADIUS = 48;
let frostGlow: CanvasGradient | null = null;
let frostGlowContext: CanvasRenderingContext2D | null = null;
function stampFrostGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  alpha: number,
) {
  if (!(alpha > 0) || !(r > 0)) return;
  if (!frostGlow || frostGlowContext !== ctx) {
    frostGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, GLOW_RADIUS);
    frostGlow.addColorStop(0, "hsla(198, 74%, 80%, 1)");
    frostGlow.addColorStop(1, "hsla(198, 74%, 80%, 0)");
    frostGlowContext = ctx;
  }
  ctx.save();
  ctx.globalAlpha = alpha > 1 ? 1 : alpha;
  ctx.translate(x, y);
  const s = r / GLOW_RADIUS;
  ctx.scale(s, s);
  ctx.fillStyle = frostGlow;
  ctx.fillRect(-GLOW_RADIUS, -GLOW_RADIUS, GLOW_RADIUS * 2, GLOW_RADIUS * 2);
  ctx.restore();
}

const CFG = (function () {
  const R = createSeededRandom(20260721);
  const crystals = [];
  for (let i = 0; i < 15; i += 1) {
    const depth = R();
    crystals.push({
      bx: R(), by: R(), depth,
      size: 11 + depth * 44,
      driftA: R() * TAU,
      dsx: 0.006 + R() * 0.02,
      dsy: 0.005 + R() * 0.018,
      dax: 0.03 + R() * 0.11,
      day: 0.025 + R() * 0.09,
      rot: R() * TAU,
      rotSpeed: (R() - 0.5) * 0.05,
      hue: 190 + R() * 22,
      phase: R() * TAU
    });
  }
  const layers = [];
  const counts = [60, 50, 34];
  for (let L = 0; L < 3; L += 1) {
    const lr = createSeededRandom(700 + L * 131);
    const parts = [];
    for (let i = 0; i < counts[L]; i += 1) {
      parts.push({
        x: lr(), y: lr(),
        r: (0.6 + lr() * 1.4) * (0.6 + L * 0.5),
        speed: (0.01 + lr() * 0.03) * (0.5 + L * 0.6),
        sway: lr() * TAU,
        swaySpeed: 0.2 + lr() * 0.5,
        swayAmp: 4 + lr() * 14,
        tw: lr() * TAU,
        twSpeed: 0.22 + lr() * 0.55,
        bright: lr()
      });
    }
    layers.push({ parts, parallax: 6 + L * 15 });
  }
  const fog = [];
  const fr = createSeededRandom(9931);
  for (let i = 0; i < 14; i += 1) {
    fog.push({
      x: fr(), y: 0.28 + fr() * 0.56,
      r: 0.1 + fr() * 0.15,
      drift: fr() * TAU,
      driftSpeed: 0.01 + fr() * 0.03,
      hue: 196 + fr() * 16,
      phase: fr() * TAU
    });
  }
  const aur = [];
  const ar = createSeededRandom(5150);
  for (let i = 0; i < 4; i += 1) {
    aur.push({
      x: 0.1 + ar() * 0.8,
      wd: 0.09 + ar() * 0.16,
      hue: 188 + ar() * 30,
      speed: 0.02 + ar() * 0.05,
      phase: ar() * TAU,
      amp: 0.02 + ar() * 0.05
    });
  }
  const glints = [];
  const gr = createSeededRandom(3312);
  for (let i = 0; i < 6; i += 1) {
    const side = gr();
    const gx = side < 0.7 ? 0.6 + gr() * 0.34 : 0.03 + gr() * 0.12;
    const gy = 0.36 + gr() * 0.58;
    glints.push({
      x: gx,
      y: gy,
      size: 8 + gr() * 20,
      phase: gr() * TAU,
      hue: 190 + gr() * 18,
      speed: 0.24 + gr() * 0.55
    });
  }
  return { crystals, layers, fog, aur, glints };
})();

export const renderGlacier: ThemeRenderer = (
  ctx,
  w,
  h,
  time,
  mx,
  my,
  _deltaSeconds,
  motion,
) => {
  // Uniform motion plumbing: resolve the page-motion contract once per frame.
  // Glacier's approved composition predates page-level motion nuance, so the
  // resolved fields stay unread (keeping motion-active output identical to the
  // legacy renderer); only the reducedMotion gate below consumes the contract,
  // freezing time so the theme holds its canonical still frame.
  resolveThemeMotion(motion);
  const reduced = !!(motion && motion.reducedMotion);
  const t = reduced ? 0 : finiteClamp(time, 0, 1e6);
  const pxo = mx - 0.5;
  const pyo = my - 0.5;
  const HEX = Math.PI / 6;
  const small = w < 900;

  // Shield: dim bright additive pixels over the centre + upper-left reading column.
  const shield = (nx: number, ny: number) => {
    const sdx = (nx - 0.40) * 2.4;
    const sdy = (ny - 0.44) * 1.7;
    const sd2 = sdx * sdx + sdy * sdy;
    return sd2 >= 1 ? 1 : 0.5 + 0.5 * sd2;
  };

  // ---------- Atmospheric cold wash ----------
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "rgba(34,80,122,0.17)");
  sky.addColorStop(0.4, "rgba(16,46,80,0.07)");
  sky.addColorStop(1, "rgba(4,10,22,0)");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const breathe = 0.045 + Math.sin(t * 0.18) * 0.02;
  const mist = ctx.createRadialGradient(
    w * (0.5 + pxo * 0.08), h * (0.36 + pyo * 0.05), 0,
    w * 0.5, h * 0.5, w * 0.64
  );
  mist.addColorStop(0, `rgba(152,207,242,${breathe})`);
  mist.addColorStop(0.5, "rgba(70,130,180,0.03)");
  mist.addColorStop(1, "transparent");
  ctx.fillStyle = mist;
  ctx.fillRect(0, 0, w, h);

  // ---------- Aurora ice curtains (additive, thinned for calm) ----------
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < CFG.aur.length; i += 1) {
    const a = CFG.aur[i];
    const sway = Math.sin(t * a.speed + a.phase) * a.amp;
    const ax = (a.x + sway - pxo * 0.04) * w;
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.22 + a.phase);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "transparent");
    g.addColorStop(0.32, `hsla(${a.hue},72%,62%,${0.015 + 0.024 * pulse})`);
    g.addColorStop(0.68, `hsla(${a.hue + 8},66%,54%,${0.01 + 0.016 * pulse})`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(ax - a.wd * w * 0.5, 0, a.wd * w, h);
  }
  ctx.restore();

  // ---------- Volumetric frost fog (fewer, smaller blobs) ----------
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const fogN = small ? 9 : CFG.fog.length;
  for (let i = 0; i < fogN; i += 1) {
    const f = CFG.fog[i];
    const dx = Math.cos(f.drift + t * f.driftSpeed);
    const dy = Math.sin(f.drift * 1.3 + t * f.driftSpeed * 0.8);
    const fx = (f.x + dx * 0.05 - pxo * 0.03) * w;
    const fy = (f.y + dy * 0.03) * h;
    const n = fbm(f.x * 3 + t * 0.03, f.y * 3 + f.phase, 3);
    const nn = n > 0 ? n : 0;
    const dens = 0.015 + nn * 0.05;
    const rr = f.r * w * (0.75 + 0.45 * nn);
    const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, rr);
    g.addColorStop(0, `hsla(${f.hue},55%,70%,${dens})`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(fx, fy, rr, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // ---------- Frost particle depth layer ----------
  const drawLayer = (L: number) => {
    const layer = CFG.layers[L];
    const par = layer.parallax;
    const n = small ? Math.round(layer.parts.length * 0.7) : layer.parts.length;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < n; i += 1) {
      const p = layer.parts[i];
      // Wrap the intrinsic fall/sway only; parallax offsets the wrapped
      // position afterwards and the seam hides inside the wrap fade.
      const wy = wrapSoft(p.y - t * p.speed, 1, 0.05);
      const sway = Math.sin(t * p.swaySpeed + p.sway) * p.swayAmp;
      const wx = wrapSoft(p.x * w + sway, w, 0.04);
      const xx = wx.u - pxo * par;
      const yv = wy.u * h - pyo * par * 0.5;
      const sh = shield(xx / w, yv / h);
      const tw = 0.55 + 0.35 * (0.5 + 0.5 * Math.sin(t * p.twSpeed + p.tw));
      const alpha = tw * (0.14 + p.bright * 0.28) * sh * wx.alpha * wy.alpha;
      const r = p.r;
      if (p.bright > 0.84) {
        stampFrostGlow(ctx, xx, yv, r * 5, alpha * 0.42);
      }
      ctx.beginPath();
      ctx.arc(xx, yv, r, 0, TAU);
      ctx.fillStyle = `hsla(200,72%,82%,${alpha})`;
      ctx.fill();
      if (p.bright > 0.9) {
        stampFrostGlow(ctx, xx, yv, r * 5.25, alpha * 0.42);
      }
    }
    ctx.restore();
  };

  drawLayer(0);

  // ---------- Ice crystals (hero) ----------
  ctx.save();
  for (let i = 0; i < CFG.crystals.length; i += 1) {
    const c = CFG.crystals[i];
    const driftX = Math.sin(t * c.dsx + c.driftA) * c.dax;
    const driftY = Math.cos(t * c.dsy + c.driftA * 1.3) * c.day;
    const bx = (c.bx + driftX) * w - pxo * (10 + c.depth * 40);
    const by = (c.by + driftY) * h - pyo * (6 + c.depth * 24);
    const ddx = bx - mx * w;
    const ddy = by - my * h;
    const dist = Math.hypot(ddx, ddy) || 1;
    const rad = 150;
    const push = dist < rad ? (1 - dist / rad) * 30 * (0.4 + c.depth) : 0;
    const cxp = bx + (ddx / dist) * push;
    const cyp = by + (ddy / dist) * push;
    const size = c.size;
    const rot = t * c.rotSpeed + c.rot;
    const shimmer = 0.5 + 0.5 * Math.sin(t * 0.4 + c.phase);
    const baseA = 0.06 + c.depth * 0.12;

    // outer glow (additive) — skip far/faint crystals for fill-rate
    ctx.globalCompositeOperation = "lighter";
    if (c.depth > 0.26) {
      const glow = ctx.createRadialGradient(cxp, cyp, 0, cxp, cyp, size * 3.2);
      glow.addColorStop(0, `hsla(${c.hue},76%,70%,${(0.028 + c.depth * 0.045) * (0.6 + 0.4 * shimmer)})`);
      glow.addColorStop(0.5, `hsla(${c.hue},70%,58%,${0.012 + c.depth * 0.018})`);
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cxp, cyp, size * 3.2, 0, TAU);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(cxp, cyp);
    ctx.rotate(rot);

    // faceted lit fill
    const facet = ctx.createLinearGradient(-size, -size, size, size);
    facet.addColorStop(0, `hsla(${c.hue + 6},80%,80%,${baseA * 1.02})`);
    facet.addColorStop(0.5, `hsla(${c.hue},60%,54%,${baseA * 0.32})`);
    facet.addColorStop(1, `hsla(${c.hue - 6},70%,70%,${baseA * 0.76})`);
    ctx.beginPath();
    for (let v = 0; v < 6; v += 1) {
      const ang = (Math.PI / 3) * v - HEX;
      const vx = Math.cos(ang) * size;
      const vy = Math.sin(ang) * size;
      if (v === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    ctx.fillStyle = facet;
    ctx.fill();

    // crisp lit edge
    ctx.strokeStyle = `hsla(${c.hue + 4},78%,82%,${(baseA + 0.038) * (0.7 + 0.3 * shimmer)})`;
    ctx.lineWidth = 1 + c.depth * 1.2;
    ctx.stroke();

    // inner hexagon
    ctx.beginPath();
    for (let v = 0; v < 6; v += 1) {
      const ang = (Math.PI / 3) * v - HEX;
      const vx = Math.cos(ang) * size * 0.55;
      const vy = Math.sin(ang) * size * 0.55;
      if (v === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    ctx.strokeStyle = `hsla(${c.hue},70%,80%,${baseA * 0.52})`;
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // dendritic spokes
    for (let v = 0; v < 6; v += 1) {
      const ang = (Math.PI / 3) * v - HEX;
      const ex = Math.cos(ang) * size * 0.92;
      const ey = Math.sin(ang) * size * 0.92;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = `hsla(${c.hue + 4},66%,82%,${baseA * 0.42 * (0.5 + 0.5 * shimmer)})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
      if (c.depth > 0.4) {
        const perp = ang + Math.PI / 2;
        const bl = size * 0.16;
        for (let s = 0; s < 2; s += 1) {
          const mxp = Math.cos(ang) * size * (0.42 + s * 0.26);
          const myp = Math.sin(ang) * size * (0.42 + s * 0.26);
          ctx.beginPath();
          ctx.moveTo(mxp, myp);
          ctx.lineTo(mxp + Math.cos(perp) * bl, myp + Math.sin(perp) * bl);
          ctx.moveTo(mxp, myp);
          ctx.lineTo(mxp - Math.cos(perp) * bl, myp - Math.sin(perp) * bl);
          ctx.strokeStyle = `hsla(${c.hue + 6},64%,80%,${baseA * 0.28 * shimmer})`;
          ctx.lineWidth = 0.4;
          ctx.stroke();
        }
      }
    }
    ctx.restore();

    // core sparkle on near crystals (bloom-safe, shielded over reading column)
    if (c.depth > 0.58) {
      const csh = shield(cxp / w, cyp / h);
      star4(ctx, cxp, cyp, size * 0.9, size * 0.11, `hsla(192,68%,80%,${0.095 * shimmer * c.depth * csh})`);
    }
    ctx.globalCompositeOperation = "source-over";
  }
  ctx.restore();

  // mid + near frost in front of crystals
  drawLayer(1);
  drawLayer(2);

  // ---------- Foreground ice glints (dimmed, kept off the reading column) ----------
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < CFG.glints.length; i += 1) {
    const gl = CFG.glints[i];
    const tw = 0.5 + 0.5 * Math.sin(t * gl.speed + gl.phase);
    const twp = tw * tw;
    const gx = gl.x * w - pxo * 34;
    const gy = gl.y * h - pyo * 22;
    const gsh = shield(gx / w, gy / h);
    star4(ctx, gx, gy, gl.size * (0.55 + twp), gl.size * 0.12, `hsla(${gl.hue},72%,80%,${(0.04 + twp * 0.16) * gsh})`);
    const gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gl.size * 1.7);
    gg.addColorStop(0, `hsla(${gl.hue},70%,80%,${twp * 0.1 * gsh})`);
    gg.addColorStop(1, "transparent");
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(gx, gy, gl.size * 1.7, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // ---------- Cold vignette ----------
  const vig = ctx.createRadialGradient(w * 0.5, h * 0.52, h * 0.32, w * 0.5, h * 0.5, w * 0.74);
  vig.addColorStop(0, "transparent");
  vig.addColorStop(1, "rgba(2,6,16,0.55)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
};
