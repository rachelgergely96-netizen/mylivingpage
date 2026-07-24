import { createSeededRandom } from "../shared/random";
import { finiteClamp, resolveThemeMotion, storyStepWeight } from "../shared/motion";
import { softGlow } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

interface CameoStrand {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  sag: number;
  lat: number;
  depth: number;
  beads: number;
  phase: number;
  swayA: number;
  swayS: number;
  glow: number;
  jit: number;
  story: number;
}

interface CameoPetal {
  x: number;
  y: number;
  size: number;
  depth: number;
  rot: number;
  spin: number;
  driftY: number;
  swayA: number;
  swayS: number;
  phase: number;
  tone: number;
}

interface CameoBokeh {
  x: number;
  y: number;
  r: number;
  depth: number;
  dx: number;
  dy: number;
  tw: number;
  twS: number;
  tone: number;
  a: number;
}

interface CameoGradientCache {
  ctx: CanvasRenderingContext2D | null;
  pearl: CanvasGradient[];
  glow: CanvasGradient[];
  petal: CanvasGradient[];
  medallion: CanvasGradient[];
}

const RNG = createSeededRandom(0x9a12c7f1);
const rnd = (a:number, b:number) => a + (b - a) * RNG();
const STRANDS: CameoStrand[] = [];
for (let s = 0; s < 5; s += 1) {
  const depth = s / 4;
  STRANDS.push({
    x0: rnd(-0.12, 0.3), y0: rnd(0.02, 0.44),
    x1: rnd(0.58, 1.14), y1: rnd(0.34, 0.92),
    sag: rnd(0.16, 0.42), lat: rnd(-0.1, 0.12),
    depth: depth, beads: Math.round(rnd(13, 19)),
    phase: rnd(0, TAU), swayA: rnd(0.006, 0.02), swayS: rnd(0.04, 0.11),
    glow: 0.35 + depth * 0.6, jit: rnd(0.85, 1.12), story: s,
  });
}
const PETALS: CameoPetal[] = [];
for (let p = 0; p < 16; p += 1) {
  const depth = RNG();
  PETALS.push({
    x: RNG(), y: RNG(),
    size: (0.028 + RNG() * 0.05) * (0.55 + depth), depth: depth,
    rot: rnd(0, TAU), spin: rnd(-0.14, 0.14), driftY: rnd(0.5, 1.3),
    swayA: rnd(0.02, 0.06), swayS: rnd(0.1, 0.32), phase: rnd(0, TAU),
    tone: RNG(),
  });
}
const BOKEH: CameoBokeh[] = [];
for (let b = 0; b < 26; b += 1) {
  const depth = RNG();
  BOKEH.push({
    x: RNG(), y: RNG(),
    r: (0.014 + RNG() * 0.045) * (0.55 + depth * 1.5), depth: depth,
    dx: rnd(-0.05, 0.05), dy: rnd(-0.04, 0.04),
    tw: rnd(0, TAU), twS: rnd(0.15, 0.6), tone: RNG(), a: 0.05 + RNG() * 0.1,
  });
}
// Reusable gradients: built once per context, repositioned/scaled via the CTM
// so per-frame gradient allocations drop from ~180 to a small handful.
const GRAD: CameoGradientCache = { ctx: null, pearl: [], glow: [], petal: [], medallion: [] };

export const renderCameo: ThemeRenderer = (ctx, w, h, t, mx, my, _deltaSeconds, motion) => {
  const M = resolveThemeMotion(motion);
  const minSide = Math.min(w, h) || 1;
  const pxr = finiteClamp(mx, 0, 1, 0.5) - 0.5;
  const pyr = finiteClamp(my, 0, 1, 0.5) - 0.5;
  const clamp01 = (v:number) => (v < 0 ? 0 : v > 1 ? 1 : v);

  // Build the reusable pearl / glow / petal gradients once (or if the context changes).
  if (GRAD.ctx !== ctx) {
    GRAD.ctx = ctx;
    const pearlGrad = (glintA:number, coreA:number) => {
      const g = ctx.createRadialGradient(0.3, -0.34, 0.04, 0, 0, 1);
      g.addColorStop(0, "rgba(255,251,245," + glintA + ")");
      g.addColorStop(0.16, "rgba(252,240,230," + coreA + ")");
      g.addColorStop(0.42, "rgba(238,204,187,0.9)");
      g.addColorStop(0.72, "rgba(201,150,176,0.85)");
      g.addColorStop(1, "rgba(70,42,60,0.92)");
      return g;
    };
    // Capped cores (0.42..0.6) so the host bright-pass bloom cannot blow pearls to white.
    GRAD.pearl = [pearlGrad(0.5, 0.42), pearlGrad(0.62, 0.52), pearlGrad(0.72, 0.6)];
    const roundGlow = (r0:number, g0:number, b0:number) => {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, "rgba(" + r0 + "," + g0 + "," + b0 + ",1)");
      g.addColorStop(1, "rgba(" + r0 + "," + g0 + "," + b0 + ",0)");
      return g;
    };
    GRAD.glow = [roundGlow(243, 222, 202), roundGlow(231, 190, 175), roundGlow(217, 177, 198)];
    const petalGrad = (cr:number, cg:number, cb:number, mr:number, mg:number, mb:number) => {
      const g = ctx.createRadialGradient(0, -0.3, 0, 0, 0, 1.15);
      g.addColorStop(0, "rgba(" + cr + "," + cg + "," + cb + ",1)");
      g.addColorStop(0.45, "rgba(" + mr + "," + mg + "," + mb + ",0.7)");
      g.addColorStop(0.72, "rgba(" + mr + "," + mg + "," + mb + ",0.32)");
      g.addColorStop(1, "rgba(" + mr + "," + mg + "," + mb + ",0)");
      return g;
    };
    GRAD.petal = [
      petalGrad(246, 216, 198, 222, 168, 150),
      petalGrad(242, 206, 223, 201, 142, 176),
      petalGrad(236, 192, 207, 184, 112, 151),
    ];
    const stone = ctx.createRadialGradient(-0.34, -0.38, 0.04, 0.08, 0.1, 1.12);
    stone.addColorStop(0, "rgba(150,101,125,0.98)");
    stone.addColorStop(0.48, "rgba(102,63,84,0.98)");
    stone.addColorStop(1, "rgba(42,27,38,0.99)");
    const shell = ctx.createLinearGradient(-0.8, -0.9, 0.9, 1);
    shell.addColorStop(0, "rgba(238,221,204,0.98)");
    shell.addColorStop(0.52, "rgba(215,183,173,0.98)");
    shell.addColorStop(1, "rgba(152,105,121,0.98)");
    const reliefLight = ctx.createRadialGradient(-0.42, -0.5, 0.02, -0.16, -0.18, 0.95);
    reliefLight.addColorStop(0, "rgba(249,232,213,0.28)");
    reliefLight.addColorStop(0.5, "rgba(231,197,182,0.08)");
    reliefLight.addColorStop(1, "rgba(231,197,182,0)");
    GRAD.medallion = [stone, shell, reliefLight];
  }

  // Motion scalars — every one resolves to 0 / neutral at rest.
  const wind = clamp01(Math.abs(M.scrollVelocity) / 3);
  const engage = clamp01(M.scrollProgress * 3 + M.interactionImpulse);
  const twBoost = 1 + M.interactionImpulse * 0.5 + clamp01(M.pointerSpeed / 4) * 0.3;

  // Key light drifts, steers gently toward the focused region (clamped right of the text column).
  let lightX = w * (0.6 + 0.17 * Math.sin(t * 0.045)) + pxr * minSide * 0.08;
  let lightY = h * (0.33 + 0.12 * Math.cos(t * 0.037)) + pyr * minSide * 0.06;
  if (M.hasFocus) {
    const fx = Math.max(0.46, M.focusX) * w;
    const fy = M.focusY * h;
    lightX += (fx - lightX) * 0.35;
    lightY += (fy - lightY) * 0.35;
  }
  lightX += M.scrollVelocity * minSide * 0.012;

  // Fade elements sitting in the left reading column so text keeps contrast under the bloom.
  const leftDamp = (xN:number) => {
    const k = xN / 0.5;
    return k >= 1 ? 1 : 0.28 + 0.72 * (k < 0 ? 0 : k);
  };
  const glowSprite = (grad:CanvasGradient, x:number, y:number, r:number, a:number) => {
    if (!(a > 0.003) || !(r > 0)) return;
    ctx.save();
    ctx.globalAlpha = a > 1 ? 1 : a;
    ctx.translate(x, y);
    ctx.scale(r, r);
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, TAU);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  };

  ctx.save();

  const wash = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, Math.max(w, h) * 0.95);
  wash.addColorStop(0, "rgba(122, 72, 98, 0.2)");
  wash.addColorStop(0.42, "rgba(66, 42, 62, 0.11)");
  wash.addColorStop(1, "rgba(6, 5, 8, 0)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);

  softGlow(ctx, lightX, lightY, minSide * 0.55, "rgba(240, 216, 197, 0.15)", "rgba(240, 216, 197, 0)");
  const g2x = w * (0.34 + 0.1 * Math.sin(t * 0.028 + 1.7));
  const g2y = h * (0.72 + 0.08 * Math.cos(t * 0.023));
  softGlow(ctx, g2x, g2y, minSide * 0.46, "rgba(217, 177, 198, 0.1)", "rgba(217, 177, 198, 0)");
  if (M.hasFocus) {
    const fgAmt = 0.12 * clamp01((M.focusX - 0.4) / 0.3);
    if (fgAmt > 0.005) {
      softGlow(ctx, Math.max(0.46, M.focusX) * w, M.focusY * h, minSide * 0.3, "rgba(240, 216, 197, " + fgAmt + ")", "rgba(240, 216, 197, 0)");
    }
  }

  const drawBokeh = (o:CameoBokeh, frontPass:boolean) => {
    if ((o.depth >= 0.55) !== frontPass) return;
    const bx = (o.x + o.dx * Math.sin(t * 0.05 + o.tw)) * w;
    const by = (o.y + o.dy * Math.cos(t * 0.043 + o.tw)) * h;
    const r = o.r * minSide;
    const tw = 0.55 + 0.45 * Math.sin(t * o.twS + o.tw);
    const grad = o.tone < 0.34 ? GRAD.glow[0] : o.tone < 0.67 ? GRAD.glow[1] : GRAD.glow[2];
    const a = o.a * tw * (frontPass ? 0.95 : 0.7) * twBoost * leftDamp(bx / w);
    glowSprite(grad, bx, by, r, a);
  };

  const drawPetal = (o:CameoPetal, frontPass:boolean) => {
    if ((o.depth >= 0.5) !== frontPass) return;
    const sway = o.swayA * (1 + wind * 0.5) * Math.sin(t * o.swayS + o.phase);
    let yy = (o.y + t * o.driftY * 0.012) % 1.12;
    if (yy < 0) yy += 1.12;
    const cx = (o.x + sway) * w + pxr * minSide * 0.03 * (0.4 + o.depth);
    const cy = yy * h - h * 0.06 + M.scrollVelocity * minSide * 0.01 * (0.4 + o.depth);
    const sc = o.size * minSide;
    const rot = o.rot + t * o.spin * 0.15;
    const yn = yy / 1.12;
    const fade = clamp01(Math.min(yn / 0.14, (1 - yn) / 0.14, 1));
    const aCore = (0.15 + 0.24 * o.depth) * fade * leftDamp(cx / w);
    if (aCore <= 0.002) return;
    const grad = o.tone < 0.34 ? GRAD.petal[0] : o.tone < 0.67 ? GRAD.petal[1] : GRAD.petal[2];
    ctx.save();
    ctx.globalAlpha = aCore > 1 ? 1 : aCore;
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.scale(sc, sc);
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.bezierCurveTo(0.92, -0.5, 0.72, 0.62, 0, 1);
    ctx.bezierCurveTo(-0.72, 0.62, -0.92, -0.5, 0, -1);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  };

  const bezX = (a:number, c:number, b:number, u:number) => { const iu = 1 - u; return iu * iu * a + 2 * iu * u * c + u * u * b; };

  const traceReliefPetal = (length:number, width:number) => {
    ctx.beginPath();
    ctx.moveTo(0, -0.03);
    ctx.bezierCurveTo(width * 0.68, -length * 0.18, width * 0.5, -length * 0.78, 0, -length);
    ctx.bezierCurveTo(-width * 0.5, -length * 0.78, -width * 0.68, -length * 0.18, 0, -0.03);
    ctx.closePath();
  };

  const drawRoseRelief = (
    offsetX:number,
    offsetY:number,
    fillStyle:string | CanvasGradient,
    strokeStyle:string | null,
  ) => {
    const drawRing = (count:number, radius:number, length:number, width:number, phase:number) => {
      for (let i = 0; i < count; i += 1) {
        ctx.save();
        ctx.rotate(phase + i * TAU / count);
        ctx.translate(0, radius);
        traceReliefPetal(length, width);
        ctx.fillStyle = fillStyle;
        ctx.fill();
        if (strokeStyle) {
          ctx.strokeStyle = strokeStyle;
          ctx.lineWidth = 0.009;
          ctx.stroke();
        }
        ctx.restore();
      }
    };

    ctx.save();
    ctx.translate(offsetX, offsetY);
    drawRing(8, 0.19, 0.48, 0.25, 0);
    drawRing(6, 0.1, 0.34, 0.19, Math.PI / 6);
    drawRing(4, 0.035, 0.23, 0.14, Math.PI / 4);
    ctx.beginPath();
    ctx.arc(0, 0, 0.085, 0, TAU);
    ctx.fillStyle = fillStyle;
    ctx.fill();
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = 0.009;
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawPearl = (x:number, y:number, r:number, storySweep:number) => {
    const dx = lightX - x, dy = lightY - y;
    const d = Math.hypot(dx, dy) || 1;
    const dn = clamp01(1 - d / (minSide * 0.62));
    const bright = dn + storySweep;
    const grad = bright > 0.62 ? GRAD.pearl[2] : bright > 0.34 ? GRAD.pearl[1] : GRAD.pearl[0];
    ctx.save();
    ctx.globalAlpha = leftDamp(x / w);
    ctx.translate(x, y);
    ctx.scale(r, r);
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, TAU);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  };

  for (let i = 0; i < BOKEH.length; i += 1) drawBokeh(BOKEH[i], false);
  for (let i = 0; i < PETALS.length; i += 1) drawPetal(PETALS[i], false);

  // A single carved shell-rose cameo anchors the right side. Its lower-right
  // underlay and offset relief pass are baked shadows, keeping this dimensional
  // focal object inexpensive while the pearl strands remain free to cross it.
  const portrait = h > w * 1.05;
  const cameoX = w * (portrait ? 0.94 : 0.82) + pxr * minSide * 0.012;
  const cameoY = h * (portrait ? 0.43 : 0.46) + pyr * minSide * 0.01;
  const cameoRx = minSide * (portrait ? 0.14 : 0.19);
  const cameoRy = cameoRx * 1.28;
  const cameoShadow = minSide * 0.012;

  ctx.save();
  ctx.translate(cameoX + cameoShadow * 0.7, cameoY + cameoShadow);
  ctx.scale(cameoRx, cameoRy);
  ctx.beginPath();
  ctx.arc(0, 0, 1.03, 0, TAU);
  ctx.fillStyle = "rgba(19,11,17,0.62)";
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(cameoX, cameoY);
  ctx.scale(cameoRx, cameoRy);
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, TAU);
  ctx.fillStyle = GRAD.medallion[0];
  ctx.fill();
  ctx.strokeStyle = "rgba(37,21,31,0.9)";
  ctx.lineWidth = 0.055;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 0.88, 0, TAU);
  ctx.strokeStyle = "rgba(202,151,164,0.38)";
  ctx.lineWidth = 0.035;
  ctx.stroke();

  ctx.save();
  ctx.scale(1, cameoRx / cameoRy);
  drawRoseRelief(0.03, 0.035, "rgba(39,22,31,0.34)", null);
  drawRoseRelief(0, 0, GRAD.medallion[1], "rgba(99,60,76,0.44)");
  ctx.beginPath();
  ctx.arc(0, 0, 0.67, 0, TAU);
  ctx.fillStyle = GRAD.medallion[2];
  ctx.fill();
  ctx.restore();

  const lightAngle = Math.atan2(
    (lightY - cameoY) / Math.max(1, cameoRy),
    (lightX - cameoX) / Math.max(1, cameoRx),
  );
  ctx.beginPath();
  ctx.arc(0, 0, 0.94, lightAngle - 0.72, lightAngle + 0.72);
  ctx.strokeStyle = "rgba(244,218,201,0.24)";
  ctx.lineWidth = 0.025;
  ctx.stroke();
  ctx.restore();

  for (let s = 0; s < STRANDS.length; s += 1) {
    const st = STRANDS[s];
    const ax = st.x0 * w, ay = st.y0 * h;
    const bx2 = st.x1 * w, by2 = st.y1 * h;
    const swayScale = 1 + wind * 0.7;
    const sway = Math.sin(t * st.swayS + st.phase) * st.swayA * swayScale;
    const cxp = (ax + bx2) / 2 + st.lat * w + sway * w;
    const cyp = (ay + by2) / 2 + st.sag * minSide + Math.cos(t * st.swayS * 0.8 + st.phase) * st.swayA * minSide * 0.5 * swayScale;
    const par = pxr * (0.3 + st.depth) * minSide * 0.05 + M.scrollVelocity * (0.3 + st.depth) * minSide * 0.012;
    const pary = pyr * (0.3 + st.depth) * minSide * 0.04;
    const storySweep = storyStepWeight(M.storyProgress, st.story, STRANDS.length) * engage * 0.45;
    const bc = st.beads;
    for (let b = 0; b < bc; b += 1) {
      const u = bc <= 1 ? 0.5 : b / (bc - 1);
      const px2 = bezX(ax, cxp, bx2, u);
      const py2 = bezX(ay, cyp, by2, u);
      const pr = minSide * (0.006 + 0.011 * st.depth) * st.jit * (0.9 + 0.18 * Math.sin(b * 1.3 + st.phase));
      drawPearl(px2 + par, py2 + pary, pr, storySweep);
    }
  }

  for (let i = 0; i < PETALS.length; i += 1) drawPetal(PETALS[i], true);
  for (let i = 0; i < BOKEH.length; i += 1) drawBokeh(BOKEH[i], true);

  for (let i = 0; i < 16; i += 1) {
    const sd = i * 2.3999;
    const baseX = 0.5 + 0.5 * Math.sin(sd * 3.1);
    const baseY = 0.5 + 0.5 * Math.cos(sd * 1.7);
    let yy = (baseY - t * 0.006 * (0.5 + (i % 5) / 5)) % 1;
    if (yy < 0) yy += 1;
    const mxp = baseX * w + Math.sin(t * 0.1 + sd) * minSide * 0.012;
    const twk = 0.4 + 0.6 * Math.sin(t * 0.8 + sd * 4);
    const a = (0.04 + 0.09 * twk) * twBoost * leftDamp(mxp / w);
    glowSprite(GRAD.glow[0], mxp, yy * h, minSide * 0.006 * (1 + (i % 3)), a);
  }

  const vig = ctx.createRadialGradient(w * 0.56, h * 0.46, minSide * 0.25, w * 0.5, h * 0.5, Math.max(w, h) * 0.85);
  vig.addColorStop(0, "rgba(6,5,8,0)");
  vig.addColorStop(1, "rgba(6,5,8,0.5)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  const clear = ctx.createLinearGradient(0, 0, w * 0.65, 0);
  clear.addColorStop(0, "rgba(6,5,8,0.78)");
  clear.addColorStop(0.62, "rgba(6,5,8,0.26)");
  clear.addColorStop(1, "rgba(6,5,8,0)");
  ctx.fillStyle = clear;
  ctx.fillRect(0, 0, w * 0.65, h);

  ctx.restore();
};
