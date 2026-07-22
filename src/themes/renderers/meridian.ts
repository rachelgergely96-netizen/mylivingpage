import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { softGlow, star4 } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

const CFG=(function(){
  const rnd=createSeededRandom(20240517);
  const masses=[
    {x:0.30,y:0.34,r:0.44,c:"rgba(28,88,108,0.28)"},
    {x:0.72,y:0.62,r:0.40,c:"rgba(18,68,94,0.24)"},
    {x:0.50,y:0.50,r:0.34,c:"rgba(40,110,126,0.16)"}
  ];
  const stars=[];
  const layers=[{count:28,depth:0.25,size:0.7,alpha:0.42},{count:20,depth:0.55,size:1.1,alpha:0.58},{count:11,depth:0.9,size:1.7,alpha:0.70}];
  for (let li=0;li<layers.length;li++){
    const L=layers[li];
    for (let i=0;i<L.count;i++){
      stars.push({x:rnd(),y:rnd(),depth:L.depth,size:L.size*(0.6+rnd()*0.9),base:L.alpha*(0.5+rnd()*0.5),phase:rnd()*Math.PI*2,tw:0.5+rnd()*1.6,bright:rnd()>0.9});
    }
  }
  const orbits=[];
  for (let r=0;r<5;r++){
    const n=3+Math.floor(rnd()*4);
    const arr=[];
    for (let m=0;m<n;m++) arr.push({phase:rnd()*Math.PI*2,size:1.3+rnd()*1.9});
    orbits.push({radiusFactor:0.12+r*0.052,speed:(0.05+rnd()*0.08)*(r%2===0?1:-1),markers:arr});
  }
  const arcs=[];
  for (let i=0;i<5;i++){
    arcs.push({radiusFactor:0.185+i*0.045,start:rnd()*Math.PI*2,span:0.4+rnd()*0.7,speed:(0.06+rnd()*0.09)*(i%2===0?1:-1),width:3-i*0.35,alpha:0.28-i*0.03});
  }
  return {masses,stars,orbits,arcs};
})();

export const renderMeridian: ThemeRenderer = (ctx,w,h,t,mx,my)=>{
  const minSide = Math.max(1, Math.min(w,h));
  const cx = w*0.5;
  const cy = h*(0.52 + (my-0.5)*0.05);
  const px = mx-0.5, py = my-0.5;
  const cl = (v: number,a: number,b: number)=> v<a?a:(v>b?b:v);
  const northAngle = -Math.PI/2 + px*0.4 + Math.sin(t*0.18)*0.12;

  // 1. Atmosphere base wash (translucent, over the opaque theme fill)
  const bg = ctx.createLinearGradient(0,0,0,h);
  bg.addColorStop(0,"rgba(12,28,38,0.55)");
  bg.addColorStop(0.55,"rgba(6,16,23,0.28)");
  bg.addColorStop(1,"rgba(2,5,9,0.62)");
  ctx.fillStyle=bg; ctx.fillRect(0,0,w,h);

  // drifting teal atmosphere masses (additive, radii trimmed for fillrate)
  ctx.globalCompositeOperation="lighter";
  for (let i=0;i<CFG.masses.length;i++){
    const m=CFG.masses[i];
    const dx=(m.x + fbm(t*0.04+i*3.1, i*1.7, 2)*0.03)*w;
    const dy=(m.y + fbm(i*2.3, t*0.035+i, 2)*0.03)*h;
    softGlow(ctx,dx,dy,m.r*minSide,m.c,"transparent");
  }
  ctx.globalCompositeOperation="source-over";

  // 2. Parallax navigation star field (additive, twinkling, peaks capped)
  ctx.globalCompositeOperation="lighter";
  for (let i=0;i<CFG.stars.length;i++){
    const s=CFG.stars[i];
    const sx=s.x*w - px*s.depth*minSide*0.04;
    const sy=s.y*h - py*s.depth*minSide*0.04;
    const tw=0.5+0.5*Math.sin(t*s.tw+s.phase);
    const a=s.base*(0.35+0.65*tw);
    ctx.beginPath(); ctx.arc(sx,sy,s.size,0,TAU);
    ctx.fillStyle="rgba(190,230,240,"+a.toFixed(3)+")"; ctx.fill();
    if (s.bright && tw>0.82){
      star4(ctx,sx,sy,s.size*5*tw,s.size*0.55,"rgba(178,224,240,"+(a*0.45).toFixed(3)+")");
    }
  }
  ctx.globalCompositeOperation="source-over";

  // 3. Rotating globe wireframe (meridians + latitudes + limb)
  const Rg=minSide*0.44;
  const gRot=t*0.05 + px*0.35;
  for (let i=0;i<8;i++){
    const ph=(i/8)*Math.PI + gRot;
    const rx=Math.max(minSide*0.0015, Math.abs(Math.sin(ph))*Rg);
    ctx.beginPath(); ctx.ellipse(cx,cy,rx,Rg,0,0,TAU);
    ctx.strokeStyle="rgba(96,180,198,"+(0.06*(0.35+rx/Rg*0.65)).toFixed(3)+")";
    ctx.lineWidth=1; ctx.stroke();
  }
  for (let i=1;i<7;i++){
    const lat=(i/7-0.5)*Math.PI;
    const yy=cy-Math.sin(lat)*Rg;
    const rxx=Math.cos(lat)*Rg;
    ctx.beginPath(); ctx.ellipse(cx,yy,rxx,rxx*0.16,0,0,TAU);
    ctx.strokeStyle="rgba(110,196,210,0.05)"; ctx.lineWidth=1; ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(cx,cy,Rg,0,TAU);
  ctx.strokeStyle="rgba(117,199,212,0.08)"; ctx.lineWidth=1.2; ctx.stroke();

  // 4. Compass halo (additive, radius + alpha reduced)
  ctx.globalCompositeOperation="lighter";
  softGlow(ctx,cx,cy,minSide*0.36,"rgba(38,116,136,0.15)","transparent");
  ctx.globalCompositeOperation="source-over";

  // graduated bezel band
  const Ro=minSide*0.375, Rin=minSide*0.335;
  ctx.beginPath(); ctx.arc(cx,cy,Ro,0,TAU);
  ctx.strokeStyle="rgba(117,199,212,0.30)"; ctx.lineWidth=1.4; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,Rin,0,TAU);
  ctx.strokeStyle="rgba(117,199,212,0.16)"; ctx.lineWidth=1; ctx.stroke();

  // degree ticks (36 graduations, cheap sin shimmer, cardinal peak capped)
  for (let i=0;i<36;i++){
    const ang=northAngle+(i/36)*TAU;
    const card=(i%9===0), major=(i%3===0);
    const inR=card?Rin-minSide*0.030:(major?Rin-minSide*0.019:Rin-minSide*0.009);
    const ca=Math.cos(ang), sa=Math.sin(ang);
    const shim=0.80+0.20*Math.sin(t*0.5+i*0.7);
    ctx.beginPath();
    ctx.moveTo(cx+ca*inR,cy+sa*inR);
    ctx.lineTo(cx+ca*Ro,cy+sa*Ro);
    const baseA=card?0.52:(major?0.38:0.2);
    ctx.strokeStyle=(card?"rgba(190,232,244,":(major?"rgba(140,212,224,":"rgba(108,190,205,"))+cl(baseA*shim,0,1).toFixed(3)+")";
    ctx.lineWidth=card?2:(major?1.4:0.8);
    ctx.stroke();
  }

  // concentric range rings
  for (let r=0;r<4;r++){
    const rr=minSide*(0.10+r*0.058);
    ctx.beginPath(); ctx.arc(cx,cy,rr,0,TAU);
    ctx.strokeStyle="rgba(90,175,192,"+(0.16-r*0.028).toFixed(3)+")";
    ctx.lineWidth=1; ctx.stroke();
  }

  // compass spokes (additive)
  ctx.globalCompositeOperation="lighter";
  for (let i=0;i<16;i++){
    const ang=northAngle+(i/16)*TAU;
    const even=i%2===0;
    const inner=minSide*(even?0.055:0.11);
    const outer=minSide*(even?0.325:0.255);
    const ca=Math.cos(ang), sa=Math.sin(ang);
    ctx.beginPath();
    ctx.moveTo(cx+ca*inner,cy+sa*inner);
    ctx.lineTo(cx+ca*outer,cy+sa*outer);
    ctx.strokeStyle=even?"rgba(120,205,222,0.26)":"rgba(88,162,182,0.13)";
    ctx.lineWidth=even?1.6:0.9; ctx.stroke();
  }
  ctx.globalCompositeOperation="source-over";

  // 5. Rotating bearing arcs w/ layered glow + travelling spark (additive, capped)
  ctx.globalCompositeOperation="lighter";
  for (let i=0;i<CFG.arcs.length;i++){
    const A=CFG.arcs[i];
    const rr=minSide*A.radiusFactor;
    const st=A.start+t*A.speed+northAngle*0.2;
    const en=st+A.span;
    ctx.beginPath(); ctx.arc(cx,cy,rr,st,en);
    ctx.strokeStyle="rgba(84,188,210,"+(A.alpha*0.5).toFixed(3)+")";
    ctx.lineWidth=A.width+4; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx,cy,rr,st,en);
    ctx.strokeStyle="rgba(162,226,240,"+A.alpha.toFixed(3)+")";
    ctx.lineWidth=A.width; ctx.stroke();
    const sp=st+(en-st)*(0.5+0.5*Math.sin(t*0.8+i*1.7));
    const spx=cx+Math.cos(sp)*rr, spy=cy+Math.sin(sp)*rr;
    softGlow(ctx,spx,spy,minSide*0.020,"rgba(200,240,252,0.36)","transparent");
    ctx.beginPath(); ctx.arc(spx,spy,1.6,0,TAU);
    ctx.fillStyle="rgba(214,244,252,0.66)"; ctx.fill();
  }
  ctx.globalCompositeOperation="source-over";

  // 6. Pulsing orbital markers across five rings (additive, peak capped)
  ctx.globalCompositeOperation="lighter";
  for (let o=0;o<CFG.orbits.length;o++){
    const O=CFG.orbits[o];
    const rr=minSide*O.radiusFactor;
    for (let m=0;m<O.markers.length;m++){
      const M=O.markers[m];
      const ang=northAngle+M.phase+t*O.speed;
      const mxx=cx+Math.cos(ang)*rr, myy=cy+Math.sin(ang)*rr;
      const pulse=0.55+0.45*Math.sin(t*1.3+M.phase*3);
      ctx.beginPath(); ctx.arc(mxx,myy,M.size+2.6,0,TAU);
      ctx.fillStyle="rgba(78,178,200,"+(0.10*pulse).toFixed(3)+")"; ctx.fill();
      ctx.beginPath(); ctx.arc(mxx,myy,M.size,0,TAU);
      ctx.fillStyle="rgba(164,224,238,"+(0.22+0.42*pulse).toFixed(3)+")"; ctx.fill();
    }
  }
  ctx.globalCompositeOperation="source-over";

  // 7. Lit north needle (hero) with tamed tip highlight + glow
  const needleLen=minSide*0.30, tailLen=minSide*0.205;
  const nx=cx+Math.cos(northAngle)*needleLen, ny=cy+Math.sin(northAngle)*needleLen;
  const tx=cx-Math.cos(northAngle)*tailLen, ty=cy-Math.sin(northAngle)*tailLen;
  const perp=northAngle+Math.PI/2, halfW=minSide*0.017;
  const lx=cx+Math.cos(perp)*halfW, ly=cy+Math.sin(perp)*halfW;
  const rxp=cx-Math.cos(perp)*halfW, ryp=cy-Math.sin(perp)*halfW;
  ctx.globalCompositeOperation="lighter";
  softGlow(ctx,nx,ny,minSide*0.085,"rgba(255,238,212,0.16)","transparent");
  softGlow(ctx,cx,cy,minSide*0.05,"rgba(118,214,234,0.30)","transparent");
  ctx.globalCompositeOperation="source-over";
  const ng=ctx.createLinearGradient(cx,cy,nx,ny);
  ng.addColorStop(0,"rgba(150,220,235,0.48)");
  ng.addColorStop(0.65,"rgba(214,240,248,0.66)");
  ng.addColorStop(1,"rgba(250,244,228,0.74)");
  ctx.beginPath(); ctx.moveTo(nx,ny); ctx.lineTo(lx,ly); ctx.lineTo(rxp,ryp); ctx.closePath();
  ctx.fillStyle=ng; ctx.fill();
  ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(lx,ly); ctx.lineTo(rxp,ryp); ctx.closePath();
  ctx.fillStyle="rgba(48,108,128,0.6)"; ctx.fill();
  ctx.beginPath(); ctx.moveTo(nx,ny); ctx.lineTo(lx,ly);
  ctx.strokeStyle="rgba(240,248,244,0.4)"; ctx.lineWidth=1; ctx.stroke();

  // central hub (radial material shading, highlight capped)
  const hr=minSide*0.022;
  const hg=ctx.createRadialGradient(cx-hr*0.3,cy-hr*0.3,hr*0.1,cx,cy,hr*1.1);
  hg.addColorStop(0,"rgba(226,246,252,0.78)");
  hg.addColorStop(0.5,"rgba(120,205,225,0.72)");
  hg.addColorStop(1,"rgba(28,78,98,0.6)");
  ctx.beginPath(); ctx.arc(cx,cy,hr,0,TAU); ctx.fillStyle=hg; ctx.fill();
  ctx.beginPath(); ctx.arc(cx,cy,hr,0,TAU);
  ctx.strokeStyle="rgba(176,230,242,0.5)"; ctx.lineWidth=1; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,minSide*0.006,0,TAU);
  ctx.fillStyle="rgba(18,40,54,0.9)"; ctx.fill();

  // needle-tip soft glow (dimmed; no triple-stacked additive blowout)
  ctx.globalCompositeOperation="lighter";
  star4(ctx,nx,ny,minSide*0.042*(0.9+0.1*Math.sin(t*2.1)),1.3,"rgba(252,242,222,0.5)");
  ctx.globalCompositeOperation="source-over";

  // 8. Vignette seat
  const vg=ctx.createRadialGradient(cx,cy,minSide*0.32,cx,cy,Math.max(w,h)*0.78);
  vg.addColorStop(0,"rgba(0,0,0,0)");
  vg.addColorStop(1,"rgba(1,3,6,0.55)");
  ctx.fillStyle=vg; ctx.fillRect(0,0,w,h);
};
