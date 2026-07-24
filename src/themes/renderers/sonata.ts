import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { softGlow, star4 } from "../shared/draw";
import { wrapSoft } from "../shared/wrap";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

interface SonataRibbon {
  baseY: number;
  amp: number;
  freq: number;
  phase: number;
  speed: number;
  depth: number;
  hb: number;
  noteCount: number;
}

interface SonataGradientCache {
  ctx: CanvasRenderingContext2D | null;
  w: number;
  h: number;
  wash: CanvasGradient | null;
  vg: CanvasGradient | null;
}

const CFG = (function(){
  const rnd = createSeededRandom(920571);
  const RIB = 7;
  const ribbons = [];
  for (let i=0;i<RIB;i++){
    const depth = i/(RIB-1);
    ribbons.push({
      baseY: 0.15 + i*0.108,
      amp: 0.022 + i*0.004,
      freq: 0.0055 + i*0.0006,
      phase: rnd()*TAU,
      speed: 0.55 + rnd()*0.6,
      depth: depth,
      hb: 0.004 + depth*0.0095,
      noteCount: 3 + (i%3)
    });
  }
  const notes = [];
  for (let i=0;i<RIB;i++){
    const r = ribbons[i];
    for (let n=0;n<r.noteCount;n++){
      notes.push({ ri:i, off: rnd(), spd: 0.024 + rnd()*0.05, size: 0.7 + rnd()*1.1, stem: rnd()>0.35, star: rnd()>0.55 });
    }
  }
  const motes = [];
  for (let i=0;i<90;i++){
    motes.push({ x: rnd(), spd: 0.02 + rnd()*0.06, phase: rnd()*TAU, size: 0.55 + rnd()*1.5, drift: 0.4 + rnd()*1.4, tw: rnd()*TAU, layer: i%3 });
  }
  const bcol = [[232,150,192],[150,112,206],[236,168,150],[126,92,182],[240,120,178]];
  const blooms = [];
  for (let i=0;i<5;i++){
    blooms.push({ x: 0.12+rnd()*0.76, y: 0.18+rnd()*0.62, r: 0.3+rnd()*0.34, drift: rnd()*TAU, spd: 0.04+rnd()*0.07, col: bcol[i] });
  }
  const haze = [];
  for (let i=0;i<20;i++){
    haze.push({ x: rnd(), y: 0.34+rnd()*0.4, r: 0.12+rnd()*0.16, phase: rnd()*TAU, warm: rnd() });
  }
  const dust = [];
  for (let i=0;i<70;i++){
    dust.push({ x: rnd(), y: rnd()*0.96, size: rnd(), tw: rnd()*TAU, layer: i%3 });
  }
  const bars = [];
  for (let i=0;i<14;i++){
    bars.push({ x: rnd(), phase: rnd()*TAU, h: 0.3+rnd()*0.5 });
  }
  return { ribbons, notes, motes, blooms, haze, dust, bars };
})();
const ribY = (x: number, r: SonataRibbon, t: number, h: number, lift: number, ab: number) => {
  const f = r.freq;
  return h*r.baseY + lift*(0.85 - r.depth*0.6)
    + Math.sin(x*f + t*0.62*r.speed + r.phase) * (h*r.amp*ab)
    + Math.sin(x*f*0.42 - t*0.38*r.speed + r.phase*1.6) * (h*r.amp*ab*0.5)
    + Math.sin(x*f*1.9 + t*0.28 + r.phase*0.5) * (h*r.amp*ab*0.2);
};
const ribHB = (x: number, r: SonataRibbon, t: number, h: number) => {
  const tw = Math.abs(Math.sin(x*r.freq*0.7 + t*0.5*r.speed + r.phase*1.3));
  return (h*r.hb) * (0.3 + 0.7*tw);
};
// Cache for the two static full-screen gradients (rebuilt only on ctx/size change).
const GRAD: SonataGradientCache = { ctx:null, w:0, h:0, wash:null, vg:null };

export const renderSonata: ThemeRenderer = (ctx,w,h,t,mx,my)=>{
  const hasStar = typeof star4 === "function";
  const lift = (my-0.5)*h*0.12;
  const ab = 1 + Math.abs(mx-0.5)*0.5;
  const parX = (mx-0.5);
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.globalCompositeOperation = "source-over";

  // Build the static wash + vignette once per size instead of every frame.
  if (GRAD.ctx !== ctx || GRAD.w !== w || GRAD.h !== h){
    GRAD.ctx = ctx; GRAD.w = w; GRAD.h = h;
    const wash = ctx.createLinearGradient(0,0,0,h);
    wash.addColorStop(0,"rgba(46,12,38,0.55)");
    wash.addColorStop(0.42,"rgba(20,7,20,0.40)");
    wash.addColorStop(0.72,"rgba(12,4,13,0.42)");
    wash.addColorStop(1,"rgba(5,1,6,0.64)");
    GRAD.wash = wash;
    const vg = ctx.createRadialGradient(w*0.5, h*0.44, h*0.18, w*0.5, h*0.52, h*0.98);
    vg.addColorStop(0,"rgba(6,2,5,0)");
    vg.addColorStop(0.68,"rgba(5,1,5,0.14)");
    vg.addColorStop(1,"rgba(2,0,3,0.76)");
    GRAD.vg = vg;
  }

  ctx.fillStyle = GRAD.wash!;
  ctx.fillRect(0,0,w,h);

  ctx.globalCompositeOperation = "lighter";

  softGlow(ctx, w*(0.5+parX*0.12), -h*0.12, h*0.88, "rgba(150,70,120,0.30)", "transparent");

  const bloomN = Math.min(4, CFG.blooms.length);
  for (let i=0;i<bloomN;i++){
    const b = CFG.blooms[i];
    const bx = (b.x + Math.sin(t*b.spd + b.drift)*0.05 + parX*0.05*(1+i*0.3))*w;
    const by = (b.y + Math.cos(t*b.spd*0.82 + b.drift)*0.045)*h;
    const pulse = 0.72 + 0.28*Math.sin(t*0.4 + b.drift);
    const c = b.col;
    softGlow(ctx, bx, by, b.r*h, `rgba(${c[0]},${c[1]},${c[2]},${(0.13*pulse).toFixed(3)})`, "transparent");
  }

  const hazeN = Math.min(13, CFG.haze.length);
  for (let i=0;i<hazeN;i++){
    const hz = CFG.haze[i];
    const n = fbm(hz.x*3.1 + t*0.035, hz.phase + t*0.02, 2);
    const a = (0.5 + n*0.5);
    const hx = hz.x*w + Math.sin(t*0.05 + hz.phase)*w*0.02 + parX*w*0.02;
    const hy = hz.y*h + n*h*0.045;
    const warm = hz.warm;
    const cr = (210 + warm*40)|0, cg = (120 + warm*40)|0, cb = (170 - warm*30)|0;
    softGlow(ctx, hx, hy, hz.r*h, `rgba(${cr},${cg},${cb},${(0.016 + a*0.045).toFixed(3)})`, "transparent");
  }

  const dustN = Math.min(54, CFG.dust.length);
  for (let i=0;i<dustN;i++){
    const d = CFG.dust[i];
    const tw = 0.4 + 0.6*Math.sin(t*(0.5 + d.size*0.8) + d.tw);
    const par = parX*(3 + d.layer*7);
    const x = d.x*w + par + Math.sin(t*0.06 + d.tw)*3;
    const y = d.y*h + (my-0.5)*(2 + d.layer*5);
    const a = (0.04 + d.size*0.13)*tw;
    if (a > 0.01){
      ctx.beginPath();
      ctx.arc(x, y, 0.5 + d.size*1.3, 0, TAU);
      ctx.fillStyle = `rgba(255,222,234,${a.toFixed(3)})`;
      ctx.fill();
      if (d.size > 0.86 && tw > 0.82 && hasStar){
        star4(ctx, x, y, 5 + d.size*7, 0.9, `rgba(255,228,240,${(a*0.6).toFixed(3)})`);
      }
    }
  }

  const barN = Math.min(10, CFG.bars.length);
  for (let i=0;i<barN;i++){
    const bl = CFG.bars[i];
    const bx = bl.x*w + Math.sin(t*0.04 + bl.phase)*w*0.01 + parX*w*0.015;
    const a = 0.02 + 0.02*(0.5+0.5*Math.sin(t*0.5 + bl.phase));
    const g = ctx.createLinearGradient(bx, h*(0.5-bl.h*0.5), bx, h*(0.5+bl.h*0.5));
    g.addColorStop(0,"rgba(232,166,197,0)");
    g.addColorStop(0.5,`rgba(232,166,197,${a.toFixed(3)})`);
    g.addColorStop(1,"rgba(232,166,197,0)");
    ctx.strokeStyle = g;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx, h*(0.5-bl.h*0.5));
    ctx.lineTo(bx, h*(0.5+bl.h*0.5));
    ctx.stroke();
  }

  const step = Math.max(22, w/80);
  for (let ri=0; ri<CFG.ribbons.length; ri++){
    const r = CFG.ribbons[ri];
    const pts = [];
    for (let x = -step; x <= w+step; x += step){
      pts.push({ x:x, y:ribY(x,r,t,h,lift,ab), hb:ribHB(x,r,t,h) });
    }
    const np = pts.length;

    ctx.globalCompositeOperation = "lighter";
    ctx.beginPath();
    for (let k=0;k<np;k++){ if(k===0)ctx.moveTo(pts[k].x,pts[k].y);else ctx.lineTo(pts[k].x,pts[k].y); }
    ctx.strokeStyle = `rgba(232,150,192,${(0.05 + r.depth*0.06).toFixed(3)})`;
    ctx.lineWidth = (h*r.hb)*3 + 3;
    ctx.stroke();

    ctx.globalCompositeOperation = "source-over";
    ctx.beginPath();
    for (let k=0;k<np;k++){ const p=pts[k]; if(k===0)ctx.moveTo(p.x,p.y-p.hb);else ctx.lineTo(p.x,p.y-p.hb); }
    for (let k=np-1;k>=0;k--){ const p=pts[k]; ctx.lineTo(p.x,p.y+p.hb); }
    ctx.closePath();
    const ba = 0.12 + r.depth*0.17;
    const sh = t*0.02*r.speed + r.phase*0.16;
    const bg = ctx.createLinearGradient(0,0,w,0);
    bg.addColorStop(0, `rgba(190,100,150,${(ba*0.65).toFixed(3)})`);
    bg.addColorStop(Math.max(0.02,0.28+0.05*Math.sin(sh)), `rgba(236,168,204,${ba.toFixed(3)})`);
    bg.addColorStop(0.5, `rgba(252,222,214,${Math.min(0.60,ba*1.1).toFixed(3)})`);
    bg.addColorStop(Math.min(0.98,0.72+0.05*Math.sin(sh+1.6)), `rgba(236,168,204,${ba.toFixed(3)})`);
    bg.addColorStop(1, `rgba(190,100,150,${(ba*0.65).toFixed(3)})`);
    ctx.fillStyle = bg;
    ctx.fill();

    ctx.beginPath();
    for (let k=0;k<np;k++){ const p=pts[k]; if(k===0)ctx.moveTo(p.x,p.y+p.hb);else ctx.lineTo(p.x,p.y+p.hb); }
    ctx.strokeStyle = `rgba(30,6,24,${(0.14 + r.depth*0.14).toFixed(3)})`;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.globalCompositeOperation = "lighter";
    ctx.beginPath();
    for (let k=0;k<np;k++){ const p=pts[k]; if(k===0)ctx.moveTo(p.x,p.y-p.hb*0.55);else ctx.lineTo(p.x,p.y-p.hb*0.55); }
    ctx.strokeStyle = `rgba(255,240,230,${(0.08 + r.depth*0.12).toFixed(3)})`;
    ctx.lineWidth = 1 + r.depth*0.8;
    ctx.stroke();

    const gp = Math.sin(t*0.13*r.speed + r.phase)*0.5+0.5;
    const gx = gp*w;
    softGlow(ctx, gx, ribY(gx,r,t,h,lift,ab), 24 + r.depth*26, `rgba(255,235,224,${(0.08+r.depth*0.10).toFixed(3)})`, "transparent");
  }

  ctx.globalCompositeOperation = "lighter";
  for (let i=0;i<CFG.notes.length;i++){
    if (i % 3 === 2) continue;
    const nt = CFG.notes[i];
    const r = CFG.ribbons[nt.ri];
    // soft wrap: fade the note out near the x seam instead of teleporting right->left
    const wr = wrapSoft(t*nt.spd + nt.off, 1, 0.05);
    const x = wr.u*w;
    const y = ribY(x,r,t,h,lift,ab);
    const sz = nt.size;
    const pulse = (0.78 + 0.22*Math.sin(t*2.2 + nt.off*TAU)) * wr.alpha;

    const tlen = 34 + sz*22;
    const tg = ctx.createLinearGradient(x, y, x - tlen, ribY(x-tlen,r,t,h,lift,ab));
    tg.addColorStop(0, `rgba(255,214,224,${(0.2*pulse).toFixed(3)})`);
    tg.addColorStop(1, "rgba(255,214,224,0)");
    ctx.strokeStyle = tg;
    ctx.lineWidth = 1.4 + sz*1.4;
    ctx.beginPath();
    for (let s=0;s<=7;s++){
      const tx = x - (s/7)*tlen;
      if(s===0)ctx.moveTo(tx,ribY(tx,r,t,h,lift,ab));else ctx.lineTo(tx,ribY(tx,r,t,h,lift,ab));
    }
    ctx.stroke();

    softGlow(ctx, x, y, 9 + sz*11, `rgba(255,198,214,${(0.13*pulse).toFixed(3)})`, "transparent");

    if (nt.stem){
      ctx.strokeStyle = `rgba(255,232,220,${(0.18*pulse).toFixed(3)})`;
      ctx.lineWidth = 1.1;
      const sx = x + 1.6 + sz*1.4;
      const sy = y - 12 - sz*6;
      ctx.beginPath();
      ctx.moveTo(sx, y - sz);
      ctx.lineTo(sx, sy);
      ctx.quadraticCurveTo(sx + 6, sy + 3, sx + 3, sy + 10);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(x, y, 1.3 + sz*1.3, 0, TAU);
    ctx.fillStyle = `rgba(255,240,228,${(0.60*pulse).toFixed(3)})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 0.7 + sz*0.6, 0, TAU);
    ctx.fillStyle = `rgba(255,248,238,${(0.55*wr.alpha).toFixed(3)})`;
    ctx.fill();

    if (nt.star && hasStar){
      star4(ctx, x, y, 10 + sz*10, 1.1, `rgba(255,224,236,${(0.28*pulse).toFixed(3)})`);
    }
  }

  const moteN = Math.min(72, CFG.motes.length);
  for (let i=0;i<moteN;i++){
    const m = CFG.motes[i];
    const prog = (t*m.spd + m.phase*0.159) % 1;
    const y = h*0.99 - prog*h*1.04;
    const drift = Math.sin(t*0.3 + m.tw)*m.drift*18;
    const par = parX*(5 + m.layer*10);
    const x = m.x*w + drift + par;
    const tw = 0.4 + 0.6*Math.sin(t*(0.7 + m.size*0.5) + m.tw);
    const a = (1-prog)*tw*(0.09 + m.size*0.1);
    if (a > 0.008){
      ctx.beginPath();
      ctx.arc(x, y, 0.6 + m.size*1.3, 0, TAU);
      ctx.fillStyle = `rgba(255,212,224,${a.toFixed(3)})`;
      ctx.fill();
      if (m.size > 1.25 && tw > 0.75 && hasStar){
        star4(ctx, x, y, 5 + m.size*6, 0.8, `rgba(255,226,238,${(a*0.6).toFixed(3)})`);
      }
    }
  }

  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = GRAD.vg!;
  ctx.fillRect(0,0,w,h);

  ctx.restore();
};
