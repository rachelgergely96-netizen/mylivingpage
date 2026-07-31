import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { finiteClamp, resolveThemeMotion } from "../shared/motion";
import { softGlow } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

const CFG=(function(){
  const rand=createSeededRandom(94117);
  const layers=[
    {z:0,count:16,size:0.9,speed:0.045,br:0.10},
    {z:1,count:13,size:1.5,speed:0.075,br:0.15},
    {z:2,count:10,size:2.4,speed:0.11,br:0.22}
  ];
  const dust=[];
  for(let li=0;li<layers.length;li++){
    const c=layers[li].count;
    for(let i=0;i<c;i++){
      dust.push({
        layer:li,
        x0:rand(),
        phase:rand(),
        spread:0.10+rand()*0.80,
        side:rand()<0.5?-1:1,
        tw:rand()*TAU,
        tws:0.6+rand()*1.7,
        drift:rand()*TAU,
        big:rand()<0.14
      });
    }
  }
  const haze=[];
  for(let i=0;i<5;i++){
    haze.push({x:rand(),y:0.18+rand()*0.6,r:0.16+rand()*0.24,ph:rand()*TAU,sp:0.03+rand()*0.05,hx:rand()*12,hy:rand()*12});
  }
  const shafts=[];
  const nS=7;
  for(let i=0;i<nS;i++){
    const f=(i/(nS-1))-0.5;
    shafts.push({
      f:f,
      w:0.03+rand()*0.045,
      ph:rand()*TAU,
      sp:0.10+rand()*0.13,
      br:0.95-Math.abs(f)*1.0,
      ox:(rand()-0.5)*0.06,
      oy:(rand()-0.4)*0.05,
      jit:0.65+rand()*0.5
    });
  }
  return {dust:dust,layers:layers,haze:haze,shafts:shafts};
})();

export const renderVault: ThemeRenderer = (
  ctx,
  w,
  h,
  time,
  mx,
  my,
  _deltaSeconds,
  motion,
) => {
  // Uniform motion contract: resolve the page-motion model once. This theme's
  // preserved composition takes no page-motion nuance, so only reducedMotion
  // (frozen time) is consumed from the context.
  resolveThemeMotion(motion);
  const reduced = !!(motion && motion.reducedMotion);
  const t = reduced ? 0 : finiteClamp(time, 0, 1e6);
  const cl=(v: number)=>v<0?0:v>1?1:v;
  const lerp=(a: number,b: number,k: number)=>a+(b-a)*k;
  const cx=w*0.5;
  const px=mx-0.5, py=my-0.5;
  const vpX=cx+px*w*0.05;
  const vpY=h*(0.30+py*0.03);
  const srcX=vpX, srcY=vpY-h*0.05;
  const pulse=0.5+0.5*Math.sin(t*0.5);
  const breath=0.84+0.16*pulse;
  const bCore=0.90+0.10*pulse;

  ctx.globalAlpha=1;
  ctx.globalCompositeOperation="source-over";

  // atmospheric vertical wash
  const g=ctx.createLinearGradient(0,0,0,h);
  g.addColorStop(0,"rgba(26,40,70,0.50)");
  g.addColorStop(0.30,"rgba(14,24,46,0.34)");
  g.addColorStop(0.62,"rgba(6,10,20,0.10)");
  g.addColorStop(1,"rgba(1,2,4,0.55)");
  ctx.fillStyle=g; ctx.fillRect(0,0,w,h);

  // side-wall shading
  const wallW=w*0.16;
  const lw=ctx.createLinearGradient(0,0,wallW,0);
  lw.addColorStop(0,"rgba(30,44,74,0.42)");
  lw.addColorStop(1,"rgba(6,10,20,0)");
  ctx.fillStyle=lw; ctx.fillRect(0,0,wallW,h);
  const rw=ctx.createLinearGradient(w,0,w-wallW,0);
  rw.addColorStop(0,"rgba(30,44,74,0.42)");
  rw.addColorStop(1,"rgba(6,10,20,0)");
  ctx.fillStyle=rw; ctx.fillRect(w-wallW,0,wallW,h);

  // soft atmospheric haze blooms (trimmed 7 -> 5 for phone fill-rate/GC)
  ctx.globalCompositeOperation="lighter";
  for(let i=0;i<CFG.haze.length;i++){
    const hz=CFG.haze[i];
    const dr=fbm(hz.hx+t*0.05,hz.hy,3);
    const hx=(hz.x*0.7+0.15)*w+Math.sin(t*hz.sp+hz.ph)*w*0.03+px*w*0.02*(i%2?1:-1);
    const hy=hz.y*h+Math.cos(t*hz.sp*0.8+hz.ph)*h*0.02;
    const r=hz.r*w*(0.9+0.2*dr);
    const a=cl(0.040+0.045*(0.5+0.5*dr))*breath;
    softGlow(ctx,hx,hy,r,`rgba(96,132,214,${a})`,"transparent");
  }

  // light-source bloom — soft round glows only. Collapsed from 4 passes to 3
  // and the inner cores lowered/cooled (was near-white 238,246,255 @0.28) so
  // the additive stack at the vanishing point stays a cool blue glow instead
  // of clipping to white under the host bright-pass bloom — right where a
  // resume header sits.
  const winR=w*0.20*breath;
  softGlow(ctx,srcX,srcY,winR*2.1,`rgba(72,102,176,${cl(0.11*breath)})`,"transparent");
  softGlow(ctx,srcX,srcY,winR*0.95,`rgba(130,162,234,${cl(0.17*bCore)})`,"transparent");
  softGlow(ctx,srcX,srcY,winR*0.36,`rgba(196,216,250,${cl(0.17*bCore)})`,"transparent");

  // god-ray shafts — discrete, with offset top origins and per-shaft opacity
  // jitter so they read as separate rays, not a symmetric radiating fan
  for(let i=0;i<CFG.shafts.length;i++){
    const s=CFG.shafts[i];
    const sweep=Math.sin(t*s.sp+s.ph)*w*0.025;
    const topX=srcX+s.f*w*0.16+s.ox*w;
    const topY=srcY+s.oy*h;
    const baseX=cx+s.f*w*0.86+sweep;
    const bw=w*s.w;
    const flick=0.6+0.4*(0.5+0.5*fbm(i*3.1,t*0.4,2));
    const a=cl(s.br*0.085*flick*s.jit)*breath;
    if(a<=0.002) continue;
    const sg=ctx.createLinearGradient(topX,topY,baseX,h*1.02);
    sg.addColorStop(0,`rgba(178,204,255,${a})`);
    sg.addColorStop(0.5,`rgba(120,156,230,${a*0.5})`);
    sg.addColorStop(1,"rgba(60,90,160,0)");
    ctx.fillStyle=sg;
    ctx.beginPath();
    ctx.moveTo(topX-bw*0.15,topY);
    ctx.lineTo(topX+bw*0.15,topY);
    ctx.lineTo(baseX+bw,h*1.02);
    ctx.lineTo(baseX-bw,h*1.02);
    ctx.closePath();
    ctx.fill();
  }

  // reflected aisle floor — soft light pooling on the ground
  ctx.globalCompositeOperation="source-over";
  const fp=ctx.createLinearGradient(0,h*0.70,0,h);
  fp.addColorStop(0,"rgba(40,60,110,0)");
  fp.addColorStop(0.6,`rgba(54,78,140,${cl(0.06*breath)})`);
  fp.addColorStop(1,`rgba(86,116,190,${cl(0.12*breath)})`);
  ctx.fillStyle=fp; ctx.fillRect(0,h*0.70,w,h*0.30);

  ctx.globalCompositeOperation="lighter";
  softGlow(ctx,cx,h*1.00,w*0.42,`rgba(150,182,255,${cl(0.11*breath)})`,"transparent");
  softGlow(ctx,cx,h*0.90,w*0.24,`rgba(120,156,235,${cl(0.08*breath)})`,"transparent");

  // arches — the signature: monumental colonnade receding to the source
  const N=10;
  for(let d=N-1;d>=0;d--){
    const f=d/(N-1);
    const p=Math.pow(f,1.3);
    const scale=lerp(1.05,0.06,p);
    const aW=w*0.86*scale;
    const aH=h*0.92*scale;
    const ax=lerp(cx,vpX,p*0.85)+px*w*0.015*(1-p);
    const baseY=lerp(h*1.0,vpY,p);
    const hw=aW/2;
    const wallH=aH*0.5;
    const shY=baseY-wallH;
    const apexY=baseY-aH;
    const noiseB=0.85+0.15*fbm(d*1.7,t*0.15,2);
    const rim=cl((0.12+0.40*p)*breath*noiseB);
    const stone=cl((0.06+0.06*(1-p))*breath);
    const mkPath=()=>{
      ctx.beginPath();
      ctx.moveTo(ax-hw,baseY);
      ctx.lineTo(ax-hw,shY);
      ctx.bezierCurveTo(ax-hw,shY-(shY-apexY)*0.55,ax-hw*0.10,apexY+(shY-apexY)*0.12,ax,apexY);
      ctx.bezierCurveTo(ax+hw*0.10,apexY+(shY-apexY)*0.12,ax+hw,shY-(shY-apexY)*0.55,ax+hw,shY);
      ctx.lineTo(ax+hw,baseY);
    };

    ctx.globalCompositeOperation="lighter";
    mkPath();
    ctx.strokeStyle=`rgba(120,156,235,${rim*0.28})`;
    ctx.lineWidth=Math.max(1.5,aW*0.020);
    ctx.stroke();

    ctx.globalCompositeOperation="source-over";
    const eg=ctx.createLinearGradient(0,apexY,0,baseY);
    eg.addColorStop(0,`rgba(202,222,254,${cl(rim*1.0)})`);
    eg.addColorStop(0.5,`rgba(150,178,246,${cl(rim*0.7+stone)})`);
    eg.addColorStop(1,`rgba(40,60,110,${cl(stone+0.05)})`);
    mkPath();
    ctx.strokeStyle=eg;
    ctx.lineWidth=Math.max(1,aW*0.008);
    ctx.stroke();

    if(p>0.15){
      ctx.globalCompositeOperation="lighter";
      mkPath();
      ctx.strokeStyle=`rgba(212,228,254,${cl(rim*0.42*p)})`;
      ctx.lineWidth=1;
      ctx.stroke();
    }

    // keystone glow — soft round only. Cap (0.45->0.28) and growth
    // (0.34p->0.24p) lowered and the color cooled so the arch apexes clustered
    // at the vanishing point don't sum with the source bloom into a near-white
    // core behind the reading column.
    ctx.globalCompositeOperation="lighter";
    const ks=Math.min(0.28,cl((0.08+0.24*p)*breath*noiseB));
    softGlow(ctx,ax,apexY,Math.max(4,aW*0.05),`rgba(198,220,254,${ks})`,"transparent");
  }

  // dust drifting down the aisle — reduced count (70 -> 39) for phone fill-rate
  ctx.globalCompositeOperation="lighter";
  for(let i=0;i<CFG.dust.length;i++){
    const dm=CFG.dust[i];
    const L=CFG.layers[dm.layer];
    const frac=((t*L.speed*(0.7+dm.x0*0.6)+dm.phase)%1+1)%1;
    const yy=lerp(vpY*0.85,h*1.03,frac);
    const widen=lerp(w*0.015,w*0.34,frac);
    const sway=Math.sin(t*(0.3+dm.tws*0.2)+dm.drift)*widen*0.12;
    const xx=cx+dm.side*dm.spread*widen+sway-px*(14+dm.layer*30);
    const tw=0.4+0.6*(0.5+0.5*Math.sin(t*dm.tws+dm.tw));
    const edge=cl(Math.min(frac*5,(1-frac)*3,1));
    const a=cl(L.br*tw*edge)*breath;
    if(a<=0.002) continue;
    const sz=L.size*(0.8+0.5*tw);
    ctx.beginPath();
    ctx.fillStyle=`rgba(226,238,255,${a})`;
    ctx.arc(xx,yy,sz,0,TAU);
    ctx.fill();
    if(dm.big&&tw>0.85&&dm.layer===2){
      softGlow(ctx,xx,yy,sz*3.5,`rgba(200,222,255,${cl(a*0.6)})`,"transparent");
    }
  }

  // depth vignette
  ctx.globalCompositeOperation="source-over";
  const vg=ctx.createRadialGradient(cx,h*0.5,h*0.2,cx,h*0.5,h*0.9);
  vg.addColorStop(0,"rgba(3,4,6,0)");
  vg.addColorStop(0.7,"rgba(2,3,5,0.20)");
  vg.addColorStop(1,"rgba(0,1,3,0.72)");
  ctx.fillStyle=vg; ctx.fillRect(0,0,w,h);

  // faint cool light spill from the top — softened (0.09 -> 0.07) so the upper
  // content band keeps a touch more contrast
  ctx.globalCompositeOperation="lighter";
  const cgr=ctx.createLinearGradient(0,0,0,h*0.4);
  cgr.addColorStop(0,`rgba(40,64,120,${cl(0.07*breath)})`);
  cgr.addColorStop(1,"rgba(40,64,120,0)");
  ctx.fillStyle=cgr; ctx.fillRect(0,0,w,h*0.4);

  ctx.globalCompositeOperation="source-over";
  ctx.globalAlpha=1;
};
