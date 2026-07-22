import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { finiteClamp, resolveThemeMotion } from "../shared/motion";
import { softGlow } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

const CFG = (function () {
  const rand = createSeededRandom(20260721);
  // Sparse precision points held to the monument's side so the left reading
  // lane keeps its calm negative space.
  const stars = [];
  for (let i = 0; i < 7; i += 1) {
    stars.push({
      x: 0.58 + rand() * 0.36,
      y: 0.12 + rand() * 0.72,
      phase: rand() * TAU,
      twinkle: 0.4 + rand() * 0.9,
      bright: 0.45 + rand() * 0.55,
    });
  }
  // Three quiet architectural survey rings.
  const FRAMES = 3;
  const frames = [];
  for (let i = 0; i < FRAMES; i += 1) {
    frames.push({
      depth: i / (FRAMES - 1),
      rot0: -0.16 + i * 0.05,
      dir: i % 2 === 0 ? 1 : -1,
      spin: 0.004 + i * 0.0008,
      wobble: rand() * TAU,
    });
  }
  // Length pool for the datum ticks; the tick count is now driven by
  // sectionCount, so we hold a small pool. The first five draws match the
  // prior static five-tick rail exactly, preserving the rest look.
  const tickLens = [];
  for (let i = 0; i < 8; i += 1) tickLens.push(0.5 + rand() * 0.5);
  return { stars, frames, tickLens };
})();

export const renderMonolith: ThemeRenderer = (ctx, w, h, t, mx, my, _deltaSeconds, motion) => {
  const M = resolveThemeMotion(motion);
  const minSide = Math.min(w, h);
  const maxSide = Math.max(w, h);
  const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
  const px = mx - 0.5;
  const py = my - 0.5;

  // All motion terms are 0 at rest (resolveThemeMotion returns zeros), so the
  // scene collapses to the approved still; motion only adds gentle nuance.
  const story = clamp01(M.storyProgress);
  const velocity = finiteClamp(M.scrollVelocity / 4, -1, 1);
  const impulse = clamp01(M.interactionImpulse);

  // On phone/portrait the resume spans full width, so the monument's bright
  // right side sits under text and must be subdued (bloom-safe legibility).
  const narrow = clamp01((1.05 - w / (h || 1)) / 0.45);

  const centerX = w * 0.78 + px * minSide * 0.025 + story * minSide * 0.015;
  const centerY = h * 0.47 + py * minSide * 0.018 - velocity * minSide * 0.012;
  const monH = Math.min(h * 0.7, minSide * 0.8);
  const monW = minSide * 0.22;
  const topY = centerY - monH * 0.5;
  const baseY = centerY + monH * 0.5;
  const apexX = centerX - monW * 0.08;
  const leftX = centerX - monW * 0.54;
  const rightX = centerX + monW * 0.5;

  const steel = (a: number) => "rgba(191,199,211," + a + ")";
  const iceHi = (a: number) => "rgba(226,233,242," + a + ")";

  const hexPath = (cx: number, cy: number, rx: number, ry: number, rot: number) => {
    ctx.beginPath();
    for (let c = 0; c <= 6; c += 1) {
      const ang = rot + (c / 6) * TAU;
      const x = cx + Math.cos(ang) * rx;
      const y = cy + Math.sin(ang) * ry;
      if (c === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };

  ctx.save();

  // Cool atmospheric grade (calm, no additive clutter).
  const grade = ctx.createLinearGradient(0, 0, w * 0.2, h);
  grade.addColorStop(0, "rgba(9,12,16,0.5)");
  grade.addColorStop(0.55, "rgba(11,14,19,0.22)");
  grade.addColorStop(1, "rgba(3,4,6,0.55)");
  ctx.fillStyle = grade;
  ctx.fillRect(0, 0, w, h);

  const zenith = ctx.createLinearGradient(w, 0, w * 0.42, h);
  zenith.addColorStop(0, "rgba(38,50,68,0.22)");
  zenith.addColorStop(0.5, "rgba(20,28,40,0.09)");
  zenith.addColorStop(1, "rgba(4,6,9,0)");
  ctx.fillStyle = zenith;
  ctx.fillRect(0, 0, w, h);

  // Single calm gallery key light + a quiet base haze.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const keyX = centerX + minSide * 0.04;
  const keyY = centerY - monH * (0.3 + py * 0.04);
  softGlow(ctx, keyX, keyY, minSide * 0.55, "rgba(120,140,168,0.11)", "transparent");
  softGlow(ctx, keyX, keyY, minSide * 0.26, "rgba(176,192,214,0.1)", "transparent");
  softGlow(ctx, centerX, baseY + minSide * 0.03, minSide * 0.42, "rgba(48,62,82,0.08)", "transparent");
  ctx.restore();

  // Thin architectural survey floor; horizon drifts up gently with page story.
  const horizonY = h * (0.68 - story * 0.02);
  ctx.save();
  ctx.lineWidth = 1;
  for (let line = -4; line <= 5; line += 1) {
    ctx.strokeStyle = steel(0.045);
    ctx.beginPath();
    ctx.moveTo(centerX, horizonY);
    ctx.lineTo(w * (0.44 + line * 0.095), h * 1.05);
    ctx.stroke();
  }
  for (let row = 0; row < 7; row += 1) {
    const progress = (row + 1) / 8;
    const y = horizonY + Math.pow(progress, 1.8) * (h - horizonY);
    ctx.strokeStyle = steel(0.04 + progress * 0.03);
    ctx.beginPath();
    ctx.moveTo(w * (0.45 - progress * 0.08), y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();

  // Architectural wireframe rings (single calm stroke, no vertex dots).
  ctx.save();
  for (let f = CFG.frames.length - 1; f >= 0; f -= 1) {
    const fr = CFG.frames[f];
    const depth = fr.depth;
    const rot = fr.rot0 + t * fr.spin * fr.dir + Math.sin(t * 0.08 + fr.wobble) * 0.02;
    const cx = centerX + minSide * (0.02 + depth * 0.02) + px * minSide * 0.008 * (1 - depth);
    const cy = centerY - minSide * (0.01 + depth * 0.008) + py * minSide * 0.006 * (1 - depth);
    const rx = monW * (0.9 + depth * 1.2);
    const ry = monH * (0.4 + depth * 0.15);
    const a = 0.05 + (1 - depth) * 0.06;
    hexPath(cx, cy, rx, ry, rot);
    ctx.strokeStyle = steel(a);
    ctx.lineWidth = 0.8 + (1 - depth) * 0.5;
    ctx.stroke();
  }
  ctx.restore();

  // Rear slabs give physical depth behind the monument.
  const slabs = [
    { ox: 0.11, oy: 0.05, sc: 0.78, a: 0.34 },
    { ox: 0.066, oy: -0.015, sc: 0.9, a: 0.5 },
  ];
  for (let i = 0; i < slabs.length; i += 1) {
    const sb = slabs[i];
    const x = centerX + minSide * sb.ox;
    const st = topY + monH * (1 - sb.sc) + minSide * sb.oy;
    const sBase = baseY + minSide * sb.oy;
    const width = monW * (0.8 - i * 0.08);
    const face = ctx.createLinearGradient(x - width, st, x + width, sBase);
    face.addColorStop(0, "rgba(40,47,58," + sb.a + ")");
    face.addColorStop(0.55, "rgba(16,20,26," + sb.a + ")");
    face.addColorStop(1, "rgba(5,7,10," + sb.a + ")");
    ctx.beginPath();
    ctx.moveTo(x - width * 0.34, sBase);
    ctx.lineTo(x - width * 0.26, st + width * 0.2);
    ctx.lineTo(x + width * 0.08, st);
    ctx.lineTo(x + width * 0.4, st + width * 0.18);
    ctx.lineTo(x + width * 0.5, sBase - width * 0.08);
    ctx.closePath();
    ctx.fillStyle = face;
    ctx.fill();
    ctx.strokeStyle = steel(0.09 + i * 0.035);
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // ---- SIGNATURE HERO: faceted specular obsidian monolith ----
  const A = { x: apexX, y: topY };
  const B = { x: leftX, y: topY + monW * 0.42 };
  const C = { x: apexX, y: baseY };
  const D = { x: leftX + monW * 0.08, y: baseY - monW * 0.04 };
  const E = { x: rightX, y: topY + monW * 0.38 };
  const F = { x: rightX - monW * 0.02, y: baseY - monW * 0.08 };

  // Peak lightness capped (was 178/191/212) so the bright-pass HD bloom keeps
  // headroom and the lit facets can't clip to white where text sits.
  const mix = (lit: number) => {
    const k = clamp01(lit);
    const r = Math.round(lerp(11, 168, k));
    const g = Math.round(lerp(15, 182, k));
    const b = Math.round(lerp(21, 202, k));
    return "rgb(" + r + "," + g + "," + b + ")";
  };

  const suL = 0.34 + mx * 0.28 + 0.1 * Math.sin(t * 0.12);
  const NL = 6;
  for (let i = 0; i < NL; i += 1) {
    const u0 = i / NL;
    const u1 = (i + 1) / NL;
    const uc = (u0 + u1) * 0.5;
    const t0x = lerp(A.x, B.x, u0), t0y = lerp(A.y, B.y, u0);
    const t1x = lerp(A.x, B.x, u1), t1y = lerp(A.y, B.y, u1);
    const b1x = lerp(C.x, D.x, u1), b1y = lerp(C.y, D.y, u1);
    const b0x = lerp(C.x, D.x, u0), b0y = lerp(C.y, D.y, u0);
    // Specular peak reduced (0.5 -> 0.44) to give the additive bevel/glow
    // stacked above it bloom headroom.
    const spec = Math.exp(-Math.pow((uc - suL) * 3.4, 2)) * 0.44;
    const band = 0.05 * Math.sin(uc * 9);
    const tex = fbm(uc * 4, 1.3, 3) * 0.04;
    ctx.fillStyle = mix(0.4 - uc * 0.2 + spec + band + tex);
    ctx.beginPath();
    ctx.moveTo(t0x, t0y);
    ctx.lineTo(t1x, t1y);
    ctx.lineTo(b1x, b1y);
    ctx.lineTo(b0x, b0y);
    ctx.closePath();
    ctx.fill();
  }

  const NR = 6;
  for (let i = 0; i < NR; i += 1) {
    const u0 = i / NR;
    const u1 = (i + 1) / NR;
    const uc = (u0 + u1) * 0.5;
    const t0x = lerp(A.x, E.x, u0), t0y = lerp(A.y, E.y, u0);
    const t1x = lerp(A.x, E.x, u1), t1y = lerp(A.y, E.y, u1);
    const b1x = lerp(C.x, F.x, u1), b1y = lerp(C.y, F.y, u1);
    const b0x = lerp(C.x, F.x, u0), b0y = lerp(C.y, F.y, u0);
    const band = 0.03 * Math.sin(uc * 8 + 1);
    const tex = fbm(uc * 4, 5.1, 3) * 0.03;
    ctx.fillStyle = mix(0.14 - uc * 0.08 + band + tex);
    ctx.beginPath();
    ctx.moveTo(t0x, t0y);
    ctx.lineTo(t1x, t1y);
    ctx.lineTo(b1x, b1y);
    ctx.lineTo(b0x, b0y);
    ctx.closePath();
    ctx.fill();
  }

  const topFace = ctx.createLinearGradient(B.x, topY, E.x, topY);
  topFace.addColorStop(0, "rgba(120,135,155,0.62)");
  topFace.addColorStop(0.5, "rgba(64,76,92,0.74)");
  topFace.addColorStop(1, "rgba(26,33,42,0.7)");
  ctx.beginPath();
  ctx.moveTo(A.x, A.y);
  ctx.lineTo(B.x, B.y);
  ctx.lineTo(centerX - monW * 0.02, topY + monW * 0.58);
  ctx.lineTo(E.x, E.y);
  ctx.closePath();
  ctx.fillStyle = topFace;
  ctx.fill();

  // Slow polished sheen sweep on the lit face; phase advances with page story
  // and brightness lifts briefly with scroll velocity.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(A.x, A.y);
  ctx.lineTo(B.x, B.y);
  ctx.lineTo(D.x, D.y);
  ctx.lineTo(C.x, C.y);
  ctx.closePath();
  ctx.clip();
  ctx.globalCompositeOperation = "lighter";
  const sweep = 0.5 + 0.5 * Math.sin(t * 0.2 + story * TAU);
  const sxc = lerp(A.x, B.x, sweep);
  const sheenMid = 0.12 + Math.abs(velocity) * 0.05;
  const sheen = ctx.createLinearGradient(sxc - monW * 0.22, 0, sxc + monW * 0.22, 0);
  sheen.addColorStop(0, "rgba(150,170,198,0)");
  sheen.addColorStop(0.5, "rgba(178,196,220," + sheenMid + ")");
  sheen.addColorStop(1, "rgba(150,170,198,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(leftX - monW, topY - monW, monW * 3, monH + monW * 2);
  ctx.restore();

  // Apex bevel + glow, toned down (bevel 0.82 -> 0.52, glow 0.24 -> 0.15) so
  // the additive HD bloom cannot blow the apex line to pure white.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const bevel = ctx.createLinearGradient(A.x, A.y, C.x, C.y);
  bevel.addColorStop(0, "rgba(226,234,244,0.52)");
  bevel.addColorStop(0.5, "rgba(150,168,196,0.33)");
  bevel.addColorStop(1, "rgba(60,74,92,0.16)");
  ctx.strokeStyle = bevel;
  ctx.lineWidth = Math.max(1.4, minSide * 0.0022);
  ctx.beginPath();
  ctx.moveTo(A.x, A.y);
  ctx.lineTo(C.x, C.y);
  ctx.stroke();
  const apexGlowA = 0.15 + impulse * 0.07;
  softGlow(ctx, A.x, A.y, monW * 0.5, "rgba(200,216,236," + apexGlowA + ")", "transparent");
  ctx.restore();

  // Cool rim light on the lit silhouette edge (lifts briefly with scroll).
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = "rgba(190,206,228," + (0.2 + Math.abs(velocity) * 0.08) + ")";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(A.x, A.y);
  ctx.lineTo(B.x, B.y);
  ctx.lineTo(D.x, D.y);
  ctx.stroke();
  ctx.restore();

  // Datum rail — clamped to stay on-screen on phones / most aspect ratios
  // (previously fell off the right edge). Tick count follows sectionCount and
  // the active section's tick is lit; at rest this is a calm five-tick scale.
  ctx.save();
  const railX = Math.min(centerX + monW * 1.5, w - Math.max(22, minSide * 0.03));
  const railTop = topY - monH * 0.02;
  const railBot = baseY + monH * 0.02;
  ctx.strokeStyle = steel(0.09);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(railX, railTop);
  ctx.lineTo(railX, railBot);
  ctx.stroke();
  const tickCount = Math.max(3, Math.min(8, Math.round(M.sectionCount) || 5));
  const activeTick = M.sectionCount > 0
    ? Math.max(0, Math.min(tickCount - 1, Math.round(M.activeSectionIndex)))
    : -1;
  for (let i = 0; i < tickCount; i += 1) {
    const frac = (i + 0.5) / tickCount;
    const ty = lerp(railTop, railBot, frac);
    const isActive = i === activeTick;
    const len = CFG.tickLens[i % CFG.tickLens.length];
    ctx.strokeStyle = steel(isActive ? 0.26 : 0.11);
    ctx.lineWidth = isActive ? 1.7 : 1;
    ctx.beginPath();
    ctx.moveTo(railX, ty);
    ctx.lineTo(railX - (5 + len * 7) - (isActive ? 6 : 0), ty);
    ctx.stroke();
  }
  ctx.restore();

  // One quiet survey line to a precision point. When a card is focused it
  // retargets to that card and drops a small architectural survey reticle
  // (both zero at rest, so it points at the seeded point in the preview).
  ctx.save();
  let tgx;
  let tgy;
  let focused;
  if (M.hasFocus) {
    tgx = clamp01(M.focusX) * w;
    tgy = clamp01(M.focusY) * h;
    focused = true;
  } else {
    const target = CFG.stars[0];
    tgx = target.x * w;
    tgy = target.y * h;
    focused = false;
  }
  ctx.strokeStyle = steel(0.07 + impulse * 0.05);
  ctx.setLineDash([2, 8]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(apexX, topY + monH * 0.28);
  ctx.lineTo(tgx, tgy);
  ctx.stroke();
  ctx.setLineDash([]);
  if (focused) {
    const rr = minSide * 0.013;
    ctx.strokeStyle = steel(0.26 + impulse * 0.12);
    ctx.lineWidth = 1;
    ctx.strokeRect(tgx - rr, tgy - rr, rr * 2, rr * 2);
  }
  ctx.restore();

  // Contact shadow.
  const floorShadow = ctx.createRadialGradient(centerX, baseY, 0, centerX, baseY, monW * 2.2);
  floorShadow.addColorStop(0, "rgba(0,0,0,0.8)");
  floorShadow.addColorStop(0.45, "rgba(0,0,0,0.36)");
  floorShadow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = floorShadow;
  ctx.beginPath();
  ctx.ellipse(centerX, baseY, monW * 2.2, monW * 0.42, 0, 0, TAU);
  ctx.fill();

  // Floor reflection.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const rY = (y: number) => 2 * baseY - y;
  const refl = ctx.createLinearGradient(0, baseY, 0, baseY + monH * 0.55);
  refl.addColorStop(0, "rgba(66,80,100,0.18)");
  refl.addColorStop(0.6, "rgba(30,38,50,0.05)");
  refl.addColorStop(1, "rgba(16,20,28,0)");
  ctx.fillStyle = refl;
  ctx.beginPath();
  ctx.moveTo(B.x, rY(B.y));
  ctx.lineTo(A.x, rY(A.y));
  ctx.lineTo(E.x, rY(E.y));
  ctx.lineTo(F.x, rY(F.y));
  ctx.lineTo(C.x, rY(C.y));
  ctx.lineTo(D.x, rY(D.y));
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Sparse precision points near the monument.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < CFG.stars.length; i += 1) {
    const s = CFG.stars[i];
    const sx = s.x * w - px * minSide * 0.015 * s.bright;
    const sy = s.y * h - py * minSide * 0.015 * s.bright;
    const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * s.twinkle + s.phase));
    ctx.fillStyle = iceHi(0.12 + tw * 0.3 * s.bright);
    ctx.beginPath();
    ctx.arc(sx, sy, 0.7 + tw * 1.0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // Clear reading lane protects the left-side negative space.
  const clear = ctx.createLinearGradient(0, 0, w * 0.66, 0);
  clear.addColorStop(0, "rgba(3,4,6,0.86)");
  clear.addColorStop(0.66, "rgba(3,4,6,0.44)");
  clear.addColorStop(1, "rgba(3,4,6,0)");
  ctx.fillStyle = clear;
  ctx.fillRect(0, 0, w * 0.7, h);

  // On narrow / portrait layouts the monument's bright right side sits under
  // full-width resume text, so deepen a scrim there to keep the additive HD
  // bloom off the type. Fully inactive (alpha 0) on wide desktop aspects.
  if (narrow > 0.01) {
    const rScrim = ctx.createLinearGradient(w * 0.5, 0, w, 0);
    rScrim.addColorStop(0, "rgba(4,5,7,0)");
    rScrim.addColorStop(0.4, "rgba(4,5,7," + 0.22 * narrow + ")");
    rScrim.addColorStop(1, "rgba(4,5,7," + 0.42 * narrow + ")");
    ctx.fillStyle = rScrim;
    ctx.fillRect(w * 0.5, 0, w * 0.5, h);
  }

  // Vignette.
  const vig = ctx.createRadialGradient(centerX, centerY, minSide * 0.15, w * 0.62, h * 0.5, maxSide * 0.85);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.52)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
};
