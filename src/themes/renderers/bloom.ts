import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { finiteClamp, resolveThemeMotion } from "../shared/motion";
import { star4 } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

const CFG = (function(){
  const rnd = createSeededRandom(0x2a17b3);
  const R = (a:number,b:number)=> a + (b-a)*rnd();
  const T2 = Math.PI*2;
  const hsl2rgb = (h:number,s:number,l:number): [number,number,number]=>{
    h=((h%360)+360)%360/360; s/=100; l/=100;
    const q = l < 0.5 ? l*(1+s) : l+s-l*s;
    const p = 2*l-q;
    const hue2 = (tc:number)=>{
      if(tc<0)tc+=1; if(tc>1)tc-=1;
      if(tc<1/6) return p+(q-p)*6*tc;
      if(tc<1/2) return q;
      if(tc<2/3) return p+(q-p)*(2/3-tc)*6;
      return p;
    };
    return [Math.round(hue2(h+1/3)*255), Math.round(hue2(h)*255), Math.round(hue2(h-1/3)*255)];
  };

  const masses = [
    {c:[150,70,205], x:0.22, y:0.32, r:0.56, a:0.15, drift:0.028, pulse:0.16, phase:R(0,T2), par:0.03},
    {c:[214,92,178], x:0.80, y:0.24, r:0.50, a:0.13, drift:0.034, pulse:0.13, phase:R(0,T2), par:0.04},
    {c:[226,163,242],x:0.52, y:0.58, r:0.62, a:0.10, drift:0.022, pulse:0.11, phase:R(0,T2), par:0.02},
    {c:[112,62,184], x:0.14, y:0.82, r:0.52, a:0.12, drift:0.030, pulse:0.15, phase:R(0,T2), par:0.05},
    {c:[236,156,98], x:0.86, y:0.78, r:0.40, a:0.075,drift:0.026, pulse:0.12, phase:R(0,T2), par:0.04},
    {c:[86,54,158],  x:0.56, y:0.12, r:0.46, a:0.10, drift:0.020, pulse:0.10, phase:R(0,T2), par:0.02}
  ];

  const mistColors = [[180,120,210],[210,140,190],[150,90,200],[226,163,242],[200,120,160]];
  const mist = [];
  for(let i=0;i<6;i++){
    mist.push({
      x:R(0.05,0.95), y:R(0.05,0.95), r:R(0.18,0.4),
      a:R(0.04,0.085), sp:R(0.05,0.16), ph:R(0,T2),
      c: mistColors[i % mistColors.length]
    });
  }

  const layers = [
    {count:5, depth:0.32, smin:16, smax:30, alpha:0.42},
    {count:4, depth:0.62, smin:30, smax:52, alpha:0.70},
    {count:3, depth:1.00, smin:50, smax:86, alpha:0.94}
  ];
  const flowers = [];
  for(let li=0; li<layers.length; li++){
    const L = layers[li];
    for(let i=0;i<L.count;i++){
      const hue = 275 + rnd()*66;
      const sat = 56 + rnd()*34;
      flowers.push({
        depth:L.depth, alpha:L.alpha,
        x:R(0.05,0.95), y:R(0.07,0.95),
        size:R(L.smin,L.smax),
        petals: 5 + Math.floor(rnd()*4),
        hue: hue, sat: sat,
        speed: 0.10 + rnd()*0.28,
        spin: (rnd()-0.5)*0.05,
        phase: rnd()*T2,
        halo: hsl2rgb(hue, 80, 62)
      });
    }
  }
  flowers.sort((a,b)=> a.depth - b.depth);

  const pollen = [];
  for(let i=0;i<90;i++){
    const br = rnd();
    pollen.push({
      x:rnd(), y:rnd(),
      speed:0.012 + rnd()*0.05,
      drift: R(6,30), dsp: R(0.3,1.1), ph: rnd()*T2,
      r: R(0.6,2.6), depth: R(0.3,1),
      tw: R(0.5,1.6), a: R(0.3,0.68),
      warm: rnd()>0.5,
      glow: br>0.82, spike: br>0.94
    });
  }

  return { masses, mist, flowers, pollen };
})();

const buildBloomCache = (ctx:CanvasRenderingContext2D, w:number, h:number) => {
  const diag = Math.hypot(w, h) || 1;
  const cx = w*0.5, cy = h*0.5;
  const mk = (col:readonly number[]) => {
    const g = ctx.createRadialGradient(0,0,0,0,0,1);
    g.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},1)`);
    g.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
    return g;
  };
  const masses = CFG.masses.map(m => mk(m.c));
  const mist = CFG.mist.map(q => mk(q.c));
  const halos = CFG.flowers.map(f => mk(f.halo));
  const center = ctx.createRadialGradient(0,0,0,0,0,1);
  center.addColorStop(0, "rgba(255,236,180,1)");
  center.addColorStop(0.4, "rgba(255,205,96,0.78)");
  center.addColorStop(1, "rgba(220,110,40,0)");
  const pollenGlow = ctx.createRadialGradient(0,0,0,0,0,1);
  pollenGlow.addColorStop(0, "rgba(255,222,120,1)");
  pollenGlow.addColorStop(1, "rgba(255,222,120,0)");
  const mouse = mk([226,163,242]);
  const wb = ctx.createRadialGradient(0,0,0,0,0,1);
  wb.addColorStop(0, "rgba(232,172,236,0.07)");
  wb.addColorStop(0.5, "rgba(150,80,160,0.03)");
  wb.addColorStop(1, "rgba(0,0,0,0)");
  const base = ctx.createLinearGradient(0,0,0,h);
  base.addColorStop(0, "rgba(3,1,9,0.55)");
  base.addColorStop(0.42, "rgba(5,2,12,0.12)");
  base.addColorStop(1, "rgba(2,1,7,0.5)");
  const scrimC = ctx.createRadialGradient(w*0.42, h*0.44, 0, w*0.42, h*0.44, diag*0.55);
  scrimC.addColorStop(0, "rgba(4,2,10,0.14)");
  scrimC.addColorStop(0.55, "rgba(4,2,10,0.05)");
  scrimC.addColorStop(1, "rgba(0,0,0,0)");
  const vig = ctx.createRadialGradient(cx, cy, h*0.15, cx, cy, diag*0.62);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(0.7, "rgba(6,2,14,0.28)");
  vig.addColorStop(1, "rgba(4,1,10,0.72)");
  const bottom = ctx.createLinearGradient(0, h, 0, h*0.6);
  bottom.addColorStop(0, "rgba(60,20,50,0.16)");
  bottom.addColorStop(1, "rgba(0,0,0,0)");
  return { w, h, masses, mist, halos, center, pollenGlow, mouse, wb, base, scrimC, vig, bottom };
};

let bloomCache: ReturnType<typeof buildBloomCache> | null = null;
let bloomCacheContext: CanvasRenderingContext2D | null = null;

export const renderBloom: ThemeRenderer = (ctx,w,h,t,mx,my,_deltaSeconds,motion)=>{
  if(!(w>0)||!(h>0)) return;
  // Uniform motion contract: resolve the page-motion model once. This theme's
  // preserved composition takes no page-motion nuance, so only reducedMotion
  // (frozen time) is consumed from the context.
  resolveThemeMotion(motion);
  const reduced = !!(motion && motion.reducedMotion);
  const cx = w*0.5;
  const diag = Math.hypot(w,h) || 1;
  const tt = reduced ? 0 : finiteClamp(t, -1e12, 1e12, 0);
  const pmx = finiteClamp(mx, 0, 1, 0.5);
  const pmy = finiteClamp(my, 0, 1, 0.5);
  const px = pmx - 0.5, py = pmy - 0.5;

  let C = bloomCache;
  if(!C || bloomCacheContext !== ctx || C.w !== w || C.h !== h){
    C = buildBloomCache(ctx, w, h);
    bloomCache = C;
    bloomCacheContext = ctx;
  }

  const paintGlow = (grad:CanvasGradient,x:number,y:number,r:number,a:number)=>{
    if(!(r>0)||!(a>0)) return;
    ctx.save();
    ctx.globalAlpha = a>1?1:a;
    ctx.translate(x,y);
    ctx.scale(r,r);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0,0,1,0,TAU);
    ctx.fill();
    ctx.restore();
  };

  const rzx = w*0.42, rzy = h*0.44, rzrx = w*0.42, rzry = h*0.40;
  const leg = (x:number,y:number)=>{
    const nx=(x-rzx)/rzrx, ny=(y-rzy)/rzry;
    const d=Math.sqrt(nx*nx+ny*ny);
    return 0.6 + 0.4*(d<1?d:1);
  };

  const wrap01 = (v:number) => { v = v % 1; return v < 0 ? v + 1 : v; };
  const drawPetal = (len:number,wid:number) => {
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.bezierCurveTo(wid, -len*0.30, wid*0.72, -len*0.82, 0, -len);
    ctx.bezierCurveTo(-wid*0.72, -len*0.82, -wid, -len*0.30, 0, 0);
    ctx.closePath();
  };

  // Semi-transparent dark base (deepens top/bottom for a near-black backdrop; not a full opaque repaint)
  ctx.fillStyle = C.base;
  ctx.fillRect(0,0,w,h);

  // 1. Atmospheric colour masses (additive, cached gradients)
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for(let i=0;i<CFG.masses.length;i++){
    const m = CFG.masses[i];
    const dx = Math.sin(tt*m.drift + m.phase)*0.06;
    const dy = Math.cos(tt*m.drift*0.8 + m.phase*1.3)*0.05;
    const gx = (m.x + dx - px*m.par)*w;
    const gy = (m.y + dy - py*m.par)*h;
    const pulse = 0.6 + 0.4*Math.sin(tt*m.pulse + m.phase);
    paintGlow(C.masses[i], gx, gy, m.r*diag, m.a*pulse);
  }
  ctx.restore();

  // 2. fbm mist (additive, cached gradients)
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for(let i=0;i<CFG.mist.length;i++){
    const q = CFG.mist[i];
    const qx = (q.x - px*0.04)*w + Math.sin(tt*q.sp + q.ph)*w*0.02;
    const qy = (q.y - py*0.04)*h + Math.cos(tt*q.sp*0.7 + q.ph)*h*0.015;
    const n = fbm(q.x*3 + tt*0.03, q.y*3 - tt*0.02, 3);
    const a = q.a*(0.35 + 0.5*(0.5 + 0.5*n));
    paintGlow(C.mist[i], qx, qy, q.r*diag, a);
  }
  ctx.restore();

  // 3. Flowers (far -> near); leg() dims additive brights in the reading column
  const fl = CFG.flowers;
  for(let i=0;i<fl.length;i++){
    const f = fl[i];
    const depth = f.depth;
    const sway = Math.sin(tt*0.18 + f.phase)*(6 + 8*depth);
    const bob = Math.cos(tt*0.13 + f.phase*1.4)*(4 + 6*depth);
    const fx = f.x*w + sway - px*depth*46;
    const fy = f.y*h + bob - py*depth*46;
    const bd = Math.hypot(pmx*w - fx, pmy*h - fy);
    const boost = bd < 260 ? 1 + (1 - bd/260)*1.2 : 1;
    const bloom = 0.5 + 0.5*Math.sin(tt*f.speed*boost + f.phase);
    const size = f.size*(0.6 + 0.52*bloom);
    const spin = f.spin*tt;
    const near = depth >= 0.9;
    const mid = depth >= 0.62;
    const hue = f.hue, sat = f.sat;
    const lz = leg(fx, fy);

    // halo (additive, cached)
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const ha = (0.05 + 0.08*bloom)*(0.5 + 0.5*depth)*lz;
    paintGlow(C.halos[i], fx, fy, size*2.6, ha);
    ctx.restore();

    // outer petals (source-over; peak lightness trimmed)
    const lenO = size*1.16, widO = size*0.44;
    const gO = ctx.createLinearGradient(0,0,0,-lenO);
    gO.addColorStop(0, `hsla(${hue+10}, ${sat}%, ${36+bloom*13}%, ${f.alpha})`);
    gO.addColorStop(0.5, `hsla(${hue}, ${sat}%, ${45+bloom*11}%, ${f.alpha})`);
    gO.addColorStop(1, `hsla(${hue-16}, ${Math.max(20,sat-14)}%, ${20+bloom*7}%, ${f.alpha*0.55})`);
    const pc = f.petals;
    for(let p=0;p<pc;p++){
      const ang = (p/pc)*TAU + spin;
      ctx.save();
      ctx.translate(fx,fy);
      ctx.rotate(ang);
      ctx.fillStyle = gO;
      drawPetal(lenO, widO);
      ctx.fill();
      if(near){
        ctx.strokeStyle = `hsla(${hue+22}, 78%, 72%, ${(0.04 + 0.09*bloom)*lz})`;
        ctx.lineWidth = size*0.02;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -lenO*0.08);
        ctx.quadraticCurveTo(widO*0.14, -lenO*0.52, 0, -lenO*0.92);
        ctx.strokeStyle = `hsla(${hue+30}, 76%, 78%, ${(0.03 + 0.07*bloom)*lz})`;
        ctx.lineWidth = size*0.012;
        ctx.stroke();
      }
      ctx.restore();
    }

    // mid petals
    const lenM = size*0.78, widM = size*0.32;
    const gM = ctx.createLinearGradient(0,0,0,-lenM);
    gM.addColorStop(0, `hsla(${hue+18}, ${Math.min(100,sat+12)}%, ${50+bloom*12}%, ${Math.min(1,f.alpha+0.05)})`);
    gM.addColorStop(0.5, `hsla(${hue+6}, ${sat}%, ${55+bloom*10}%, ${f.alpha})`);
    gM.addColorStop(1, `hsla(${hue-8}, ${sat}%, ${29+bloom*7}%, ${f.alpha*0.6})`);
    for(let p=0;p<pc;p++){
      const ang = (p/pc)*TAU + Math.PI/pc + spin*1.3;
      ctx.save();
      ctx.translate(fx,fy);
      ctx.rotate(ang);
      ctx.fillStyle = gM;
      drawPetal(lenM, widM);
      ctx.fill();
      if(near){
        ctx.strokeStyle = `hsla(${hue+26}, 80%, 74%, ${(0.05 + 0.09*bloom)*lz})`;
        ctx.lineWidth = size*0.016;
        ctx.stroke();
      }
      ctx.restore();
    }

    // center + stamens + sparkle (additive; peak brightness clamped so bright-pass bloom stays warm, not white)
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const shimmer = 0.85 + 0.15*fbm(f.x*5, f.y*5 + tt*0.15, 2);
    const cr = size*0.4;
    const cb = Math.min(0.5, (0.5*bloom + 0.12)*shimmer) * lz;
    paintGlow(C.center, fx, fy, cr, cb);
    if(mid){
      const dots = pc;
      const rr = cr*0.52;
      const da0 = tt*0.2 + f.phase;
      const dotA = (0.3 + 0.35*bloom) * lz;
      ctx.fillStyle = "rgba(255,206,120,1)";
      for(let d=0;d<dots;d++){
        const da = (d/dots)*TAU + da0;
        ctx.globalAlpha = dotA>1?1:dotA;
        ctx.beginPath();
        ctx.arc(fx + Math.cos(da)*rr, fy + Math.sin(da)*rr, Math.max(0.6, size*0.03), 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if(near){
      star4(ctx, fx, fy, size*(0.6 + 0.5*bloom), size*0.05, `rgba(255,232,180,${(0.06 + 0.12*bloom)*lz})`);
    }
    ctx.restore();
  }

  // 4. Pollen (golden, drifting upward, additive; capped)
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for(let i=0;i<CFG.pollen.length;i++){
    const p = CFG.pollen[i];
    const yv = wrap01(p.y - tt*p.speed);
    const edge = Math.max(0, Math.min(1, yv*5, (1 - yv)*5));
    if(edge <= 0) continue;
    const yy = yv*(h + 80) - 40;
    const xx = p.x*w + Math.sin(tt*p.dsp + p.ph)*p.drift - px*p.depth*30;
    const lz = leg(xx, yy);
    const tw = 0.35 + 0.65*(0.5 + 0.5*Math.sin(tt*p.tw + p.ph*2.3));
    const aa = p.a*tw*edge*lz;
    const rr = p.r*(0.6 + 0.7*p.depth);
    if(p.glow){
      paintGlow(C.pollenGlow, xx, yy, rr*5, aa*0.4);
    }
    ctx.globalAlpha = aa>1?1:aa;
    ctx.fillStyle = p.warm ? "rgba(255,226,120,1)" : "rgba(255,206,150,1)";
    ctx.beginPath();
    ctx.arc(xx, yy, rr, 0, TAU);
    ctx.fill();
    if(p.spike){
      ctx.globalAlpha = 1;
      star4(ctx, xx, yy, rr*5, rr*0.5, `rgba(255,240,190,${Math.min(0.6, aa*0.7)})`);
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // 5. Colour grade + mouse glow (additive, cached; wash reduced over the text zone)
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const wbPulse = 0.8 + 0.2*(0.5 + 0.5*Math.sin(tt*0.2));
  paintGlow(C.wb, cx, h*0.42, diag*0.6, wbPulse);
  paintGlow(C.mouse, pmx*w, pmy*h, diag*0.16, 0.05);
  ctx.restore();

  // 6. Legibility centre scrim (source-over dark, caps cumulative additive brightness in reading column)
  ctx.fillStyle = C.scrimC;
  ctx.fillRect(0,0,w,h);

  // 7. Vignette
  ctx.fillStyle = C.vig;
  ctx.fillRect(0,0,w,h);

  // 8. Bottom scrim
  ctx.fillStyle = C.bottom;
  ctx.fillRect(0, h*0.6, w, h*0.4);
};
