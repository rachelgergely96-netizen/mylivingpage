import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { finiteClamp, resolveThemeMotion, storyStepWeight } from "../shared/motion";
import { softGlow } from "../shared/draw";
import { wrapSoft } from "../shared/wrap";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

interface AtelierGradientCache {
  ctx: CanvasRenderingContext2D | null;
  w: number;
  h: number;
  grade: CanvasGradient | null;
  vignette: CanvasGradient | null;
  textWash: CanvasGradient | null;
}

const CFG=(function(){
  const rnd=createSeededRandom(20713);
  const R=function(){return rnd();};
  const INKS=[
    {hex:"#C0472F",rgb:[192,71,47],x:0.545,y:0.135,w:0.35,h:0.26,rot:-0.075,screen:75,label:"01 / MAGENTA"},
    {hex:"#2F5E9E",rgb:[47,94,158],x:0.625,y:0.325,w:0.30,h:0.34,rot:0.05,screen:15,label:"02 / CYAN"},
    {hex:"#C7982E",rgb:[199,152,46],x:0.50,y:0.575,w:0.42,h:0.235,rot:-0.03,screen:45,label:"03 / YELLOW"}
  ];
  // Precompute the offset line-screen noise once (was ~150-200 fbm() calls PER FRAME).
  const screenNoise=[];
  for(let idx=0;idx<INKS.length;idx++){
    const arr=[];
    for(let k=0;k<320;k++){arr.push(fbm(k*0.3+idx*3,idx*2.3,2));}
    screenNoise.push(arr);
  }
  const fibres=[];
  for(let i=0;i<118;i++){
    const x=R(),y=R();
    fibres.push({x:x,y:y,len:3+R()*15,ang:(R()-0.5)*0.5+fbm(x*4,y*4,3)*0.5,dark:R()<0.34});
  }
  const specks=[];
  for(let i=0;i<70;i++){
    const x=R(),y=R();
    specks.push({x:x,y:y,s:0.6+R()*1.6,tone:fbm(x*7+3,y*7-2,3),ang:R()*TAU});
  }
  const stains=[];
  for(let i=0;i<6;i++){
    stains.push({x:R(),y:R(),r:0.05+R()*0.11,phase:R()*TAU,hue:R()});
  }
  const motes=[];
  for(let i=0;i<30;i++){
    motes.push({x:R(),y:R(),s:0.6+R()*2.0,phase:R()*TAU,speed:0.2+R()*0.7,depth:0.3+R()*0.7,bright:R()<0.24,ang:R()*TAU});
  }
  const plates=[];
  for(let i=0;i<5;i++){
    // Numbered project plates kept to x>0.62 so their dark glyphs clear the left reading column.
    plates.push({x:0.64+R()*0.32,y:0.12+R()*0.74,s:0.045+R()*0.045,rot:(R()-0.5)*0.24,num:i+1,kind:Math.floor(R()*3),tint:R()<0.5});
  }
  const swatches=["#C0472F","#2F5E9E","#C7982E","#7A8B6F","#2A2622","#E8DFCF"];
  const drawCrop=function(c:CanvasRenderingContext2D,x:number,y:number,dx:number,dy:number,len:number){
    c.beginPath();
    c.moveTo(x+dx*len*0.3,y);c.lineTo(x+dx*len,y);
    c.moveTo(x,y+dy*len*0.3);c.lineTo(x,y+dy*len);
    c.stroke();
  };
  const cache: AtelierGradientCache={ctx:null,w:-1,h:-1,grade:null,vignette:null,textWash:null};
  return {INKS:INKS,screenNoise:screenNoise,fibres:fibres,specks:specks,stains:stains,motes:motes,plates:plates,swatches:swatches,drawCrop:drawCrop,cache:cache};
})();

export const renderAtelier: ThemeRenderer = (ctx,w,h,t,mx,my,_deltaSeconds,motion)=>{
  const cfg=CFG;
  const M=resolveThemeMotion(motion);
  const reduced=!!(motion&&motion.reducedMotion);
  const T=finiteClamp(t,0,1000000);
  const mxc=finiteClamp(mx,0,1), myc=finiteClamp(my,0,1);
  const mn=Math.max(1,Math.min(w,h));
  const margin=Math.max(18,mn*0.045);
  const gridStart=w*0.46;

  // Page motion — all 0/safe when motion is undefined (rest / preview).
  const story=M.storyProgress;
  const storyOn=Math.min(1,story*6);              // 0 at rest -> plate emphasis stays neutral
  const hasFocus=M.hasFocus&&!reduced;
  const focusX=M.focusX, focusY=M.focusY;
  const impulse=reduced?0:M.interactionImpulse;
  const settle=1-impulse*0.7;
  const sVel=reduced?0:M.scrollVelocity;
  const vel=reduced?0:finiteClamp(Math.abs(M.scrollVelocity)*0.35+M.pointerSpeed*0.35+M.interactionImpulse*0.5,0,1.4,0);

  // Focus-aware pointer aim (identical to raw pointer at rest).
  const aimX=hasFocus?mxc*0.3+focusX*0.7:mxc;
  const aimY=hasFocus?myc*0.3+focusY*0.7:myc;
  const px=aimX-0.5, py=aimY-0.5;

  // Cache the position-only gradients; rebuild only on resize or ctx swap.
  if(cfg.cache.ctx!==ctx||cfg.cache.w!==w||cfg.cache.h!==h){
    cfg.cache.ctx=ctx; cfg.cache.w=w; cfg.cache.h=h;
    const gg=ctx.createLinearGradient(0,0,w,h);
    gg.addColorStop(0,"rgba(248,242,228,0.55)");
    gg.addColorStop(0.5,"rgba(232,223,207,0)");
    gg.addColorStop(1,"rgba(150,130,102,0.34)");
    cfg.cache.grade=gg;
    const vg=ctx.createRadialGradient(w*0.52,h*0.42,mn*0.2,w*0.52,h*0.42,Math.max(w,h)*0.78);
    vg.addColorStop(0,"rgba(40,32,24,0)");
    vg.addColorStop(0.7,"rgba(40,32,24,0.05)");
    vg.addColorStop(1,"rgba(34,26,20,0.3)");
    cfg.cache.vignette=vg;
    const tw=ctx.createLinearGradient(0,0,w*0.66,0);
    tw.addColorStop(0,"rgba(240,233,219,0.90)");
    tw.addColorStop(0.7,"rgba(240,233,219,0.58)");
    tw.addColorStop(1,"rgba(240,233,219,0)");
    cfg.cache.textWash=tw;
  }

  // Warm paper grade over the pre-painted background.
  ctx.fillStyle=cfg.cache.grade!;
  ctx.fillRect(0,0,w,h);

  // Soft studio lamp — dimmed + tighter so the bright-pass bloom can't blow it to white; steers toward focus.
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  let lampx=w*(0.7+px*0.05)+Math.sin(T*0.05)*w*0.02;
  let lampy=h*(0.16+py*0.03);
  if(hasFocus){lampx+=(focusX*w-lampx)*0.4;lampy+=(focusY*h-lampy)*0.4;}
  softGlow(ctx,lampx,lampy,mn*0.6,"rgba(255,240,214,0.11)","transparent");
  ctx.restore();

  // Paper fibres.
  ctx.save();
  ctx.lineWidth=Math.max(0.5,mn*0.0007);
  for(let i=0;i<cfg.fibres.length;i++){
    const f=cfg.fibres[i];
    const x=f.x*w, y=f.y*h;
    ctx.strokeStyle=f.dark?"rgba(60,48,38,0.06)":"rgba(255,251,238,0.13)";
    ctx.beginPath();
    ctx.moveTo(x,y);
    ctx.lineTo(x+Math.cos(f.ang)*f.len,y+Math.sin(f.ang)*f.len);
    ctx.stroke();
  }
  ctx.restore();

  // Grain flecks.
  ctx.save();
  ctx.globalCompositeOperation="multiply";
  for(let i=0;i<cfg.specks.length;i++){
    const s=cfg.specks[i];
    const a=0.05+Math.max(0,s.tone)*0.10;
    const sz=s.s*(0.5+mn*0.001);
    const cx=s.x*w, cy=s.y*h;
    ctx.strokeStyle="rgba(70,54,40,"+a.toFixed(3)+")";
    ctx.lineWidth=Math.max(0.5,sz*0.5);
    ctx.beginPath();
    ctx.moveTo(cx-Math.cos(s.ang)*sz,cy-Math.sin(s.ang)*sz);
    ctx.lineTo(cx+Math.cos(s.ang)*sz,cy+Math.sin(s.ang)*sz);
    ctx.stroke();
  }
  ctx.restore();

  // Aged foxing washes — fewer soft stains (9 -> 6) to cut radial-gradient allocations.
  ctx.save();
  ctx.globalCompositeOperation="multiply";
  for(let i=0;i<cfg.stains.length;i++){
    const s=cfg.stains[i];
    const breath=0.5+0.5*Math.sin(T*0.06+s.phase);
    const r=s.r*mn*(0.9+breath*0.25);
    const a=0.045+breath*0.05;
    const col=s.hue<0.5?"rgba(150,110,70,"+a.toFixed(3)+")":"rgba(120,95,72,"+a.toFixed(3)+")";
    softGlow(ctx,s.x*w,s.y*h,r,col,"transparent");
  }
  ctx.restore();

  // Gentle raking light sweep — dimmed for the light ground; storyProgress shifts the lit spread; velocity lifts it a touch.
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  const cRaw=0.5+0.42*Math.sin(T*0.07)+story*0.28;
  const c=finiteClamp(cRaw,0.06,0.94,0.5);
  const sweep=ctx.createLinearGradient(0,0,w,h);
  const c0=Math.max(0.001,c-0.16), c1=Math.min(0.999,c+0.16);
  const sweepA=(0.05+vel*0.015).toFixed(3);
  sweep.addColorStop(0,"rgba(255,248,230,0)");
  sweep.addColorStop(c0,"rgba(255,248,230,0)");
  sweep.addColorStop(c,"rgba(255,249,232,"+sweepA+")");
  sweep.addColorStop(c1,"rgba(255,248,230,0)");
  sweep.addColorStop(1,"rgba(255,248,230,0)");
  ctx.fillStyle=sweep;
  ctx.fillRect(0,0,w,h);
  ctx.restore();

  // Baseline grid on the art side.
  ctx.save();
  ctx.strokeStyle="rgba(40,34,28,0.06)";
  ctx.lineWidth=1;
  const stepX=Math.max(26,w*0.042), stepY=Math.max(26,h*0.052);
  for(let x=gridStart;x<=w-margin;x+=stepX){ctx.beginPath();ctx.moveTo(x,margin);ctx.lineTo(x,h-margin);ctx.stroke();}
  for(let y=margin;y<=h-margin;y+=stepY){ctx.beginPath();ctx.moveTo(gridStart,y);ctx.lineTo(w-margin,y);ctx.stroke();}
  ctx.restore();

  // Printer's ruler ticks.
  ctx.save();
  ctx.strokeStyle="rgba(42,38,34,0.45)";
  ctx.lineWidth=1;
  const tick=Math.max(20,w*0.02), tickY=Math.max(20,h*0.026);
  let n=0;
  for(let x=margin;x<=w-margin;x+=tick){
    const major=(n%5===0);
    ctx.beginPath();ctx.moveTo(x,margin);ctx.lineTo(x,margin+(major?mn*0.016:mn*0.008));ctx.stroke();
    n++;
  }
  n=0;
  for(let y=margin;y<=h-margin;y+=tickY){
    const major=(n%5===0);
    ctx.beginPath();ctx.moveTo(gridStart,y);ctx.lineTo(gridStart+(major?mn*0.016:mn*0.008),y);ctx.stroke();
    n++;
  }
  ctx.restore();

  // Ruler cursor — only when there is real pointer/focus input, so the frozen centred frame stays clean.
  const showCursor=hasFocus||Math.abs(mxc-0.5)>0.015||Math.abs(myc-0.5)>0.015;
  if(showCursor){
    ctx.save();
    const cursorX=hasFocus?margin+focusX*(w-2*margin):margin+mxc*(w-2*margin);
    ctx.strokeStyle="rgba(192,71,47,0.6)";
    ctx.lineWidth=1.4;
    ctx.beginPath();ctx.moveTo(cursorX,margin-2);ctx.lineTo(cursorX,margin+mn*0.024);ctx.stroke();
    ctx.fillStyle="rgba(192,71,47,0.55)";
    ctx.beginPath();ctx.moveTo(cursorX,margin+mn*0.028);ctx.lineTo(cursorX-4,margin+mn*0.014);ctx.lineTo(cursorX+4,margin+mn*0.014);ctx.closePath();ctx.fill();
    ctx.restore();
  }

  // Page frame (double rule).
  ctx.save();
  ctx.strokeStyle="rgba(30,26,30,0.28)";
  ctx.lineWidth=1;
  ctx.strokeRect(margin+0.5,margin+0.5,w-2*margin-1,h-2*margin-1);
  ctx.strokeStyle="rgba(30,26,30,0.12)";
  ctx.strokeRect(margin+5.5,margin+5.5,w-2*margin-11,h-2*margin-11);
  ctx.restore();

  // ---- offset-ink color plates ----
  const drawPlate=function(idx:number){
    const p=cfg.INKS[idx];
    const pw=w*p.w, ph=h*p.h;
    const emph=storyOn>0?storyStepWeight(story,idx,cfg.INKS.length)*storyOn:0; // 0 at rest
    const driftX=px*(5+idx*2.4)*settle+Math.sin(T*0.08+idx*1.7)*2.2;
    const driftY=py*(4+idx*1.6)*settle+Math.cos(T*0.07+idx*1.2)*1.8;
    const cx=w*p.x+pw*0.5+driftX;
    const cy=h*p.y+ph*0.5+driftY;
    const rot=p.rot+Math.sin(T*0.05+idx)*0.006;
    const r=p.rgb[0], g2=p.rgb[1], b=p.rgb[2];

    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate(rot);

    // Flat ink field (+subtle emphasis on the active spread).
    ctx.globalCompositeOperation="multiply";
    ctx.globalAlpha=0.16+emph*0.06;
    ctx.fillStyle=p.hex;
    ctx.fillRect(-pw*0.5,-ph*0.5,pw,ph);

    // Offset LINE-screen — noise precomputed in setup; only the sin wave is per-frame.
    ctx.save();
    ctx.beginPath();
    ctx.rect(-pw*0.5,-ph*0.5,pw,ph);
    ctx.clip();
    ctx.rotate(p.screen*Math.PI/180);
    ctx.strokeStyle=p.hex;
    ctx.lineCap="butt";
    const diag=Math.sqrt(pw*pw+ph*ph);
    const gap=Math.max(3.5,mn*0.011);
    const noiseArr=cfg.screenNoise[idx];
    const nLen=noiseArr.length;
    let k=0;
    for(let g=-diag*0.5; g<=diag*0.5; g+=gap){
      const nz=noiseArr[k<nLen?k:nLen-1];
      const wave=0.5+0.5*Math.sin(T*0.35+k*0.35+idx);
      const dens=0.3+Math.max(0,nz)*0.55+wave*0.15;
      ctx.globalAlpha=0.05+Math.min(0.85,dens)*0.14;
      ctx.lineWidth=Math.max(0.6,gap*(0.14+dens*0.4));
      ctx.beginPath();
      ctx.moveTo(g,-diag*0.5);
      ctx.lineTo(g,diag*0.5);
      ctx.stroke();
      k++;
    }
    ctx.restore();

    // Misregistration offset strokes — amplitude (never frequency) grows with velocity, so no phase jumps.
    const mis=(1.4+Math.sin(T*0.6+idx*2)*1.1)*(1+vel*0.5);
    ctx.globalCompositeOperation="multiply";
    ctx.lineWidth=Math.max(1,mn*0.001);
    ctx.globalAlpha=0.22;
    ctx.strokeStyle=p.hex;
    ctx.strokeRect(-pw*0.5+mis,-ph*0.5-mis,pw,ph);
    ctx.globalAlpha=0.13;
    ctx.strokeStyle="rgb("+r+","+g2+","+b+")";
    ctx.strokeRect(-pw*0.5-mis,-ph*0.5+mis,pw,ph);

    // Soft ink bloom — dimmed round glow (light-ground bloom safety); tiny story lift.
    ctx.globalCompositeOperation="lighter";
    ctx.globalAlpha=1;
    softGlow(ctx,-pw*0.18,-ph*0.2,Math.max(pw,ph)*0.5,"rgba("+Math.min(255,r+60)+","+Math.min(255,g2+50)+","+Math.min(255,b+40)+","+(0.05+emph*0.03).toFixed(3)+")","transparent");

    // Crop marks + plate label (label kept clear of the left reading column, x>=0.62w).
    ctx.globalCompositeOperation="source-over";
    ctx.globalAlpha=0.75;
    ctx.strokeStyle="rgba(42,38,34,0.7)";
    ctx.lineWidth=1;
    cfg.drawCrop(ctx,-pw*0.5-6,-ph*0.5-6,-1,-1,13);
    cfg.drawCrop(ctx,pw*0.5+6,-ph*0.5-6,1,-1,13);
    cfg.drawCrop(ctx,-pw*0.5-6,ph*0.5+6,-1,1,13);
    cfg.drawCrop(ctx,pw*0.5+6,ph*0.5+6,1,1,13);

    ctx.globalAlpha=0.82;
    ctx.fillStyle="rgba(42,38,34,0.9)";
    ctx.font=(Math.max(9,mn*0.014)|0)+"px 'Courier New',monospace";
    const labelLX=Math.max(-pw*0.5,0.62*w-cx);
    ctx.fillText(p.label,labelLX,ph*0.5+Math.max(14,mn*0.026));

    ctx.restore();
  };
  for(let i=0;i<cfg.INKS.length;i++) drawPlate(i);

  // Soft ink shimmer over each plate — dimmed round bloom; emphasis-aware.
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  for(let i=0;i<cfg.INKS.length;i++){
    const p=cfg.INKS[i];
    const pw=w*p.w, ph=h*p.h;
    const bx=w*p.x+pw*(0.2+0.6*((i*0.37)%1));
    const by=h*p.y+ph*0.32;
    const tw=0.5+0.5*Math.sin(T*0.8+i*2.1);
    const emph=storyOn>0?storyStepWeight(story,i,cfg.INKS.length)*storyOn:0;
    const r=p.rgb[0], g2=p.rgb[1], b=p.rgb[2];
    ctx.globalAlpha=1;
    softGlow(ctx,bx,by,mn*(0.04+tw*0.04),"rgba("+Math.min(255,r+80)+","+Math.min(255,g2+70)+","+Math.min(255,b+60)+","+(0.03+tw*0.035+emph*0.03).toFixed(3)+")","transparent");
  }
  ctx.restore();

  // Numbered project plates (non-circular glyphs; positioned x>0.62 in setup).
  ctx.save();
  for(let i=0;i<cfg.plates.length;i++){
    const p=cfg.plates[i];
    const s=p.s*mn;
    const cx=p.x*w+px*(3+i)*0.6;
    const cy=p.y*h+py*(3+i)*0.6;
    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate(p.rot+Math.sin(T*0.06+i)*0.01);
    ctx.globalAlpha=0.5;
    ctx.fillStyle="rgba(250,244,230,0.5)";
    ctx.fillRect(-s*0.7,-s*0.55,s*1.4,s*1.1);
    ctx.globalAlpha=0.7;
    ctx.strokeStyle="rgba(42,38,34,0.55)";
    ctx.lineWidth=1;
    ctx.strokeRect(-s*0.7,-s*0.55,s*1.4,s*1.1);
    ctx.globalAlpha=0.5;
    ctx.fillStyle=p.tint?"rgba(192,71,47,0.5)":"rgba(47,94,158,0.42)";
    if(p.kind===0){
      ctx.fillRect(-s*0.42,-s*0.24,s*0.84,s*0.13);
      ctx.fillRect(-s*0.42,s*0.02,s*0.55,s*0.13);
    }else if(p.kind===1){
      ctx.fillRect(-s*0.4,-s*0.28,s*0.8,s*0.5);
    }else{
      ctx.beginPath();ctx.moveTo(-s*0.4,s*0.2);ctx.lineTo(0,-s*0.3);ctx.lineTo(s*0.4,s*0.2);ctx.closePath();ctx.fill();
    }
    ctx.globalAlpha=0.85;
    ctx.fillStyle="rgba(42,38,34,0.9)";
    ctx.font=(Math.max(7,s*0.22)|0)+"px 'Courier New',monospace";
    ctx.fillText(("0"+p.num).slice(-2),-s*0.66,s*0.5);
    ctx.restore();
  }
  ctx.restore();

  // Proof registration crop-brackets (L-marks only).
  ctx.save();
  ctx.strokeStyle="rgba(42,38,34,0.42)";
  ctx.lineWidth=1;
  cfg.drawCrop(ctx,w*0.905,h*0.12,-1,-1,mn*0.02);
  cfg.drawCrop(ctx,w*0.5,h*0.87,1,-1,mn*0.016);
  cfg.drawCrop(ctx,w*0.965,h*0.6,1,1,mn*0.014);
  ctx.restore();

  // Page-corner crop marks.
  ctx.save();
  ctx.strokeStyle="rgba(30,26,22,0.6)";
  ctx.lineWidth=1.2;
  cfg.drawCrop(ctx,margin,margin,-1,-1,15);
  cfg.drawCrop(ctx,w-margin,margin,1,-1,15);
  cfg.drawCrop(ctx,margin,h-margin,-1,1,15);
  cfg.drawCrop(ctx,w-margin,h-margin,1,1,15);
  ctx.restore();

  // Ink swatch strip.
  ctx.save();
  const sw=Math.max(8,mn*0.02);
  for(let i=0;i<cfg.swatches.length;i++){
    const sx=w-margin-sw*(cfg.swatches.length-i);
    const sy=h-margin-sw*1.3;
    ctx.fillStyle=cfg.swatches[i];
    ctx.fillRect(sx,sy,sw-1.5,sw);
    ctx.strokeStyle="rgba(30,26,22,0.4)";
    ctx.lineWidth=0.75;
    ctx.strokeRect(sx+0.5,sy+0.5,sw-1.5,sw-1);
  }
  ctx.restore();

  // Floating dust motes (dark = grain strokes, bright = capped soft glow). Velocity nudges drift/twinkle only.
  ctx.save();
  for(let i=0;i<cfg.motes.length;i++){
    const m=cfg.motes[i];
    const drift=T*m.speed*0.012;
    // Soft-wrap intrinsic drift only; parallax/scroll offsets applied after so the seam never moves with the pointer.
    const wx=wrapSoft(m.x+Math.sin(T*0.1+m.phase)*0.01,1,0.05);
    const wy=wrapSoft(m.y-drift,1,0.05);
    const xx=wx.u+px*0.03*m.depth;
    const yy=wy.u+py*0.03*m.depth-sVel*0.012*m.depth;
    const tw=0.4+0.6*Math.sin(T*1.1+m.phase);
    const a=(0.1+Math.max(0,tw)*0.22)*m.depth*(1+vel*0.3)*wx.alpha*wy.alpha;
    const sz=m.s*(0.5+m.depth*0.7);
    if(m.bright){
      ctx.globalCompositeOperation="lighter";
      ctx.globalAlpha=1;
      softGlow(ctx,xx*w,yy*h,sz*4,"rgba(255,240,214,"+Math.min(0.28,a).toFixed(3)+")","transparent");
      ctx.globalCompositeOperation="source-over";
    }else{
      ctx.globalAlpha=a;
      ctx.strokeStyle="rgba(90,72,54,0.85)";
      ctx.lineWidth=Math.max(0.5,sz*0.6);
      ctx.beginPath();
      ctx.moveTo(xx*w-Math.cos(m.ang)*sz,yy*h-Math.sin(m.ang)*sz);
      ctx.lineTo(xx*w+Math.cos(m.ang)*sz,yy*h+Math.sin(m.ang)*sz);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Vignette (cached gradient).
  ctx.save();
  ctx.fillStyle=cfg.cache.vignette!;
  ctx.fillRect(0,0,w,h);
  ctx.restore();

  // Focus registration bracket + dashed leader — motion only, absent at rest. L-marks, no crosses/rays.
  if(hasFocus){
    const fx=focusX*w, fy=focusY*h;
    const fs=Math.max(10,mn*0.02)*(1-impulse*0.4);
    ctx.save();
    ctx.strokeStyle="rgba(47,94,158,0.5)";
    ctx.lineWidth=1;
    ctx.setLineDash([3,5]);
    ctx.beginPath();ctx.moveTo(gridStart,fy);ctx.lineTo(fx,fy);ctx.stroke();
    ctx.setLineDash([]);
    cfg.drawCrop(ctx,fx-fs,fy-fs,1,1,fs*0.6);
    cfg.drawCrop(ctx,fx+fs,fy-fs,-1,1,fs*0.6);
    cfg.drawCrop(ctx,fx-fs,fy+fs,1,-1,fs*0.6);
    cfg.drawCrop(ctx,fx+fs,fy+fs,-1,-1,fs*0.6);
    ctx.restore();
  }

  // Protective text wash on the left semantic zone (cached; widened to 0.66w).
  ctx.fillStyle=cfg.cache.textWash!;
  ctx.fillRect(0,0,w*0.68,h);
};
