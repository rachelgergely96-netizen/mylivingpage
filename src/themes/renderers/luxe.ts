import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { finiteClamp, resolveThemeMotion } from "../shared/motion";
import { softGlow } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;
type Rgb = [number, number, number];
type LightPool = [number, number, number, Rgb, number];

const CFG = (function(){
  const rnd = createSeededRandom(20260721);
  const OUT = 12;
  const outer = [];
  for (let i=0;i<OUT;i++){ outer.push({ ij:0.98+rnd()*0.1, oj:0.9+rnd()*0.16, tone:rnd() }); }
  const INN = 10;
  const inner = [];
  for (let i=0;i<INN;i++){ inner.push({ ij:0.9+rnd()*0.12, oj:0.86+rnd()*0.12, tone:rnd() }); }
  const MOT = 22;
  const mot = [];
  for (let i=0;i<MOT;i++){ mot.push({ ax:rnd(), ay:rnd(), depth:0.3+rnd()*1.0, ph:rnd()*TAU, dr:rnd()*TAU, tw:0.4+rnd()*1.2, size:rnd(), br:rnd() }); }
  const GEM = 16;
  const gem = [];
  for (let i=0;i<GEM;i++){ gem.push({ tone:rnd(), jit:0.9+rnd()*0.16 }); }
  const GX = 9, GY = 6;
  return { OUT, outer, INN, inner, MOT, mot, GEM, gem, GX, GY };
})();

export const renderLuxe: ThemeRenderer = (ctx,w,h,t,mx,my,_deltaSeconds,motion)=>{
  const cl=(v: number,a: number,b: number)=> v<a?a:(v>b?b:v);
  const mixa=(a: Rgb,b: Rgb,f: number,al: number)=>'rgba('+Math.round(a[0]+(b[0]-a[0])*f)+','+Math.round(a[1]+(b[1]-a[1])*f)+','+Math.round(a[2]+(b[2]-a[2])*f)+','+al+')';
  const rgba=(a: Rgb,al: number)=>'rgba('+a[0]+','+a[1]+','+a[2]+','+al+')';

  const M=resolveThemeMotion(motion);
  const vel=cl(M.scrollVelocity/4,-1,1);
  const story=M.storyProgress;
  const impulse=M.interactionImpulse;

  const px=finiteClamp(mx,0,1,0.5)-0.5;
  const py=finiteClamp(my,0,1,0.5)-0.5;
  const minSide=Math.min(w,h);
  const maxSide=Math.max(w,h);

  const focusPull=M.hasFocus?0.028:0;
  const apX=w*0.805 + px*minSide*0.03 + (M.focusX-0.5)*minSide*focusPull;
  const apY=h*0.42 + py*minSide*0.024 + (M.focusY-0.5)*minSide*focusPull;
  const innerR=Math.max(1,minSide*0.084);
  const outerR=Math.max(2,minSide*0.34);
  const turn=t*0.02 + story*0.10 + vel*0.02;
  const sweep=t*0.34 + story*(TAU*0.5) + vel*0.05;
  const breath=0.5+0.5*Math.sin(t*0.18);

  const C_DK: Rgb=[26,16,10];
  const C_MD1: Rgb=[120,74,30];
  const C_MD2: Rgb=[224,168,88];
  const C_HI1: Rgb=[178,122,54];
  const C_PK: Rgb=[242,220,166];
  const C_ACC: Rgb=[232,192,106];

  ctx.save();
  try{
    // FAR PLANE — lacquer sculpting over the opaque base
    const pool=ctx.createRadialGradient(apX,apY,innerR*0.4,apX,apY,maxSide*0.62);
    pool.addColorStop(0,'rgba(60,40,18,0.55)');
    pool.addColorStop(0.32,'rgba(30,20,10,0.35)');
    pool.addColorStop(0.7,'rgba(8,6,5,0.18)');
    pool.addColorStop(1,'rgba(2,2,2,0)');
    ctx.fillStyle=pool; ctx.fillRect(0,0,w,h);

    const bloom=ctx.createLinearGradient(w,0,w*0.4,h);
    bloom.addColorStop(0,'rgba(58,40,16,0.4)');
    bloom.addColorStop(0.5,'rgba(20,14,8,0.12)');
    bloom.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=bloom; ctx.fillRect(0,0,w,h);

    const deep=ctx.createLinearGradient(0,0,0,h);
    deep.addColorStop(0,'rgba(0,0,0,0.35)');
    deep.addColorStop(0.5,'rgba(0,0,0,0)');
    deep.addColorStop(1,'rgba(0,0,0,0.45)');
    ctx.fillStyle=deep; ctx.fillRect(0,0,w,h);

    // Reflected-light caustics — coarsened fbm lacquer sheen, pushed off the mid-band (screen)
    ctx.save();
    ctx.globalCompositeOperation='screen';
    const gx0=w*0.44, gw=w*0.56, GX=CFG.GX, GY=CFG.GY;
    const cw=gw/GX, ch=h/GY;
    for (let iy=0;iy<GY;iy++){
      for (let ix=0;ix<GX;ix++){
        const cxp=gx0+(ix+0.5)*cw, cyp=(iy+0.5)*ch;
        const n=fbm(ix*0.7+t*0.05, iy*0.7-t*0.03, 3);
        const v=cl(n*0.5+0.5,0,1);
        const dx=(cxp-apX)/maxSide, dy=(cyp-apY)/maxSide;
        const fall=cl(1-Math.sqrt(dx*dx+dy*dy)*1.7,0,1);
        const a=Math.pow(v,2.3)*0.06*fall;
        if (a>0.006){
          ctx.fillStyle=mixa(C_MD1,C_PK,v,a);
          ctx.fillRect(cxp-cw*0.6,cyp-ch*0.6,cw*1.2,ch*1.2);
        }
      }
    }
    ctx.restore();

    // Drifting warm room-light pools (screen) — trimmed to 2
    ctx.save();
    ctx.globalCompositeOperation='screen';
    const pools: LightPool[]=[
      [apX-minSide*0.05, apY-minSide*0.08, minSide*0.5, [58,40,18], 0.15],
      [apX+minSide*0.14, apY+minSide*0.2, minSide*0.42, [40,26,12], 0.11]
    ];
    for (let i=0;i<pools.length;i++){
      const p=pools[i];
      const drift=Math.sin(t*0.05+i*2.1)*minSide*0.02;
      softGlow(ctx, p[0]+drift, p[1]-drift*0.6, p[2]*(0.9+0.12*breath), rgba(p[3], p[4]*(0.8+0.3*breath)), 'transparent');
    }
    ctx.restore();

    // Soft aperture bloom + concentric brushed-brass arcs (no rays) (screen)
    ctx.save();
    ctx.globalCompositeOperation='screen';
    softGlow(ctx, apX, apY, outerR*1.3, rgba(C_MD1, 0.12*(0.85+0.3*breath)), 'transparent');
    softGlow(ctx, apX, apY, outerR*0.8, rgba(C_MD2, 0.06*(0.85+0.3*breath)+impulse*0.02), 'transparent');
    for (let i=0;i<3;i++){
      const rr=outerR*(1.1+i*0.14);
      const wob=Math.sin(t*0.06+i)*0.1;
      ctx.beginPath();
      ctx.arc(apX,apY,rr,-1.15+wob,1.15+wob);
      ctx.strokeStyle=rgba(C_ACC, 0.05-i*0.012);
      ctx.lineWidth=Math.max(0.7,minSide*(0.0016-i*0.0004));
      ctx.stroke();
    }
    ctx.restore();

    // Installed-in-a-room nested frames
    for (let f=0;f<3;f++){
      const inset=minSide*(0.03+f*0.045);
      const left=w*(0.55+f*0.03);
      ctx.strokeStyle=rgba(C_ACC, 0.09-f*0.022);
      ctx.lineWidth=Math.max(0.7,minSide*0.0011);
      ctx.strokeRect(left, inset, (w-inset)-left, (h-inset)-inset);
    }

    // Polished-floor reflection beneath the fan (screen)
    ctx.save();
    ctx.globalCompositeOperation='screen';
    const refl=ctx.createLinearGradient(0, apY+outerR*0.3, 0, apY+outerR*1.5);
    refl.addColorStop(0,'rgba(60,42,18,0.13)');
    refl.addColorStop(0.5,'rgba(30,20,10,0.05)');
    refl.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=refl;
    ctx.fillRect(apX-outerR*1.1, apY+outerR*0.3, outerR*2.2, outerR*1.3);
    ctx.restore();

    const focusAng=Math.atan2((M.focusY*h)-apY,(M.focusX*w)-apX);

    // OUTER BRASS FAN — 12 individually-lit cut-brass blades with bevels
    const seg=TAU/CFG.OUT, gap=seg*0.13;
    for (let i=0;i<CFG.OUT;i++){
      const b=CFG.outer[i];
      const base=turn+i*seg;
      const a0=base+gap, a1=base+seg-gap, mid=base+seg*0.5;
      const ri=innerR*1.15*b.ij, ro=outerR*b.oj;
      const lit=cl(0.5+0.5*Math.cos(mid-sweep),0,1);
      let fLift=0;
      if (M.hasFocus){
        const d=Math.cos(mid-focusAng);
        fLift=cl((d-0.7)/0.3,0,1)*0.18;
      }
      const litN=cl(Math.pow(lit,1.5)+fLift,0,1);
      const ca=Math.cos(mid), sa=Math.sin(mid);
      const g=ctx.createLinearGradient(apX+ca*ri, apY+sa*ri, apX+ca*ro, apY+sa*ro);
      g.addColorStop(0, mixa(C_DK,C_MD1,0.3+litN*0.3,0.92));
      g.addColorStop(0.4, mixa(C_MD1,C_MD2,0.3+litN*0.7,0.9));
      g.addColorStop(0.72, mixa(C_HI1,C_PK,litN,0.6));
      g.addColorStop(1, rgba(C_DK,0.22));
      ctx.beginPath();
      ctx.arc(apX,apY,ri,a0,a1);
      ctx.arc(apX,apY,ro,a1,a0,true);
      ctx.closePath();
      ctx.fillStyle=g; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(apX+Math.cos(a0)*ri, apY+Math.sin(a0)*ri);
      ctx.lineTo(apX+Math.cos(a0)*ro, apY+Math.sin(a0)*ro);
      ctx.strokeStyle=rgba(C_PK, 0.1+litN*0.28);
      ctx.lineWidth=Math.max(0.8,minSide*0.0013);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(apX+Math.cos(a1)*ri, apY+Math.sin(a1)*ri);
      ctx.lineTo(apX+Math.cos(a1)*ro, apY+Math.sin(a1)*ro);
      ctx.strokeStyle='rgba(6,4,2,'+(0.28+(1-lit)*0.24)+')';
      ctx.lineWidth=Math.max(0.7,minSide*0.0011);
      ctx.stroke();
    }

    // INNER COUNTER-RING — shorter blades turning the other way (iris depth)
    const seg2=TAU/CFG.INN, gap2=seg2*0.16;
    for (let i=0;i<CFG.INN;i++){
      const b=CFG.inner[i];
      const base=-turn*1.3+i*seg2+seg2*0.5;
      const a0=base+gap2, a1=base+seg2-gap2, mid=base+seg2*0.5;
      const ri=innerR*1.0*b.ij, ro=innerR*1.95*b.oj;
      const lit=cl(0.5+0.5*Math.cos(mid+sweep*0.8),0,1);
      const litN=Math.pow(lit,1.6);
      const ca=Math.cos(mid), sa=Math.sin(mid);
      const g=ctx.createLinearGradient(apX+ca*ri, apY+sa*ri, apX+ca*ro, apY+sa*ro);
      g.addColorStop(0, mixa(C_DK,C_MD1,0.2+litN*0.3,0.95));
      g.addColorStop(0.55, mixa(C_MD1,C_PK,litN,0.62));
      g.addColorStop(1, rgba(C_DK,0.3));
      ctx.beginPath();
      ctx.arc(apX,apY,ri,a0,a1);
      ctx.arc(apX,apY,ro,a1,a0,true);
      ctx.closePath();
      ctx.fillStyle=g; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(apX+Math.cos(a0)*ri, apY+Math.sin(a0)*ri);
      ctx.lineTo(apX+Math.cos(a0)*ro, apY+Math.sin(a0)*ro);
      ctx.strokeStyle=rgba(C_PK, 0.08+litN*0.24);
      ctx.lineWidth=Math.max(0.6,minSide*0.001);
      ctx.stroke();
    }

    // SOFT AO GROOVE — bevel shadow where the raised inner ring meets the outer fan
    const ao=ctx.createRadialGradient(apX,apY,innerR*1.55, apX,apY,innerR*2.45);
    ao.addColorStop(0,'rgba(0,0,0,0)');
    ao.addColorStop(0.5,'rgba(3,2,1,0.42)');
    ao.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=ao;
    ctx.beginPath(); ctx.arc(apX,apY,innerR*2.45,0,TAU); ctx.fill();

    // Bevel highlight catching light along the top of the inner-ring lip
    ctx.beginPath();
    ctx.arc(apX,apY,innerR*1.98,-1.05,0.7);
    ctx.strokeStyle=rgba(C_PK,0.12);
    ctx.lineWidth=Math.max(0.6,minSide*0.0009);
    ctx.stroke();

    // CENTER JEWEL — socket, cut-gem facets, onyx dome, caustic ring, specular
    const socket=ctx.createRadialGradient(apX,apY,0,apX,apY,innerR*1.5);
    socket.addColorStop(0,'rgba(4,3,2,1)');
    socket.addColorStop(0.5,'rgba(10,7,5,1)');
    socket.addColorStop(0.74, rgba(C_ACC,0.72));
    socket.addColorStop(0.8,'rgba(60,36,16,0.9)');
    socket.addColorStop(1,'rgba(10,7,4,0)');
    ctx.fillStyle=socket;
    ctx.beginPath(); ctx.arc(apX,apY,innerR*1.5,0,TAU); ctx.fill();

    const gseg=TAU/CFG.GEM, grot=turn*1.6;
    for (let i=0;i<CFG.GEM;i++){
      const gm=CFG.gem[i];
      const a=grot+i*gseg;
      const lit=cl(0.5+0.5*Math.cos(a-sweep*1.2),0,1);
      const rr=innerR*0.92*gm.jit;
      ctx.beginPath();
      ctx.moveTo(apX,apY);
      ctx.lineTo(apX+Math.cos(a-gseg*0.5)*rr, apY+Math.sin(a-gseg*0.5)*rr);
      ctx.lineTo(apX+Math.cos(a+gseg*0.5)*rr, apY+Math.sin(a+gseg*0.5)*rr);
      ctx.closePath();
      ctx.fillStyle=(i%2)? mixa(C_DK,C_MD1,0.3+lit*0.3,0.9) : mixa(C_MD1,C_PK,lit,0.72);
      ctx.fill();
    }

    const onyx=ctx.createRadialGradient(apX-innerR*0.28, apY-innerR*0.32,0, apX,apY,innerR*0.7);
    onyx.addColorStop(0,'rgba(74,52,30,0.9)');
    onyx.addColorStop(0.3,'rgba(24,16,11,0.9)');
    onyx.addColorStop(0.75,'rgba(5,4,3,0.95)');
    onyx.addColorStop(1,'rgba(30,20,10,0.4)');
    ctx.fillStyle=onyx;
    ctx.beginPath(); ctx.arc(apX,apY,innerR*0.66,0,TAU); ctx.fill();

    ctx.beginPath();
    ctx.arc(apX,apY,innerR*0.66, -0.9+Math.sin(t*0.3)*0.1, 1.1+Math.sin(t*0.3)*0.1);
    ctx.strokeStyle=rgba(C_PK,0.42);
    ctx.lineWidth=Math.max(1,minSide*0.0022);
    ctx.stroke();

    // Center specular — capped so the bright-pass bloom can't clip it to white; grows a touch on interaction
    ctx.save();
    ctx.globalCompositeOperation='screen';
    const specA=cl(0.44+impulse*0.16,0,0.52);
    const specR=innerR*0.34*(1+impulse*0.35);
    softGlow(ctx, apX-innerR*0.26, apY-innerR*0.3, specR, rgba(C_PK,specA), 'transparent');
    ctx.restore();

    // TRAVELLING RIM GLINTS — one soft round glow each, alpha-capped, riding the story-driven sweep (screen)
    ctx.save();
    ctx.globalCompositeOperation='screen';
    for (let k=0;k<3;k++){
      const ga=sweep+k*(TAU/3);
      const gr=outerR*(0.9-k*0.06);
      const gxp=apX+Math.cos(ga)*gr, gyp=apY+Math.sin(ga)*gr;
      const pulse=0.6+0.4*Math.sin(t*0.5+k*2.0);
      const size=minSide*(0.03-k*0.006)*(1+impulse*0.3);
      const gaA=cl(0.24*pulse+impulse*0.06,0,0.3);
      softGlow(ctx, gxp, gyp, size*1.5, rgba(C_PK, gaA), 'transparent');
    }
    ctx.restore();

    // Focus glint — a soft round glow drawn on the rim toward the focused item (no connector bar)
    if (M.hasFocus){
      ctx.save();
      ctx.globalCompositeOperation='screen';
      const fr=outerR*0.86;
      const fx=apX+Math.cos(focusAng)*fr, fy=apY+Math.sin(focusAng)*fr;
      const fa=cl(0.16+impulse*0.12,0,0.26);
      softGlow(ctx, fx, fy, minSide*0.032*(1+impulse*0.3), rgba(C_PK, fa), 'transparent');
      ctx.restore();
    }

    // FOREGROUND GOLD DUST — soft parallax motes, gentle low twinkle (screen)
    ctx.save();
    ctx.globalCompositeOperation='screen';
    for (let i=0;i<CFG.MOT;i++){
      const m=CFG.mot[i];
      const bx=w*(0.4+m.ax*0.6), by=h*m.ay;
      const dxp=Math.sin(t*0.05*m.depth+m.ph)*minSide*0.02*m.depth;
      const dyp=Math.cos(t*0.04*m.depth+m.dr)*minSide*0.016*m.depth;
      const x=bx+dxp-px*minSide*0.035*m.depth;
      const y=by+dyp-py*minSide*0.028*m.depth;
      const tw=0.55+0.45*Math.sin(t*m.tw+m.ph);
      const r=minSide*(0.0006+m.size*0.0014)*(0.6+m.depth*0.4);
      const a=(0.03+m.br*0.1)*tw;
      if (a>0.008){
        ctx.beginPath(); ctx.arc(x,y,r,0,TAU);
        ctx.fillStyle=mixa(C_ACC,C_PK,m.br,a);
        ctx.fill();
      }
    }
    ctx.restore();

    // Warm aperture haze (screen)
    ctx.save();
    ctx.globalCompositeOperation='screen';
    const haze=ctx.createRadialGradient(apX,apY,innerR, apX,apY,outerR*1.2);
    haze.addColorStop(0,'rgba(40,28,12,0)');
    haze.addColorStop(0.6,'rgba(50,34,14,0.06)');
    haze.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=haze;
    ctx.fillRect(apX-outerR*1.3, apY-outerR*1.3, outerR*2.6, outerR*2.6);
    ctx.restore();

    // Reading lane (dark region extended rightward to guard the mid-band) + vignette color grade
    const lane=ctx.createLinearGradient(0,0,w*0.74,0);
    lane.addColorStop(0,'rgba(6,5,4,0.93)');
    lane.addColorStop(0.45,'rgba(7,5,4,0.75)');
    lane.addColorStop(0.72,'rgba(7,5,4,0.34)');
    lane.addColorStop(1,'rgba(7,5,4,0)');
    ctx.fillStyle=lane; ctx.fillRect(0,0,w*0.76,h);

    const vig=ctx.createRadialGradient(apX,apY,minSide*0.16, w*0.6,h*0.5,maxSide*0.85);
    vig.addColorStop(0,'rgba(0,0,0,0)');
    vig.addColorStop(0.7,'rgba(0,0,0,0.12)');
    vig.addColorStop(1,'rgba(0,0,0,0.55)');
    ctx.fillStyle=vig; ctx.fillRect(0,0,w,h);
  } finally {
    ctx.restore();
  }
};
