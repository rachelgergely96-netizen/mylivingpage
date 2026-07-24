import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { softGlow } from "../shared/draw";
import { wrapSoft } from "../shared/wrap";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

const CFG = (function () {
  const rnd = createSeededRandom(70417);
  const stars = [];
  for (let i = 0; i < 66; i++) {
    stars.push({
      x: rnd(),
      y: rnd() * rnd(),
      r: 0.4 + rnd() * 1.3,
      ph: rnd() * TAU,
      sp: 0.5 + rnd() * 1.6,
      bright: rnd(),
      hue: 32 + rnd() * 22,
    });
  }
  const motes = [];
  const layerDefs = [
    { n: 26, depth: 0.4, s0: 0.5, s1: 1.3, drift: 6, alpha: 0.30 },
    { n: 24, depth: 0.68, s0: 1.0, s1: 2.2, drift: 11, alpha: 0.44 },
    { n: 18, depth: 1.0, s0: 1.8, s1: 3.6, drift: 18, alpha: 0.58 },
  ];
  for (let li = 0; li < layerDefs.length; li++) {
    const L = layerDefs[li];
    for (let i = 0; i < L.n; i++) {
      motes.push({
        depth: L.depth,
        bx: rnd(),
        by: 0.1 + rnd() * 0.85,
        sz: L.s0 + rnd() * (L.s1 - L.s0),
        ph: rnd() * TAU,
        sp: 0.6 + rnd() * 1.2,
        drift: L.drift * (0.6 + rnd() * 0.8),
        bob: 12 + rnd() * 30,
        alpha: L.alpha,
        hue: 350 + rnd() * 44,
        spark: rnd(),
      });
    }
  }
  const clouds = [];
  for (let i = 0; i < 7; i++) {
    clouds.push({
      y: 0.30 + rnd() * 0.42,
      w: 170 + rnd() * 260,
      h: 16 + rnd() * 30,
      sp: (5 + rnd() * 12) * (rnd() < 0.5 ? 1 : 0.65),
      off: rnd(),
      seed: rnd() * 100,
      op: 0.10 + rnd() * 0.12,
    });
  }
  const shimmer = [];
  for (let i = 0; i < 22; i++) {
    shimmer.push({ y: rnd(), w: 0.4 + rnd() * 0.7, ph: rnd() * TAU, sp: 0.5 + rnd() * 1.6, hp: rnd() });
  }
  return { stars, motes, clouds, shimmer };
})();

const GRAD: {
  w: number;
  h: number;
  sky: CanvasGradient | null;
  hb: CanvasGradient | null;
  haze: CanvasGradient | null;
  water: CanvasGradient | null;
  glit: CanvasGradient | null;
  vig: CanvasGradient | null;
} = { w: -1, h: -1, sky: null, hb: null, haze: null, water: null, glit: null, vig: null };

export const renderDusk: ThemeRenderer = (
  ctx,
  w,
  h,
  time,
  mx,
  my,
  _deltaSeconds,
  motion,
) => {
  const t = motion?.reducedMotion ? 0 : time;
  const clamp=(v:number,a:number,b:number)=> v<a?a:(v>b?b:v);
  const hy = h*0.60;
  const px = mx-0.5, py = my-0.5;

  // cache static full-screen gradients (rebuild only on resize) — kills ~6 large allocs/frame
  if(GRAD.w!==w || GRAD.h!==h){
    GRAD.w=w; GRAD.h=h;
    const sky=ctx.createLinearGradient(0,0,0,hy);
    sky.addColorStop(0.00,"hsla(288,55%,8%,0.55)");
    sky.addColorStop(0.45,"hsla(320,50%,12%,0.40)");
    sky.addColorStop(0.78,"hsla(350,55%,20%,0.32)");
    sky.addColorStop(1.00,"hsla(28,72%,32%,0.40)");
    GRAD.sky=sky;
    const hb=ctx.createLinearGradient(0,hy-h*0.24,0,hy);
    hb.addColorStop(0,"transparent");
    hb.addColorStop(0.6,"hsla(15,88%,45%,0.07)");
    hb.addColorStop(1,"hsla(38,92%,55%,0.14)");
    GRAD.hb=hb;
    const haze=ctx.createLinearGradient(0,hy-h*0.06,0,hy+h*0.04);
    haze.addColorStop(0,"transparent");
    haze.addColorStop(0.5,"hsla(30,85%,50%,0.07)");
    haze.addColorStop(1,"transparent");
    GRAD.haze=haze;
    const water=ctx.createLinearGradient(0,hy,0,h);
    water.addColorStop(0,"hsla(28,70%,30%,0.30)");
    water.addColorStop(0.18,"hsla(350,50%,18%,0.24)");
    water.addColorStop(0.55,"hsla(310,45%,10%,0.30)");
    water.addColorStop(1,"hsla(285,55%,6%,0.50)");
    GRAD.water=water;
    const glit=ctx.createLinearGradient(0,hy,0,h);
    glit.addColorStop(0,"hsla(34,90%,55%,0.10)");
    glit.addColorStop(1,"transparent");
    GRAD.glit=glit;
    const vig=ctx.createRadialGradient(w*0.5,h*0.52,Math.min(w,h)*0.2,w*0.5,h*0.5,Math.max(w,h)*0.75);
    vig.addColorStop(0,"transparent");
    vig.addColorStop(1,"hsla(285,60%,3%,0.55)");
    GRAD.vig=vig;
  }

  // sun nudged to the upper-right corner, clear of the centre + upper-left reading column
  const sunX = w*(0.62 + Math.sin(t*0.045)*0.04) + px*50;
  const sunY = h*0.32 + Math.sin(t*0.03)*h*0.010 + py*22;

  // 1. sky wash + horizon glow band
  ctx.fillStyle=GRAD.sky!;
  ctx.fillRect(0,0,w,hy+2);
  ctx.globalCompositeOperation="lighter";
  ctx.fillStyle=GRAD.hb!;
  ctx.fillRect(0,hy-h*0.24,w,h*0.24+2);

  // 2. atmospheric colour masses (soft round blooms only)
  const masses=[[345,0.25],[18,0.5],[300,0.75]];
  for(let i=0;i<3;i++){
    const ax=w*(0.22+0.27*i)+Math.sin(t*0.02+i*2)*w*0.06;
    const ay=hy*(0.30+0.2*i)+Math.cos(t*0.017+i)*h*0.02;
    softGlow(ctx,ax,ay,w*(0.24-i*0.03),"hsla("+masses[i][0]+",70%,40%,0.07)","transparent");
  }
  ctx.globalCompositeOperation="source-over";

  // 3. stars (round; bright ones get a soft round halo, no spikes)
  ctx.globalCompositeOperation="lighter";
  for(const s of CFG.stars){
    const sy = s.y*hy*0.92;
    const fade = clamp(1 - sy/(hy*0.82),0,1);
    if(fade<=0.02) continue;
    const tw = 0.35 + 0.65*Math.sin(t*s.sp + s.ph);
    const a = tw*0.5*fade;
    if(a<=0.01) continue;
    const sx = s.x*w - px*22*(0.3+s.r*0.2);
    if(s.bright>0.82){
      softGlow(ctx,sx,sy,s.r*3.2*(0.7+0.5*tw),"hsla("+s.hue+",70%,88%,"+(a*0.4)+")","transparent");
    }
    ctx.beginPath();
    ctx.arc(sx,sy,s.r*0.8,0,TAU);
    ctx.fillStyle="hsla("+s.hue+",55%,86%,"+a+")";
    ctx.fill();
  }
  ctx.globalCompositeOperation="source-over";

  // 4. drifting sunset bands (lower additive alpha to keep central contrast)
  ctx.globalCompositeOperation="lighter";
  const bh=[40,22,356,332,302], bs=[88,84,70,62,55], bl=[54,48,44,38,32];
  const step=Math.max(30,w/34);
  for(let i=0;i<5;i++){
    const cy=hy-(i*0.145+0.14)*hy;
    const thk=hy*0.14;
    const amp=10+i*4;
    const drift=t*(0.05+i*0.012);
    const hue=bh[i]+Math.sin(t*0.1+i)*6;
    ctx.beginPath();
    ctx.moveTo(0,cy-thk*0.5);
    for(let x=0;x<=w;x+=step){
      ctx.lineTo(x, cy-thk*0.5 + fbm(x*0.0016+drift,i*3.7,2)*amp);
    }
    for(let x=w;x>=0;x-=step){
      ctx.lineTo(x, cy+thk*0.5 + fbm(x*0.0016+drift+40,i*3.7+9,2)*amp*0.8);
    }
    ctx.closePath();
    const g=ctx.createLinearGradient(0,cy-thk*0.6,0,cy+thk*0.6);
    g.addColorStop(0,"hsla("+hue+","+bs[i]+"%,"+bl[i]+"%,0)");
    g.addColorStop(0.5,"hsla("+hue+","+bs[i]+"%,"+bl[i]+"%,0.10)");
    g.addColorStop(1,"hsla("+hue+","+bs[i]+"%,"+bl[i]+"%,0)");
    ctx.fillStyle=g;
    ctx.fill();
  }
  ctx.globalCompositeOperation="source-over";

  // 5. sun: soft volumetric bloom + disc ONLY, capped so the bright-pass bloom can't clip to white
  ctx.globalCompositeOperation="lighter";
  const breathe=0.97+0.03*Math.sin(t*0.22);
  softGlow(ctx,sunX,sunY,w*0.30*breathe,"hsla(30,88%,52%,0.035)","transparent");
  const sunR=w*0.028;
  softGlow(ctx,sunX,sunY,sunR*2.8,"hsla(34,96%,60%,0.10)","transparent");
  const disc=ctx.createRadialGradient(sunX,sunY,0,sunX,sunY,sunR);
  disc.addColorStop(0,"hsla(45,95%,80%,0.58)");
  disc.addColorStop(0.55,"hsla(36,98%,66%,0.44)");
  disc.addColorStop(1,"hsla(24,96%,56%,0)");
  ctx.fillStyle=disc;
  ctx.beginPath();
  ctx.arc(sunX,sunY,sunR,0,TAU);
  ctx.fill();
  ctx.globalCompositeOperation="source-over";

  // 6. clouds (bodies then warm underlight)
  for(const c of CFG.clouds){
    const cw=c.w;
    const span=w+cw*2;
    const cx=((c.off*span + t*c.sp)%span+span)%span - cw;
    const cyc=c.y*hy + Math.sin(t*0.08+c.seed)*6;
    const ch=c.h;
    const cstep=Math.max(10,cw/13);
    ctx.beginPath();
    ctx.moveTo(cx,cyc);
    for(let x=0;x<=cw;x+=cstep){
      const env=Math.sin((x/cw)*Math.PI);
      const n=fbm(x*0.02+c.seed,t*0.03+c.seed,2);
      ctx.lineTo(cx+x, cyc-env*ch*(0.8+0.5*n));
    }
    for(let x=cw;x>=0;x-=cstep){
      const env=Math.sin((x/cw)*Math.PI);
      ctx.lineTo(cx+x, cyc+env*ch*0.28);
    }
    ctx.closePath();
    ctx.fillStyle="hsla(295,45%,10%,"+c.op+")";
    ctx.fill();
  }
  ctx.globalCompositeOperation="lighter";
  for(const c of CFG.clouds){
    const cw=c.w;
    const span=w+cw*2;
    const cx=((c.off*span + t*c.sp)%span+span)%span - cw;
    const cyc=c.y*hy + Math.sin(t*0.08+c.seed)*6;
    softGlow(ctx,cx+cw*0.5,cyc+c.h*0.2,cw*0.5,"hsla(30,90%,55%,"+(c.op*0.45)+")","transparent");
  }
  ctx.globalCompositeOperation="source-over";

  // 7. layered horizon ridges
  for(let L=0;L<2;L++){
    const rstep=Math.max(16,w/40);
    ctx.beginPath();
    ctx.moveTo(0,hy+2);
    for(let x=0;x<=w;x+=rstep){
      const n=fbm(x*0.003+L*10,L*5+t*0.01,2);
      const nn=fbm(x*0.011+L*3,7,2);
      ctx.lineTo(x, hy-(10+L*16)-n*(14+L*10)-nn*4);
    }
    ctx.lineTo(w,hy+2);
    ctx.closePath();
    ctx.fillStyle= L===0 ? "hsla(300,40%,7%,0.55)" : "hsla(295,50%,4%,0.85)";
    ctx.fill();
  }

  // 8. horizon haze
  ctx.globalCompositeOperation="lighter";
  ctx.fillStyle=GRAD.haze!;
  ctx.fillRect(0,hy-h*0.06,w,h*0.10);
  ctx.globalCompositeOperation="source-over";

  // 9. reflective water + soft mirror-glow + shimmer (the 'reflective' vibe)
  ctx.fillStyle=GRAD.water!;
  ctx.fillRect(0,hy,w,h-hy+1);
  ctx.globalCompositeOperation="lighter";
  // soft round pool of light where the sun meets the water
  softGlow(ctx,sunX,hy+(hy-sunY)*0.30,w*0.18,"hsla(30,92%,54%,0.10)","transparent");
  // downward-widening reflection (perspective mirror, broken up by shimmer)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(sunX-w*0.035,hy);
  ctx.lineTo(sunX+w*0.035,hy);
  ctx.lineTo(sunX+w*0.17,h);
  ctx.lineTo(sunX-w*0.17,h);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle=GRAD.glit!;
  ctx.fillRect(0,hy,w,h-hy);
  ctx.restore();
  const colBase=w*0.05;
  for(const s of CFG.shimmer){
    const df=s.y;
    const yy=hy+df*(h-hy);
    const wob=Math.abs(Math.sin(t*s.sp+s.ph));
    const hw=colBase*(0.25+df*1.6)*(0.5+0.7*wob)*s.w;
    const barH=Math.max(1.2,(h-hy)*0.012*(0.6+df));
    const fade=1-df*0.85;
    ctx.beginPath();
    ctx.ellipse(sunX+Math.sin(t*0.6+s.ph)*hw*0.15 + (s.hp-0.5)*w*0.05, yy, hw, barH, 0,0,TAU);
    ctx.fillStyle="hsla("+(34-df*8)+",92%,"+(60-df*18)+"%,"+(0.12*fade*(0.5+0.6*wob))+")";
    ctx.fill();
  }
  ctx.globalCompositeOperation="source-over";

  // 10. dust motes (parallax; gated glows cut gradient churn; capped brightness = no bloom hotspots)
  ctx.globalCompositeOperation="lighter";
  const mxp=mx*w, myp=my*h;
  for(const m of CFG.motes){
    const par=m.depth;
    // Soft wrap on the intrinsic drift path; parallax applies after the wrap
    // so cursor motion cannot pop motes across the seam.
    const wrapP=w+40;
    const wxm=wrapSoft(m.bx*w + t*m.drift + Math.sin(t*0.4*m.sp+m.ph)*m.bob, wrapP, 0.05);
    const x=wxm.u - 20 - px*60*par;
    const y=m.by*h + Math.sin(t*0.3*m.sp+m.ph*1.7)*m.bob - py*40*par;
    const pulse=0.45+0.55*Math.sin(t*1.3*m.sp+m.ph);
    const dS=Math.hypot(x-sunX,y-sunY);
    const lit=clamp(1-dS/(w*0.5),0,1);
    const md=Math.hypot(x-mxp,y-myp);
    const mB=md<130?(1-md/130)*0.4:0;
    const a=(m.alpha*par*(0.4+0.6*pulse)*(0.5+0.9*lit)+mB)*wxm.alpha;
    if(a<=0.015) continue;
    const sz=m.sz*(0.8+0.4*pulse);
    const hue=m.hue+(395-m.hue)*lit*0.5;
    if(par>0.9 || lit>0.4 || mB>0.05){
      softGlow(ctx,x,y,sz*4.5,"hsla("+hue+",85%,66%,"+(a*0.45)+")","transparent");
    }
    ctx.beginPath();
    ctx.arc(x,y,sz,0,TAU);
    ctx.fillStyle="hsla("+hue+",88%,80%,"+clamp(a*1.15,0,0.8)+")";
    ctx.fill();
    if(m.spark>0.84 && (lit>0.45||par>0.9)){
      ctx.beginPath();
      ctx.arc(x,y,sz*0.55,0,TAU);
      ctx.fillStyle="hsla("+hue+",96%,90%,"+clamp(a*0.7,0,0.6)+")";
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation="source-over";

  // 11. vignette
  ctx.fillStyle=GRAD.vig!;
  ctx.fillRect(0,0,w,h);
};
