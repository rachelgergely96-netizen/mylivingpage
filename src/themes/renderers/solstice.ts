import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { finiteClamp, resolveThemeMotion, storyStepWeight } from "../shared/motion";
import { softGlow } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

interface SolsticeRidge {
  baseYOff: number;
  relief: number;
  rough: number;
  seed: number;
  fill: string;
  rim: boolean;
  samples: number[];
}

const CFG=(function(){
  const rnd=createSeededRandom(20270721);

  // parallax golden dust -- right half only, protects the left reading column
  const dust=[];
  const layers=[
    {count:16,depth:0.30,rMin:0.5,rMax:1.2,aMin:0.05,aMax:0.13},
    {count:14,depth:0.60,rMin:0.8,rMax:2.0,aMin:0.06,aMax:0.18},
    {count:10,depth:1.00,rMin:1.2,rMax:3.0,aMin:0.08,aMax:0.24}
  ];
  for(let li=0;li<layers.length;li++){
    const L=layers[li];
    for(let i=0;i<L.count;i++){
      dust.push({x:0.5+0.5*rnd(),y:rnd(),r:L.rMin+(L.rMax-L.rMin)*rnd(),a:L.aMin+(L.aMax-L.aMin)*rnd(),depth:L.depth,ph:rnd()*6.2832,tw:0.35+rnd()*1.4,drift:0.3+rnd()*0.9,sway:rnd()*6.2832});
    }
  }

  // soft lens blooms, kept right-of-centre so they never reach the copy column
  const ghostCols=[[255,206,140],[255,168,104]];
  const gfr=[0.30,0.55];
  const ghosts=[];
  for(let i=0;i<gfr.length;i++){
    ghosts.push({f:gfr[i],r:0.05+rnd()*0.045,a:0.045+rnd()*0.04,col:ghostCols[i%ghostCols.length]});
  }

  // volumetric cloud bands (fbm edges) -- reduced 6 -> 4
  const clouds=[];
  for(let i=0;i<4;i++){
    clouds.push({spd:0.01+rnd()*0.03,ph:rnd()*6.2832,a:0.13-i*0.014,seed:rnd()*40,thick:0.02+rnd()*0.05});
  }

  // sun-surface granulation -- reduced 12 -> 6
  const gran=[];
  for(let i=0;i<6;i++){
    gran.push({ang:rnd()*6.2832,rad:0.15+rnd()*0.72,r:0.14+rnd()*0.30,a:0.05+rnd()*0.11,warm:rnd()>0.5});
  }

  // rising embers -- reduced 7 -> 5, x biased right of the copy column
  const embers=[];
  for(let i=0;i<5;i++){
    embers.push({x:0.54+rnd()*0.42,ph:rnd()*6.2832,spd:0.05+rnd()*0.08,r:0.8+rnd()*1.7,a:0.10+rnd()*0.14,sway:rnd()*6.2832});
  }

  // two warm atmospheric masses (was four; the purple copy-zone mass is gone)
  const masses=[
    {xf:0.80,yf:0.34,r:0.74,col:[255,182,98],a:0.24,dx:0.02,dy:0.015,sp:0.030},
    {xf:0.60,yf:0.60,r:0.86,col:[212,104,58],a:0.15,dx:0.03,dy:0.020,sp:0.024}
  ];

  // static ridge silhouettes: bake the normalized fbm heights once so no fbm runs per frame
  const ridges: SolsticeRidge[]=[
    {baseYOff:-0.005,relief:0.045,rough:2.0,seed:3.1,fill:"rgba(70,30,38,0.85)",rim:true,samples:[]},
    {baseYOff:0.035,relief:0.07,rough:2.6,seed:8.4,fill:"#231018",rim:true,samples:[]},
    {baseYOff:0.11,relief:0.05,rough:1.6,seed:15.7,fill:"#0B0709",rim:false,samples:[]}
  ];
  const RM=18;
  for(let i=0;i<ridges.length;i++){
    const rd=ridges[i];
    const s=[];
    for(let k=0;k<=RM;k++){
      s.push(fbm((k/RM)*rd.rough+rd.seed,rd.seed*1.7+2.0,2));
    }
    rd.samples=s;
  }

  return {dust:dust,ghosts:ghosts,clouds:clouds,gran:gran,embers:embers,masses:masses,ridges:ridges,RM:RM};
})();

export const renderSolstice: ThemeRenderer = (ctx,w,h,t,mx,my,_deltaSeconds,motion)=>{
  const M=resolveThemeMotion(motion);
  const sp=finiteClamp(M.storyProgress,0,1,0);
  const vel=finiteClamp(M.scrollVelocity,-4,4,0);
  const av=Math.abs(vel);
  const imp=finiteClamp(M.interactionImpulse,0,1,0);
  const pSpd=finiteClamp(M.pointerSpeed,0,4,0);
  const energy=finiteClamp(av*0.16+imp*0.5,0,1.2,0); // 0 at rest
  const glow=finiteClamp(pSpd*0.04,0,0.12,0);         // subtle pointer brighten, 0 at rest

  const minSide=Math.min(w,h);
  const maxSide=Math.max(w,h);
  const px=finiteClamp(mx,0,1,0.5)-0.5;
  const py=finiteClamp(my,0,1,0.5)-0.5;
  const horizonY=h*0.62;
  const sunX=w*0.79+px*minSide*0.05;
  const sunY=horizonY-h*0.105-sp*h*0.05+py*minSide*0.03; // story raises the sun
  const sunR=Math.max(1,minSide*0.115);
  const cx=w*0.5, cy=h*0.5;

  ctx.save();

  // deep sunset sky
  const sky=ctx.createLinearGradient(0,0,0,horizonY*1.16);
  sky.addColorStop(0,"#160B18");
  sky.addColorStop(0.28,"#2E1222");
  sky.addColorStop(0.52,"#5A2224");
  sky.addColorStop(0.76,"#9C3E2C");
  sky.addColorStop(1,"#D8763C");
  ctx.fillStyle=sky;
  ctx.fillRect(0,0,w,horizonY*1.16);

  // two drifting warm colour masses, painted into BOUNDED regions (not full canvas)
  ctx.save();
  ctx.globalCompositeOperation="screen";
  for(let i=0;i<CFG.masses.length;i++){
    const m=CFG.masses[i];
    const mcx=w*(m.xf+Math.sin(t*m.sp+i)*m.dx)+px*minSide*0.02*(i+1);
    const mcy=horizonY*m.yf+Math.cos(t*m.sp*0.8+i)*minSide*m.dy+py*minSide*0.02;
    const rr=Math.max(1,maxSide*m.r*0.5);
    const g=ctx.createRadialGradient(mcx,mcy,0,mcx,mcy,rr);
    const c=m.col;
    g.addColorStop(0,"rgba("+c[0]+","+c[1]+","+c[2]+","+m.a+")");
    g.addColorStop(0.5,"rgba("+c[0]+","+c[1]+","+c[2]+","+(m.a*0.35)+")");
    g.addColorStop(1,"rgba("+c[0]+","+c[1]+","+c[2]+",0)");
    ctx.fillStyle=g;
    const bx=Math.max(0,mcx-rr), by=Math.max(0,mcy-rr);
    const bw=Math.min(w,mcx+rr)-bx, bh=Math.min(h,mcy+rr)-by;
    if(bw>0&&bh>0)ctx.fillRect(bx,by,bw,bh);
  }
  ctx.restore();

  // horizon bloom seated at the sun base (bounded to the right), gently lifted by pointer energy
  ctx.save();
  ctx.globalCompositeOperation="screen";
  const hbA=finiteClamp(0.42+glow*0.6,0,0.5,0.42);
  const hg=ctx.createRadialGradient(sunX,horizonY,0,sunX,horizonY,Math.max(1,minSide*0.9));
  hg.addColorStop(0,"rgba(255,190,110,"+hbA+")");
  hg.addColorStop(0.4,"rgba(224,96,62,0.16)");
  hg.addColorStop(1,"rgba(33,13,24,0)");
  ctx.fillStyle=hg;
  ctx.fillRect(w*0.3,0,w*0.7,horizonY+sunR*2);
  ctx.restore();

  // volumetric cloud bands (fbm edges, lit from below) -- bounded to the right
  const cxs=w*0.26, cxspan=w*0.80;
  for(let i=0;i<CFG.clouds.length;i++){
    const cl=CFG.clouds[i];
    const by=horizonY-minSide*(0.02+i*0.075)+Math.sin(t*cl.spd+cl.ph)*minSide*0.01;
    const scroll=t*cl.spd*2;
    const th=Math.max(1,minSide*cl.thick);
    const N=9;
    ctx.beginPath();
    ctx.moveTo(cxs,by);
    for(let k=0;k<=N;k++){
      const xf=k/N;
      const n=fbm(xf*3+cl.seed+scroll,cl.ph,2);
      ctx.lineTo(cxs+xf*cxspan,by+n*th*0.6-th*0.5);
    }
    for(let k=N;k>=0;k--){
      const xf=k/N;
      const n=fbm(xf*3+cl.seed+10+scroll,cl.ph,2);
      ctx.lineTo(cxs+xf*cxspan,by+n*th*0.6+th*0.5);
    }
    ctx.closePath();
    const cg=ctx.createLinearGradient(0,by-th,0,by+th);
    cg.addColorStop(0,"rgba(255,180,110,"+(cl.a*0.5)+")");
    cg.addColorStop(0.5,"rgba(150,54,50,"+cl.a+")");
    cg.addColorStop(1,"rgba(40,18,26,"+(cl.a*0.7)+")");
    ctx.fillStyle=cg;
    ctx.fill();
  }

  // soft radiant aura around the sun (round volumetric bloom)
  ctx.save();
  ctx.globalCompositeOperation="screen";
  softGlow(ctx,sunX,sunY,sunR*4.6,"rgba(255,178,104,"+finiteClamp(0.20+glow*0.4,0,0.28,0.20)+")","transparent");
  ctx.restore();

  // corona -- warms subtly as the story progresses
  ctx.save();
  ctx.globalCompositeOperation="screen";
  const coA=finiteClamp(0.55+sp*0.06,0,0.62,0.55);
  const corona=ctx.createRadialGradient(sunX,sunY,sunR*0.2,sunX,sunY,sunR*3.0);
  corona.addColorStop(0,"rgba(255,"+Math.round(244-sp*18)+","+Math.round(200-sp*40)+","+coA+")");
  corona.addColorStop(0.22,"rgba(255,180,100,0.30)");
  corona.addColorStop(0.55,"rgba(230,90,60,0.10)");
  corona.addColorStop(1,"rgba(216,68,53,0)");
  ctx.fillStyle=corona;
  ctx.beginPath();
  ctx.arc(sunX,sunY,sunR*3.0,0,TAU);
  ctx.fill();
  ctx.restore();

  // sun disc -- peak lightness held just under pure-white so the bright-pass bloom cannot clip
  const sun=ctx.createRadialGradient(sunX-sunR*0.25,sunY-sunR*0.3,0,sunX,sunY,sunR);
  sun.addColorStop(0,"#FFF6DA");
  sun.addColorStop(0.45,"#FFD584");
  sun.addColorStop(0.82,"#F79A54");
  sun.addColorStop(1,"#E86A44");
  ctx.fillStyle=sun;
  ctx.beginPath();
  ctx.arc(sunX,sunY,sunR,0,TAU);
  ctx.fill();

  // living surface granulation, clipped to the disc
  ctx.save();
  ctx.beginPath();
  ctx.arc(sunX,sunY,sunR,0,TAU);
  ctx.clip();
  ctx.globalCompositeOperation="overlay";
  for(let i=0;i<CFG.gran.length;i++){
    const gr=CFG.gran[i];
    const wob=Math.sin(t*0.2+gr.ang*3)*0.04;
    const gx=sunX+Math.cos(gr.ang+t*0.02)*(gr.rad+wob)*sunR;
    const gy=sunY+Math.sin(gr.ang+t*0.02)*(gr.rad+wob)*sunR;
    const rr=Math.max(1,gr.r*sunR);
    const bg=ctx.createRadialGradient(gx,gy,0,gx,gy,rr);
    const col=gr.warm?"255,230,170":"255,150,90";
    bg.addColorStop(0,"rgba("+col+","+gr.a+")");
    bg.addColorStop(1,"rgba("+col+",0)");
    ctx.fillStyle=bg;
    ctx.fillRect(gx-rr,gy-rr,rr*2,rr*2);
  }
  ctx.restore();

  // limb darkening seats the disc as a sphere
  const limb=ctx.createRadialGradient(sunX,sunY,sunR*0.72,sunX,sunY,sunR);
  limb.addColorStop(0,"rgba(120,30,20,0)");
  limb.addColorStop(1,"rgba(120,30,20,0.5)");
  ctx.fillStyle=limb;
  ctx.beginPath();
  ctx.arc(sunX,sunY,sunR,0,TAU);
  ctx.fill();

  // soft round halo ring around the disc
  ctx.save();
  ctx.globalCompositeOperation="screen";
  const halo=ctx.createRadialGradient(sunX,sunY,sunR*1.35,sunX,sunY,sunR*2.05);
  halo.addColorStop(0,"rgba(255,200,130,0)");
  halo.addColorStop(0.62,"rgba(255,196,109,0.14)");
  halo.addColorStop(1,"rgba(255,196,109,0)");
  ctx.fillStyle=halo;
  ctx.beginPath();
  ctx.arc(sunX,sunY,sunR*2.05,0,TAU);
  ctx.fill();
  ctx.restore();

  // a couple of soft warm lens blooms along the sun axis (no rings, no dot-cluster)
  ctx.save();
  ctx.globalCompositeOperation="screen";
  const vx=(cx-sunX)*2;
  const vy=(cy-sunY)*2;
  for(let i=0;i<CFG.ghosts.length;i++){
    const gh=CFG.ghosts[i];
    const gx=sunX+vx*gh.f;
    const gy=sunY+vy*gh.f;
    const rr=Math.max(1,minSide*gh.r*(0.9+0.1*Math.sin(t*0.5+i)));
    const c=gh.col;
    softGlow(ctx,gx,gy,rr,"rgba("+c[0]+","+c[1]+","+c[2]+","+gh.a+")","transparent");
  }
  ctx.restore();

  // layered landscape silhouettes with sun-side rim light (heights baked in setup -> no per-frame fbm)
  const ridge=(rd: SolsticeRidge)=>{
    const S=rd.samples, RM=CFG.RM;
    const baseY=horizonY+minSide*rd.baseYOff;
    const relief=minSide*rd.relief;
    ctx.beginPath();
    ctx.moveTo(0,h);
    ctx.lineTo(0,baseY);
    for(let k=0;k<=RM;k++){
      ctx.lineTo((k/RM)*w,baseY-S[k]*relief);
    }
    ctx.lineTo(w,baseY);
    ctx.lineTo(w,h);
    ctx.closePath();
    ctx.fillStyle=rd.fill;
    ctx.fill();
    if(rd.rim){
      ctx.save();
      ctx.globalCompositeOperation="screen";
      ctx.beginPath();
      for(let k=0;k<=RM;k++){
        const yy=baseY-S[k]*relief;
        if(k===0)ctx.moveTo(0,yy);else ctx.lineTo((k/RM)*w,yy);
      }
      const rg=ctx.createLinearGradient(0,0,w,0);
      rg.addColorStop(0,"rgba(255,150,90,0)");
      rg.addColorStop(finiteClamp(sunX/w,0.06,0.94,0.79),"rgba(255,206,150,0.5)");
      rg.addColorStop(1,"rgba(255,150,90,0)");
      ctx.strokeStyle=rg;
      ctx.lineWidth=Math.max(1,minSide*0.0035);
      ctx.stroke();
      ctx.restore();
    }
  };
  for(let i=0;i<CFG.ridges.length;i++)ridge(CFG.ridges[i]);

  // broad soft-gradient reflection pools shimmering toward the viewer -- reduced 5 -> 3
  ctx.save();
  ctx.globalCompositeOperation="screen";
  for(let i=0;i<3;i++){
    const yy=horizonY+minSide*(0.02+i*0.06);
    const halfW=Math.max(1,minSide*(0.07+i*0.06));
    const bandH=Math.max(1,minSide*(0.016+i*0.008));
    const wob=Math.sin(t*0.25+i*0.9)*minSide*0.008*(1+energy*0.8);
    const a=Math.max(0.02,0.16-i*0.035);
    ctx.save();
    ctx.translate(sunX+wob,yy);
    ctx.scale(1,bandH/halfW);
    const rg=ctx.createRadialGradient(0,0,0,0,0,halfW);
    rg.addColorStop(0,"rgba(255,208,140,"+a+")");
    rg.addColorStop(0.55,"rgba(255,160,96,"+(a*0.45)+")");
    rg.addColorStop(1,"rgba(255,150,90,0)");
    ctx.fillStyle=rg;
    ctx.beginPath();
    ctx.arc(0,0,halfW,0,TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // rising embers -- rise speed/sway react to scroll + interaction energy, peak alpha capped
  ctx.save();
  ctx.globalCompositeOperation="screen";
  for(let i=0;i<CFG.embers.length;i++){
    const em=CFG.embers[i];
    const life=(t*em.spd*(1+av*0.15+imp*0.3)+em.ph)%1;
    const ex=w*em.x+Math.sin(t*0.4+em.sway)*minSide*0.02*(1+energy*0.5)+px*minSide*0.03;
    const ey=horizonY+minSide*0.05-life*minSide*0.5;
    const a=finiteClamp(em.a*Math.sin(life*Math.PI)*(1+glow*0.5),0,0.26,0);
    const rr=Math.max(0.6,minSide*0.006*em.r);
    softGlow(ctx,ex,ey,rr*6,"rgba(255,190,110,"+(a*0.5)+")","transparent");
    ctx.fillStyle="rgba(255,232,186,"+a+")";
    ctx.beginPath();
    ctx.arc(ex,ey,rr,0,TAU);
    ctx.fill();
  }
  ctx.restore();

  // parallax golden dust -- right half only, extra left-edge fade guards the copy column
  ctx.save();
  ctx.globalCompositeOperation="screen";
  const dDrift=1+imp*0.4+av*0.1;
  for(let i=0;i<CFG.dust.length;i++){
    const d=CFG.dust[i];
    const driftX=Math.sin(t*0.05*d.drift+d.sway)*d.depth*minSide*0.03*dDrift;
    const driftY=Math.cos(t*0.04*d.drift+d.ph)*d.depth*minSide*0.02*dDrift;
    const dx=w*d.x+driftX-px*d.depth*minSide*0.06;
    const dy=h*d.y+driftY-py*d.depth*minSide*0.04;
    const tw=0.5+0.5*Math.sin(t*d.tw+d.ph);
    const ddx=dx-sunX, ddy=dy-sunY;
    const dist=Math.sqrt(ddx*ddx+ddy*ddy)+1;
    const prox=finiteClamp(1-dist/(maxSide*0.7),0,1,0);
    const leftFade=finiteClamp((dx/w-0.34)/0.16,0,1,1);
    const a=d.a*(0.4+0.6*tw)*(0.4+0.9*prox)*leftFade;
    if(a<=0.001)continue;
    const rr=Math.max(0.4,d.r*(0.8+0.4*tw));
    ctx.fillStyle="rgba(255,"+Math.round(200+40*prox)+","+Math.round(150+30*tw)+","+a+")";
    ctx.beginPath();
    ctx.arc(dx,dy,rr,0,TAU);
    ctx.fill();
  }
  ctx.restore();

  // story milestone lights on the horizon -- weighted by the real page story, kept right of copy
  const stepCount=Math.max(4,Math.min(7,M.sectionCount||5));
  ctx.save();
  ctx.globalCompositeOperation="screen";
  for(let s=0;s<stepCount;s++){
    const shim=0.5+0.5*Math.sin(t*0.4-s*0.7);
    const wgt=storyStepWeight(sp,s,stepCount);
    const xx=w*(0.56+(s/Math.max(1,stepCount-1))*0.40);
    const yy=horizonY+minSide*0.012;
    const bright=finiteClamp(0.16+shim*0.13+wgt*0.30+glow*0.2,0,0.62,0.16);
    softGlow(ctx,xx,yy,Math.max(1,minSide*0.018*(0.5+bright)),"rgba(255,202,130,"+(0.09+bright*0.28)+")","transparent");
    ctx.fillStyle="rgba(255,230,184,"+finiteClamp(0.14+bright*0.34,0,0.5,0.14)+")";
    ctx.beginPath();
    ctx.arc(xx,yy,1.3+bright*1.9,0,TAU);
    ctx.fill();
  }
  ctx.restore();

  // focus response: a gentle warm brighten where the reader is looking (only when focused)
  if(M.hasFocus){
    ctx.save();
    ctx.globalCompositeOperation="screen";
    const fxr=finiteClamp(M.focusX,0,1,0.5)*w;
    const fyr=finiteClamp(M.focusY,0,1,0.5)*h;
    softGlow(ctx,fxr,fyr,Math.max(1,minSide*0.14),"rgba(255,196,120,0.09)","transparent");
    ctx.restore();
  }

  // warm cinematic colour grade
  ctx.save();
  ctx.globalCompositeOperation="soft-light";
  const grade=ctx.createLinearGradient(0,0,w,h);
  grade.addColorStop(0,"rgba(60,20,40,0.5)");
  grade.addColorStop(0.5,"rgba(255,170,90,0.22)");
  grade.addColorStop(1,"rgba(255,120,70,0.4)");
  ctx.fillStyle=grade;
  ctx.fillRect(0,0,w,h);
  ctx.restore();

  // reserved dark space so resume copy stays legible on the left
  const clear=ctx.createLinearGradient(0,0,w*0.66,0);
  clear.addColorStop(0,"rgba(10,6,5,0.86)");
  clear.addColorStop(0.55,"rgba(10,6,5,0.5)");
  clear.addColorStop(1,"rgba(10,6,5,0)");
  ctx.fillStyle=clear;
  ctx.fillRect(0,0,w*0.66,h);

  // vignette
  const vig=ctx.createRadialGradient(sunX,horizonY,minSide*0.15,cx*1.05,cy,maxSide*0.85);
  vig.addColorStop(0,"rgba(0,0,0,0)");
  vig.addColorStop(0.7,"rgba(0,0,0,0.12)");
  vig.addColorStop(1,"rgba(0,0,0,0.5)");
  ctx.fillStyle=vig;
  ctx.fillRect(0,0,w,h);

  ctx.restore();
};
