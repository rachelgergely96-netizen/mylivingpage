import { fbm } from "../shared/noise";
import { resolveThemeMotion } from "../shared/motion";
import { createSeededRandom } from "../shared/random";
import { softGlow, star4 } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

interface RelayGradientCache {
  w: number;
  h: number;
  sky: CanvasGradient | null;
  hgb: CanvasGradient | null;
  gb: CanvasGradient | null;
  vig: CanvasGradient | null;
}

const CFG=(function(){
  const rand=createSeededRandom(0x5e1a9c);
  const R=function(){return rand();};
  const towerPos=[0.10,0.27,0.45,0.64,0.85];
  const towers=towerPos.map(function(pxf,i){
    return {px:pxf,hf:0.30+(i%2===0?0.09:0.015)+R()*0.05,sway:R()*TAU,swaySpeed:0.10+R()*0.08,segs:7+(i%3),beat:R()*TAU};
  });
  const near=[];
  for(let i=0;i<towers.length-1;i++){
    const pc=2+(i%2);
    const packets=[];
    for(let p=0;p<pc;p++){packets.push({speed:0.05+R()*0.06,phase:R(),size:1.5+R()*1.4,hue:184+R()*14});}
    near.push({a:i,b:i+1,lift:0.09+R()*0.05+(i%2)*0.03,packets:packets});
  }
  const crossDef=[[0,2,0.20],[2,4,0.22],[1,3,0.17]];
  const cross=crossDef.map(function(c){
    return {a:c[0],b:c[1],lift:c[2],packets:[{speed:0.03+R()*0.03,phase:R(),size:1.7+R()*1.1,hue:186+R()*12}]};
  });
  const links=near.concat(cross);
  const stars=[];
  for(let i=0;i<78;i++){
    const depth=i%3;
    stars.push({x:R(),y:R()*0.72,depth:depth,size:(0.5+R()*1.0)*(depth===2?1.6:depth===1?1.1:0.7),tw:R()*TAU,twSpeed:0.4+R()*1.2,bright:R(),hueShift:R()*18-9});
  }
  const band=function(count: number,maxH: number){
    const arr=[];
    for(let i=0;i<count;i++){
      arr.push({x:(i+R()*0.7)/count,w:(0.4+R()*0.9)/count,h:(0.4+R()*0.6)*maxH,antenna:R()>0.6,lit:R()>0.45,litN:1+Math.floor(R()*3),ws:R()*TAU});
    }
    return arr;
  };
  const skylineFar=band(26,0.13);
  const skylineMid=band(16,0.20);
  const fog=[];
  for(let i=0;i<11;i++){fog.push({x:R(),r:0.10+R()*0.15,off:R()*TAU,spd:0.5+R()*0.9,amp:0.4+R()*0.6});}
  const cache: RelayGradientCache={w:0,h:0,sky:null,hgb:null,gb:null,vig:null};
  return {towers:towers,links:links,stars:stars,skylineFar:skylineFar,skylineMid:skylineMid,fog:fog,cache:cache};
})();

export const renderRelay: ThemeRenderer = (
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
  const hasStory=M.sectionCount>0;
  const routeCycle=t*0.045;
  const activeLink=hasStory
    ? ((M.activeSectionIndex%CFG.links.length)+CFG.links.length)%CFG.links.length
    : Math.floor(routeCycle)%CFG.links.length;
  const packetU=reduced?0.58:routeCycle-Math.floor(routeCycle);
  const activeRoute=CFG.links[activeLink];
  const clamp=(v: number,a: number,b: number)=>v<a?a:(v>b?b:v);
  const qp=(u: number,a: number,c: number,b: number)=>{const m=1-u;return m*m*a+2*m*u*c+u*u*b;};
  const legDim=(xx: number)=>{const u=clamp((xx/(w||1)-0.42)/0.5,0,1);return 1-0.38*u*u;};
  const ground=h*(0.80+(my-0.5)*0.012);
  const px=mx-0.5, py=my-0.5;

  if(CFG.cache.w!==w||CFG.cache.h!==h){
    const gr=h*0.80;
    const skyG=ctx.createLinearGradient(0,0,0,gr);
    skyG.addColorStop(0,"rgba(7,22,32,0.38)");
    skyG.addColorStop(0.6,"rgba(4,14,22,0.14)");
    skyG.addColorStop(1,"rgba(3,10,16,0)");
    const hgbG=ctx.createLinearGradient(0,gr-h*0.30,0,gr+h*0.02);
    hgbG.addColorStop(0,"transparent");
    hgbG.addColorStop(0.68,"rgba(30,140,175,0.09)");
    hgbG.addColorStop(1,"rgba(84,205,238,0.16)");
    const gbG=ctx.createLinearGradient(0,gr,0,h);
    gbG.addColorStop(0,"rgba(2,8,12,0.30)");
    gbG.addColorStop(1,"rgba(1,4,7,0.68)");
    const vigG=ctx.createRadialGradient(w*0.5,h*0.46,h*0.18,w*0.5,h*0.5,w*0.72);
    vigG.addColorStop(0,"transparent");
    vigG.addColorStop(1,"rgba(1,4,7,0.55)");
    CFG.cache.w=w;CFG.cache.h=h;CFG.cache.sky=skyG;CFG.cache.hgb=hgbG;CFG.cache.gb=gbG;CFG.cache.vig=vigG;
  }

  ctx.fillStyle=CFG.cache.sky!; ctx.fillRect(0,0,w,ground+2);

  ctx.save();
  ctx.globalCompositeOperation="lighter";
  softGlow(ctx, w*0.30+Math.sin(t*0.05)*w*0.08-px*w*0.04, h*0.22+Math.cos(t*0.04)*h*0.04, h*0.55, "rgba(26,120,150,0.11)","transparent");
  softGlow(ctx, w*0.74+Math.cos(t*0.045)*w*0.06-px*w*0.03, h*0.15, h*0.44, "rgba(18,92,132,0.10)","transparent");

  for(let r=0;r<3;r++){
    const baseY=h*(0.13+r*0.055);
    const amp=h*(0.03+r*0.01);
    ctx.beginPath();
    for(let s=0;s<=48;s++){
      const u=s/48, x=u*w;
      const y=baseY+Math.sin(u*TAU*1.3+t*0.15+r)*amp*0.4+fbm(u*2.2+r*3,t*0.03+r,3)*amp;
      if(s===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.strokeStyle=`rgba(${40+r*18},${175-r*22},${215-r*10},${0.05-r*0.008})`;
    ctx.lineWidth=h*(0.05-r*0.01);
    ctx.lineCap="round";
    ctx.stroke();
  }

  ctx.fillStyle=CFG.cache.hgb!; ctx.fillRect(0,ground-h*0.30,w,h*0.32);

  for(const st of CFG.stars){
    const par=(st.depth+1)*0.5;
    const sx=st.x*w-px*w*0.02*par;
    const sy=st.y*h-py*h*0.015*par+Math.sin(t*0.05*par+st.tw)*2;
    const tw=0.4+0.6*(0.5+0.5*Math.sin(t*st.twSpeed+st.tw));
    const rad=st.size*(0.7+0.35*st.depth);
    const a=(0.12+st.bright*0.44)*tw;
    ctx.beginPath(); ctx.arc(sx,sy,rad,0,TAU);
    ctx.fillStyle=`hsla(${190+st.hueShift},82%,${70+st.bright*12}%,${a})`; ctx.fill();
    if(st.bright>0.82&&st.depth===2){
      softGlow(ctx,sx,sy,rad*6,`hsla(190,82%,68%,${a*0.4})`,"transparent");
    }
  }
  ctx.restore();

  ctx.fillStyle="rgba(9,28,38,0.82)";
  for(const b of CFG.skylineFar){
    const bx=b.x*w-px*w*0.008;
    const bw=Math.max(2,b.w*w);
    const bh=b.h*h;
    ctx.fillRect(bx,ground-bh,bw,bh);
  }
  ctx.save(); ctx.globalCompositeOperation="lighter";
  ctx.fillStyle="rgba(20,90,120,0.05)"; ctx.fillRect(0,ground-h*0.14,w,h*0.14);
  ctx.restore();

  ctx.fillStyle="rgba(4,14,22,0.92)";
  for(const b of CFG.skylineMid){
    const bx=b.x*w-px*w*0.018;
    const bw=Math.max(2,b.w*w);
    const bh=b.h*h;
    ctx.fillRect(bx,ground-bh,bw,bh);
    if(b.antenna){
      ctx.strokeStyle="rgba(60,150,190,0.35)"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(bx+bw*0.5,ground-bh); ctx.lineTo(bx+bw*0.5,ground-bh-h*0.03); ctx.stroke();
    }
  }
  ctx.save(); ctx.globalCompositeOperation="lighter";
  for(const b of CFG.skylineMid){
    const bx=b.x*w-px*w*0.018, bw=Math.max(2,b.w*w), bh=b.h*h;
    const dim=legDim(bx+bw*0.5);
    if(b.antenna){
      const bl=0.5+0.5*Math.sin(t*2.4+b.ws);
      ctx.beginPath(); ctx.arc(bx+bw*0.5,ground-bh-h*0.03,1.5,0,TAU);
      ctx.fillStyle=`hsla(190,90%,78%,${(0.3+bl*0.5)*dim})`; ctx.fill();
    }
    if(b.lit){
      for(let k=0;k<b.litN;k++){
        const lx=bx+bw*(0.25+0.5*((k+1)/(b.litN+1)));
        const ly=ground-bh*(0.3+0.5*((k*0.37+b.ws)%1));
        const fl=0.4+0.6*(0.5+0.5*Math.sin(t*1.5+b.ws+k*1.3));
        ctx.beginPath(); ctx.arc(lx,ly,1,0,TAU);
        ctx.fillStyle=`hsla(188,85%,76%,${0.25*fl*dim})`; ctx.fill();
      }
    }
  }
  ctx.restore();

  ctx.save(); ctx.globalCompositeOperation="lighter";
  for(const f of CFG.fog){
    const fx=((f.x+t*0.004*f.spd)%1)*w;
    const n=fbm(f.x*3,t*0.05*f.spd+f.off,3);
    const fy=ground-h*0.015+n*h*0.02;
    const fr=f.r*w*(0.7+0.3*(0.5+0.5*Math.sin(t*0.1+f.off)));
    const a=clamp((0.04+0.05*f.amp)*(0.8+0.4*n),0,0.12);
    softGlow(ctx,fx,fy,fr,`hsla(190,72%,54%,${a})`,"transparent");
  }
  ctx.restore();

  ctx.fillStyle=CFG.cache.gb!; ctx.fillRect(0,ground,w,h-ground);

  ctx.save(); ctx.globalCompositeOperation="lighter";
  const vpx=w*0.5+px*w*0.06;
  const vpy=ground-h*0.015;
  for(let g=1;g<=8;g++){
    const u=g/8;
    const yy=ground+(h-ground)*u*u;
    ctx.beginPath(); ctx.moveTo(0,yy); ctx.lineTo(w,yy);
    ctx.strokeStyle=`rgba(70,190,225,${0.11*(1-u)+0.02})`; ctx.lineWidth=1; ctx.stroke();
  }
  for(let g=-8;g<=8;g++){
    const fx=w*0.5+g*(w/15);
    ctx.beginPath(); ctx.moveTo(fx,h); ctx.lineTo(vpx+(fx-vpx)*0.04,vpy);
    ctx.strokeStyle=`rgba(60,175,212,${0.05*(1-Math.abs(g)/9)+0.012})`; ctx.lineWidth=1; ctx.stroke();
  }
  ctx.restore();

  ctx.save(); ctx.globalCompositeOperation="lighter";
  ctx.fillStyle="rgba(120,225,245,0.06)"; ctx.fillRect(0,ground-1,w,2);
  ctx.restore();

  const TW=CFG.towers.map((tw,i)=>{
    const x=tw.px*w+Math.sin(t*tw.swaySpeed+tw.sway)*w*0.006;
    const height=h*tw.hf;
    return {x:x,base:ground,top:ground-height,height:height,cfg:tw,i:i};
  });

  for(const T of TW){
    const x=T.x, top=T.top, base=T.base;
    const halfBase=clamp(w*0.010,6,20);
    const halfTop=halfBase*0.16;
    ctx.strokeStyle="rgba(120,200,230,0.22)";
    ctx.lineWidth=Math.max(1.2,w*0.0015);
    ctx.beginPath();
    ctx.moveTo(x-halfBase,base); ctx.lineTo(x-halfTop,top);
    ctx.moveTo(x+halfBase,base); ctx.lineTo(x+halfTop,top);
    ctx.stroke();
    const segs=T.cfg.segs;
    ctx.strokeStyle="rgba(96,178,214,0.13)"; ctx.lineWidth=1;
    ctx.beginPath();
    for(let s=0;s<segs;s++){
      const u0=s/segs,u1=(s+1)/segs;
      const y0=base+(top-base)*u0, y1=base+(top-base)*u1;
      const hw0=halfBase+(halfTop-halfBase)*u0, hw1=halfBase+(halfTop-halfBase)*u1;
      ctx.moveTo(x-hw0,y0); ctx.lineTo(x+hw0,y0);
      ctx.moveTo(x-hw0,y0); ctx.lineTo(x+hw1,y1);
      ctx.moveTo(x+hw0,y0); ctx.lineTo(x-hw1,y1);
    }
    ctx.stroke();
    ctx.strokeStyle="rgba(150,215,240,0.28)"; ctx.lineWidth=1.4;
    ctx.beginPath(); ctx.moveTo(x-halfTop*2.2,top+6); ctx.lineTo(x+halfTop*2.2,top+6); ctx.stroke();
  }

  ctx.save(); ctx.globalCompositeOperation="lighter";
  for(const T of TW){
    const x=T.x, top=T.top, base=T.base, H=T.height;
    const dim=legDim(x);
    const isActiveEndpoint=T.i===activeRoute.a||T.i===activeRoute.b;
    const beat=0.5+0.5*Math.sin(t*0.55+T.cfg.beat);
    for(let wI=0;wI<2;wI++){
      const u=0.4+wI*0.28;
      const wy=base+(top-base)*u;
      ctx.beginPath(); ctx.arc(x,wy,1.6,0,TAU);
      ctx.fillStyle=`hsla(190,90%,78%,${(isActiveEndpoint?0.18+beat*0.14:0.18)*dim})`; ctx.fill();
    }
    const rg=ctx.createLinearGradient(x,base,x,base+H*0.45);
    rg.addColorStop(0,`hsla(190,90%,68%,${(isActiveEndpoint?0.06+beat*0.04:0.06)*dim})`);
    rg.addColorStop(1,"transparent");
    ctx.fillStyle=rg; ctx.fillRect(x-2,base,4,H*0.45);
    softGlow(ctx,x,base+4,w*0.02,`hsla(190,80%,58%,${(isActiveEndpoint?0.06+beat*0.04:0.06)*dim})`,"transparent");
    softGlow(ctx,x,top,14+beat*10+w*0.004,`hsla(190,90%,70%,${(isActiveEndpoint?0.06+beat*0.10:0.06)*dim})`,"transparent");
    ctx.beginPath(); ctx.arc(x,top,2.6+beat*1.5,0,TAU);
    ctx.fillStyle=`hsla(188,92%,${74+beat*8}%,${(isActiveEndpoint?0.42+beat*0.16:0.42)*dim})`; ctx.fill();
    if(isActiveEndpoint){
      star4(ctx,x,top,15+beat*12,1.4,`hsla(190,90%,80%,${(0.12+beat*0.10)*dim})`);
    }
  }
  ctx.restore();

  ctx.save(); ctx.globalCompositeOperation="lighter"; ctx.lineCap="round";
  for(let linkIndex=0;linkIndex<CFG.links.length;linkIndex++){
    const L=CFG.links[linkIndex];
    const active=linkIndex===activeLink;
    const A=TW[L.a], B=TW[L.b];
    const cx=(A.x+B.x)/2+(mx-0.5)*30;
    const cy=Math.min(A.top,B.top)-h*L.lift-(my-0.5)*20;
    ctx.beginPath(); ctx.moveTo(A.x,A.top); ctx.quadraticCurveTo(cx,cy,B.x,B.top);
    ctx.strokeStyle=`rgba(60,180,220,${active?0.06:0.04})`; ctx.lineWidth=6; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(A.x,A.top); ctx.quadraticCurveTo(cx,cy,B.x,B.top);
    ctx.strokeStyle=`rgba(92,206,236,${active?0.13:0.08})`; ctx.lineWidth=2.2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(A.x,A.top); ctx.quadraticCurveTo(cx,cy,B.x,B.top);
    ctx.strokeStyle=`rgba(205,242,255,${active?0.18:0.11})`; ctx.lineWidth=1; ctx.stroke();
    if(!active) continue;
    const pk=L.packets[0];
    const hx=qp(packetU,A.x,cx,B.x), hy=qp(packetU,A.top,cy,B.top);
    const trailU=Math.max(0,packetU-0.10);
    const tx=qp(trailU,A.x,cx,B.x), ty=qp(trailU,A.top,cy,B.top);
    const midU=(trailU+packetU)/2;
    const dim=legDim(hx);
    const g=ctx.createLinearGradient(tx,ty,hx,hy);
    g.addColorStop(0,`hsla(${pk.hue},90%,72%,0)`);
    g.addColorStop(1,`hsla(${pk.hue},92%,76%,${0.50*dim})`);
    ctx.strokeStyle=g; ctx.lineWidth=pk.size*1.4;
    ctx.beginPath(); ctx.moveTo(tx,ty);
    ctx.quadraticCurveTo(qp(midU,A.x,cx,B.x),qp(midU,A.top,cy,B.top),hx,hy);
    ctx.stroke();
    softGlow(ctx,hx,hy,pk.size*6,`hsla(${pk.hue},92%,78%,${0.38*dim})`,"transparent");
    ctx.beginPath(); ctx.arc(hx,hy,pk.size,0,TAU);
    ctx.fillStyle=`hsla(${pk.hue},92%,78%,${0.68*dim})`; ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle=CFG.cache.vig!; ctx.fillRect(0,0,w,h);
};
