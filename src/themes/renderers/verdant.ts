import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { finiteClamp, resolveThemeMotion, storyStepWeight } from "../shared/motion";
import { softGlow } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

type VerdantPoint = [number, number];

interface VerdantGradientCache {
  ms: number;
  heroBody: CanvasGradient[];
  brSide: CanvasGradient[];
  brTip: CanvasGradient[];
}

const CFG=(function(){
  const rnd=createSeededRandom(48213);
  const MV_L: VerdantPoint[]=[
    [0.54,1.06],
    [0.575,0.76],[0.60,0.44],[0.70,0.26],
    [0.81,0.13],[0.895,0.05],[0.90,0.19]
  ];
  const MV_R: VerdantPoint[]=[
    [0.965,1.06],
    [0.99,0.74],[0.955,0.45],[0.935,0.30],
    [0.905,0.17],[0.875,0.085],[0.85,0.20]
  ];
  const HERO=[
    {x:0.57,y:0.72,len:0.1,ang:-1.12,hue:126,sat:46,depth:0.52},
    {x:0.62,y:0.57,len:0.11,ang:-2.22,hue:112,sat:50,depth:0.68},
    {x:0.67,y:0.42,len:0.092,ang:-0.92,hue:135,sat:44,depth:0.58},
    {x:0.73,y:0.29,len:0.107,ang:-2.38,hue:105,sat:52,depth:0.76},
    {x:0.82,y:0.2,len:0.118,ang:-1.1,hue:123,sat:48,depth:0.88},
    {x:0.91,y:0.28,len:0.095,ang:0.08,hue:98,sat:54,depth:0.72},
    {x:0.88,y:0.43,len:0.126,ang:-0.12,hue:130,sat:46,depth:0.94},
    {x:0.93,y:0.59,len:0.11,ang:0.32,hue:114,sat:50,depth:0.82},
    {x:0.86,y:0.7,len:0.136,ang:0.76,hue:128,sat:47,depth:1},
    {x:0.74,y:0.76,len:0.115,ang:1.93,hue:104,sat:52,depth:0.78},
    {x:0.64,y:0.84,len:0.105,ang:-2.48,hue:138,sat:45,depth:0.7},
    {x:0.78,y:0.51,len:0.09,ang:2.66,hue:119,sat:49,depth:0.62},
    {x:0.7,y:0.63,len:0.082,ang:2.95,hue:145,sat:43,depth:0.55},
    {x:0.83,y:0.34,len:0.079,ang:2.33,hue:110,sat:51,depth:0.64},
    {x:0.8,y:0.62,len:0.1,ang:1.2,hue:120,sat:48,depth:0.85},
    {x:0.9,y:0.5,len:0.088,ang:-0.5,hue:108,sat:52,depth:0.9}
  ];
  const BRANCHES=[];
  for(let i=0;i<7;i++){
    BRANCHES.push({
      vine:i%2,
      au:0.22+rnd()*0.58,
      side:(rnd()>0.5?1:-1),
      len:0.15+rnd()*0.15,
      wBase:0.0075+rnd()*0.004,
      wTip:0.001+rnd()*0.001,
      sp:0.028+rnd()*0.03,
      phase:rnd()*TAU,
      curl:(rnd()-0.5)*0.55,
      lift:0.2+rnd()*0.35,
      hue:108+rnd()*32,
      sat:44+rnd()*12,
      tipHue:104+rnd()*26
    });
  }
  const CANOPY=[];
  for(let i=0;i<52;i++){
    const layer=i<24?0:(i<40?1:2);
    CANOPY.push({
      x:0.16+rnd()*0.84,
      y:rnd()*0.96,
      len:0.016+rnd()*0.03+layer*0.008,
      ang:rnd()*TAU,
      hue:96+rnd()*52,
      sat:26+rnd()*30,
      lig:10+rnd()*(14+layer*8),
      alpha:(layer===0?0.16:layer===1?0.28:0.4)+rnd()*0.12,
      depth:0.2+layer*0.32+rnd()*0.14,
      layer:layer,
      phase:rnd()*TAU,
      sway:0.15+rnd()*0.5,
      vein:rnd()>0.6
    });
  }
  const MASSES=[];
  for(let i=0;i<7;i++){
    MASSES.push({x:0.42+rnd()*0.58,y:rnd()*0.64,r:0.16+rnd()*0.2,hue:118+rnd()*34,drift:rnd()*TAU,sp:0.008+rnd()*0.02,alpha:0.06+rnd()*0.08});
  }
  const DAPPLE=[];
  for(let i=0;i<22;i++){
    DAPPLE.push({x:0.35+rnd()*0.62,y:rnd()*0.82,r:0.05+rnd()*0.1,a:0.06+rnd()*0.1,nx:rnd()*8,ny:rnd()*8,sp:0.02+rnd()*0.04});
  }
  const TRUNKS=[];
  for(let i=0;i<10;i++){
    TRUNKS.push({base:0.4+i*0.062+(rnd()-0.5)*0.03,lean:(rnd()-0.5)*0.05,hue:78+rnd()*34,alpha:0.035+rnd()*0.05,w:0.005+rnd()*0.008,ph:rnd()*TAU});
  }
  const RAIN=[];
  for(let i=0;i<34;i++){
    const layer=i<20?0:1;
    RAIN.push({x:0.36+rnd()*0.62,seed:rnd(),len:0.006+rnd()*0.018+layer*0.006,speed:0.05+rnd()*0.1+layer*0.05,tilt:0.06+rnd()*0.1,layer:layer,alpha:0.02+rnd()*0.05+layer*0.02,w:0.4+rnd()*0.6+layer*0.3});
  }
  const POLLEN=[];
  for(let i=0;i<20;i++){
    POLLEN.push({x:rnd(),y:rnd(),r:0.0016+rnd()*0.0034,sp:0.02+rnd()*0.05,phase:rnd()*TAU,amp:0.008+rnd()*0.028,hue:66+rnd()*44,alpha:0.14+rnd()*0.34,depth:0.3+rnd()*0.7,rise:0.01+rnd()*0.03});
  }
  const FLIES=[];
  for(let i=0;i<20;i++){
    FLIES.push({sx:rnd(),sy:rnd(),depth:0.3+rnd()*0.7,sp:0.045+rnd()*0.06,phase:rnd()*TAU,pulseSp:0.18+rnd()*0.4,pulsePh:rnd()*TAU,bright:rnd(),dx:0.01+rnd()*0.02,dy:0.008+rnd()*0.018});
  }
  const FG=[];
  for(let i=0;i<3;i++){
    FG.push({x:(i%2===0?0.1+rnd()*0.12:0.83+rnd()*0.14),y:0.9+rnd()*0.12,len:0.24+rnd()*0.16,ang:(i%2===0?-0.6:-2.4)+(rnd()-0.5)*0.3,hue:120+rnd()*24,sp:0.02+rnd()*0.02,phase:rnd()*TAU});
  }
  return {MV_L,MV_R,HERO,BRANCHES,CANOPY,MASSES,DAPPLE,TRUNKS,RAIN,POLLEN,FLIES,FG};
})();

// Persistent gradient cache for the static per-leaf gradients (hero bodies and
// branch leaflets). Rebuilt only when the device size changes, then reused every
// frame — canvas gradients apply the current transform at paint time, so a single
// cached gradient in local blade space paints correctly under each leaf's CTM.
const GC: VerdantGradientCache={ms:-1,heroBody:[],brSide:[],brTip:[]};

export const renderVerdant: ThemeRenderer = (ctx,w,h,t,mx,my,_deltaSeconds,motion)=>{
  const M=resolveThemeMotion(motion);
  const vel=finiteClamp(M.scrollVelocity/4,-1,1);
  const story=M.storyProgress;
  const minSide=Math.min(w,h);
  const maxSide=Math.max(w,h);
  const px=finiteClamp(mx,0,1,0.5)-0.5;
  const py=finiteClamp(my,0,1,0.5)-0.5;
  const portalX=w*0.82+px*minSide*0.03;
  const portalY=h*0.44+py*minSide*0.02;

  // Density gating: fewer elements on small backing stores so mid-range phones
  // keep 30fps under the added HD downsample + bloom pass.
  const small=minSide<820;
  const dappleN=small?13:CFG.DAPPLE.length;
  const flyN=small?12:CFG.FLIES.length;
  const pollenN=small?13:CFG.POLLEN.length;

  // (Re)build the cached static gradients on first frame / after a resize.
  if(GC.ms!==minSide){
    GC.ms=minSide;
    GC.heroBody=[];GC.brSide=[];GC.brTip=[];
    for(let i=0;i<CFG.HERO.length;i++){
      const lf=CFG.HERO[i];
      const len=lf.len*minSide;
      const wd=len*(0.34+lf.depth*0.1);
      const g=ctx.createLinearGradient(0,-wd,len,wd);
      // Static body approximates the mean pulse brightness (+6/+4 lightness); the
      // per-frame shimmer now rides only on the capped screen highlight + vein.
      g.addColorStop(0,"hsla("+(lf.hue+14)+","+(lf.sat+16)+"%,"+(32+lf.depth*16)+"%,"+(0.5+lf.depth*0.4)+")");
      g.addColorStop(0.5,"hsla("+lf.hue+","+(lf.sat+10)+"%,"+(22+lf.depth*12)+"%,"+(0.6+lf.depth*0.36)+")");
      g.addColorStop(1,"hsla("+(lf.hue-14)+","+(lf.sat+20)+"%,"+(11+lf.depth*8)+"%,"+(0.42+lf.depth*0.36)+")");
      GC.heroBody.push(g);
    }
    for(let i=0;i<CFG.BRANCHES.length;i++){
      const b=CFG.BRANCHES[i];
      const L=b.len*minSide;
      let len=L*0.4,dep=0.7,hue=b.hue+6,sat=b.sat,wd=len*(0.4+dep*0.12);
      let g=ctx.createLinearGradient(0,-wd,len,wd);
      g.addColorStop(0,"hsla("+(hue+12)+","+(sat+14)+"%,"+(24+dep*14)+"%,0.92)");
      g.addColorStop(0.55,"hsla("+hue+","+(sat+8)+"%,"+(16+dep*10)+"%,0.94)");
      g.addColorStop(1,"hsla("+(hue-12)+","+(sat+18)+"%,"+(11+dep*7)+"%,0.94)");
      GC.brSide.push(g);
      len=L*0.5;dep=0.82;hue=b.tipHue;sat=b.sat+4;wd=len*(0.4+dep*0.12);
      g=ctx.createLinearGradient(0,-wd,len,wd);
      g.addColorStop(0,"hsla("+(hue+12)+","+(sat+14)+"%,"+(24+dep*14)+"%,0.92)");
      g.addColorStop(0.55,"hsla("+hue+","+(sat+8)+"%,"+(16+dep*10)+"%,0.94)");
      g.addColorStop(1,"hsla("+(hue-12)+","+(sat+18)+"%,"+(11+dep*7)+"%,0.94)");
      GC.brTip.push(g);
    }
  }

  const cubic=(a: number,b: number,c: number,d: number,u: number)=>{const v=1-u;return v*v*v*a+3*v*v*u*b+3*v*u*u*c+u*u*u*d;};
  const sampleChain=(P: VerdantPoint[],u: number): VerdantPoint=>{
    const segs=(P.length-1)/3;
    const s=u*segs;
    let seg=Math.floor(s);
    if(seg>=segs)seg=segs-1;
    if(seg<0)seg=0;
    const lu=s-seg;
    const i=seg*3;
    return [cubic(P[i][0],P[i+1][0],P[i+2][0],P[i+3][0],lu),
            cubic(P[i][1],P[i+1][1],P[i+2][1],P[i+3][1],lu)];
  };
  const buildChain=(U: VerdantPoint[],swayAmt: number)=>{
    const P: VerdantPoint[]=[];
    for(let k=0;k<U.length;k++){
      const uy=U[k][1];
      const s=swayAmt*Math.max(0,1-uy);
      P.push([U[k][0]*w+s,uy*h]);
    }
    return P;
  };
  const ribbon=(P: VerdantPoint[],wBase: number,wTip: number,steps: number,c0: string,c1: string,c2: string,litA: number,glow: number)=>{
    const L: VerdantPoint[]=[],R: VerdantPoint[]=[];
    for(let k=0;k<=steps;k++){
      const u=k/steps;
      const p=sampleChain(P,u);
      const pf=sampleChain(P,Math.min(1,u+0.01));
      const pb=sampleChain(P,Math.max(0,u-0.01));
      const dx=pf[0]-pb[0],dy=pf[1]-pb[1];
      const dl=Math.hypot(dx,dy)||1;
      const nx=-dy/dl,ny=dx/dl;
      const sm=u*u*(3-2*u);
      let wid=wBase+(wTip-wBase)*sm;
      wid*=0.9+0.12*Math.sin(u*10.5+P[0][0]*0.013);
      if(wid<0.4)wid=0.4;
      L.push([p[0]+nx*wid,p[1]+ny*wid]);
      R.push([p[0]-nx*wid,p[1]-ny*wid]);
    }
    const b0=sampleChain(P,0),b1=sampleChain(P,1);
    const g=ctx.createLinearGradient(b0[0],b0[1],b1[0],b1[1]);
    g.addColorStop(0,c0);
    g.addColorStop(0.5,c1);
    g.addColorStop(1,c2);
    ctx.save();
    if(glow>0){ctx.shadowColor="rgba(103,180,90,0.3)";ctx.shadowBlur=glow;}
    ctx.beginPath();
    ctx.moveTo(L[0][0],L[0][1]);
    for(let k=1;k<L.length;k++)ctx.lineTo(L[k][0],L[k][1]);
    for(let k=R.length-1;k>=0;k--)ctx.lineTo(R[k][0],R[k][1]);
    ctx.closePath();
    ctx.fillStyle=g;
    ctx.fill();
    ctx.restore();
    if(litA>0){
      ctx.save();
      ctx.globalCompositeOperation="screen";
      ctx.beginPath();
      ctx.moveTo(L[0][0],L[0][1]);
      for(let k=1;k<L.length;k++)ctx.lineTo(L[k][0],L[k][1]);
      ctx.strokeStyle="rgba(172,224,152,"+litA+")";
      ctx.lineWidth=Math.max(0.6,wBase*0.4);
      ctx.lineCap="round";
      ctx.lineJoin="round";
      ctx.stroke();
      ctx.restore();
    }
  };
  // Branch leaflet: filled blade (cached gradient) + soft midrib.
  const leaflet=(x: number,y: number,len: number,ang: number,dep: number,grad: CanvasGradient)=>{
    const wd=len*(0.4+dep*0.12);
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.bezierCurveTo(len*0.24,-wd,len*0.74,-wd*0.7,len,0);
    ctx.bezierCurveTo(len*0.72,wd*0.82,len*0.22,wd*0.74,0,0);
    ctx.closePath();
    ctx.fillStyle=grad;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(len*0.05,0);
    ctx.quadraticCurveTo(len*0.5,-wd*0.04,len*0.92,0);
    ctx.strokeStyle="rgba(178,216,146,"+(0.16+dep*0.2)+")";
    ctx.lineWidth=0.5+dep*0.4;
    ctx.stroke();
    ctx.restore();
  };
  const placeLeaf=(P: VerdantPoint[],u: number,sideSign: number,size: number,dep: number,grad: CanvasGradient)=>{
    const p=sampleChain(P,u);
    const pf=sampleChain(P,Math.min(1,u+0.03));
    const pb=sampleChain(P,Math.max(0,u-0.03));
    const ang0=Math.atan2(pf[1]-pb[1],pf[0]-pb[0]);
    leaflet(p[0],p[1],size,ang0+sideSign*0.85,dep,grad);
  };

  const smallLeaf=(x: number,y: number,len: number,ang: number,fill: string,veinA: number)=>{
    const wd=len*0.42;
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.bezierCurveTo(len*0.28,-wd,len*0.76,-wd*0.66,len,0);
    ctx.bezierCurveTo(len*0.72,wd*0.78,len*0.24,wd*0.72,0,0);
    ctx.closePath();
    ctx.fillStyle=fill;
    ctx.fill();
    if(veinA>0){
      ctx.beginPath();
      ctx.moveTo(len*0.06,0);
      ctx.quadraticCurveTo(len*0.5,0,len*0.9,0);
      ctx.strokeStyle="rgba(154,200,124,"+veinA+")";
      ctx.lineWidth=0.4;
      ctx.stroke();
    }
    ctx.restore();
  };

  // Hero leaf: cached body gradient + capped screen highlight/vein so the
  // bright-pass bloom cannot blow the mid-lane blades to white.
  const heroLeaf=(x: number,y: number,len: number,ang: number,depth: number,pulse: number,lit: number,body: CanvasGradient)=>{
    const wd=len*(0.34+depth*0.1);
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.bezierCurveTo(len*0.26,-wd,len*0.78,-wd*0.72,len,0);
    ctx.bezierCurveTo(len*0.72,wd*0.82,len*0.22,wd*0.76,0,0);
    ctx.closePath();
    ctx.fillStyle=body;
    ctx.fill();
    ctx.save();
    ctx.globalCompositeOperation="screen";
    ctx.beginPath();
    ctx.moveTo(len*0.07,0);
    ctx.bezierCurveTo(len*0.32,-wd*0.4,len*0.66,-wd*0.32,len*0.9,0);
    ctx.bezierCurveTo(len*0.66,wd*0.2,len*0.32,wd*0.24,len*0.07,0);
    ctx.closePath();
    const hl=ctx.createLinearGradient(0,0,len,0);
    const hlPeak=Math.min(0.2,0.05+depth*0.08+pulse*0.1+lit*0.06);
    hl.addColorStop(0,"rgba(150,214,140,"+Math.min(0.12,0.03+pulse*0.08)+")");
    hl.addColorStop(0.6,"rgba(188,226,150,"+hlPeak+")");
    hl.addColorStop(1,"rgba(120,190,110,0)");
    ctx.fillStyle=hl;
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(len*0.03,0);
    ctx.quadraticCurveTo(len*0.53,-wd*0.05,len*0.94,0);
    ctx.strokeStyle="rgba(198,232,158,"+Math.min(0.34,0.12+depth*0.2+pulse*0.16+lit*0.1)+")";
    ctx.lineWidth=0.5+depth*0.6;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(len*0.5,0);
    ctx.lineTo(len*0.64,-wd*0.4);
    ctx.moveTo(len*0.5,0);
    ctx.lineTo(len*0.62,wd*0.34);
    ctx.strokeStyle="rgba(176,214,144,"+(0.05+depth*0.06)+")";
    ctx.lineWidth=0.4;
    ctx.stroke();
    ctx.restore();
  };

  ctx.save();

  // Depth grade over the pre-painted background.
  const grade=ctx.createLinearGradient(0,0,w,h);
  grade.addColorStop(0,"rgba(3,15,8,0.5)");
  grade.addColorStop(0.5,"rgba(7,24,14,0.12)");
  grade.addColorStop(1,"rgba(2,9,5,0.62)");
  ctx.fillStyle=grade;
  ctx.fillRect(0,0,w,h);

  // Luminous canopy bloom behind the portal (soft round glow; grows subtly with
  // page-story progress).
  ctx.save();
  ctx.globalCompositeOperation="screen";
  const bloomR=minSide*(0.72+story*0.05);
  const bloom=ctx.createRadialGradient(portalX,h*0.3,minSide*0.02,portalX,portalY,bloomR);
  bloom.addColorStop(0,"rgba(150,212,141,"+Math.min(0.26,0.24+story*0.04)+")");
  bloom.addColorStop(0.34,"rgba(74,152,92,0.11)");
  bloom.addColorStop(0.7,"rgba(28,80,45,0.04)");
  bloom.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=bloom;
  ctx.fillRect(0,0,w,h);
  ctx.restore();

  // Soft canopy masses (round blooms) establish humid depth.
  for(let i=0;i<CFG.MASSES.length;i++){
    const m=CFG.MASSES[i];
    const cx=m.x*w+Math.sin(t*m.sp+m.drift)*minSide*0.03-px*minSide*0.02;
    const cy=m.y*h+Math.cos(t*m.sp*0.8+m.drift)*minSide*0.02-py*minSide*0.015;
    const r=Math.max(1,m.r*maxSide);
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
    g.addColorStop(0,"hsla("+m.hue+",46%,19%,"+m.alpha+")");
    g.addColorStop(0.55,"hsla("+(m.hue-8)+",52%,12%,"+(m.alpha*0.5)+")");
    g.addColorStop(1,"hsla(140,50%,7%,0)");
    ctx.fillStyle=g;
    ctx.beginPath();
    ctx.arc(cx,cy,r,0,TAU);
    ctx.fill();
  }

  // Drifting caustic light pools (soft round glows / gradients only).
  ctx.save();
  ctx.globalCompositeOperation="screen";
  for(let i=0;i<dappleN;i++){
    const d=CFG.DAPPLE[i];
    const n=fbm(d.nx+t*d.sp,d.ny-t*d.sp*0.6,3);
    const a=Math.max(0,n)*d.a;
    if(a<0.004)continue;
    const cx=d.x*w+Math.sin(t*0.05+d.nx)*minSide*0.01;
    const cy=d.y*h+Math.cos(t*0.04+d.ny)*minSide*0.01;
    const r=Math.max(1,d.r*minSide);
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
    g.addColorStop(0,"rgba(176,224,138,"+a+")");
    g.addColorStop(1,"rgba(120,190,110,0)");
    ctx.fillStyle=g;
    ctx.beginPath();
    ctx.arc(cx,cy,r,0,TAU);
    ctx.fill();
  }
  ctx.restore();

  // Distant trunks.
  for(let i=0;i<CFG.TRUNKS.length;i++){
    const tr=CFG.TRUNKS[i];
    const x=tr.base*w-px*minSide*0.01;
    const swayT=Math.sin(t*0.025+tr.ph)*minSide*0.008;
    ctx.beginPath();
    ctx.moveTo(x,h*1.04);
    ctx.bezierCurveTo(x-minSide*0.025+tr.lean*w*0.4,h*0.7,x+swayT+minSide*0.018,h*0.33,x+swayT+tr.lean*w,-h*0.04);
    ctx.strokeStyle="hsla("+tr.hue+",34%,26%,"+tr.alpha+")";
    ctx.lineWidth=Math.max(0.5,minSide*tr.w);
    ctx.lineCap="round";
    ctx.stroke();
  }

  // Back canopy leaves.
  for(let i=0;i<CFG.CANOPY.length;i++){
    if(small&&(i&3)===3)continue;
    const c=CFG.CANOPY[i];
    if(c.layer===2)continue;
    const flutter=Math.sin(t*c.sway+c.phase)*(0.04+c.depth*0.05);
    const x=c.x*w-px*minSide*0.02*c.depth;
    const y=c.y*h-py*minSide*0.015*c.depth+Math.sin(t*c.sway*0.7+c.phase)*minSide*0.004;
    const fill="hsla("+c.hue+","+c.sat+"%,"+c.lig+"%,"+c.alpha+")";
    smallLeaf(x,y,c.len*minSide,c.ang+flutter,fill,c.vein?0.05+c.depth*0.05:0);
  }

  // Two climbing tapered vines form the portal arch; sway scales with scroll.
  const swayL=Math.sin(t*0.04+0.4)*minSide*0.022+vel*minSide*0.012;
  const swayR=Math.sin(t*0.038+2.3)*minSide*0.02+vel*minSide*0.012;
  const chainL=buildChain(CFG.MV_L,swayL);
  const chainR=buildChain(CFG.MV_R,swayR);
  ribbon(chainL,minSide*0.022,minSide*0.0035,22,"rgba(20,54,26,0.96)","rgba(56,112,52,0.95)","rgba(74,132,72,0.82)",0.22,minSide*0.03);
  ribbon(chainR,minSide*0.02,minSide*0.0035,22,"rgba(18,50,25,0.96)","rgba(52,106,50,0.95)","rgba(70,126,68,0.82)",0.2,minSide*0.028);

  // Branch stems grow off the vines and terminate in leaflet clusters. Story
  // sequentially lights the growth-point glows; impulse gives a brief flare.
  for(let i=0;i<CFG.BRANCHES.length;i++){
    const b=CFG.BRANCHES[i];
    const MV=b.vine?chainR:chainL;
    const anc=sampleChain(MV,b.au);
    const af=sampleChain(MV,Math.min(1,b.au+0.02));
    const ab=sampleChain(MV,Math.max(0,b.au-0.02));
    let tx=af[0]-ab[0],ty=af[1]-ab[1];
    const tl=Math.hypot(tx,ty)||1;tx/=tl;ty/=tl;
    const nx=-ty*b.side,ny=tx*b.side;
    const L=b.len*minSide;
    const sway=Math.sin(t*b.sp+b.phase)*minSide*0.012+vel*minSide*0.009;
    const curl=b.curl*L;
    const P: VerdantPoint[]=[
      [anc[0],anc[1]],
      [anc[0]+tx*L*0.22+nx*L*0.32,anc[1]+ty*L*0.22+ny*L*0.32],
      [anc[0]+nx*L*0.72+tx*L*0.08+sway,anc[1]+ny*L*0.72+ty*L*0.08-L*b.lift*0.6],
      [anc[0]+nx*L*0.98+curl+sway*1.3,anc[1]+ny*L*0.98-L*b.lift]
    ];
    ribbon(P,minSide*b.wBase,minSide*b.wTip,9,"hsla("+b.hue+",44%,15%,0.94)","hsla("+b.hue+",48%,24%,0.92)","hsla("+(b.hue-8)+",50%,20%,0.78)",0.16,0);
    placeLeaf(P,0.56,b.side,L*0.4,0.7,GC.brSide[i]);
    const tip=sampleChain(P,1);
    const tf=sampleChain(P,0.94);
    const tang=Math.atan2(tip[1]-tf[1],tip[0]-tf[0]);
    leaflet(tip[0],tip[1],L*0.5,tang,0.82,GC.brTip[i]);
    const bw=M.sectionCount>0?storyStepWeight(story,i,CFG.BRANCHES.length):0;
    const pg=0.5+0.5*Math.sin(t*0.5+b.phase);
    const tipA=Math.min(0.3,0.12+pg*0.16+bw*0.12+M.interactionImpulse*0.1);
    ctx.save();
    ctx.globalCompositeOperation="screen";
    softGlow(ctx,tip[0],tip[1],minSide*(0.008+pg*0.006+bw*0.004),"rgba(206,238,150,"+tipA+")","transparent");
    ctx.restore();
  }

  // Fine drifting rain; fall speed nudged gently by scroll velocity.
  ctx.save();
  ctx.lineCap="round";
  for(let i=0;i<CFG.RAIN.length;i++){
    const rn=CFG.RAIN[i];
    const prog=((rn.seed+t*rn.speed*(1+vel*0.4))%1+1)%1;
    const x=rn.x*w+px*minSide*0.02*(rn.layer+0.5);
    const y=prog*h*1.1-h*0.05;
    const len=rn.len*minSide;
    ctx.beginPath();
    ctx.moveTo(x,y);
    ctx.lineTo(x-len*rn.tilt,y+len);
    ctx.strokeStyle="rgba(186,226,190,"+rn.alpha+")";
    ctx.lineWidth=rn.w;
    ctx.stroke();
  }
  ctx.restore();

  // Authored hero leaves around the portal. Story lifts + lights them; a focused
  // resume item brightens the nearest blades.
  for(let i=0;i<CFG.HERO.length;i++){
    const lf=CFG.HERO[i];
    const flutter=Math.sin(t*(0.04+lf.depth*0.02)+i*1.27)*(0.012+lf.depth*0.018)+vel*0.018;
    const pulse=Math.max(0,Math.min(1,0.7+Math.sin(t*0.5+i*1.7)*0.3));
    const x=lf.x*w+px*minSide*0.014*lf.depth;
    const y=lf.y*h+py*minSide*0.01*lf.depth-story*minSide*0.006*lf.depth;
    let lit=M.sectionCount>0?storyStepWeight(story,i%6,6):0;
    if(M.hasFocus){
      const dx=x-M.focusX*w,dy=y-M.focusY*h;
      const nd=minSide*0.3||1;
      lit+=Math.max(0,1-Math.hypot(dx,dy)/nd)*M.interactionImpulse*0.5;
    }
    if(lit>1)lit=1;
    if(lf.depth>0.78){
      ctx.save();
      ctx.globalCompositeOperation="screen";
      const rr=lf.len*minSide*1.3;
      const bg=ctx.createRadialGradient(x,y,0,x,y,rr);
      bg.addColorStop(0,"rgba(120,196,110,"+Math.min(0.14,0.05+pulse*0.04+lit*0.05)+")");
      bg.addColorStop(1,"rgba(90,160,90,0)");
      ctx.fillStyle=bg;
      ctx.beginPath();
      ctx.arc(x,y,rr,0,TAU);
      ctx.fill();
      ctx.restore();
    }
    heroLeaf(x,y,lf.len*minSide,lf.ang+flutter,lf.depth,pulse,lit,GC.heroBody[i]);
  }

  // Front canopy leaves.
  for(let i=0;i<CFG.CANOPY.length;i++){
    if(small&&(i&3)===3)continue;
    const c=CFG.CANOPY[i];
    if(c.layer!==2)continue;
    const flutter=Math.sin(t*c.sway+c.phase)*(0.05+c.depth*0.05);
    const x=c.x*w-px*minSide*0.03*c.depth;
    const y=c.y*h-py*minSide*0.022*c.depth+Math.sin(t*c.sway*0.7+c.phase)*minSide*0.005;
    const fill="hsla("+c.hue+","+c.sat+"%,"+c.lig+"%,"+c.alpha+")";
    smallLeaf(x,y,c.len*minSide,c.ang+flutter,fill,c.vein?0.06+c.depth*0.05:0);
  }

  // Foreground framing leaves.
  for(let i=0;i<CFG.FG.length;i++){
    const f=CFG.FG[i];
    const flutter=Math.sin(t*f.sp+f.phase)*0.03;
    const x=f.x*w+px*minSide*0.04;
    const y=f.y*h+py*minSide*0.02;
    const len=f.len*minSide;
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(f.ang+flutter);
    const wd=len*0.5;
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.bezierCurveTo(len*0.26,-wd,len*0.78,-wd*0.7,len,0);
    ctx.bezierCurveTo(len*0.72,wd*0.82,len*0.22,wd*0.76,0,0);
    ctx.closePath();
    const g=ctx.createLinearGradient(0,-wd,len,wd);
    g.addColorStop(0,"hsla("+f.hue+",40%,7%,0.82)");
    g.addColorStop(1,"hsla("+(f.hue-10)+",44%,4%,0.9)");
    ctx.fillStyle=g;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(len*0.04,0);
    ctx.quadraticCurveTo(len*0.5,-wd*0.04,len*0.92,0);
    ctx.strokeStyle="rgba(150,200,120,0.14)";
    ctx.lineWidth=1;
    ctx.stroke();
    ctx.restore();
  }

  // Floating pollen motes — pushed off the copy lane, dimmer, lower lightness so
  // the bloom can't lift them over text.
  ctx.save();
  ctx.globalCompositeOperation="screen";
  for(let i=0;i<pollenN;i++){
    const p2=CFG.POLLEN[i];
    const drift=((p2.y-t*p2.rise)%1+1)%1;
    const x=(0.57+p2.x*0.42)*w+Math.sin(t*p2.sp+p2.phase)*minSide*p2.amp+px*minSide*0.02*p2.depth;
    const y=drift*h+py*minSide*0.015*p2.depth;
    const r=Math.max(0.4,p2.r*minSide*(0.7+0.3*Math.sin(t*0.6+p2.phase)));
    const pulse=0.5+0.5*Math.sin(t*0.8+p2.phase*2);
    ctx.beginPath();
    ctx.arc(x,y,r,0,TAU);
    ctx.fillStyle="hsla("+p2.hue+",64%,58%,"+(p2.alpha*pulse*0.75)+")";
    ctx.fill();
  }
  ctx.restore();

  // Firefly light (soft round glows only) — origin pushed right of the copy lane,
  // core alpha capped, redundant bright-fly glow removed so cores stay sub-clip.
  ctx.save();
  ctx.globalCompositeOperation="screen";
  for(let i=0;i<flyN;i++){
    const fl=CFG.FLIES[i];
    const x=w*(0.58+fl.sx*0.40)+Math.sin(t*fl.sp+fl.phase)*minSide*fl.dx*2.4+px*minSide*0.02*fl.depth;
    const y=h*(0.06+fl.sy*0.88)+Math.cos(t*fl.sp*0.85+fl.phase*1.3)*minSide*fl.dy*4+py*minSide*0.015*fl.depth;
    const pulse=0.5+0.5*Math.sin(t*fl.pulseSp+fl.pulsePh);
    const flare=Math.min(0.06,M.interactionImpulse*0.05);
    const rad=minSide*(0.007+fl.depth*0.006);
    const g=ctx.createRadialGradient(x,y,0,x,y,rad);
    g.addColorStop(0,"rgba(208,236,146,"+Math.min(0.36,0.26*pulse+0.06+flare)+")");
    g.addColorStop(0.2,"rgba(168,224,108,"+(0.18*pulse)+")");
    g.addColorStop(1,"rgba(104,184,74,0)");
    ctx.fillStyle=g;
    ctx.beginPath();
    ctx.arc(x,y,rad,0,TAU);
    ctx.fill();
  }
  ctx.restore();

  // Focus response: a slender tendril grows from the portal toward the focused
  // resume item, ending in a soft round growth glow scaled by impulse. Drawn
  // before the copy scrim so anything reaching left is dimmed for legibility.
  if(M.hasFocus){
    const fx=M.focusX*w,fy=M.focusY*h;
    const budX=portalX-minSide*0.08;
    const budY=portalY-minSide*(0.04+story*0.1);
    ctx.save();
    ctx.lineCap="round";
    ctx.beginPath();
    ctx.moveTo(budX,budY);
    ctx.bezierCurveTo(w*0.68,budY,(budX+fx)*0.5,fy,fx,fy);
    ctx.strokeStyle="rgba(150,206,120,"+(0.1+M.interactionImpulse*0.18)+")";
    ctx.lineWidth=Math.max(1,minSide*0.0016);
    ctx.stroke();
    ctx.globalCompositeOperation="screen";
    softGlow(ctx,fx,fy,minSide*(0.01+M.interactionImpulse*0.02),"rgba(200,234,150,"+Math.min(0.34,0.12+M.interactionImpulse*0.22)+")","transparent");
    ctx.restore();
  }

  // Copy-lane clearing and atmosphere. Mid stop firmed + extended right to hold
  // the ~0.45-0.72w transition band over the resume text.
  const clear=ctx.createLinearGradient(0,0,w*0.74,0);
  clear.addColorStop(0,"rgba(2,9,5,0.9)");
  clear.addColorStop(0.5,"rgba(3,11,6,0.62)");
  clear.addColorStop(0.78,"rgba(3,11,6,0.22)");
  clear.addColorStop(1,"rgba(3,11,6,0)");
  ctx.fillStyle=clear;
  ctx.fillRect(0,0,w*0.76,h);

  const mist=ctx.createLinearGradient(0,h,0,h*0.66);
  mist.addColorStop(0,"rgba(42,98,52,0.18)");
  mist.addColorStop(1,"rgba(10,34,17,0)");
  ctx.fillStyle=mist;
  ctx.fillRect(w*0.32,h*0.62,w*0.68,h*0.38);

  ctx.save();
  ctx.globalCompositeOperation="screen";
  const fmist=ctx.createRadialGradient(portalX,h*0.92,minSide*0.02,portalX,h*0.92,minSide*0.4);
  fmist.addColorStop(0,"rgba(90,170,100,0.1)");
  fmist.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=fmist;
  ctx.fillRect(0,h*0.6,w,h*0.4);
  ctx.restore();

  const vig=ctx.createRadialGradient(portalX,portalY,minSide*0.14,w*0.6,h*0.5,maxSide*0.82);
  vig.addColorStop(0,"rgba(0,0,0,0)");
  vig.addColorStop(0.7,"rgba(1,5,2,0.12)");
  vig.addColorStop(1,"rgba(1,4,2,0.5)");
  ctx.fillStyle=vig;
  ctx.fillRect(0,0,w,h);

  ctx.restore();
};
