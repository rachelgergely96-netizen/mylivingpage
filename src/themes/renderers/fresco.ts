import { fbm, noise2D } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { resolveThemeMotion } from "../shared/motion";
import { softGlow } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

const CFG = (function(){
  const rand = createSeededRandom(70413);
  const blooms = [];
  for (let i=0;i<3;i++){
    blooms.push({
      x: 0.58 + rand()*0.3,
      y: 0.26 + rand()*0.42,
      r: 0.22 + rand()*0.16,
      ph: rand()*TAU,
      spd: 0.035 + rand()*0.05,
      tint: 0.6 + rand()*0.4
    });
  }
  return {
    blooms: blooms,
    warm: [158, 100, 60],
    cool: [60, 84, 92]
  };
})();

export const renderFresco: ThemeRenderer = (ctx,w,h,t,mx,my,_deltaSeconds,motion)=>{
  const M = resolveThemeMotion(motion);
  const vel = M.scrollVelocity/4;            // [-1,1], 0 at rest
  const absVel = vel<0?-vel:vel;             // [0,1]
  const story = M.storyProgress;             // [0,1], 0 at rest
  const foc = M.hasFocus ? 1 : 0;            // gate: focusX/Y only meaningful when focused
  const bloomEnergy = M.interactionImpulse*0.6 + (M.pointerSpeed/4)*0.4; // [0,1], 0 at rest

  const minSide = Math.min(w,h);
  const maxSide = Math.max(w,h);
  const cl = (v: number)=> v<0?0:(v>255?255:v);
  const c01 = (v: number)=> v<0?0:(v>1?1:v);
  const px = mx-0.5, py = my-0.5;
  ctx.save();

  // Aged base wash: tints the grout between boxes with warm/cool depth (not opaque).
  const wash = ctx.createLinearGradient(0,0,w,h);
  wash.addColorStop(0,"rgba(34,25,19,0.5)");
  wash.addColorStop(0.5,"rgba(19,17,16,0.26)");
  wash.addColorStop(1,"rgba(7,6,5,0.55)");
  ctx.fillStyle = wash;
  ctx.fillRect(0,0,w,h);

  // Raking light source: drifts, follows mouse, and leans toward the focused
  // section when the page reports focus (scroll speed quickens the drift).
  const driftSpd = 1 + absVel*0.7;
  let lxN = 0.72 + px*0.05 + Math.sin(t*0.05*driftSpd)*0.02;
  let lyN = 0.34 + py*0.03 + Math.cos(t*0.043*driftSpd)*0.02;
  if (foc){
    lxN += (M.focusX - lxN)*0.3;
    lyN += (M.focusY - lyN)*0.3;
  }
  const lightX = w*lxN;
  const lightY = h*lyN;
  const invMax = 1/Math.max(1, maxSide*0.62);

  // ---- The star: mineral-plaster box grid ----
  const tile = Math.max(46, Math.sqrt((w*h)/340));
  // storyProgress slowly re-ages / re-lights the wall as chapters advance.
  const dX = Math.sin(t*0.03)*0.05 + story*0.12;
  const dY = Math.cos(t*0.024)*0.04 + story*0.09;
  const crazeT = Math.sin(t*0.06)*0.15 + story*0.2;
  const warmShift = story*0.1;
  const warm = CFG.warm, cool = CFG.cool;

  for (let x=0; x<w; x+=tile){
    for (let y=0; y<h; y+=tile){
      const cx = x + tile*0.5;
      const cy = y + tile*0.5;

      // Large soft fields: warm vs cool pigment patches + aged patina.
      const warm01 = c01(noise2D(cx*0.0024+11.2+dX, cy*0.0024-4.7)*1.15 + 0.5 + warmShift);
      const wear01 = c01(noise2D(cx*0.0017-6.3, cy*0.0017+9.1+dY)*1.05 + 0.5);
      // Fine pigment + grain give each tile life.
      const pigment = fbm(cx*0.011+dX, cy*0.011+dY, 3);
      const grain = noise2D(cx*0.05+7.1, cy*0.05-3.3);
      // Pseudo surface-normal shading (undulating plaster).
      const sh = noise2D(cx*0.021+0.9+dX, cy*0.021);
      const sv = noise2D(cx*0.021, cy*0.021+0.9+dY);
      // Crazing field drives grout width + hairline offset (breathes with t).
      const craze = c01(noise2D(cx*0.03-5, cy*0.03+2+crazeT)*0.95 + 0.5);

      // Warm/cool base mix.
      let r = cool[0] + (warm[0]-cool[0])*warm01;
      let g = cool[1] + (warm[1]-cool[1])*warm01;
      let b = cool[2] + (warm[2]-cool[2])*warm01;
      // Pigment depth + mineral grain.
      const pig = 0.72 + pigment*0.6;
      r = r*pig + grain*8;
      g = g*pig + grain*6;
      b = b*pig + grain*5;
      // Aged patina patches.
      const patina = 0.66 + wear01*0.5;
      // Undulation shade.
      let shade = 1 + (sh - sv)*0.16;
      if (shade<0.78) shade=0.78; else if (shade>1.28) shade=1.28;
      // Raking light falloff.
      const ddx = cx-lightX, ddy = cy-lightY;
      const dist = Math.sqrt(ddx*ddx+ddy*ddy)*invMax;
      let rake = 1.16 - dist*0.5;
      if (rake<0.72) rake=0.72; else if (rake>1.2) rake=1.2;

      const m = patina*shade*rake;
      let vr = r*m, vg = g*m, vb = b*m;
      // Soft highlight ceiling: compresses only the brightest lit plaster so it
      // tops out ~205-216 instead of clipping to white. Keeps mid-tones lively,
      // improves contrast for overlaid text, and leaves bright-pass bloom headroom.
      const peak = vr>vg ? (vr>vb?vr:vb) : (vg>vb?vg:vb);
      if (peak > 170){
        const over = peak - 170;
        const s = (170 + over*46/(46+over)) / peak;
        vr*=s; vg*=s; vb*=s;
      }
      const fr = cl(vr), fg = cl(vg), fb = cl(vb);

      // Inset face + crazing: variable grout gap and a slight hairline offset.
      const g0 = tile*(0.05 + craze*0.11);
      const fx = x + g0 + (warm01-0.5)*g0*0.7;
      const fy = y + g0 + (wear01-0.5)*g0*0.7;
      const fw = tile - g0*2;
      const fh = tile - g0*2;
      if (fw<=0.5 || fh<=0.5) continue;

      // Plaster face.
      ctx.fillStyle = `rgba(${fr|0},${fg|0},${fb|0},0.9)`;
      ctx.fillRect(fx, fy, fw+0.6, fh+0.6);

      // Softened bevel: gentle raked lip on top, shallow recess on bottom.
      // Lower contrast + alpha than before so the tile grid reads calm (not a
      // busy high-frequency light/dark lattice) under any overlaid content.
      const bh = fh*0.15 < 1 ? 1 : fh*0.15;
      ctx.fillStyle = `rgba(${cl(fr+22)|0},${cl(fg+18)|0},${cl(fb+14)|0},0.3)`;
      ctx.fillRect(fx, fy, fw+0.6, bh);
      ctx.fillStyle = `rgba(${cl(fr*0.6)|0},${cl(fg*0.6)|0},${cl(fb*0.62)|0},0.4)`;
      ctx.fillRect(fx, fy+fh-bh, fw+0.6, bh+0.6);
    }
  }

  // ---- Light only as soft round glows / gradients ----
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const rakeGrad = ctx.createRadialGradient(lightX,lightY,0, w*0.68,h*0.42, maxSide*0.7);
  rakeGrad.addColorStop(0,"rgba(224,180,130,0.10)");
  rakeGrad.addColorStop(0.42,"rgba(150,112,80,0.035)");
  rakeGrad.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle = rakeGrad;
  ctx.fillRect(0,0,w,h);
  // Focus adds a whisper more glow at the (focus-tracking) light: a soft spotlight.
  softGlow(ctx, lightX, lightY, maxSide*0.4, `rgba(232,190,138,${0.045 + foc*0.02})`, "transparent");

  // Chalk bloom: slow, drifting soft light pools. Pulse speed + brightness lift
  // gently with scroll velocity and pointer/interaction energy.
  for (let i=0;i<CFG.blooms.length;i++){
    const bl = CFG.blooms[i];
    const pulse = 0.5+0.5*Math.sin(t*bl.spd*(1+absVel*0.5)+bl.ph);
    const bx = w*bl.x + Math.sin(t*bl.spd*0.7+bl.ph)*minSide*0.02 + px*minSide*0.015;
    const by = h*bl.y + Math.cos(t*bl.spd*0.6+bl.ph)*minSide*0.016 + py*minSide*0.013;
    const rad = minSide*bl.r*(0.9+pulse*0.2);
    const a = (0.024+pulse*0.028)*bl.tint*(1 + bloomEnergy*0.5 + absVel*0.2);
    softGlow(ctx, bx, by, rad, `rgba(228,208,180,${a})`, "transparent");
  }
  ctx.restore();

  // Reading-lane glaze keeps the left column legible (covers the content column).
  const glaze = ctx.createLinearGradient(0,0,w*0.66,0);
  glaze.addColorStop(0,"rgba(10,7,6,0.82)");
  glaze.addColorStop(0.58,"rgba(11,8,7,0.4)");
  glaze.addColorStop(1,"rgba(11,8,7,0)");
  ctx.fillStyle = glaze;
  ctx.fillRect(0,0,w*0.68,h);

  // Vignette pulls focus toward the lit plaster.
  const vig = ctx.createRadialGradient(w*0.66,h*0.44,minSide*0.16, w*0.6,h*0.5,maxSide*0.86);
  vig.addColorStop(0,"rgba(0,0,0,0)");
  vig.addColorStop(0.7,"rgba(4,3,2,0.16)");
  vig.addColorStop(1,"rgba(2,1,1,0.55)");
  ctx.fillStyle = vig;
  ctx.fillRect(0,0,w,h);

  ctx.restore();
};
