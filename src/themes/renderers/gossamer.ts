import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { finiteClamp, resolveThemeMotion, storyStepWeight } from "../shared/motion";
import { star4 } from "../shared/draw";
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

export const renderGossamer: ThemeRenderer = (ctx,w,h,t,mx,my,_deltaSeconds,motion)=>{
  const M=resolveThemeMotion(motion);
  const velocity=finiteClamp(M.scrollVelocity/4,-1,1);
  const story=finiteClamp(M.storyProgress,0,1);
  const impulse=finiteClamp(M.interactionImpulse,0,1);
  const stir=finiteClamp(impulse+M.pointerSpeed*0.15,0,1);
  const nStep=CFG.webs.length;

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

  const moteSprite=ctx.createRadialGradient(0,0,0,0,0,1);
  moteSprite.addColorStop(0,"rgba(212,236,253,1)");
  moteSprite.addColorStop(0.4,"rgba(165,212,238,0.5)");
  moteSprite.addColorStop(1,"rgba(120,175,220,0)");

  ctx.save();

  const topGrad=ctx.createLinearGradient(0,0,0,h);
  topGrad.addColorStop(0,"rgba(20,34,50,0.5)");
  topGrad.addColorStop(0.42,"rgba(9,16,26,0.22)");
  topGrad.addColorStop(1,"rgba(1,3,7,0.55)");
  ctx.fillStyle=topGrad;
  ctx.fillRect(0,0,w,h);

  ctx.save();
  ctx.globalCompositeOperation="screen";
  for(let i=0;i<CFG.aur.length;i++){
    const a=CFG.aur[i];
    const ax=w*a.x+Math.sin(t*a.sp+a.ph)*w*0.03+px*minSide*0.02+story*minSide*0.02;
    const ay=h*a.y+Math.cos(t*a.sp*0.8+a.ph)*h*0.025+py*minSide*0.015;
    const ar=minSide*a.r;
    const aa=finiteClamp(a.a*(1+story*0.15),0,0.14,a.a);
    const g=ctx.createRadialGradient(ax,ay,0,ax,ay,ar);
    g.addColorStop(0,"rgba("+a.col+","+aa+")");
    g.addColorStop(0.5,"rgba("+a.col+","+(aa*0.4)+")");
    g.addColorStop(1,"rgba("+a.col+",0)");
    ctx.fillStyle=g;
    ctx.fillRect(ax-ar,ay-ar,ar*2,ar*2);
  }
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation="screen";
  const halo=ctx.createRadialGradient(moonX,moonY,moonR*0.5,moonX,moonY,moonR*8);
  halo.addColorStop(0,"rgba(214,238,255,0.26)");
  halo.addColorStop(0.16,"rgba(150,203,242,0.13)");
  halo.addColorStop(0.5,"rgba(90,150,205,0.05)");
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

  ctx.save();
  ctx.globalCompositeOperation="screen";
  for(let band=0;band<3;band++){
    const baseY=h*(0.34+band*0.2);
    ctx.beginPath();
    const steps=14;
    for(let s=0;s<=steps;s++){
      const fx=s/steps;
      const xx=fx*(w+40)-20;
      const nz=fbm(fx*2.2+band*3.1+t*0.03,band*1.7,2);
      const yy=baseY+nz*h*0.05+Math.sin(t*0.04+band+fx*3)*h*0.01;
      if(s===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);
    }
    ctx.lineTo(w+20,baseY+h*0.18);
    ctx.lineTo(-20,baseY+h*0.18);
    ctx.closePath();
    const mg=ctx.createLinearGradient(0,baseY-h*0.05,0,baseY+h*0.18);
    mg.addColorStop(0,"rgba(120,168,205,"+(0.045+band*0.014)+")");
    mg.addColorStop(1,"rgba(60,100,140,0)");
    ctx.fillStyle=mg;
    ctx.fill();
  }
  ctx.restore();

  const drawMotes=(layer: (typeof CFG.layers)[number],withCross: boolean)=>{
    const dep=layer.depth;
    const parX=px*minSide*0.03*dep;
    const parY=py*minSide*0.02*dep;
    ctx.save();
    ctx.globalCompositeOperation="screen";
    for(let i=0;i<layer.motes.length;i++){
      const m=layer.motes[i];
      const bx=m.x*w+Math.sin(t*0.05*m.drift+m.ph)*minSide*0.01-parX;
      const by=m.y*h+Math.cos(t*0.045*m.drift+m.ph*1.3)*minSide*0.008-parY+velocity*minSide*0.008+story*minSide*0.006;
      const tw=0.45+(0.55+stir*0.15)*Math.sin(t*m.tw+m.ph);
      const rr=minSide*(0.0008+m.r*0.0016*dep);
      const fr=rr*2.2;
      const al=finiteClamp((0.10+m.bright*0.35)*(0.4+0.6*tw)*(0.5+dep*0.5)*(1+stir*0.15),0,0.6,0);
      ctx.save();
      ctx.globalAlpha=al;
      ctx.translate(bx,by);
      ctx.scale(fr,fr);
      ctx.fillStyle=moteSprite;
      ctx.beginPath();
      ctx.arc(0,0,1,0,TAU);
      ctx.fill();
      ctx.restore();
      if(withCross&&m.bright>0.82){
        star4(ctx,bx,by,rr*(3+tw*3),Math.max(0.5,rr*0.4),"rgba(228,244,255,"+(al*0.7)+")");
      }
    }
    ctx.restore();
  };

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
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation="screen";
    const chr=R*0.12;
    const cgA=finiteClamp(0.42*(1+actGain*0.5),0,0.66,0.42);
    const cg=ctx.createRadialGradient(cx,cy,0,cx,cy,chr);
    cg.addColorStop(0,"rgba(238,249,255,"+cgA+")");
    cg.addColorStop(0.3,"rgba(180,222,252,"+(cgA*0.4)+")");
    cg.addColorStop(1,"rgba(120,188,238,0)");
    ctx.fillStyle=cg;
    ctx.fillRect(cx-chr,cy-chr,chr*2,chr*2);

    const dewSprite=ctx.createRadialGradient(lx*0.184,ly*0.184,0,0,0,1);
    dewSprite.addColorStop(0,"rgba(255,255,255,1)");
    dewSprite.addColorStop(0.25,"rgba(206,238,255,0.55)");
    dewSprite.addColorStop(0.62,"rgba(120,176,222,0.155)");
    dewSprite.addColorStop(1,"rgba(92,151,202,0)");
    const dewCore=finiteClamp(0.72+actGain*0.06,0,0.82,0.72);
    for(let i=0;i<wb.dew.length;i++){
      const d=wb.dew[i];
      const p=pt(d.s,d.r);
      const depthR=d.r/wb.rings;
      const rad=minSide*(0.0016+depthR*0.0018)*d.sz;
      const swell=1+Math.sin(t*0.7+d.ph)*0.08+actGain*0.12+stir*0.08;
      const fr=Math.max(0.5,rad*swell*1.9);
      ctx.save();
      ctx.globalAlpha=dewCore;
      ctx.translate(p.x,p.y);
      ctx.scale(fr,fr);
      ctx.fillStyle=dewSprite;
      ctx.beginPath();
      ctx.arc(0,0,1,0,TAU);
      ctx.fill();
      ctx.restore();
      if(d.sz>1.1){
        const hx=p.x+lx*fr*0.18;
        const hy=p.y+ly*fr*0.18;
        ctx.fillStyle="rgba(250,253,255,0.5)";
        ctx.beginPath();
        ctx.arc(hx,hy,Math.max(0.5,fr*0.09),0,TAU);
        ctx.fill();
      }
    }

    const glSpeed=1+Math.abs(velocity)*0.6;
    const glA=finiteClamp(0.46+Math.abs(velocity)*0.18,0,0.66,0.46);
    for(let i=0;i<wb.glim.length;i++){
      const gl=wb.glim[i];
      const prog=((t*gl.speed*glSpeed+gl.off)%1+1)%1;
      const p=pt(gl.spoke,prog*wb.rings);
      const gfr=minSide*0.004;
      ctx.save();
      ctx.globalAlpha=glA;
      ctx.translate(p.x,p.y);
      ctx.scale(gfr,gfr);
      ctx.fillStyle=moteSprite;
      ctx.beginPath();
      ctx.arc(0,0,1,0,TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  };

  drawMotes(CFG.layers[0],false);

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
    for(let k=1;k<=3;k++){
      const tt=k/4;
      const bx=(1-tt)*(1-tt)*a.x+2*(1-tt)*tt*mpx+tt*tt*b.x;
      const by=(1-tt)*(1-tt)*a.y+2*(1-tt)*tt*mpy+tt*tt*b.y;
      const br=minSide*0.0016*(0.7+Math.sin(t*0.6+i+k)*0.2);
      ctx.fillStyle="rgba(220,240,255,0.26)";
      ctx.beginPath();
      ctx.arc(bx,by,Math.max(0.6,br),0,TAU);
      ctx.fill();
    }
  }
  ctx.restore();

  for(let i=0;i<CFG.webs.length;i++){
    drawWeb(CFG.webs[i],i,i/nWeb);
  }

  drawMotes(CFG.layers[1],true);
  drawMotes(CFG.layers[2],true);

  ctx.save();
  ctx.globalCompositeOperation="screen";
  for(let i=0;i<CFG.strands.length;i++){
    const st=CFG.strands[i];
    const sx=st.x*w-px*minSide*0.03;
    const sy=st.y*h-py*minSide*0.02+Math.sin(t*0.05*st.sp+st.ph)*minSide*0.01+velocity*minSide*0.006;
    const len=minSide*st.len;
    const ang=st.ang+Math.sin(t*0.06+st.ph)*0.1;
    const ex=sx+Math.cos(ang)*len;
    const ey=sy+Math.sin(ang)*len;
    const cxp=(sx+ex)/2+Math.cos(ang+1.57)*st.curve*len*0.5;
    const cyp=(sy+ey)/2+Math.sin(ang+1.57)*st.curve*len*0.5;
    const sg=ctx.createLinearGradient(sx,sy,ex,ey);
    sg.addColorStop(0,"rgba(190,222,248,0)");
    sg.addColorStop(0.5,"rgba(200,230,252,0.1)");
    sg.addColorStop(1,"rgba(190,222,248,0)");
    ctx.strokeStyle=sg;
    ctx.lineWidth=Math.max(0.4,minSide*0.0005*st.w);
    ctx.beginPath();
    ctx.moveTo(sx,sy);
    ctx.quadraticCurveTo(cxp,cyp,ex,ey);
    ctx.stroke();
  }
  ctx.restore();

  if(M.hasFocus){
    const ai=Math.min(centers.length-1,Math.max(0,Math.round(story*(centers.length-1))));
    const ac=centers[ai];
    const fx=finiteClamp(M.focusX,0,1,0.5)*w;
    const fy=finiteClamp(M.focusY,0,1,0.5)*h;
    ctx.save();
    ctx.globalCompositeOperation="screen";
    ctx.beginPath();
    ctx.moveTo(ac.x,ac.y);
    ctx.quadraticCurveTo((ac.x+fx)/2,(ac.y+fy)/2-minSide*0.02,fx,fy);
    ctx.setLineDash([minSide*0.002,minSide*0.009]);
    ctx.strokeStyle="rgba(192,229,252,"+(0.05+impulse*0.1)+")";
    ctx.lineWidth=Math.max(0.5,minSide*0.0007);
    ctx.stroke();
    ctx.setLineDash([]);
    const fg=minSide*(0.035+impulse*0.03);
    const fgGrad=ctx.createRadialGradient(fx,fy,0,fx,fy,fg);
    fgGrad.addColorStop(0,"rgba(198,230,255,"+(0.08+impulse*0.16)+")");
    fgGrad.addColorStop(0.5,"rgba(170,214,246,"+(0.04+impulse*0.08)+")");
    fgGrad.addColorStop(1,"rgba(150,196,235,0)");
    ctx.fillStyle=fgGrad;
    ctx.beginPath();
    ctx.arc(fx,fy,fg,0,TAU);
    ctx.fill();
    ctx.restore();
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
