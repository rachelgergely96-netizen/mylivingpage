import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { resolveThemeMotion, storyStepWeight } from "../shared/motion";
import { softGlow } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

const CFG = (function(){
  const rand = createSeededRandom(72519);
  const warmPal = [[255,244,232],[255,226,210],[231,173,157],[245,190,190],[255,236,220]];
  const layers = [];
  const counts = [40,26,16];
  const depths = [0.28,0.6,1.0];
  for (let li=0; li<3; li++){
    const stars = [];
    const n = counts[li];
    for (let i=0;i<n;i++){
      const c = warmPal[(rand()*warmPal.length)|0];
      stars.push({ x: rand(), y: rand(), r: 0.4 + rand()*rand()*(1.1 + li*0.7), tw: rand()*TAU, tws: 0.3 + rand()*0.9, bright: rand(), cr: c[0], cg: c[1], cb: c[2] });
    }
    layers.push({ stars: stars, depth: depths[li] });
  }
  const motes = [];
  for (let i=0;i<13;i++){
    const c = warmPal[(rand()*warmPal.length)|0];
    motes.push({ a0: rand()*TAU, rad: 1.12 + rand()*1.9, ecc: 0.42 + rand()*0.24, spd: (0.03 + rand()*0.08)*(rand()<0.5?-1:1), size: 0.6 + rand()*rand()*3.0, ph: rand()*TAU, tilt: -0.6 + rand()*1.2, cr: c[0], cg: c[1], cb: c[2] });
  }
  const rings = [];
  for (let i=0;i<7;i++){
    rings.push({ rf: 1.12 + i*0.27 + rand()*0.06, ecc: 0.34 + i*0.05 + rand()*0.05, tilt: -0.6 + i*0.16 + rand()*0.22, spd: 0.02 + i*0.006 + rand()*0.004, arc: 0.8 + rand()*0.9, nodePh: rand()*TAU, nodeSpd: (0.05 + rand()*0.12)*(rand()<0.5?-1:1), wob: rand()*TAU });
  }
  const fringe = [];
  for (let i=0;i<5;i++){ fringe.push({ a: (i/5)*TAU + rand()*0.3, sp: 0.15 + rand()*0.4, ph: rand()*TAU, rf: 1.06 + rand()*0.14, size: 0.26 + rand()*0.22 }); }
  const masses = [
    {dx:0.0, dy:0.0, rf:2.8, cr:231,cg:173,cb:157, a:0.09, dph:0.11, dr:0.35},
    {dx:0.65,dy:0.7, rf:2.2, cr:255,cg:214,cb:196, a:0.06, dph:0.13, dr:0.42},
    {dx:1.0, dy:-0.7,rf:1.9, cr:255,cg:236,cb:222, a:0.05, dph:0.15, dr:0.3}
  ];
  return { layers: layers, motes: motes, rings: rings, fringe: fringe, masses: masses };
})();

export const renderHalo: ThemeRenderer = (ctx,w,h,t,mx,my,_deltaSeconds,motion)=>{
  const M=resolveThemeMotion(motion);
  const clamp01=(v: number)=> v<0?0:(v>1?1:v);
  const cap=(v: number,m: number)=> v<0?0:(v>m?m:v);
  const pmx=Number.isFinite(mx)?clamp01(mx):0.5;
  const pmy=Number.isFinite(my)?clamp01(my):0.5;
  const pointerX=pmx-0.5;
  const pointerY=pmy-0.5;
  const minSide=Math.min(w,h)||1;
  const maxSide=Math.max(w,h)||1;

  // Page-reactive channels — all zero at rest (motion undefined => resolveThemeMotion zeros).
  const story=M.storyProgress;
  const vel=Math.abs(M.scrollVelocity)/4;      // 0..1
  const spin=M.scrollVelocity*0.05;            // signed spin nudge
  const imp=M.interactionImpulse;              // 0..1
  const coronaLift=1+vel*0.22+imp*0.15;        // capped brightness lift

  const haloX=w*0.76+pointerX*minSide*0.05;
  const haloY=h*0.40+pointerY*minSide*0.045-story*minSide*0.03;
  const R=minSide*0.19;

  ctx.save();

  const grade=ctx.createLinearGradient(0,0,w*0.4,h);
  grade.addColorStop(0,"rgba(22,9,17,0.55)");
  grade.addColorStop(1,"rgba(8,3,7,0)");
  ctx.fillStyle=grade; ctx.fillRect(0,0,w,h);

  // Atmospheric warm wash — softened alpha + reach pulled in, biased right of the reading column.
  const warmWash=ctx.createRadialGradient(haloX,haloY,R*0.2,haloX,haloY,R*2.9);
  warmWash.addColorStop(0,"rgba(88,44,44,0.24)");
  warmWash.addColorStop(0.4,"rgba(50,24,34,0.14)");
  warmWash.addColorStop(1,"rgba(5,2,4,0)");
  ctx.fillStyle=warmWash; ctx.fillRect(w*0.28,0,w*0.72,h);

  // Pulsing atmospheric masses (3, right/centre-biased) — soft round blooms only.
  ctx.globalCompositeOperation="screen";
  for(let i=0;i<CFG.masses.length;i++){
    const m=CFG.masses[i];
    const ph=t*m.dph;
    const ox=Math.cos(ph+i)*minSide*m.dr*0.12;
    const oy=Math.sin(ph*0.8+i)*minSide*m.dr*0.1;
    const cxm=haloX+m.dx*R+ox;
    const cym=haloY+m.dy*R+oy;
    const rr=R*m.rf;
    const pulse=0.78+0.22*Math.sin(t*0.3+i*1.7);
    const g=ctx.createRadialGradient(cxm,cym,rr*0.05,cxm,cym,rr);
    const a=m.a*pulse;
    g.addColorStop(0,`rgba(${m.cr},${m.cg},${m.cb},${a})`);
    g.addColorStop(0.5,`rgba(${m.cr},${m.cg},${m.cb},${a*0.4})`);
    g.addColorStop(1,`rgba(${m.cr},${m.cg},${m.cb},0)`);
    ctx.fillStyle=g;
    ctx.fillRect(cxm-rr,cym-rr,rr*2,rr*2);
  }
  ctx.globalCompositeOperation="source-over";

  // Thinned nebula puffs — soft round glows (6).
  ctx.globalCompositeOperation="screen";
  for(let i=0;i<6;i++){
    const ang=(i/6)*TAU+t*0.03+spin*0.5;
    const rad=R*(1.3+0.7*Math.sin(i*2.3+t*0.05));
    const dx=haloX+Math.cos(ang)*rad;
    const dy=haloY+Math.sin(ang)*rad*0.62;
    const n=0.5+0.5*fbm(dx*0.004+t*0.02,dy*0.004,3);
    const pr=R*(0.3+n*0.4);
    softGlow(ctx,dx,dy,pr,`rgba(231,173,157,${0.05*n})`,"transparent");
  }
  ctx.globalCompositeOperation="source-over";

  // Parallax star layers — round points with gentle, capped blooms.
  for(let li=0;li<CFG.layers.length;li++){
    const L=CFG.layers[li];
    const depth=L.depth;
    const parX=-pointerX*minSide*0.03*depth;
    const parY=-pointerY*minSide*0.03*depth;
    for(let s=0;s<L.stars.length;s++){
      const st=L.stars[s];
      const sway=Math.sin(t*0.05+st.tw)*minSide*0.008*depth;
      const x=st.x*w+parX+sway;
      const y=st.y*h+parY;
      const tw=0.45+0.55*Math.sin(t*st.tws+st.tw);
      const a=(0.1+tw*0.5)*(0.5+depth*0.55);
      const rr=st.r*(0.7+depth*0.9);
      if(st.bright>0.9&&depth>0.5&&tw>0.72){
        softGlow(ctx,x,y,rr*(3+tw*3),`rgba(${st.cr},${st.cg},${st.cb},${cap(a*0.35,0.3)})`,"transparent");
      }
      ctx.beginPath();
      ctx.arc(x,y,rr,0,TAU);
      ctx.fillStyle=`rgba(${st.cr},${st.cg},${st.cb},${cap(a,0.55)})`;
      ctx.fill();
    }
  }

  // Corona bloom — volumetric light; its bright core sits under the disc so highlights stay controlled.
  ctx.globalCompositeOperation="screen";
  const coreP=(0.82+0.18*Math.sin(t*0.5))*coronaLift;
  const corona=ctx.createRadialGradient(haloX,haloY,R*0.7,haloX,haloY,R*2.5);
  corona.addColorStop(0,`rgba(255,238,224,${cap(0.4*coreP,0.5)})`);
  corona.addColorStop(0.12,`rgba(250,196,206,${cap(0.28*coreP,0.36)})`);
  corona.addColorStop(0.4,`rgba(206,112,150,${cap(0.11*coreP,0.16)})`);
  corona.addColorStop(1,"rgba(70,30,60,0)");
  ctx.fillStyle=corona;
  ctx.beginPath(); ctx.arc(haloX,haloY,R*2.5,0,TAU); ctx.fill();

  // Soft uneven fringe blooms around the rim (5).
  const fringeRot=t*0.02+pointerX*0.05+spin*0.4;
  for(let i=0;i<CFG.fringe.length;i++){
    const fr=CFG.fringe[i];
    const shimmer=0.5+0.5*Math.sin(t*fr.sp+fr.ph);
    const ang=fr.a+fringeRot;
    const rad=R*fr.rf;
    const fx=haloX+Math.cos(ang)*rad;
    const fy=haloY+Math.sin(ang)*rad*0.94;
    softGlow(ctx,fx,fy,R*fr.size*(0.7+shimmer*0.6),`rgba(255,206,186,${cap(0.04+shimmer*0.06,0.11)})`,"transparent");
  }
  ctx.globalCompositeOperation="source-over";

  // Focus response — a soft bloom bends attention toward the focused region (off at rest).
  if(M.hasFocus){
    const fxp=M.focusX*w, fyp=M.focusY*h;
    const fang=Math.atan2(fyp-haloY,fxp-haloX);
    const ex=haloX+Math.cos(fang)*R*1.35;
    const ey=haloY+Math.sin(fang)*R*0.95;
    ctx.globalCompositeOperation="screen";
    softGlow(ctx,ex,ey,R*0.6,"rgba(255,214,196,0.26)","transparent");
    ctx.globalCompositeOperation="source-over";
  }

  // Layered elliptical rings + orbiting node beads — the core of the vibe. No shadowBlur (perf).
  ctx.save();
  ctx.globalCompositeOperation="screen";
  const stepCount=Math.max(0,Math.min(CFG.rings.length,M.sectionCount));
  for(let i=0;i<CFG.rings.length;i++){
    const rg=CFG.rings[i];
    const pulse=0.6+0.4*Math.sin(t*0.4+i*0.9);
    const rx=R*rg.rf;
    const ry=rx*rg.ecc;
    const tilt=rg.tilt+Math.sin(t*0.05+rg.wob)*0.06+pointerX*0.08;
    const phase=t*rg.spd+i+story*0.9+spin;
    const span=Math.PI*rg.arc;
    const a=(0.2-i*0.012)*pulse;
    ctx.beginPath();
    ctx.ellipse(haloX,haloY,rx,ry,tilt,phase,phase+span);
    ctx.strokeStyle=`rgba(231,173,157,${a>0.035?a:0.035})`;
    ctx.lineWidth=Math.max(0.7,1.6-i*0.12);
    ctx.stroke();
    const nodeA=rg.nodePh+t*rg.nodeSpd+story*0.9+spin;
    const ex=Math.cos(nodeA)*rx;
    const ey=Math.sin(nodeA)*ry;
    const ctil=Math.cos(tilt),stil=Math.sin(tilt);
    const nx=haloX+ex*ctil-ey*stil;
    const ny=haloY+ex*stil+ey*ctil;
    const ng=0.4+0.6*(0.5+0.5*Math.sin(t*0.8+i));
    let wp=0;
    if(i<stepCount) wp=storyStepWeight(M.storyProgress,i,stepCount);
    const glow=ng*(1+wp*0.7);
    softGlow(ctx,nx,ny,R*0.1*ng+2+wp*R*0.05,`rgba(255,214,196,${cap(0.5*glow,0.55)})`,"transparent");
    ctx.beginPath();
    ctx.arc(nx,ny,1.2+ng*1.4+wp*1.2,0,TAU);
    ctx.fillStyle=`rgba(255,236,224,${cap(0.55*glow,0.55)})`;
    ctx.fill();
  }
  ctx.restore();

  // The eclipse disc (covers the brightest corona core).
  const disc=ctx.createRadialGradient(haloX-R*0.3,haloY-R*0.32,R*0.05,haloX,haloY,R*1.02);
  disc.addColorStop(0,"rgba(26,14,22,1)");
  disc.addColorStop(0.55,"rgba(12,7,12,1)");
  disc.addColorStop(0.88,"rgba(6,4,8,1)");
  disc.addColorStop(1,"rgba(4,2,5,0)");
  ctx.fillStyle=disc;
  ctx.beginPath(); ctx.arc(haloX,haloY,R*1.02,0,TAU); ctx.fill();

  // Warm relief glow inside the disc (single soft gradient, no extra puffs).
  ctx.save();
  ctx.beginPath(); ctx.arc(haloX,haloY,R*0.99,0,TAU); ctx.clip();
  ctx.globalCompositeOperation="screen";
  const earth=ctx.createRadialGradient(haloX-R*0.5,haloY-R*0.5,R*0.1,haloX-R*0.2,haloY-R*0.2,R*1.3);
  earth.addColorStop(0,"rgba(120,60,72,0.3)");
  earth.addColorStop(0.5,"rgba(70,34,50,0.12)");
  earth.addColorStop(1,"rgba(20,10,18,0)");
  ctx.fillStyle=earth;
  ctx.fillRect(haloX-R,haloY-R,R*2,R*2);
  ctx.restore();

  // Rim light along the circumference — thin curved edge, no shadowBlur, low alpha so bloom won't clip.
  ctx.save();
  ctx.globalCompositeOperation="screen";
  ctx.beginPath();
  ctx.arc(haloX,haloY,R*1.005,0,TAU);
  ctx.strokeStyle="rgba(231,173,157,0.3)";
  ctx.lineWidth=Math.max(1,R*0.01);
  ctx.stroke();
  const beadAngle=-2.3+Math.sin(t*0.08)*0.25;
  ctx.beginPath();
  ctx.arc(haloX,haloY,R*1.008,beadAngle-1.2,beadAngle+1.2);
  ctx.strokeStyle=`rgba(255,232,216,${cap(0.42+imp*0.12,0.5)})`;
  ctx.lineWidth=Math.max(1.4,R*0.018);
  ctx.stroke();
  ctx.restore();

  // Diamond-point bead — layered soft round blooms (capped for additive bloom / HD).
  const bx2=haloX+Math.cos(beadAngle)*R*1.01;
  const by2=haloY+Math.sin(beadAngle)*R*1.01;
  ctx.save();
  ctx.globalCompositeOperation="screen";
  const beadPulse=0.72+0.28*Math.sin(t*1.6);
  const beadImp=1+imp*0.2;
  softGlow(ctx,bx2,by2,R*0.5*beadPulse*beadImp,`rgba(255,222,204,${cap(0.42*beadPulse,0.48)})`,"transparent");
  softGlow(ctx,bx2,by2,R*0.2,`rgba(255,238,224,${cap(0.5*beadPulse,0.55)})`,"transparent");
  ctx.beginPath();
  ctx.arc(bx2,by2,Math.max(1.4,R*0.017*beadPulse),0,TAU);
  ctx.fillStyle=`rgba(255,244,232,${cap(0.5*beadPulse,0.55)})`;
  ctx.fill();
  ctx.restore();

  // Refined floating particles orbiting the halo (13, capped brightness; glow only on larger motes).
  ctx.save();
  ctx.globalCompositeOperation="screen";
  for(let i=0;i<CFG.motes.length;i++){
    const mo=CFG.motes[i];
    const ang=mo.a0+t*mo.spd+spin*0.6;
    const rad=R*mo.rad;
    const ex=Math.cos(ang)*rad;
    const ey=Math.sin(ang)*rad*mo.ecc;
    const ctil=Math.cos(mo.tilt),stil=Math.sin(mo.tilt);
    const mpx=haloX+ex*ctil-ey*stil+pointerX*minSide*0.02;
    const mpy=haloY+ex*stil+ey*ctil+pointerY*minSide*0.02;
    const fl=0.4+0.6*Math.sin(t*0.7+mo.ph);
    const sz=mo.size*(0.6+fl*0.8);
    if(sz>1.2){
      softGlow(ctx,mpx,mpy,sz*4,`rgba(${mo.cr},${mo.cg},${mo.cb},${cap(0.12+fl*0.2,0.3)})`,"transparent");
    }
    ctx.beginPath();
    ctx.arc(mpx,mpy,sz,0,TAU);
    ctx.fillStyle=`rgba(255,240,226,${cap(0.18+fl*0.3,0.45)})`;
    ctx.fill();
  }
  ctx.restore();

  // Left clear-space — strengthened + extended toward centre so page text stays legible.
  const clear=ctx.createLinearGradient(0,0,w*0.72,0);
  clear.addColorStop(0,"rgba(5,2,4,0.86)");
  clear.addColorStop(0.5,"rgba(5,2,4,0.5)");
  clear.addColorStop(1,"rgba(5,2,4,0)");
  ctx.fillStyle=clear; ctx.fillRect(0,0,w*0.72,h);

  const vig=ctx.createRadialGradient(haloX,haloY,minSide*0.15,w*0.5,h*0.5,maxSide*0.82);
  vig.addColorStop(0,"rgba(0,0,0,0)");
  vig.addColorStop(0.7,"rgba(0,0,0,0.12)");
  vig.addColorStop(1,"rgba(0,0,0,0.5)");
  ctx.fillStyle=vig; ctx.fillRect(0,0,w,h);

  ctx.restore();
};
