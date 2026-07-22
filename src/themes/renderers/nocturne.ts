import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { finiteClamp, resolveThemeMotion, storyStepWeight } from "../shared/motion";
import { softGlow } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

const CFG = (function () {
  const rand = createSeededRandom(20260721);
  const RIDGES = [
    [0.72, 0.68, 0.7, 0.61, 0.66, 0.59, 0.64, 0.57, 0.62, 0.6, 0.65, 0.63, 0.69],
    [0.82, 0.78, 0.76, 0.72, 0.75, 0.68, 0.73, 0.66, 0.71, 0.69, 0.75, 0.72, 0.78],
    [0.94, 0.89, 0.91, 0.84, 0.88, 0.82, 0.86, 0.8, 0.85, 0.83, 0.9, 0.86, 0.92]
  ];
  const CONSTELLATION = [
    [0.58, 0.2], [0.65, 0.16], [0.71, 0.24], [0.79, 0.18], [0.87, 0.27]
  ];
  const layers = [];
  const counts = [46, 34, 22];
  const depths = [0.42, 0.72, 1.0];
  for (let li = 0; li < counts.length; li++) {
    const arr = [];
    for (let i = 0; i < counts[li]; i++) {
      arr.push({
        x: rand(),
        y: rand() * 0.72,
        s: 0.5 + rand() * 1.5,
        ph: rand() * TAU,
        tw: 0.5 + rand() * 1.6,
        b: 0.24 + rand() * 0.62,
        spike: rand() > 0.88
      });
    }
    layers.push({ depth: depths[li], stars: arr });
  }
  const craters = [];
  for (let i = 0; i < 16; i++) {
    craters.push({
      ang: rand() * TAU,
      dist: Math.sqrt(rand()) * 0.82,
      r: 0.016 + Math.pow(rand(), 1.7) * 0.092,
      squash: 0.7 + rand() * 0.26,
      tone: rand()
    });
  }
  const maria = [];
  for (let i = 0; i < 6; i++) {
    maria.push({
      ang: rand() * TAU,
      dist: rand() * 0.58,
      rx: 0.16 + rand() * 0.26,
      ry: 0.12 + rand() * 0.22,
      rot: rand() * TAU,
      a: 0.05 + rand() * 0.055
    });
  }
  const mist = [];
  for (let i = 0; i < 28; i++) {
    mist.push({
      x: rand(),
      band: i % 3,
      yoff: rand() - 0.5,
      r: 0.05 + rand() * 0.09,
      a: 0.018 + rand() * 0.04,
      drift: 0.5 + rand() * 1.2,
      ph: rand() * TAU
    });
  }
  const motes = [];
  for (let i = 0; i < 24; i++) {
    motes.push({ x: rand(), y: rand() * 0.9, s: 0.4 + rand() * 1.0, ph: rand() * TAU, sp: 0.3 + rand() * 0.7 });
  }
  return { RIDGES, CONSTELLATION, layers, craters, maria, mist, motes };
})();

export const renderNocturne: ThemeRenderer = (ctx,w,h,t,mx,my,_deltaSeconds,motion)=>{
  const time = finiteClamp(t, 0, 1000000);
  const M = resolveThemeMotion(motion);
  const velNorm = finiteClamp(Math.abs(M.scrollVelocity) / 4, 0, 1);
  // Focus bias: steer parallax toward the focused item (mx/my when no focus).
  const fx = M.hasFocus ? mx * 0.28 + M.focusX * 0.72 : mx;
  const fy = M.hasFocus ? my * 0.28 + M.focusY * 0.72 : my;
  const px = fx - 0.5;
  const py = fy - 0.5;
  const minWH = Math.min(w, h);
  const portrait = w < h;
  // Per-frame element budget (positions unchanged; we render a subset of the
  // seeded arrays so allocation drops without perturbing determinism).
  const craterN = Math.min(12, CFG.craters.length);
  const mistN = Math.min(20, CFG.mist.length);
  const moteN = Math.min(20, CFG.motes.length);

  // ---- Graded midnight sky (opaque bg #050713 already painted) ----
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "rgba(14,20,44,0.85)");
  sky.addColorStop(0.42, "rgba(9,14,34,0.5)");
  sky.addColorStop(0.72, "rgba(6,9,22,0.32)");
  sky.addColorStop(1, "rgba(2,3,9,0.92)");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const zen = ctx.createRadialGradient(w * 0.5, -h * 0.18, 0, w * 0.5, -h * 0.18, h * 1.15);
  zen.addColorStop(0, "rgba(58,78,148,0.12)");
  zen.addColorStop(1, "rgba(58,78,148,0)");
  ctx.fillStyle = zen;
  ctx.fillRect(0, 0, w, h);

  // ---- Silver star dust (three parallax depth layers) ----
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const twBoost = Math.min(0.2, velNorm * 0.15 + M.interactionImpulse * 0.15);
  for (let li = 0; li < CFG.layers.length; li++) {
    const L = CFG.layers[li];
    const par = L.depth * minWH * 0.02 * (1 + li * 0.6);
    for (let i = 0; i < L.stars.length; i++) {
      const s = L.stars[i];
      const sx = s.x * w - px * par;
      const sy = s.y * h - py * par;
      const tw = 0.55 + (0.45 + twBoost) * Math.sin(time * s.tw * 0.6 + s.ph);
      let a = s.b * tw * (0.5 + L.depth * 0.5);
      if (a > 0.86) a = 0.86;
      if (a <= 0.002) continue;
      const rad = s.s * (0.6 + L.depth * 0.7);
      ctx.fillStyle = "rgba(210,222,255," + (a * 0.9).toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(sx, sy, rad, 0, TAU);
      ctx.fill();
      if (s.spike && tw > 0.9) {
        softGlow(ctx, sx, sy, rad * 3.4, "rgba(202,216,255," + (a * 0.35).toFixed(3) + ")", "transparent");
      }
    }
  }
  ctx.restore();

  // ---- Moon geometry (portrait pushed further off-canvas to clear header text) ----
  const moonR = minWH * (portrait ? 0.29 : 0.27);
  const moonX = w * (portrait ? 0.88 : 0.8) + px * w * 0.02;
  const moonY = h * (portrait ? 0.26 : 0.28) + py * h * 0.016;
  const lightX = moonX - moonR * 0.5;
  const lightY = moonY - moonR * 0.45;

  // ---- Lunar corona (additive round blooms; alphas + reach cut so the
  //      upper-right stays legible and the bright-pass bloom cannot clip white) ----
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const breathe = 0.5 + 0.5 * Math.sin(time * 0.18);
  const coronaReach = portrait ? 1.85 : 2.0;
  const coronaLift = 0.02 * M.interactionImpulse + 0.015 * velNorm;
  softGlow(ctx, moonX, moonY, moonR * coronaReach, "rgba(150,172,240," + (0.055 + 0.02 * breathe + coronaLift).toFixed(3) + ")", "transparent");
  softGlow(ctx, moonX, moonY, moonR * 1.5, "rgba(200,214,255," + (0.085 + coronaLift).toFixed(3) + ")", "transparent");
  softGlow(ctx, moonX, moonY, moonR * 1.12, "rgba(226,234,255," + (0.07 + coronaLift).toFixed(3) + ")", "transparent");
  ctx.restore();

  // ---- Engraved lunar study ----
  ctx.save();
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, TAU);
  ctx.clip();

  const body = ctx.createRadialGradient(lightX, lightY, moonR * 0.1, moonX, moonY, moonR * 1.5);
  body.addColorStop(0, "#E7EBF4");
  body.addColorStop(0.35, "#C9D1E4");
  body.addColorStop(0.7, "#96A0BC");
  body.addColorStop(1, "#59617D");
  ctx.fillStyle = body;
  ctx.fillRect(moonX - moonR, moonY - moonR, moonR * 2, moonR * 2);

  // Maria (soft dark seas)
  for (let i = 0; i < CFG.maria.length; i++) {
    const m = CFG.maria[i];
    const mxp = moonX + Math.cos(m.ang) * m.dist * moonR;
    const myp = moonY + Math.sin(m.ang) * m.dist * moonR;
    ctx.save();
    ctx.translate(mxp, myp);
    ctx.rotate(m.rot);
    ctx.scale(1, m.ry / m.rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, m.rx * moonR);
    g.addColorStop(0, "rgba(38,44,64," + (m.a + 0.06).toFixed(3) + ")");
    g.addColorStop(1, "rgba(38,44,64,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, m.rx * moonR, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // Craters -- soft shaded depressions (no hard outlines):
  //   bowl darkening + shadowed near wall (toward light) + lit far wall (away from light)
  for (let i = 0; i < craterN; i++) {
    const c = CFG.craters[i];
    const cx = moonX + Math.cos(c.ang) * c.dist * moonR;
    const cy = moonY + Math.sin(c.ang) * c.dist * moonR;
    const r = c.r * moonR;
    const sq = Math.max(0.4, c.squash * (1 - 0.4 * c.dist));
    let dx = lightX - cx, dy = lightY - cy;
    const dl = Math.sqrt(dx * dx + dy * dy) || 1;
    dx /= dl; dy /= dl;
    const bowl = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.3);
    bowl.addColorStop(0, "rgba(26,31,48," + (0.09 + c.tone * 0.09).toFixed(3) + ")");
    bowl.addColorStop(0.65, "rgba(26,31,48," + (0.04 + c.tone * 0.04).toFixed(3) + ")");
    bowl.addColorStop(1, "rgba(26,31,48,0)");
    ctx.fillStyle = bowl;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.3, r * 1.3 * sq, c.ang, 0, TAU);
    ctx.fill();
    const sox = cx + dx * r * 0.42, soy = cy + dy * r * 0.42;
    const sh = ctx.createRadialGradient(sox, soy, 0, sox, soy, r * 1.0);
    sh.addColorStop(0, "rgba(10,13,24," + (0.16 + c.tone * 0.12).toFixed(3) + ")");
    sh.addColorStop(1, "rgba(10,13,24,0)");
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.ellipse(sox, soy, r * 1.0, r * 1.0 * sq, c.ang, 0, TAU);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < craterN; i++) {
    const c = CFG.craters[i];
    if (c.r < 0.028) continue; // skip faint rim glint on the smallest pits (perf)
    const cx = moonX + Math.cos(c.ang) * c.dist * moonR;
    const cy = moonY + Math.sin(c.ang) * c.dist * moonR;
    const r = c.r * moonR;
    const sq = Math.max(0.4, c.squash * (1 - 0.4 * c.dist));
    let dx = lightX - cx, dy = lightY - cy;
    const dl = Math.sqrt(dx * dx + dy * dy) || 1;
    dx /= dl; dy /= dl;
    const hox = cx - dx * r * 0.42, hoy = cy - dy * r * 0.42;
    const hi = ctx.createRadialGradient(hox, hoy, 0, hox, hoy, r * 0.9);
    hi.addColorStop(0, "rgba(240,245,255," + (0.09 + (1 - c.tone) * 0.07).toFixed(3) + ")");
    hi.addColorStop(1, "rgba(240,245,255,0)");
    ctx.fillStyle = hi;
    ctx.beginPath();
    ctx.ellipse(hox, hoy, r * 0.9, r * 0.9 * sq, c.ang, 0, TAU);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";

  // Fine engraving hatch that curves along the sphere (signature texture)
  ctx.strokeStyle = "rgba(210,220,250,0.045)";
  ctx.lineWidth = 0.6;
  const step = Math.max(6, moonR * 0.05);
  for (let yy = -moonR * 1.2; yy < moonR * 1.2; yy += step) {
    ctx.beginPath();
    ctx.moveTo(moonX - moonR, moonY + yy);
    ctx.quadraticCurveTo(moonX, moonY + yy - moonR * 0.12, moonX + moonR, moonY + yy - moonR * 0.5);
    ctx.stroke();
  }

  // Terminator (soft gibbous phase shadow) -- storyProgress waxes/wanes the moon.
  const phaseShift = -finiteClamp(M.storyProgress, 0, 1) * moonR * 0.4;
  const term = ctx.createLinearGradient(moonX - moonR + phaseShift, moonY, moonX + moonR + phaseShift, moonY);
  term.addColorStop(0, "rgba(4,6,16,0)");
  term.addColorStop(0.5, "rgba(4,6,16,0.05)");
  term.addColorStop(0.78, "rgba(4,6,16,0.32)");
  term.addColorStop(1, "rgba(4,6,16,0.72)");
  ctx.fillStyle = term;
  ctx.fillRect(moonX - moonR, moonY - moonR, moonR * 2, moonR * 2);

  // Limb darkening
  const limb = ctx.createRadialGradient(moonX, moonY, moonR * 0.6, moonX, moonY, moonR);
  limb.addColorStop(0, "rgba(5,7,18,0)");
  limb.addColorStop(1, "rgba(5,7,18,0.4)");
  ctx.fillStyle = limb;
  ctx.fillRect(moonX - moonR, moonY - moonR, moonR * 2, moonR * 2);

  // Specular sheen (additive round bloom) -- lowered so it keeps headroom under bloom
  ctx.globalCompositeOperation = "lighter";
  const spec = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, moonR * 0.9);
  spec.addColorStop(0, "rgba(240,246,255,0.11)");
  spec.addColorStop(1, "rgba(240,246,255,0)");
  ctx.fillStyle = spec;
  ctx.fillRect(moonX - moonR, moonY - moonR, moonR * 2, moonR * 2);
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();

  // Rim + additive halo ring (both trimmed so the edge does not clip to white)
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, TAU);
  ctx.strokeStyle = "rgba(226,233,255,0.42)";
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR * 1.02, 0, TAU);
  ctx.strokeStyle = "rgba(180,200,255,0.1)";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  // ---- Engraved constellation axis with travelling spark (round glows only) ----
  ctx.save();
  const cpts = [];
  for (let i = 0; i < CFG.CONSTELLATION.length; i++) {
    cpts.push([
      CFG.CONSTELLATION[i][0] * w - px * minWH * 0.01,
      CFG.CONSTELLATION[i][1] * h - py * minWH * 0.008
    ]);
  }
  ctx.strokeStyle = "rgba(190,204,255,0.16)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  for (let i = 0; i < cpts.length; i++) {
    if (i === 0) ctx.moveTo(cpts[i][0], cpts[i][1]);
    else ctx.lineTo(cpts[i][0], cpts[i][1]);
  }
  ctx.stroke();

  const segN = Math.max(1, cpts.length - 1);
  const hasStory = M.sectionCount > 0;
  // Spark snaps to the active section when a page story exists; otherwise it
  // drifts by time so the ambient / frozen frame still reads alive.
  const fseg = (hasStory ? finiteClamp(M.storyProgress, 0, 1) : ((time * 0.06) % 1)) * segN;
  const si = Math.min(segN - 1, Math.floor(fseg));
  const ft = fseg - si;
  const spx = cpts[si][0] + (cpts[si + 1][0] - cpts[si][0]) * ft;
  const spy = cpts[si][1] + (cpts[si + 1][1] - cpts[si][1]) * ft;
  ctx.globalCompositeOperation = "lighter";
  softGlow(ctx, spx, spy, minWH * 0.02, "rgba(210,224,255,0.5)", "transparent");
  for (let i = 0; i < cpts.length; i++) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.5 + i * 1.3);
    const emph = hasStory ? storyStepWeight(M.storyProgress, i, cpts.length) : 0;
    const glowA = Math.min(0.6, 0.32 + 0.24 * pulse + emph * 0.24);
    const glowR = minWH * (0.01 + 0.006 * pulse + emph * 0.006);
    softGlow(ctx, cpts[i][0], cpts[i][1], glowR, "rgba(226,233,255," + glowA.toFixed(3) + ")", "transparent");
  }
  ctx.globalCompositeOperation = "source-over";
  for (let i = 0; i < cpts.length; i++) {
    ctx.fillStyle = "rgba(240,244,255,0.9)";
    ctx.beginPath();
    ctx.arc(cpts[i][0], cpts[i][1], 1.3, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // ---- Soft focus glow (round only -- no crosshair) ----
  if (M.hasFocus) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const fgA = 0.045 + 0.05 * M.interactionImpulse;
    softGlow(ctx, M.focusX * w, M.focusY * h, minWH * 0.14, "rgba(150,170,228," + fgA.toFixed(3) + ")", "transparent");
    ctx.restore();
  }

  // ---- Drifting dust motes ----
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < moteN; i++) {
    const m = CFG.motes[i];
    const mxp = ((m.x + time * 0.005 * m.sp) % 1) * w - px * minWH * 0.03;
    const myp = m.y * h + Math.sin(time * 0.2 * m.sp + m.ph) * h * (0.01 + 0.005 * velNorm) - py * minWH * 0.02;
    const a = 0.05 + 0.05 * Math.sin(time * 0.8 + m.ph);
    if (a <= 0.002) continue;
    ctx.fillStyle = "rgba(200,214,255," + a.toFixed(3) + ")";
    ctx.beginPath();
    ctx.arc(mxp, myp, m.s, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // ---- Quiet atmosphere bands + fbm mist ----
  for (let b = 0; b < 3; b++) {
    const yb = h * (0.5 + b * 0.11);
    const drift = Math.sin(time * 0.05 + b) * h * 0.006;
    const band = ctx.createLinearGradient(0, yb - h * 0.05, 0, yb + h * 0.06);
    band.addColorStop(0, "rgba(120,140,200,0)");
    band.addColorStop(0.5, "rgba(120,140,200," + (0.028 + b * 0.012).toFixed(3) + ")");
    band.addColorStop(1, "rgba(120,140,200,0)");
    ctx.fillStyle = band;
    ctx.fillRect(0, yb - h * 0.05 + drift, w, h * 0.11);
  }
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < mistN; i++) {
    const m = CFG.mist[i];
    const bx = (((m.x + time * 0.006 * m.drift) % 1.2) - 0.1) * w;
    const by = h * (0.5 + m.band * 0.11) + m.yoff * h * 0.05;
    const n = fbm(m.x * 3 + time * 0.03 * m.drift, m.band * 1.7 + m.ph, 3);
    const a = m.a * (0.5 + 0.5 * n);
    if (a <= 0.002) continue;
    const r = m.r * w * (0.8 + 0.4 * (0.5 + 0.5 * n));
    softGlow(ctx, bx, by, r, "rgba(150,168,224," + a.toFixed(3) + ")", "transparent");
  }
  ctx.restore();

  // ---- Ridge silhouettes with silver rim light ----
  const ridgeCols = ["rgba(20,25,42,0.9)", "rgba(11,15,28,0.95)", "rgba(3,5,10,1)"];
  const rimCols = ["rgba(150,170,225,0.14)", "rgba(140,160,215,0.1)", "rgba(120,140,200,0.07)"];
  for (let r = 0; r < CFG.RIDGES.length; r++) {
    const vals = CFG.RIDGES[r];
    const par = (r + 1) * px * w * 0.01;
    const yoff = py * h * 0.006 * (r + 1);
    ctx.beginPath();
    ctx.moveTo(-4, h + 4);
    for (let i = 0; i < vals.length; i++) {
      ctx.lineTo((i / (vals.length - 1)) * w + par, vals[i] * h + yoff);
    }
    ctx.lineTo(w + 4, h + 4);
    ctx.closePath();
    ctx.fillStyle = ridgeCols[r];
    ctx.fill();
    ctx.beginPath();
    for (let i = 0; i < vals.length; i++) {
      const x = (i / (vals.length - 1)) * w + par;
      const y = vals[i] * h + yoff;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = rimCols[r];
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  // ---- Silver editorial framing: subtle corner registration marks only ----
  ctx.save();
  ctx.strokeStyle = "rgba(190,203,245,0.16)";
  ctx.lineWidth = 1;
  const mk = minWH * 0.045;
  const pad = minWH * 0.05;
  const corners = [[pad, pad, 1, 1], [w - pad, pad, -1, 1], [pad, h - pad, 1, -1], [w - pad, h - pad, -1, -1]];
  for (let i = 0; i < corners.length; i++) {
    const c = corners[i];
    ctx.beginPath();
    ctx.moveTo(c[0], c[1]);
    ctx.lineTo(c[0] + c[2] * mk, c[1]);
    ctx.moveTo(c[0], c[1]);
    ctx.lineTo(c[0], c[1] + c[3] * mk);
    ctx.stroke();
  }
  ctx.restore();

  // ---- Vignette to seat the field ----
  const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, minWH * 0.3, w * 0.5, h * 0.55, Math.max(w, h) * 0.75);
  vig.addColorStop(0, "rgba(2,3,9,0)");
  vig.addColorStop(1, "rgba(2,3,9,0.7)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
};
