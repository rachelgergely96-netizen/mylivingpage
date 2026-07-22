import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { finiteClamp } from "../shared/motion";
import { star4 } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

const CFG=(function(){
  const rand=createSeededRandom(70413);
  const discs=[];
  for(let i=0;i<11;i++){
    discs.push({
      bx:0.06+rand()*0.88,
      by:0.08+rand()*0.84,
      r:0.06+rand()*0.085,
      depth:0.35+rand()*0.95,
      driftA:rand()*TAU,
      driftSpeed:0.09+rand()*0.13,
      driftRx:12+rand()*24,
      driftRy:10+rand()*20,
      hue:rand(),
      spin:(rand()<0.5?-1:1)*(0.04+rand()*0.1),
      ringPhase:rand()*TAU
    });
  }
  const hazeCols=[[178,190,255],[150,228,255],[255,188,222],[176,255,220],[214,214,255],[255,222,236],[160,206,255]];
  const haze=[];
  for(let i=0;i<4;i++){
    haze.push({
      bx:rand(),
      by:rand(),
      r:0.30+rand()*0.28,
      col:hazeCols[i%hazeCols.length],
      driftA:rand()*TAU,
      driftSpeed:0.025+rand()*0.045,
      driftAmp:0.04+rand()*0.08,
      pulse:rand()*TAU
    });
  }
  const tex=[];
  for(let i=0;i<20;i++){
    tex.push({x:rand(),y:rand(),r:0.045+rand()*0.09,hue:rand()*TAU,drift:rand()*TAU,sp:0.02+rand()*0.05});
  }
  const spark=[];
  for(let i=0;i<40;i++){
    spark.push({x:rand(),y:rand(),layer:i%3,size:rand(),phase:rand()*TAU,speed:0.6+rand()*1.9,bright:rand()});
  }
  const motes=[];
  for(let i=0;i<22;i++){
    motes.push({x:rand(),y:rand(),r:0.004+rand()*0.014,phase:rand()*TAU,speed:0.12+rand()*0.35,dir:(rand()<0.5?-1:1),hue:rand()*TAU});
  }
  return {discs,haze,tex,spark,motes};
})();

export const renderOpaline: ThemeRenderer = (ctx,w,h,t,mx,my)=>{
  const minSide=Math.min(w,h);
  const px=mx*w, py=my*h;
  const offx=mx-0.5, offy=my-0.5;
  const opal=(p: number,a: number)=>{
    const r=200+55*Math.sin(p);
    const g=205+48*Math.sin(p+2.09);
    const b=235+20*Math.sin(p+4.19);
    return "rgba("+(r|0)+","+(g|0)+","+(b|0)+","+a+")";
  };
  // suppress bright specular highlights over the central / upper-left reading column
  const guard=(nx: number,ny: number)=>{
    const gx=(nx-0.44)/0.46, gy=(ny-0.46)/0.52;
    return finiteClamp(0.4+0.6*Math.sqrt(gx*gx+gy*gy),0.4,1,1);
  };

  ctx.save();

  // base atmospheric grade (source-over, translucent over the painted bg)
  ctx.globalCompositeOperation="source-over";
  const wash=ctx.createLinearGradient(0,0,0,h);
  wash.addColorStop(0,"rgba(26,30,60,0.5)");
  wash.addColorStop(0.5,"rgba(10,14,32,0.12)");
  wash.addColorStop(1,"rgba(3,5,14,0.6)");
  ctx.fillStyle=wash;
  ctx.fillRect(0,0,w,h);

  ctx.globalCompositeOperation="lighter";

  // iridescent haze masses (fewer + smaller than before to cut full-viewport additive overdraw)
  for(let i=0;i<CFG.haze.length;i++){
    const m=CFG.haze[i];
    const pulse=0.5+0.5*Math.sin(t*0.2+m.pulse);
    const hx=(m.bx+Math.sin(t*m.driftSpeed+m.driftA)*m.driftAmp)*w-offx*44*(0.5+i*0.08);
    const hy=(m.by+Math.cos(t*m.driftSpeed*0.9+m.driftA)*m.driftAmp)*h-offy*36*(0.5+i*0.08);
    const rr=m.r*minSide*(0.85+0.25*pulse);
    if(rr<=0) continue;
    const a=0.04+0.045*pulse;
    const g=ctx.createRadialGradient(hx,hy,0,hx,hy,rr);
    g.addColorStop(0,"rgba("+m.col[0]+","+m.col[1]+","+m.col[2]+","+a+")");
    g.addColorStop(0.5,"rgba("+m.col[0]+","+m.col[1]+","+m.col[2]+","+(a*0.4)+")");
    g.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=g;
    ctx.fillRect(hx-rr,hy-rr,rr*2,rr*2);
  }

  // fbm-textured opal veil for volumetric depth (thinned 52->20)
  for(let i=0;i<CFG.tex.length;i++){
    const p=CFG.tex[i];
    const n=fbm(p.x*3+t*0.03,p.y*3-t*0.02,3);
    const a=0.045+n*0.05;
    if(a<=0.002) continue;
    const fx=p.x*w+Math.sin(t*p.sp+p.drift)*minSide*0.02-offx*22*p.y;
    const fy=p.y*h+Math.cos(t*p.sp*0.8+p.drift)*minSide*0.02-offy*18*p.y;
    const rr=p.r*minSide*(0.8+0.4*(n*0.5+0.5));
    if(rr<=0) continue;
    const g=ctx.createRadialGradient(fx,fy,0,fx,fy,rr);
    g.addColorStop(0,opal(p.hue+t*0.18+n,a));
    g.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=g;
    ctx.fillRect(fx-rr,fy-rr,rr*2,rr*2);
  }

  // soft opal bokeh drifting for foreground depth (thinned 32->22)
  for(let i=0;i<CFG.motes.length;i++){
    const m=CFG.motes[i];
    const tw=0.5+0.5*Math.sin(t*m.speed+m.phase);
    const depth=0.4+m.r*20;
    const mox=m.x*w-offx*90*depth+m.dir*Math.sin(t*m.speed*0.5+m.phase)*26;
    const moy=m.y*h-offy*70*depth+Math.cos(t*m.speed*0.4+m.phase)*20;
    const rr=m.r*minSide*(0.8+0.3*tw);
    if(rr<=0) continue;
    const a=0.05+tw*0.08;
    const g=ctx.createRadialGradient(mox,moy,0,mox,moy,rr);
    g.addColorStop(0,opal(m.hue+t*0.1,a));
    g.addColorStop(0.6,opal(m.hue+t*0.1,a*0.3));
    g.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=g;
    ctx.fillRect(mox-rr,moy-rr,rr*2,rr*2);
  }

  // pearlescent opal discs with lighting, play-of-color and refraction (identity preserved)
  for(let i=0;i<CFG.discs.length;i++){
    const d=CFG.discs[i];
    const r=d.r*minSide;
    const dx=d.bx*w+Math.sin(t*d.driftSpeed+d.driftA)*d.driftRx-offx*66*d.depth;
    const dy=d.by*h+Math.cos(t*d.driftSpeed*0.85+d.driftA)*d.driftRy-offy*66*d.depth;
    const dist=Math.hypot(dx-px,dy-py);
    const reach=r*2.6;
    const inter=dist<reach?1-dist/reach:0;
    const dn=Math.min(1,d.depth/1.3);
    const ph=t*0.4+d.hue*TAU;
    const rot=t*d.spin+d.ringPhase;
    const lg=guard(dx/w,dy/h);

    // outer iridescent bloom (softened)
    const bloom=ctx.createRadialGradient(dx,dy,r*0.15,dx,dy,r*1.95);
    bloom.addColorStop(0,opal(ph+1.0,(0.08+inter*0.05)*(0.6+0.4*dn)));
    bloom.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=bloom;
    ctx.fillRect(dx-r*1.95,dy-r*1.95,r*3.9,r*3.9);

    // pearlescent body: specular core capped (0.46->0.26, off pure white) + reading-zone guard
    const lx=dx-r*0.28, ly=dy-r*0.32;
    const body=ctx.createRadialGradient(lx,ly,r*0.05,dx,dy,r);
    body.addColorStop(0,"rgba(248,247,252,"+((0.26+inter*0.10)*lg)+")");
    body.addColorStop(0.32,opal(ph,0.30+inter*0.08));
    body.addColorStop(0.6,opal(ph+2.0,0.20+inter*0.06));
    body.addColorStop(0.82,opal(ph+4.0,0.13));
    body.addColorStop(1,"rgba(120,140,220,0)");
    ctx.beginPath();
    ctx.arc(dx,dy,r,0,TAU);
    ctx.fillStyle=body;
    ctx.fill();

    // crystalline refraction arcs
    ctx.lineWidth=Math.max(1,r*0.02);
    for(let k=0;k<3;k++){
      const a0=rot+k*2.1;
      ctx.beginPath();
      ctx.arc(dx,dy,r*(0.5+k*0.16),a0,a0+1.2+0.45*k);
      ctx.strokeStyle=opal(ph+k*1.7,0.12+inter*0.10);
      ctx.stroke();
    }

    // rim light crescent
    ctx.beginPath();
    ctx.arc(dx,dy,r*0.93,0.5+rot*0.3,2.5+rot*0.3);
    ctx.strokeStyle="rgba(206,236,255,"+(0.13+inter*0.12)+")";
    ctx.lineWidth=Math.max(0.8,r*0.016);
    ctx.stroke();

    // specular glint: capped (0.5->0.20) and de-whitened so the bright-pass bloom can't clip it
    const gx=dx-r*0.34, gy=dy-r*0.38;
    const glint=ctx.createRadialGradient(gx,gy,0,gx,gy,r*0.36);
    glint.addColorStop(0,"rgba(240,244,255,"+((0.2+inter*0.12)*lg)+")");
    glint.addColorStop(1,"rgba(240,244,255,0)");
    ctx.fillStyle=glint;
    ctx.fillRect(gx-r*0.36,gy-r*0.36,r*0.72,r*0.72);

    // soft diffraction glow on near / hovered discs (alpha lowered + reading-zone guard)
    if(dn>0.72||inter>0.28){
      star4(ctx,gx,gy,r*(0.5+inter*0.5),Math.max(1,r*0.03),"rgba(230,240,255,"+((0.14+inter*0.22)*lg)+")");
    }
  }

  // crystalline sparkles in parallax depth layers (thinned 96->40, peak alpha tamed, guarded)
  for(let i=0;i<CFG.spark.length;i++){
    const s=CFG.spark[i];
    const depth=0.4+s.layer*0.42;
    const sx=s.x*w-offx*30*depth+Math.sin(t*0.12+s.phase)*4;
    const sy=s.y*h-offy*30*depth+Math.cos(t*0.12+s.phase)*4;
    const tw=0.5+0.5*Math.sin(t*s.speed+s.phase);
    const slg=guard(sx/w,sy/h);
    const a=(0.10+tw*0.32)*(0.5+0.2*s.layer)*slg;
    const sz=(0.6+s.size*1.7)*(0.6+depth*0.5);
    ctx.beginPath();
    ctx.arc(sx,sy,sz,0,TAU);
    ctx.fillStyle="rgba(250,250,252,"+a+")";
    ctx.fill();
    if(s.bright>0.8&&tw>0.62){
      star4(ctx,sx,sy,sz*(3.4+tw*3.4),Math.max(0.6,sz*0.5),"rgba(216,232,255,"+(a*0.7)+")");
    }
  }

  // pearlescent sheen sweep (eased down over the upper-left reading column)
  const sheen=ctx.createLinearGradient(0,0,w*0.5,h*0.6);
  sheen.addColorStop(0,"rgba(150,172,255,0.045)");
  sheen.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=sheen;
  ctx.fillRect(0,0,w,h);

  // pointer glow (iridescent, softened)
  const pr=minSide*0.26;
  const pg=ctx.createRadialGradient(px,py,0,px,py,pr);
  pg.addColorStop(0,"rgba(202,216,255,0.08)");
  pg.addColorStop(0.5,"rgba(160,226,255,0.04)");
  pg.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=pg;
  ctx.fillRect(px-pr,py-pr,pr*2,pr*2);

  // central content scrim + seating vignette (source-over) — reinforce the reading column
  ctx.globalCompositeOperation="source-over";
  const scrim=ctx.createRadialGradient(w*0.45,h*0.46,0,w*0.45,h*0.48,minSide*0.66);
  scrim.addColorStop(0,"rgba(5,7,18,0.22)");
  scrim.addColorStop(0.55,"rgba(5,7,18,0.10)");
  scrim.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=scrim;
  ctx.fillRect(0,0,w,h);

  const vig=ctx.createRadialGradient(w*0.5,h*0.42,minSide*0.2,w*0.5,h*0.52,minSide*0.9);
  vig.addColorStop(0,"rgba(0,0,0,0)");
  vig.addColorStop(0.7,"rgba(3,4,12,0.12)");
  vig.addColorStop(1,"rgba(2,3,10,0.5)");
  ctx.fillStyle=vig;
  ctx.fillRect(0,0,w,h);

  ctx.restore();
};
