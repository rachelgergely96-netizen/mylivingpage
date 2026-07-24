import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { resolveThemeMotion } from "../shared/motion";
import { softGlow, star4 } from "../shared/draw";
import { wrapSoft } from "../shared/wrap";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;
type Rgb = [number, number, number];
type AtmosphericMass = [number, number, Rgb, number];

const CFG=(function(){
  const rnd=createSeededRandom(48217);
  const T2=Math.PI*2;
  const JEWELS: Rgb[]=[[70,26,54],[104,38,72],[146,54,92],[186,88,120],[216,124,150],[120,60,124]];
  const DUST=[];
  for(let i=0;i<40;i++){DUST.push({x:rnd(),y:rnd(),z:0.3+rnd()*0.8,r:0.4+rnd()*1.7,ph:rnd()*T2,sp:0.3+rnd()*1.0,drift:0.3+rnd()*0.9,bright:rnd(),cross:rnd()>0.9});}
  const SPARK=[];
  for(let i=0;i<10;i++){SPARK.push({u:0.04+rnd()*0.92,ph:rnd()*T2,sp:0.5+rnd()*1.4,rr:rnd()});}
  const FIBERS=[];
  for(let i=0;i<30;i++){FIBERS.push({u:rnd(),rr:0.28+rnd()*0.64,len:0.02+rnd()*0.06,ph:rnd()*T2});}
  const MASSES: AtmosphericMass[]=[[0.78,0.6,[150,54,96],0.95],[0.66,0.4,[120,58,128],0.42],[0.9,0.32,[196,96,128],0.7],[0.62,0.72,[92,34,66],0.45],[0.72,0.2,[216,130,150],0.5]];
  return {JEWELS,DUST,SPARK,FIBERS,MASSES};
})();

export const renderParasol: ThemeRenderer = (ctx,w,h,t,mx,my,_deltaSeconds,motion)=>{
  if(!(w>0)||!(h>0))return;
  const M=resolveThemeMotion(motion);
  const ch=(v: number)=>v<0?0:v>255?255:v|0;
  const cl=(v: number,a: number,b: number)=>v<a?a:v>b?b:v;
  const rgba=(c: Rgb,a: number)=>'rgba('+ch(c[0])+','+ch(c[1])+','+ch(c[2])+','+(a<0?0:a>1?1:a)+')';
  const mix=(a: Rgb,b: Rgb,f: number): Rgb=>[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,a[2]+(b[2]-a[2])*f];
  const scl=(c: Rgb,m: number): Rgb=>[c[0]*m,c[1]*m,c[2]*m];
  const px=(isFinite(mx)?cl(mx,0,1):0.5)-0.5;
  const py=(isFinite(my)?cl(my,0,1):0.5)-0.5;
  const minSide=Math.min(w,h);
  const maxSide=Math.max(w,h);
  const pivotX=w*0.87+px*minSide*0.03;
  const pivotY=h*0.92+py*minSide*0.02;
  const radius=minSide*0.66;
  const breath=0.5+0.5*Math.sin(t*0.16);
  const startAngle=-2.74+px*0.03-breath*0.02;
  // storyProgress gently unfurls the fan as the reader descends the page (0 at rest).
  const span=2.14+breath*0.14+M.storyProgress*0.2;
  const endAngle=startAngle+span;

  // Motion energy (0 at rest): a scroll flick / pointer sweep / interaction pulses the shimmer.
  const energy=cl(Math.abs(M.scrollVelocity)*0.4+M.interactionImpulse*0.6+M.pointerSpeed*0.2,0,1);
  // The lit sheen locks to the active section when the page supplies sections; otherwise
  // (rest / preview / reduced-motion) it drifts gently and sits centred at t=0.
  const hasSections=M.sectionCount>0;
  const sweepFrac=hasSections
    ? cl(M.storyProgress+0.03*Math.sin(t*0.22),0.04,0.96)
    : 0.5+0.42*Math.sin(t*0.22);
  const sweepPos=startAngle+span*sweepFrac;
  const sheenW=0.42+energy*0.1;
  // On focus, brighten the pleat pointing toward the focused resume item.
  const focusOn=M.hasFocus;
  const focusAngle=focusOn?Math.atan2(M.focusY*h-pivotY,M.focusX*w-pivotX):0;
  const J=CFG.JEWELS,JL=J.length;

  ctx.save();

  const amb=ctx.createRadialGradient(pivotX,pivotY,minSide*0.05,pivotX,pivotY,maxSide*0.95);
  amb.addColorStop(0,'rgba(58,22,46,0.55)');
  amb.addColorStop(0.4,'rgba(28,12,26,0.34)');
  amb.addColorStop(1,'rgba(6,3,6,0)');
  ctx.fillStyle=amb;
  ctx.fillRect(0,0,w,h);

  ctx.save();
  ctx.globalCompositeOperation='screen';
  for(let i=0;i<CFG.MASSES.length;i++){
    const m=CFG.MASSES[i];
    const dx=Math.sin(t*0.06+i*1.7)*minSide*0.03-px*minSide*0.04*(1+i*0.15);
    const dy=Math.cos(t*0.05+i*2.1)*minSide*0.025-py*minSide*0.04;
    const rr=minSide*(0.34+0.08*Math.sin(t*0.08+i));
    const cxp=Math.max(w*0.5,m[0]*w+dx);
    softGlow(ctx,cxp,m[1]*h+dy,rr,rgba(m[2],0.16*m[3]),'transparent');
  }
  softGlow(ctx,pivotX+Math.cos(startAngle+span*0.5)*radius*0.5,pivotY+Math.sin(startAngle+span*0.5)*radius*0.5,radius*0.95,'rgba(228,167,203,0.12)','transparent');
  ctx.restore();

  // Baked flat offset shadow for depth (no per-frame shadowBlur — phone perf).
  ctx.save();
  ctx.translate(-radius*0.02,radius*0.045);
  ctx.beginPath();
  ctx.moveTo(pivotX,pivotY);
  ctx.arc(pivotX,pivotY,radius*1.03,startAngle-0.03,endAngle+0.03);
  ctx.closePath();
  ctx.fillStyle='rgba(0,0,0,0.34)';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(radius*0.02,radius*0.03);
  const bkg=ctx.createRadialGradient(pivotX,pivotY,radius*0.1,pivotX,pivotY,radius*1.14);
  bkg.addColorStop(0,'rgba(40,16,34,0)');
  bkg.addColorStop(0.5,'rgba(74,28,60,0.5)');
  bkg.addColorStop(1,'rgba(150,72,112,0)');
  ctx.beginPath();
  ctx.moveTo(pivotX,pivotY);
  ctx.arc(pivotX,pivotY,radius*1.12,startAngle-0.05,endAngle+0.05);
  ctx.closePath();
  ctx.fillStyle=bkg;
  ctx.fill();
  ctx.restore();

  for(let i=0;i<3;i++){
    ctx.beginPath();
    ctx.arc(pivotX,pivotY,radius*(0.42+i*0.2),startAngle+0.1,endAngle-0.1);
    ctx.strokeStyle=rgba([228,158,175],0.05-i*0.01);
    ctx.lineWidth=minSide*(0.016-i*0.003);
    ctx.stroke();
  }

  const PN=30;
  for(let i=0;i<PN;i++){
    const a0=startAngle+span*i/PN;
    const a1=startAngle+span*(i+1)/PN;
    const midA=(a0+a1)*0.5;
    const ridge=(i%2===0);
    const fidx=(((i+t*0.18+M.storyProgress*1.2)%JL)+JL)%JL;
    const i0=Math.floor(fidx);
    const base=mix(J[i0%JL],J[(i0+1)%JL],fidx-i0);
    const dd=midA-sweepPos;
    let sheen=Math.exp(-(dd*dd)/(sheenW*sheenW));
    if(focusOn){
      const fdd=midA-focusAngle;
      sheen=Math.max(sheen,0.75*Math.exp(-(fdd*fdd)/(sheenW*sheenW)));
    }
    sheen=cl(sheen*(1+energy*0.35),0,1);
    const lit=ridge?1:0.5;
    const tipX=pivotX+Math.cos(midA)*radius;
    const tipY=pivotY+Math.sin(midA)*radius;
    const g=ctx.createLinearGradient(pivotX,pivotY,tipX,tipY);
    g.addColorStop(0,rgba(scl(base,0.26),0.92));
    g.addColorStop(0.34,rgba(scl(base,0.5*lit+0.14),0.85));
    g.addColorStop(0.62,rgba(scl(base,(0.72+0.34*sheen)*lit+0.05),cl(0.86+sheen*0.08,0,1)));
    g.addColorStop(0.86,rgba(mix(scl(base,lit),[238,196,182],0.28+0.32*sheen),0.9));
    g.addColorStop(1,rgba(mix(base,[244,210,196],0.42+0.26*sheen),0.94));
    ctx.beginPath();
    ctx.moveTo(pivotX,pivotY);
    ctx.lineTo(pivotX+Math.cos(a0)*radius,pivotY+Math.sin(a0)*radius);
    ctx.arc(pivotX,pivotY,radius,a0,a1);
    ctx.closePath();
    ctx.fillStyle=g;
    ctx.fill();
  }

  for(let i=0;i<=PN;i++){
    const a=startAngle+span*i/PN;
    const c=Math.cos(a),s=Math.sin(a);
    ctx.beginPath();
    ctx.moveTo(pivotX,pivotY);
    ctx.lineTo(pivotX+c*radius*0.99,pivotY+s*radius*0.99);
    ctx.strokeStyle=rgba([18,6,14],0.32);
    ctx.lineWidth=Math.max(0.6,minSide*0.0016);
    ctx.stroke();
  }
  ctx.save();
  ctx.globalCompositeOperation='screen';
  for(let i=0;i<=PN;i++){
    const a=startAngle+span*i/PN;
    const c=Math.cos(a),s=Math.sin(a);
    const dd=a-sweepPos;
    let sh=Math.exp(-(dd*dd)/(sheenW*sheenW));
    if(focusOn){const fdd=a-focusAngle;sh=Math.max(sh,0.7*Math.exp(-(fdd*fdd)/(sheenW*sheenW)));}
    ctx.beginPath();
    ctx.moveTo(pivotX+c*radius*0.14,pivotY+s*radius*0.14);
    ctx.lineTo(pivotX+c*radius*0.99,pivotY+s*radius*0.99);
    ctx.strokeStyle=rgba([248,214,188],0.08+sh*(0.32+energy*0.12));
    ctx.lineWidth=Math.max(0.5,minSide*0.0012);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation='screen';
  for(let s=0;s<5;s++){
    const rr=radius*(0.36+s*0.14);
    const shimmer=0.5+0.5*fbm(s*1.7,t*0.15,2);
    ctx.beginPath();
    ctx.arc(pivotX,pivotY,rr,startAngle+0.05,endAngle-0.05);
    ctx.strokeStyle=rgba([255,206,214],0.015+0.035*shimmer);
    ctx.lineWidth=minSide*0.012;
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation='screen';
  for(let i=0;i<CFG.FIBERS.length;i++){
    const f=CFG.FIBERS[i];
    const a=startAngle+span*f.u;
    const c=Math.cos(a),s=Math.sin(a);
    const r0=radius*f.rr;
    const nx=fbm(f.u*4,t*0.05+f.ph,2);
    const al=0.012+0.03*(0.5+0.5*nx);
    ctx.beginPath();
    ctx.moveTo(pivotX+c*r0,pivotY+s*r0);
    ctx.lineTo(pivotX+c*(r0+radius*f.len),pivotY+s*(r0+radius*f.len));
    ctx.strokeStyle=rgba([255,205,190],al);
    ctx.lineWidth=Math.max(0.4,minSide*0.0009);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation='screen';
  const lo=Math.max(startAngle,sweepPos-sheenW*1.3);
  const hi=Math.min(endAngle,sweepPos+sheenW*1.3);
  if(hi>lo){
    const swG=ctx.createRadialGradient(pivotX,pivotY,radius*0.2,pivotX,pivotY,radius);
    swG.addColorStop(0,'rgba(255,220,225,0)');
    swG.addColorStop(0.6,'rgba(255,205,215,0.05)');
    swG.addColorStop(1,'rgba(255,226,231,0.12)');
    ctx.beginPath();
    ctx.moveTo(pivotX,pivotY);
    ctx.arc(pivotX,pivotY,radius,lo,hi);
    ctx.closePath();
    ctx.fillStyle=swG;
    ctx.fill();
  }
  ctx.restore();

  const ribN=12;
  for(let i=0;i<=ribN;i++){
    const a=startAngle+span*i/ribN;
    const c=Math.cos(a),s=Math.sin(a);
    ctx.beginPath();
    ctx.moveTo(pivotX,pivotY);
    ctx.lineTo(pivotX+c*radius*0.985,pivotY+s*radius*0.985);
    ctx.strokeStyle='rgba(232,178,120,0.26)';
    ctx.lineWidth=Math.max(1,minSide*0.0018);
    ctx.stroke();
    ctx.strokeStyle='rgba(248,228,196,0.18)';
    ctx.lineWidth=Math.max(0.5,minSide*0.0007);
    ctx.stroke();
  }

  // Rim glow: two capped strokes (wide-soft + crisp) replace the per-frame shadowBlur
  // and stay below near-white so the bright-pass bloom keeps headroom.
  ctx.save();
  ctx.globalCompositeOperation='screen';
  ctx.beginPath();
  ctx.arc(pivotX,pivotY,radius,startAngle,endAngle);
  ctx.strokeStyle='rgba(236,150,172,0.2)';
  ctx.lineWidth=Math.max(3,minSide*0.011);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(pivotX,pivotY,radius,startAngle,endAngle);
  ctx.strokeStyle='rgba(240,176,192,0.32)';
  ctx.lineWidth=Math.max(1.5,minSide*0.0034);
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(pivotX,pivotY,radius*0.994,startAngle,endAngle);
  ctx.strokeStyle='rgba(246,222,206,0.26)';
  ctx.lineWidth=Math.max(1,minSide*0.0016);
  ctx.stroke();

  const scN=15;
  for(let i=0;i<scN;i++){
    const a=startAngle+span*(i+0.5)/scN;
    const x=pivotX+Math.cos(a)*radius;
    const y=pivotY+Math.sin(a)*radius;
    ctx.beginPath();
    ctx.arc(x,y,minSide*0.007,a-Math.PI*0.5,a+Math.PI*0.5);
    ctx.strokeStyle='rgba(255,222,205,0.26)';
    ctx.lineWidth=1;
    ctx.stroke();
  }

  ctx.save();
  ctx.globalCompositeOperation='screen';
  for(let i=0;i<CFG.SPARK.length;i++){
    const sp=CFG.SPARK[i];
    const a=startAngle+span*sp.u;
    const rr=radius*(0.9+0.085*sp.rr);
    const x=pivotX+Math.cos(a)*rr;
    const y=pivotY+Math.sin(a)*rr;
    const tw=0.5+0.5*Math.sin(t*sp.sp+sp.ph);
    const twE=cl(tw*(1+energy*0.6),0,1);
    const rad=minSide*0.0038*(0.6+tw);
    softGlow(ctx,x,y,rad*3.2,rgba([255,200,215],0.26*twE),'transparent');
    ctx.beginPath();
    ctx.arc(x,y,rad,0,TAU);
    ctx.fillStyle=rgba([250,224,206],0.24+0.2*twE);
    ctx.fill();
    if(tw>0.86){star4(ctx,x,y,minSide*0.018*tw,minSide*0.0016,'rgba(250,220,214,'+(0.26*tw).toFixed(3)+')');}
  }
  ctx.restore();

  const hg=ctx.createRadialGradient(pivotX-minSide*0.01,pivotY-minSide*0.01,0,pivotX,pivotY,minSide*0.04);
  hg.addColorStop(0,'#F4E2C0');
  hg.addColorStop(0.4,'#D2A05E');
  hg.addColorStop(0.8,'#7A4A30');
  hg.addColorStop(1,'#3A2018');
  ctx.beginPath();
  ctx.arc(pivotX,pivotY,minSide*0.04,0,TAU);
  ctx.fillStyle=hg;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(pivotX,pivotY,minSide*0.04,0,TAU);
  ctx.strokeStyle='rgba(255,236,200,0.34)';
  ctx.lineWidth=1.2;
  ctx.stroke();
  ctx.save();
  ctx.globalCompositeOperation='screen';
  const hgl=0.6+0.4*Math.sin(t*0.8);
  star4(ctx,pivotX-minSide*0.008,pivotY-minSide*0.008,minSide*0.04*hgl,minSide*0.002,'rgba(250,232,200,'+(0.34*hgl).toFixed(3)+')');
  ctx.restore();

  // Drifting dust — confined to the fan's right half so twinkle + bloom stay off the text column.
  ctx.save();
  ctx.globalCompositeOperation='screen';
  for(let i=0;i<CFG.DUST.length;i++){
    const d=CFG.DUST[i];
    const drift=t*0.01*d.drift;
    // wrap intrinsic drift only, fade at the seam (parallax stays outside the wrap)
    const wx=wrapSoft(d.x-drift*0.5,1,0.05);
    const wy=wrapSoft(d.y-drift,1,0.05);
    const gx=0.55+wx.u*0.45;
    const x=gx*w-px*minSide*0.05*d.z;
    const y=wy.u*h-py*minSide*0.04*d.z;
    const tw=0.35+0.65*(0.5+0.5*Math.sin(t*d.sp+d.ph));
    const twE=cl(tw*(1+energy*0.5),0,1.1);
    const size=d.r*(0.5+d.z);
    const al=(0.05+0.14*d.bright)*twE*wx.alpha*wy.alpha;
    ctx.beginPath();
    ctx.arc(x,y,size,0,TAU);
    ctx.fillStyle=rgba([255,214,196],al);
    ctx.fill();
    if(d.cross&&tw>0.72){star4(ctx,x,y,size*4.5,size*0.5,'rgba(245,215,200,'+(al*1.2).toFixed(3)+')');}
  }
  ctx.restore();

  // Left reading-column scrim — extended to ~0.72w and strengthened.
  const cs=ctx.createLinearGradient(0,0,w*0.72,0);
  cs.addColorStop(0,'rgba(6,3,6,0.9)');
  cs.addColorStop(0.5,'rgba(6,3,6,0.62)');
  cs.addColorStop(0.78,'rgba(6,3,6,0.3)');
  cs.addColorStop(1,'rgba(6,3,6,0)');
  ctx.fillStyle=cs;
  ctx.fillRect(0,0,w*0.72,h);

  const vg=ctx.createRadialGradient(w*0.78,h*0.5,minSide*0.15,w*0.55,h*0.5,maxSide*0.85);
  vg.addColorStop(0,'rgba(0,0,0,0)');
  vg.addColorStop(1,'rgba(0,0,0,0.42)');
  ctx.fillStyle=vg;
  ctx.fillRect(0,0,w,h);

  ctx.restore();
};
