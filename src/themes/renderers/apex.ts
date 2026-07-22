import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { softGlow, star4 } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

const CFG=(function(){
  const rnd=createSeededRandom(917342);
  const layers=[
    {n:8,dist:0.26,wMin:0.016,wMax:0.032,hMin:0.09,hMax:0.22,detail:0,a:0.55},
    {n:6,dist:0.60,wMin:0.030,wMax:0.052,hMin:0.20,hMax:0.42,detail:1,a:0.82},
    {n:4,dist:1.00,wMin:0.052,wMax:0.086,hMin:0.32,hMax:0.60,detail:2,a:1.0}
  ];
  const towers=[];
  for(let L=0;L<layers.length;L++){
    const ly=layers[L];
    for(let i=0;i<ly.n;i++){
      const f=(i+0.5)/ly.n;
      const x=0.03+f*0.94+(rnd()-0.5)*0.06;
      const cols=ly.detail===2?3:(ly.detail===1?2:1);
      const rows=ly.detail===2?9:(ly.detail===1?6:4);
      const lit=[];
      for(let k=0;k<cols*rows;k++){ lit.push(rnd()); }
      towers.push({
        L:L,dist:ly.dist,a:ly.a,detail:ly.detail,x:x,
        wf:ly.wMin+rnd()*(ly.wMax-ly.wMin),
        hf:ly.hMin+rnd()*(ly.hMax-ly.hMin),
        phase:rnd()*6.283,pr:0.28+rnd()*0.4,
        cols:cols,rows:rows,lit:lit,flick:rnd()*6.283,tone:rnd()
      });
    }
  }
  towers.sort(function(a,b){return a.dist-b.dist;});
  const stars=[];
  for(let i=0;i<46;i++){
    stars.push({x:rnd(),y:rnd()*rnd()*0.9,r:0.4+rnd()*1.7,tw:rnd()*6.283,tws:0.4+rnd()*1.6,depth:0.3+rnd()*0.7,b:rnd()});
  }
  return {towers:towers,stars:stars};
})();

export const renderApex: ThemeRenderer = (ctx,w,h,t,mx,my)=>{
  const C=CFG;
  const cl=(v:number,a:number,b:number)=>v<a?a:(v>b?b:v);
  const mxs=cl(mx,0,1),mys=cl(my,0,1);
  const px=mxs-0.5,py=mys-0.5;
  const drift=Math.sin(t*0.05)*0.02+Math.sin(t*0.031)*0.012;
  const horizon=h*(0.655+py*0.025+Math.sin(t*0.04)*0.006);
  const vanishX=w*(0.5+px*0.20+drift);
  const apexY=h*(0.13+py*0.02);
  const floorDepth=Math.max(1,h-horizon);

  const sky=ctx.createLinearGradient(0,0,0,horizon);
  sky.addColorStop(0,'rgba(9,17,34,0.60)');
  sky.addColorStop(0.55,'rgba(11,30,55,0.38)');
  sky.addColorStop(1,'rgba(26,82,130,0.30)');
  ctx.fillStyle=sky;
  ctx.fillRect(0,0,w,horizon+2);
  const flg=ctx.createLinearGradient(0,horizon,0,h);
  flg.addColorStop(0,'rgba(16,44,74,0.34)');
  flg.addColorStop(0.5,'rgba(6,16,32,0.28)');
  flg.addColorStop(1,'rgba(2,5,11,0.55)');
  ctx.fillStyle=flg;
  ctx.fillRect(0,horizon,w,floorDepth+1);

  ctx.save();
  ctx.globalCompositeOperation='lighter';
  for(let i=0;i<C.stars.length;i++){
    const s=C.stars[i];
    const sx=(s.x+px*0.05*s.depth+drift*0.5)*w;
    const sy=s.y*horizon*0.9;
    const tw=0.35+0.65*(0.5+0.5*Math.sin(t*s.tws+s.tw));
    const a=tw*(0.15+s.b*0.34);
    ctx.fillStyle='rgba(150,210,255,'+a.toFixed(3)+')';
    ctx.beginPath();
    ctx.arc(sx,sy,s.r,0,TAU);
    ctx.fill();
    if(s.b>0.88){ star4(ctx,sx,sy,s.r*6*tw,s.r*0.6,'rgba(190,228,255,'+(a*0.5).toFixed(3)+')'); }
  }
  ctx.restore();

  softGlow(ctx,vanishX,apexY,w*0.30,'rgba(130,205,255,0.20)','transparent');

  ctx.save();
  ctx.globalCompositeOperation='lighter';
  for(let i=0;i<4;i++){
    const sweep=t*(0.11+i*0.024)+i*1.7;
    const bx=vanishX+Math.sin(sweep)*w*0.30;
    const len=h*0.95;
    const bw=w*(0.028+i*0.012);
    const beam=ctx.createLinearGradient(vanishX,apexY,bx,apexY+len);
    beam.addColorStop(0,'rgba(155,218,255,'+(0.11-i*0.018).toFixed(3)+')');
    beam.addColorStop(1,'rgba(30,80,150,0)');
    ctx.fillStyle=beam;
    ctx.beginPath();
    ctx.moveTo(vanishX,apexY);
    ctx.lineTo(bx-bw,apexY+len);
    ctx.lineTo(bx+bw,apexY+len);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation='lighter';
  const hzTop=horizon-h*0.17;
  const hzBot=horizon+h*0.02;
  const haze=ctx.createLinearGradient(0,hzTop,0,hzBot);
  haze.addColorStop(0,'rgba(60,150,220,0)');
  haze.addColorStop(0.6,'rgba(95,195,255,0.32)');
  haze.addColorStop(1,'rgba(150,220,255,0)');
  ctx.fillStyle=haze;
  const NS=32,sw=w/NS;
  for(let i=0;i<NS;i++){
    const fx=i/NS;
    const n=fbm(fx*3.2+t*0.06,5.3,3);
    const dip=1-0.42*Math.exp(-((fx-0.5)*(fx-0.5))/0.08);
    const a=cl((0.05+(n*0.5+0.5)*0.17)*dip,0,0.30);
    ctx.globalAlpha=a;
    ctx.fillRect(i*sw,hzTop,sw+1,hzBot-hzTop);
  }
  ctx.globalAlpha=1;
  const core=ctx.createLinearGradient(0,0,w,0);
  core.addColorStop(0,'rgba(175,222,255,0.20)');
  core.addColorStop(0.5,'rgba(175,222,255,0.09)');
  core.addColorStop(1,'rgba(175,222,255,0.20)');
  ctx.fillStyle=core;
  ctx.fillRect(0,horizon-3,w,6);
  ctx.restore();

  const vLines=26;
  for(let i=0;i<=vLines;i++){
    const x=(i/vLines)*w;
    const major=(i%3===0);
    ctx.beginPath();
    ctx.moveTo(x,h);
    ctx.lineTo(vanishX,horizon);
    ctx.strokeStyle=major?'rgba(119,207,255,0.15)':'rgba(90,150,220,0.06)';
    ctx.lineWidth=major?1.1:0.7;
    ctx.stroke();
  }
  const hLines=16;
  for(let i=1;i<=hLines;i++){
    const d=i/hLines;
    const y=horizon+d*d*floorDepth;
    const a=0.03+(1-d)*0.13;
    ctx.beginPath();
    ctx.moveTo(0,y);
    ctx.lineTo(w,y);
    ctx.strokeStyle='rgba(119,207,255,'+a.toFixed(3)+')';
    ctx.lineWidth=0.6+(1-d)*0.8;
    ctx.stroke();
  }
  ctx.save();
  ctx.globalCompositeOperation='lighter';
  for(let p=0;p<2;p++){
    const prog=((t*0.09+p*0.5)%1+1)%1;
    const d=prog;
    const y=horizon+d*d*floorDepth;
    const aa=cl((1-Math.abs(d-0.55)*1.8)*0.42,0,0.42);
    const sg=ctx.createLinearGradient(0,y-7,0,y+7);
    sg.addColorStop(0,'rgba(150,225,255,0)');
    sg.addColorStop(0.5,'rgba(165,232,255,'+aa.toFixed(3)+')');
    sg.addColorStop(1,'rgba(150,225,255,0)');
    ctx.fillStyle=sg;
    ctx.fillRect(0,y-7,w,14);
  }
  ctx.restore();

  for(let ti=0;ti<C.towers.length;ti++){
    const T=C.towers[ti];
    const dist=T.dist;
    const centerX=T.x*w+px*dist*w*0.05+drift*w*0.3*dist;
    const baseW=T.wf*w;
    const pulse=0.95+Math.sin(t*T.pr+T.phase)*0.05;
    const height=T.hf*h*pulse;
    const baseY=horizon+dist*h*0.006;
    const topY=baseY-height;
    const skew=(centerX-vanishX)*0.10*dist;
    const topW=baseW*0.5;
    const la=T.a;
    const litDir=centerX<vanishX?1:-1;
    const blx=centerX-baseW/2,brx=centerX+baseW/2;
    const tlx=centerX-topW/2+skew,trx=centerX+topW/2+skew;

    if(T.detail>=1){
      ctx.save();
      ctx.globalCompositeOperation='lighter';
      const rH=height*0.42;
      const rg=ctx.createLinearGradient(0,baseY,0,baseY+rH);
      rg.addColorStop(0,'rgba(80,175,245,'+(0.14*la).toFixed(3)+')');
      rg.addColorStop(1,'rgba(30,90,160,0)');
      ctx.fillStyle=rg;
      ctx.beginPath();
      ctx.moveTo(blx,baseY);
      ctx.lineTo(brx,baseY);
      ctx.lineTo(centerX+baseW*0.32,baseY+rH);
      ctx.lineTo(centerX-baseW*0.32,baseY+rH);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    if(T.detail===2){
      softGlow(ctx,centerX,baseY,baseW*0.9,'rgba(90,180,245,0.12)','transparent');
    }

    const bg=ctx.createLinearGradient(centerX,topY,centerX,baseY);
    const tone=T.tone;
    bg.addColorStop(0,'rgba('+Math.round(60+tone*30)+','+Math.round(150+tone*40)+','+Math.round(215+tone*30)+','+(0.70*la).toFixed(3)+')');
    bg.addColorStop(0.5,'rgba('+Math.round(26+tone*20)+','+Math.round(78+tone*30)+',150,'+(0.48*la).toFixed(3)+')');
    bg.addColorStop(1,'rgba(6,16,34,'+(0.22*la).toFixed(3)+')');
    ctx.beginPath();
    ctx.moveTo(blx,baseY);
    ctx.lineTo(tlx,topY);
    ctx.lineTo(trx,topY);
    ctx.lineTo(brx,baseY);
    ctx.closePath();
    ctx.fillStyle=bg;
    ctx.fill();

    ctx.save();
    ctx.globalCompositeOperation='lighter';
    const ex0=litDir>0?brx:blx;
    const ex1=litDir>0?trx:tlx;
    ctx.beginPath();
    ctx.moveTo(ex0,baseY);
    ctx.lineTo(ex1,topY);
    ctx.strokeStyle='rgba(150,220,255,'+(0.38*la).toFixed(3)+')';
    ctx.lineWidth=1.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tlx,topY);
    ctx.lineTo(trx,topY);
    ctx.strokeStyle='rgba(180,230,255,'+(0.42*la).toFixed(3)+')';
    ctx.lineWidth=1.2;
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    const shx0=litDir>0?blx:brx;
    const shx1=litDir>0?tlx:trx;
    ctx.moveTo(shx0,baseY);
    ctx.lineTo(shx1,topY);
    ctx.strokeStyle='rgba(2,6,14,'+(0.40*la).toFixed(3)+')';
    ctx.lineWidth=1;
    ctx.stroke();

    if(T.detail===2){
      ctx.save();
      ctx.globalCompositeOperation='lighter';
      const cols=T.cols,rows=T.rows;
      for(let c=0;c<cols;c++){
        for(let r=0;r<rows;r++){
          const fy=(r+0.6)/rows;
          const wy=baseY+(topY-baseY)*fy;
          const halfW=(baseW/2)*(1-fy)+(topW/2)*fy;
          const cx=centerX+skew*fy;
          const cxo=cols>1?((c/(cols-1))-0.5):0;
          const wx=cx+cxo*halfW*1.2;
          const key=T.lit[c*rows+r];
          const on=key>0.34;
          const flick=on?(0.55+0.45*Math.sin(t*(1.1+key*2.2)+T.flick+r*0.7+c*1.3)):0.14;
          const wa=cl((on?(0.32+key*0.42):0.05)*flick*la,0,0.6);
          const ww=Math.max(1,halfW*0.34);
          const wh=Math.max(1,(height/rows)*0.42);
          ctx.fillStyle=on?'rgba(180,222,255,'+wa.toFixed(3)+')':'rgba(70,130,190,'+wa.toFixed(3)+')';
          ctx.fillRect(wx-ww/2,wy-wh/2,ww,wh);
        }
      }
      ctx.restore();
    }

    const bpx=centerX+skew,bpy=topY;
    const bpulse=0.6+0.4*Math.sin(t*(0.9+dist)+T.phase*2);
    const br=(3+dist*7)*(0.7+bpulse*0.6);
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    const bgl=ctx.createRadialGradient(bpx,bpy,0,bpx,bpy,br*3);
    bgl.addColorStop(0,'rgba(190,230,255,'+(0.55*la).toFixed(3)+')');
    bgl.addColorStop(0.4,'rgba(120,200,255,'+(0.40*la).toFixed(3)+')');
    bgl.addColorStop(1,'rgba(80,140,255,0)');
    ctx.fillStyle=bgl;
    ctx.beginPath();
    ctx.arc(bpx,bpy,br*3,0,TAU);
    ctx.fill();
    if(T.detail>=1){ star4(ctx,bpx,bpy,br*4*bpulse,br*0.5,'rgba(200,232,255,'+(0.40*la).toFixed(3)+')'); }
    ctx.beginPath();
    ctx.moveTo(bpx,bpy);
    ctx.lineTo(vanishX,apexY);
    ctx.strokeStyle='rgba(140,205,255,'+(0.06+bpulse*0.10*la).toFixed(3)+')';
    ctx.lineWidth=0.8;
    ctx.stroke();
    ctx.restore();
  }

  const vig=ctx.createRadialGradient(w*0.5,h*0.52,h*0.18,w*0.5,h*0.5,h*0.9);
  vig.addColorStop(0,'rgba(0,0,0,0)');
  vig.addColorStop(1,'rgba(1,3,7,0.55)');
  ctx.fillStyle=vig;
  ctx.fillRect(0,0,w,h);

  ctx.save();
  ctx.globalCompositeOperation='lighter';
  const tg=ctx.createLinearGradient(0,0,0,h*0.4);
  tg.addColorStop(0,'rgba(30,70,120,0.06)');
  tg.addColorStop(1,'rgba(30,70,120,0)');
  ctx.fillStyle=tg;
  ctx.fillRect(0,0,w,h*0.4);
  ctx.restore();
};
