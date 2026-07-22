import { fbm } from "../shared/noise";
import { finiteClamp } from "../shared/motion";
import { star4 } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

interface CosmicStar {
  layer: number;
  depth: number;
  i: number;
  bx: number;
  by: number;
  hue: number;
  base: number;
  twF: number;
  twP: number;
  accent: boolean;
}

const COS_LAYER_COUNT=[46,40,26];
const COS_STARS: CosmicStar[]=[];
for(let layer=0;layer<3;layer++){
  const count=COS_LAYER_COUNT[layer];
  const depth=layer+1;
  for(let i=0;i<count;i++){
    const seed=i*137.5+layer*57.1;
    COS_STARS.push({
      layer:layer, depth:depth, i:i,
      bx:Math.sin(seed)*0.5+0.5,
      by:Math.cos(seed*1.3)*0.5+0.5,
      hue:40+Math.sin(i*0.6+layer)*26,
      base:(3-layer)*0.7,
      twF:1.1+(i%5)*0.12,
      twP:seed*3,
      accent:(layer===2&&i%4===0)
    });
  }
}
const COS_CLOUDS=[
  [0.34,0.36,0.72,268,70,32,0.07],
  [0.66,0.42,0.60,205,60,30,0.09],
  [0.5,0.6,0.85,320,55,26,0.04],
  [0.78,0.24,0.5,42,80,40,0.07],
  [0.2,0.7,0.55,190,60,34,0.05]
];

let cosmicGlow: CanvasGradient | null = null;
let cosmicGlowContext: CanvasRenderingContext2D | null = null;

export const renderCosmic: ThemeRenderer = (ctx,w,h,t,mx,my)=>{
  const S=Math.min(w,h);
  let _glow=cosmicGlow;
  if(!_glow || cosmicGlowContext!==ctx){
    _glow=ctx.createRadialGradient(0,0,0,0,0,48);
    _glow.addColorStop(0,"rgba(255,241,206,1)");
    _glow.addColorStop(0.4,"rgba(255,226,168,0.5)");
    _glow.addColorStop(1,"rgba(255,216,150,0)");
    cosmicGlow=_glow;
    cosmicGlowContext=ctx;
  }
  const GR=48;
  const stamp=(x:number,y:number,r:number,a:number)=>{ if(!(a>0)||!(r>0))return; ctx.save(); ctx.globalAlpha=a>1?1:a; ctx.translate(x,y); const s=r/GR; ctx.scale(s,s); ctx.fillStyle=_glow; ctx.fillRect(-GR,-GR,GR*2,GR*2); ctx.restore(); };
  // 1 — layered nebula masses, screen-blended for luminous depth
  ctx.save(); ctx.globalCompositeOperation="screen";
  for(let ci=0;ci<COS_CLOUDS.length;ci++){
    const c=COS_CLOUDS[ci];
    const cx=(c[0]+Math.sin(t*0.05+ci*1.7)*0.03)*w, cy=(c[1]+Math.cos(t*0.045+ci)*0.03)*h, r=c[2]*S;
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
    g.addColorStop(0,`hsla(${c[3]},${c[4]}%,${c[5]}%,${c[6]})`);
    g.addColorStop(0.45,`hsla(${c[3]+18},${c[4]}%,${c[5]-8}%,${c[6]*0.4})`);
    g.addColorStop(1,"transparent");
    ctx.fillStyle=g; ctx.fillRect(cx-r,cy-r,r*2,r*2);
  }
  ctx.restore();
  // 2 — dust lane across the galactic band, fbm-textured (coarser step for perf)
  ctx.save(); ctx.translate(w*0.5,h*0.5); ctx.rotate(-0.42); ctx.globalCompositeOperation="screen";
  for(let x=-w;x<w;x+=10){
    const n=fbm(x*0.004+t*0.02,3.1,3);
    const band=(0.5+n*0.5)*h*0.10;
    const a=0.02+Math.max(0,n)*0.05;
    ctx.fillStyle=`hsla(250,40%,52%,${a})`;
    ctx.fillRect(x,-band*0.5+n*10,10,band);
  }
  ctx.restore();
  // 3 — three star depth layers with parallax + twinkle (peaks clamped for legibility/bloom)
  const px0=(mx-0.5), py0=(my-0.5);
  const links=[];
  for(let sI=0;sI<COS_STARS.length;sI++){
    const st=COS_STARS[sI]; const depth=st.depth, par=depth*8;
    const sx=(st.bx*w - px0*par + Math.sin(t*0.15*depth+st.i)*2 + w)%w;
    const sy=(st.by*h - py0*par + Math.cos(t*0.12*depth+st.i)*2 + h)%h;
    const tw=0.35+0.4*Math.sin(t*st.twF+st.twP)+0.15*Math.sin(t*0.4+st.i);
    const twp=tw>0?tw:0;
    const dx=mx*w-sx, dy=my*h-sy; const dist=Math.hypot(dx,dy);
    const boost=dist<140?(1-dist/140)*0.35:0;
    const r=st.base*(0.7+twp*0.5);
    const coreA=finiteClamp(0.35+tw*0.55+boost,0,0.8,0.4);
    const coreL=finiteClamp(72+boost*16,60,82,72);
    ctx.beginPath(); ctx.arc(sx,sy,r,0,TAU); ctx.fillStyle=`hsla(${st.hue},70%,${coreL}%,${coreA})`; ctx.fill();
    stamp(sx,sy,r*7, twp*0.11+boost*0.15);
    if(st.accent){ star4(ctx,sx,sy,r*5,0.6,`hsla(${st.hue},80%,82%,${finiteClamp(0.2+twp*0.28+boost*0.5,0,0.55,0.25)})`); }
    if(st.layer===0){ links.push(sx,sy); }
  }
  // 4 — constellation links with a travelling energy spark (spark alpha tamed al*3 -> al*1.5)
  ctx.lineWidth=0.7;
  const nL=links.length/2;
  for(let i=0;i<nL;i++){
    const ax=links[i*2], ay=links[i*2+1];
    const jMax=Math.min(i+5,nL);
    for(let j=i+1;j<jMax;j++){
      const bx=links[j*2], by=links[j*2+1];
      const d=Math.hypot(ax-bx,ay-by);
      if(d<w*0.13){
        const al=(1-d/(w*0.13))*0.14;
        ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by);
        ctx.strokeStyle=`hsla(44,70%,70%,${al})`; ctx.stroke();
        const fp=(t*0.35+i*0.7)%1;
        stamp(ax+(bx-ax)*fp, ay+(by-ay)*fp, 7, al*1.5);
      }
    }
  }
  // 5 — shooting stars with tapered gradient trail
  for(let k=0;k<2;k++){
    const phase=(t*0.13+k*0.5)%1;
    if(phase<0.16){
      const p=phase/0.16; const seed=Math.floor(t*0.13+k*0.5)*73.1+k*40;
      const sxp=(Math.sin(seed)*0.5+0.5)*w; const syp=Math.abs(Math.sin(seed*1.3))*h*0.35;
      const ang=0.45+Math.sin(seed*2)*0.3; const len=90+p*70;
      const x=sxp+Math.cos(ang)*p*w*0.5, y=syp+Math.sin(ang)*p*h*0.4;
      const tx=x-Math.cos(ang)*len, ty=y-Math.sin(ang)*len;
      const g=ctx.createLinearGradient(x,y,tx,ty); g.addColorStop(0,`hsla(46,90%,84%,${(1-p)*0.5})`); g.addColorStop(1,"transparent");
      ctx.strokeStyle=g; ctx.lineWidth=1.6; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(tx,ty); ctx.stroke();
      stamp(x,y,10,(1-p)*0.5);
    }
  }
  // 6 — vignette to seat the field
  const vg=ctx.createRadialGradient(w*0.5,h*0.45,S*0.2,w*0.5,h*0.5,S*0.95);
  vg.addColorStop(0,"transparent"); vg.addColorStop(1,"rgba(2,2,10,0.55)");
  ctx.fillStyle=vg; ctx.fillRect(0,0,w,h);
};
