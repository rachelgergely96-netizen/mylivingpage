import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { finiteClamp, resolveThemeMotion, storyStepWeight } from "../shared/motion";
import { softGlow } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

interface LustreGlint {
  u0: number;
  sp: number;
  ph: number;
  pr: number;
  sz: number;
}

interface LustreRibbon {
  depth: number;
  baseY: number;
  thick: number;
  speed: number;
  k1: number;
  k2: number;
  amp1: number;
  amp2: number;
  phase: number;
  phase2: number;
  swellK: number;
  swellPh: number;
  chW: number;
  glints: LustreGlint[];
}

const CFG=(function(){
  const rnd=createSeededRandom(74213);
  const RN=5;
  const ribbons: LustreRibbon[]=[];
  for(let i=0;i<RN;i++){
    const depth=RN>1?i/(RN-1):0;
    ribbons.push({
      depth,
      baseY:0.17+depth*0.66+(rnd()-0.5)*0.03,
      thick:0.030+depth*0.016+rnd()*0.006,
      speed:0.05+depth*0.04+rnd()*0.02,
      k1:0.6+rnd()*0.5,
      k2:1.4+rnd()*0.8,
      amp1:0.016+depth*0.022+rnd()*0.010,
      amp2:0.004+rnd()*0.006,
      phase:rnd()*TAU,
      phase2:rnd()*TAU,
      swellK:2+Math.floor(rnd()*3),
      swellPh:rnd()*TAU,
      chW:0,
      glints:[]
    });
  }
  for(let i=0;i<RN;i++){
    const r=ribbons[i];
    const n=2+Math.floor(rnd()*2);
    for(let g=0;g<n;g++){
      r.glints.push({u0:rnd(),sp:0.02+rnd()*0.05,ph:rnd()*TAU,pr:0.6+rnd()*1.2,sz:0.6+rnd()*0.8});
    }
  }
  const motes=[];
  for(let i=0;i<34;i++){
    motes.push({x:rnd(),y:rnd(),depth:rnd(),ph:rnd()*TAU,r:0.4+rnd()*1.3,bright:rnd()});
  }
  const atmos=[];
  for(let i=0;i<12;i++){
    atmos.push({x:0.40+rnd()*0.62,y:rnd(),r:0.06+rnd()*0.15,ph:rnd()*TAU,b:rnd()});
  }
  return {RN,ribbons,motes,atmos};
})();

export const renderLustre: ThemeRenderer = (ctx,w,h,t,mx,my,_deltaSeconds,motion)=>{
  const M=resolveThemeMotion(motion);
  const minSide=Math.min(w,h);
  const maxSide=Math.max(w,h);
  const px=mx-0.5, py=my-0.5;
  const NSEG=20;
  const xL=w*0.40, xR=w*1.10;
  const span=xR-xL;
  const A=(v: number)=>finiteClamp(v,0,1);
  const story=A(M.storyProgress);
  const scrollV=finiteClamp(M.scrollVelocity/4,-1,1);
  const scrollMag=Math.abs(scrollV);
  const impulse=A(M.interactionImpulse);
  const live=M.sectionCount>0?1:0;
  const storyFlow=story*0.8;
  const activeIdx=Math.round(story*(CFG.RN-1));

  function cy(r: LustreRibbon,u: number){
    return h*r.baseY
      +Math.sin(u*r.k1*TAU+r.phase+t*r.speed+storyFlow)*h*r.amp1
      +Math.sin(u*r.k2*TAU-r.phase2-t*r.speed*1.2)*h*r.amp2
      +py*minSide*0.03*(0.4+r.depth)
      -(r.chW||0)*minSide*0.012;
  }
  function thAt(r: LustreRibbon,u: number){
    const taper=0.42+0.58*u;
    const swell=0.86+0.14*Math.sin(u*r.swellK*TAU+r.swellPh+t*0.3);
    return minSide*r.thick*taper*swell*(1+(r.chW||0)*0.08);
  }
  function px_(u: number,xShift: number){ return xL+span*u+xShift; }
  function traceRegion(r: LustreRibbon,fTop: number,fBot: number,xShift: number){
    ctx.beginPath();
    for(let s=0;s<=NSEG;s++){
      const u=s/NSEG;
      const x=px_(u,xShift);
      const y=cy(r,u)+thAt(r,u)*fTop;
      if(s===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    for(let s=NSEG;s>=0;s--){
      const u=s/NSEG;
      const x=px_(u,xShift);
      const y=cy(r,u)+thAt(r,u)*fBot;
      ctx.lineTo(x,y);
    }
    ctx.closePath();
  }
  function strokeFrac(r: LustreRibbon,frac: number,xShift: number,style: string | CanvasGradient | CanvasPattern,lw: number){
    ctx.beginPath();
    for(let s=0;s<=NSEG;s++){
      const u=s/NSEG;
      const x=px_(u,xShift);
      const y=cy(r,u)+thAt(r,u)*frac;
      if(s===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.lineCap="round"; ctx.lineJoin="round";
    ctx.strokeStyle=style; ctx.lineWidth=Math.max(0.6,lw); ctx.stroke();
  }

  ctx.save();

  const bg=ctx.createLinearGradient(w,0,0,h);
  bg.addColorStop(0,"rgba(34,23,17,0.55)");
  bg.addColorStop(0.42,"rgba(16,11,12,0.34)");
  bg.addColorStop(1,"rgba(2,1,2,0.5)");
  ctx.fillStyle=bg;
  ctx.fillRect(0,0,w,h);

  const bx=w*(0.80+px*0.02), by=h*(0.40+py*0.02);
  ctx.save();
  ctx.globalCompositeOperation="screen";
  const bloom=ctx.createRadialGradient(bx,by,0,bx,by,maxSide*0.64);
  bloom.addColorStop(0,"rgba(240,198,142,0.24)");
  bloom.addColorStop(0.30,"rgba(178,118,76,0.11)");
  bloom.addColorStop(0.68,"rgba(78,50,40,0.03)");
  bloom.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=bloom;
  ctx.fillRect(0,0,w,h);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation="screen";
  for(let i=0;i<CFG.atmos.length;i++){
    const a=CFG.atmos[i];
    const drift=Math.sin(t*0.05+a.ph)*0.02;
    const ax=w*(a.x+drift)+px*minSide*0.01*(0.5+a.b);
    const ay=h*(a.y+Math.cos(t*0.04+a.ph)*0.015)+py*minSide*0.01;
    const n=fbm(a.x*3+t*0.03,a.y*3-t*0.02,3);
    const amp=Math.max(0,0.5+n*0.5);
    const rr=minSide*a.r*(0.7+amp*0.6);
    const al=A((0.010+a.b*0.024)*amp);
    const g=ctx.createRadialGradient(ax,ay,0,ax,ay,Math.max(1,rr));
    g.addColorStop(0,"rgba(214,158,102,"+al+")");
    g.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=g;
    ctx.fillRect(ax-rr,ay-rr,rr*2,rr*2);
  }
  ctx.restore();

  for(let ri=0;ri<CFG.RN;ri++){
    const r=CFG.ribbons[ri];
    const dep=r.depth;
    const chW=live*storyStepWeight(story,ri,CFG.RN);
    r.chW=chW;
    const xShift=px*minSide*0.03*(0.35+dep)+scrollV*minSide*(0.02+dep*0.01);
    const nomTh=minSide*r.thick;

    ctx.save();
    ctx.shadowColor="rgba(0,0,0,0.55)";
    ctx.shadowBlur=minSide*(0.012+dep*0.010);
    ctx.shadowOffsetY=minSide*0.014;
    traceRegion(r,-1,1,xShift);
    ctx.fillStyle="rgba(6,4,4,0.5)";
    ctx.fill();
    ctx.restore();

    const ba=0.62+dep*0.2+chW*0.10;
    const body=ctx.createLinearGradient(xL+xShift,0,xR+xShift,0);
    body.addColorStop(0,"rgba(52,33,23,0)");
    body.addColorStop(0.14,"rgba(104,66,42,"+A(ba*0.55)+")");
    body.addColorStop(0.40,"rgba(176,126,80,"+A(ba*0.9)+")");
    body.addColorStop(0.66,"rgba(224,176,120,"+A(ba)+")");
    body.addColorStop(0.88,"rgba(246,206,152,"+A(ba)+")");
    body.addColorStop(1,"rgba(255,232,196,"+A(ba*0.92)+")");
    traceRegion(r,-1,1,xShift);
    ctx.fillStyle=body;
    ctx.fill();

    strokeFrac(r,0.60,xShift,"rgba(34,20,13,"+A(0.34+dep*0.10)+")",nomTh*0.95);
    strokeFrac(r,0.90,xShift,"rgba(20,11,7,"+A(0.46+dep*0.10)+")",nomTh*0.42);

    ctx.save();
    ctx.globalCompositeOperation="lighter";
    const sh=0.5+0.5*Math.sin(t*0.5+r.phase2);
    const specM=chW*0.05+scrollMag*0.04;
    const spec=(peak: number)=>{
      const p=A(peak);
      const g=ctx.createLinearGradient(xL+xShift,0,xR+xShift,0);
      g.addColorStop(0,"rgba(255,236,205,0)");
      g.addColorStop(0.30,"rgba(255,234,200,"+A(p*0.4)+")");
      g.addColorStop(0.62,"rgba(255,239,208,"+p+")");
      g.addColorStop(0.90,"rgba(255,230,192,"+A(p*0.6)+")");
      g.addColorStop(1,"rgba(255,230,192,0)");
      return g;
    };
    strokeFrac(r,-0.30,xShift,spec(0.11+0.05*sh),nomTh*1.25);
    strokeFrac(r,-0.40,xShift,spec(0.19+0.08*sh),nomTh*0.62);
    strokeFrac(r,-0.47,xShift,spec(0.29+0.09*sh+specM),nomTh*0.24);
    const rim=ctx.createLinearGradient(xL+xShift,0,xR+xShift,0);
    rim.addColorStop(0,"rgba(255,224,178,0)");
    rim.addColorStop(0.55,"rgba(255,228,186,"+A(0.09+dep*0.05)+")");
    rim.addColorStop(1,"rgba(255,236,200,"+A(0.12+dep*0.05)+")");
    strokeFrac(r,-0.88,xShift,rim,nomTh*0.20);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation="lighter";
    const gAmp=1+(ri===activeIdx?impulse*0.5:0);
    for(let k=0;k<r.glints.length;k++){
      const gl=r.glints[k];
      const u=(gl.u0+t*gl.sp)%1;
      const x=px_(u,xShift);
      const y=cy(r,u)+thAt(r,u)*(-0.40);
      const pulse=0.5+0.5*Math.sin(t*gl.pr+gl.ph);
      const edge=Math.sin(u*Math.PI);
      const bright=pulse*pulse*edge*(0.4+0.6*u)*gAmp;
      if(bright>0.10){
        const rr=nomTh*(1.0+1.3*gl.sz)*(0.6+0.4*pulse);
        softGlow(ctx,x,y,rr,"rgba(255,240,208,"+A(0.34*bright)+")","rgba(0,0,0,0)");
        if(bright>0.34){
          softGlow(ctx,x,y,rr*0.42,"rgba(255,236,198,"+A(0.42*bright)+")","rgba(0,0,0,0)");
        }
      }
    }
    ctx.restore();
  }

  ctx.save();
  ctx.globalCompositeOperation="screen";
  for(let i=0;i<CFG.motes.length;i++){
    const m=CFG.motes[i];
    const dep=0.3+m.depth*0.7;
    const mxp=w*(0.42+m.x*0.6)-px*minSide*0.02*dep;
    const myp=m.y*h+Math.sin(t*(0.05+dep*0.04)+m.ph)*h*0.02-py*minSide*0.02*dep;
    const rad=minSide*(0.0006+m.r*0.0016*dep);
    const tw=0.4+0.6*(0.5+0.5*Math.sin(t*(0.6+m.bright)+m.ph*3));
    if(m.bright>0.72){
      softGlow(ctx,mxp,myp,rad*7,"rgba(255,232,196,"+A(0.10*tw)+")","rgba(0,0,0,0)");
    }
    ctx.beginPath();
    ctx.arc(mxp,myp,Math.max(0.2,rad),0,TAU);
    ctx.fillStyle="rgba(255,226,188,"+A((0.12+dep*0.16)*tw)+")";
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation="screen";
  softGlow(ctx,bx,by,maxSide*0.17,"rgba(255,226,180,"+A(0.10+impulse*0.12)+")","rgba(0,0,0,0)");
  softGlow(ctx,w*0.9,h*0.62,maxSide*0.11,"rgba(240,190,140,0.08)","rgba(0,0,0,0)");
  softGlow(ctx,w*0.66,h*0.30,maxSide*0.09,"rgba(230,175,120,0.06)","rgba(0,0,0,0)");
  ctx.restore();

  if(M.hasFocus){
    const fx=finiteClamp(M.focusX,0,1,0.5)*w;
    const fy=finiteClamp(M.focusY,0,1,0.5)*h;
    const fa=0.07+impulse*0.13;
    ctx.save();
    ctx.globalCompositeOperation="screen";
    softGlow(ctx,fx,fy,minSide*0.11,"rgba(255,226,182,"+A(fa)+")","rgba(0,0,0,0)");
    softGlow(ctx,fx,fy,minSide*0.05,"rgba(255,236,204,"+A(fa*0.85)+")","rgba(0,0,0,0)");
    ctx.restore();
  }

  const lane=ctx.createLinearGradient(0,0,w*0.66,0);
  lane.addColorStop(0,"rgba(6,4,6,0.85)");
  lane.addColorStop(0.45,"rgba(7,5,7,0.55)");
  lane.addColorStop(0.78,"rgba(7,5,7,0.2)");
  lane.addColorStop(1,"rgba(7,5,7,0)");
  ctx.fillStyle=lane;
  ctx.fillRect(0,0,w*0.68,h);

  const vig=ctx.createRadialGradient(w*0.78,h*0.44,minSide*0.2,w*0.66,h*0.5,maxSide*0.82);
  vig.addColorStop(0,"rgba(0,0,0,0)");
  vig.addColorStop(0.7,"rgba(2,1,2,0.18)");
  vig.addColorStop(1,"rgba(0,0,0,0.6)");
  ctx.fillStyle=vig;
  ctx.fillRect(0,0,w,h);

  ctx.restore();
};
