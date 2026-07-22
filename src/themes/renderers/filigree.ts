import { createSeededRandom } from "../shared/random";
import { resolveThemeMotion, storyStepWeight } from "../shared/motion";
import { softGlow } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

interface FiligreeGradientCache {
  w: number;
  h: number;
  metal: CanvasGradient[];
  imetal: CanvasGradient | null;
  ring: CanvasGradient | null;
  gem: CanvasGradient | null;
  pearlRim: CanvasGradient | null;
  pr: number;
  pearlTerm: CanvasGradient | null;
  br: number;
  clear: CanvasGradient | null;
}

const CFG=(function(){
  const rnd=createSeededRandom(917.42);
  const P2=Math.PI*2;
  const ARMS=11, LAYERS=3;
  const arms=[];
  for(let i=0;i<ARMS;i++){
    arms.push({base:i/ARMS, mirror:rnd()<0.5?1:-1, wob:rnd()*P2, wobAmp:0.03+rnd()*0.05, len:0.92+rnd()*0.2});
  }
  const inner=[];
  const IN=11;
  for(let i=0;i<IN;i++){
    inner.push({base:(i+0.5)/IN, mirror:rnd()<0.5?1:-1, ph:rnd()*P2, len:0.8+rnd()*0.25});
  }
  const pearls=[];
  const PN=18;
  for(let i=0;i<PN;i++){ pearls.push({a:(i/PN)*P2, ph:rnd()*P2}); }
  const beads=[];
  const BN=32;
  for(let i=0;i<BN;i++){ beads.push({a:(i/BN)*P2, ph:rnd()*P2}); }
  const motes=[];
  for(let i=0;i<40;i++){
    motes.push({x:rnd(), y:rnd(), r:0.4+rnd()*1.7, depth:rnd(), ph:rnd()*P2, spd:0.25+rnd()*0.85, bright:rnd(), drift:rnd()*P2});
  }
  const arcs=[];
  for(let i=0;i<7;i++){ arcs.push({rr:0.1+i*0.05, ph:rnd()*P2, a0:-2.3+rnd()*0.6, a1:1.3+rnd()*0.8, dash:0.006+rnd()*0.004}); }
  const gc: FiligreeGradientCache={w:0,h:0,metal:[],imetal:null,ring:null,gem:null,pearlRim:null,pr:0,pearlTerm:null,br:0,clear:null};
  return {ARMS, LAYERS, arms, inner, pearls, beads, motes, arcs, gc:gc};
})();

export const renderFiligree: ThemeRenderer = (ctx,w,h,t,mx,my,_deltaSeconds,motion)=>{
  const M=resolveThemeMotion(motion);
  const story=M.storyProgress;
  const storyLive=M.sectionCount>0;
  const scrollVel=M.scrollVelocity/4;
  const impulse=M.interactionImpulse;
  const hasFocus=M.hasFocus;
  const focusXn=M.focusX, focusYn=M.focusY;

  const minSide=Math.min(w,h)||1;
  const maxSide=Math.max(w,h)||1;
  const portrait=h>=w;
  const medScale=portrait?0.9:1;
  const px=mx-0.5, py=my-0.5;
  const cx=w*0.79+px*minSide*0.03+scrollVel*minSide*0.008+story*minSide*0.02;
  const cy=h*0.48+py*minSide*0.025+story*minSide*0.006;
  const turn=t*0.045+story*0.10+scrollVel*0.03;
  const breathe=1+Math.sin(t*0.6)*0.012;

  // ---- gradient cache (rebuild only on resize) ----
  const GC=CFG.gc;
  if(GC.w!==w||GC.h!==h){
    GC.w=w; GC.h=h;
    GC.metal=[];
    for(let L=0;L<CFG.LAYERS;L++){
      const rad=minSide*(0.14+L*0.072);
      const g=ctx.createLinearGradient(-rad*0.1,-rad*0.22,rad*0.72,rad*0.46);
      g.addColorStop(0.0,"rgba(120,74,50,0.55)");
      g.addColorStop(0.22,"rgba(206,161,108,0.88)");
      g.addColorStop(0.46,"rgba(230,216,188,0.86)");
      g.addColorStop(0.6,"rgba(212,178,114,0.9)");
      g.addColorStop(0.82,"rgba(150,98,64,0.7)");
      g.addColorStop(1.0,"rgba(92,58,44,0.5)");
      GC.metal.push(g);
    }
    const inR=minSide*0.1;
    const im=ctx.createLinearGradient(-inR*0.1,-inR*0.2,inR*0.7,inR*0.4);
    im.addColorStop(0,"rgba(150,100,64,0.6)");
    im.addColorStop(0.45,"rgba(232,216,186,0.88)");
    im.addColorStop(0.7,"rgba(212,178,114,0.82)");
    im.addColorStop(1,"rgba(110,70,50,0.5)");
    GC.imetal=im;
    const bR=minSide*0.05;
    const rg=ctx.createLinearGradient(-bR*1.4,-bR*1.4,bR*1.4,bR*1.4);
    rg.addColorStop(0,"rgba(150,100,62,0.9)");
    rg.addColorStop(0.5,"rgba(232,218,188,0.94)");
    rg.addColorStop(1,"rgba(120,78,54,0.9)");
    GC.ring=rg;
    const gm=ctx.createRadialGradient(-bR*0.3,-bR*0.35,0,0,0,bR);
    gm.addColorStop(0,"rgba(238,228,208,0.94)");
    gm.addColorStop(0.22,"rgba(226,190,140,0.92)");
    gm.addColorStop(0.6,"rgba(150,92,66,0.9)");
    gm.addColorStop(1,"rgba(44,26,30,0.85)");
    GC.gem=gm;
    const pr=minSide*0.0042;
    const prg=ctx.createRadialGradient(-pr*0.3,-pr*0.3,0,0,0,pr);
    prg.addColorStop(0,"rgba(238,230,212,0.88)");
    prg.addColorStop(0.5,"rgba(230,200,152,0.66)");
    prg.addColorStop(1,"rgba(110,72,56,0.14)");
    GC.pearlRim=prg; GC.pr=pr;
    const br=minSide*0.006;
    const ptg=ctx.createRadialGradient(-br*0.3,-br*0.35,0,0,0,br);
    ptg.addColorStop(0,"rgba(238,230,214,0.92)");
    ptg.addColorStop(0.4,"rgba(234,206,162,0.76)");
    ptg.addColorStop(1,"rgba(120,78,60,0.1)");
    GC.pearlTerm=ptg; GC.br=br;
    const cs=ctx.createLinearGradient(0,0,w*0.62,0);
    cs.addColorStop(0,"rgba(5,6,10,0.82)");
    cs.addColorStop(0.62,"rgba(5,6,10,0.34)");
    cs.addColorStop(1,"rgba(5,6,10,0)");
    GC.clear=cs;
  }

  const curl=(r:number,s:number)=>{
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.bezierCurveTo(r*0.13, s*-r*0.03, r*0.34, s*-r*0.34, r*0.56, s*-r*0.09);
    ctx.bezierCurveTo(r*0.76, s*r*0.15, r*0.47, s*r*0.43, r*0.27, s*r*0.15);
    ctx.bezierCurveTo(r*0.14, s*-r*0.02, r*0.33, s*-r*0.16, r*0.43, s*r*0.015);
    ctx.bezierCurveTo(r*0.49, s*r*0.085, r*0.405, s*r*0.125, r*0.35, s*r*0.05);
  };
  const leaf=(r:number,s:number)=>{
    ctx.beginPath();
    ctx.moveTo(r*0.08,0);
    ctx.bezierCurveTo(r*0.19, s*-r*0.14, r*0.34, s*-r*0.13, r*0.41, 0);
    ctx.bezierCurveTo(r*0.32, s*r*0.1, r*0.18, s*r*0.12, r*0.08, 0);
    ctx.closePath();
  };

  const termPos=[];

  ctx.save();

  // ---- A. Warm velvet atmosphere + slow-drifting soft masses ----
  const pool=ctx.createRadialGradient(cx,cy,minSide*0.02,cx,cy,minSide*0.62);
  pool.addColorStop(0,"rgba(92,62,40,0.42)");
  pool.addColorStop(0.34,"rgba(122,74,76,0.16)");
  pool.addColorStop(0.7,"rgba(40,30,44,0.06)");
  pool.addColorStop(1,"rgba(5,6,10,0)");
  ctx.fillStyle=pool;
  ctx.fillRect(cx-minSide*0.64,cy-minSide*0.64,minSide*1.28,minSide*1.28);

  ctx.globalCompositeOperation="screen";
  softGlow(ctx, cx+Math.cos(t*0.05)*minSide*0.06, cy+Math.sin(t*0.043)*minSide*0.05, minSide*0.34, "rgba(150,110,58,0.20)", "transparent");
  softGlow(ctx, cx+Math.cos(t*0.037+2.1)*minSide*0.08, cy+Math.sin(t*0.061+1.3)*minSide*0.07, minSide*0.26, "rgba(122,58,74,0.16)", "transparent");
  softGlow(ctx, cx+Math.cos(t*0.028+4.0)*minSide*0.05, cy+Math.sin(t*0.05+3.2)*minSide*0.06, minSide*0.20, "rgba(190,152,92,0.12)", "transparent");
  ctx.globalCompositeOperation="source-over";

  // ==== medallion scale wrapper (shrinks the ornament on portrait) ====
  ctx.save();
  ctx.translate(cx,cy);
  ctx.scale(medScale,medScale);
  ctx.translate(-cx,-cy);

  // ---- B. Single soft warm bloom behind the medallion ----
  ctx.save();
  ctx.globalCompositeOperation="screen";
  const bloomPulse=0.5+0.5*Math.sin(t*0.4);
  const bloomLift=Math.min(0.4, Math.abs(scrollVel)*0.35+impulse*0.3);
  softGlow(ctx, cx, cy, minSide*(0.30+bloomPulse*0.02), "rgba(210,178,110,"+(0.10+bloomPulse*0.04+bloomLift*0.05).toFixed(4)+")", "transparent");
  softGlow(ctx, cx, cy, minSide*0.15, "rgba(245,216,164,"+(0.09+bloomLift*0.04).toFixed(4)+")", "transparent");
  ctx.restore();

  // ---- C. Engraved construction arcs ----
  ctx.save();
  ctx.translate(cx,cy);
  ctx.rotate(-turn*0.5);
  ctx.lineCap="round";
  for(let i=0;i<CFG.arcs.length;i++){
    const ar=CFG.arcs[i];
    const rad=minSide*ar.rr*breathe;
    const shim=0.02+0.02*(0.5+0.5*Math.sin(t*0.4+ar.ph))+i*0.005;
    ctx.beginPath();
    ctx.arc(0,0,rad,ar.a0,ar.a1);
    ctx.strokeStyle="rgba(209,178,132,"+shim.toFixed(4)+")";
    ctx.lineWidth=Math.max(0.5,minSide*0.0006);
    ctx.setLineDash([minSide*ar.dash, minSide*0.014]);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();

  // ---- D. Hero arabesque arms ----
  const LAYERS=CFG.LAYERS;
  const denom=(LAYERS-1)||1;
  for(let layer=LAYERS-1; layer>=0; layer--){
    const depth=layer/denom;
    const radius=minSide*(0.14+layer*0.072)*breathe;
    const metal=GC.metal[layer];

    for(let ai=0; ai<CFG.arms.length; ai++){
      const arm=CFG.arms[ai];
      const wob=Math.sin(t*0.25+arm.wob)*arm.wobAmp*(1-depth*0.5);
      const angle=turn+arm.base*TAU+wob+layer*0.05;
      const s=arm.mirror;
      const r=radius*arm.len;
      const cw=storyLive?storyStepWeight(story,ai,CFG.arms.length):0;

      ctx.save();
      ctx.translate(cx,cy);
      ctx.rotate(angle);
      ctx.lineCap="round";

      // dark offset undercut (no per-stroke blur -> big perf win vs 33 shadowBlurs)
      ctx.translate(minSide*0.0022, minSide*0.004);
      curl(r,s);
      ctx.strokeStyle="rgba(24,14,16,0.55)";
      ctx.lineWidth=minSide*(0.0048-depth*0.0006);
      ctx.stroke();
      ctx.translate(-minSide*0.0022, -minSide*0.004);

      // metal body
      curl(r,s);
      ctx.strokeStyle=metal;
      ctx.globalAlpha=0.66+depth*0.12+cw*0.18;
      ctx.lineWidth=minSide*(0.003-depth*0.0005);
      ctx.stroke();

      // specular hairline (tamed, no pure white)
      ctx.globalAlpha=0.42+(1-depth)*0.26+cw*0.14;
      ctx.translate(-minSide*0.0011,-minSide*0.0011);
      curl(r,s);
      ctx.strokeStyle="rgba(232,222,204,0.62)";
      ctx.lineWidth=Math.max(0.4,minSide*0.00075);
      ctx.stroke();
      ctx.translate(minSide*0.0011,minSide*0.0011);

      // soft additive bloom along the curl (lowered alpha for HD headroom)
      ctx.globalAlpha=1;
      ctx.globalCompositeOperation="lighter";
      curl(r,s);
      ctx.strokeStyle="rgba(222,176,108,"+(0.03+(1-depth)*0.03).toFixed(4)+")";
      ctx.lineWidth=minSide*(0.0055-depth*0.0012);
      ctx.stroke();
      ctx.globalCompositeOperation="source-over";

      // inner leaf + curved midrib vein
      ctx.globalAlpha=0.15+depth*0.05;
      leaf(r,s);
      ctx.fillStyle=metal;
      ctx.fill();
      ctx.globalAlpha=0.2;
      ctx.beginPath();
      ctx.moveTo(r*0.12,0);
      ctx.bezierCurveTo(r*0.22, s*-r*0.02, r*0.32, s*-r*0.02, r*0.4, 0);
      ctx.strokeStyle="rgba(236,224,200,0.36)";
      ctx.lineWidth=Math.max(0.35,minSide*0.0004);
      ctx.stroke();

      // terminal pearl (front layer only) -> cached gradient
      if(layer===0){
        ctx.globalAlpha=1;
        const bx=r*0.35, by=s*r*0.05;
        const ca=Math.cos(angle), sa=Math.sin(angle);
        termPos[ai]={x:cx+medScale*(bx*ca-by*sa), y:cy+medScale*(bx*sa+by*ca)};
        ctx.save();
        ctx.translate(bx,by);
        ctx.beginPath(); ctx.arc(0,0,GC.br,0,TAU);
        ctx.fillStyle=GC.pearlTerm!; ctx.fill();
        ctx.globalCompositeOperation="lighter";
        ctx.beginPath(); ctx.arc(-GC.br*0.25,-GC.br*0.3,GC.br*0.35,0,TAU);
        ctx.fillStyle="rgba(240,232,214,0.42)"; ctx.fill();
        ctx.globalCompositeOperation="source-over";
        ctx.restore();
      }

      ctx.globalAlpha=1;
      ctx.restore();
    }
  }

  // ---- E. Inner wreath of counter-scroll curls ----
  const innerR=minSide*0.1*breathe;
  for(let ii=0; ii<CFG.inner.length; ii++){
    const fl=CFG.inner[ii];
    const a=-turn*0.8+fl.base*TAU+Math.sin(t*0.3+fl.ph)*0.04;
    const r=innerR*fl.len;
    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate(a);
    ctx.lineCap="round";
    curl(r,fl.mirror);
    ctx.strokeStyle="rgba(24,14,16,0.6)";
    ctx.lineWidth=minSide*0.0022;
    ctx.stroke();
    curl(r,fl.mirror);
    ctx.strokeStyle=GC.imetal!;
    ctx.globalAlpha=0.82;
    ctx.lineWidth=minSide*0.0016;
    ctx.stroke();
    ctx.globalAlpha=1;
    ctx.globalCompositeOperation="lighter";
    curl(r,fl.mirror);
    ctx.strokeStyle="rgba(224,182,116,0.05)";
    ctx.lineWidth=minSide*0.004;
    ctx.stroke();
    ctx.globalCompositeOperation="source-over";
    ctx.restore();
  }

  // ---- F. Central boss / medallion core ----
  ctx.save();
  ctx.translate(cx,cy);
  ctx.globalCompositeOperation="lighter";
  softGlow(ctx,0,0,minSide*0.09,"rgba(236,196,130,0.18)","transparent");
  softGlow(ctx,0,0,minSide*0.045,"rgba(234,222,198,0.16)","transparent");
  ctx.globalCompositeOperation="source-over";

  const bossR=minSide*0.05*breathe;

  ctx.beginPath(); ctx.arc(0,0,bossR*1.42,0,TAU);
  ctx.strokeStyle="rgba(20,12,14,0.7)";
  ctx.lineWidth=minSide*0.006; ctx.stroke();

  ctx.beginPath(); ctx.arc(0,0,bossR*1.42,0,TAU);
  ctx.strokeStyle=GC.ring!; ctx.lineWidth=minSide*0.0035; ctx.stroke();

  // outer pearls set into the rim (cached gradient, per-pearl twinkle via alpha)
  for(let i=0;i<CFG.pearls.length;i++){
    const pl=CFG.pearls[i];
    const a=pl.a+turn*0.4;
    const rr=bossR*1.42;
    const bx=Math.cos(a)*rr, by=Math.sin(a)*rr;
    const tw=0.7+0.3*Math.sin(t*1.2+pl.ph);
    ctx.save();
    ctx.translate(bx,by);
    ctx.globalAlpha=tw;
    ctx.beginPath(); ctx.arc(0,0,GC.pr,0,TAU);
    ctx.fillStyle=GC.pearlRim!; ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha=1;

  // beaded gadroon rim
  for(let i=0;i<CFG.beads.length;i++){
    const be=CFG.beads[i];
    const a=be.a+turn*0.6;
    const rr=bossR*1.12;
    const bx=Math.cos(a)*rr, by=Math.sin(a)*rr;
    const pr2=minSide*0.0021;
    const tw=0.6+0.4*Math.sin(t*0.9+be.ph);
    ctx.beginPath(); ctx.arc(bx,by,pr2,0,TAU);
    ctx.fillStyle="rgba(238,220,184,"+(0.26+tw*0.22).toFixed(4)+")";
    ctx.fill();
  }

  // gem cabochon (cached gradient; single shadowBlur left in the whole scene)
  ctx.beginPath(); ctx.arc(0,0,bossR,0,TAU);
  ctx.shadowColor="rgba(0,0,0,0.7)"; ctx.shadowBlur=minSide*0.02;
  ctx.fillStyle=GC.gem!; ctx.fill();
  ctx.shadowColor="transparent"; ctx.shadowBlur=0;

  ctx.beginPath(); ctx.arc(0,0,bossR*0.82,0,TAU);
  ctx.strokeStyle="rgba(234,224,204,0.34)"; ctx.lineWidth=minSide*0.001; ctx.stroke();

  // soft round specular bloom on the cabochon (interaction intensifies sparkle)
  ctx.globalCompositeOperation="lighter";
  const sparkle=0.5+0.35*Math.sin(t*1.5);
  softGlow(ctx,-bossR*0.3,-bossR*0.34,bossR*(0.42+0.16*sparkle),"rgba(238,230,214,"+(0.24*sparkle+impulse*0.12).toFixed(4)+")","transparent");
  ctx.globalCompositeOperation="source-over";
  ctx.restore();

  ctx.restore(); // end medallion scale wrapper

  // ---- Focus connector + focus-point brighten (motion only; skipped at rest) ----
  if(hasFocus){
    const activeIndex=Math.min(CFG.arms.length-1,Math.max(0,Math.round(story*(CFG.arms.length-1))));
    const ap=termPos[activeIndex];
    if(ap){
      const fx=focusXn*w, fy=focusYn*h;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(ap.x,ap.y);
      ctx.bezierCurveTo(cx-minSide*0.06, ap.y, (ap.x+fx)*0.5, (ap.y+fy)*0.5, fx, fy);
      ctx.strokeStyle="rgba(226,196,152,"+(0.06+impulse*0.12).toFixed(4)+")";
      ctx.lineWidth=Math.max(0.55,minSide*0.0008);
      ctx.setLineDash([minSide*0.004,minSide*0.011]);
      ctx.lineCap="round";
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalCompositeOperation="lighter";
      softGlow(ctx,fx,fy,minSide*0.05,"rgba(234,206,152,"+(0.10+impulse*0.10).toFixed(4)+")","transparent");
      ctx.globalCompositeOperation="source-over";
      ctx.restore();
    }
  }

  // ---- G. Floating gold motes ----
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  for(let i=0;i<CFG.motes.length;i++){
    const mo=CFG.motes[i];
    const par=mo.depth-0.5;
    const mxp=mo.x*w-px*minSide*0.05*par;
    const myp=mo.y*h-py*minSide*0.05*par+Math.sin(t*0.2+mo.drift)*minSide*0.006;
    const tw=0.35+0.65*(0.5+0.5*Math.sin(t*mo.spd+mo.ph));
    const rr=mo.r*(0.6+mo.depth*0.9)*minSide*0.0016;
    const al=Math.min(0.5, tw*(0.1+mo.bright*0.24)*(0.5+mo.depth*0.5)*(1+impulse*0.35));
    ctx.beginPath();
    ctx.arc(mxp,myp,rr,0,TAU);
    ctx.fillStyle="rgba(245,216,168,"+al.toFixed(4)+")";
    ctx.fill();
    if(mo.bright>0.82){
      ctx.beginPath();
      ctx.arc(mxp,myp,rr*2.6,0,TAU);
      ctx.fillStyle="rgba(238,224,196,"+Math.min(0.2,al*0.22).toFixed(4)+")";
      ctx.fill();
    }
  }
  ctx.restore();

  // ---- H. Colour grade, reading column, portrait protection, vignette ----
  ctx.globalCompositeOperation="screen";
  const grade=ctx.createRadialGradient(cx,cy,minSide*0.05,cx,cy,minSide*0.7);
  grade.addColorStop(0,"rgba(120,86,44,0.1)");
  grade.addColorStop(0.5,"rgba(80,50,54,0.04)");
  grade.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=grade;
  ctx.fillRect(0,0,w,h);
  ctx.globalCompositeOperation="source-over";

  // left reading column scrim (cached)
  ctx.fillStyle=GC.clear!;
  ctx.fillRect(0,0,w*0.66,h);

  // portrait: full-width veil + top veil so full-bleed mobile text keeps contrast
  if(portrait){
    const pScrim=ctx.createLinearGradient(0,0,w,0);
    pScrim.addColorStop(0,"rgba(5,6,10,0.5)");
    pScrim.addColorStop(0.5,"rgba(5,6,10,0.26)");
    pScrim.addColorStop(1,"rgba(5,6,10,0.12)");
    ctx.fillStyle=pScrim; ctx.fillRect(0,0,w,h);
    const topV=ctx.createLinearGradient(0,0,0,h*0.2);
    topV.addColorStop(0,"rgba(5,6,10,0.42)");
    topV.addColorStop(1,"rgba(5,6,10,0)");
    ctx.fillStyle=topV; ctx.fillRect(0,0,w,h*0.2);
  }

  const vig=ctx.createRadialGradient(cx,cy,minSide*0.16,w*0.66,h*0.5,maxSide*0.82);
  vig.addColorStop(0,"rgba(0,0,0,0)");
  vig.addColorStop(1,"rgba(1,1,4,0.6)");
  ctx.fillStyle=vig;
  ctx.fillRect(0,0,w,h);

  ctx.restore();
};
