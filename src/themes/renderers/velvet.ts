import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { finiteClamp, resolveThemeMotion } from "../shared/motion";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

const CFG=(function(){
  const rnd=createSeededRandom(20714);
  const nap=[];
  for(let i=0;i<150;i++){
    nap.push({x:rnd(),y:rnd(),len:2+rnd()*9,lean:(rnd()-0.5)*5,bright:rnd(),warm:rnd()<0.28});
  }
  // Motes seeded off the left reading column (x>=0.28); render-time colBias dims them further to the centre-left.
  const motes=[];
  for(let i=0;i<36;i++){
    motes.push({x:0.28+rnd()*0.72,y:rnd(),r:0.5+rnd()*1.9,phase:rnd()*6.2831853,speed:0.05+rnd()*0.2,drift:0.35+rnd()*0.95,bright:0.3+rnd()*0.7});
  }
  const crush=[];
  for(let i=0;i<12;i++){
    crush.push({x:rnd(),y:rnd(),r:0.09+rnd()*0.22,dark:rnd()<0.6,phase:rnd()*6.2831853});
  }
  // Pooled warm light: dominant focal bloom nudged right of the reading column,
  // supporting pools spread to the corners and the right folio gutter.
  const pools=[
    {x:0.54,y:0.42,r:0.62,phase:0.0,c0:"150,44,82",c1:"80,14,40"},
    {x:0.74,y:0.60,r:0.50,phase:1.7,c0:"104,16,46",c1:"54,7,26"},
    {x:0.62,y:0.24,r:0.42,phase:3.1,c0:"160,50,84",c1:"92,18,46"},
    {x:0.83,y:0.36,r:0.44,phase:4.6,c0:"92,14,42",c1:"46,6,22"},
    {x:0.26,y:0.72,r:0.44,phase:5.5,c0:"118,20,52",c1:"62,9,30"}
  ];
  return {nap,motes,crush,pools};
})();

export const renderVelvet: ThemeRenderer = (ctx,w,h,t,mx,my,_deltaSeconds,motion)=>{
  const M=resolveThemeMotion(motion);
  const reduced=!!(motion&&motion.reducedMotion);
  const T=reduced?0:finiteClamp(t,0,1e6);
  const px=(mx-0.5), py=(my-0.5);
  const minD=Math.min(w,h), maxD=Math.max(w,h);

  // Page motion — all zero at rest / in the preview (motion undefined), so the
  // scene below reads as its base composition and motion only adds nuance on top.
  const impulse=finiteClamp(M.interactionImpulse,0,1,0);
  const vel=finiteClamp(Math.abs(M.scrollVelocity),0,1,0);
  const story=reduced?0:finiteClamp(M.storyProgress,0,1,0);
  const hasFocus=M.hasFocus&&!reduced;
  const fx=finiteClamp(M.focusX,0,1,0.5);
  const fy=finiteClamp(M.focusY,0,1,0.5);
  const bloomBias=1+impulse*0.22;   // interaction impulse gently biases bloom brightness
  const storyDrift=story*0.04;      // cluster drifts as the reader scrolls (0 at rest)

  // Deep oxblood ground, edge to edge.
  const base=ctx.createLinearGradient(0,0,w,h);
  base.addColorStop(0,"rgba(44,8,21,0.90)");
  base.addColorStop(0.45,"rgba(24,5,13,0.88)");
  base.addColorStop(1,"rgba(8,2,5,0.94)");
  ctx.fillStyle=base;
  ctx.fillRect(0,0,w,h);

  // Crushed-pile pockets: dark hollows and faint warm crests give the velvet body.
  for(let i=0;i<CFG.crush.length;i++){
    const c=CFG.crush[i];
    const cx=c.x*w, cy=c.y*h;
    const fb=fbm(c.x*3+T*0.015, c.y*3-T*0.01, 2);
    const rr=Math.abs(c.r*minD*(0.85+0.2*Math.sin(T*0.07+c.phase)))+0.001;
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,rr);
    if(c.dark){
      const a=0.10+0.08*(0.5+0.5*fb);
      g.addColorStop(0,`rgba(3,1,2,${a.toFixed(3)})`);
      g.addColorStop(1,"rgba(3,1,2,0)");
    } else {
      const a=0.04+0.04*(0.5+0.5*fb);
      g.addColorStop(0,`rgba(150,42,74,${a.toFixed(3)})`);
      g.addColorStop(1,"rgba(150,42,74,0)");
    }
    ctx.fillStyle=g;
    ctx.fillRect(cx-rr,cy-rr,rr*2,rr*2);
  }

  // Pooled warm light — soft round blooms drifting slowly over the pile.
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  for(let i=0;i<CFG.pools.length;i++){
    const p=CFG.pools[i];
    // Spotlight the pool nearest the focused card so it lifts out of the pile.
    let prox=0;
    if(hasFocus){
      const ddx=p.x-fx, ddy=p.y-fy;
      prox=finiteClamp(1-Math.sqrt(ddx*ddx+ddy*ddy)*2.4,0,1,0);
    }
    const dx=Math.sin(T*0.03+p.phase)*0.04+storyDrift;
    const dy=Math.cos(T*0.025+p.phase*1.3)*0.035-storyDrift*0.5;
    const cx=(p.x+dx+px*0.05)*w;
    const cy=(p.y+dy+py*0.05)*h;
    const rr=Math.abs(p.r*minD*(0.9+0.1*Math.sin(T*0.05+p.phase))*(1+prox*0.14))+0.001;
    const aPk=(0.085+0.045*(0.5+0.5*Math.sin(T*0.04+p.phase)))*bloomBias+prox*0.05;
    const a=finiteClamp(aPk,0,0.19,0.1).toFixed(3);
    const a1=finiteClamp((0.038+0.02*Math.sin(T*0.04+p.phase))*bloomBias,0,0.08,0.04).toFixed(3);
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,rr);
    g.addColorStop(0,`rgba(${p.c0},${a})`);
    g.addColorStop(0.55,`rgba(${p.c1},${a1})`);
    g.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=g;
    ctx.fillRect(cx-rr,cy-rr,rr*2,rr*2);
  }
  ctx.restore();

  // Gentle warm wash lifts the upper field — kept low and shallow so header text stays legible.
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  const top=ctx.createLinearGradient(0,0,0,h*0.44);
  const topA=finiteClamp(0.055*bloomBias,0,0.08,0.055).toFixed(3);
  top.addColorStop(0,`rgba(150,52,86,${topA})`);
  top.addColorStop(1,"rgba(150,52,86,0)");
  ctx.fillStyle=top;
  ctx.fillRect(0,0,w,h*0.44);
  ctx.restore();

  // Raking sheen across the nap: the pile lights up where the rake passes.
  const rakeSpeed=0.06*(1+vel*0.7);
  const rake=0.5+Math.sin(T*rakeSpeed)*0.26+px*0.10;
  ctx.save();
  ctx.lineCap="round";
  ctx.lineWidth=0.85;
  const darkStroke="rgba(56,7,26,0.11)";
  for(let i=0;i<CFG.nap.length;i++){
    const n=CFG.nap[i];
    if(n.warm){
      const d=Math.abs(n.x-rake);
      const sheen=Math.max(0,1-d*2.6);
      const a=0.03+sheen*0.12+n.bright*0.02;
      ctx.strokeStyle=`rgba(233,168,186,${a.toFixed(3)})`;
    } else {
      ctx.strokeStyle=darkStroke;
    }
    const x=n.x*w, y=n.y*h;
    ctx.beginPath();
    ctx.moveTo(x,y);
    ctx.lineTo(x+n.lean,y+n.len);
    ctx.stroke();
  }
  ctx.restore();

  // Broad, low soft sheen glow tracking the rake — a wide raking bloom, never a hard bar.
  const sx=rake*w;
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  const sheenA=finiteClamp(0.05*bloomBias+impulse*0.02,0,0.085,0.05).toFixed(3);
  const sb=ctx.createLinearGradient(sx-w*0.20,0,sx+w*0.20,0);
  sb.addColorStop(0,"rgba(255,214,225,0)");
  sb.addColorStop(0.5,`rgba(236,150,175,${sheenA})`);
  sb.addColorStop(1,"rgba(255,214,225,0)");
  ctx.fillStyle=sb;
  ctx.fillRect(sx-w*0.20,0,w*0.40,h);
  ctx.restore();

  // Brass-dust motes drift through the pooled light — dimmed over the centre-left
  // reading column, brightening toward the right folio gutter; alpha capped so the
  // bright-pass bloom gives a soft halo rather than a blown-out white speck.
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  const twGain=1+impulse*0.4;
  const twSpeed=1+vel*0.8;
  for(let i=0;i<CFG.motes.length;i++){
    const m=CFG.motes[i];
    const yy=(((m.y-T*m.speed*0.02)%1)+1)%1;
    const sway=Math.sin(T*0.3*m.drift+m.phase)*0.012;
    const xx=(((m.x+sway-px*0.04*m.drift)%1)+1)%1;
    const cb=finiteClamp((xx-0.40)/0.34,0,1,0);
    const colBias=0.26+0.74*cb*cb*(3-2*cb);
    const x=xx*w, y=yy*h;
    const tw=0.4+0.6*(0.5+0.5*Math.sin(T*1.1*twSpeed*m.drift+m.phase));
    const rr=m.r*(minD/900+0.55);
    const a=finiteClamp(m.bright*tw*twGain*0.20*colBias,0,0.22,0);
    ctx.fillStyle=`rgba(255,${(198+m.bright*34)|0},${(196+m.bright*24)|0},${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x,y,rr,0,TAU);
    ctx.fill();
  }
  ctx.restore();

  // Vignette folds the borderless velvet into deep shadow at the edges.
  const vig=ctx.createRadialGradient(w*0.5,h*0.44,minD*0.14,w*0.5,h*0.5,maxD*0.82);
  vig.addColorStop(0,"rgba(0,0,0,0)");
  vig.addColorStop(0.7,"rgba(5,1,3,0.22)");
  vig.addColorStop(1,"rgba(3,1,2,0.56)");
  ctx.fillStyle=vig;
  ctx.fillRect(0,0,w,h);
};
