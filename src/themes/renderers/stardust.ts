import { createSeededRandom } from "../shared/random";
import { finiteClamp, resolveThemeMotion, storyStepWeight } from "../shared/motion";
import { softGlow } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

const CFG=(function(){
  const rnd=createSeededRandom(70714);
  const T2=Math.PI*2;
  const counts=[74,54,38];
  const layers=[];
  for(let li=0;li<3;li++){
    const arr=[];
    for(let i=0;i<counts[li];i++){
      arr.push({x:rnd(),y:rnd(),ph:rnd()*T2,tw:0.35+rnd()*0.95,sz:rnd(),bright:rnd(),warm:rnd()<0.2});
    }
    layers.push(arr);
  }
  const nebCols=[[152,122,255],[112,150,255],[122,214,255],[255,120,198],[255,206,150],[92,92,220]];
  const neb=[];
  for(let i=0;i<nebCols.length;i++){
    neb.push({col:nebCols[i],ox:rnd(),oy:rnd(),dr:0.25+rnd()*0.32,dph:rnd()*T2,dsp:0.15+rnd()*0.4,damp:0.02+rnd()*0.045,a:0.12+rnd()*0.13,opph:rnd()*T2,opsp:0.08+rnd()*0.2});
  }
  const voids=[];
  for(let i=0;i<3;i++){
    voids.push({ox:(rnd()-0.5)*0.95,oy:(rnd()-0.5)*0.8,r:0.11+rnd()*0.12,dph:rnd()*T2,dsp:0.1+rnd()*0.22,a:0.32+rnd()*0.26});
  }
  const puffs=[];
  for(let i=0;i<30;i++){
    puffs.push({a:rnd()*T2,rr:rnd(),sz:rnd(),warm:rnd()<0.3,hue:rnd()});
  }
  const knots=[];
  for(let i=0;i<108;i++){
    knots.push({arm:i%4,prog:rnd(),spread:(rnd()-0.5),ph:rnd()*T2,sz:rnd(),warm:rnd()<0.24,halo:rnd()<0.15});
  }
  const arms=[];
  for(let i=0;i<4;i++){
    arms.push({bph:rnd()*T2,bsp:0.13+rnd()*0.2});
  }
  const shoot=[];
  for(let i=0;i<3;i++){
    shoot.push({period:7+rnd()*7,offset:rnd()*12,sx:0.42+rnd()*0.45,sy:rnd()*0.35,ang:-0.45-rnd()*0.6,len:rnd(),speed:0.65+rnd()*0.5});
  }
  return {layers:layers,neb:neb,voids:voids,puffs:puffs,knots:knots,arms:arms,shoot:shoot};
})();

export const renderStardust: ThemeRenderer = (ctx,w,h,t,mx,my,_deltaSeconds,motion)=>{
  const M=resolveThemeMotion(motion);
  const minSide=Math.min(w,h);
  const maxSide=Math.max(w,h);
  const px=finiteClamp(mx,0,1,0.5)-0.5;
  const py=finiteClamp(my,0,1,0.5)-0.5;
  const velocity=finiteClamp(M.scrollVelocity/4,-1,1);
  const storyGate=M.sectionCount>0?1:0;
  const energy=finiteClamp(Math.abs(velocity)*0.6+M.pointerSpeed*0.22,0,0.6);
  const focusPull=M.hasFocus?0.02:0;
  const cx=w*0.78+px*minSide*0.03+(M.focusX-0.5)*minSide*focusPull;
  const cy=h*0.42+py*minSide*0.025+(M.focusY-0.5)*minSide*focusPull;
  const turn=t*0.016+M.storyProgress*0.15+velocity*0.014;
  const drift=t*0.02;
  const sp=(prog: number,arm: number,off: number,tn: number)=>{
    const radius=minSide*(0.03+prog*0.42)+off;
    const angle=arm*(TAU/4)+prog*TAU*1.34+tn;
    return {x:cx+Math.cos(angle)*radius,y:cy+Math.sin(angle)*radius*0.7};
  };
  ctx.save();
  try{
    const space=ctx.createLinearGradient(0,0,w,h);
    space.addColorStop(0,"rgba(4,5,16,0.55)");
    space.addColorStop(0.44,"rgba(9,11,30,0.32)");
    space.addColorStop(0.76,"rgba(28,20,60,0.42)");
    space.addColorStop(1,"rgba(7,8,22,0.5)");
    ctx.fillStyle=space;
    ctx.fillRect(0,0,w,h);

    // Luminous nebula gas (screen) with per-cloud opacity breathing; breathe amplitude
    // lifts subtly with scroll/pointer energy. Seeded size wobble (no per-frame fbm).
    ctx.save();
    ctx.globalCompositeOperation="screen";
    for(let i=0;i<CFG.neb.length;i++){
      const n=CFG.neb[i];
      const ang=n.dph+drift*n.dsp;
      const rad=minSide*(0.1+n.dr*0.4);
      const nx=cx+Math.cos(ang)*rad*0.7+(n.ox-0.5)*minSide*0.25;
      const ny=cy+Math.sin(ang)*rad*0.5+(n.oy-0.5)*minSide*0.22;
      const wob=1+0.14*Math.sin(drift*0.7+n.dph);
      const R=minSide*(0.18+n.damp*6)*wob;
      const breathe=finiteClamp(0.72+0.42*(1+energy*0.5)*Math.sin(t*n.opsp+n.opph),0.25,1.2);
      const a0=n.a*breathe;
      const c=n.col;
      const g=ctx.createRadialGradient(nx,ny,0,nx,ny,R);
      g.addColorStop(0,"rgba("+c[0]+","+c[1]+","+c[2]+","+a0+")");
      g.addColorStop(0.42,"rgba("+c[0]+","+c[1]+","+c[2]+","+(a0*0.42)+")");
      g.addColorStop(1,"rgba("+c[0]+","+c[1]+","+c[2]+",0)");
      ctx.fillStyle=g;
      ctx.beginPath();ctx.arc(nx,ny,R,0,TAU);ctx.fill();
    }
    ctx.restore();

    // Dark dust voids (normal blend) carve depth so the gas reads volumetric.
    ctx.save();
    for(let i=0;i<CFG.voids.length;i++){
      const v=CFG.voids[i];
      const ang=v.dph+drift*v.dsp;
      const vx=cx+v.ox*minSide*0.34+Math.cos(ang)*minSide*0.03;
      const vy=cy+v.oy*minSide*0.3+Math.sin(ang)*minSide*0.025;
      const R=minSide*v.r;
      const g=ctx.createRadialGradient(vx,vy,0,vx,vy,R);
      g.addColorStop(0,"rgba(4,4,13,"+v.a+")");
      g.addColorStop(0.55,"rgba(4,4,13,"+(v.a*0.5)+")");
      g.addColorStop(1,"rgba(4,4,13,0)");
      ctx.fillStyle=g;
      ctx.beginPath();ctx.arc(vx,vy,R,0,TAU);ctx.fill();
    }
    ctx.restore();

    // Soft nebula puffs (screen) — round blooms only, seeded amplitude (no per-frame fbm).
    ctx.save();
    ctx.globalCompositeOperation="screen";
    for(let i=0;i<CFG.puffs.length;i++){
      const p=CFG.puffs[i];
      const a=p.a+turn*0.4;
      const rr=minSide*(0.05+p.rr*0.44);
      const bx=cx+Math.cos(a)*rr;
      const by=cy+Math.sin(a)*rr*0.72;
      const amp=finiteClamp(0.22+p.hue*0.38+0.12*Math.sin(drift*0.8+p.a*2.3),0,0.72);
      const R=minSide*(0.02+p.sz*0.055);
      const col=p.warm?"rgba(255,200,152,":(p.hue<0.5?"rgba(154,124,255,":"rgba(122,202,255,");
      softGlow(ctx,bx,by,R,col+(0.04+amp*0.14)+")","transparent");
    }
    ctx.restore();

    // Distant star fields — round dots with a gentle twinkle (no spikes).
    for(let li=0;li<3;li++){
      const layer=CFG.layers[li];
      const depth=(li+1)/3;
      const parX=px*minSide*(0.008+li*0.02);
      const parY=py*minSide*(0.006+li*0.015);
      for(let i=0;i<layer.length;i++){
        const s=layer[i];
        const x=s.x*w-parX+Math.sin(drift*0.2+s.ph)*1.5;
        const y=s.y*h-parY;
        const tw=0.5+0.5*Math.sin(t*s.tw+s.ph);
        const rw=0.4+0.6*finiteClamp(x/Math.max(w,1),0,1);
        const r=minSide*(0.0006+depth*0.0012)*(0.55+s.sz*0.9);
        const al=(0.09+tw*0.34)*rw*(0.5+depth*0.5);
        ctx.beginPath();ctx.arc(x,y,r,0,TAU);
        ctx.fillStyle=s.warm?"rgba(255,228,214,"+al+")":"rgba(214,224,255,"+al+")";
        ctx.fill();
        if(s.bright>0.87&&depth>0.5){
          ctx.save();ctx.globalCompositeOperation="screen";
          softGlow(ctx,x,y,r*(5+tw*5),"rgba(228,222,255,"+(0.18*tw*rw)+")","transparent");
          ctx.restore();
        }
      }
    }

    // Spiral arms (screen) — per-arm breathe over t; the active story chapter brightens
    // its arm (only when a real page story exists, so the calm rest frame is unchanged).
    ctx.save();
    ctx.globalCompositeOperation="screen";
    for(let arm=0;arm<4;arm++){
      ctx.beginPath();
      const N=46;
      for(let s=0;s<=N;s++){
        const prog=s/N;
        const wdt=minSide*(0.011+prog*0.034);
        const q=sp(prog,arm,wdt,turn);
        if(s===0)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);
      }
      for(let s=N;s>=0;s--){
        const prog=s/N;
        const wdt=minSide*(0.009+prog*0.026);
        const q=sp(prog,arm,-wdt,turn);
        ctx.lineTo(q.x,q.y);
      }
      ctx.closePath();
      const even=arm%2===0;
      const cw=storyStepWeight(M.storyProgress,arm,4)*storyGate;
      const g=ctx.createRadialGradient(cx,cy,minSide*0.02,cx,cy,minSide*0.48);
      g.addColorStop(0,even?"rgba(238,232,255,0.72)":"rgba(214,236,255,0.68)");
      g.addColorStop(0.28,even?"rgba(182,168,255,"+(0.36+cw*0.16)+")":"rgba(120,180,255,"+(0.32+cw*0.14)+")");
      g.addColorStop(0.62,even?"rgba(196,112,220,0.16)":"rgba(96,112,235,0.15)");
      g.addColorStop(1,"rgba(60,40,140,0)");
      const am=CFG.arms[arm];
      ctx.globalAlpha=finiteClamp(0.78+0.22*Math.sin(t*am.bsp+am.bph)+cw*0.18,0.4,1);
      ctx.fillStyle=g;ctx.fill();
    }
    ctx.globalAlpha=1;
    ctx.restore();

    // Dark dust lanes threading the arms (normal blend).
    ctx.save();
    ctx.lineCap="round";
    for(let arm=0;arm<4;arm++){
      ctx.beginPath();
      const N=44;
      for(let s=3;s<=N;s++){
        const prog=s/N;
        const q=sp(prog,arm,minSide*(0.004+prog*0.013),turn+0.08);
        if(s===3)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);
      }
      ctx.strokeStyle="rgba(6,5,20,0.4)";
      ctx.lineWidth=minSide*0.012;
      ctx.stroke();
    }
    ctx.restore();

    // Star-forming knots along the arms; pulse energy lifts subtly with page motion.
    ctx.save();
    ctx.globalCompositeOperation="screen";
    for(let i=0;i<CFG.knots.length;i++){
      const k=CFG.knots[i];
      const prog=0.06+k.prog*0.92;
      const spread=k.spread*minSide*(0.005+prog*0.02);
      const q=sp(prog,k.arm,spread,turn);
      const pulse=0.5+0.5*Math.sin(t*0.6+k.ph);
      const r=minSide*(0.0006+k.sz*0.0016)*(0.8+pulse*0.4*(1+energy*0.4));
      ctx.beginPath();ctx.arc(q.x,q.y,r,0,TAU);
      ctx.fillStyle=k.warm?"rgba(255,214,232,"+(0.24+pulse*0.4)+")":"rgba(206,220,255,"+(0.17+pulse*0.38)+")";
      ctx.fill();
      if(k.halo){
        softGlow(ctx,q.x,q.y,r*9,"rgba(226,214,255,"+(0.13+pulse*0.14)+")","transparent");
      }
    }
    ctx.restore();

    // Galactic core — nested soft round blooms with a gentle flicker. Peak lightness is
    // warm-capped so the host bright-pass bloom keeps a violet/warm core, not a flat white disc.
    const coreR=minSide*0.066;
    ctx.save();
    ctx.globalCompositeOperation="screen";
    const flick=0.85+0.15*Math.sin(t*1.4);
    const cg=ctx.createRadialGradient(cx,cy,0,cx,cy,coreR*4);
    cg.addColorStop(0,"rgba(255,250,236,0.86)");
    cg.addColorStop(0.1,"rgba(236,224,255,0.76)");
    cg.addColorStop(0.36,"rgba(170,126,246,0.3)");
    cg.addColorStop(1,"rgba(90,58,190,0)");
    ctx.fillStyle=cg;ctx.beginPath();ctx.arc(cx,cy,coreR*4,0,TAU);ctx.fill();
    const cg2=ctx.createRadialGradient(cx,cy,0,cx,cy,coreR*1.5*flick);
    cg2.addColorStop(0,"rgba(255,238,216,0.66)");
    cg2.addColorStop(0.5,"rgba(255,235,212,0.32)");
    cg2.addColorStop(1,"rgba(255,230,204,0)");
    ctx.fillStyle=cg2;ctx.beginPath();ctx.arc(cx,cy,coreR*1.5*flick,0,TAU);ctx.fill();
    const cg3=ctx.createRadialGradient(cx,cy,0,cx,cy,coreR*2.4);
    cg3.addColorStop(0,"rgba(248,240,255,"+(0.3*flick)+")");
    cg3.addColorStop(0.5,"rgba(210,186,255,"+(0.12*flick)+")");
    cg3.addColorStop(1,"rgba(160,130,240,0)");
    ctx.fillStyle=cg3;ctx.beginPath();ctx.arc(cx,cy,coreR*2.4,0,TAU);ctx.fill();
    ctx.restore();

    // Faint galactic disk rings (elliptical) — structure, not light bars; tilt eases with scroll.
    ctx.save();
    ctx.globalCompositeOperation="screen";
    ctx.translate(cx,cy);
    ctx.rotate(-0.22+velocity*0.02);
    ctx.scale(1,0.26);
    ctx.beginPath();ctx.arc(0,0,minSide*0.24,0,TAU);
    ctx.strokeStyle="rgba(202,192,255,0.16)";
    ctx.lineWidth=Math.max(1,minSide*0.0022);ctx.stroke();
    ctx.beginPath();ctx.arc(0,0,minSide*0.33,0,TAU);
    ctx.strokeStyle="rgba(150,180,255,0.08)";
    ctx.lineWidth=Math.max(1,minSide*0.0016);ctx.stroke();
    ctx.restore();

    // Shooting stars as soft round comets: glowing head + a very short feathered trail.
    ctx.save();
    ctx.globalCompositeOperation="screen";
    for(let i=0;i<CFG.shoot.length;i++){
      const s=CFG.shoot[i];
      const local=((t+s.offset)%s.period)/s.period;
      if(local<0.15){
        const prog=local/0.15;
        const fade=Math.sin(prog*Math.PI);
        const sx=s.sx*w+prog*maxSide*0.42*s.speed*Math.cos(s.ang);
        const sy=s.sy*h+prog*maxSide*0.42*s.speed*Math.sin(s.ang);
        const tail=minSide*(0.03+s.len*0.03);
        const dx=Math.cos(s.ang),dy=Math.sin(s.ang);
        for(let j=1;j<=3;j++){
          const f=j/3;
          const tx=sx-dx*tail*f;
          const ty=sy-dy*tail*f;
          softGlow(ctx,tx,ty,minSide*(0.012-0.002*j)*(0.6+fade*0.6),"rgba(206,206,255,"+(0.12*fade*(1-f*0.6))+")","transparent");
        }
        softGlow(ctx,sx,sy,minSide*0.014*(0.5+fade*0.7),"rgba(255,244,226,"+(0.46*fade)+")","transparent");
        ctx.beginPath();ctx.arc(sx,sy,Math.max(0.6,minSide*0.0022*(0.5+fade)),0,TAU);
        ctx.fillStyle="rgba(255,250,238,"+(0.78*fade)+")";ctx.fill();
      }
    }
    ctx.restore();

    const clr=ctx.createLinearGradient(0,0,w*0.62,0);
    clr.addColorStop(0,"rgba(5,5,16,0.9)");
    clr.addColorStop(0.55,"rgba(5,5,16,0.5)");
    clr.addColorStop(1,"rgba(5,5,16,0)");
    ctx.fillStyle=clr;ctx.fillRect(0,0,w*0.64,h);

    const vg=ctx.createRadialGradient(cx,cy,minSide*0.15,w*0.6,h*0.5,maxSide*0.85);
    vg.addColorStop(0,"rgba(0,0,0,0)");
    vg.addColorStop(1,"rgba(0,0,0,0.5)");
    ctx.fillStyle=vg;ctx.fillRect(0,0,w,h);
  }finally{
    ctx.restore();
  }
};
