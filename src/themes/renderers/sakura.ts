import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

interface SakuraGradientCache {
  w: number;
  h: number;
  gradeUR: CanvasGradient | null;
  gradeLL: CanvasGradient | null;
  vig: CanvasGradient | null;
  amb: CanvasGradient | null;
  basal: CanvasGradient | null;
  sunG: CanvasGradient[];
  sunR: number[];
}

const CFG=(function(){
  const R=createSeededRandom(0x5A6B12);
  const rng=(a: number,b: number)=>a+(b-a)*R();
  const pink=()=>342+(R()-0.5)*34;
  const layers=[
    {n:18,depth:0.30,sMin:7,sMax:12,fMin:0.06,fMax:0.10,a:0.55,glow:true,solid:false},
    {n:24,depth:0.58,sMin:4,sMax:7,fMin:0.045,fMax:0.075,a:0.62,glow:false,solid:false},
    {n:30,depth:0.84,sMin:2,sMax:3.8,fMin:0.028,fMax:0.05,a:0.40,glow:false,solid:true}
  ];
  const petals=[];
  for(let li=0;li<layers.length;li++){
    const Lr=layers[li];
    for(let i=0;i<Lr.n;i++){
      petals.push({
        depth:Lr.depth,baseX:R(),cycleOff:R(),
        size:rng(Lr.sMin,Lr.sMax),fall:rng(Lr.fMin,Lr.fMax),
        phase:R()*TAU,wobble:R()*TAU,spin:(R()<0.5?-1:1)*rng(0.4,1.1),
        swayAmp:rng(18,60)*(2-Lr.depth),swayFreq:rng(0.12,0.4),seedX:R()*1000,
        hue:pink(),sat:rng(42,66),lig:rng(60,78),variant:(R()*3)|0,
        glow:Lr.glow&&R()<0.7,layerA:Lr.a,solid:Lr.solid
      });
    }
  }
  petals.sort((p,q)=>q.depth-p.depth);
  const washes=[];
  for(let i=0;i<7;i++){
    washes.push({ox:rng(0.15,0.85),oy:rng(0.15,0.85),r:rng(0.16,0.30),
      hue:(i%3===0)?rng(30,46):pink(),sat:rng(38,60),lig:rng(46,64),
      a:rng(0.05,0.11),ph:R()*TAU,spd:rng(0.6,1.4),seed:R()*100,brf:rng(0.05,0.14)});
  }
  const bokeh=[];
  for(let i=0;i<14;i++){
    bokeh.push({x:R(),y:rng(0.1,0.95),r:rng(0.04,0.11),depth:rng(0.5,0.95),
      hue:pink(),sat:rng(40,60),lig:rng(55,72),a:rng(0.03,0.07),
      ph:R()*TAU,spd:rng(0.5,1.4),twf:rng(0.2,0.6)});
  }
  const pollen=[];
  for(let i=0;i<52;i++){
    pollen.push({x:R(),y:R(),r:rng(0.4,1.4),rise:rng(4,14),swa:rng(6,26),
      swf:rng(0.2,0.7),twf:rng(0.6,1.6),ph:R()*TAU,depth:rng(0.4,0.95),
      warm:R()<0.6,spark:R()<0.14});
  }
  const ground=[];
  for(let i=0;i<20;i++){
    ground.push({x:R(),off:rng(4,20),size:rng(2,4.5),rot:R()*TAU,
      hue:pink(),a:rng(0.05,0.12),tw:rng(0.15,0.4),ph:R()*TAU});
  }
  const branches=[];
  const corners=[{x:0.0,y:0.0,dir:1},{x:1.0,y:0.0,dir:-1},{x:0.72,y:0.0,dir:-1}];
  for(let b=0;b<corners.length;b++){
    const c=corners[b];const pts=[{x:c.x,y:c.y}];let bx=c.x,by=c.y;
    const segs=(rng(4,6))|0;const nodes=[];
    for(let s=0;s<segs;s++){
      bx+=c.dir*rng(0.06,0.12);by+=rng(0.04,0.09);pts.push({x:bx,y:by});
      if(R()<0.7)nodes.push({x:bx,y:by,r:rng(0.5,1),ph:R()*TAU,hue:pink()});
    }
    branches.push({pts:pts,nodes:nodes,w:rng(1.4,2.8),sway:rng(0.004,0.012),ph:R()*TAU});
  }
  // Soft directional sun blooms (upper-right). Round volumetric warmth only — no rays/fans/beams.
  const sun=[];
  for(let i=0;i<2;i++){
    sun.push({ox:rng(0.86,1.04),oy:rng(-0.08,0.14),r:rng(0.55,1.05),
      hue:rng(36,46),a:rng(0.03,0.05),ph:R()*TAU,spd:rng(0.3,0.7)});
  }
  return {petals:petals,washes:washes,bokeh:bokeh,pollen:pollen,ground:ground,branches:branches,sun:sun};
})();
const CACHE: SakuraGradientCache={w:0,h:0,gradeUR:null,gradeLL:null,vig:null,amb:null,basal:null,sunG:[],sunR:[]};

export const renderSakura: ThemeRenderer = (ctx,w,h,t,mx,my)=>{
  w=w>0?w:1;h=h>0?h:1;
  const cx=w*0.5,cy=h*0.5,maxD=Math.max(w,h);
  const px=(mx-0.5),py=(my-0.5);
  const cl=(v: number)=>v<0?0:(v>1?1:v);
  const SIN=Math.sin,COS=Math.cos;

  // Rebuild cached static-position gradients only on first frame / resize (kills per-frame GC churn)
  if(CACHE.w!==w||CACHE.h!==h){
    CACHE.w=w;CACHE.h=h;
    let cg=ctx.createRadialGradient(w*0.86,h*0.10,0,w*0.86,h*0.10,maxD*1.05);
    cg.addColorStop(0,"hsla(40,54%,60%,0.09)");
    cg.addColorStop(0.35,"hsla(352,50%,44%,0.05)");
    cg.addColorStop(1,"hsla(330,40%,12%,0)");
    CACHE.gradeUR=cg;
    cg=ctx.createRadialGradient(w*0.28,h*0.80,0,w*0.28,h*0.80,maxD*0.75);
    cg.addColorStop(0,"hsla(330,45%,38%,0.06)");
    cg.addColorStop(1,"hsla(325,40%,14%,0)");
    CACHE.gradeLL=cg;
    CACHE.sunG=[];CACHE.sunR=[];
    for(const s of CFG.sun){
      const ox=s.ox*w,oy=s.oy*h,rr=s.r*maxD;
      const sg=ctx.createRadialGradient(ox,oy,0,ox,oy,rr);
      sg.addColorStop(0,`hsla(${s.hue},66%,64%,${s.a})`);
      sg.addColorStop(0.4,`hsla(${s.hue-4},56%,50%,${s.a*0.4})`);
      sg.addColorStop(1,`hsla(${s.hue},50%,38%,0)`);
      CACHE.sunG.push(sg);CACHE.sunR.push(rr);
    }
    cg=ctx.createLinearGradient(0,h,0,h*0.82);
    cg.addColorStop(0,"hsla(340,48%,42%,0.10)");
    cg.addColorStop(1,"hsla(335,40%,20%,0)");
    CACHE.basal=cg;
    cg=ctx.createRadialGradient(cx,cy*0.94,maxD*0.20,cx,cy,maxD*0.76);
    cg.addColorStop(0,"hsla(0,0%,0%,0)");
    cg.addColorStop(0.7,"hsla(332,40%,6%,0.08)");
    cg.addColorStop(1,"hsla(330,45%,4%,0.38)");
    CACHE.vig=cg;
    cg=ctx.createRadialGradient(w*0.5,h*0.30,0,w*0.5,h*0.5,maxD*0.55);
    cg.addColorStop(0,"hsla(24,45%,50%,0.05)");
    cg.addColorStop(1,"transparent");
    CACHE.amb=cg;
  }

  // A. atmospheric color grade (screen) — soft directional warmth from the upper-right (cached)
  ctx.save();ctx.globalCompositeOperation="screen";
  ctx.fillStyle=CACHE.gradeUR!;ctx.fillRect(0,0,w,h);
  ctx.fillStyle=CACHE.gradeLL!;ctx.fillRect(0,0,w,h);
  ctx.restore();

  // B. watercolor washes (screen) — pure soft blooms that bloom & dissolve (no ink rings)
  ctx.save();ctx.globalCompositeOperation="screen";
  for(const s of CFG.washes){
    const breathe=0.5+0.5*SIN(t*s.brf+s.ph);
    const nx=fbm(s.seed,t*0.05*s.spd,2),ny=fbm(s.seed+50,t*0.05*s.spd+9,2);
    const bx=(s.ox+SIN(t*0.03*s.spd+s.ph)*0.10+nx*0.05)*w;
    const by=(s.oy+COS(t*0.026*s.spd+s.ph)*0.10+ny*0.05)*h;
    const rr=Math.abs((s.r+SIN(t*0.12+s.ph)*0.03)*maxD*(1+fbm(s.seed+t*0.04,3,2)*0.10))+1;
    const a=s.a*(0.35+0.65*breathe);
    const gr=ctx.createRadialGradient(bx,by,0,bx,by,rr);
    gr.addColorStop(0,`hsla(${s.hue},${s.sat}%,${s.lig}%,${a})`);
    gr.addColorStop(0.55,`hsla(${s.hue-6},${s.sat-8}%,${s.lig-14}%,${a*0.42})`);
    gr.addColorStop(1,"hsla(330,40%,20%,0)");
    ctx.fillStyle=gr;ctx.beginPath();ctx.arc(bx,by,rr,0,TAU);ctx.fill();
  }
  ctx.restore();

  // C. (removed) haze band — dropped to cut full-frame screen overdraw & GC churn

  // D. soft volumetric sunlight from the upper-right — cached round blooms, pulse via globalAlpha (NO rays/fans/beams)
  ctx.save();ctx.globalCompositeOperation="screen";
  for(let i=0;i<CACHE.sunG.length;i++){
    const s=CFG.sun[i];
    let pulse=0.7+0.3*SIN(t*s.spd+s.ph);
    pulse=pulse<0?0:(pulse>1?1:pulse);
    const ox=s.ox*w,oy=s.oy*h,rr=CACHE.sunR[i];
    ctx.globalAlpha=pulse;ctx.fillStyle=CACHE.sunG[i];
    ctx.beginPath();ctx.arc(ox,oy,rr,0,TAU);ctx.fill();
  }
  ctx.globalAlpha=1;ctx.restore();

  // E. bokeh depth orbs (screen), parallax vs pointer
  ctx.save();ctx.globalCompositeOperation="screen";
  for(const b of CFG.bokeh){
    const par=(1-b.depth);
    const bx=b.x*w+SIN(t*0.04*b.spd+b.ph)*w*0.02-px*40*par;
    const by=b.y*h+COS(t*0.05*b.spd+b.ph)*h*0.02-py*30*par;
    const tw=0.6+0.4*SIN(t*b.twf+b.ph);
    const rr=b.r*maxD*(0.9+0.15*SIN(t*0.2+b.ph));
    const gr=ctx.createRadialGradient(bx,by,0,bx,by,rr);
    gr.addColorStop(0,`hsla(${b.hue},${b.sat}%,${b.lig}%,${b.a*tw})`);
    gr.addColorStop(0.7,`hsla(${b.hue},${b.sat}%,${b.lig-8}%,${b.a*tw*0.35})`);
    gr.addColorStop(1,"hsla(335,40%,20%,0)");
    ctx.fillStyle=gr;ctx.beginPath();ctx.arc(bx,by,rr,0,TAU);ctx.fill();
  }
  ctx.restore();

  // F. branch silhouettes + soft cherry blossoms (solid-shaded petals: fewer allocations + HD-safe)
  for(const br of CFG.branches){
    const pts=br.pts;
    for(let i=0;i<pts.length-1;i++){
      const s1=SIN(t*0.3+br.ph+i)*br.sway*i,s2=SIN(t*0.3+br.ph+i+1)*br.sway*(i+1);
      const p0x=(pts[i].x+s1)*w,p0y=pts[i].y*h;
      const p1x=(pts[i+1].x+s2)*w,p1y=pts[i+1].y*h;
      ctx.strokeStyle="hsla(330,22%,10%,0.5)";
      ctx.lineWidth=Math.max(0.6,br.w*(1-i/pts.length*0.8));ctx.lineCap="round";
      ctx.beginPath();ctx.moveTo(p0x,p0y);ctx.lineTo(p1x,p1y);ctx.stroke();
    }
    for(const nd of br.nodes){
      const sway=SIN(t*0.3+br.ph)*br.sway*3;
      const nx=(nd.x+sway)*w,ny=nd.y*h,br2=nd.r*3.2;
      ctx.save();ctx.globalCompositeOperation="lighter";
      const gr=ctx.createRadialGradient(nx,ny,0,nx,ny,br2*3);
      gr.addColorStop(0,`hsla(${nd.hue},68%,68%,0.09)`);
      gr.addColorStop(1,"hsla(340,60%,60%,0)");
      ctx.fillStyle=gr;ctx.beginPath();ctx.arc(nx,ny,br2*3,0,TAU);ctx.fill();
      ctx.restore();
      for(let k=0;k<5;k++){
        const pa=nd.ph+k*(TAU/5)+SIN(t*0.4+nd.ph)*0.05;
        ctx.save();ctx.translate(nx,ny);ctx.rotate(pa);
        ctx.fillStyle=`hsla(${nd.hue+3},58%,72%,0.5)`;
        ctx.beginPath();ctx.moveTo(0,0);
        ctx.quadraticCurveTo(br2*0.9,-br2*1.1,0,-br2*2);
        ctx.quadraticCurveTo(-br2*0.9,-br2*1.1,0,0);ctx.fill();ctx.restore();
      }
      ctx.fillStyle="hsla(45,60%,68%,0.42)";
      ctx.beginPath();ctx.arc(nx,ny,br2*0.36,0,TAU);ctx.fill();
    }
  }

  // G. parallax petal layers with soft sheen, veins, and gentle bloom (peak lightness clamped for HD)
  for(const p of CFG.petals){
    const vy=p.fall*h,span=h*1.4;
    const y=((t*vy+p.cycleOff*span)%span+span)%span-h*0.2;
    const par=(1-p.depth);
    const sway=SIN(t*p.swayFreq+p.phase)*p.swayAmp+fbm(p.seedX,t*0.1,2)*p.swayAmp*0.6;
    const wrap=w+140;
    const x=((p.baseX*w+sway+px*90*par)%wrap+wrap)%wrap-70;
    const rot=p.wobble+t*p.spin*0.6+SIN(t*0.4+p.phase)*0.4;
    let sx=COS(t*p.spin*0.8+p.phase);
    if(Math.abs(sx)<0.12)sx=sx<0?-0.12:0.12;
    const light=0.5+0.5*COS(rot-0.8);
    const topFade=cl((y+h*0.2)/(h*0.22)),botFade=cl((h*1.18-y)/(h*0.22));
    const life=topFade*botFade;
    if(life<=0.01)continue;
    const alpha=p.layerA*life,sz=p.size,hi=Math.min(78,p.lig+14*light);
    ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.scale(sx,1);
    ctx.beginPath();
    if(p.variant===0){ctx.moveTo(0,0);ctx.quadraticCurveTo(sz*1.5,-sz,0,-sz*2.5);ctx.quadraticCurveTo(-sz*1.5,-sz,0,0);}
    else if(p.variant===1){ctx.moveTo(0,0);ctx.quadraticCurveTo(sz*2,-sz*0.8,0,-sz*2);ctx.quadraticCurveTo(-sz*2,-sz*0.8,0,0);}
    else{ctx.moveTo(0,0);ctx.quadraticCurveTo(sz*1.2,-sz*1.2,sz*0.3,-sz*2.3);ctx.quadraticCurveTo(-sz*0.8,-sz*1.5,0,0);}
    if(p.solid){
      ctx.fillStyle=`hsla(${p.hue},${p.sat}%,${Math.min(72,p.lig+8*light)}%,${alpha})`;
      ctx.fill();
    }else{
      const gr=ctx.createLinearGradient(-sz,-sz*2.2,sz*0.6,sz*0.4);
      gr.addColorStop(0,`hsla(${p.hue},${p.sat}%,${hi}%,${alpha})`);
      gr.addColorStop(1,`hsla(${p.hue-8},${p.sat}%,${Math.max(30,p.lig-14)}%,${alpha*0.82})`);
      ctx.fillStyle=gr;ctx.fill();
      ctx.strokeStyle=`hsla(${p.hue+8},60%,${Math.min(82,hi+6)}%,${alpha*0.4})`;
      ctx.lineWidth=Math.max(0.4,sz*0.12);
      ctx.beginPath();ctx.moveTo(0,-sz*0.2);ctx.lineTo(0,-sz*2);ctx.stroke();
      if(p.glow){
        ctx.globalCompositeOperation="lighter";
        const g2=ctx.createRadialGradient(0,-sz,0,0,-sz,sz*3.4);
        g2.addColorStop(0,`hsla(${p.hue},68%,70%,${alpha*0.14*light})`);
        g2.addColorStop(1,"hsla(340,60%,60%,0)");
        ctx.fillStyle=g2;ctx.beginPath();ctx.arc(0,-sz,sz*3.4,0,TAU);ctx.fill();
      }
    }
    ctx.restore();
  }

  // H. rising pollen / light motes (lighter) — soft round twinkle only (no 4-point sparkle)
  ctx.save();ctx.globalCompositeOperation="lighter";
  for(const p of CFG.pollen){
    const y=((p.y*h-t*p.rise)%(h+40)+(h+40))%(h+40)-20;
    const x=p.x*w+SIN(t*p.swf+p.ph)*p.swa+px*20*(1-p.depth);
    const tw=0.35+0.65*(0.5+0.5*SIN(t*p.twf+p.ph));
    const r=p.r*(0.8+0.5*tw),hue=p.warm?44:340;
    ctx.fillStyle=`hsla(${hue},68%,${p.warm?72:70}%,${0.10*tw})`;
    ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
    if(p.spark&&tw>0.8){
      const gr=ctx.createRadialGradient(x,y,0,x,y,r*5);
      gr.addColorStop(0,`hsla(${hue},80%,78%,${0.20*tw})`);
      gr.addColorStop(1,`hsla(${hue},70%,68%,0)`);
      ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x,y,r*5,0,TAU);ctx.fill();
    }
  }
  ctx.restore();

  // I. settled ground petals shimmer + soft basal wash (cached gradient)
  for(const gp of CFG.ground){
    const gx=gp.x*w,gy=h-gp.off-SIN(gp.ph)*6;
    const a=cl(gp.a+SIN(t*0.3+gp.ph)*gp.tw*0.15);
    ctx.save();ctx.translate(gx,gy);ctx.rotate(gp.rot);
    ctx.fillStyle=`hsla(${gp.hue},44%,58%,${a})`;ctx.beginPath();ctx.moveTo(0,0);
    ctx.quadraticCurveTo(gp.size,-gp.size*0.5,0,-gp.size*1.6);
    ctx.quadraticCurveTo(-gp.size,-gp.size*0.5,0,0);ctx.fill();ctx.restore();
  }
  ctx.save();ctx.globalCompositeOperation="screen";
  ctx.fillStyle=CACHE.basal!;ctx.fillRect(0,h*0.82,w,h*0.18);
  ctx.restore();

  // J. gentle vignette (~0.38, airy) + warm ambient (cached gradients)
  ctx.fillStyle=CACHE.vig!;ctx.fillRect(0,0,w,h);
  ctx.save();ctx.globalCompositeOperation="screen";
  ctx.fillStyle=CACHE.amb!;ctx.fillRect(0,0,w,h);
  ctx.restore();
};
