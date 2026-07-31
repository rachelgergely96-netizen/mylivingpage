import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { finiteClamp, resolveThemeMotion } from "../shared/motion";
import { softGlow, star4 } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

interface HarborGradientCache {
  key: string;
  sky: CanvasGradient | null;
  hz: CanvasGradient | null;
  water: CanvasGradient | null;
  vg: CanvasGradient | null;
  scrim: CanvasGradient | null;
}

const CFG = (function () {
  const rnd = createSeededRandom(20240721);
  const stars = [];
  for (let i = 0; i < 72; i++) {
    stars.push({
      x: rnd(),
      y: rnd() * 0.92,
      r: 0.4 + rnd() * 1.4,
      tw: rnd() * TAU,
      sp: 0.4 + rnd() * 1.6,
      br: rnd(),
      warm: rnd() < 0.22,
    });
  }
  const bpos = [0.05, 0.13, 0.21, 0.28, 0.72, 0.82, 0.93];
  const beacons = [];
  for (let i = 0; i < bpos.length; i++) {
    beacons.push({
      x: bpos[i],
      warm: i % 3 === 1,
      phase: rnd() * TAU,
      speed: 0.4 + rnd() * 0.8,
      size: 0.7 + rnd() * 0.85,
    });
  }
  const towers = [];
  for (let i = 0; i < 16; i++) {
    towers.push({
      x: rnd(),
      w: 0.006 + rnd() * 0.03,
      h: 0.012 + rnd() * 0.055,
      light: rnd() < 0.45,
      warm: rnd() < 0.5,
      lp: rnd() * TAU,
    });
  }
  const glints = [];
  for (let i = 0; i < 64; i++) {
    glints.push({
      x: rnd(),
      d: 0.03 + rnd() * 0.95,
      ph: rnd() * TAU,
      sp: 0.5 + rnd() * 1.6,
      len: 0.4 + rnd() * 1.3,
    });
  }
  const gc: HarborGradientCache = {
    key: "",
    sky: null,
    hz: null,
    water: null,
    vg: null,
    scrim: null,
  };
  return { stars: stars, beacons: beacons, towers: towers, glints: glints, gc };
})();

export const renderHarbor: ThemeRenderer = (
  ctx,
  w,
  h,
  t,
  mx,
  my,
  _deltaSeconds,
  motion,
) => {
  // Uniform motion contract: resolve page motion once at the top. All resolved
  // values are zero/centered at rest and in the preview; harbor keeps its base
  // composition untouched by page motion, so M is plumbing only for now and
  // reducedMotion simply freezes time to the canonical T=0 pose.
  const M = resolveThemeMotion(motion);
  const reduced = !!(motion && motion.reducedMotion);
  const T = reduced ? 0 : finiteClamp(t, 0, 1e6);
  void M;
  const HOR = h * (0.52 + (my - 0.5) * 0.03);
  const GRADIENT_HORIZON = h * 0.52;
  const WH = Math.max(1, h - HOR);
  const px = mx - 0.5,
    py = my - 0.5;
  const CY = "150,210,255",
    CY2 = "120,195,235",
    WM = "255,208,150",
    GL = "196,228,255",
    PCW = "206,230,255",
    PWW = "255,238,212";
  const gc = CFG.gc;
  // Keep the expensive atmospheric gradients stable for a given canvas size.
  // Keying them to a rounded pointer-driven horizon made the lighting jump in
  // one-pixel bands even when the shared pointer path itself was continuous.
  const gkey = w + "|" + h;
  if (gc.key !== gkey) {
    gc.key = gkey;
    const sky = ctx.createLinearGradient(0, 0, 0, GRADIENT_HORIZON);
    sky.addColorStop(0, "rgba(9,20,34,0.55)");
    sky.addColorStop(0.55, "rgba(7,17,28,0.32)");
    sky.addColorStop(1, "rgba(14,34,48,0.42)");
    gc.sky = sky;
    const hz = ctx.createLinearGradient(
      0,
      GRADIENT_HORIZON - h * 0.16,
      0,
      GRADIENT_HORIZON + h * 0.02,
    );
    hz.addColorStop(0, "rgba(38,78,104,0)");
    hz.addColorStop(0.7, "rgba(44,90,118,0.11)");
    hz.addColorStop(1, "rgba(74,134,162,0.18)");
    gc.hz = hz;
    const wsh = ctx.createLinearGradient(0, GRADIENT_HORIZON, 0, h);
    wsh.addColorStop(0, "rgba(28,66,90,0.5)");
    wsh.addColorStop(0.22, "rgba(13,32,48,0.34)");
    wsh.addColorStop(1, "rgba(3,6,11,0.62)");
    gc.water = wsh;
    const vg = ctx.createRadialGradient(
      w * 0.5,
      GRADIENT_HORIZON,
      Math.min(w, h) * 0.18,
      w * 0.5,
      h * 0.52,
      Math.max(w, h) * 0.78,
    );
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(0.7, "rgba(2,4,7,0.28)");
    vg.addColorStop(1, "rgba(0,0,0,0.6)");
    gc.vg = vg;
    const scrim = ctx.createRadialGradient(
      w * 0.5,
      GRADIENT_HORIZON - h * 0.05,
      0,
      w * 0.5,
      GRADIENT_HORIZON - h * 0.02,
      Math.max(w, h) * 0.5,
    );
    scrim.addColorStop(0, "rgba(4,8,13,0.28)");
    scrim.addColorStop(0.55, "rgba(4,8,13,0.10)");
    scrim.addColorStop(1, "rgba(4,8,13,0)");
    gc.scrim = scrim;
  }
  const { sky, hz, water, vg, scrim } = gc;
  if (!sky || !hz || !water || !vg || !scrim) return;
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, HOR + 2);
  ctx.globalCompositeOperation = "lighter";
  for (const s of CFG.stars) {
    const sx = s.x * w - px * 16 * (0.3 + s.br);
    const sy = s.y * HOR * 0.82 - py * 10 * (0.3 + s.br);
    const tw = 0.5 + 0.5 * Math.sin(T * s.sp + s.tw);
    const a = (0.16 + 0.42 * s.br) * tw;
    const col = s.warm ? "255,226,182" : GL;
    ctx.beginPath();
    ctx.arc(sx, sy, s.r, 0, TAU);
    ctx.fillStyle = "rgba(" + col + "," + a + ")";
    ctx.fill();
    if (s.br > 0.9) {
      star4(ctx, sx, sy, 4 + 5 * tw, 0.7, "rgba(" + col + "," + a * 0.6 + ")");
    }
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = hz;
  ctx.fillRect(0, HOR - h * 0.16, w, h * 0.18);
  ctx.globalCompositeOperation = "lighter";
  softGlow(ctx, w * 0.5, HOR, w * 0.3, "rgba(" + CY2 + ",0.05)", "transparent");
  softGlow(
    ctx,
    w * 0.22,
    HOR,
    w * 0.24,
    "rgba(80,150,190,0.07)",
    "transparent",
  );
  softGlow(
    ctx,
    w * 0.8,
    HOR,
    w * 0.24,
    "rgba(150,120,80,0.055)",
    "transparent",
  );
  ctx.globalCompositeOperation = "source-over";
  for (const b of CFG.towers) {
    const bx = b.x * w,
      bw = b.w * w,
      bh = b.h * h;
    ctx.fillStyle = "rgba(3,6,11,0.9)";
    ctx.fillRect(bx - bw / 2, HOR - bh, bw, bh);
  }
  ctx.fillStyle = "rgba(2,5,9,0.7)";
  ctx.fillRect(0, HOR - 2, w, 3);
  ctx.globalCompositeOperation = "lighter";
  for (const b of CFG.towers) {
    if (!b.light) continue;
    const bx = b.x * w,
      bh = b.h * h;
    const fl = 0.4 + 0.6 * Math.sin(T * 0.7 + b.lp);
    const col = b.warm ? WM : CY2;
    ctx.fillStyle = "rgba(" + col + "," + 0.4 * fl + ")";
    ctx.fillRect(bx - 0.8, HOR - bh * 0.6, 1.6, 1.6);
  }
  ctx.globalCompositeOperation = "source-over";
  const leftX = w * 0.16,
    rightX = w * 0.84;
  const towerH = h * 0.15;
  const lampY = HOR - towerH;
  const beamLen = Math.max(w, h) * 0.95;
  const angA = 0.06 + Math.sin(T * 0.2) * 0.26 + px * 0.28;
  const angB = Math.PI - 0.06 + Math.sin(T * 0.17 + 1.3) * 0.26 + px * 0.28;
  const beam = (
    x: number,
    y0: number,
    ang: number,
    spread: number,
    len: number,
    col: string,
    inten: number,
  ) => {
    const g = ctx.createLinearGradient(
      x,
      y0,
      x + Math.cos(ang) * len,
      y0 + Math.sin(ang) * len,
    );
    g.addColorStop(0, "rgba(" + col + "," + inten + ")");
    g.addColorStop(0.45, "rgba(" + col + "," + inten * 0.34 + ")");
    g.addColorStop(1, "rgba(" + col + ",0)");
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(
      x + Math.cos(ang - spread) * len,
      y0 + Math.sin(ang - spread) * len,
    );
    ctx.lineTo(
      x + Math.cos(ang + spread) * len,
      y0 + Math.sin(ang + spread) * len,
    );
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
  };
  const drawBody = (tx: number) => {
    const bw = w * 0.011;
    ctx.beginPath();
    ctx.moveTo(tx - bw, HOR);
    ctx.lineTo(tx - bw * 0.55, HOR - towerH);
    ctx.lineTo(tx + bw * 0.55, HOR - towerH);
    ctx.lineTo(tx + bw, HOR);
    ctx.closePath();
    ctx.fillStyle = "rgba(6,12,18,0.95)";
    ctx.fill();
  };
  drawBody(leftX);
  drawBody(rightX);
  ctx.globalCompositeOperation = "lighter";
  beam(leftX, lampY, angA, 0.15, beamLen, CY, 0.08);
  beam(leftX, lampY, angA, 0.045, beamLen, CY, 0.12);
  beam(rightX, lampY, angB, 0.15, beamLen, WM, 0.07);
  beam(rightX, lampY, angB, 0.045, beamLen, WM, 0.11);
  softGlow(
    ctx,
    leftX,
    lampY,
    w * 0.026,
    "rgba(" + CY + ",0.42)",
    "transparent",
  );
  softGlow(
    ctx,
    rightX,
    lampY,
    w * 0.024,
    "rgba(" + WM + ",0.4)",
    "transparent",
  );
  ctx.beginPath();
  ctx.arc(leftX, lampY, 2.2, 0, TAU);
  ctx.fillStyle = "rgba(" + PCW + ",0.5)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(rightX, lampY, 2.2, 0, TAU);
  ctx.fillStyle = "rgba(" + PWW + ",0.48)";
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalCompositeOperation = "lighter";
  for (const b of CFG.beacons) {
    const bx = b.x * w;
    const pulse = 0.5 + 0.5 * Math.sin(T * b.speed + b.phase);
    const col = b.warm ? WM : CY;
    const pale = b.warm ? PWW : PCW;
    softGlow(
      ctx,
      bx,
      HOR - 4,
      (11 + 9 * b.size) * (0.6 + 0.55 * pulse),
      "rgba(" + col + "," + (0.3 * pulse + 0.08) + ")",
      "transparent",
    );
    ctx.beginPath();
    ctx.arc(bx, HOR - 4, 1.3 + 1.0 * b.size, 0, TAU);
    ctx.fillStyle = "rgba(" + pale + "," + (0.28 + 0.2 * pulse) + ")";
    ctx.fill();
    if (b.size > 1.2) {
      star4(
        ctx,
        bx,
        HOR - 4,
        13 * pulse + 5,
        1.2,
        "rgba(" + col + "," + 0.28 * pulse + ")",
      );
    }
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = "rgba(" + CY2 + ",0.16)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, HOR);
  ctx.lineTo(w, HOR);
  ctx.stroke();
  ctx.fillStyle = water;
  ctx.fillRect(0, HOR, w, WH);
  const rows = 36;
  const step = Math.max(24, w / 26);
  for (let i = 0; i < rows; i++) {
    const f = i / (rows - 1);
    const y = HOR + Math.pow(f, 1.22) * WH;
    const amp = 1.1 + f * 8.5;
    ctx.beginPath();
    for (let x = 0; x <= w; x += step) {
      const yo =
        Math.sin(x * 0.012 + T * 1.25 + f * 6) * amp +
        Math.sin(x * 0.03 - T * 0.85 + f * 10) * amp * 0.4 +
        fbm(x * 0.006, y * 0.02 + T * 0.22, 2) * amp * 0.7;
      if (x === 0) ctx.moveTo(x, y + yo);
      else ctx.lineTo(x, y + yo);
    }
    const cr = Math.round(115 + (1 - f) * 80);
    const cg = Math.round(158 + (1 - f) * 52);
    const cb = Math.round(192 + (1 - f) * 40);
    ctx.strokeStyle =
      "rgba(" + cr + "," + cg + "," + cb + "," + (0.05 + (1 - f) * 0.11) + ")";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "lighter";
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, HOR, w, WH);
  ctx.clip();
  beam(leftX, HOR + towerH, -angA, 0.14, beamLen, CY, 0.05);
  beam(rightX, HOR + towerH, -angB, 0.14, beamLen, WM, 0.04);
  ctx.restore();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalCompositeOperation = "lighter";
  for (const b of CFG.beacons) {
    const bx = b.x * w;
    const pulse = 0.5 + 0.5 * Math.sin(T * b.speed + b.phase);
    const col = b.warm ? WM : CY;
    const steps = 14;
    for (let i = 1; i <= steps; i++) {
      const f = i / steps;
      const y = HOR + f * WH;
      const wob =
        Math.sin(y * 0.055 + T * 1.5 + b.phase) * (3 + f * 20) +
        fbm(bx * 0.01, y * 0.02 + T * 0.3, 2) * (5 + f * 16);
      const half = (2 + f * 9) * (1 - f * 0.25);
      const a = 0.15 * pulse * (1 - f) * (1 - f);
      ctx.fillStyle = "rgba(" + col + "," + a + ")";
      ctx.fillRect(bx + wob - half, y, half * 2, 2.6);
    }
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.globalCompositeOperation = "lighter";
  for (const g of CFG.glints) {
    const y = HOR + g.d * WH;
    const tw = 0.5 + 0.5 * Math.sin(T * g.sp + g.ph);
    if (tw < 0.14) continue;
    const wob = Math.sin(y * 0.05 + T * 1.15 + g.ph) * (3 + g.d * 18);
    const gx = g.x * w + wob;
    const a = 0.2 * tw * (1 - g.d * 0.5);
    const len = g.len * (2 + g.d * 4);
    ctx.strokeStyle = "rgba(" + GL + "," + a + ")";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx - len, y);
    ctx.lineTo(gx + len, y);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
};
