import { createSeededRandom } from "../shared/random";
import { finiteClamp, resolveThemeMotion } from "../shared/motion";
import { softGlow } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

const CFG = (function () {
  const rand = createSeededRandom(20260721);
  const plateCount = 8;
  const plates = [];
  for (let i = 0; i < plateCount; i++) {
    const depth = i / (plateCount - 1);
    plates.push({
      i: i,
      depth: depth,
      phase: rand() * TAU,
      speed: 0.07 + rand() * 0.05,
    });
  }
  const ghosts = [];
  for (let i = 0; i < 6; i++) {
    ghosts.push({
      yFrac: 0.1 + i * 0.05 + rand() * 0.02,
      xFrac: 0.6 + rand() * 0.22,
      wFrac: 0.16 + rand() * 0.12,
      phase: rand() * TAU,
      speed: 0.015 + rand() * 0.02,
    });
  }
  const guides = [];
  for (let i = 0; i < 14; i++) {
    guides.push(rand());
  }
  return {
    plateCount: plateCount,
    plates: plates,
    ghosts: ghosts,
    guides: guides,
  };
})();

export const renderEchelon: ThemeRenderer = (
  ctx,
  w,
  h,
  time,
  mx,
  my,
  _deltaSeconds,
  motion,
) => {
  const M = resolveThemeMotion(motion);
  const reducedMotion = motion?.reducedMotion ?? false;
  const t = reducedMotion ? 0 : time;
  const story = M.storyProgress;
  const vel = reducedMotion ? 0 : finiteClamp(M.scrollVelocity / 4, -1, 1);
  const speed = Math.abs(vel);
  const impulse = M.interactionImpulse;
  const minSide = Math.min(w, h);
  const maxSide = Math.max(w, h);
  const px = mx - 0.5;
  const py = my - 0.5;
  const plateCount = CFG.plateCount;
  const plateOffset = h > w * 1.1 ? 0.22 : 0.1;
  const activeIdx =
    story > 0.001
      ? Math.round(story * (plateCount - 1))
      : Math.min(3, plateCount - 1);
  const fallbackRake = ((t / 16) % 1 + 1) % 1;
  const rakeU = reducedMotion
    ? 0.52
    : finiteClamp(
        (story > 0.001 ? story : fallbackRake) +
          vel * 0.025 +
          (M.hasFocus ? (M.focusX - 0.5) * 0.025 : 0),
        0,
        1,
        0.52,
      );
  const tracePlate = (
    l: number,
    r: number,
    y: number,
    hh: number,
    notch: number,
  ) => {
    ctx.beginPath();
    ctx.moveTo(l + notch, y - hh);
    ctx.lineTo(r - notch * 0.72, y - hh);
    ctx.lineTo(r, y);
    ctx.lineTo(r - notch * 0.72, y + hh);
    ctx.lineTo(l + notch, y + hh);
    ctx.lineTo(l, y);
    ctx.closePath();
  };
  ctx.save();
  const baseGrade = ctx.createLinearGradient(0, 0, w, h);
  baseGrade.addColorStop(0, "rgba(6,11,20,0.55)");
  baseGrade.addColorStop(0.5, "rgba(9,17,28,0.28)");
  baseGrade.addColorStop(1, "rgba(2,4,8,0.62)");
  ctx.fillStyle = baseGrade;
  ctx.fillRect(0, 0, w, h);
  const hx = w * (0.82 - px * 0.03) - story * minSide * 0.01;
  const hy = h * (0.22 - py * 0.03);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  softGlow(
    ctx,
    hx,
    hy,
    minSide * 0.58,
    "rgba(112,169,222,0.06)",
    "transparent",
  );
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = "rgba(120,165,215,0.05)";
  ctx.lineWidth = 1;
  for (let i = 0; i < CFG.guides.length; i++) {
    const endY = h * (0.03 + CFG.guides[i] * 0.96);
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(w + minSide * 0.05, endY);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(96,140,190,0.045)";
  for (let b = 0; b < 7; b++) {
    const yy = h * (0.16 + b * 0.12);
    ctx.beginPath();
    ctx.moveTo(w * 0.44, yy);
    ctx.lineTo(w, yy - minSide * 0.03);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(150,195,240,0.09)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w * 0.46, hy + minSide * 0.02);
  ctx.lineTo(w, hy - minSide * 0.04);
  ctx.stroke();
  for (let i = 0; i < CFG.ghosts.length; i++) {
    const gp = CFG.ghosts[i];
    const gy =
      h * gp.yFrac +
      Math.sin(t * gp.speed + gp.phase) * minSide * 0.012 -
      py * minSide * 0.004;
    const gw = w * gp.wFrac;
    const gl =
      w * gp.xFrac +
      Math.sin(t * gp.speed * 0.7 + gp.phase) * minSide * 0.02 -
      px * minSide * 0.006;
    const gnotch = minSide * 0.02;
    tracePlate(gl, gl + gw, gy, h * 0.02, gnotch);
    ctx.fillStyle = "rgba(28,50,78,0.10)";
    ctx.fill();
    ctx.strokeStyle = "rgba(120,160,210,0.05)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  const nodes = [];
  for (let i = 0; i < plateCount; i++) {
    const p = CFG.plates[i];
    const depth = p.depth;
    const drift = Math.sin(t * p.speed + p.phase);
    const width = w * (0.33 + depth * 0.2);
    const halfHeight = h * (0.032 + depth * 0.013);
    const left =
      w * (0.5 + plateOffset + depth * 0.028) +
      drift * minSide * 0.008 +
      px * minSide * (0.008 + depth * 0.022) +
      vel * minSide * (0.005 + depth * 0.007);
    const right = left + width;
    const y =
      h * (0.2 + i * 0.101) +
      py * minSide * (0.006 + depth * 0.014) +
      Math.sin(t * 0.09 + p.phase) * minSide * 0.004 +
      (story - 0.5) * minSide * 0.006;
    const notch = minSide * (0.028 + depth * 0.014);
    const boost =
      i === activeIdx
        ? finiteClamp(0.72 + speed * 0.16 + impulse * 0.12, 0, 1, 0.72)
        : 0;
    nodes.push({
      x: left + notch * 0.5,
      y: y,
      boost: boost,
      right: right,
      notch: notch,
    });
    ctx.save();
    tracePlate(left, right, y, halfHeight, notch);
    ctx.clip();
    const fill = ctx.createLinearGradient(
      left,
      y - halfHeight,
      left,
      y + halfHeight,
    );
    fill.addColorStop(
      0,
      "rgba(" +
        Math.round(58 + depth * 54) +
        "," +
        Math.round(92 + depth * 72) +
        "," +
        Math.round(140 + depth * 84) +
        ",0.95)",
    );
    fill.addColorStop(
      0.32,
      "rgba(" +
        Math.round(34 + depth * 24) +
        "," +
        Math.round(56 + depth * 34) +
        "," +
        Math.round(86 + depth * 46) +
        ",0.9)",
    );
    fill.addColorStop(
      0.72,
      "rgba(" +
        Math.round(18 + depth * 14) +
        "," +
        Math.round(30 + depth * 20) +
        "," +
        Math.round(48 + depth * 30) +
        ",0.92)",
    );
    fill.addColorStop(1, "rgba(5,9,17,0.96)");
    ctx.fillStyle = fill;
    ctx.fill();
    const sheen = ctx.createLinearGradient(left, y, right, y);
    sheen.addColorStop(0, "rgba(140,186,232,0)");
    sheen.addColorStop(
      0.42,
      "rgba(140,186,232," + (0.03 + depth * 0.03).toFixed(3) + ")",
    );
    sheen.addColorStop(
      0.6,
      "rgba(190,218,246," +
        (0.05 + depth * 0.035 + speed * 0.02).toFixed(3) +
        ")",
    );
    sheen.addColorStop(0.78, "rgba(140,186,232,0.02)");
    sheen.addColorStop(1, "rgba(140,186,232,0)");
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = sheen;
    ctx.fillRect(left, y - halfHeight, width, halfHeight * 2);
    ctx.strokeStyle =
      "rgba(120,160,205," + (0.04 + depth * 0.04).toFixed(3) + ")";
    ctx.lineWidth = 0.6;
    for (let dl = 0; dl < 2; dl++) {
      const ly = y - halfHeight + halfHeight * 2 * (0.34 + dl * 0.34);
      ctx.beginPath();
      ctx.moveTo(left + notch, ly);
      ctx.lineTo(right - notch * 0.6, ly);
      ctx.stroke();
    }
    if (i === activeIdx) {
      const sweepX = left + rakeU * width;
      const rakeWidth = Math.max(notch * 2, width * 0.08);
      const peak = finiteClamp(
        0.12 +
          boost * 0.04 +
          (M.hasFocus ? 0.01 + impulse * 0.01 : 0),
        0,
        0.18,
        0.12,
      );
      const sw = ctx.createLinearGradient(
        sweepX - rakeWidth,
        y,
        sweepX + rakeWidth,
        y,
      );
      sw.addColorStop(0, "rgba(198,224,250,0)");
      sw.addColorStop(0.38, "rgba(198,224,250,0.06)");
      sw.addColorStop(
        0.5,
        "rgba(216,234,252," + peak.toFixed(3) + ")",
      );
      sw.addColorStop(0.62, "rgba(198,224,250,0.06)");
      sw.addColorStop(1, "rgba(198,224,250,0)");
      ctx.fillStyle = sw;
      ctx.fillRect(
        sweepX - rakeWidth,
        y - halfHeight,
        rakeWidth * 2,
        halfHeight * 2,
      );
    }
    ctx.restore();
    ctx.restore();
    tracePlate(left, right, y, halfHeight, notch);
    ctx.strokeStyle =
      "rgba(145,174,232," +
      (0.12 + depth * 0.05 + boost * 0.22).toFixed(3) +
      ")";
    ctx.lineWidth = 0.9 + depth * 0.4 + boost * 0.6;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(left + notch, y - halfHeight);
    ctx.lineTo(right - notch * 0.72, y - halfHeight);
    ctx.lineTo(right, y);
    const topEdgeAlpha =
      i === activeIdx ? 0.19 + depth * 0.05 : 0.1 + depth * 0.05;
    ctx.strokeStyle =
      "rgba(198,224,250," + topEdgeAlpha.toFixed(3) + ")";
    ctx.lineWidth = 1;
    ctx.stroke();
    if (i === activeIdx) {
      const edgeAlpha = finiteClamp(
        0.1 + boost * 0.05 + (M.hasFocus ? impulse * 0.02 : 0),
        0,
        0.18,
        0.1,
      );
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      softGlow(
        ctx,
        right,
        y,
        notch * (1.7 + boost * 0.7),
        "rgba(140,186,232," + edgeAlpha.toFixed(3) + ")",
        "transparent",
      );
      ctx.restore();
    }
  }
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.beginPath();
  for (let i = 0; i < nodes.length; i++) {
    if (i === 0) ctx.moveTo(nodes[i].x, nodes[i].y);
    else ctx.lineTo(nodes[i].x, nodes[i].y);
  }
  const spineGrad = ctx.createLinearGradient(
    nodes[0].x,
    nodes[0].y,
    nodes[nodes.length - 1].x,
    nodes[nodes.length - 1].y,
  );
  spineGrad.addColorStop(0, "rgba(120,172,220,0.05)");
  spineGrad.addColorStop(0.5, "rgba(170,204,244,0.18)");
  spineGrad.addColorStop(1, "rgba(120,172,220,0.05)");
  ctx.strokeStyle = spineGrad;
  ctx.lineWidth = 1.3;
  ctx.stroke();
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const sz = 2 + n.boost * 2.6;
    ctx.fillStyle =
      "rgba(205,226,248," + (0.3 + n.boost * 0.28).toFixed(3) + ")";
    ctx.fillRect(n.x - sz * 0.5, n.y - sz * 0.5, sz, sz);
  }
  ctx.restore();
  const clearSpace = ctx.createLinearGradient(0, 0, w * 0.66, 0);
  clearSpace.addColorStop(0, "rgba(2,4,8,0.70)");
  clearSpace.addColorStop(0.66, "rgba(2,4,8,0.30)");
  clearSpace.addColorStop(1, "rgba(2,4,8,0)");
  ctx.fillStyle = clearSpace;
  ctx.fillRect(0, 0, w * 0.66, h);
  const grade = ctx.createLinearGradient(0, 0, 0, h);
  grade.addColorStop(0, "rgba(20,40,68,0.10)");
  grade.addColorStop(0.5, "rgba(0,0,0,0)");
  grade.addColorStop(1, "rgba(1,3,7,0.30)");
  ctx.fillStyle = grade;
  ctx.fillRect(0, 0, w, h);
  const vig = ctx.createRadialGradient(
    w * 0.72,
    h * 0.46,
    minSide * 0.15,
    w * 0.62,
    h * 0.5,
    maxSide * 0.82,
  );
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(0.7, "rgba(1,2,5,0.18)");
  vig.addColorStop(1, "rgba(0,1,4,0.5)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
};
