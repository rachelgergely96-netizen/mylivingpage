import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { finiteClamp, resolveThemeMotion } from "../shared/motion";
import { softGlow, star4 } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

interface AtlasGradientCache {
  key: string;
  field: CanvasGradient | null;
  cold: CanvasGradient | null;
  wash: CanvasGradient | null;
  washEdge: number;
  vg: CanvasGradient | null;
}

const CFG=(function(){
  const rand=createSeededRandom(0x41544c53);
  const stars=[];
  const layers=[{n:30,depth:0.25,size:0.6},{n:22,depth:0.55,size:0.95},{n:14,depth:1.0,size:1.5}];
  for(let li=0;li<layers.length;li++){
    const L=layers[li];
    for(let i=0;i<L.n;i++){
      stars.push({x:rand(),y:rand(),depth:L.depth,size:L.size*(0.55+rand()*1.0),phase:rand()*TAU,tw:0.5+rand()*1.6,bright:rand()});
    }
  }
  const routes=[];
  for(let i=0;i<5;i++){
    routes.push({lon0:(rand()*2-1)*3.0,lat0:(rand()*2-1)*1.05,lon1:(rand()*2-1)*3.0,lat1:(rand()*2-1)*1.05,speed:0.05+rand()*0.05,phase:rand(),lift:0.10+rand()*0.16,warm:rand()<0.28});
  }
  const pings=[];
  for(let i=0;i<4;i++){
    pings.push({x:0.5+(rand()*2-1)*0.42,y:0.42+(rand()*2-1)*0.34,phase:rand(),speed:0.16+rand()*0.12});
  }
  const bands=[];
  for(let i=0;i<8;i++){
    bands.push({y:0.06+rand()*0.9,amp:0.02+rand()*0.05,freq:1.2+rand()*2.6,phase:rand()*TAU,drift:(rand()*2-1)});
  }
  const meridianCount=18;
  const parLats=[-1.30,-0.98,-0.66,-0.34,0,0.34,0.66,0.98,1.30];
  const gc: AtlasGradientCache={key:"",field:null,cold:null,wash:null,washEdge:0,vg:null};
  return {stars:stars,routes:routes,pings:pings,bands:bands,meridianCount:meridianCount,parLats:parLats,gc:gc};
})();

export const renderAtlas: ThemeRenderer = (ctx,w,h,t,mx,my,_deltaSeconds,motion)=>{
  const clamp=(v:number,a:number,b:number)=>v<a?a:(v>b?b:v);
  const M=resolveThemeMotion(motion);
  const reduced=!!(motion&&motion.reducedMotion);
  const kin=reduced?0:1;
  const story=finiteClamp(M.storyProgress,0,1,0);
  const vel=finiteClamp(M.scrollVelocity,-4,4,0)/4;
  const impulse=finiteClamp(M.interactionImpulse,0,1,0);
  const hasFocus=!!M.hasFocus;
  const fx=finiteClamp(M.focusX,0,1,0.5)*w;
  const fy=finiteClamp(M.focusY,0,1,0.5)*h;
  const hasSection=M.sectionCount>0;
  const activeRoute=hasSection?(((Math.floor(M.activeSectionIndex)%CFG.routes.length)+CFG.routes.length)%CFG.routes.length):-1;

  const aspect=w/(h||1);
  const narrow=clamp((1.12-aspect)/(1.12-0.6),0,1);
  const px=mx-0.5, py=my-0.5;
  const cx=w*(0.70+narrow*0.13) + px*w*0.022;
  const cy=h*0.47 + py*h*0.020;
  const R=Math.min(w,h)*(0.40-narrow*0.06);
  const cx0=w*(0.70+narrow*0.13);
  const cy0=h*0.47;

  const spin=t*0.055 + (reduced?0:(story*0.88 + vel*0.15));
  const tilt=0.42, ct=Math.cos(tilt), st=Math.sin(tilt);
  const project=(lon:number,lat:number): [number,number,number]=>{
    const lam=lon+spin;
    const cp=Math.cos(lat), sp=Math.sin(lat);
    const X=cp*Math.sin(lam), Y=sp, Z=cp*Math.cos(lam);
    const Yp=Y*ct - Z*st, Zp=Y*st + Z*ct;
    return [cx + X*R, cy - Yp*R, Zp];
  };

  const key=w+"x"+h;
  if(CFG.gc.key!==key){
    CFG.gc.key=key;
    const field=ctx.createRadialGradient(cx0,cy0,R*0.1,cx0,cy0,R*2.3);
    field.addColorStop(0,"rgba(18,86,120,0.28)");
    field.addColorStop(0.5,"rgba(8,42,62,0.14)");
    field.addColorStop(1,"rgba(2,7,11,0)");
    CFG.gc.field=field;
    const cold=ctx.createLinearGradient(0,0,0,h);
    cold.addColorStop(0,"rgba(6,26,40,0.30)");
    cold.addColorStop(0.5,"rgba(2,9,14,0)");
    cold.addColorStop(1,"rgba(1,10,16,0.34)");
    CFG.gc.cold=cold;
    const washEdge=w*(0.70+narrow*0.10);
    const wash=ctx.createLinearGradient(0,0,washEdge,0);
    wash.addColorStop(0,"rgba(3,7,11,0.92)");
    wash.addColorStop(0.60,"rgba(3,7,11,0.50)");
    wash.addColorStop(1,"rgba(3,7,11,0)");
    CFG.gc.wash=wash;
    CFG.gc.washEdge=washEdge;
    const vg=ctx.createRadialGradient(w*0.5,h*0.5,Math.min(w,h)*0.35,w*0.5,h*0.5,Math.max(w,h)*0.72);
    vg.addColorStop(0,"rgba(1,4,7,0)");
    vg.addColorStop(1,"rgba(1,4,7,0.55)");
    CFG.gc.vg=vg;
  }

  ctx.fillStyle=CFG.gc.field!; ctx.fillRect(0,0,w,h);
  ctx.fillStyle=CFG.gc.cold!; ctx.fillRect(0,0,w,h);

  ctx.save();
  ctx.globalCompositeOperation="lighter";
  for(let bi=0;bi<CFG.bands.length;bi++){
    const bd=CFG.bands[bi];
    const baseY=bd.y*h;
    ctx.beginPath();
    const SEG=32;
    for(let i=0;i<=SEG;i++){
      const xx=(i/SEG)*w;
      const n=fbm(xx*0.0022 + bd.phase, baseY*0.004 + t*0.02*bd.drift, 2);
      const yy=baseY + n*bd.amp*h + Math.sin(xx*0.004*bd.freq + t*0.15*bd.drift + bd.phase)*6;
      if(i===0) ctx.moveTo(xx,yy); else ctx.lineTo(xx,yy);
    }
    ctx.lineWidth=1;
    ctx.strokeStyle="rgba(50,132,178,0.055)";
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation="lighter";
  const starBoost=1 + kin*(impulse*0.5 + Math.abs(vel)*0.35);
  for(let si=0;si<CFG.stars.length;si++){
    const s=CFG.stars[si];
    const sx=s.x*w + (0.5-mx)*s.depth*w*0.02;
    const sy=s.y*h + (0.5-my)*s.depth*h*0.02;
    const tw=0.4+0.6*(0.5+0.5*Math.sin(t*s.tw + s.phase));
    let a=(0.14+s.bright*0.5)*tw*starBoost;
    if(a>0.7) a=0.7;
    ctx.fillStyle="rgba(150,220,255,"+a+")";
    ctx.beginPath(); ctx.arc(sx,sy,s.size,0,TAU); ctx.fill();
    if(s.bright>0.84){ star4(ctx,sx,sy,s.size*4.2,0.7,"rgba(190,240,255,"+(a*0.7)+")"); }
  }
  ctx.restore();

  const atmoA=0.15*(1 + (reduced?0:story*0.25));
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  softGlow(ctx,cx,cy,R*1.62,"rgba(28,120,166,"+atmoA+")","transparent");
  softGlow(ctx,cx,cy,R*1.16,"rgba(20,92,132,"+(atmoA*0.72)+")","transparent");
  ctx.restore();

  const body=ctx.createRadialGradient(cx-R*0.36,cy-R*0.36,R*0.08,cx,cy,R*1.02);
  body.addColorStop(0,"rgba(16,60,82,0.70)");
  body.addColorStop(0.55,"rgba(6,27,41,0.80)");
  body.addColorStop(1,"rgba(2,8,13,0.92)");
  ctx.beginPath(); ctx.arc(cx,cy,R,0,TAU); ctx.fillStyle=body; ctx.fill();

  ctx.save();
  ctx.beginPath(); ctx.arc(cx,cy,R,0,TAU); ctx.clip();
  const term=ctx.createRadialGradient(cx+R*0.55,cy+R*0.46,R*0.1,cx+R*0.2,cy+R*0.15,R*1.5);
  term.addColorStop(0,"rgba(1,4,7,0.55)");
  term.addColorStop(0.6,"rgba(1,4,7,0.22)");
  term.addColorStop(1,"rgba(1,4,7,0)");
  ctx.fillStyle=term; ctx.fillRect(cx-R,cy-R,R*2,R*2);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation="lighter";
  ctx.lineCap="round";
  for(let pi=0;pi<CFG.parLats.length;pi++){
    const lat=CFG.parLats[pi];
    const N=44; let started=false, sum=0, cnt=0;
    ctx.beginPath();
    for(let i=0;i<=N;i++){
      const lon=-Math.PI + (i/N)*TAU;
      const p=project(lon,lat);
      if(p[2] > -0.02){
        if(!started){ ctx.moveTo(p[0],p[1]); started=true; } else ctx.lineTo(p[0],p[1]);
        sum+=p[2]; cnt++;
      } else started=false;
    }
    const bright=cnt? clamp(sum/cnt,0,1):0;
    const isEq=Math.abs(lat)<0.01;
    ctx.lineWidth=isEq?2.8:2.1;
    ctx.strokeStyle="rgba(60,150,200,"+(0.05+bright*0.09)+")";
    ctx.stroke();
    ctx.lineWidth=isEq?1.4:0.9;
    ctx.strokeStyle=isEq?("rgba(185,242,255,"+(0.16+bright*0.30)+")"):("rgba(150,225,255,"+(0.09+bright*0.24)+")");
    ctx.stroke();
  }
  const K=CFG.meridianCount;
  for(let k=0;k<K;k++){
    const lon=(k/K)*TAU;
    const mid=project(lon,0);
    if(mid[2] < -0.25) continue;
    const bright=clamp(mid[2],0,1);
    const N=22; let started=false;
    ctx.beginPath();
    for(let i=0;i<=N;i++){
      const lat=-1.5533 + (i/N)*3.1066;
      const p=project(lon,lat);
      if(p[2] > -0.02){
        if(!started){ ctx.moveTo(p[0],p[1]); started=true; } else ctx.lineTo(p[0],p[1]);
      } else started=false;
    }
    ctx.lineWidth=2.4;
    ctx.strokeStyle="rgba(60,150,200,"+(0.045+bright*0.10)+")";
    ctx.stroke();
    ctx.lineWidth=1.0;
    ctx.strokeStyle="rgba(150,225,255,"+(0.10+bright*0.28)+")";
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation="lighter";
  ctx.beginPath(); ctx.arc(cx,cy,R,0,TAU);
  ctx.lineWidth=2.4; ctx.strokeStyle="rgba(90,190,240,0.16)"; ctx.stroke();
  ctx.lineWidth=1.0; ctx.strokeStyle="rgba(180,232,255,0.20)"; ctx.stroke();
  softGlow(ctx,cx-R*0.40,cy-R*0.40,R*0.46,"rgba(150,220,255,0.15)","transparent");
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation="lighter";
  for(let gi=0;gi<CFG.pings.length;gi++){
    const pg=CFG.pings[gi];
    const nx=pg.x*w + px*w*0.01;
    const ny=pg.y*h + py*h*0.01;
    for(let ri=0;ri<3;ri++){
      const ph=((t*pg.speed + pg.phase + ri*0.33)%1);
      const rad=6 + ph*46;
      const al=(1-ph)*0.22;
      ctx.beginPath(); ctx.arc(nx,ny,rad,0,TAU);
      ctx.lineWidth=1.2; ctx.strokeStyle="rgba(120,210,255,"+al+")"; ctx.stroke();
    }
    ctx.fillStyle="rgba(190,236,255,0.5)";
    ctx.beginPath(); ctx.arc(nx,ny,1.8,0,TAU); ctx.fill();
  }
  ctx.restore();

  const drawNode=(nx:number,ny:number,f:number,emph:number)=>{
    if(f<=0.02) return;
    const pl=0.6+0.4*Math.sin(t*2.2 + nx*0.05);
    const s=(3.2+pl*1.1)*(1+emph*0.5);
    ctx.strokeStyle="rgba(150,225,255,"+(0.45*f)+")";
    ctx.lineWidth=1;
    ctx.strokeRect(nx-s,ny-s,s*2,s*2);
    ctx.fillStyle="rgba(200,240,255,"+((0.7+emph*0.15)*f)+")";
    ctx.fillRect(nx-1.6,ny-1.6,3.2,3.2);
    if(emph>0){ softGlow(ctx,nx,ny,10+pl*3,"rgba(150,220,255,"+(0.22*f)+")","transparent"); }
  };
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  for(let i=0;i<CFG.routes.length;i++){
    const r=CFG.routes[i];
    const isActive=(i===activeRoute);
    const a=project(r.lon0,r.lat0);
    const b=project(r.lon1,r.lat1);
    const fa=clamp((a[2]+0.3)/0.6,0,1);
    const fb=clamp((b[2]+0.3)/0.6,0,1);
    const vis=Math.min(fa,fb);
    if(vis<=0.02) continue;
    const mxp=(a[0]+b[0])*0.5, myp=(a[1]+b[1])*0.5;
    const dx=mxp-cx, dy=myp-cy;
    const dl=Math.sqrt(dx*dx+dy*dy)||1;
    const lift=R*r.lift;
    const cxp=mxp + dx/dl*lift;
    const cyp=myp + dy/dl*lift;
    const warm=r.warm||isActive;
    const boost=isActive?1.5:1;
    const core=warm?"rgba(255,206,150,":"rgba(150,225,255,";
    const glow=warm?"rgba(210,140,80,":"rgba(70,170,220,";
    ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.quadraticCurveTo(cxp,cyp,b[0],b[1]);
    ctx.lineWidth=2.4; ctx.strokeStyle=glow+clamp(0.10*vis*boost,0,0.2)+")"; ctx.stroke();
    ctx.lineWidth=0.9; ctx.strokeStyle=core+clamp(0.26*vis*boost,0,0.4)+")"; ctx.stroke();
    const sPos=((t*r.speed + r.phase)%1);
    const trailN=5 + (kin?Math.round(Math.abs(vel)*3 + impulse*3):0);
    for(let ti=1;ti<=trailN;ti++){
      const ss=sPos - ti*0.03; if(ss<0) continue;
      const uu=1-ss;
      const tx=uu*uu*a[0]+2*uu*ss*cxp+ss*ss*b[0];
      const ty=uu*uu*a[1]+2*uu*ss*cyp+ss*ss*b[1];
      const ta=(1-ti/(trailN+1))*0.45*vis;
      ctx.fillStyle=core+ta+")";
      ctx.beginPath(); ctx.arc(tx,ty,Math.max(0.4,2.2-ti*0.28),0,TAU); ctx.fill();
    }
    const u=1-sPos;
    const bx=u*u*a[0]+2*u*sPos*cxp+sPos*sPos*b[0];
    const by=u*u*a[1]+2*u*sPos*cyp+sPos*sPos*b[1];
    softGlow(ctx,bx,by,9,core+clamp((warm?0.34:0.45)*vis*boost,0,0.5)+")","transparent");
    ctx.fillStyle=core+clamp(0.8*vis,0,0.8)+")";
    ctx.beginPath(); ctx.arc(bx,by,2.0,0,TAU); ctx.fill();
    const emph=isActive?1:0;
    drawNode(a[0],a[1],fa,emph); drawNode(b[0],b[1],fb,emph);
  }
  ctx.restore();

  if(hasFocus){
    ctx.save();
    ctx.globalCompositeOperation="lighter";
    const pulse=(t*0.6)%1;
    const pr=8 + pulse*40;
    ctx.beginPath(); ctx.arc(fx,fy,pr,0,TAU);
    ctx.lineWidth=1.2; ctx.strokeStyle="rgba(130,214,255,"+((1-pulse)*0.28)+")"; ctx.stroke();
    ctx.beginPath(); ctx.arc(fx,fy,14,0,TAU);
    ctx.lineWidth=1; ctx.strokeStyle="rgba(140,220,255,"+(0.20+impulse*0.20)+")"; ctx.stroke();
    softGlow(ctx,fx,fy,10,"rgba(150,220,255,"+(0.22+impulse*0.18)+")","transparent");
    ctx.fillStyle="rgba(200,240,255,"+(0.5+impulse*0.2)+")";
    ctx.beginPath(); ctx.arc(fx,fy,2.0,0,TAU); ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.strokeStyle="rgba(103,214,255,0.18)";
  ctx.lineWidth=1;
  const m=Math.min(w,h)*0.05;
  const bl=Math.min(w,h)*0.04;
  const corners=[[m,m,1,1],[w-m,m,-1,1],[m,h-m,1,-1],[w-m,h-m,-1,-1]];
  for(let ci=0;ci<corners.length;ci++){
    const c=corners[ci];
    ctx.beginPath();
    ctx.moveTo(c[0], c[1]+c[3]*bl);
    ctx.lineTo(c[0], c[1]);
    ctx.lineTo(c[0]+c[2]*bl, c[1]);
    ctx.stroke();
  }
  const unit=Math.min(w,h)*0.05;
  const sbx=m, sby=h-m*1.4;
  ctx.fillStyle="rgba(158,229,255,0.22)";
  for(let i=0;i<4;i++){ if(i%2===0) ctx.fillRect(sbx+unit*i,sby,unit,3); }
  ctx.strokeStyle="rgba(103,214,255,0.16)";
  ctx.strokeRect(sbx,sby,unit*4,3);
  ctx.fillStyle="rgba(103,214,255,0.10)";
  for(let i=0;i<=16;i++){
    const xx=m + (i/16)*(w-2*m);
    const ln=(i%4===0)?7:3;
    ctx.fillRect(xx, m-ln-4, 1, ln);
  }
  ctx.restore();

  ctx.fillStyle=CFG.gc.wash!;
  ctx.fillRect(0,0,CFG.gc.washEdge,h);

  ctx.fillStyle=CFG.gc.vg!;
  ctx.fillRect(0,0,w,h);
};
