import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { finiteClamp, resolveThemeMotion, storyStepWeight } from "../shared/motion";
import { softGlow, star4 } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

const CFG=(function(){
  const rand=createSeededRandom(0x50726c6e);
  const rawSeams=[
    [[-0.24,0.03],[-0.18,0.18],[-0.31,0.31],[-0.21,0.48],[-0.29,0.66],[-0.13,0.88]],
    [[-0.29,0.31],[-0.53,0.36],[-0.7,0.48]],
    [[-0.21,0.48],[0.02,0.55],[0.14,0.7],[0.38,0.79]],
    [[0.47,0.13],[0.34,0.28],[0.43,0.42],[0.29,0.58]],
    [[0.43,0.42],[0.66,0.5],[0.76,0.61]],
    [[0.14,0.7],[0.03,0.82],[0.08,0.98]]
  ];
  const seams=[];
  const nodes=[];
  for(let i=0;i<rawSeams.length;i++){
    const pts=rawSeams[i];
    const segLen=[];
    let total=0;
    for(let p=0;p<pts.length-1;p++){
      const dx=pts[p+1][0]-pts[p][0];
      const dy=(pts[p+1][1]-pts[p][1])*3.0;
      const l=Math.sqrt(dx*dx+dy*dy);
      segLen.push(l);
      total+=l;
    }
    seams.push({pts:pts,segLen:segLen,total:total,off:rand()});
    for(let p=0;p<pts.length;p++){
      nodes.push({x:pts[p][0],y:pts[p][1],ph:rand()*TAU,seam:i});
    }
  }
  const cracks=[];
  for(let i=0;i<48;i++){
    const segs=2+Math.floor(rand()*3);
    let x=(rand()*2-1)*0.9;
    let y=0.06+rand()*0.86;
    let ang=rand()*TAU;
    const pts=[[x,y]];
    for(let s=0;s<segs;s++){
      ang+=(rand()-0.5)*1.5;
      const len=0.05+rand()*0.14;
      x+=Math.cos(ang)*len*0.5;
      y+=Math.sin(ang)*len;
      pts.push([x,y]);
    }
    cracks.push({pts:pts,w:0.4+rand()*0.9,a:0.05+rand()*0.13,ph:rand()*TAU});
  }
  const pal=[
    ["206,222,238","118,150,180"],
    ["200,222,208","118,158,140"],
    ["244,240,230","168,176,176"],
    ["170,204,220","96,138,162"],
    ["222,214,238","150,142,182"]
  ];
  const blooms=[];
  for(let i=0;i<8;i++){
    const c=pal[Math.floor(rand()*pal.length)];
    blooms.push({x:(rand()*2-1)*0.72,y:0.12+rand()*0.78,r:0.35+rand()*0.75,ph:rand()*TAU,sp:0.12+rand()*0.3,c0:c[0],c1:c[1]});
  }
  const flecks=[];
  for(let i=0;i<48;i++){
    flecks.push({x:(rand()*2-1)*0.95,y:0.05+rand()*0.9,r:0.4+rand()*1.2,a:0.04+rand()*0.12,ph:rand()*TAU});
  }
  const motes=[];
  for(let i=0;i<26;i++){
    motes.push({x:rand(),y:rand(),depth:0.3+rand()*0.7,r:0.4+rand()*1.6,ph:rand()*TAU,sp:0.03+rand()*0.09,drift:rand()*TAU});
  }
  return {seams:seams,nodes:nodes,cracks:cracks,blooms:blooms,flecks:flecks,motes:motes};
})();

export const renderPorcelain: ThemeRenderer = (ctx,w,h,t,mx,my,_deltaSeconds,motion)=>{
  const M=resolveThemeMotion(motion);
  const px=finiteClamp(mx,0,1,0.5)-0.5;
  const py=finiteClamp(my,0,1,0.5)-0.5;
  const minSide=Math.min(w,h);
  const cx=w*0.79+px*minSide*0.03;
  const top=h*0.15+py*minSide*0.02;
  const vh=Math.min(h*0.76,minSide*0.82);
  const hw=minSide*0.255;
  const baseY=top+vh;
  const activity=finiteClamp(Math.abs(M.scrollVelocity)*0.5+M.pointerSpeed*0.35,0,1,0);
  const focusAmt=M.hasFocus?1:0;
  const fgx=M.focusX*w,fgy=M.focusY*h;
  const narrow=finiteClamp((1.1-w/Math.max(1,h))/0.8,0,1,0);
  const trace=(vcx: number,vtop: number,vhw: number,vvh: number)=>{
    ctx.beginPath();
    ctx.moveTo(vcx-vhw*0.27,vtop);
    ctx.bezierCurveTo(vcx-vhw*0.29,vtop+vvh*0.08,vcx-vhw*0.67,vtop+vvh*0.12,vcx-vhw*0.82,vtop+vvh*0.27);
    ctx.bezierCurveTo(vcx-vhw*1.08,vtop+vvh*0.48,vcx-vhw*0.92,vtop+vvh*0.82,vcx-vhw*0.52,vtop+vvh*0.96);
    ctx.quadraticCurveTo(vcx,vtop+vvh*1.03,vcx+vhw*0.52,vtop+vvh*0.96);
    ctx.bezierCurveTo(vcx+vhw*0.92,vtop+vvh*0.82,vcx+vhw*1.08,vtop+vvh*0.48,vcx+vhw*0.82,vtop+vvh*0.27);
    ctx.bezierCurveTo(vcx+vhw*0.67,vtop+vvh*0.12,vcx+vhw*0.29,vtop+vvh*0.08,vcx+vhw*0.27,vtop);
    ctx.closePath();
  };
  const seamPoint=(seam: (typeof CFG.seams)[number],f: number)=>{
    const target=f*seam.total;
    let acc=0;
    for(let i=0;i<seam.segLen.length;i++){
      const l=seam.segLen[i];
      if(acc+l>=target||i===seam.segLen.length-1){
        const lf=l>0?(target-acc)/l:0;
        const a=seam.pts[i],b=seam.pts[i+1];
        return [a[0]+(b[0]-a[0])*lf,a[1]+(b[1]-a[1])*lf];
      }
      acc+=l;
    }
    return seam.pts[0];
  };

  ctx.save();

  // cool tonal atmosphere over the opaque base
  const bg=ctx.createLinearGradient(0,0,w,h);
  bg.addColorStop(0,"rgba(28,40,56,0.55)");
  bg.addColorStop(0.5,"rgba(20,30,44,0.28)");
  bg.addColorStop(1,"rgba(6,10,17,0.6)");
  ctx.fillStyle=bg;
  ctx.fillRect(0,0,w,h);

  // studio key + fill light (additive)
  ctx.globalCompositeOperation="lighter";
  softGlow(ctx,cx-hw*0.5-px*minSide*0.05,top+vh*0.26-py*minSide*0.04,vh*0.95,"rgba(150,182,210,0.16)","transparent");
  softGlow(ctx,cx+hw*0.24,top+vh*0.6,vh*0.72,"rgba(96,128,156,0.1)","transparent");
  ctx.globalCompositeOperation="source-over";

  // plinth wash
  const plinth=ctx.createLinearGradient(0,h*0.78,0,h);
  plinth.addColorStop(0,"rgba(96,120,140,0)");
  plinth.addColorStop(1,"rgba(4,8,13,0.5)");
  ctx.fillStyle=plinth;
  ctx.fillRect(w*0.4,h*0.7,w*0.6,h*0.3);

  // soft reflection of the vessel on the plinth
  ctx.save();
  ctx.globalAlpha=0.16;
  ctx.translate(0,baseY*2);
  ctx.scale(1,-1);
  trace(cx,top,hw,vh);
  ctx.clip();
  const refl=ctx.createLinearGradient(0,top,0,top+vh);
  refl.addColorStop(0,"rgba(120,150,175,0)");
  refl.addColorStop(0.55,"rgba(130,162,186,0.18)");
  refl.addColorStop(1,"rgba(168,196,214,0.55)");
  ctx.fillStyle=refl;
  ctx.fillRect(cx-hw*1.2,top,hw*2.4,vh);
  ctx.restore();

  // contact shadow beneath the vessel
  ctx.save();
  ctx.globalCompositeOperation="multiply";
  const contact=ctx.createRadialGradient(cx,baseY+vh*0.015,0,cx,baseY+vh*0.015,hw*1.2);
  contact.addColorStop(0,"rgba(2,5,9,0.6)");
  contact.addColorStop(1,"rgba(2,5,9,0)");
  ctx.fillStyle=contact;
  ctx.beginPath();
  ctx.ellipse(cx,baseY+vh*0.015,hw*1.05,vh*0.06,0,0,TAU);
  ctx.fill();
  ctx.restore();

  // vessel cast shadow (single grounding blur)
  ctx.save();
  ctx.translate(hw*0.08,vh*0.035);
  trace(cx,top,hw,vh);
  ctx.fillStyle="rgba(3,7,12,0.4)";
  ctx.shadowColor="rgba(0,0,0,0.55)";
  ctx.shadowBlur=minSide*0.05;
  ctx.fill();
  ctx.restore();

  // glazed ceramic body
  const ceramic=ctx.createLinearGradient(cx-hw,top,cx+hw,top+vh);
  ceramic.addColorStop(0,"#F2F6F6");
  ceramic.addColorStop(0.16,"#CFDDE4");
  ceramic.addColorStop(0.4,"#93AEBE");
  ceramic.addColorStop(0.58,"#6E8B9E");
  ceramic.addColorStop(0.74,"#8AA6B6");
  ceramic.addColorStop(0.88,"#D2DEE0");
  ceramic.addColorStop(1,"#5A7182");
  trace(cx,top,hw,vh);
  ctx.fillStyle=ceramic;
  ctx.fill();
  ctx.strokeStyle="rgba(233,243,245,0.4)";
  ctx.lineWidth=Math.max(1.2,minSide*0.002);
  ctx.stroke();

  // ---- inside the vessel ----
  ctx.save();
  trace(cx,top,hw,vh);
  ctx.clip();

  // cylindrical form shading + reflected rim light (rim white eased below clip)
  const form=ctx.createLinearGradient(cx-hw,top,cx+hw,top);
  form.addColorStop(0,"rgba(240,248,250,0)");
  form.addColorStop(0.28,"rgba(245,250,252,0.13)");
  form.addColorStop(0.5,"rgba(40,64,82,0.1)");
  form.addColorStop(0.72,"rgba(20,36,50,0.22)");
  form.addColorStop(1,"rgba(120,150,172,0.16)");
  ctx.fillStyle=form;
  ctx.fillRect(cx-hw*1.2,top,hw*2.4,vh);

  // celadon glaze pooling blooms (additive, breathing; brighten near focus)
  ctx.globalCompositeOperation="lighter";
  for(let i=0;i<CFG.blooms.length;i++){
    const b=CFG.blooms[i];
    const breathe=0.55+0.45*Math.sin(t*b.sp+b.ph);
    const nz=fbm(b.x*1.7+t*0.045,b.y*1.7-t*0.02,3);
    const rr=Math.max(2,hw*b.r*(0.7+0.35*breathe)*(1+nz*0.18));
    const bx=cx+b.x*hw+Math.sin(t*b.sp*0.7+b.ph)*hw*0.06;
    const by=top+b.y*vh+Math.cos(t*b.sp*0.5+b.ph*1.3)*vh*0.045;
    let fb=0;
    if(focusAmt){
      const ddx=bx-fgx,ddy=by-fgy;
      fb=Math.max(0,1-Math.sqrt(ddx*ddx+ddy*ddy)/(hw*1.15))*focusAmt;
    }
    const a=(0.045+0.05*breathe)*(1+fb*0.7);
    const g=ctx.createRadialGradient(bx,by,0,bx,by,rr);
    g.addColorStop(0,"rgba("+b.c0+","+a.toFixed(3)+")");
    g.addColorStop(0.5,"rgba("+b.c1+","+(a*0.4).toFixed(3)+")");
    g.addColorStop(1,"rgba("+b.c1+",0)");
    ctx.fillStyle=g;
    ctx.fillRect(bx-rr,by-rr,rr*2,rr*2);
  }
  ctx.globalCompositeOperation="source-over";

  // key gloss reflection (soft specular, pointer-lit; core capped below clip)
  const glossX=cx-hw*0.44-px*hw*0.15;
  const glossY=top+vh*0.26-py*vh*0.1;
  const glossCore=(0.32+focusAmt*0.05).toFixed(3);
  const gloss=ctx.createRadialGradient(glossX,glossY,0,glossX,glossY,hw*1.25);
  gloss.addColorStop(0,"rgba(250,252,248,"+glossCore+")");
  gloss.addColorStop(0.35,"rgba(228,240,246,0.14)");
  gloss.addColorStop(1,"rgba(120,150,170,0)");
  ctx.fillStyle=gloss;
  ctx.fillRect(cx-hw*1.2,top,hw*2.4,vh);

  // throwing rings (potter's-wheel ridges with light catch)
  for(let r=0;r<9;r++){
    const yy=top+vh*(0.16+r*0.085);
    const rw=hw*(0.72+0.06*Math.sin(r*1.3));
    ctx.beginPath();
    ctx.ellipse(cx,yy,rw,vh*0.05,0,0,TAU);
    ctx.strokeStyle="rgba(48,74,96,"+(0.05+0.02*(r%3)).toFixed(3)+")";
    ctx.lineWidth=Math.max(1,minSide*0.0016);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx,yy-minSide*0.0016,rw,vh*0.05,0,Math.PI*1.05,Math.PI*1.95);
    ctx.strokeStyle="rgba(226,240,246,0.05)";
    ctx.lineWidth=Math.max(1,minSide*0.0013);
    ctx.stroke();
  }

  // craquelure crack network
  ctx.lineJoin="round";
  ctx.lineCap="round";
  for(let i=0;i<CFG.cracks.length;i++){
    const cr=CFG.cracks[i];
    const shimmer=0.6+0.4*Math.sin(t*0.5+cr.ph);
    ctx.beginPath();
    for(let p=0;p<cr.pts.length;p++){
      const x=cx+cr.pts[p][0]*hw;
      const y=top+cr.pts[p][1]*vh;
      if(p===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.strokeStyle="rgba(26,38,50,"+(cr.a*(0.7+0.3*shimmer)).toFixed(3)+")";
    ctx.lineWidth=Math.max(0.5,minSide*0.0009*cr.w);
    ctx.stroke();
  }
  // relief light-catch on alternating cracks
  for(let i=0;i<CFG.cracks.length;i+=2){
    const cr=CFG.cracks[i];
    ctx.beginPath();
    for(let p=0;p<cr.pts.length;p++){
      const x=cx+cr.pts[p][0]*hw+minSide*0.0006;
      const y=top+cr.pts[p][1]*vh-minSide*0.0006;
      if(p===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.strokeStyle="rgba(232,244,248,"+(cr.a*0.5).toFixed(3)+")";
    ctx.lineWidth=Math.max(0.4,minSide*0.0006);
    ctx.stroke();
  }

  // mineral flecks in the glaze (additive twinkle; livelier on scroll)
  ctx.globalCompositeOperation="lighter";
  for(let i=0;i<CFG.flecks.length;i++){
    const f=CFG.flecks[i];
    const tw=0.4+0.6*Math.sin(t*0.9+f.ph);
    if(tw<=0.05)continue;
    const x=cx+f.x*hw;
    const y=top+f.y*vh;
    ctx.beginPath();
    ctx.arc(x,y,Math.max(0.4,f.r*(0.6+0.5*tw)),0,TAU);
    ctx.fillStyle="rgba(232,242,246,"+(f.a*tw*(0.85+activity*0.25)).toFixed(3)+")";
    ctx.fill();
  }
  ctx.globalCompositeOperation="source-over";

  // travelling gloss sweep (phase-seeded so the static frame shows a highlight; tracks scroll)
  const sweep=(0.4+t*0.03+M.storyProgress*0.3)%1;
  const sxp=cx-hw*1.1+sweep*hw*2.2;
  const sweepG=ctx.createLinearGradient(sxp-hw*0.28,top,sxp+hw*0.28,top+vh);
  sweepG.addColorStop(0,"rgba(248,251,252,0)");
  sweepG.addColorStop(0.5,"rgba(248,251,252,0.07)");
  sweepG.addColorStop(1,"rgba(248,251,252,0)");
  ctx.globalCompositeOperation="lighter";
  ctx.fillStyle=sweepG;
  ctx.fillRect(cx-hw*1.2,top,hw*2.4,vh);
  ctx.globalCompositeOperation="source-over";

  // kintsugi gold seams (always-on gold base; heal seam-by-seam with page story)
  for(let s=0;s<CFG.seams.length;s++){
    const seam=CFG.seams[s];
    const weight=storyStepWeight(M.storyProgress,s,CFG.seams.length);
    ctx.beginPath();
    for(let p=0;p<seam.pts.length;p++){
      const x=cx+seam.pts[p][0]*hw;
      const y=top+seam.pts[p][1]*vh;
      if(p===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.lineJoin="round";
    ctx.lineCap="round";
    ctx.strokeStyle="rgba(24,32,40,0.75)";
    ctx.lineWidth=Math.max(2.4,minSide*0.0052);
    ctx.stroke();
    ctx.globalCompositeOperation="lighter";
    const a=seam.pts[0],b2=seam.pts[seam.pts.length-1];
    const gg=ctx.createLinearGradient(cx+a[0]*hw,top+a[1]*vh,cx+b2[0]*hw,top+b2[1]*vh);
    gg.addColorStop(0,"rgba(150,96,40,0.85)");
    gg.addColorStop(0.5,"rgba(238,198,116,0.9)");
    gg.addColorStop(1,"rgba(196,148,70,0.85)");
    ctx.strokeStyle=gg;
    ctx.lineWidth=Math.max(2.6,minSide*0.006)*(0.92+0.16*weight);
    ctx.stroke();
    ctx.strokeStyle="rgba(255,238,200,"+(0.3+0.2*weight).toFixed(3)+")";
    ctx.lineWidth=Math.max(0.8,minSide*0.0016);
    ctx.stroke();
    const f=(t*0.12+seam.off)%1;
    const sp=seamPoint(seam,f);
    const spx=cx+sp[0]*hw,spy=top+sp[1]*vh;
    softGlow(ctx,spx,spy,minSide*0.02*(0.75+0.5*weight),"rgba(255,232,170,"+(0.42+0.4*weight).toFixed(3)+")","transparent");
    star4(ctx,spx,spy,minSide*0.018*(0.7+0.5*weight),minSide*0.003,"rgba(255,244,210,"+(0.5+0.35*weight).toFixed(3)+")");
    ctx.globalCompositeOperation="source-over";
  }

  // gold-leaf sparkle at seam nodes (reinforces the healing seam)
  ctx.globalCompositeOperation="lighter";
  for(let i=0;i<CFG.nodes.length;i++){
    const nd=CFG.nodes[i];
    const tw=Math.sin(t*1.3+nd.ph);
    if(tw<=0.35)continue;
    const nw=storyStepWeight(M.storyProgress,nd.seam,CFG.seams.length);
    const x=cx+nd.x*hw,y=top+nd.y*vh;
    star4(ctx,x,y,minSide*0.014*tw,minSide*0.0022*tw,"rgba(255,236,186,"+((0.55+0.3*nw)*tw*(1+activity*0.2)).toFixed(3)+")");
  }
  ctx.globalCompositeOperation="source-over";

  ctx.restore();

  // vessel mouth rim (white catch eased below clip)
  ctx.beginPath();
  ctx.ellipse(cx,top+vh*0.01,hw*0.28,vh*0.027,0,0,TAU);
  ctx.strokeStyle="rgba(252,254,248,0.5)";
  ctx.lineWidth=Math.max(1,minSide*0.002);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx,top+vh*0.016,hw*0.24,vh*0.02,0,0,TAU);
  ctx.strokeStyle="rgba(30,48,62,0.5)";
  ctx.lineWidth=Math.max(1,minSide*0.0016);
  ctx.stroke();

  // faint focus thread from the focused resume item to the vessel (motion only)
  if(M.hasFocus){
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(fgx,fgy);
    ctx.quadraticCurveTo(w*0.61,fgy,cx-hw*0.74,top+vh*0.56);
    ctx.strokeStyle="rgba(238,196,110,0.16)";
    ctx.lineWidth=Math.max(1,minSide*0.0016);
    ctx.stroke();
    ctx.restore();
  }

  // floating porcelain dust (parallax, additive; kept off the reading column)
  ctx.globalCompositeOperation="lighter";
  for(let i=0;i<CFG.motes.length;i++){
    const m=CFG.motes[i];
    const drift=t*m.sp;
    let mxp=(m.x+Math.sin(drift+m.drift)*0.03-px*0.06*m.depth)%1;
    if(mxp<0)mxp+=1;
    let myp=(m.y-drift*0.02+Math.cos(drift*0.8+m.drift)*0.02-py*0.06*m.depth)%1;
    if(myp<0)myp+=1;
    const dxp=mxp*w,dyp=myp*h;
    const tw=0.4+0.6*Math.sin(t*0.7+m.ph);
    const fade=Math.min(1,(mxp-0.4)*2.8);
    if(fade<=0.01)continue;
    const alpha=(0.06+0.08*tw)*m.depth*fade;
    if(alpha<=0.01)continue;
    const rad=minSide*(0.004+m.r*0.004)*(0.6+m.depth)*(0.7+0.5*tw);
    softGlow(ctx,dxp,dyp,rad,"rgba(200,220,238,"+alpha.toFixed(3)+")","transparent");
  }
  ctx.globalCompositeOperation="source-over";

  // clear reading space on the left (stronger + wider on narrow viewports)
  const scrimEnd=w*(0.66+narrow*0.1);
  const clear=ctx.createLinearGradient(0,0,scrimEnd,0);
  clear.addColorStop(0,"rgba(15,22,31,"+(0.82+narrow*0.1).toFixed(3)+")");
  clear.addColorStop(0.6,"rgba(15,22,31,"+(0.46+narrow*0.16).toFixed(3)+")");
  clear.addColorStop(1,"rgba(15,22,31,0)");
  ctx.fillStyle=clear;
  ctx.fillRect(0,0,scrimEnd,h);

  // vignette
  const vig=ctx.createRadialGradient(cx,top+vh*0.45,minSide*0.14,w*0.56,h*0.5,Math.max(w,h)*0.82);
  vig.addColorStop(0,"rgba(0,0,0,0)");
  vig.addColorStop(1,"rgba(0,0,0,0.34)");
  ctx.fillStyle=vig;
  ctx.fillRect(0,0,w,h);

  // cool color grade wash
  ctx.globalCompositeOperation="lighter";
  const grade=ctx.createLinearGradient(0,0,0,h);
  grade.addColorStop(0,"rgba(40,58,80,0.06)");
  grade.addColorStop(1,"rgba(10,16,26,0)");
  ctx.fillStyle=grade;
  ctx.fillRect(0,0,w,h);
  ctx.globalCompositeOperation="source-over";

  ctx.restore();
};
