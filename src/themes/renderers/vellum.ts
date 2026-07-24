import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { finiteClamp, resolveThemeMotion, storyStepWeight } from "../shared/motion";
import { softGlow } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

interface VellumDust {
  z: number;
  r: number;
  a: number;
  x: number;
  y: number;
  ph: number;
  sp: number;
  drift: number;
  tone: number[];
}

const CFG=(function(){
  const rnd=createSeededRandom(74213);
  const TONES=[
    [242,230,216],
    [210,203,214],
    [232,220,203],
    [197,196,213],
    [239,225,203],
    [219,199,173],
    [234,223,209]
  ];
  const LEAF_N=7;
  const leaves=[];
  for(let i=0;i<LEAF_N;i++){
    const depth=i/(LEAF_N-1);
    const fibers=[];
    for(let f=0;f<6;f++){ fibers.push({o:0.08+rnd()*0.84,amp:0.3+rnd()*0.8,ph:rnd()*TAU}); }
    leaves.push({
      depth:depth,
      tone:TONES[i%TONES.length],
      cx:0.56+rnd()*0.3,
      cy:0.1+depth*0.74+(rnd()-0.5)*0.06,
      w:0.28+depth*0.16+rnd()*0.06,
      h:0.2+depth*0.05+rnd()*0.03,
      phase:rnd()*TAU,
      spin:0.05+rnd()*0.05,
      curl:(rnd()-0.5)*0.55,
      op:0.6+rnd()*0.78,
      fibers:fibers
    });
  }
  const dust: VellumDust[]=[];
  const LAYERS=[{n:16,z:0.25,r:0.62,a:0.08},{n:16,z:0.55,r:1.05,a:0.13},{n:12,z:0.92,r:1.75,a:0.19}];
  for(let L=0;L<LAYERS.length;L++){
    const lay=LAYERS[L];
    for(let i=0;i<lay.n;i++){
      dust.push({
        z:lay.z, r:lay.r, a:lay.a,
        x:0.32+rnd()*0.66,
        y:rnd(),
        ph:rnd()*TAU,
        sp:0.2+rnd()*0.6,
        drift:0.3+rnd()*0.9,
        tone:TONES[(L*7+i)%TONES.length]
      });
    }
  }
  return {leaves:leaves,dust:dust};
})();

export const renderVellum: ThemeRenderer = (ctx,w,h,timeValue,mx,my,_deltaSeconds,motion)=>{
  const M=resolveThemeMotion(motion);
  const reduced=motion?.reducedMotion===true;
  const t=reduced?0:timeValue;
  const vel=reduced?0:finiteClamp(M.scrollVelocity/3,-1,1,0);
  const story=M.storyProgress;
  const swayAmt=reduced?0:Math.min(1,M.pointerSpeed);
  const swayMul=1+Math.abs(vel)*0.5+swayAmt*0.3;   // 1 at rest
  const stackDrift=story*h*0.02;                    // 0 at rest
  const parY=vel*h*0.02;                            // 0 at rest
  const dustAmp=1+Math.abs(vel)*0.6;                // 1 at rest
  const storyShift=story*w*0.025;                   // 0 at rest

  const px=mx-0.5, py=my-0.5;
  const maxS=Math.max(w,h), minS=Math.min(w,h);
  const ox=w*(0.82+px*0.02)-storyShift, oy=h*(0.12+py*0.02);
  const focusLift=M.hasFocus
    ? 0.02+finiteClamp(M.interactionImpulse,0,1,0)*0.04
    : 0;

  function leafPath(cx: number,cy: number,hw: number,hh: number,curl: number){
    const lx=cx-hw, rx=cx+hw, ty=cy-hh, by=cy+hh;
    ctx.beginPath();
    ctx.moveTo(lx,ty+hh*0.16);
    ctx.bezierCurveTo(cx-hw*0.32,ty-hh*curl,cx+hw*0.42,ty+hh*curl*0.55,rx,ty+hh*0.2);
    ctx.quadraticCurveTo(rx+hw*0.09,cy,rx,by-hh*0.2);
    ctx.bezierCurveTo(cx+hw*0.42,by+hh*curl,cx-hw*0.32,by-hh*curl*0.55,lx,by-hh*0.16);
    ctx.quadraticCurveTo(lx-hw*0.09,cy,lx,ty+hh*0.16);
    ctx.closePath();
  }

  function drawMote(d: VellumDust){
    const z=d.z;
    const tw=0.5+0.5*Math.sin(t*d.sp+d.ph);
    const x=d.x*w - px*w*0.035*z + Math.cos(t*d.drift*0.22+d.ph)*w*0.02*dustAmp;
    const y=d.y*h - py*h*0.02*z + Math.sin(t*d.drift*0.18+d.ph)*h*0.05*dustAmp + parY*z;
    const rad=d.r*(0.5+z*1.2);
    ctx.globalAlpha=d.a*(0.4+0.6*tw);
    ctx.fillStyle="rgb("+d.tone[0]+","+d.tone[1]+","+d.tone[2]+")";
    ctx.beginPath();
    ctx.arc(x,y,rad,0,TAU);
    ctx.fill();
  }

  ctx.save();

  // Broad, diffuse paper-light wash spilling from the upper-right — round, volumetric,
  // tamed (lower peak alpha + smaller radius) so centre text never fights it or the bloom.
  const wash=ctx.createRadialGradient(w*0.86-storyShift,h*0.18,0,w*0.8-storyShift,h*0.26,maxS*0.72);
  wash.addColorStop(0,"rgba(245,230,208,0.11)");
  wash.addColorStop(0.34,"rgba(216,198,172,0.06)");
  wash.addColorStop(0.68,"rgba(196,182,190,0.025)");
  wash.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=wash;
  ctx.fillRect(0,0,w,h);

  // Cool shadow pool anchoring the lower-left negative space.
  const pool=ctx.createRadialGradient(w*0.3,h*0.82,0,w*0.3,h*0.82,maxS*0.62);
  pool.addColorStop(0,"rgba(30,26,42,0.34)");
  pool.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=pool;
  ctx.fillRect(0,0,w,h);

  // Soft directional bloom (no beams / no wedges) — a gently breathing round glow at the
  // light origin, trimmed so the upper-right corner stays clean under the bright-pass bloom.
  const breath=0.5+0.5*Math.sin(t*0.11);
  softGlow(ctx,ox,oy,maxS*0.4,"rgba(255,242,216,"+(0.075+breath*0.035).toFixed(3)+")","transparent");
  softGlow(ctx,ox-maxS*0.08,oy+maxS*0.07,maxS*0.24,"rgba(246,231,206,0.05)","transparent");

  // Far dust (soft, sparse).
  const dust=CFG.dust;
  for(let i=0;i<dust.length;i++){ if(dust[i].z>0.5) continue; drawMote(dust[i]); }
  ctx.globalAlpha=1;

  const leaves=CFG.leaves;
  for(let i=0;i<leaves.length;i++){
    const lf=leaves[i], dep=lf.depth, tone=lf.tone;
    // Active chapter gently brings one leaf forward (0 for all but the active leaf; leaf 0 at rest).
    const cw=storyStepWeight(story,i,leaves.length);
    const cx=lf.cx*w + Math.cos(t*lf.spin*0.6+lf.phase)*w*0.012*swayMul + px*w*(0.006+dep*0.022);
    const cy=lf.cy*h + Math.sin(t*lf.spin+lf.phase)*h*0.02*swayMul + py*h*(0.005+dep*0.016) + stackDrift + parY*(0.4+dep*0.8) - cw*h*0.009;
    const hw=lf.w*w*0.5, hh=lf.h*h*0.5;
    const curl=lf.curl + Math.sin(t*0.12+lf.phase)*0.09;

    // Body: hard-pushed translucency variance + a drop shadow that deepens with depth so
    // adjacent leaves read as stacked paper. Back leaves shed the shadow and blur is capped
    // (was up to 40) to cut the dominant per-frame cost under the HD downsample pass.
    ctx.save();
    if(dep>0.38){
      ctx.shadowColor="rgba(0,0,0,0.5)";
      ctx.shadowBlur=16+dep*8;
      ctx.shadowOffsetX=-5-dep*8;
      ctx.shadowOffsetY=8+dep*13;
    }
    leafPath(cx,cy,hw,hh,curl);
    const op=lf.op*(1+cw*0.1);
    const base=(0.045+dep*0.075)*op;
    const glow=0.05*Math.max(0,Math.sin(t*0.2+lf.phase));
    // Cap the bright lower-right band so it + the bright-pass bloom can't blow to a white hotspot.
    const band=Math.min(0.3,base*2.4+glow+cw*0.025);
    const g=ctx.createLinearGradient(cx-hw,cy+hh*0.5,cx+hw,cy-hh*0.5);
    g.addColorStop(0,"rgba("+tone[0]+","+tone[1]+","+tone[2]+","+(base*0.28).toFixed(4)+")");
    g.addColorStop(0.5,"rgba("+tone[0]+","+tone[1]+","+tone[2]+","+base.toFixed(4)+")");
    g.addColorStop(0.85,"rgba("+tone[0]+","+tone[1]+","+tone[2]+","+band.toFixed(4)+")");
    g.addColorStop(1,"rgba("+tone[0]+","+tone[1]+","+tone[2]+","+(base*0.52).toFixed(4)+")");
    ctx.fillStyle=g;
    ctx.fill();
    ctx.restore();

    // Paper tooth + a soft inner shade along the lower edge to deepen the fold between leaves.
    ctx.save();
    leafPath(cx,cy,hw,hh,curl);
    ctx.clip();
    for(let f=0;f<lf.fibers.length;f++){
      const fb=lf.fibers[f];
      const fy=cy-hh+2*hh*fb.o+Math.sin(t*0.15+fb.ph)*hh*0.04;
      const midY=fy+fbm(fb.o*3+i,t*0.05+f,2)*hh*0.15*fb.amp;
      ctx.beginPath();
      ctx.moveTo(cx-hw,fy);
      ctx.bezierCurveTo(cx-hw*0.3,midY-4,cx+hw*0.3,midY+5,cx+hw,fy+(fb.amp-0.5)*6);
      ctx.strokeStyle="rgba(255,249,239,"+(0.02+(f%2)*0.016).toFixed(4)+")";
      ctx.lineWidth=0.7;
      ctx.stroke();
    }
    const sh=ctx.createLinearGradient(cx,cy,cx,cy+hh);
    sh.addColorStop(0,"rgba(6,5,10,0)");
    sh.addColorStop(1,"rgba(6,5,10,"+(0.1+dep*0.17).toFixed(3)+")");
    ctx.fillStyle=sh;
    ctx.fillRect(cx-hw,cy,hw*2,hh);
    ctx.restore();

    // Deckled edge highlight — the active chapter's leaf reads a touch brighter/crisper.
    leafPath(cx,cy,hw,hh,curl);
    ctx.strokeStyle="rgba(255,248,236,"+(0.07+dep*0.09+cw*0.05).toFixed(4)+")";
    ctx.lineWidth=0.8+dep*0.6+cw*0.35;
    ctx.stroke();

    // Folded-edge catch-light — a small round bloom, never a streak or spark.
    if(dep>0.5){
      ctx.save();
      ctx.globalCompositeOperation="screen";
      const catchAlpha=Math.min(0.18,0.05+dep*0.05+cw*0.035+cw*focusLift);
      softGlow(ctx,cx+hw*0.45,cy-hh*0.35,hw*0.55,"rgba(255,242,220,"+catchAlpha.toFixed(4)+")","transparent");
      ctx.restore();
    }
  }

  // Near dust (soft, in front of the leaves).
  for(let i=0;i<dust.length;i++){ if(dust[i].z<=0.5) continue; drawMote(dust[i]); }
  ctx.globalAlpha=1;

  // Right-edge deckle glow.
  ctx.save();
  ctx.globalCompositeOperation="screen";
  const edge=ctx.createLinearGradient(w*0.7,0,w,0);
  edge.addColorStop(0,"rgba(255,242,224,0)");
  edge.addColorStop(0.8,"rgba(255,242,224,0.03)");
  edge.addColorStop(1,"rgba(255,250,242,0.1)");
  ctx.fillStyle=edge;
  ctx.fillRect(w*0.6,0,w*0.4,h);
  ctx.restore();

  // Editorial clear space on the left — extended toward centre (~0.66w) to protect the reading column.
  const clear=ctx.createLinearGradient(0,0,w*0.66,0);
  clear.addColorStop(0,"rgba(7,6,11,0.62)");
  clear.addColorStop(0.72,"rgba(7,6,11,0.2)");
  clear.addColorStop(1,"rgba(7,6,11,0)");
  ctx.fillStyle=clear;
  ctx.fillRect(0,0,w*0.68,h);

  const grade=ctx.createLinearGradient(0,0,w,h);
  grade.addColorStop(0,"rgba(20,16,26,0.18)");
  grade.addColorStop(0.5,"rgba(0,0,0,0)");
  grade.addColorStop(1,"rgba(8,6,12,0.28)");
  ctx.fillStyle=grade;
  ctx.fillRect(0,0,w,h);

  const vig=ctx.createRadialGradient(w*0.74,h*0.42,minS*0.15,w*0.6,h*0.46,maxS*0.8);
  vig.addColorStop(0,"rgba(0,0,0,0)");
  vig.addColorStop(1,"rgba(3,2,6,0.45)");
  ctx.fillStyle=vig;
  ctx.fillRect(0,0,w,h);

  ctx.globalAlpha=1;
  ctx.beginPath();
  ctx.arc(w*0.94,h*0.11,minS*0.0028,0,TAU);
  ctx.fillStyle="rgba(255,248,238,0.4)";
  ctx.fill();

  ctx.restore();
};
