import { finiteClamp, resolveThemeMotion } from "../shared/motion";
import { createSeededRandom } from "../shared/random";
import { softGlow } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

const CFG=(function(){
  const rand=createSeededRandom(20260721);
  function tower(side:number,i:number,n:number){
    const depth=i/(n-1);
    return {
      side:side,
      depth:depth,
      edge:0.012+depth*0.078+rand()*0.012,
      wf:0.05+depth*0.05+rand()*0.02,
      topf:0.5-depth*0.33-rand()*0.05,
      lean:0.05+rand()*0.045,
      tone:0.26+depth*0.55+rand()*0.08,
      texSeed:1+rand()*1000,
      cols:2+Math.floor(rand()*3),
      rows:6+Math.floor(rand()*5),
      phase:rand(),
      streak:rand()
    };
  }
  const N=7;
  const left=[],right=[];
  for(let i=0;i<N;i++)left.push(tower(-1,i,N));
  for(let i=0;i<N;i++)right.push(tower(1,i,N));
  const far=[];
  for(let i=0;i<28;i++){
    far.push({xf:rand(),wf:0.015+rand()*0.03,hf:0.05+rand()*0.14,shade:0.08+rand()*0.22,crown:rand()});
  }
  return {left:left,right:right,far:far,N:N};
})();

export const renderCitadel: ThemeRenderer = (
  ctx,
  w,
  h,
  timeValue,
  mx,
  my,
  _deltaSeconds,
  motion,
) => {
  const M=resolveThemeMotion(motion);
  const reduced=motion?.reducedMotion===true;
  const t=reduced?0:timeValue;
  const minS=Math.min(w,h);
  const maxS=Math.max(w,h);
  const px=mx-0.5, py=my-0.5;
  const vanishX=w*(0.5+px*0.12);
  const horizonY=h*(0.36+py*0.045);
  const cx=w*0.5;
  const spanFloor=h-horizonY;
  const hasStory=M.sectionCount>0;
  let activeDepth=hasStory
    ? finiteClamp(M.storyProgress,0,1,0)
    : 0.5+Math.sin(t*TAU/26)*0.35;
  if(M.hasFocus){
    activeDepth+=(finiteClamp(M.focusY,0,1,0.5)-activeDepth)*0.2;
  }
  activeDepth=finiteClamp(activeDepth,0,1,0.5);
  const activeRow=0.18+activeDepth*0.64;

  function ws(a:number,b:number,s:number){const v=Math.sin(a*127.1+b*311.7+s*0.017)*43758.5453;return v-Math.floor(v);}

  // ---- sky wash (translucent over the opaque #030508 base) ----
  const sky=ctx.createLinearGradient(0,0,0,h);
  sky.addColorStop(0,"rgba(10,14,22,0.9)");
  sky.addColorStop(0.32,"rgba(13,18,28,0.55)");
  sky.addColorStop(0.5,"rgba(8,11,17,0.22)");
  sky.addColorStop(1,"rgba(2,3,5,0)");
  ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);

  // ---- additive atmosphere, drifting fog, distant beacon (tamed) ----
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  const atmo=ctx.createLinearGradient(0,horizonY-h*0.2,0,horizonY+h*0.14);
  atmo.addColorStop(0,"rgba(42,56,82,0)");
  atmo.addColorStop(0.5,"rgba(60,78,110,0.15)");
  atmo.addColorStop(1,"rgba(18,26,40,0)");
  ctx.fillStyle=atmo;ctx.fillRect(0,horizonY-h*0.2,w,h*0.34);
  const beaconPulse=0.5+0.5*Math.sin(t*TAU/24);
  softGlow(ctx,vanishX,horizonY,minS*(0.14+beaconPulse*0.008),"rgba(138,164,206,0.11)","transparent");
  softGlow(ctx,vanishX,horizonY,minS*0.045,"rgba(188,206,238,0.14)","transparent");
  ctx.restore();

  // ---- far skyline behind the canyon ----
  for(let i=0;i<CFG.far.length;i++){
    const f=CFG.far[i];
    const tw=f.wf*w*0.6;
    const th=f.hf*h;
    const tx=f.xf*w-px*w*0.03*(0.4+f.shade)-tw*0.5;
    const ty=horizonY-th+h*0.008;
    ctx.fillStyle="rgba("+((18+f.shade*26)|0)+","+((24+f.shade*32)|0)+","+((36+f.shade*44)|0)+",0.55)";
    ctx.fillRect(tx,ty,tw,th);
    if(f.crown>0.5){ctx.fillStyle="rgba(120,150,200,0.07)";ctx.fillRect(tx,ty,tw,1.5);}
  }

  // ---- corridor floor ----
  const floor=ctx.createLinearGradient(0,horizonY,0,h);
  floor.addColorStop(0,"rgba(28,38,54,0)");
  floor.addColorStop(0.16,"rgba(22,30,44,0.32)");
  floor.addColorStop(1,"rgba(5,8,13,0.92)");
  ctx.fillStyle=floor;
  ctx.beginPath();
  ctx.moveTo(0,h);
  ctx.lineTo(vanishX-w*0.02,horizonY);
  ctx.lineTo(vanishX+w*0.02,horizonY);
  ctx.lineTo(w,h);
  ctx.closePath();ctx.fill();

  // corridor light reflection (additive, tamed for center-column legibility)
  ctx.save();ctx.globalCompositeOperation="lighter";
  const refl=ctx.createLinearGradient(0,horizonY,0,h);
  refl.addColorStop(0,"rgba(140,166,208,0.1)");
  refl.addColorStop(0.4,"rgba(90,112,152,0.05)");
  refl.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=refl;
  ctx.beginPath();
  ctx.moveTo(vanishX-w*0.014,horizonY);
  ctx.lineTo(vanishX+w*0.014,horizonY);
  ctx.lineTo(vanishX+w*0.1,h);
  ctx.lineTo(vanishX-w*0.1,h);
  ctx.closePath();ctx.fill();
  ctx.restore();

  // corridor grid: converging rails + receding rungs
  for(let i=-4;i<=4;i++){
    ctx.strokeStyle="rgba(120,150,205,"+(0.09-Math.abs(i)*0.012)+")";
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(vanishX,horizonY);
    ctx.lineTo(vanishX+i*w*0.12,h);
    ctx.stroke();
  }
  for(let i=1;i<=9;i++){
    const p=i/10;
    const yy=horizonY+Math.pow(p,1.9)*spanFloor;
    const spread=p*w*0.55;
    ctx.strokeStyle="rgba(110,140,195,"+(0.12*(1-p*0.5))+")";
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(vanishX-spread,yy);
    ctx.lineTo(vanishX+spread,yy);
    ctx.stroke();
  }

  // ---- brutalist canyon towers ----
  // cache the ambient-occlusion gradient once (identical stops for every tower)
  const aoGrad=ctx.createLinearGradient(0,0,0,h);
  aoGrad.addColorStop(0,"rgba(0,0,0,0)");
  aoGrad.addColorStop(0.5,"rgba(2,4,7,0)");
  aoGrad.addColorStop(1,"rgba(2,3,6,0.72)");
  const glows: Array<[number,number,number,number,number,number,number]>=[];
  function drawTower(T:(typeof CFG.left)[number]){
    const side=T.side;
    const width=T.wf*w;
    const x0=side<0?T.edge*w:(w-T.edge*w-width);
    const x1=x0+width;
    const topY=T.topf*h;
    const spanY=h-topY;
    const ctow=x0+width*0.5;
    const off=(vanishX-ctow)*T.lean;
    const tx0=x0+off, tx1=x1+off;
    const tn=T.tone;

    ctx.beginPath();
    ctx.moveTo(x0,h);ctx.lineTo(tx0,topY);ctx.lineTo(tx1,topY);ctx.lineTo(x1,h);ctx.closePath();
    const outerX=side<0?x0:x1, innerX=side<0?x1:x0;
    const fg=ctx.createLinearGradient(outerX,0,innerX,0);
    fg.addColorStop(0,"rgba("+((9+tn*8)|0)+","+((12+tn*10)|0)+","+((18+tn*13)|0)+",0.98)");
    fg.addColorStop(1,"rgba("+((22+tn*44)|0)+","+((28+tn*52)|0)+","+((38+tn*64)|0)+",0.98)");
    ctx.fillStyle=fg;ctx.fill();
    ctx.fillStyle=aoGrad;ctx.fill();

    // weathering streaks (clipped to face)
    ctx.save();
    ctx.clip();
    ctx.fillStyle="rgba(3,5,9,0.5)";
    ctx.beginPath();
    for(let s=0;s<3;s++){
      const sf=((T.streak*3+s*0.31)%1);
      const sx0=x0+width*(0.12+sf*0.72);
      const sxt=tx0+(tx1-tx0)*(0.12+sf*0.72);
      const sw=width*(0.012+0.018*(((s*7+3)%3)/3));
      ctx.moveTo(sx0,h);ctx.lineTo(sxt,topY);ctx.lineTo(sxt+sw,topY);ctx.lineTo(sx0+sw,h);ctx.closePath();
    }
    ctx.fill();
    ctx.restore();

    // vertical mullions (batched)
    ctx.strokeStyle="rgba(70,90,124,"+(0.16+tn*0.14)+")";
    ctx.lineWidth=1;
    ctx.beginPath();
    for(let c=0;c<=T.cols;c++){
      const f=c/T.cols;
      const bx=x0+width*f, tbx=tx0+(tx1-tx0)*f;
      ctx.moveTo(bx,h);ctx.lineTo(tbx,topY);
    }
    ctx.stroke();

    // floor divisions (batched)
    const mTop=topY+spanY*0.06, avail=spanY*0.9;
    ctx.strokeStyle="rgba(60,78,110,"+(0.12+tn*0.12)+")";
    ctx.beginPath();
    for(let r=0;r<=T.rows;r++){
      const rf=r/T.rows;
      const wy=mTop+rf*avail;
      const fy=(h-wy)/spanY;
      const lx=x0+(tx0-x0)*fy, rx=x1+(tx1-x1)*fy;
      ctx.moveTo(lx,wy);ctx.lineTo(rx,wy);
    }
    ctx.stroke();

    // One chapter-selected window level catches the distant beacon.
    const depthWeight=Math.max(0,1-Math.abs(T.depth-activeDepth)/0.18);
    const cellH=avail/T.rows;
    for(let r=0;r<T.rows;r++){
      const rf=(r+0.5)/T.rows;
      const wy=mTop+rf*avail;
      const fy=(h-wy)/spanY;
      const lx=x0+(tx0-x0)*fy, rx=x1+(tx1-x1)*fy;
      const rowW=rx-lx;
      for(let c=0;c<T.cols;c++){
        const cf=(c+0.5)/T.cols;
        const wx=lx+rowW*cf;
        const s1=ws(r+1,c+3,T.texSeed);
        const litBase=s1>0.6?(0.22+(s1-0.6)*1.5):0;
        const tw=0.85+0.15*Math.sin(t*TAU/22+s1*TAU);
        const ambient=litBase*tw*0.55;
        const band=Math.max(0,1-Math.abs(rf-activeRow)/0.11)*depthWeight;
        const inten=Math.min(1,ambient+band*(0.55+s1*0.2));
        if(inten>0.05){
          const warm=ws(c+5,r+2,T.texSeed)>0.85;
          const cr=warm?246:184, cg=warm?208:206, cb=warm?160:246;
          const ww=rowW/T.cols*0.42, wh=cellH*0.5;
          ctx.fillStyle="rgba("+cr+","+cg+","+cb+","+Math.min(0.26,0.04+inten*0.22)+")";
          ctx.fillRect(wx-ww*0.5,wy-wh*0.5,ww,wh);
          if(inten>0.5&&glows.length<12){glows.push([wx,wy,Math.max(ww,wh),cr,cg,cb,inten]);}
        }
      }
    }

    // inner-edge rim light + crown highlight (additive)
    ctx.save();ctx.globalCompositeOperation="lighter";
    const rimBx=side<0?x1:x0, rimTx=side<0?tx1:tx0;
    const rg=ctx.createLinearGradient(0,topY,0,h);
    rg.addColorStop(0,"rgba(150,180,226,0)");
    rg.addColorStop(0.32,"rgba(158,186,230,"+(0.1+tn*0.14+depthWeight*0.09)+")");
    rg.addColorStop(1,"rgba(80,105,150,0)");
    ctx.strokeStyle=rg;ctx.lineWidth=Math.max(1,width*0.018);
    ctx.beginPath();ctx.moveTo(rimTx,topY);ctx.lineTo(rimBx,h);ctx.stroke();
    ctx.strokeStyle="rgba(170,196,236,"+(0.12+tn*0.12)+")";
    ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(tx0,topY);ctx.lineTo(tx1,topY);ctx.stroke();
    ctx.restore();
  }
  for(let i=0;i<CFG.N;i++){
    drawTower(CFG.left[i]);
    drawTower(CFG.right[i]);
  }

  // window bloom pass (additive) — capped to the strongest glows so the host
  // bright-pass bloom cannot stack them to pure white, and to cut gradient cost
  if(glows.length>1){glows.sort(function(a,b){return b[6]-a[6];});}
  ctx.save();ctx.globalCompositeOperation="lighter";
  const nb=glows.length<6?glows.length:6;
  for(let i=0;i<nb;i++){
    const g=glows[i];
    softGlow(ctx,g[0],g[1],g[2]*(2.0+g[6]*1.6),"rgba("+g[3]+","+g[4]+","+g[5]+","+(0.08*g[6])+")","transparent");
  }
  ctx.restore();

  // ---- foreground silhouette frames ----
  function foreground(side:number){
    const width=w*0.14;
    const x0=side<0?-w*0.02:(w-width+w*0.02);
    const x1=x0+width;
    const topY=h*0.02;
    const off=(vanishX-(x0+width*0.5))*0.03;
    const tx0=x0+off,tx1=x1+off;
    ctx.beginPath();
    ctx.moveTo(x0,h);ctx.lineTo(tx0,topY);ctx.lineTo(tx1,topY);ctx.lineTo(x1,h);ctx.closePath();
    const fg=ctx.createLinearGradient(0,topY,0,h);
    fg.addColorStop(0,"rgba(4,6,10,0.97)");
    fg.addColorStop(1,"rgba(1,2,4,0.99)");
    ctx.fillStyle=fg;ctx.fill();
    ctx.save();ctx.globalCompositeOperation="lighter";
    const rimBx=side<0?x1:x0, rimTx=side<0?tx1:tx0;
    const rg=ctx.createLinearGradient(0,topY,0,h);
    rg.addColorStop(0,"rgba(150,180,226,0)");
    rg.addColorStop(0.4,"rgba(150,180,226,0.16)");
    rg.addColorStop(1,"rgba(70,95,140,0)");
    ctx.strokeStyle=rg;ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(rimTx,topY);ctx.lineTo(rimBx,h);ctx.stroke();
    ctx.restore();
    for(let r=0;r<7;r++){
      const s1=ws(r+2,side*3+4,7001);
      if(s1>0.55){
        const wy=h*0.2+r/7*h*0.7;
        const fy=(h-wy)/(h-topY);
        const ix=(side<0?x1:x0), itx=(side<0?tx1:tx0);
        const wx=ix+(itx-ix)*fy+(side<0?-width*0.12:width*0.12);
        const inten=0.4+s1*0.5;
        ctx.fillStyle="rgba(184,206,246,"+(inten*0.6)+")";
        ctx.fillRect(wx-width*0.05,wy-h*0.01,width*0.1,h*0.02);
      }
    }
  }
  foreground(-1);foreground(1);

  // ---- cool color grade + readability scrim + vignette ----
  const grade=ctx.createLinearGradient(0,0,0,h);
  grade.addColorStop(0,"rgba(22,32,52,0.1)");
  grade.addColorStop(0.6,"rgba(8,12,20,0.06)");
  grade.addColorStop(1,"rgba(2,3,6,0.3)");
  ctx.fillStyle=grade;ctx.fillRect(0,0,w,h);
  // soft top scrim guards the name/headline in the upper reading column
  const readScrim=ctx.createLinearGradient(0,0,0,h*0.52);
  readScrim.addColorStop(0,"rgba(4,6,11,0.26)");
  readScrim.addColorStop(1,"rgba(4,6,11,0)");
  ctx.fillStyle=readScrim;ctx.fillRect(0,0,w,h*0.52);
  const vig=ctx.createRadialGradient(vanishX,horizonY,minS*0.15,cx,h*0.55,maxS*0.85);
  vig.addColorStop(0,"rgba(0,0,0,0)");
  vig.addColorStop(0.7,"rgba(0,0,0,0.22)");
  vig.addColorStop(1,"rgba(0,0,0,0.6)");
  ctx.fillStyle=vig;ctx.fillRect(0,0,w,h);
};
