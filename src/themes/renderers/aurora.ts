import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { finiteClamp, resolveThemeMotion } from "../shared/motion";
import { softGlow } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

const CFG = (function () {
  const rnd = createSeededRandom(20607);

  // Parallax star layers (round dots; a few get a soft round bloom, never crosses)
  const layerDefs = [
    { count: 40, depth: 0.16, sMin: 0.3, sMax: 0.9, bright: 0.5 },
    { count: 28, depth: 0.42, sMin: 0.5, sMax: 1.3, bright: 0.72 },
    { count: 16, depth: 0.8, sMin: 0.8, sMax: 1.9, bright: 1.0 }
  ];
  const starLayers = [];
  for (let d = 0; d < layerDefs.length; d++) {
    const def = layerDefs[d];
    const stars = [];
    for (let i = 0; i < def.count; i++) {
      stars.push({
        x: rnd(),
        y: rnd() * 0.66,
        s: def.sMin + rnd() * (def.sMax - def.sMin),
        ph: rnd() * TAU,
        tw: 0.4 + rnd() * 1.2,
        b: def.bright * (0.6 + rnd() * 0.4),
        bloom: rnd() > 0.82,
        hue: 168 + rnd() * 42
      });
    }
    starLayers.push({ depth: def.depth, stars: stars });
  }

  // Aurora curtains: crest/top pushed toward violet-magenta, body toward teal-green
  const CN = 6;
  const curtains = [];
  for (let b = 0; b < CN; b++) {
    const topness = 1 - b / (CN - 1); // b=0 (highest curtain) => 1
    const hue = 150 + topness * 128;  // 150 teal .. 278 violet
    const wisps = [];
    const wn = 2 + (rnd() > 0.5 ? 1 : 0); // 2-3 broad soft folds
    for (let k = 0; k < wn; k++) {
      wisps.push({
        cx: 0.14 + rnd() * 0.72,
        drift: (rnd() - 0.5) * 0.05,
        wobble: rnd() * TAU,
        width: 0.09 + rnd() * 0.09,
        alpha: 0.03 + rnd() * 0.028
      });
    }
    curtains.push({
      baseY: 0.13 + b * 0.05,
      drop: 0.30 + b * 0.02,
      hue: hue,
      amp: 18 + b * 3,
      phase: rnd() * TAU,
      speed: 0.22 + rnd() * 0.14,
      noiseScale: 1.6 + b * 0.22,
      depth: b / (CN - 1),
      seed: rnd() * 100,
      wisps: wisps
    });
  }

  // Shimmer rain that falls through the bands (count trimmed for perf)
  const shimmer = [];
  for (let i = 0; i < 40; i++) {
    shimmer.push({
      x: rnd(),
      speed: 0.02 + rnd() * 0.05,
      off: rnd(),
      size: 0.6 + rnd() * 1.5,
      ph: rnd() * TAU,
      sway: 6 + rnd() * 16,
      hue: 150 + rnd() * 46,
      bloom: rnd() > 0.86
    });
  }

  // Soft nebula blooms (round), teal -> blue -> violet.
  // Radii trimmed so fill boxes no longer exceed the screen; the centre bloom is
  // relocated to lower-right, clearing the main reading column.
  const nebula = [
    { x: 0.74, y: 0.28, r: 0.40, col: [70, 235, 205], a: 0.10, dx: 0.03, dy: 0.02, sp: 0.05 },
    { x: 0.26, y: 0.24, r: 0.34, col: [96, 150, 235], a: 0.07, dx: 0.04, dy: 0.015, sp: 0.037 },
    { x: 0.74, y: 0.66, r: 0.38, col: [124, 96, 214], a: 0.05, dx: 0.02, dy: 0.03, sp: 0.028 },
    { x: 0.87, y: 0.50, r: 0.30, col: [120, 245, 225], a: 0.06, dx: 0.03, dy: 0.02, sp: 0.06 },
    { x: 0.15, y: 0.60, r: 0.30, col: [150, 110, 232], a: 0.05, dx: 0.025, dy: 0.02, sp: 0.045 }
  ];

  // Few broad vertical aurora reflections in the water (no grid)
  const reflect = [];
  for (let i = 0; i < 6; i++) {
    reflect.push({
      x: 0.1 + rnd() * 0.8,
      width: 0.035 + rnd() * 0.05,
      hue: 152 + rnd() * 42,
      ph: rnd() * TAU,
      sp: 0.4 + rnd() * 0.6
    });
  }

  return { starLayers: starLayers, curtains: curtains, shimmer: shimmer, nebula: nebula, reflect: reflect };
})();

export const renderAurora: ThemeRenderer = (ctx,w,h,t,mx,my,_deltaSeconds,motion)=>{
  const W = w > 1 ? w : 1;
  const H = h > 1 ? h : 1;
  const M = resolveThemeMotion(motion);
  const vel = finiteClamp(M.scrollVelocity / 3, -1, 1);
  const av = vel < 0 ? -vel : vel;
  const story = finiteClamp(M.storyProgress, 0, 1);
  const impulse = finiteClamp(M.interactionImpulse, 0, 1);

  const pmx = finiteClamp(mx, 0, 1);
  const pmy = finiteClamp(my, 0, 1);
  // Blend the pointer target toward the focused card when the page reports focus.
  const tX = M.hasFocus ? pmx * 0.25 + M.focusX * 0.75 : pmx;
  const tY = M.hasFocus ? pmy * 0.25 + M.focusY * 0.75 : pmy;
  const px = tX - 0.5;
  const py = tY - 0.5;
  const maxWH = W > H ? W : H;

  // Atmospheric depth tint (translucent; background already opaque)
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "rgba(8,16,38,0.42)");
  sky.addColorStop(0.5, "rgba(10,22,44,0.16)");
  sky.addColorStop(0.78, "rgba(8,20,36,0.10)");
  sky.addColorStop(1, "rgba(3,7,16,0.66)");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Soft nebula blooms (radii trimmed so the fill boxes no longer exceed the screen)
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < CFG.nebula.length; i++) {
    const n = CFG.nebula[i];
    const nxN = n.x + Math.sin(t * n.sp + n.x * 6) * n.dx + px * 0.05 + story * 0.05;
    const nyN = n.y + Math.cos(t * n.sp * 0.8 + n.y * 5) * n.dy + py * 0.04 - story * 0.02;
    const nr = n.r * maxWH * (0.9 + 0.1 * Math.sin(t * n.sp + n.x * 3));
    const a = n.a * (0.78 + 0.22 * Math.sin(t * 0.3 + n.x * 4));
    softGlow(ctx, nxN * w, nyN * h, nr, "rgba(" + n.col[0] + "," + n.col[1] + "," + n.col[2] + "," + a + ")", "transparent");
  }
  // broad aurora glow field behind the curtains (raised + softened out of the reading band)
  const ag = ctx.createLinearGradient(0, h * 0.24, 0, h * 0.58);
  ag.addColorStop(0, "rgba(60,150,150,0)");
  ag.addColorStop(0.5, "rgba(88,214,190," + (0.034 + 0.014 * Math.sin(t * 0.3)) + ")");
  ag.addColorStop(1, "rgba(80,110,190,0)");
  ctx.fillStyle = ag;
  ctx.fillRect(0, h * 0.24, w, h * 0.34);
  ctx.restore();

  // Focus response: gentle teal bloom toward the focused card (motion only; skipped at rest)
  if (M.hasFocus) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const fa = Math.min(0.16, 0.05 + impulse * 0.11);
    softGlow(ctx, M.focusX * w, M.focusY * h, maxWH * 0.22, "rgba(96,236,214," + fa + ")", "transparent");
    ctx.restore();
  }

  // Stars (parallax). Bright ones bloom softly and roundly; peaks capped for the bloom pass.
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let li = 0; li < CFG.starLayers.length; li++) {
    const layer = CFG.starLayers[li];
    const ddx = -px * layer.depth * 40;
    const ddy = -py * layer.depth * 24;
    for (let si = 0; si < layer.stars.length; si++) {
      const s = layer.stars[si];
      const x = s.x * w + ddx;
      const y = s.y * h + ddy;
      const tw = 0.42 + 0.58 * Math.sin(t * s.tw + s.ph);
      const a = Math.min(0.7, s.b * (0.13 + tw * 0.44));
      if (a <= 0.02) continue;
      ctx.beginPath();
      ctx.arc(x, y, s.s, 0, TAU);
      ctx.fillStyle = "hsla(" + s.hue + ",68%,84%," + a + ")";
      ctx.fill();
      if (s.bloom && tw > 0.6) {
        softGlow(ctx, x, y, s.s * 5 * tw, "hsla(" + s.hue + ",82%,84%," + (a * 0.2) + ")", "transparent");
      }
    }
  }
  ctx.restore();

  // Aurora curtains: soft volumetric drapes (gradient + folds; no full-frame blurred re-fill)
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const step = Math.max(20, W / 52);
  for (let ci = 0; ci < CFG.curtains.length; ci++) {
    const c = CFG.curtains[ci];
    const phaseTime = t * c.speed + c.phase;
    const baseY = h * c.baseY - story * h * 0.02;
    const drop = h * c.drop;
    const hue = c.hue + Math.sin(t * 0.1 + ci) * 6 + story * 30; // story leans toward violet
    const topHue = hue + 22; // crest leans magenta/violet
    const bodyHue = hue - 8;  // body leans green
    const amp = c.amp * (1 + av * 0.16);

    const xs = [];
    const ys = [];
    for (let x = -20; x <= w + 20; x += step) {
      const nx = x / W;
      const wave = Math.sin(nx * 4.6 + phaseTime + c.phase) * amp;
      const wave2 = Math.sin(nx * 10 - phaseTime * 1.25) * (amp * 0.32);
      const noise = fbm(nx * c.noiseScale + phaseTime * 0.12, c.seed + t * 0.03, 2) * 50;
      const pointer = Math.exp(-Math.pow(nx - tX, 2) * 8) * py * 48 * (0.4 + c.depth);
      const shear = vel * (nx - 0.5) * 16 * (0.4 + c.depth);
      xs.push(x);
      ys.push(baseY + wave + wave2 + noise + pointer + shear);
    }
    const n = xs.length;
    const bottomY = baseY + drop;

    // drape body (soft gradient volume; flat hidden bottom, gradient fades before it)
    ctx.beginPath();
    ctx.moveTo(xs[0], ys[0]);
    for (let i = 1; i < n; i++) ctx.lineTo(xs[i], ys[i]);
    ctx.lineTo(xs[n - 1], bottomY);
    ctx.lineTo(xs[0], bottomY);
    ctx.closePath();
    const body = ctx.createLinearGradient(0, baseY - amp - 30, 0, bottomY);
    body.addColorStop(0, "hsla(" + topHue + ",84%,62%," + (0.15 - c.depth * 0.015) + ")");
    body.addColorStop(0.16, "hsla(" + hue + ",80%,54%,0.10)");
    body.addColorStop(0.5, "hsla(" + bodyHue + ",72%,44%,0.05)");
    body.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = body;
    ctx.fill();

    // 2-3 broad, low-alpha vertical soft folds (elliptical glows -> drape volume)
    for (let k = 0; k < c.wisps.length; k++) {
      const wsp = c.wisps[k];
      const cx = (wsp.cx + wsp.drift * Math.sin(t * 0.2 + wsp.wobble) + px * 0.04 * (0.3 + c.depth)) * w;
      const halfW = wsp.width * w;
      const nxC = cx / W;
      const waveC = Math.sin(nxC * 4.6 + phaseTime + c.phase) * amp;
      const noiseC = fbm(nxC * c.noiseScale + phaseTime * 0.12, c.seed + t * 0.03, 2) * 50;
      const topY = baseY + waveC + noiseC;
      const a = wsp.alpha * (0.7 + 0.3 * Math.sin(t * 0.5 + wsp.wobble));
      ctx.save();
      ctx.translate(cx, topY + drop * 0.34);
      ctx.scale(1, 2.0);
      softGlow(ctx, 0, 0, halfW > 1 ? halfW : 1, "hsla(" + topHue + ",82%,62%," + a + ")", "transparent");
      ctx.restore();
    }

    // luminous crest edge (alpha + lightness capped so the bright-pass bloom can't clip to white)
    ctx.beginPath();
    ctx.moveTo(xs[0], ys[0]);
    for (let i = 1; i < n; i++) ctx.lineTo(xs[i], ys[i]);
    ctx.strokeStyle = "hsla(" + topHue + ",90%,77%," + Math.min(0.22, 0.12 + c.depth * 0.05 + av * 0.05) + ")";
    ctx.lineWidth = 1.0 + c.depth * 0.8;
    ctx.shadowColor = "hsla(" + hue + ",88%,64%,0.34)";
    ctx.shadowBlur = 7;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  ctx.restore();

  // Gentle overhead blooms (round), nudged above the reading band
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let k = 0; k < 3; k++) {
    const gx = w * (0.3 + 0.2 * k) + Math.sin(t * 0.18 + k) * w * 0.05;
    const gy = h * (0.16 + 0.045 * k);
    softGlow(ctx, gx, gy, maxWH * (0.12 + 0.03 * k), "rgba(116,236,204," + (0.045 + 0.012 * k) + ")", "transparent");
  }
  ctx.restore();

  // Shimmer raining through the bands (faded through the central + upper-left reading column)
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const shSpeed = 1 + av * 0.5;
  for (let i = 0; i < CFG.shimmer.length; i++) {
    const p = CFG.shimmer[i];
    const prog = (p.off + t * p.speed * shSpeed) % 1;
    const y = prog * h * 0.9;
    const x = p.x * w + Math.sin(t * 0.6 + p.ph) * p.sway + px * 20 * (0.3 + p.x * 0.4);
    const fade = Math.sin(prog * Math.PI);
    const tw = 0.5 + 0.5 * Math.sin(t * 2 + p.ph);
    let a = Math.min(0.6, fade * (0.14 + tw * 0.4));
    const colX = x / W;
    const colY = y / H;
    const inColumn = Math.exp(-Math.pow((colX - 0.42) / 0.3, 2)) * Math.exp(-Math.pow((colY - 0.4) / 0.28, 2));
    a *= 1 - 0.62 * inColumn;
    if (a <= 0.02) continue;
    ctx.beginPath();
    ctx.arc(x, y, p.size, 0, TAU);
    ctx.fillStyle = "hsla(" + p.hue + ",82%,82%," + a + ")";
    ctx.fill();
    if (p.bloom && tw > 0.7) {
      softGlow(ctx, x, y, p.size * 4.5 * tw, "hsla(" + p.hue + ",86%,84%," + (a * 0.22) + ")", "transparent");
    }
  }
  ctx.restore();

  // Water
  const waterY = h * 0.78;
  const water = ctx.createLinearGradient(0, waterY, 0, h);
  water.addColorStop(0, "rgba(5,16,28,0.4)");
  water.addColorStop(0.5, "rgba(3,11,20,0.72)");
  water.addColorStop(1, "rgba(1,5,10,0.95)");
  ctx.fillStyle = water;
  ctx.fillRect(0, waterY, w, h - waterY);

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.beginPath();
  ctx.rect(0, waterY, w, h - waterY);
  ctx.clip();
  const wh = (h - waterY) > 1 ? (h - waterY) : 1;
  // few broad vertical aurora reflections (soft ellipses, no grid)
  for (let i = 0; i < CFG.reflect.length; i++) {
    const r = CFG.reflect[i];
    const rx = r.x * w + Math.sin(t * r.sp + r.ph) * 14 + px * 24;
    const halfW = (r.width * w) > 1 ? r.width * w : 1;
    const a = 0.04 + 0.045 * (0.5 + 0.5 * Math.sin(t * 0.8 + r.ph));
    ctx.save();
    ctx.translate(rx, waterY + wh * 0.5);
    ctx.scale(1, (wh / halfW) * 0.85);
    softGlow(ctx, 0, 0, halfW, "hsla(" + (r.hue + story * 24) + ",80%,66%," + a + ")", "transparent");
    ctx.restore();
  }
  // 3 soft horizontal ripple bands
  for (let i = 0; i < 3; i++) {
    const ry = waterY + ((i + 0.6) / 3) * wh;
    const a = 0.05 * (1 - i / 4) * (0.6 + 0.4 * Math.sin(t * 0.8 + i));
    ctx.strokeStyle = "rgba(132,240,214," + a + ")";
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(132,240,214,0.4)";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(0, ry + Math.sin(t * 0.6 + i) * 3);
    ctx.lineTo(w, ry + Math.sin(t * 0.6 + i + 1) * 3);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.restore();

  // Waterline shimmer + horizon line
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  softGlow(ctx, w * (0.5 + px * 0.2), waterY, w * 0.4, "rgba(130,243,208,0.13)", "transparent");
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(0, waterY + 0.5);
  ctx.lineTo(w, waterY + 0.5);
  ctx.strokeStyle = "rgba(146,240,224,0.18)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Vignette
  const vig = ctx.createRadialGradient(w * 0.5, h * 0.44, (W < H ? W : H) * 0.2, w * 0.5, h * 0.52, maxWH * 0.75);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(0.7, "rgba(2,6,14,0.12)");
  vig.addColorStop(1, "rgba(1,3,8,0.6)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
};
