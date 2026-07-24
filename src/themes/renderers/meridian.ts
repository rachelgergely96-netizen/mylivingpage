import { finiteClamp, resolveThemeMotion } from "../shared/motion";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

export const renderMeridian: ThemeRenderer = (
  ctx,
  w,
  h,
  time,
  mx,
  my,
  _deltaSeconds,
  motion,
) => {
  const M=resolveThemeMotion(motion);
  const t=motion?.reducedMotion?0:time;
  const minSide = Math.max(1, Math.min(w,h));
  const portrait = h>w*1.1;
  const compassScale = portrait?0.72:1;
  const cx = w*(portrait?0.98:0.75);
  const cy = h*((portrait?0.42:0.52) + (my-0.5)*0.05);
  const px = mx-0.5;
  const cl = (v: number,a: number,b: number)=> v<a?a:(v>b?b:v);
  const northAngle = -Math.PI/2 + px*0.4 + Math.sin(t*0.18)*0.12;

  // 1. Atmosphere base wash (translucent, over the opaque theme fill)
  const bg = ctx.createLinearGradient(0,0,0,h);
  bg.addColorStop(0,"rgba(12,28,38,0.55)");
  bg.addColorStop(0.55,"rgba(6,16,23,0.28)");
  bg.addColorStop(1,"rgba(2,5,9,0.62)");
  ctx.fillStyle=bg; ctx.fillRect(0,0,w,h);

  // 2. Rotating globe wireframe (meridians + latitudes + limb)
  const Rg=minSide*0.44*compassScale;
  const gRot=t*0.05 + px*0.35;
  for (let i=0;i<8;i++){
    const ph=(i/8)*Math.PI + gRot;
    const rx=Math.max(minSide*0.0015, Math.abs(Math.sin(ph))*Rg);
    ctx.beginPath(); ctx.ellipse(cx,cy,rx,Rg,0,0,TAU);
    ctx.strokeStyle="rgba(96,180,198,"+(0.06*(0.35+rx/Rg*0.65)).toFixed(3)+")";
    ctx.lineWidth=1; ctx.stroke();
  }
  for (let i=1;i<7;i++){
    const lat=(i/7-0.5)*Math.PI;
    const yy=cy-Math.sin(lat)*Rg;
    const rxx=Math.cos(lat)*Rg;
    ctx.beginPath(); ctx.ellipse(cx,yy,rxx,rxx*0.16,0,0,TAU);
    ctx.strokeStyle="rgba(110,196,210,0.05)"; ctx.lineWidth=1; ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(cx,cy,Rg,0,TAU);
  ctx.strokeStyle="rgba(117,199,212,0.08)"; ctx.lineWidth=1.2; ctx.stroke();

  // graduated bezel band
  const Ro=minSide*0.375*compassScale, Rin=minSide*0.335*compassScale;
  ctx.beginPath(); ctx.arc(cx,cy,Ro,0,TAU);
  ctx.strokeStyle="rgba(117,199,212,0.30)"; ctx.lineWidth=1.4; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,Rin,0,TAU);
  ctx.strokeStyle="rgba(117,199,212,0.16)"; ctx.lineWidth=1; ctx.stroke();

  // degree ticks (36 graduations, cheap sin shimmer, cardinal peak capped)
  for (let i=0;i<36;i++){
    const ang=northAngle+(i/36)*TAU;
    const card=(i%9===0), major=(i%3===0);
    const inR=card?Rin-minSide*0.030*compassScale:(major?Rin-minSide*0.019*compassScale:Rin-minSide*0.009*compassScale);
    const ca=Math.cos(ang), sa=Math.sin(ang);
    const shim=0.80+0.20*Math.sin(t*0.5+i*0.7);
    ctx.beginPath();
    ctx.moveTo(cx+ca*inR,cy+sa*inR);
    ctx.lineTo(cx+ca*Ro,cy+sa*Ro);
    const baseA=card?0.52:(major?0.38:0.2);
    ctx.strokeStyle=(card?"rgba(190,232,244,":(major?"rgba(140,212,224,":"rgba(108,190,205,"))+cl(baseA*shim,0,1).toFixed(3)+")";
    ctx.lineWidth=card?2:(major?1.4:0.8);
    ctx.stroke();
  }

  // concentric range rings
  for (let r=0;r<4;r++){
    const rr=minSide*(0.10+r*0.058)*compassScale;
    ctx.beginPath(); ctx.arc(cx,cy,rr,0,TAU);
    ctx.strokeStyle="rgba(90,175,192,"+(0.16-r*0.028).toFixed(3)+")";
    ctx.lineWidth=1; ctx.stroke();
  }

  // compass spokes (additive)
  ctx.globalCompositeOperation="lighter";
  for (let i=0;i<16;i++){
    const ang=northAngle+(i/16)*TAU;
    const even=i%2===0;
    const inner=minSide*(even?0.055:0.11)*compassScale;
    const outer=minSide*(even?0.325:0.255)*compassScale;
    const ca=Math.cos(ang), sa=Math.sin(ang);
    ctx.beginPath();
    ctx.moveTo(cx+ca*inner,cy+sa*inner);
    ctx.lineTo(cx+ca*outer,cy+sa*outer);
    ctx.strokeStyle=even?"rgba(120,205,222,0.26)":"rgba(88,162,182,0.13)";
    ctx.lineWidth=even?1.6:0.9; ctx.stroke();
  }
  ctx.globalCompositeOperation="source-over";

  // 4. One bearing-bound sweep: the only travelling light in the instrument.
  const hasStory=M.sectionCount>0;
  const story=finiteClamp(M.storyProgress,0,1,0);
  const velocity=finiteClamp(M.scrollVelocity/4,-1,1,0);
  const sweepU=hasStory
    ? 0.12+story*0.76+Math.sin(t*TAU/18)*0.025
    : 0.5+Math.sin(t*TAU/18)*0.42;
  let bearingAngle=northAngle+(sweepU-0.5)*TAU+velocity*0.04;
  if(M.hasFocus&&M.focusX>=0.5){
    const target=Math.atan2(M.focusY*h-cy,M.focusX*w-cx);
    const delta=Math.atan2(Math.sin(target-bearingAngle),Math.cos(target-bearingAngle));
    bearingAngle+=delta*0.35;
  }
  const focusLift=M.hasFocus&&M.focusX>=0.5
    ? 0.04+finiteClamp(M.interactionImpulse,0,1,0)*0.02
    : 0;
  ctx.save();
  ctx.globalCompositeOperation="screen";
  ctx.beginPath(); ctx.arc(cx,cy,Ro,bearingAngle-0.34,bearingAngle+0.34);
  ctx.strokeStyle=`rgba(110,205,224,${0.08+focusLift*0.5})`;
  ctx.lineWidth=8; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,Ro,bearingAngle-0.18,bearingAngle+0.18);
  ctx.strokeStyle=`rgba(202,238,246,${0.30+focusLift})`;
  ctx.lineWidth=1.5; ctx.stroke();
  ctx.restore();

  // 5. Lit north needle (hero) with tamed tip highlight + glow
  const needleLen=minSide*0.30*compassScale, tailLen=minSide*0.205*compassScale;
  const nx=cx+Math.cos(northAngle)*needleLen, ny=cy+Math.sin(northAngle)*needleLen;
  const tx=cx-Math.cos(northAngle)*tailLen, ty=cy-Math.sin(northAngle)*tailLen;
  const perp=northAngle+Math.PI/2, halfW=minSide*0.017*compassScale;
  const lx=cx+Math.cos(perp)*halfW, ly=cy+Math.sin(perp)*halfW;
  const rxp=cx-Math.cos(perp)*halfW, ryp=cy-Math.sin(perp)*halfW;
  const ng=ctx.createLinearGradient(cx,cy,nx,ny);
  ng.addColorStop(0,"rgba(150,220,235,0.48)");
  ng.addColorStop(0.65,"rgba(214,240,248,0.66)");
  ng.addColorStop(1,"rgba(250,244,228,0.74)");
  ctx.beginPath(); ctx.moveTo(nx,ny); ctx.lineTo(lx,ly); ctx.lineTo(rxp,ryp); ctx.closePath();
  ctx.fillStyle=ng; ctx.fill();
  ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(lx,ly); ctx.lineTo(rxp,ryp); ctx.closePath();
  ctx.fillStyle="rgba(48,108,128,0.6)"; ctx.fill();
  ctx.beginPath(); ctx.moveTo(nx,ny); ctx.lineTo(lx,ly);
  ctx.strokeStyle="rgba(240,248,244,0.4)"; ctx.lineWidth=1; ctx.stroke();

  // central hub (radial material shading, highlight capped)
  const hr=minSide*0.022*compassScale;
  const hg=ctx.createRadialGradient(cx-hr*0.3,cy-hr*0.3,hr*0.1,cx,cy,hr*1.1);
  hg.addColorStop(0,"rgba(226,246,252,0.78)");
  hg.addColorStop(0.5,"rgba(120,205,225,0.72)");
  hg.addColorStop(1,"rgba(28,78,98,0.6)");
  ctx.beginPath(); ctx.arc(cx,cy,hr,0,TAU); ctx.fillStyle=hg; ctx.fill();
  ctx.beginPath(); ctx.arc(cx,cy,hr,0,TAU);
  ctx.strokeStyle="rgba(176,230,242,0.5)"; ctx.lineWidth=1; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,minSide*0.006*compassScale,0,TAU);
  ctx.fillStyle="rgba(18,40,54,0.9)"; ctx.fill();

  // 6. Vignette seat
  const vg=ctx.createRadialGradient(cx,cy,minSide*0.32,cx,cy,Math.max(w,h)*0.78);
  vg.addColorStop(0,"rgba(0,0,0,0)");
  vg.addColorStop(1,"rgba(1,3,6,0.55)");
  ctx.fillStyle=vg; ctx.fillRect(0,0,w,h);
};
