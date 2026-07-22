import { createSeededRandom } from "../shared/random";
import { softGlow, star4 } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

const CFG=(function(){
  const rnd=createSeededRandom(90210);
  const specks=[];
  for(let i=0;i<64;i++){ specks.push({a:rnd()*TAU, r:0.05+rnd()*0.95, len:0.3+rnd()*1.4, op:0.4+rnd()*0.6, nz:0.55+rnd()*0.45}); }
  const motes=[];
  for(let i=0;i<32;i++){ motes.push({ baseA:rnd()*TAU, rad:0.12+rnd()*0.28, spd:(0.08+rnd()*0.22)*(rnd()<0.5?-1:1), ph:rnd()*TAU, size:0.7+rnd()*2.4, bright:rnd(), par:0.4+rnd()*1.2 }); }
  return {specks:specks, motes:motes};
})();

export const renderCaliber: ThemeRenderer = (ctx,w,h,t,mx,my)=>{
  const cx=w*0.5+(mx-0.5)*w*0.015;
  const cy=h*(0.52+(my-0.5)*0.04);
  const ms=Math.min(w,h);
  const px=(mx-0.5), py=(my-0.5);
  const sweep=t*0.5+px*0.7;
  const nSpeck=Math.min(CFG.specks.length, Math.max(36, Math.round(ms/22)));
  const nMote=Math.min(CFG.motes.length, Math.max(20, Math.round(ms/40)));

  ctx.globalCompositeOperation='source-over';
  const amb=ctx.createRadialGradient(cx,cy,0,cx,cy,ms*0.75);
  amb.addColorStop(0,'rgba(16,36,68,0.5)');
  amb.addColorStop(0.45,'rgba(9,20,40,0.3)');
  amb.addColorStop(1,'rgba(3,5,10,0)');
  ctx.fillStyle=amb; ctx.fillRect(0,0,w,h);

  ctx.globalCompositeOperation='lighter';
  softGlow(ctx,cx,cy,ms*0.5,'rgba(44,96,168,0.14)','transparent');
  softGlow(ctx,cx,cy,ms*0.2,'rgba(78,136,214,0.10)','transparent');

  ctx.save();
  ctx.beginPath(); ctx.arc(cx,cy,ms*0.4,0,TAU); ctx.clip();
  ctx.globalCompositeOperation='lighter';
  const trot=t*0.025;
  for(let i=0;i<nSpeck;i++){
    const s=CFG.specks[i];
    const a=s.a+trot;
    const r=ms*0.4*s.r;
    const x=cx+Math.cos(a)*r;
    const y=cy+Math.sin(a)*r;
    const op=s.op*0.05*s.nz;
    if(op<0.004) continue;
    const tg=a+1.5708;
    const hl=ms*0.01*s.len;
    ctx.beginPath();
    ctx.moveTo(x-Math.cos(tg)*hl,y-Math.sin(tg)*hl);
    ctx.lineTo(x+Math.cos(tg)*hl,y+Math.sin(tg)*hl);
    ctx.strokeStyle='rgba(150,192,244,'+op+')';
    ctx.lineWidth=0.7;
    ctx.stroke();
  }
  ctx.restore();

  ctx.globalCompositeOperation='source-over';
  for(let i=0;i<9;i++){
    const r=ms*(0.1+i*0.037);
    ctx.beginPath(); ctx.arc(cx,cy,r,0,TAU);
    ctx.strokeStyle='rgba(120,175,240,'+Math.max(0.015,0.09-i*0.007)+')';
    ctx.lineWidth=1;
    ctx.stroke();
  }

  const dashRings: Array<[number,number,number,number,string,number]>=[
    [0.16,10,14,16,'rgba(150,195,255,0.30)',2],
    [0.24,4,10,-10,'rgba(110,165,235,0.24)',1.4],
    [0.31,22,16,8,'rgba(180,212,255,0.28)',2.4],
    [0.37,3,9,-6,'rgba(130,182,246,0.20)',1.2]
  ];
  for(let i=0;i<dashRings.length;i++){
    const d=dashRings[i];
    ctx.setLineDash([d[1],d[2]]);
    ctx.lineDashOffset=-t*d[3];
    ctx.beginPath(); ctx.arc(cx,cy,ms*d[0],0,TAU);
    ctx.strokeStyle=d[4]; ctx.lineWidth=d[5]; ctx.stroke();
  }
  ctx.setLineDash([]);

  for(let k=0;k<3;k++){
    const mr=ms*0.24;
    const ma=t*0.35+k*TAU/3;
    const xm=cx+Math.cos(ma)*mr, ym=cy+Math.sin(ma)*mr;
    ctx.save(); ctx.translate(xm,ym); ctx.rotate(ma);
    ctx.beginPath(); ctx.moveTo(6,0); ctx.lineTo(-5,-4); ctx.lineTo(-5,4); ctx.closePath();
    ctx.fillStyle='rgba(190,216,250,0.44)'; ctx.fill();
    ctx.restore();
  }

  ctx.globalCompositeOperation='lighter';
  const reach=ms*0.36;
  const span=1.15;
  const slices=22;
  for(let i=0;i<slices;i++){
    const f=i/slices;
    const a0=sweep-f*span;
    const a1=sweep-(f+1/slices)*span;
    const rr=reach*(1-f*0.12);
    const alpha=(1-f)*(1-f)*0.048;
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,rr,a1,a0);
    ctx.closePath();
    ctx.fillStyle='rgba(120,178,255,'+alpha+')';
    ctx.fill();
  }

  ctx.globalCompositeOperation='source-over';
  const tickR=ms*0.4;
  const NT=120;
  for(let i=0;i<NT;i++){
    const ang=(i/NT)*TAU;
    const isMaj=i%10===0;
    const isMid=i%5===0;
    const len=isMaj?ms*0.045:isMid?ms*0.03:ms*0.018;
    const inner=tickR-len;
    const dd=((sweep-ang)%TAU+TAU)%TAU;
    const illum=Math.max(0,1-dd/1.1);
    const base=isMaj?0.34:isMid?0.2:0.1;
    const alpha=Math.min(0.72,base+illum*0.42);
    const x0=cx+Math.cos(ang)*inner, y0=cy+Math.sin(ang)*inner;
    const x1=cx+Math.cos(ang)*tickR, y1=cy+Math.sin(ang)*tickR;
    ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1);
    const cr=Math.round(178+illum*34), cg=Math.round(206+illum*22);
    ctx.strokeStyle='rgba('+cr+','+cg+',255,'+alpha+')';
    ctx.lineWidth=isMaj?1.6:isMid?1.15:0.8;
    ctx.stroke();
  }

  ctx.globalCompositeOperation='lighter';
  for(let i=0;i<NT;i+=10){
    const ang=(i/NT)*TAU;
    const dd=((sweep-ang)%TAU+TAU)%TAU;
    const illum=Math.max(0,1-dd/1.1);
    if(illum>0.15){
      const x=cx+Math.cos(ang)*tickR, y=cy+Math.sin(ang)*tickR;
      softGlow(ctx,x,y,ms*0.02*illum+2,'rgba(178,210,250,'+(0.34*illum)+')','transparent');
    }
  }

  ctx.globalCompositeOperation='source-over';
  const bz1=ctx.createLinearGradient(cx,cy-ms*0.42,cx,cy+ms*0.42);
  bz1.addColorStop(0,'rgba(150,190,244,0.46)');
  bz1.addColorStop(0.5,'rgba(38,68,116,0.32)');
  bz1.addColorStop(1,'rgba(92,142,212,0.44)');
  ctx.beginPath(); ctx.arc(cx,cy,ms*0.42,0,TAU);
  ctx.strokeStyle=bz1; ctx.lineWidth=ms*0.012; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,ms*0.405,0,TAU);
  ctx.strokeStyle='rgba(4,8,16,0.7)'; ctx.lineWidth=ms*0.006; ctx.stroke();
  const bz2=ctx.createLinearGradient(cx,cy-ms*0.4,cx,cy+ms*0.4);
  bz2.addColorStop(0,'rgba(190,214,250,0.48)');
  bz2.addColorStop(0.5,'rgba(66,106,168,0.24)');
  bz2.addColorStop(1,'rgba(118,162,224,0.38)');
  ctx.beginPath(); ctx.arc(cx,cy,ms*0.398,0,TAU);
  ctx.strokeStyle=bz2; ctx.lineWidth=ms*0.004; ctx.stroke();

  ctx.globalCompositeOperation='lighter';
  ctx.lineCap='round';
  const sp1=-2.2+Math.sin(t*0.18)*0.25;
  ctx.beginPath(); ctx.arc(cx,cy,ms*0.42,sp1-0.45,sp1+0.45);
  ctx.strokeStyle='rgba(196,220,252,0.18)'; ctx.lineWidth=ms*0.012; ctx.stroke();
  const sp2=0.9+Math.cos(t*0.13)*0.2;
  ctx.beginPath(); ctx.arc(cx,cy,ms*0.42,sp2-0.25,sp2+0.25);
  ctx.strokeStyle='rgba(146,186,246,0.14)'; ctx.lineWidth=ms*0.01; ctx.stroke();
  ctx.lineCap='butt';

  ctx.globalCompositeOperation='lighter';
  const hx=cx+Math.cos(sweep)*reach, hy=cy+Math.sin(sweep)*reach;
  const hg=ctx.createLinearGradient(cx,cy,hx,hy);
  hg.addColorStop(0,'rgba(140,190,255,0)');
  hg.addColorStop(0.35,'rgba(158,198,250,0.4)');
  hg.addColorStop(1,'rgba(198,224,255,0.62)');
  ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(hx,hy);
  ctx.strokeStyle=hg; ctx.lineWidth=2.6; ctx.stroke();
  const tx=cx-Math.cos(sweep)*ms*0.05, ty=cy-Math.sin(sweep)*ms*0.05;
  ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(tx,ty);
  ctx.strokeStyle='rgba(150,192,250,0.4)'; ctx.lineWidth=3; ctx.stroke();
  ctx.lineCap='butt';
  softGlow(ctx,hx,hy,ms*0.03,'rgba(198,226,252,0.5)','transparent');
  star4(ctx,hx,hy,ms*0.045,1.3,'rgba(198,224,255,0.6)');

  softGlow(ctx,cx,cy,ms*0.085,'rgba(50,102,178,0.22)','transparent');
  ctx.globalCompositeOperation='source-over';
  const hr=ms*0.05;
  const dome=ctx.createRadialGradient(cx-hr*0.35,cy-hr*0.4,hr*0.1,cx,cy,hr);
  dome.addColorStop(0,'rgba(180,210,246,0.72)');
  dome.addColorStop(0.4,'rgba(104,150,210,0.82)');
  dome.addColorStop(0.75,'rgba(26,50,88,0.9)');
  dome.addColorStop(1,'rgba(8,16,32,0.95)');
  ctx.beginPath(); ctx.arc(cx,cy,hr,0,TAU); ctx.fillStyle=dome; ctx.fill();
  ctx.beginPath(); ctx.arc(cx,cy,hr,0,TAU); ctx.strokeStyle='rgba(168,200,246,0.46)'; ctx.lineWidth=1; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,hr*0.42,0,TAU); ctx.fillStyle='rgba(6,12,26,0.9)'; ctx.fill();
  ctx.globalCompositeOperation='lighter';
  softGlow(ctx,cx,cy,hr*0.5,'rgba(170,202,244,0.38)','transparent');
  star4(ctx,cx,cy,hr*1.5,hr*0.12,'rgba(186,214,250,0.5)');

  ctx.globalCompositeOperation='lighter';
  for(let i=0;i<nMote;i++){
    const m=CFG.motes[i];
    const a=m.baseA+t*m.spd;
    const rr=ms*m.rad+Math.sin(t*0.6+m.ph)*ms*0.012;
    const x=cx+Math.cos(a)*rr+px*ms*0.03*m.par;
    const y=cy+Math.sin(a)*rr+py*ms*0.03*m.par;
    const tw=0.5+0.5*Math.sin(t*(0.8+m.bright*1.2)+m.ph);
    const sz=m.size*(0.7+0.6*tw);
    const b=0.12+m.bright*0.4*tw;
    if(m.bright>0.78) softGlow(ctx,x,y,sz*4,'rgba(140,190,248,'+(0.18*tw)+')','transparent');
    ctx.beginPath(); ctx.arc(x,y,sz,0,TAU);
    ctx.fillStyle='rgba(174,208,250,'+b+')'; ctx.fill();
    if(m.bright>0.92) star4(ctx,x,y,sz*5,0.8,'rgba(200,224,250,'+(0.42*tw)+')');
  }

  ctx.globalCompositeOperation='source-over';
  const tgr=ctx.createLinearGradient(0,0,0,h);
  tgr.addColorStop(0,'rgba(12,26,50,0.4)');
  tgr.addColorStop(0.5,'rgba(6,12,26,0)');
  tgr.addColorStop(1,'rgba(2,4,9,0.5)');
  ctx.fillStyle=tgr; ctx.fillRect(0,0,w,h);
  const vg=ctx.createRadialGradient(cx,cy,ms*0.32,cx,cy,ms*0.85);
  vg.addColorStop(0,'rgba(3,5,10,0)');
  vg.addColorStop(1,'rgba(2,3,7,0.72)');
  ctx.fillStyle=vg; ctx.fillRect(0,0,w,h);

  const cs=ctx.createRadialGradient(cx,cy,0,cx,cy,ms*0.34);
  cs.addColorStop(0,'rgba(3,6,12,0.15)');
  cs.addColorStop(0.6,'rgba(3,6,12,0.06)');
  cs.addColorStop(1,'rgba(3,6,12,0)');
  ctx.fillStyle=cs; ctx.fillRect(cx-ms*0.34,cy-ms*0.34,ms*0.68,ms*0.68);

  ctx.globalCompositeOperation='source-over';
  ctx.setLineDash([]);
  ctx.lineCap='butt';
};
