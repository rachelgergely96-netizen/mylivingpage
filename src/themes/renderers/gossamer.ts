import { createSeededRandom } from "../shared/random";
import { finiteClamp, resolveThemeMotion, storyStepWeight } from "../shared/motion";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

interface GossamerWeb {
  x: number;
  y: number;
  radius: number;
  rings: number;
  spokes: number;
  rot: number;
  flatten: number;
  spokeJit: number[];
  ringJit: number[];
  sag: number;
  dew: Array<{ s: number; r: number; sz: number; ph: number }>;
  glim: Array<{ spoke: number; speed: number; off: number }>;
}

const CFG=(function(){
  const rnd=createSeededRandom(70714);
  const webs: GossamerWeb[]=[
    {x:0.77,y:0.39,radius:0.255,rings:6,spokes:14,rot:0.2,flatten:0.82,spokeJit:[],ringJit:[],sag:0,dew:[],glim:[]},
    {x:1.0,y:0.75,radius:0.205,rings:5,spokes:12,rot:0.9,flatten:0.86,spokeJit:[],ringJit:[],sag:0,dew:[],glim:[]},
    {x:0.63,y:0.88,radius:0.13,rings:5,spokes:10,rot:1.7,flatten:0.9,spokeJit:[],ringJit:[],sag:0,dew:[],glim:[]}
  ];
  for(let wi=0;wi<webs.length;wi++){
    const wb=webs[wi];
    wb.spokeJit=[];
    for(let s=0;s<wb.spokes;s++)wb.spokeJit.push((rnd()-0.5)*0.05);
    wb.ringJit=[];
    for(let r=0;r<=wb.rings;r++)wb.ringJit.push(1+(rnd()-0.5)*0.06);
    wb.sag=0.5+rnd()*0.6;
    wb.dew=[];
    for(let s=0;s<wb.spokes;s++){
      for(let r=1;r<=wb.rings;r++){
        if(rnd()<0.32)wb.dew.push({s:s,r:r,sz:0.6+rnd()*0.9,ph:rnd()*TAU});
      }
    }
    wb.glim=[];
    for(let i=0;i<3;i++)wb.glim.push({spoke:Math.floor(rnd()*wb.spokes),speed:0.1+rnd()*0.12,off:rnd()});
  }
  const layers=[];
  const counts=[40,30,22];
  const depths=[0.25,0.6,1.0];
  const xmin=[0.12,0.5,0.52];
  const xspan=[0.88,0.5,0.48];
  for(let li=0;li<counts.length;li++){
    const arr=[];
    for(let i=0;i<counts[li];i++){
      arr.push({x:xmin[li]+rnd()*xspan[li],y:rnd(),r:0.4+rnd()*0.9,ph:rnd()*TAU,tw:0.5+rnd()*1.5,bright:rnd(),drift:0.3+rnd()*0.7});
    }
    layers.push({depth:depths[li],motes:arr});
  }
  const strands=[];
  for(let i=0;i<10;i++){
    strands.push({x:0.5+rnd()*0.5,y:rnd(),len:0.12+rnd()*0.22,ang:(rnd()-0.5)*0.7-0.2,curve:(rnd()-0.5)*0.6,ph:rnd()*TAU,sp:0.3+rnd()*0.5,w:0.4+rnd()*0.5});
  }
  const craters=[];
  for(let i=0;i<9;i++){
    const a=rnd()*TAU,rr=Math.sqrt(rnd())*0.72;
    craters.push({dx:Math.cos(a)*rr,dy:Math.sin(a)*rr,s:0.06+rnd()*0.16,d:0.2+rnd()*0.4});
  }
  const aur=[
    {x:0.82,y:0.22,r:0.5,col:'168,215,240',a:0.10,sp:0.02,ph:0},
    {x:0.72,y:0.5,r:0.48,col:'99,150,200',a:0.07,sp:0.017,ph:2.0},
    {x:0.9,y:0.7,r:0.45,col:'130,190,235',a:0.06,sp:0.023,ph:4.1},
    {x:0.72,y:0.96,r:0.5,col:'70,120,175',a:0.06,sp:0.014,ph:5.5}
  ];
  return {webs:webs,layers:layers,strands:strands,craters:craters,aur:aur};
})();

export const renderGossamer: ThemeRenderer = (ctx,w,h,timeValue,mx,my,_deltaSeconds,motion)=>{
  const M=resolveThemeMotion(motion);
  const reduced=motion?.reducedMotion===true;
  const t=reduced?0:timeValue;
  const velocity=reduced?0:finiteClamp(M.scrollVelocity/4,-1,1);
  const story=finiteClamp(M.storyProgress,0,1);
  const impulse=finiteClamp(M.interactionImpulse,0,1);
  const nStep=CFG.webs.length;
  const activeWebIdx=M.sectionCount>0
    ? Math.round(story*(CFG.webs.length-1))
    : 0;
  const sweepU=M.sectionCount>0
    ? finiteClamp(0.16+story*0.68+(reduced?0:Math.sin(t*TAU/18)*0.03),0.08,0.92,0.5)
    : reduced?0.5:0.5+Math.sin(t*TAU/18)*0.42;

  const minSide=Math.max(1,Math.min(w,h));
  const maxSide=Math.max(w,h);
  const px=(mx-0.5),py=(my-0.5);
  const moonX=w*(0.83+px*0.02);
  const moonY=h*(0.19+py*0.015);
  const moonR=minSide*0.058;
  const nWeb=Math.max(1,CFG.webs.length-1);

  const webCenter=(wb: GossamerWeb,depth: number)=>({
    x:w*wb.x+px*minSide*(0.02+depth*0.015),
    y:h*wb.y+py*minSide*(0.016+depth*0.012)+story*minSide*0.015+velocity*minSide*0.01
  });

  ctx.save();

  const topGrad=ctx.createLinearGradient(0,0,0,h);
  topGrad.addColorStop(0,"rgba(20,34,50,0.5)");
  topGrad.addColorStop(0.42,"rgba(9,16,26,0.22)");
  topGrad.addColorStop(1,"rgba(1,3,7,0.55)");
  ctx.fillStyle=topGrad;
  ctx.fillRect(0,0,w,h);

  ctx.save();
  ctx.globalCompositeOperation="screen";
  const halo=ctx.createRadialGradient(moonX,moonY,moonR*0.5,moonX,moonY,moonR*8);
  halo.addColorStop(0,"rgba(214,238,255,0.18)");
  halo.addColorStop(0.16,"rgba(150,203,242,0.09)");
  halo.addColorStop(0.5,"rgba(90,150,205,0.035)");
  halo.addColorStop(1,"rgba(45,83,121,0)");
  ctx.fillStyle=halo;
  ctx.fillRect(moonX-moonR*8,moonY-moonR*8,moonR*16,moonR*16);
  ctx.beginPath();
  ctx.arc(moonX,moonY,moonR*1.9,0,TAU);
  ctx.strokeStyle="rgba(180,218,246,0.05)";
  ctx.lineWidth=Math.max(1,minSide*0.005);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(moonX,moonY,moonR,0,TAU);
  ctx.clip();
  const disc=ctx.createRadialGradient(moonX-moonR*0.32,moonY-moonR*0.36,moonR*0.1,moonX+moonR*0.15,moonY+moonR*0.2,moonR*1.35);
  disc.addColorStop(0,"rgba(250,253,255,0.9)");
  disc.addColorStop(0.5,"rgba(206,228,246,0.78)");
  disc.addColorStop(0.82,"rgba(140,178,213,0.55)");
  disc.addColorStop(1,"rgba(70,110,150,0.35)");
  ctx.fillStyle=disc;
  ctx.fillRect(moonX-moonR,moonY-moonR,moonR*2,moonR*2);
  for(let i=0;i<CFG.craters.length;i++){
    const c=CFG.craters[i];
    const cx=moonX+c.dx*moonR;
    const cy=moonY+c.dy*moonR;
    const cr=c.s*moonR;
    const cg=ctx.createRadialGradient(cx-cr*0.3,cy-cr*0.3,0,cx,cy,cr);
    cg.addColorStop(0,"rgba(58,90,126,"+(0.10*c.d)+")");
    cg.addColorStop(0.6,"rgba(72,106,142,"+(0.16*c.d)+")");
    cg.addColorStop(1,"rgba(90,130,170,0)");
    ctx.fillStyle=cg;
    ctx.fillRect(cx-cr,cy-cr,cr*2,cr*2);
  }
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation="screen";
  ctx.beginPath();
  ctx.arc(moonX,moonY,moonR*0.985,Math.PI*1.03,Math.PI*1.78);
  ctx.strokeStyle="rgba(240,250,255,0.4)";
  ctx.lineWidth=Math.max(1,moonR*0.05);
  ctx.stroke();
  ctx.restore();

  const drawWeb=(wb: GossamerWeb,idx: number,depth: number)=>{
    const c=webCenter(wb,depth);
    const cx=c.x,cy=c.y;
    const R=minSide*wb.radius;
    const cw=storyStepWeight(story,idx,nStep);
    const restCw=storyStepWeight(0,idx,nStep);
    const chapter=cw-restCw;
    const actGain=Math.max(0,chapter);
    const rot=wb.rot+Math.sin(t*(0.05+idx*0.008)+idx)*0.05+velocity*0.03;
    const flat=wb.flatten;
    const op=finiteClamp(0.14+depth*0.03+chapter*0.05,0.05,0.24,0.14);
    const sag=wb.sag*R*0.05;
    let lx=moonX-cx,ly=moonY-cy;
    const ll=Math.max(1,Math.hypot(lx,ly));
    lx/=ll;ly/=ll;
    const pt=(s: number,r: number)=>{
      const si=((Math.floor(s)%wb.spokes)+wb.spokes)%wb.spokes;
      const ang=(s/wb.spokes)*TAU+rot+wb.spokeJit[si];
      const ji=Math.max(0,Math.min(wb.rings,Math.round(r)));
      const rp=(r/wb.rings)*wb.ringJit[ji];
      const rad=R*rp;
      return {x:cx+Math.cos(ang)*rad,y:cy+Math.sin(ang)*rad*flat};
    };
    let activeSpoke=Math.round(story*(wb.spokes-1));
    if(idx===activeWebIdx&&M.hasFocus){
      const fx=finiteClamp(M.focusX,0,1,0.5)*w;
      const fy=finiteClamp(M.focusY,0,1,0.5)*h;
      const localAngle=Math.atan2((fy-cy)/flat,fx-cx)-rot;
      activeSpoke=((Math.round(localAngle/TAU*wb.spokes)%wb.spokes)+wb.spokes)%wb.spokes;
    }
    const centerR=sweepU*wb.rings;
    ctx.save();
    ctx.globalCompositeOperation="screen";
    for(let r=1;r<=wb.rings;r++){
      ctx.beginPath();
      let p0=pt(0,r);
      ctx.moveTo(p0.x,p0.y);
      for(let s=1;s<=wb.spokes;s++){
        const p1=pt(s%wb.spokes,r);
        const mpx=(p0.x+p1.x)/2;
        const mpy=(p0.y+p1.y)/2+sag*(r/wb.rings);
        ctx.quadraticCurveTo(mpx,mpy,p1.x,p1.y);
        p0=p1;
      }
      ctx.closePath();
      const rw=r/wb.rings;
      ctx.strokeStyle="rgba(190,222,248,"+(op*(0.5+rw*0.5))+")";
      ctx.lineWidth=Math.max(0.5,minSide*0.0007)+depth*minSide*0.0003;
      ctx.stroke();
    }
    for(let s=0;s<wb.spokes;s++){
      ctx.beginPath();
      ctx.moveTo(cx,cy);
      for(let r=1;r<=wb.rings;r++){
        const p=pt(s,r);
        ctx.lineTo(p.x,p.y);
      }
      ctx.strokeStyle="rgba(176,214,245,"+(op*0.6)+")";
      ctx.lineWidth=Math.max(0.42,minSide*0.0006);
      ctx.stroke();
    }
    if(idx===activeWebIdx){
      const startR=Math.max(0,centerR-0.65);
      const endR=Math.min(wb.rings,centerR+0.65);
      ctx.beginPath();
      for(let sample=0;sample<=8;sample++){
        const r=startR+(endR-startR)*sample/8;
        const p=pt(activeSpoke,r);
        if(sample===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
      }
      ctx.strokeStyle=`rgba(220,240,255,${0.08+(M.hasFocus?0.02:0)+impulse*0.02})`;
      ctx.lineWidth=Math.max(0.7,minSide*0.00096);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation="screen";
    const dewSprite=ctx.createRadialGradient(lx*0.184,ly*0.184,0,0,0,1);
    dewSprite.addColorStop(0,"rgba(255,255,255,1)");
    dewSprite.addColorStop(0.25,"rgba(206,238,255,0.55)");
    dewSprite.addColorStop(0.62,"rgba(120,176,222,0.155)");
    dewSprite.addColorStop(1,"rgba(92,151,202,0)");
    for(let i=0;i<wb.dew.length;i++){
      const d=wb.dew[i];
      const p=pt(d.s,d.r);
      const depthR=d.r/wb.rings;
      const rad=minSide*(0.0016+depthR*0.0018)*d.sz;
      const activeDew=idx===activeWebIdx&&d.s===activeSpoke&&Math.abs(d.r-centerR)<0.8;
      const dewAlpha=Math.min(0.40,0.16+depthR*0.06+actGain*0.03+(activeDew?0.14:0)+(activeDew&&M.hasFocus?0.03:0)+(activeDew?impulse*0.02:0));
      const fr=Math.max(0.5,rad*1.9);
      ctx.save();
      ctx.globalAlpha=dewAlpha;
      ctx.translate(p.x,p.y);
      ctx.scale(fr,fr);
      ctx.fillStyle=dewSprite;
      ctx.beginPath();
      ctx.arc(0,0,1,0,TAU);
      ctx.fill();
      ctx.restore();
      if(activeDew&&d.sz>1.1){
        const hx=p.x+lx*fr*0.18;
        const hy=p.y+ly*fr*0.18;
        ctx.fillStyle="rgba(250,253,255,0.5)";
        ctx.beginPath();
        ctx.arc(hx,hy,Math.max(0.5,fr*0.09),0,TAU);
        ctx.fill();
      }
    }

    ctx.restore();
  };

  const centers=[];
  for(let i=0;i<CFG.webs.length;i++){
    centers.push(webCenter(CFG.webs[i],i/nWeb));
  }
  ctx.save();
  ctx.globalCompositeOperation="screen";
  for(let i=0;i<centers.length-1;i++){
    const a=centers[i],b=centers[i+1];
    const mpx=(a.x+b.x)/2;
    const mpy=(a.y+b.y)/2+Math.hypot(b.x-a.x,b.y-a.y)*0.12+Math.sin(t*0.2+i)*minSide*0.004;
    ctx.beginPath();
    ctx.moveTo(a.x,a.y);
    ctx.quadraticCurveTo(mpx,mpy,b.x,b.y);
    ctx.strokeStyle="rgba(168,205,238,0.09)";
    ctx.lineWidth=Math.max(0.4,minSide*0.0005);
    ctx.stroke();
  }
  ctx.restore();

  for(let i=0;i<CFG.webs.length;i++){
    drawWeb(CFG.webs[i],i,i/nWeb);
  }

  const clear=ctx.createLinearGradient(0,0,w*0.7,0);
  clear.addColorStop(0,"rgba(2,5,9,0.78)");
  clear.addColorStop(0.62,"rgba(3,7,12,0.4)");
  clear.addColorStop(1,"rgba(3,7,12,0)");
  ctx.fillStyle=clear;
  ctx.fillRect(0,0,w*0.7,h);

  ctx.save();
  ctx.globalCompositeOperation="screen";
  const grade=ctx.createLinearGradient(0,0,w,h);
  grade.addColorStop(0,"rgba(30,54,80,0.05)");
  grade.addColorStop(1,"rgba(10,26,44,0.03)");
  ctx.fillStyle=grade;
  ctx.fillRect(0,0,w,h);
  ctx.restore();

  const vig=ctx.createRadialGradient(w*0.79,h*0.42,minSide*0.2,w*0.66,h*0.5,maxSide*0.82);
  vig.addColorStop(0,"rgba(0,0,0,0)");
  vig.addColorStop(0.7,"rgba(0,1,4,0.28)");
  vig.addColorStop(1,"rgba(0,1,4,0.6)");
  ctx.fillStyle=vig;
  ctx.fillRect(0,0,w,h);

  ctx.restore();
};
