import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { finiteClamp, resolveThemeMotion } from "../shared/motion";
import { softGlow } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

const CFG=(function(){
  const rnd=createSeededRandom(48213);
  const N=7, M=9;
  const bounds=[];
  for(let b=0;b<=N;b++){
    const a1=(rnd()-0.5)*0.018, a2=(rnd()-0.5)*0.010;
    const f1=1+Math.floor(rnd()*2), f2=2+Math.floor(rnd()*2);
    const ph1=rnd()*TAU, ph2=rnd()*TAU;
    const pts=[];
    for(let i=0;i<M;i++){
      const u=i/(M-1);
      pts.push(a1*Math.sin(u*Math.PI*(f1+0.5)+ph1)+a2*Math.sin(u*Math.PI*(f2+1)+ph2));
    }
    bounds.push({baseY:0.1+b*0.13,tilt:(rnd()-0.5)*0.05,pts,faultAt:2+Math.floor(rnd()*(M-3)),faultAmt:(rnd()-0.5)*0.014});
  }
  const PAL=[
    {hi:'#4b3421',mid:'#302219',lo:'#0f0b07'},
    {hi:'#6b4526',mid:'#49301F',lo:'#150e08'},
    {hi:'#3a2b20',mid:'#241C17',lo:'#0c0906'},
    {hi:'#7c4d29',mid:'#563720',lo:'#170f08'},
    {hi:'#4d3925',mid:'#33261E',lo:'#100c08'},
    {hi:'#5f3f26',mid:'#402B1D',lo:'#130d08'},
    {hi:'#342820',mid:'#211A16',lo:'#0b0806'}
  ];
  // Time-independent bevel noise precomputed once, so the per-frame beveled-edge
  // loop makes ZERO fbm() calls (was ~56 fbm/frame). Values are identical to the
  // original inline fbm(i*0.7+p*3.1, p*1.9+3, 2), so the cut-stone look is unchanged.
  const bevelNV=[];
  for(let p=0;p<N;p++){const row=[];for(let i=0;i<M-1;i++){row.push(0.55+0.55*fbm(i*0.7+p*3.1,p*1.9+3,2));}bevelNV.push(row);}
  // grain (60) and dust (16) are generated at full count to keep the seeded RNG
  // stream — and therefore the approved seam/branch geometry — byte-identical.
  const grain=[];
  for(let i=0;i<60;i++) grain.push({x:rnd(),y:rnd(),s:0.5+rnd()*1.5,a:0.02+rnd()*0.05,warm:rnd(),d:0.3+rnd()*0.9});
  const dust=[];
  for(let i=0;i<16;i++) dust.push({x:rnd(),y:rnd(),r:0.003+rnd()*0.006,sp:0.3+rnd()*0.8,ph:rnd()*TAU,depth:0.3+rnd()*0.7});
  const seamN=16;
  const seam=[];
  let acc=0;
  for(let i=0;i<seamN;i++){acc=acc*0.78+(rnd()-0.5)*0.014;seam.push({off:acc,wv:0.7+rnd()*0.5,hot:rnd()});}
  const branches=[];
  for(let i=0;i<3;i++) branches.push({at:0.2+rnd()*0.6,dir:rnd()<0.5?-1:1,len:0.05+rnd()*0.06,seg:2+Math.floor(rnd()*2),jag:rnd()*TAU});
  return {N,M,bounds,PAL,bevelNV,grain,dust,seamN,seam,branches};
})();

export const renderQuarry: ThemeRenderer = (ctx,w,h,t,mx,my,_deltaSeconds,motion)=>{
  const N=CFG.N,M=CFG.M;
  const px=mx-0.5,py=my-0.5;
  const clampA=(v: number)=>v<0?0:(v>1?1:v);

  // Page-motion model. UNDEFINED at rest/in preview -> resolveThemeMotion returns
  // all-zero/safe values, so every motion term below collapses to 0 and the scene
  // renders exactly as the approved still. Motion only adds gentle nuance on top.
  const mo=resolveThemeMotion(motion);
  const vel=finiteClamp(mo.scrollVelocity/4,-1,1);
  const velAbs=vel<0?-vel:vel;
  const story=mo.storyProgress;
  const hasSections=mo.sectionCount>0;
  const activeStratum=hasSections?Math.min(N-1,Math.max(0,Math.round(story*(N-1)))):-1;

  // Warm mineral wash rising from the working face (translucent, over the painted bg)
  const baseG=ctx.createRadialGradient(w*0.62,h*0.3,0,w*0.62,h*0.3,Math.max(w,h)*0.95);
  baseG.addColorStop(0,'rgba(48,31,18,0.46)');
  baseG.addColorStop(0.5,'rgba(20,14,8,0.30)');
  baseG.addColorStop(1,'rgba(3,2,2,0)');
  ctx.fillStyle=baseG;ctx.fillRect(0,0,w,h);

  // Grazing quarry light — soft directional gradient only. Warms faintly with
  // scroll velocity + story position (clamped so it can never feed the bloom).
  ctx.save();ctx.globalCompositeOperation='lighter';
  const graze=ctx.createLinearGradient(w*0.4,h*0.05,w*1.02,h*0.72);
  const gz=finiteClamp(0.045+0.02*Math.sin(t*0.18)+0.02*velAbs+0.018*story,0,0.09);
  graze.addColorStop(0,'rgba(233,175,114,0)');
  graze.addColorStop(1,'rgba(233,175,114,'+gz.toFixed(3)+')');
  ctx.fillStyle=graze;ctx.fillRect(0,0,w,h);
  ctx.restore();

  const breathe=(b: number)=>Math.sin(t*0.2+b*0.6)*h*0.003+py*h*0.009*(0.4+b*0.09);
  const shiftFor=(b: number)=>px*w*0.016*(1+b*0.12);
  const bx=(b: number,i: number)=>(i/(M-1))*w+shiftFor(b);
  const by=(b: number,i: number)=>{const B=CFG.bounds[b];const fault=i>=B.faultAt?B.faultAmt:0;return (B.baseY+B.pts[i]+fault+(i/(M-1)-0.5)*B.tilt)*h+breathe(b)+story*h*0.006*b;};

  // ---- Cut-stone planes (rock strata) ----
  for(let p=0;p<N;p++){
    const pal=CFG.PAL[p];
    const active=(p===activeStratum);
    ctx.beginPath();
    ctx.moveTo(bx(p,0),by(p,0));
    for(let i=1;i<M;i++) ctx.lineTo(bx(p,i),by(p,i));
    for(let i=M-1;i>=0;i--) ctx.lineTo(bx(p+1,i),by(p+1,i));
    ctx.closePath();
    const topY=by(p,0),botY=by(p+1,0);
    const y0=Math.min(topY,botY),y1=Math.max(topY,botY)+1;
    const fg=ctx.createLinearGradient(0,y0,0,y1);
    // Active stratum warms toward a dark mineral brown (matches the baseline's
    // #684125 intent) without becoming a bright hotspot. Inactive -> approved lo.
    fg.addColorStop(0,pal.hi);fg.addColorStop(0.4,pal.mid);fg.addColorStop(1,active?'#5a3a20':pal.lo);
    ctx.fillStyle=fg;ctx.fill();

    ctx.save();ctx.clip();
    // Ambient occlusion where the plane above overhangs — gives the cut depth
    const ao=ctx.createLinearGradient(0,y0-2,0,y0+h*0.07);
    ao.addColorStop(0,'rgba(0,0,0,0.5)');ao.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=ao;ctx.fillRect(0,y0-4,w,h*0.09);
    // Restrained chisel hatching on alternating cut faces
    if(p%2===1){
      ctx.globalCompositeOperation='lighter';
      ctx.strokeStyle='rgba(233,190,150,0.024)';ctx.lineWidth=0.7;
      const sp=Math.max(56,w*0.092);
      for(let x=-h*0.3;x<w;x+=sp){ctx.beginPath();ctx.moveTo(x,y0-14);ctx.lineTo(x-h*0.28,y0+h*0.18);ctx.stroke();}
    }
    ctx.restore();
  }

  // ---- Beveled cut-stone edges: per-facet groove-shadow + lit chamfer ----
  // Perf: the lit chamfer used to allocate one linear gradient per lit facet
  // (~50/frame). Now a tiny fixed set of NB chamfer gradients is built once per
  // frame and reused via translate()+globalAlpha, so the facet's brightness is
  // factored into globalAlpha instead of a bespoke gradient. Low-facing facets
  // are skipped more aggressively and peak highlight alpha is capped (bloom-safe).
  const Lx=0.5,Ly=-0.866;
  const NB=6,maxCh=h*0.021;
  const chamGrad=[];
  for(let k=0;k<NB;k++){
    const Hk=maxCh*(k+1)/NB;
    const cgk=ctx.createLinearGradient(0,0,0,Hk>0?Hk:1);
    cgk.addColorStop(0,'rgba(255,213,163,1)');
    cgk.addColorStop(0.5,'rgba(233,175,114,0.45)');
    cgk.addColorStop(1,'rgba(233,175,114,0)');
    chamGrad.push(cgk);
  }
  for(let p=0;p<N;p++){
    const emph=activeStratum<0?1:(p===activeStratum?1.3:0.85);
    const nvRow=CFG.bevelNV[p];
    for(let i=0;i<M-1;i++){
      const ax=bx(p,i),ay=by(p,i),Bx=bx(p,i+1),By=by(p,i+1);
      const dx=Bx-ax,dy=By-ay,dl=Math.hypot(dx,dy)||1;
      let nx=-dy/dl,ny=dx/dl; if(ny>0){nx=-nx;ny=-ny;}
      let facing=nx*Lx+ny*Ly; if(facing<0)facing=0;
      const u=(i+0.5)/(M-1);
      const edgeFade=Math.min(1,Math.min(u,1-u)*3+0.12);
      const nv=nvRow[i];
      // Groove: deep shadow at the contact (solid fill, no allocation)
      const gH=(h*0.004+h*0.004*(1-facing))*edgeFade;
      const darkA=(0.13+0.26*(1-facing))*edgeFade*nv;
      ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(Bx,By);ctx.lineTo(Bx,By+gH);ctx.lineTo(ax,ay+gH);ctx.closePath();
      ctx.fillStyle='rgba(6,4,2,'+darkA.toFixed(3)+')';ctx.fill();
      // Chamfer: warm lit bevel, brightness in globalAlpha, geometry from cache
      const chH=(h*0.006+h*0.013*facing)*nv*edgeFade;
      let hlA=(0.045+0.24*facing)*nv*edgeFade*emph;
      if(hlA>0.3)hlA=0.3;
      if(facing>0.16&&hlA>0.02&&chH>0.6){
        let k=Math.floor(chH/maxCh*NB);if(k<0)k=0;if(k>=NB)k=NB-1;
        const Hk=maxCh*(k+1)/NB;
        const yt=Math.min(ay,By);
        ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=hlA;ctx.translate(0,yt);ctx.fillStyle=chamGrad[k];
        ctx.beginPath();ctx.moveTo(ax,ay-yt);ctx.lineTo(Bx,By-yt);ctx.lineTo(Bx,By-yt+Hk);ctx.lineTo(ax,ay-yt+Hk);ctx.closePath();ctx.fill();
        ctx.restore();
      }
    }
  }

  // Fine mineral / stone grain flecks. Flicker is a cheap deterministic sine keyed
  // off each fleck's static position (was fbm() per fleck -> ~60 fbm/frame removed).
  for(let k=0;k<CFG.grain.length;k++){
    const g=CFG.grain[k];
    const fl=0.5+0.32*Math.sin(t*(0.35+g.d*0.25)+(g.x+g.y*1.7)*TAU);
    const a=g.a*fl;
    if(a<=0.004) continue;
    const gx=g.x*w+px*w*0.01*g.d,gy=g.y*h+py*h*0.008*g.d;
    if(g.warm>0.5) ctx.fillStyle='rgba(240,205,165,'+a.toFixed(3)+')';
    else ctx.fillStyle='rgba(6,4,2,'+(a*1.4).toFixed(3)+')';
    ctx.fillRect(gx,gy,g.s,g.s);
  }

  // ---- One warm molten mineral seam (kept in the right-hand art field) ----
  const seamN=CFG.seamN;
  const cx0=w*(0.7+px*0.02);
  const cxs: number[]=[],cys: number[]=[],hw: number[]=[];
  for(let i=0;i<seamN;i++){
    const fy=i/(seamN-1);
    const meander=CFG.seam[i].off+Math.sin(t*0.35+i*0.55)*0.004;
    cxs.push(cx0+meander*w+vel*w*0.005);
    cys.push((-0.03+fy*1.06)*h);
    const taper=Math.sin(fy*Math.PI);
    hw.push((w*0.0028+w*0.0072*taper)*CFG.seam[i].wv*(0.9+0.14*Math.sin(t*0.8+i)));
  }
  const seamAt=(s: number): [number, number]=>{const f=clampA(s)*(seamN-1),i0=Math.floor(f),i1=Math.min(seamN-1,i0+1),fr=f-i0;return [cxs[i0]+(cxs[i1]-cxs[i0])*fr,cys[i0]+(cys[i1]-cys[i0])*fr];};

  // Heat halo around the seam (soft round blooms only). Trimmed 16 -> 6 halos and
  // dimmed so the additive stack stays well under the bright-pass clip.
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(let i=0;i<seamN;i+=3){
    const pu=0.55+0.45*Math.sin(t*0.9+i*0.5);
    const r=(hw[i]*3.4+w*0.016)*(0.85+0.3*pu);
    const ha=finiteClamp((0.048*pu+0.018)*(1+0.5*velAbs),0,0.085);
    softGlow(ctx,cxs[i],cys[i],r,'rgba(233,140,70,'+ha.toFixed(3)+')','transparent');
  }
  ctx.restore();

  // Dark stone lips — the recessed crack walls the mineral sits inside
  ctx.beginPath();
  ctx.moveTo(cxs[0]-hw[0]-(hw[0]*0.6+2.5),cys[0]);
  for(let i=1;i<seamN;i++){const lw=hw[i]*0.6+2.5;ctx.lineTo(cxs[i]-hw[i]-lw,cys[i]);}
  for(let i=seamN-1;i>=0;i--){const lw=hw[i]*0.6+2.5;ctx.lineTo(cxs[i]+hw[i]+lw,cys[i]);}
  ctx.closePath();
  ctx.fillStyle='rgba(9,5,3,0.72)';ctx.fill();

  // Molten body — tapered ribbon with heat variation along its length. Peak
  // luminance nudged down slightly so the body doesn't key the bloom on its own.
  ctx.beginPath();
  ctx.moveTo(cxs[0]-hw[0],cys[0]);
  for(let i=1;i<seamN;i++) ctx.lineTo(cxs[i]-hw[i],cys[i]);
  for(let i=seamN-1;i>=0;i--) ctx.lineTo(cxs[i]+hw[i],cys[i]);
  ctx.closePath();
  const mg=ctx.createLinearGradient(0,cys[0],0,cys[seamN-1]);
  mg.addColorStop(0,'rgba(96,38,14,0.85)');
  mg.addColorStop(0.32,'rgba(210,102,44,0.93)');
  mg.addColorStop(0.55,'rgba(242,150,80,0.95)');
  mg.addColorStop(0.78,'rgba(206,94,40,0.93)');
  mg.addColorStop(1,'rgba(92,34,12,0.85)');
  ctx.fillStyle=mg;ctx.fill();

  // Bright molten core, tapered thinner than the body. Alpha lowered (0.85 -> 0.50)
  // and warmed (less blue) so under the additive bright-pass bloom it reads as hot
  // amber rather than clipping to a pure-white column that smears into the text.
  ctx.save();ctx.globalCompositeOperation='lighter';
  ctx.beginPath();
  ctx.moveTo(cxs[0]-hw[0]*0.4,cys[0]);
  for(let i=1;i<seamN;i++) ctx.lineTo(cxs[i]-hw[i]*0.4,cys[i]);
  for(let i=seamN-1;i>=0;i--) ctx.lineTo(cxs[i]+hw[i]*0.4,cys[i]);
  ctx.closePath();
  const cg2=ctx.createLinearGradient(0,cys[0],0,cys[seamN-1]);
  cg2.addColorStop(0,'rgba(255,150,70,0)');
  cg2.addColorStop(0.3,'rgba(255,200,132,0.42)');
  cg2.addColorStop(0.55,'rgba(255,232,190,0.50)');
  cg2.addColorStop(0.8,'rgba(255,185,110,0.40)');
  cg2.addColorStop(1,'rgba(255,150,70,0)');
  ctx.fillStyle=cg2;ctx.fill();
  ctx.restore();

  // Slow molten globules drifting the seam (round blooms, no rays). Inner glow
  // dimmed + warmed; drift/brightness gently react to scroll velocity (clamped).
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(let k=0;k<2;k++){
    const sq=((t*0.075+k*0.5+vel*0.05)%1+1)%1;
    const P=seamAt(sq),pulse=0.6+0.4*Math.sin(t*2.4+k);
    const gi=finiteClamp(0.17*pulse*(1+0.4*velAbs),0,0.24);
    const go=finiteClamp(0.10*pulse*(1+0.4*velAbs),0,0.15);
    softGlow(ctx,P[0],P[1],w*0.02*pulse+8,'rgba(255,216,150,'+gi.toFixed(3)+')','transparent');
    softGlow(ctx,P[0],P[1],w*0.05*pulse+14,'rgba(255,150,80,'+go.toFixed(3)+')','transparent');
  }
  ctx.restore();

  // Tapered mineral veins branching off the seam — dark lip + warm gradient core +
  // root bloom, kept few so they read as mineral threads, never rival the seam.
  for(let b=0;b<CFG.branches.length;b++){
    const br=CFG.branches[b],st=seamAt(br.at);
    const pts=[[st[0],st[1]]];
    let cx=st[0],cy=st[1];
    for(let s=1;s<=br.seg;s++){
      cx+=br.dir*(br.len*w/br.seg);
      cy+=(s%2?1:-1)*h*0.008+Math.sin(br.jag+s)*h*0.005;
      pts.push([cx,cy]);
    }
    const ex=pts[br.seg][0]-pts[0][0],ey=pts[br.seg][1]-pts[0][1],el=Math.hypot(ex,ey)||1;
    const pnx=-ey/el,pny=ex/el;
    const maxW=w*0.0046;
    // recessed stone lip
    ctx.beginPath();
    for(let s=0;s<=br.seg;s++){const wv=maxW*(1-s/br.seg)+1.6;ctx.lineTo(pts[s][0]+pnx*wv,pts[s][1]+pny*wv);}
    for(let s=br.seg;s>=0;s--){const wv=maxW*(1-s/br.seg)+1.6;ctx.lineTo(pts[s][0]-pnx*wv,pts[s][1]-pny*wv);}
    ctx.closePath();
    ctx.fillStyle='rgba(7,4,2,0.55)';ctx.fill();
    // warm mineral body, tapering to nothing at the tip
    ctx.beginPath();
    for(let s=0;s<=br.seg;s++){const wv=maxW*(1-s/br.seg);ctx.lineTo(pts[s][0]+pnx*wv,pts[s][1]+pny*wv);}
    for(let s=br.seg;s>=0;s--){const wv=maxW*(1-s/br.seg);ctx.lineTo(pts[s][0]-pnx*wv,pts[s][1]-pny*wv);}
    ctx.closePath();
    const vg=ctx.createLinearGradient(pts[0][0],pts[0][1],pts[br.seg][0],pts[br.seg][1]);
    vg.addColorStop(0,'rgba(233,150,86,0.5)');
    vg.addColorStop(1,'rgba(150,80,40,0)');
    ctx.fillStyle=vg;ctx.fill();
    // soft round bloom where the vein leaves the seam
    ctx.save();ctx.globalCompositeOperation='lighter';
    softGlow(ctx,pts[0][0],pts[0][1],w*0.017,'rgba(233,150,90,0.15)','transparent');
    ctx.restore();
  }

  // ---- Architectural dossier mark: a single elevation ruler ----
  const rulerX=w*0.945;
  ctx.strokeStyle='rgba(233,175,114,0.2)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(rulerX,h*0.07);ctx.lineTo(rulerX,h*0.93);ctx.stroke();
  for(let tk=0;tk<=24;tk++){
    const y=h*(0.07+tk*(0.86/24));
    const len=tk%5===0?w*0.024:(tk%2===0?w*0.013:w*0.007);
    ctx.fillStyle=tk%5===0?'rgba(255,214,169,0.34)':'rgba(233,175,114,0.16)';
    ctx.fillRect(rulerX-len,y,len,1);
  }

  // Registration corner brackets (L-shaped ticks — never plus/cross)
  ctx.save();
  ctx.strokeStyle='rgba(233,175,114,0.16)';ctx.lineWidth=1;ctx.lineCap='round';
  const brk=(bxp: number,byp: number,s: number,ox: number,oy: number)=>{ctx.beginPath();ctx.moveTo(bxp+ox*s,byp);ctx.lineTo(bxp,byp);ctx.lineTo(bxp,byp+oy*s);ctx.stroke();};
  brk(w*0.05,h*0.085,11,1,1);
  brk(w*0.05,h*0.915,11,1,-1);
  ctx.restore();

  // ---- Page-focus survey reticle: drawn only when the page reports a focused
  // item. Corner brackets (not a cross) + a faint dashed leader to the nearest
  // seam point + a soft round glow; size shrinks and glow lifts with impulse.
  if(mo.hasFocus){
    const fX=mo.focusX*w,fY=mo.focusY*h,imp=mo.interactionImpulse;
    const SP=seamAt(clampA(fY/(h||1)));
    ctx.save();
    ctx.strokeStyle='rgba(233,183,140,'+finiteClamp(0.14+0.18*imp,0,0.4).toFixed(3)+')';
    ctx.lineWidth=1;ctx.lineCap='round';ctx.setLineDash([5,7]);
    ctx.beginPath();ctx.moveTo(SP[0],SP[1]);ctx.lineTo(fX,fY);ctx.stroke();
    ctx.setLineDash([]);
    const sz=7+(1-imp)*10,c=sz*0.5,arm=sz*0.42;
    ctx.strokeStyle='rgba(255,214,169,'+finiteClamp(0.28+0.3*imp,0,0.6).toFixed(3)+')';
    ctx.beginPath();
    ctx.moveTo(fX-c+arm,fY-c);ctx.lineTo(fX-c,fY-c);ctx.lineTo(fX-c,fY-c+arm);
    ctx.moveTo(fX+c-arm,fY-c);ctx.lineTo(fX+c,fY-c);ctx.lineTo(fX+c,fY-c+arm);
    ctx.moveTo(fX-c+arm,fY+c);ctx.lineTo(fX-c,fY+c);ctx.lineTo(fX-c,fY+c-arm);
    ctx.moveTo(fX+c-arm,fY+c);ctx.lineTo(fX+c,fY+c);ctx.lineTo(fX+c,fY+c-arm);
    ctx.stroke();
    ctx.restore();
    ctx.save();ctx.globalCompositeOperation='lighter';
    softGlow(ctx,fX,fY,sz*2.4,'rgba(233,160,96,'+finiteClamp(0.05+0.12*imp,0,0.2).toFixed(3)+')','transparent');
    ctx.restore();
  }

  // Drifting quarry dust motes (soft round blooms). Trimmed 16 -> 9 and gently
  // lifted/brightened by scroll velocity (clamped so spikes can't blow the bloom).
  ctx.save();ctx.globalCompositeOperation='lighter';
  const dustCount=Math.min(9,CFG.dust.length);
  for(let d=0;d<dustCount;d++){
    const dm=CFG.dust[d];
    const dy=((dm.y-t*0.01*dm.sp-vel*0.03*dm.depth)%1+1)%1;
    const dx=dm.x+px*0.03*dm.depth+Math.sin(t*0.3*dm.sp+dm.ph)*0.01;
    const tw=0.4+0.6*Math.abs(Math.sin(t*dm.sp+dm.ph));
    const da=finiteClamp(0.11*tw*dm.depth*(1+0.4*velAbs),0,0.16);
    softGlow(ctx,dx*w,dy*h,dm.r*w*(0.6+0.5*tw),'rgba(240,205,160,'+da.toFixed(3)+')','transparent');
  }
  softGlow(ctx,mx*w,my*h,Math.min(w,h)*0.16,'rgba(233,175,114,0.05)','transparent');
  ctx.restore();

  // Settled floor and vignette ground the dossier
  const floor=ctx.createLinearGradient(0,h*0.7,0,h);
  floor.addColorStop(0,'rgba(3,2,2,0)');floor.addColorStop(1,'rgba(2,1,1,0.6)');
  ctx.fillStyle=floor;ctx.fillRect(0,h*0.7,w,h*0.3);

  ctx.save();ctx.globalCompositeOperation='lighter';
  const fl=ctx.createLinearGradient(0,h*0.9,0,h);
  fl.addColorStop(0,'rgba(233,140,70,0)');fl.addColorStop(1,'rgba(120,60,25,0.12)');
  ctx.fillStyle=fl;ctx.fillRect(0,h*0.9,w,h*0.1);
  ctx.restore();

  const vig=ctx.createRadialGradient(w*0.5,h*0.46,Math.min(w,h)*0.3,w*0.5,h*0.5,Math.max(w,h)*0.75);
  vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(0,0,0,0.6)');
  ctx.fillStyle=vig;ctx.fillRect(0,0,w,h);
};
