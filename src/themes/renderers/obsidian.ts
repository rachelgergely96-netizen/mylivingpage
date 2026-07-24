import { fbm, noise2D } from "../shared/noise";
import { finiteClamp, resolveThemeMotion } from "../shared/motion";
import { createSeededRandom } from "../shared/random";
import { softGlow } from "../shared/draw";
import type { ThemeRenderer } from "../types";

type Point = [number, number];

// Cached unit-radius glow pair for the travelling hot pockets: two
// createRadialGradient allocations per node per frame were a hotspot.
// Authored at a fixed radius, stamped via translate/scale with globalAlpha
// carrying the per-node fade (identical output under "lighter").
const NODE_GLOW_RADIUS = 48;
let nodeGlowCtx: CanvasRenderingContext2D | null = null;
let nodeGlowHalo: CanvasGradient | null = null;
let nodeGlowCore: CanvasGradient | null = null;
function stampNodeGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  alpha: number,
  core: boolean,
) {
  if (!(alpha > 0) || !(r > 0)) return;
  if (nodeGlowCtx !== ctx || !nodeGlowHalo || !nodeGlowCore) {
    nodeGlowCtx = ctx;
    nodeGlowHalo = ctx.createRadialGradient(0, 0, 0, 0, 0, NODE_GLOW_RADIUS);
    nodeGlowHalo.addColorStop(0, "rgba(255,116,40,1)");
    nodeGlowHalo.addColorStop(1, "rgba(255,116,40,0)");
    nodeGlowCore = ctx.createRadialGradient(0, 0, 0, 0, 0, NODE_GLOW_RADIUS);
    nodeGlowCore.addColorStop(0, "rgba(255,192,124,1)");
    nodeGlowCore.addColorStop(1, "rgba(255,192,124,0)");
  }
  ctx.save();
  ctx.globalAlpha = alpha > 1 ? 1 : alpha;
  ctx.translate(x, y);
  const s = r / NODE_GLOW_RADIUS;
  ctx.scale(s, s);
  ctx.fillStyle = core ? nodeGlowCore : nodeGlowHalo;
  ctx.fillRect(-NODE_GLOW_RADIUS, -NODE_GLOW_RADIUS, NODE_GLOW_RADIUS * 2, NODE_GLOW_RADIUS * 2);
  ctx.restore();
}

interface ObsidianGeometryPoint {
  x: number;
  y: number;
  nx: number;
  ny: number;
  frac: number;
}

interface ObsidianCache {
  w: number;
  h: number;
  fgrad: CanvasGradient[] | null;
  vig: CanvasGradient | null;
  topg: CanvasGradient | null;
}

const CFG=(function(){
  const rnd=createSeededRandom(0x0b51d1a4);
  const T2=Math.PI*2;
  const originX=0.5, originY=0.60;

  function sampleAt(pts: Point[], frac: number): Point{
    const fi=frac*(pts.length-1);
    const i0=Math.max(0,Math.min(pts.length-2,Math.floor(fi)));
    const f=fi-i0;
    const a=pts[i0], b=pts[i0+1];
    return [a[0]+(b[0]-a[0])*f, a[1]+(b[1]-a[1])*f];
  }
  function resample(pts: Point[], N: number): Point[]{
    const out: Point[]=[];
    for(let i=0;i<N;i++){ out.push(sampleAt(pts, N>1?i/(N-1):0)); }
    return out;
  }
  function widthProfile(n: number, seed: number){
    const wj: number[]=[];
    for(let i=0;i<n;i++){
      wj.push(0.74 + 0.16*Math.sin(i*0.9+seed) + 0.12*Math.sin(i*2.1+seed*1.7+0.6));
    }
    return wj;
  }

  const veins=[];
  const HERO=11;
  for(let i=0;i<HERO;i++){
    const base=(i/HERO)*T2 + rnd()*0.55;
    let ang=base + (rnd()-0.5)*0.4;
    let x=originX + (rnd()-0.5)*0.07;
    let y=originY + (rnd()-0.5)*0.07;
    const steps=16+Math.floor(rnd()*10);
    const reach=0.34+rnd()*0.3;
    const step=reach/steps;
    const raw: Point[]=[[x,y]];
    for(let s=0;s<steps;s++){
      ang+=(rnd()-0.5)*0.62;
      ang+=(Math.sin(ang)<0?0.03:-0.01);
      x+=Math.cos(ang)*step;
      y+=Math.sin(ang)*step*1.02;
      x=Math.max(-0.06,Math.min(1.06,x));
      y=Math.max(-0.06,Math.min(1.09,y));
      raw.push([x,y]);
    }
    const pts=resample(raw, 11);
    veins.push({pts, wj:widthProfile(pts.length, i*3.1+1.2), phase:rnd()*T2, breath:0.5+rnd()*0.85, width:0.6+rnd()*0.95, hot:rnd()});
  }

  const branches=[];
  for(let i=0;i<HERO;i++){
    const parent=veins[i].pts;
    const nb=1+Math.floor(rnd()*2);
    for(let b=0;b<nb;b++){
      const idx=2+Math.floor(rnd()*(parent.length-3));
      let x=parent[idx][0], y=parent[idx][1];
      const nx=parent[idx+1]?parent[idx+1]:parent[idx];
      let ang=Math.atan2(nx[1]-y, nx[0]-x)+(rnd()-0.5)*1.5;
      const steps=6+Math.floor(rnd()*6);
      const st=0.035+rnd()*0.05;
      const raw: Point[]=[[x,y]];
      for(let s=0;s<steps;s++){
        ang+=(rnd()-0.5)*0.75;
        x+=Math.cos(ang)*st; y+=Math.sin(ang)*st;
        raw.push([x,y]);
      }
      const pts=resample(raw, 6);
      branches.push({pts, wj:widthProfile(pts.length, i*7.7+b*2.3+0.4), phase:rnd()*T2, width:0.35+rnd()*0.5});
    }
  }

  const nodes=[];
  const fracs=[0.3,0.55,0.8];
  for(let i=0;i<veins.length;i++){
    for(let k=0;k<fracs.length;k++){
      const p=sampleAt(veins[i].pts, fracs[k]);
      nodes.push({x:p[0], y:p[1], frac:fracs[k], vein:i, size:0.5+rnd()*0.95, phase:veins[i].phase});
    }
  }

  const vents=[];
  for(let i=0;i<veins.length;i++){
    const p=veins[i].pts[veins[i].pts.length-1];
    vents.push({x:p[0], y:p[1], phase:rnd()*T2, size:0.65+rnd()*0.85, spike:rnd()<0.55});
  }

  const GX=6, GY=4;
  const corners=[];
  for(let gy=0;gy<=GY;gy++){
    const row=[];
    for(let gx=0;gx<=GX;gx++){
      row.push([gx/GX+(rnd()-0.5)*0.085, gy/GY+(rnd()-0.5)*0.085]);
    }
    corners.push(row);
  }
  const facets=[];
  for(let gy=0;gy<GY;gy++){
    for(let gx=0;gx<GX;gx++){
      facets.push({
        a:corners[gy][gx], b:corners[gy][gx+1], c:corners[gy+1][gx+1], d:corners[gy+1][gx],
        shade:0.35+rnd()*0.65, tone:rnd()
      });
    }
  }

  const embers=[];
  for(let i=0;i<80;i++){
    const v=Math.floor(rnd()*veins.length);
    const p=sampleAt(veins[v].pts, 0.1+rnd()*0.82);
    embers.push({
      sx:p[0]+(rnd()-0.5)*0.02, sy:p[1],
      speed:0.05+rnd()*0.14, phase:rnd(),
      rise:0.16+rnd()*0.42, driftAmp:0.008+rnd()*0.03, driftFreq:1+rnd()*2.6,
      size:0.6+rnd()*1.8, swirl:rnd()*T2, big:rnd()<0.16
    });
  }

  const poolCols=[[255,120,32],[220,52,10],[255,164,86],[150,26,6]];
  const pools=[];
  for(let i=0;i<4;i++){
    pools.push({x:0.3+rnd()*0.4, y:0.42+rnd()*0.46, r:0.3+rnd()*0.3, sp:0.03+rnd()*0.05, phase:rnd()*T2, col:poolCols[i%poolCols.length]});
  }

  const cache: ObsidianCache={w:-1,h:-1,fgrad:null,vig:null,topg:null};

  return {originX, originY, veins, branches, nodes, vents, facets, embers, pools, cache};
})();

export const renderObsidian: ThemeRenderer = (
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
  const reduced=Boolean(motion?.reducedMotion);
  const t=reduced?0:time;
  const C=CFG;
  const min=Math.min(w,h)||1;
  const beat=0.5+0.5*Math.sin(t*0.5);
  const beat2=0.5+0.5*Math.sin(t*0.28+1.3);
  const cxp=mx*w, cyp=my*h;
  const ox=C.originX*w, oy=C.originY*h;
  const hasStory=M.sectionCount>0;
  const ambientRakeU=reduced?0.32:0.5+Math.sin(t*0.08)*0.38;
  let rakeU=hasStory
    ? 0.14+M.storyProgress*0.72+(reduced?0:Math.sin(t*0.08)*0.05)
    : ambientRakeU;
  if(M.hasFocus){
    const focusU=M.focusX*0.65+M.focusY*0.35;
    rakeU+=(focusU-rakeU)*0.6;
  }
  if(!reduced){
    rakeU+=finiteClamp(M.scrollVelocity/4,-1,1,0)*0.025;
  }
  rakeU=finiteClamp(rakeU,0.06,0.94,0.32);

  // ---- cache static gradients (facets / vignette / top-depth) — rebuilt only on resize ----
  const cache=C.cache;
  if(cache.w!==w || cache.h!==h){
    cache.w=w; cache.h=h;
    const fg=new Array<CanvasGradient>(C.facets.length);
    for(let i=0;i<C.facets.length;i++){
      const f=C.facets[i];
      const ax=f.a[0]*w, ay=f.a[1]*h, ccx=f.c[0]*w, ccy=f.c[1]*h;
      const g=ctx.createLinearGradient(ax,ay,ccx,ccy);
      const lit=0.03+f.shade*0.06;
      const warm=(28+f.tone*26)|0;
      g.addColorStop(0,"rgba("+warm+","+((9+f.tone*9)|0)+",6,"+lit+")");
      g.addColorStop(0.5,"rgba(9,3,1,0)");
      g.addColorStop(1,"rgba(2,0,0,"+(0.10+f.shade*0.14)+")");
      fg[i]=g;
    }
    cache.fgrad=fg;
    const vig=ctx.createRadialGradient(w*0.5,h*0.52,min*0.12, w*0.5,h*0.52,Math.max(w,h)*0.72);
    vig.addColorStop(0,"rgba(0,0,0,0)");
    vig.addColorStop(0.6,"rgba(2,0,0,0.26)");
    vig.addColorStop(1,"rgba(1,0,0,0.82)");
    cache.vig=vig;
    const topg=ctx.createLinearGradient(0,0,0,h*0.4);
    topg.addColorStop(0,"rgba(0,0,0,0.5)");
    topg.addColorStop(1,"rgba(0,0,0,0)");
    cache.topg=topg;
  }
  const fgrad=cache.fgrad;
  const vignette=cache.vig;
  const topDepth=cache.topg;
  if(!fgrad || !vignette || !topDepth) return;

  ctx.save();
  ctx.lineCap="round"; ctx.lineJoin="round";

  // 1. Molten underglow rising from beneath the glass
  ctx.globalCompositeOperation="lighter";
  const ug=ctx.createRadialGradient(w*0.5, h*0.87, min*0.04, w*0.5, h*0.87, h*(0.95+0.06*beat));
  ug.addColorStop(0, "rgba(122,28,5,"+(0.46+0.13*beat)+")");
  ug.addColorStop(0.42, "rgba(58,12,2,0.30)");
  ug.addColorStop(1, "rgba(2,0,0,0)");
  ctx.fillStyle=ug; ctx.fillRect(0,0,w,h);

  // molten core glows — lowered out of the text band, warm + softened so the convergence is a pocket, not a hotspot
  softGlow(ctx, ox, oy, min*(0.34+0.03*beat), "rgba(255,104,32,"+(0.12+0.07*beat)+")", "transparent");
  softGlow(ctx, ox, oy, min*(0.16+0.02*beat2), "rgba(255,170,96,"+(0.10+0.06*beat2)+")", "transparent");

  // 2. Drifting ember heat-pools — localised fill (no full-screen additive overdraw)
  for(let i=0;i<C.pools.length;i++){
    const p=C.pools[i];
    const px=(p.x+Math.sin(t*p.sp+p.phase)*0.05)*w;
    const py=(p.y+Math.cos(t*p.sp*0.8+p.phase)*0.04)*h;
    const pr=Math.max(1,p.r*min*(0.9+0.12*Math.sin(t*0.2+p.phase)));
    const a=0.085+0.045*Math.sin(t*0.3+p.phase);
    if(a<=0.002) continue;
    const g=ctx.createRadialGradient(px,py,0,px,py,pr);
    g.addColorStop(0,"rgba("+p.col[0]+","+p.col[1]+","+p.col[2]+","+Math.max(0,a)+")");
    g.addColorStop(0.5,"rgba("+p.col[0]+","+p.col[1]+","+p.col[2]+","+Math.max(0,a*0.38)+")");
    g.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=g;
    const rx=Math.max(0,px-pr), ry=Math.max(0,py-pr);
    ctx.fillRect(rx,ry,Math.min(w,px+pr)-rx,Math.min(h,py+pr)-ry);
  }

  // 3. Obsidian glass facets over the molten depth (cached gradients)
  ctx.globalCompositeOperation="source-over";
  for(let i=0;i<C.facets.length;i++){
    const f=C.facets[i];
    const ax=f.a[0]*w, ay=f.a[1]*h, bx=f.b[0]*w, by=f.b[1]*h;
    const ccx=f.c[0]*w, ccy=f.c[1]*h, dxx=f.d[0]*w, dyy=f.d[1]*h;
    ctx.beginPath();
    ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.lineTo(ccx,ccy); ctx.lineTo(dxx,dyy); ctx.closePath();
    ctx.fillStyle=fgrad[i]; ctx.fill();
    ctx.strokeStyle = f.shade>0.6 ? "rgba(150,64,26,0.06)" : "rgba(120,44,18,0.045)";
    ctx.lineWidth=1; ctx.stroke();
    const centerX=(f.a[0]+f.b[0]+f.c[0]+f.d[0])*0.25;
    const centerY=(f.a[1]+f.b[1]+f.c[1]+f.d[1])*0.25;
    const facetU=centerX*0.65+centerY*0.35;
    const raw=finiteClamp(1-Math.abs(facetU-rakeU)/0.13,0,1,0);
    const rakeWeight=raw*raw*(3-2*raw);
    if(rakeWeight>0){
      ctx.save();
      ctx.globalCompositeOperation="screen";
      ctx.fillStyle=`rgba(178,205,224,${0.055*rakeWeight})`;
      ctx.fill();
      ctx.strokeStyle=`rgba(220,233,243,${0.11*rakeWeight})`;
      ctx.lineWidth=0.9;
      ctx.stroke();
      ctx.restore();
    }
  }

  // 4. Heat-haze / ember-dust texture
  const gxN=18, gyN=10, cw=w/gxN, ch=h/gyN;
  for(let ix=0; ix<gxN; ix++){
    for(let iy=0; iy<gyN; iy++){
      const nx=ix/gxN, ny=iy/gyN;
      const n=fbm(nx*3.5 + t*0.03, ny*3.5 - t*0.05, 3);
      if(n<0.09) continue;
      const heat=Math.max(0, 1-Math.abs(ny-C.originY)*1.6);
      const a=n*0.05*(0.4+heat);
      if(a<0.004) continue;
      ctx.fillStyle="rgba(255,"+((88+heat*72)|0)+","+((28+heat*34)|0)+","+a+")";
      ctx.fillRect(ix*cw, iy*ch, cw+1, ch+1);
    }
  }

  // ---- geometry helpers for tapered magma ribbons ----
  const geo=(pts: Point[]): ObsidianGeometryPoint[]=>{
    const n=pts.length;
    const arr=new Array<ObsidianGeometryPoint>(n);
    for(let i=0;i<n;i++){
      arr[i]={x:pts[i][0]*w, y:pts[i][1]*h, nx:0, ny:0, frac:n>1?i/(n-1):0};
    }
    for(let i=0;i<n;i++){
      const a=arr[i>0?i-1:0], c=arr[i<n-1?i+1:n-1];
      const tx=c.x-a.x, ty=c.y-a.y;
      const tl=Math.hypot(tx,ty)||1;
      arr[i].nx=-ty/tl; arr[i].ny=tx/tl;
    }
    return arr;
  };
  const ribbon=(g: ObsidianGeometryPoint[],hwFn: (frac: number, index: number) => number)=>{
    const n=g.length;
    ctx.beginPath();
    for(let i=0;i<n;i++){
      const hw=hwFn(g[i].frac,i);
      const px=g[i].x+g[i].nx*hw, py=g[i].y+g[i].ny*hw;
      if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    for(let i=n-1;i>=0;i--){
      const hw=hwFn(g[i].frac,i);
      ctx.lineTo(g[i].x-g[i].nx*hw, g[i].y-g[i].ny*hw);
    }
    ctx.closePath();
  };

  // 5. Magma veins: layered tapered ribbons (deep-red halo, orange body, warm-hot core).
  //    No shadowBlur — the layered taper + host bright-pass bloom carry the glow.
  ctx.globalCompositeOperation="lighter";
  for(let vi=0; vi<C.veins.length; vi++){
    const v=C.veins[vi];
    const g=geo(v.pts);
    const wj=v.wj;
    const mid=g[g.length>>1];
    const md=Math.hypot(cxp-mid.x, cyp-mid.y);
    const mg=Math.max(0, 1-md/(min*0.35));
    const breath=0.6+0.4*Math.sin(t*v.breath + v.phase);
    const flick=0.82+0.18*fbm(vi*1.7, t*0.6, 2);
    const wb=0.8+0.45*breath+0.25*mg;
    const ai=Math.min(1.5, 0.5 + breath*0.5 + mg*0.75 + v.hot*0.15);

    // outer molten glow — deep red, widest, tapers to the tip (slightly widened to feather without shadowBlur)
    ribbon(g,(fr,i)=> min*0.019*v.width*wb*Math.pow(1-fr,0.5)*wj[i] + min*0.0012);
    ctx.fillStyle="rgba(150,26,4,"+(0.16*ai)+")"; ctx.fill();

    // molten body — orange, medium
    ribbon(g,(fr,i)=> min*0.0095*v.width*(0.85+0.3*breath)*Math.pow(1-fr,0.82)*wj[i]);
    ctx.fillStyle="rgba(255,100,26,"+(0.21*ai)+")"; ctx.fill();

    // warm-hot core — warmed + capped, and faded to zero at the convergence (fr->0) so the 11-vein junction is not a bloom hotspot
    ribbon(g,(fr,i)=> min*0.0038*v.width*(0.9+0.2*flick)*Math.pow(1-fr,1.35)*wj[i]*Math.min(1,fr*6.2));
    ctx.fillStyle="rgba(255,224,170,"+(Math.min(0.4,0.34*ai*flick))+")"; ctx.fill();
  }

  // 6. Branch cracks — thinner tapered ribbons, no shadowBlur
  for(let bi=0; bi<C.branches.length; bi++){
    const b=C.branches[bi];
    const g=geo(b.pts);
    const wj=b.wj;
    const breath=0.5+0.5*Math.sin(t*0.95 + b.phase);
    const ai=0.3+breath*0.4;

    ribbon(g,(fr,i)=> min*0.0078*b.width*(0.7+0.4*breath)*Math.pow(1-fr,0.6)*wj[i] + min*0.0007);
    ctx.fillStyle="rgba(170,34,8,"+(0.16*ai)+")"; ctx.fill();

    ribbon(g,(fr,i)=> min*0.0026*b.width*Math.pow(1-fr,1.1)*wj[i]);
    ctx.fillStyle="rgba(255,150,64,"+(0.32*ai)+")"; ctx.fill();
  }

  // 7. Travelling hot pockets — warm amber, capped (no white bloom over content)
  for(let ni=0; ni<C.nodes.length; ni++){
    const nd=C.nodes[ni];
    const wv=0.5+0.5*Math.sin(t*1.1 - nd.frac*6.5 + nd.phase);
    const b=wv*wv;
    if(b<0.08) continue;
    const x=nd.x*w, y=nd.y*h;
    const r=Math.max(1, min*(0.010+nd.size*0.02)*(0.6+b*0.8));
    stampNodeGlow(ctx, x, y, r*2.2, 0.20*b, false);
    stampNodeGlow(ctx, x, y, r*0.85, Math.min(0.4,0.42*b), true);
  }

  // 8. Vents where veins reach the surface — soft round blooms, warmed + capped
  for(let i=0;i<C.vents.length;i++){
    const ve=C.vents[i];
    const pulse=0.42+0.58*Math.abs(Math.sin(t*0.8+ve.phase));
    const x=ve.x*w, y=ve.y*h;
    const r=Math.max(1, min*(0.02+ve.size*0.03)*(0.7+0.4*pulse));
    softGlow(ctx, x, y, r*1.8, "rgba(255,86,24,"+(0.18*pulse)+")", "transparent");
    softGlow(ctx, x, y, r*0.7, "rgba(255,198,138,"+(Math.min(0.4,0.46*pulse))+")", "transparent");
    if(ve.spike && pulse>0.72){
      softGlow(ctx, x, y, r*1.2, "rgba(255,214,150,"+(Math.min(0.34,0.4*(pulse-0.72)/0.28))+")", "transparent");
    }
  }

  // cursor heat bloom — subtle warm lift (sits over centre when the pointer is at rest)
  softGlow(ctx, cxp, cyp, min*0.15, "rgba(255,128,50,0.055)", "transparent");

  // 9. Rising heat embers, colour-graded hot to cool
  for(let i=0;i<C.embers.length;i++){
    const e=C.embers[i];
    let p=t*e.speed + e.phase; p=p-Math.floor(p);
    const life=Math.sin(p*Math.PI);
    if(life<=0.02) continue;
    const curl=noise2D(e.sx*6 + p*2.2, e.sy*6 + t*0.1)*0.03;
    const x=(e.sx + Math.sin(p*6.28318*e.driftFreq + e.swirl)*e.driftAmp + curl)*w;
    const y=(e.sy - p*e.rise)*h;
    const cool=1-p;
    const r=Math.max(0.4, e.size*(0.5+cool*0.7));
    const gg=(86+cool*142)|0, bb=(18+cool*82)|0;
    const a=Math.min(0.82, life*(0.48+0.4*cool));
    if(e.big){
      softGlow(ctx, x, y, r*4, "rgba(255,"+gg+","+bb+","+(a*0.32)+")", "transparent");
    }
    ctx.fillStyle="rgba(255,"+gg+","+bb+","+a+")";
    ctx.beginPath(); ctx.arc(x,y,r,0,6.28318); ctx.fill();
  }

  // 10. Warm centre grade + vignette + top depth (vignette & top-depth are cached)
  const grade=ctx.createRadialGradient(w*0.5,h*0.5,0,w*0.5,h*0.5,min*0.82);
  grade.addColorStop(0,"rgba(82,26,7,"+(0.08+0.035*beat)+")");
  grade.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=grade; ctx.fillRect(0,0,w,h);

  ctx.globalCompositeOperation="source-over";
  ctx.fillStyle=vignette; ctx.fillRect(0,0,w,h);
  ctx.fillStyle=topDepth; ctx.fillRect(0,0,w,h*0.4);

  ctx.restore();
};
