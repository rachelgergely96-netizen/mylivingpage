import { createSeededRandom } from "../shared/random";
import { finiteClamp, resolveThemeMotion, storyStepWeight } from "../shared/motion";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

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
      chW:0
    });
  }
  return {RN,ribbons};
})();

export const renderLustre: ThemeRenderer = (ctx,w,h,timeValue,mx,my,_deltaSeconds,motion)=>{
  const M=resolveThemeMotion(motion);
  const reduced=motion?.reducedMotion===true;
  const t=reduced?0:timeValue;
  const minSide=Math.min(w,h);
  const maxSide=Math.max(w,h);
  const px=mx-0.5, py=my-0.5;
  const NSEG=20;
  const xL=w*0.40, xR=w*1.10;
  const span=xR-xL;
  const A=(v: number)=>finiteClamp(v,0,1);
  const story=A(M.storyProgress);
  const scrollV=reduced?0:finiteClamp(M.scrollVelocity/4,-1,1);
  const impulse=A(M.interactionImpulse);
  const hasStory=M.sectionCount>0;
  const live=hasStory?1:0;
  const storyFlow=story*0.8;
  const activeIdx=hasStory?Math.round(story*(CFG.RN-1)):2;
  let rakeU=hasStory
    ? 0.14+story*0.72+(reduced?0:Math.sin(t*TAU/21)*0.025)
    : 0.5+Math.sin(t*TAU/21)*0.36;
  if(M.hasFocus){
    const focusU=finiteClamp((M.focusX-0.4)/0.7,0,1,0.5);
    rakeU+=(focusU-rakeU)*0.30;
  }
  rakeU=finiteClamp(rakeU+scrollV*0.025,0.14,0.86,0.5);

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
  bloom.addColorStop(0,"rgba(240,198,142,0.14)");
  bloom.addColorStop(0.30,"rgba(178,118,76,0.07)");
  bloom.addColorStop(0.68,"rgba(78,50,40,0.02)");
  bloom.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=bloom;
  ctx.fillRect(0,0,w,h);
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
    ctx.globalCompositeOperation="screen";
    if(ri===activeIdx){
      const focusLift=M.hasFocus?0.03+impulse*0.02:0;
      const broadPeak=finiteClamp(0.06+chW*0.03,0,0.10,0.06);
      const corePeak=finiteClamp(0.16+chW*0.04+focusLift,0,0.24,0.16);
      const spec=(peak: number)=>{
      const g=ctx.createLinearGradient(xL+xShift,0,xR+xShift,0);
        g.addColorStop(0,"rgba(255,236,205,0)");
        g.addColorStop(rakeU-0.12,"rgba(255,236,205,0)");
        g.addColorStop(rakeU-0.035,`rgba(255,234,200,${peak*0.42})`);
        g.addColorStop(rakeU,`rgba(255,239,208,${peak})`);
        g.addColorStop(rakeU+0.035,`rgba(255,234,200,${peak*0.42})`);
        g.addColorStop(rakeU+0.12,"rgba(255,230,192,0)");
        g.addColorStop(1,"rgba(255,230,192,0)");
        return g;
      };
      strokeFrac(r,-0.38,xShift,spec(broadPeak),nomTh*0.60);
      strokeFrac(r,-0.46,xShift,spec(corePeak),nomTh*0.18);
    }
    const rim=ctx.createLinearGradient(xL+xShift,0,xR+xShift,0);
    rim.addColorStop(0,"rgba(255,224,178,0)");
    rim.addColorStop(0.55,"rgba(255,228,186,"+A(0.09+dep*0.05)+")");
    rim.addColorStop(1,"rgba(255,236,200,"+A(0.12+dep*0.05)+")");
    strokeFrac(r,-0.88,xShift,rim,nomTh*0.20);
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
