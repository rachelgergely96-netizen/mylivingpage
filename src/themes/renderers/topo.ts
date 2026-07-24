import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { finiteClamp, resolveThemeMotion, storyStepWeight } from "../shared/motion";
import { wrapSoft } from "../shared/wrap";
import { softGlow } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

interface TopoGradientCache {
  ctx: CanvasRenderingContext2D | null;
  w: number;
  h: number;
  wash: CanvasGradient | null;
  grade: CanvasGradient | null;
  lane: CanvasGradient | null;
  vig: CanvasGradient | null;
}

const CFG=(function(){
  const rnd=createSeededRandom(20260721);
  const specs=[
    {cx:0.70,cy:0.46,scale:0.42,rings:10,elong:1.16,depth:1.00,samp:46},
    {cx:0.90,cy:0.72,scale:0.24,rings:8, elong:0.86,depth:0.78,samp:38},
    {cx:0.67,cy:0.24,scale:0.20,rings:6, elong:1.28,depth:0.58,samp:30},
    {cx:0.86,cy:0.20,scale:0.13,rings:4, elong:1.00,depth:0.46,samp:26}
  ];
  const massifs=[];
  for(let i=0;i<specs.length;i++){
    const s=specs[i];
    const hcount=3+Math.floor(rnd()*2);
    const harmonics=[];
    for(let k=0;k<hcount;k++){
      harmonics.push({freq:2+Math.floor(rnd()*5),amp:0.02+rnd()*0.045,phase:rnd()*TAU,drift:rnd()*0.6-0.3});
    }
    massifs.push({cx:s.cx,cy:s.cy,scale:s.scale,rings:s.rings,elong:s.elong,depth:s.depth,samp:s.samp,orient:rnd()*TAU,noiseSeed:rnd()*100,breath:0.4+rnd()*0.6,harmonics:harmonics});
  }
  const benchmarks=[];
  for(let i=0;i<5;i++){benchmarks.push({x:0.56+rnd()*0.40,y:0.14+rnd()*0.72,r:rnd(),ph:rnd()*TAU});}
  const motes=[];
  for(let i=0;i<20;i++){motes.push({x:0.52+rnd()*0.46,y:rnd(),s:0.4+rnd()*1.5,tw:rnd()*TAU,sp:0.2+rnd()*0.8,depth:rnd()});}
  const route=[[0.55,0.70],[0.63,0.55],[0.72,0.60],[0.80,0.40],[0.90,0.50]];
  return {massifs:massifs,benchmarks:benchmarks,motes:motes,route:route,light:2.35};
})();
// reused holder for the static full-canvas gradients (rebuilt only on ctx/size change)
const GC: TopoGradientCache={ctx:null,w:0,h:0,wash:null,grade:null,lane:null,vig:null};

export const renderTopo: ThemeRenderer = (ctx,w,h,t,mx,my,_deltaSeconds,motion)=>{
  const M=resolveThemeMotion(motion);
  const minSide=Math.min(w,h),maxSide=Math.max(w,h);
  const px=mx-0.5,py=my-0.5;
  const storyP=M.storyProgress;                 // 0 at rest
  const storyActive=M.sectionCount>0?1:0;        // gate: storyStepWeight returns 1 for step 0 at rest
  const vel=finiteClamp(M.scrollVelocity/3,-1,1); // signed, 0 at rest
  const velMag=vel<0?-vel:vel;                    // 0..1
  const impulse=M.interactionImpulse;             // 0 at rest
  const drift=t*0.06+storyP*0.5;                  // survey advances across the terrain with the page story
  const lightBase=CFG.light+px*0.6-py*0.35;
  const mix=(a: number,b: number,f: number)=>a+(b-a)*f;
  const rgba=(c: number[],a: number)=>"rgba("+(c[0]|0)+","+(c[1]|0)+","+(c[2]|0)+","+a+")";
  const desat=(r: number,g: number,b: number,d: number)=>{const y=0.3*r+0.59*g+0.11*b;return [mix(r,y,d),mix(g,y,d),mix(b,y,d)];};
  ctx.save();

  // ---- cache static full-canvas gradients (wash/grade/lane/vig) to cut per-frame GC ----
  if(GC.ctx!==ctx||GC.w!==w||GC.h!==h){
    GC.ctx=ctx;GC.w=w;GC.h=h;
    const wash=ctx.createLinearGradient(0,0,w,h);
    wash.addColorStop(0,"rgba(6,17,13,0.55)");
    wash.addColorStop(0.5,"rgba(8,20,15,0.30)");
    wash.addColorStop(1,"rgba(3,14,10,0.60)");
    GC.wash=wash;
    const grade=ctx.createRadialGradient(w*0.72,h*0.46,minSide*0.05,w*0.72,h*0.46,maxSide*0.7);
    grade.addColorStop(0,"rgba(58,150,112,0.09)");
    grade.addColorStop(0.6,"rgba(20,70,52,0.028)");
    grade.addColorStop(1,"rgba(0,0,0,0)");
    GC.grade=grade;
    const lane=ctx.createLinearGradient(0,0,w*0.6,0);
    lane.addColorStop(0,"rgba(3,7,6,0.66)");
    lane.addColorStop(0.68,"rgba(3,7,6,0.30)");
    lane.addColorStop(1,"rgba(3,7,6,0)");
    GC.lane=lane;
    const vig=ctx.createRadialGradient(w*0.66,h*0.48,minSide*0.14,w*0.6,h*0.5,maxSide*0.8);
    vig.addColorStop(0,"rgba(0,0,0,0)");
    vig.addColorStop(1,"rgba(0,4,3,0.42)");
    GC.vig=vig;
  }

  // ---- atmospheric wash over the pre-painted #070808 ----
  ctx.fillStyle=GC.wash!;ctx.fillRect(0,0,w,h);

  // ---- soft round teal terrain glow on the art side (volumetric, additive) ----
  // storyProgress cools the hue toward cyan as the survey advances (chapter progression)
  const auraX=w*0.72+px*w*0.02,auraY=h*0.46+py*h*0.02;
  const aura=ctx.createRadialGradient(auraX,auraY,minSide*0.03,auraX,auraY,minSide*0.72);
  aura.addColorStop(0,"rgba("+((46-storyP*12)|0)+","+((140+storyP*6)|0)+","+((102+storyP*30)|0)+",0.18)");
  aura.addColorStop(0.5,"rgba("+((24-storyP*6)|0)+","+((86+storyP*4)|0)+","+((62+storyP*18)|0)+",0.085)");
  aura.addColorStop(1,"rgba(0,0,0,0)");
  ctx.save();ctx.globalCompositeOperation="lighter";
  ctx.fillStyle=aura;ctx.fillRect(w*0.30,0,w*0.70,h);
  ctx.restore();

  // ---- faint base survey grid only (bright graticule + ticks removed) ----
  ctx.save();
  const gx=px*w*0.006,gy=py*h*0.006;
  const gridStep=Math.max(40,minSide*0.066);
  ctx.lineWidth=1;
  ctx.strokeStyle="rgba(120,196,158,0.045)";
  ctx.beginPath();
  for(let x=w*0.42;x<=w+gridStep;x+=gridStep){ctx.moveTo(x+gx,0);ctx.lineTo(x+gx,h);}
  for(let y=gridStep*0.5;y<=h+gridStep;y+=gridStep){ctx.moveTo(w*0.40,y+gy);ctx.lineTo(w,y+gy);}
  ctx.stroke();
  ctx.restore();

  // ---- precompute massif params + aerial-perspective light gradients + deformation ----
  const MS=CFG.massifs,screens=[];
  for(let mi=0;mi<MS.length;mi++){
    const m=MS[mi];
    const dep=m.depth;
    const hz=finiteClamp((1-dep)/0.6,0,1);        // 0 near .. ~1 far
    const dsat=hz*0.6;
    const pf=dep;
    const cx=m.cx*w+px*w*0.03*pf+storyP*w*0.02*pf+Math.sin(drift*0.8+mi)*minSide*0.006;
    const cy=m.cy*h+py*h*0.03*pf+Math.cos(drift*0.7+mi*1.3)*minSide*0.005;
    const breath=1+Math.sin(t*0.2*m.breath+mi)*0.02;
    const outerR=minSide*m.scale*breath;
    const el=Math.sqrt(m.elong);
    const rx=outerR*el,ry=outerR*0.8/el;
    const lightAng=lightBase+m.orient*0.15;
    // aerial perspective: desaturate + haze-fade distant massifs so the stack reads 3D
    let H=desat(214,250,230,dsat);  H=[mix(H[0],92,hz*0.55),mix(H[1],118,hz*0.55),mix(H[2],108,hz*0.55)];
    // cap crown lightness so the bright-pass bloom cannot blow highlights to pure white
    H=[Math.min(H[0],198),Math.min(H[1],230),Math.min(H[2],214)];
    let Md=desat(118,214,180,dsat); Md=[mix(Md[0],66,hz*0.5),mix(Md[1],94,hz*0.5),mix(Md[2],86,hz*0.5)];
    const Dk=desat(18,78,58,dsat*0.5);
    const lg=ctx.createLinearGradient(cx-Math.cos(lightAng)*outerR,cy-Math.sin(lightAng)*outerR,cx+Math.cos(lightAng)*outerR,cy+Math.sin(lightAng)*outerR);
    lg.addColorStop(0,rgba(H,0.62+0.16*dep));
    lg.addColorStop(0.45,rgba(Md,0.54+0.22*dep));
    lg.addColorStop(1,rgba(Dk,0.38));
    const N=m.samp;
    const ux=new Array(N+1),uy=new Array(N+1);
    for(let s=0;s<=N;s++){
      const a=(s/N)*TAU;
      let d=0;
      for(let k=0;k<m.harmonics.length;k++){const Hm=m.harmonics[k];d+=Math.sin(Hm.freq*a+Hm.phase+drift*Hm.drift)*Hm.amp;}
      d+=fbm(Math.cos(a)*1.2+m.noiseSeed,Math.sin(a)*1.2+m.noiseSeed+drift*0.2,2)*0.05;
      const sc=1+d;
      ux[s]=Math.cos(a)*sc;uy[s]=Math.sin(a)*sc;
    }
    screens.push({m:m,dep:dep,hz:hz,dsat:dsat,cx:cx,cy:cy,outerR:outerR,rx:rx,ry:ry,lightAng:lightAng,lg:lg,H:H,co:Math.cos(m.orient),so:Math.sin(m.orient),ux:ux,uy:uy,N:N});
  }

  // nearest massif to the focus point (only computed while interacting)
  let focusMassif=-1;
  if(M.hasFocus){
    const fpx=M.focusX*w,fpy=M.focusY*h;let best=1e18;
    for(let i=0;i<screens.length;i++){const S=screens[i];const dxf=S.cx-fpx,dyf=S.cy-fpy;const dd=dxf*dxf+dyf*dyf;if(dd<best){best=dd;focusMassif=i;}}
  }

  // ---- relief underpainting: soft sunlit highlight (near massifs) + deepened form-shadow ----
  for(let i=0;i<screens.length;i++){
    const S=screens[i],dep=S.dep;
    if(dep>=0.7){
      const hlx=S.cx+Math.cos(S.lightAng)*S.outerR*0.4,hly=S.cy+Math.sin(S.lightAng)*S.outerR*0.4;
      const hcol=desat(150,232,196,S.dsat);
      const hg=ctx.createRadialGradient(hlx,hly,0,hlx,hly,S.outerR*0.8);
      hg.addColorStop(0,rgba(hcol,0.085*dep));
      hg.addColorStop(1,"rgba(0,0,0,0)");
      ctx.save();ctx.globalCompositeOperation="lighter";
      ctx.fillStyle=hg;ctx.beginPath();ctx.arc(hlx,hly,S.outerR*0.8,0,TAU);ctx.fill();
      ctx.restore();
    }
    const sdx=S.cx-Math.cos(S.lightAng)*S.outerR*0.42,sdy=S.cy-Math.sin(S.lightAng)*S.outerR*0.42;
    const sA=0.15+0.30*dep*dep;   // near massif casts the deepest form-shadow
    const sg=ctx.createRadialGradient(sdx,sdy,0,sdx,sdy,S.outerR*0.82);
    sg.addColorStop(0,"rgba(1,7,5,"+sA+")");
    sg.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=sg;ctx.beginPath();ctx.arc(sdx,sdy,S.outerR*0.82,0,TAU);ctx.fill();
  }

  // ---- SIGNATURE: relief-shaded contour massifs (elevation fill + directionally-lit strokes) ----
  for(let i=0;i<screens.length;i++){
    const S=screens[i],m=S.m,R=m.rings,co=S.co,so=S.so,N=S.N,dep=S.dep,dsF=S.dsat*0.7;
    for(let j=0;j<R;j++){
      const rf=1-j/R,e=j/(R-1);
      const rx=S.rx*rf,ry=S.ry*rf;
      ctx.beginPath();
      for(let s=0;s<=N;s++){
        const lxp=S.ux[s]*rx,lyp=S.uy[s]*ry;
        const X=S.cx+lxp*co-lyp*so,Y=S.cy+lxp*so+lyp*co;
        if(s===0)ctx.moveTo(X,Y);else ctx.lineTo(X,Y);
      }
      ctx.closePath();
      let fr=16+e*26,fgc=70+e*70,fb=54+e*46;
      const yv=0.3*fr+0.59*fgc+0.11*fb;
      fr=fr+(yv-fr)*dsF;fgc=fgc+(yv-fgc)*dsF;fb=fb+(yv-fb)*dsF;
      const fillA=(0.028+e*0.055)*dep;
      ctx.fillStyle="rgba("+(fr|0)+","+(fgc|0)+","+(fb|0)+","+fillA+")";
      ctx.fill();
      const isIndex=((R-1-j)%5)===0;
      // storyStepWeight lights the current elevation band as sections advance (gated off at rest)
      const chapterW=storyActive?storyStepWeight(storyP,j,R):0;
      ctx.strokeStyle=S.lg;
      ctx.lineWidth=(0.7+e*1.3)*(0.7+dep*0.5)+(isIndex?0.9:0)+chapterW*0.5*dep;
      ctx.globalAlpha=Math.min(0.6,(0.12+e*0.42)*(0.5+dep*0.55)+chapterW*0.14*dep);
      ctx.stroke();
      ctx.globalAlpha=1;
      if(isIndex){
        ctx.save();ctx.globalCompositeOperation="lighter";
        ctx.strokeStyle=rgba(S.H,Math.min(0.09,0.075*(0.5+dep*0.55)+chapterW*0.05*dep));
        ctx.lineWidth=(1.4+e*1.4)*(0.7+dep*0.5);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // ---- downslope hachure ticks on the near massifs only (calm cartographic texture) ----
  ctx.save();ctx.lineWidth=1;
  for(let i=0;i<screens.length;i++){
    const S=screens[i],m=S.m,co=S.co,so=S.so,N=S.N;
    if(S.dep<0.7)continue;
    ctx.strokeStyle="rgba(120,206,166,"+(0.14*S.dep)+")";
    const j=Math.floor(m.rings*0.5);
    const rf=1-j/m.rings,rx=S.rx*rf,ry=S.ry*rf;
    const cnt=Math.max(10,Math.round(rf*20));
    const step=Math.max(1,Math.floor(N/cnt));
    ctx.beginPath();
    for(let s=0;s<N;s+=step){
      const lxp=S.ux[s]*rx,lyp=S.uy[s]*ry;
      const X=S.cx+lxp*co-lyp*so,Y=S.cy+lxp*so+lyp*co;
      const dx=S.cx-X,dy=S.cy-Y,dl=Math.hypot(dx,dy)||1;
      const tl=Math.min(8,rf*12);
      ctx.moveTo(X,Y);ctx.lineTo(X+dx/dl*tl,Y+dy/dl*tl);
    }
    ctx.stroke();
  }
  ctx.restore();

  // ---- soft round peak bloom (volumetric glow, no spikes; focus brightens the nearest) ----
  ctx.save();ctx.globalCompositeOperation="lighter";
  for(let i=0;i<screens.length;i++){
    const S=screens[i];
    const boost=(i===focusMassif)?(0.10+impulse*0.14):0;
    const rr=S.outerR*(0.30+(i===focusMassif?0.06:0));
    softGlow(ctx,S.cx,S.cy,rr,rgba(desat(150,232,196,S.dsat*0.6),Math.min(0.24,0.12*S.dep+boost)),"transparent");
  }
  ctx.restore();

  // ---- triangulation summit markers (dot-in-triangle survey nodes) ----
  for(let i=0;i<screens.length;i++){
    const S=screens[i],dep=S.dep,r=Math.max(4,S.outerR*0.03);
    ctx.strokeStyle=rgba(desat(206,242,224,S.dsat*0.5),0.45*dep);ctx.lineWidth=1.1;
    ctx.beginPath();
    ctx.moveTo(S.cx,S.cy-r);
    ctx.lineTo(S.cx+r*0.9,S.cy+r*0.7);
    ctx.lineTo(S.cx-r*0.9,S.cy+r*0.7);
    ctx.closePath();ctx.stroke();
    ctx.fillStyle=rgba(desat(220,248,232,S.dsat*0.5),0.6*dep);
    ctx.beginPath();ctx.arc(S.cx,S.cy,1.6,0,TAU);ctx.fill();
  }

  // ---- scattered benchmark survey nodes (dot-in-circle, active section pulses brighter) ----
  const activeBench=storyActive?(M.activeSectionIndex%CFG.benchmarks.length):-1;
  ctx.save();
  for(let i=0;i<CFG.benchmarks.length;i++){
    const b=CFG.benchmarks[i];
    const bx=b.x*w+px*w*0.02,by=b.y*h+py*h*0.02;
    const pulse=0.5+0.5*Math.sin(t*0.8+b.ph);
    const act=(i===activeBench)?(0.6+0.4*M.sectionProgress):0;
    const s=3+b.r*2.5+act*1.5;
    ctx.strokeStyle="rgba(150,224,186,"+(0.10+pulse*0.10+act*0.10)+")";ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(bx,by,s,0,TAU);ctx.stroke();
    ctx.fillStyle="rgba(206,244,226,"+Math.min(0.5,0.24+pulse*0.20+act*0.14)+")";
    ctx.beginPath();ctx.arc(bx,by,1.5,0,TAU);ctx.fill();
  }
  ctx.restore();

  // ---- animated survey route + dot-in-circle vertices + travelling soft spark ----
  const RP=CFG.route;
  ctx.save();
  ctx.beginPath();
  for(let i=0;i<RP.length;i++){
    const X=RP[i][0]*w+px*w*0.01,Y=RP[i][1]*h-Math.sin(t*0.3+i)*h*0.004;
    if(i===0)ctx.moveTo(X,Y);else ctx.lineTo(X,Y);
  }
  ctx.setLineDash([5,8]);ctx.lineDashOffset=-t*8-storyP*18-vel*20; // scrollVelocity + story quicken the march
  ctx.strokeStyle="rgba(198,244,218,0.18)";ctx.lineWidth=1.2;
  ctx.stroke();ctx.setLineDash([]);
  for(let i=0;i<RP.length;i++){
    const X=RP[i][0]*w+px*w*0.01,Y=RP[i][1]*h-Math.sin(t*0.3+i)*h*0.004;
    const wgt=storyActive?storyStepWeight(storyP,i,RP.length):0;
    ctx.fillStyle="rgba(216,246,230,"+Math.min(0.6,0.42+wgt*0.4)+")";
    ctx.beginPath();ctx.arc(X,Y,1.6+wgt*1.4,0,TAU);ctx.fill();
    ctx.strokeStyle="rgba(160,226,190,"+(0.28+wgt*0.2)+")";ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(X,Y,4.5+wgt*2,0,TAU);ctx.stroke();
  }
  ctx.restore();
  const segs=Math.max(1,RP.length-1);
  // wrapSoft fades the spark near the cycle seam so it doesn't teleport back to the route start
  const uw=wrapSoft(t*0.12+storyP*0.15,1,0.05);const u=uw.u;const fi=u*segs;let si=Math.floor(fi);if(si>=segs)si=segs-1;const fr2=fi-si;
  const ax=RP[si][0]*w+px*w*0.01,ay=RP[si][1]*h-Math.sin(t*0.3+si)*h*0.004;
  const bx2=RP[si+1][0]*w+px*w*0.01,by2=RP[si+1][1]*h-Math.sin(t*0.3+(si+1))*h*0.004;
  const sxp=ax+(bx2-ax)*fr2,syp=ay+(by2-ay)*fr2;
  ctx.save();ctx.globalCompositeOperation="lighter";
  softGlow(ctx,sxp,syp,8+velMag*4,"rgba(196,248,226,"+Math.min(0.48,0.42+velMag*0.06)*uw.alpha+")","transparent");
  ctx.restore();

  // ---- calm parallax data motes (soft round dots, occasional round bloom, no spikes) ----
  ctx.save();ctx.globalCompositeOperation="lighter";
  const moteAmp=1+velMag*0.6;
  for(let i=0;i<CFG.motes.length;i++){
    const d=CFG.motes[i];
    const dp=0.3+d.depth*0.9;
    const X=d.x*w-px*w*0.05*dp+Math.sin(t*d.sp*0.4+d.tw)*minSide*0.006*dp*moteAmp;
    const Y=d.y*h-py*h*0.05*dp+Math.cos(t*d.sp*0.3+d.tw)*minSide*0.006*dp*moteAmp;
    const tw=0.25+0.75*(0.5+0.5*Math.sin(t*d.sp*(1+velMag*0.5)+d.tw));
    const rr=d.s*(0.6+dp*0.5);
    ctx.fillStyle="rgba(150,232,196,"+(0.14*tw+0.04)+")";
    ctx.beginPath();ctx.arc(X,Y,rr,0,TAU);ctx.fill();
    if(d.s>1.35&&tw>0.85){softGlow(ctx,X,Y,rr*2.8,"rgba(196,248,226,"+Math.min(0.2,0.22*tw)+")","transparent");}
  }
  ctx.restore();

  // ---- unifying teal colour grade (soft, additive, art-side only) ----
  ctx.save();ctx.globalCompositeOperation="lighter";
  ctx.fillStyle=GC.grade!;ctx.fillRect(w*0.30,0,w*0.70,h);
  ctx.restore();

  // ---- focus survey reticle (only while interacting; leader line to nearest massif) ----
  if(M.hasFocus){
    const fpx=M.focusX*w,fpy=M.focusY*h;
    const rs=8+impulse*7;
    ctx.save();
    if(focusMassif>=0){
      const S=screens[focusMassif];
      ctx.strokeStyle="rgba(137,211,167,0.09)";ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(fpx,fpy);ctx.lineTo(S.cx,S.cy);ctx.stroke();
    }
    ctx.strokeStyle="rgba(190,236,208,"+Math.min(0.5,0.26+impulse*0.22)+")";ctx.lineWidth=1;
    ctx.strokeRect(fpx-rs*0.5,fpy-rs*0.5,rs,rs);
    ctx.fillStyle="rgba(206,244,226,"+Math.min(0.55,0.30+impulse*0.20)+")";
    ctx.beginPath();ctx.arc(fpx,fpy,1.6,0,TAU);ctx.fill();
    ctx.restore();
  }

  // ---- reading-lane wash + vignette ----
  ctx.fillStyle=GC.lane!;ctx.fillRect(0,0,w*0.64,h);
  ctx.fillStyle=GC.vig!;ctx.fillRect(0,0,w,h);

  ctx.restore();
};
