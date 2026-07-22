import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { softGlow } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

interface VectorNode {
  bx: number;
  by: number;
  r: number;
  phase: number;
  driftF: number;
  driftA: number;
  spin: number;
  spinS: number;
}

const CFG=(function(){
  const rng=createSeededRandom(20477);
  const nodes: VectorNode[]=[];
  for(let i=0;i<2;i++){
    nodes.push({
      bx:0.28+i*0.44+(rng()-0.5)*0.08,
      by:0.32+(rng()-0.5)*0.28,
      r:30+rng()*14,
      phase:rng()*TAU, driftF:0.04+rng()*0.06, driftA:0.015+rng()*0.02,
      spin:rng()<0.5?-1:1, spinS:0.03+rng()*0.04
    });
  }
  const dims=[];
  for(let i=0;i<3;i++){
    dims.push({x:0.16+rng()*0.68,y:0.16+rng()*0.66,len:60+rng()*80,ang:rng()*TAU,ph:rng()*TAU,dr:0.02+rng()*0.04});
  }
  const guides=[];
  for(let i=0;i<2;i++) guides.push({y0:rng(),y1:rng(),ph:rng()*TAU});
  const patches=[];
  for(let i=0;i<3;i++) patches.push({x:0.2+rng()*0.6,y:0.15+rng()*0.6,r:0.34+rng()*0.28,ph:rng()*TAU,dr:0.018+rng()*0.028});
  const dots=[];
  for(let i=0;i<26;i++){
    dots.push({x:rng(),y:rng(),s:0.7+rng()*1.2,ph:rng()*TAU,tw:0.18+rng()*0.4,depth:0.4+rng()*0.6,bright:rng()<0.15});
  }
  return {nodes,dims,guides,patches,dots};
})();

export const renderVector: ThemeRenderer = (ctx,w,h,t,mx,my)=>{
  const cx=w*0.5, cy=h*0.5;
  const px=mx-0.5, py=my-0.5;
  const diag=Math.sqrt(w*w+h*h)||1;
  const B=(a: number)=>'rgba(125,167,255,'+(a<0?0:a)+')';
  const HI=(a: number)=>'rgba(214,240,255,'+(a<0?0:a)+')';
  const RT=(a: number)=>'rgba(165,212,255,'+(a<0?0:a)+')';

  const g1=ctx.createLinearGradient(0,0,0,h);
  g1.addColorStop(0,'rgba(14,29,60,0.45)');
  g1.addColorStop(0.5,'rgba(7,17,34,0.10)');
  g1.addColorStop(1,'rgba(2,5,12,0.60)');
  ctx.fillStyle=g1; ctx.fillRect(0,0,w,h);

  ctx.save(); ctx.globalCompositeOperation='lighter';
  const lsx=cx+Math.sin(t*0.03)*w*0.08-px*34;
  const lsy=h*0.28+Math.cos(t*0.025)*h*0.04-py*22;
  const lg=ctx.createRadialGradient(lsx,lsy,0,lsx,lsy,diag*0.42);
  lg.addColorStop(0,'rgba(64,110,194,0.13)');
  lg.addColorStop(0.4,'rgba(46,86,162,0.07)');
  lg.addColorStop(1,'rgba(34,66,132,0)');
  ctx.fillStyle=lg; ctx.fillRect(0,0,w,h);
  for(let i=0;i<CFG.patches.length;i++){
    const p=CFG.patches[i];
    const x=(p.x+Math.sin(t*p.dr+p.ph)*0.02)*w;
    const y=(p.y+Math.cos(t*p.dr*0.8+p.ph)*0.02)*h;
    const nz=fbm(p.x*3+t*0.03,p.y*3,2);
    const a=0.03+0.018*(0.5+0.5*Math.sin(t*0.1+p.ph))+nz*0.012;
    softGlow(ctx,x,y,p.r*diag*0.36,'rgba(44,84,158,'+(a<0?0:a)+')','transparent');
  }
  ctx.restore();

  const shim=0.85+0.15*(0.5+0.5*fbm(t*0.05,3.1,2));
  const gridLayer=(cell: number,offx: number,offy: number,minA: string,majA: string,majLw: number)=>{
    const nx=Math.ceil(w/cell)+3, ny=Math.ceil(h/cell)+3;
    ctx.beginPath();
    for(let i=-2;i<=nx;i++){ if(i%4!==0){ const x=i*cell+offx; ctx.moveTo(x,0); ctx.lineTo(x,h); } }
    for(let j=-2;j<=ny;j++){ if(j%4!==0){ const y=j*cell+offy; ctx.moveTo(0,y); ctx.lineTo(w,y); } }
    ctx.strokeStyle=minA; ctx.lineWidth=0.6; ctx.stroke();
    ctx.beginPath();
    for(let i=-2;i<=nx;i++){ if(i%4===0){ const x=i*cell+offx; ctx.moveTo(x,0); ctx.lineTo(x,h); } }
    for(let j=-2;j<=ny;j++){ if(j%4===0){ const y=j*cell+offy; ctx.moveTo(0,y); ctx.lineTo(w,y); } }
    ctx.strokeStyle=majA; ctx.lineWidth=majLw; ctx.stroke();
  };
  gridLayer(112, px*10+Math.sin(t*0.025)*4, py*8+Math.cos(t*0.03)*4, B(0.018*shim), B(0.05*shim), 1);
  gridLayer(28, px*20+Math.sin(t*0.03)*6, py*16+Math.cos(t*0.028)*5, B(0.03*shim), B(0.07*shim), 1);

  for(let i=0;i<CFG.dots.length;i++){
    const m=CFG.dots[i];
    const dp=m.depth;
    const ox=-px*24*dp+Math.sin(t*0.02+i)*3.5*dp;
    const oy=-py*18*dp+Math.cos(t*0.022+i)*3*dp;
    const x=m.x*w+ox, y=m.y*h+oy;
    const tw=0.5+0.5*Math.sin(t*m.tw+m.ph);
    const a=(0.05+0.14*tw)*dp;
    if(m.bright){
      ctx.save(); ctx.globalCompositeOperation='lighter';
      softGlow(ctx,x,y,4+dp*3,'rgba(190,226,255,'+Math.max(0,a*0.8)+')','transparent');
      ctx.restore();
    }
    ctx.fillStyle='rgba(200,230,255,'+Math.max(0,a)+')';
    ctx.beginPath(); ctx.arc(x,y,m.s*(0.6+dp*0.5),0,TAU); ctx.fill();
  }

  ctx.strokeStyle=B(0.09); ctx.lineWidth=1; ctx.beginPath();
  for(let x=0;x<=w;x+=28){ const tall=(Math.round(x/28)%4===0)?8:4; ctx.moveTo(x,0); ctx.lineTo(x,tall); }
  for(let y=0;y<=h;y+=28){ const tall=(Math.round(y/28)%4===0)?8:4; ctx.moveTo(0,y); ctx.lineTo(tall,y); }
  ctx.stroke();

  ctx.setLineDash([9,12]); ctx.lineWidth=1;
  for(let i=0;i<CFG.guides.length;i++){
    const gd=CFG.guides[i];
    const y0=(gd.y0*0.8+0.1)*h+Math.sin(t*0.045+gd.ph)*8;
    const y1=(gd.y1*0.8+0.1)*h+Math.cos(t*0.04+gd.ph)*8;
    ctx.strokeStyle=B(0.05);
    ctx.beginPath(); ctx.moveTo(0,y0); ctx.lineTo(w,y1); ctx.stroke();
  }
  ctx.setLineDash([]);

  for(let i=0;i<CFG.dims.length;i++){
    const d=CFG.dims[i];
    const dx=d.x*w+Math.sin(t*d.dr+d.ph)*9;
    const dy=d.y*h+Math.cos(t*d.dr*0.9+d.ph)*7;
    const ang=d.ang+Math.sin(t*0.03+d.ph)*0.1;
    const ca=Math.cos(ang), sa=Math.sin(ang);
    const ax=dx-ca*d.len*0.5, ay=dy-sa*d.len*0.5;
    const bx=dx+ca*d.len*0.5, by=dy+sa*d.len*0.5;
    const nX=-sa, nY=ca;
    const active=Math.sin(t*0.18+d.ph)>0.6;
    const col=active?HI(0.24):B(0.11);
    ctx.strokeStyle=col; ctx.lineWidth=1; ctx.beginPath();
    ctx.moveTo(ax-nX*5,ay-nY*5); ctx.lineTo(ax+nX*5,ay+nY*5);
    ctx.moveTo(bx-nX*5,by-nY*5); ctx.lineTo(bx+nX*5,by+nY*5);
    ctx.moveTo(ax,ay); ctx.lineTo(bx,by);
    ctx.moveTo(ax,ay); ctx.lineTo(ax+ca*7+nX*3,ay+sa*7+nY*3);
    ctx.moveTo(ax,ay); ctx.lineTo(ax+ca*7-nX*3,ay+sa*7-nY*3);
    ctx.moveTo(bx,by); ctx.lineTo(bx-ca*7+nX*3,by-sa*7+nY*3);
    ctx.moveTo(bx,by); ctx.lineTo(bx-ca*7-nX*3,by-sa*7-nY*3);
    ctx.stroke();
    ctx.strokeRect(dx-2,dy-2,4,4);
  }

  const scanX=((t*30)%(w+300))-150;
  const scanY=((t*20)%(h+260))-130;
  ctx.save(); ctx.globalCompositeOperation='lighter';
  const gv=ctx.createLinearGradient(scanX-110,0,scanX+26,0);
  gv.addColorStop(0,'rgba(50,104,190,0)');
  gv.addColorStop(0.7,'rgba(78,134,210,0.045)');
  gv.addColorStop(1,'rgba(120,170,225,0.07)');
  ctx.fillStyle=gv; ctx.fillRect(scanX-110,0,136,h);
  const gh=ctx.createLinearGradient(0,scanY-90,0,scanY+22);
  gh.addColorStop(0,'rgba(50,104,190,0)');
  gh.addColorStop(0.7,'rgba(78,134,210,0.03)');
  gh.addColorStop(1,'rgba(120,170,225,0.05)');
  ctx.fillStyle=gh; ctx.fillRect(0,scanY-90,w,112);
  softGlow(ctx,scanX,scanY,38,'rgba(150,200,245,0.09)','transparent');
  ctx.restore();

  const reticle=(x: number,y: number,r: number,rot: number,lock: boolean)=>{
    ctx.save(); ctx.globalCompositeOperation='lighter';
    softGlow(ctx,x,y,r*(lock?1.25:1.15),(lock?'rgba(170,210,255,0.10)':'rgba(88,146,224,0.11)'),'transparent');
    ctx.restore();
    const main=lock?HI(0.30):RT(0.3);
    ctx.strokeStyle=main; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.stroke();
    ctx.strokeStyle=RT(lock?0.38:0.22); ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(x,y,r*0.52,0,TAU); ctx.stroke();
    ctx.strokeStyle=RT(lock?0.4:0.24); ctx.lineWidth=1; ctx.beginPath();
    for(let k=0;k<8;k++){ const a=rot+k/8*TAU; const r0=r*0.82, r1=(k%2===0)?r*0.98:r*0.9; ctx.moveTo(x+Math.cos(a)*r0,y+Math.sin(a)*r0); ctx.lineTo(x+Math.cos(a)*r1,y+Math.sin(a)*r1); }
    ctx.stroke();
    const ext=r*(lock?0.24:0.42), gap=r*0.2;
    ctx.strokeStyle=main; ctx.lineWidth=1; ctx.beginPath();
    ctx.moveTo(x-r-ext,y); ctx.lineTo(x-gap,y);
    ctx.moveTo(x+gap,y); ctx.lineTo(x+r+ext,y);
    ctx.moveTo(x,y-r-ext); ctx.lineTo(x,y-gap);
    ctx.moveTo(x,y+gap); ctx.lineTo(x,y+r+ext);
    ctx.stroke();
    const bs=r*1.28, bl=r*0.3, cn=[[-1,-1],[1,-1],[1,1],[-1,1]];
    ctx.strokeStyle=RT(lock?0.38:0.2); ctx.lineWidth=1; ctx.beginPath();
    for(let c=0;c<4;c++){ const sx=cn[c][0], sy=cn[c][1], bx2=x+sx*bs, by2=y+sy*bs; ctx.moveTo(bx2-sx*bl,by2); ctx.lineTo(bx2,by2); ctx.lineTo(bx2,by2-sy*bl); }
    ctx.stroke();
    const oa=rot*1.2, orx=x+Math.cos(oa)*r*1.1, ory=y+Math.sin(oa)*r*1.1;
    ctx.save(); ctx.translate(orx,ory); ctx.rotate(oa); ctx.strokeStyle=HI(lock?0.3:0.24); ctx.lineWidth=1; ctx.strokeRect(-2.5,-2.5,5,5); ctx.restore();
    ctx.fillStyle=main; ctx.beginPath(); ctx.arc(x,y,lock?2:1.3,0,TAU); ctx.fill();
  };

  const npos: Array<[number, number, VectorNode]>=[];
  for(let i=0;i<CFG.nodes.length;i++){
    const n=CFG.nodes[i];
    const x=(n.bx+Math.sin(t*n.driftF+n.phase)*n.driftA)*w;
    const y=(n.by+Math.cos(t*n.driftF*0.85+n.phase)*n.driftA)*h;
    npos.push([x,y,n]);
  }

  if(npos.length>=2){
    const A=npos[0], Bn=npos[1];
    ctx.setLineDash([6,8]); ctx.strokeStyle=B(0.09); ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(A[0],A[1]); ctx.lineTo(Bn[0],Bn[1]); ctx.stroke();
    ctx.setLineDash([]);
    const u=(t*0.05)%1;
    const sxp=A[0]+(Bn[0]-A[0])*u, syp=A[1]+(Bn[1]-A[1])*u;
    ctx.save(); ctx.globalCompositeOperation='lighter';
    softGlow(ctx,sxp,syp,7,'rgba(170,214,255,0.22)','transparent');
    ctx.fillStyle=HI(0.42); ctx.beginPath(); ctx.arc(sxp,syp,1.3,0,TAU); ctx.fill();
    ctx.restore();
  }

  for(let i=0;i<npos.length;i++){
    const n=npos[i][2];
    reticle(npos[i][0],npos[i][1],n.r+Math.sin(t*0.4+n.phase)*2,t*n.spinS*n.spin+n.phase,false);
  }
  reticle(mx*w,my*h,36+Math.sin(t*0.6)*3,t*0.18,true);

  ctx.strokeStyle=B(0.18); ctx.lineWidth=1.4;
  const m2=26, bl2=28; ctx.beginPath();
  ctx.moveTo(m2,m2+bl2); ctx.lineTo(m2,m2); ctx.lineTo(m2+bl2,m2);
  ctx.moveTo(w-m2-bl2,m2); ctx.lineTo(w-m2,m2); ctx.lineTo(w-m2,m2+bl2);
  ctx.moveTo(w-m2,h-m2-bl2); ctx.lineTo(w-m2,h-m2); ctx.lineTo(w-m2-bl2,h-m2);
  ctx.moveTo(m2+bl2,h-m2); ctx.lineTo(m2,h-m2); ctx.lineTo(m2,h-m2-bl2);
  ctx.stroke();

  const vg=ctx.createRadialGradient(cx,cy*0.92,Math.min(w,h)*0.22,cx,cy,diag*0.62);
  vg.addColorStop(0,'rgba(2,5,12,0.07)');
  vg.addColorStop(0.72,'rgba(2,5,12,0.24)');
  vg.addColorStop(1,'rgba(1,3,8,0.70)');
  ctx.fillStyle=vg; ctx.fillRect(0,0,w,h);
};
