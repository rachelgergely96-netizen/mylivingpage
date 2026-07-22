import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { finiteClamp, resolveThemeMotion, storyStepWeight } from "../shared/motion";
import { softGlow, star4 } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

interface JetstreamGradientCache {
  w: number;
  h: number;
  sky: CanvasGradient | null;
  hb: CanvasGradient | null;
  clear: CanvasGradient | null;
  vig: CanvasGradient | null;
  bhz: CanvasGradient | null;
}

const CFG=(function(){
  const rnd=createSeededRandom(70714);
  const stars=[];
  const depths=[0.2,0.5,1.0];
  const counts=[32,26,18];
  for(let L=0;L<3;L++){
    for(let i=0;i<counts[L];i++){
      stars.push({
        x:rnd(),
        y:rnd()*0.72,
        depth:depths[L],
        r:(0.4+rnd()*1.1)*(0.7+L*0.3),
        phase:rnd()*TAU,
        tw:0.5+rnd()*1.7,
        bright:rnd()
      });
    }
  }
  const clouds=[];
  for(let i=0;i<6;i++){
    clouds.push({
      bx:0.42+rnd()*0.6,
      by:0.54+rnd()*0.3,
      r:0.09+rnd()*0.12,
      drift:0.02+rnd()*0.04,
      phase:rnd()*TAU,
      a:0.05+rnd()*0.06,
      squish:0.32+rnd()*0.18
    });
  }
  const ribbons=[];
  const rc=6;
  for(let i=0;i<rc;i++){
    const u=i/(rc-1);
    ribbons.push({
      startY:0.82-u*0.14,
      endY:0.15+u*0.5,
      width:0.03-u*0.013,
      lift:0.17-u*0.1,
      speed:0.08+rnd()*0.06,
      phase:rnd()*TAU,
      amp:0.018+rnd()*0.022,
      bright:0.5+u*0.5
    });
  }
  const streaks=[];
  for(let i=0;i<48;i++){
    streaks.push({
      lane:rnd(),
      y0:0.15+rnd()*0.62,
      speed:0.05+rnd()*0.2,
      seed:rnd(),
      len:0.02+rnd()*0.05,
      rise:0.02+rnd()*0.06,
      wob:rnd()*TAU,
      thick:0.5+rnd()*1.5,
      bright:0.4+rnd()*0.6
    });
  }
  return {stars:stars,clouds:clouds,ribbons:ribbons,streaks:streaks};
})();
// Reused across frames: static full-screen grade gradients, rebuilt only on resize.
const GCACHE: JetstreamGradientCache={w:-1,h:-1,sky:null,hb:null,clear:null,vig:null,bhz:null};

export const renderJetstream: ThemeRenderer = (ctx,w,h,t,mx,my,_deltaSeconds,motion)=>{
  const S=CFG;
  const M=resolveThemeMotion(motion);
  const minSide=Math.min(w,h);
  const maxSide=Math.max(w,h);
  const px=mx-0.5, py=my-0.5;
  const PI=Math.PI;
  const story=finiteClamp(M.storyProgress,0,1);
  const vel=finiteClamp(M.scrollVelocity/3,-1,1);
  const avel=Math.abs(vel);
  const pspeed=finiteClamp(M.pointerSpeed/2,0,1);
  const sunX=w*0.82+px*w*0.03;
  const sunY=h*0.15+py*h*0.03;

  // Cache the static, non-animated grade gradients; rebuild only when the
  // device surface changes size (avoids ~5 full-screen gradient allocs/frame).
  if(GCACHE.w!==w||GCACHE.h!==h){
    const sky=ctx.createLinearGradient(0,0,w*0.18,h);
    sky.addColorStop(0,"rgba(11,30,48,0.55)");
    sky.addColorStop(0.4,"rgba(14,37,56,0.28)");
    sky.addColorStop(0.7,"rgba(16,40,58,0.40)");
    sky.addColorStop(1,"rgba(3,8,14,0.66)");
    GCACHE.sky=sky;
    const hbY=h*0.66;
    const hb=ctx.createLinearGradient(0,hbY-h*0.3,0,hbY+h*0.24);
    hb.addColorStop(0,"rgba(120,180,220,0)");
    hb.addColorStop(0.5,"rgba(132,192,230,0.10)");
    hb.addColorStop(1,"rgba(28,58,82,0)");
    GCACHE.hb=hb;
    const clear=ctx.createLinearGradient(0,0,w*0.66,0);
    clear.addColorStop(0,"rgba(2,6,12,0.72)");
    clear.addColorStop(0.62,"rgba(2,6,12,0.30)");
    clear.addColorStop(1,"rgba(2,6,12,0)");
    GCACHE.clear=clear;
    const vig=ctx.createRadialGradient(w*0.72,h*0.42,minSide*0.16,w*0.6,h*0.5,maxSide*0.82);
    vig.addColorStop(0,"rgba(0,0,0,0)");
    vig.addColorStop(1,"rgba(1,4,9,0.5)");
    GCACHE.vig=vig;
    const bhz=ctx.createLinearGradient(0,h*0.7,0,h);
    bhz.addColorStop(0,"rgba(4,12,22,0)");
    bhz.addColorStop(1,"rgba(4,11,20,0.5)");
    GCACHE.bhz=bhz;
    GCACHE.w=w; GCACHE.h=h;
  }
  const { sky, hb, clear, vig, bhz }=GCACHE;
  if(!sky || !hb || !clear || !vig || !bhz) return;

  ctx.save();
  ctx.lineCap="round";
  ctx.lineJoin="round";

  // ---- sky colour grade wash (cached) ----
  ctx.fillStyle=sky;
  ctx.fillRect(0,0,w,h);
  ctx.fillStyle=hb;
  ctx.fillRect(0,h*0.34,w,h*0.6);

  // ---- high-altitude light + drifting aurora haze (additive) ----
  ctx.globalCompositeOperation="lighter";
  softGlow(ctx,sunX,sunY,minSide*0.82,"rgba(120,180,235,0.08)","transparent");
  softGlow(ctx,sunX,sunY,minSide*0.30,"rgba(186,224,252,0.13)","transparent");
  softGlow(ctx,sunX,sunY,minSide*0.12,"rgba(214,238,255,0.16)","transparent");
  for(let i=0;i<2;i++){
    const yy=h*(0.18+i*0.16)+Math.sin(t*0.05+i*1.3)*h*0.02;
    const cx=w*(0.56+Math.sin(t*0.028+i*1.7)*0.15);
    ctx.save();
    ctx.translate(cx,yy);
    ctx.scale(1,0.22);
    softGlow(ctx,0,0,w*0.42,"rgba(96,160,215,"+(0.05+i*0.012).toFixed(3)+")","transparent");
    ctx.restore();
  }
  // motion: gentle soft glow warms toward the focused item (round glow only)
  if(M.hasFocus){
    const impulse=finiteClamp(M.interactionImpulse,0,1);
    const fx=finiteClamp(M.focusX,0,1,0.5)*w;
    const fy=finiteClamp(M.focusY,0,1,0.5)*h;
    softGlow(ctx,fx,fy,minSide*(0.10+impulse*0.07),"rgba(176,216,250,"+(0.05+impulse*0.10).toFixed(3)+")","transparent");
  }

  // ---- parallax ice-crystal star field (additive, masked out of reading lane) ----
  for(let i=0;i<S.stars.length;i++){
    const st=S.stars[i];
    const sx=st.x*w-px*w*0.05*st.depth;
    const lane=finiteClamp((sx/w-0.30)/0.17,0,1);
    if(lane<=0) continue;
    const sy=st.y*h+py*h*0.035*st.depth;
    const tw=0.4+0.6*Math.sin(t*st.tw+st.phase);
    const a=(0.14+0.42*tw)*(0.35+st.depth*0.65)*lane;
    const r=st.r*(0.8+tw*0.5);
    ctx.beginPath();
    ctx.arc(sx,sy,r,0,TAU);
    ctx.fillStyle="rgba(206,230,252,"+a.toFixed(3)+")";
    ctx.fill();
    if(st.bright>0.93){
      star4(ctx,sx,sy,r*(5+tw*4),r*0.6,"rgba(202,230,252,"+(a*0.5).toFixed(3)+")");
    }
  }

  // ---- rim-lit volumetric cloud banks ----
  ctx.globalCompositeOperation="source-over";
  for(let i=0;i<S.clouds.length;i++){
    const c=S.clouds[i];
    const cr=c.r*w;
    const cx=c.bx*w+Math.sin(t*c.drift+c.phase)*w*0.03+story*minSide*0.012;
    const cy=c.by*h+Math.cos(t*c.drift*0.8+c.phase)*h*0.008+vel*h*0.01;
    ctx.save();
    ctx.translate(cx,cy);
    ctx.scale(1,c.squish);
    const g=ctx.createRadialGradient(-cr*0.15,-cr*0.18,0,0,0,cr);
    g.addColorStop(0,"rgba(150,192,224,"+c.a.toFixed(3)+")");
    g.addColorStop(0.45,"rgba(72,112,152,"+(c.a*0.5).toFixed(3)+")");
    g.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=g;
    ctx.beginPath();
    ctx.arc(0,0,cr,0,TAU);
    ctx.fill();
    ctx.globalCompositeOperation="lighter";
    softGlow(ctx,cr*0.32,-cr*0.28,cr*0.46,"rgba(178,216,250,"+(c.a*0.8).toFixed(3)+")","transparent");
    ctx.restore();
    ctx.globalCompositeOperation="source-over";
  }

  // ---- faint altitude structure lines (right of reading lane) ----
  ctx.globalCompositeOperation="lighter";
  ctx.strokeStyle="rgba(150,198,235,0.045)";
  ctx.lineWidth=1;
  for(let a=0;a<5;a++){
    const yy=h*(0.16+a*0.1)-story*h*0.016;
    ctx.beginPath();
    ctx.moveTo(w*0.42,yy);
    ctx.quadraticCurveTo(w*0.72,yy-h*0.03+Math.sin(t*0.1+a)*h*0.006,w*1.02,yy+h*0.015);
    ctx.stroke();
  }

  // ---- turbulence contrail ribbons ----
  for(let ri=0;ri<S.ribbons.length;ri++){
    const r=S.ribbons[ri];
    const N=16;
    const sx=w*0.32, ex=w*1.12;
    const sy=r.startY*h, ey=r.endY*h;
    const cw=storyStepWeight(story,ri,S.ribbons.length);
    const bright=Math.min(1.15,r.bright*(1+cw*0.5));
    const ampBoost=1+pspeed*0.6;
    const pts: Array<[number, number, number]>=[];
    for(let k=0;k<=N;k++){
      const u=k/N;
      const eu=u*u*(3-2*u);
      const taper=Math.pow(Math.sin(u*PI),0.6);
      const x=sx+(ex-sx)*u;
      let y=sy+(ey-sy)*eu-Math.sin(u*PI)*r.lift*h;
      y+=fbm(u*2.6+r.phase*3.1,t*0.12+r.phase,2)*r.amp*h*taper*ampBoost;
      y+=Math.sin(u*TAU*1.3+t*r.speed+r.phase)*r.amp*h*0.4*taper;
      y+=px*h*0.02*Math.sin(u*PI)*(1-ri*0.12);
      const wdt=r.width*h*(0.22+taper);
      pts.push([x,y,wdt]);
    }
    const build=(exp: number)=>{
      ctx.beginPath();
      ctx.moveTo(pts[0][0],pts[0][1]-(pts[0][2]+exp));
      for(let k=1;k<=N;k++)ctx.lineTo(pts[k][0],pts[k][1]-(pts[k][2]+exp));
      for(let k=N;k>=0;k--)ctx.lineTo(pts[k][0],pts[k][1]+(pts[k][2]+exp));
      ctx.closePath();
    };
    // soft translucent body (source-over, does not force bloom to white)
    ctx.globalCompositeOperation="source-over";
    build(0);
    const bg=ctx.createLinearGradient(sx,sy,ex,ey);
    bg.addColorStop(0,"rgba(110,168,214,0)");
    bg.addColorStop(0.35,"rgba(146,196,232,"+(0.09*bright).toFixed(3)+")");
    bg.addColorStop(0.78,"rgba(200,228,248,"+(0.15*bright).toFixed(3)+")");
    bg.addColorStop(1,"rgba(224,240,252,0)");
    ctx.fillStyle=bg;
    ctx.fill();
    // additive core stroke, held off pure white for bloom headroom
    ctx.globalCompositeOperation="lighter";
    const cg=ctx.createLinearGradient(sx,sy,ex,ey);
    cg.addColorStop(0,"rgba(190,222,248,0)");
    cg.addColorStop(0.5,"rgba(210,232,252,"+(0.10*bright).toFixed(3)+")");
    cg.addColorStop(0.9,"rgba(224,240,255,"+(0.13*bright).toFixed(3)+")");
    cg.addColorStop(1,"rgba(224,240,255,0)");
    ctx.strokeStyle=cg;
    ctx.lineWidth=Math.max(0.8,r.width*h*0.16);
    ctx.beginPath();
    ctx.moveTo(pts[0][0],pts[0][1]);
    for(let k=1;k<=N;k++)ctx.lineTo(pts[k][0],pts[k][1]);
    ctx.stroke();
  }

  // ---- speed streaks (additive, solid capped strokes, masked out of reading lane) ----
  ctx.globalCompositeOperation="lighter";
  const streakLen=1+avel*0.8;
  const streakBright=1+avel*0.5+pspeed*0.3;
  for(let i=0;i<S.streaks.length;i++){
    const s=S.streaks[i];
    const p=((t*s.speed+s.seed)%1+1)%1;
    const x=-0.02*w+1.06*w*p;
    const lane=finiteClamp((x/w-0.30)/0.16,0,1);
    if(lane<=0) continue;
    const y=s.y0*h-p*s.rise*h+Math.sin(s.wob+t*0.3)*h*0.008+py*h*0.02*s.lane;
    const len=s.len*minSide*streakLen;
    const ang=-0.13-s.lane*0.05;
    const tx=x-Math.cos(ang)*len;
    const ty=y-Math.sin(ang)*len;
    const edge=Math.min(1,Math.min(p,1-p)*7);
    const a=Math.min(0.42,s.bright*edge*(0.16+0.32*Math.sin(p*PI))*lane*streakBright);
    ctx.strokeStyle="rgba(200,228,250,"+a.toFixed(3)+")";
    ctx.lineWidth=s.thick;
    ctx.beginPath();
    ctx.moveTo(tx,ty);
    ctx.lineTo(x,y);
    ctx.stroke();
    if(s.bright>0.86){
      ctx.beginPath();
      ctx.arc(x,y,s.thick*0.8,0,TAU);
      ctx.fillStyle="rgba(216,236,252,"+Math.min(0.3,a*0.8).toFixed(3)+")";
      ctx.fill();
    }
  }

  // ---- lead jet + fresh dissipating contrail (seeded so it is present at rest) ----
  const jetPeriod=30;
  const jpBase=0.46;
  const jp=((jpBase+t/jetPeriod+story*0.4)%1+1)%1;
  const jetPos=(u: number): [number, number]=>{
    const uc=((u%1)+1)%1;
    const x=-0.12*w+1.26*w*uc;
    const y=h*0.12+Math.sin(uc*PI)*h*0.06+Math.sin(t*0.1)*h*0.004;
    return [x,y];
  };
  const Mpts=22+Math.round(avel*10);
  const step=0.018;
  const cp: Array<[number, number, number]>=[];
  for(let k=0;k<=Mpts;k++){
    const u=jp-k*step;
    if(u<0) break;
    const pos=jetPos(u);
    cp.push([pos[0],pos[1],k/Mpts]);
  }
  if(cp.length>2){
    ctx.globalCompositeOperation="lighter";
    ctx.beginPath();
    for(let k=0;k<cp.length;k++){
      const a=cp[k];
      const b=cp[Math.min(k+1,cp.length-1)];
      const dx=a[0]-b[0], dy=a[1]-b[1];
      const dl=Math.max(0.001,Math.hypot(dx,dy));
      const nx=-dy/dl, ny=dx/dl;
      const wd=(0.004+a[2]*0.03)*h;
      const xx=a[0]+nx*wd, yy=a[1]+ny*wd;
      if(k===0)ctx.moveTo(xx,yy); else ctx.lineTo(xx,yy);
    }
    for(let k=cp.length-1;k>=0;k--){
      const a=cp[k];
      const b=cp[Math.min(k+1,cp.length-1)];
      const dx=a[0]-b[0], dy=a[1]-b[1];
      const dl=Math.max(0.001,Math.hypot(dx,dy));
      const nx=-dy/dl, ny=dx/dl;
      const wd=(0.004+a[2]*0.03)*h;
      ctx.lineTo(a[0]-nx*wd,a[1]-ny*wd);
    }
    ctx.closePath();
    const head=cp[0], tail=cp[cp.length-1];
    const trailBright=Math.min(0.5,0.34+avel*0.16);
    const cgrad=ctx.createLinearGradient(head[0],head[1],tail[0],tail[1]);
    cgrad.addColorStop(0,"rgba(224,240,255,"+trailBright.toFixed(3)+")");
    cgrad.addColorStop(0.3,"rgba(186,220,246,0.18)");
    cgrad.addColorStop(1,"rgba(150,195,235,0)");
    ctx.fillStyle=cgrad;
    ctx.fill();
    // capped, off-white head so the bright-pass bloom cannot clip to pure white
    softGlow(ctx,head[0],head[1],minSide*0.028,"rgba(214,236,255,0.40)","transparent");
    ctx.beginPath();
    ctx.arc(head[0],head[1],minSide*0.0038,0,TAU);
    ctx.fillStyle="rgba(232,244,255,0.72)";
    ctx.fill();
    star4(ctx,head[0],head[1],minSide*0.026,minSide*0.0022,"rgba(210,234,255,0.6)");
  }

  // ---- cinematic grade (cached, deepened reading-lane scrim) ----
  ctx.globalCompositeOperation="source-over";
  ctx.fillStyle=clear;
  ctx.fillRect(0,0,w*0.66,h);
  ctx.fillStyle=vig;
  ctx.fillRect(0,0,w,h);
  ctx.fillStyle=bhz;
  ctx.fillRect(0,h*0.68,w,h*0.32);

  ctx.restore();
};
