import { fbm, noise2D } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { softGlow } from "../shared/draw";
import { wrapSoft } from "../shared/wrap";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

const CFG=(function(){
  const rnd=createSeededRandom(20477);
  const P2=Math.PI*2;
  const hexUnit=[];
  for(let i=0;i<6;i++){const a=-Math.PI/2+i*(P2/6);hexUnit.push({x:Math.cos(a),y:Math.sin(a)});}
  const grime=[];
  for(let i=0;i<18;i++){grime.push({x:rnd(),y:rnd(),r:0.06+rnd()*0.16,s:rnd()*P2,sp:0.04+rnd()*0.08});}
  const sweeps=[];
  for(let i=0;i<3;i++){sweeps.push({sp:0.018+i*0.011+rnd()*0.009,ph:rnd(),band:0.16+rnd()*0.10,intensity:0.032+rnd()*0.026,tilt:-0.22+i*0.05});}
  const motes=[];
  for(let i=0;i<7;i++){motes.push({x:rnd(),y:rnd(),r:5+rnd()*9,sp:0.02+rnd()*0.05,ph:rnd()*P2,amp:0.02+rnd()*0.04,depth:0.4+rnd()*0.6,tw:0.5+rnd()*1.4});}
  return {hexUnit,grime,sweeps,motes};
})();

export const renderBastion: ThemeRenderer = (ctx,w,h,t,mx,my)=>{
  if(!(w>0)||!(h>0)) return;
  const px=mx*w, py=my*h;
  const cxp=mx-0.5, cyp=my-0.5;
  const minWH=Math.min(w,h);
  const hu=CFG.hexUnit;
  const hexPath=(r:number)=>{
    ctx.beginPath();
    for(let i=0;i<6;i++){
      const vx=hu[i].x*r, vy=hu[i].y*r;
      if(i===0){ctx.moveTo(vx,vy);}else{ctx.lineTo(vx,vy);}
    }
    ctx.closePath();
  };
  // Cached unit glow gradients (built once/frame, reused for every grime/mote/energized cell
  // via translate+scale) — replaces the ~90-130 per-frame createRadialGradient allocations.
  const softUnit=(r:number,g:number,b:number)=>{
    const gr=ctx.createRadialGradient(0,0,0,0,0,1);
    gr.addColorStop(0,`rgba(${r},${g},${b},1)`);
    gr.addColorStop(0.34,`rgba(${r},${g},${b},0.92)`);
    gr.addColorStop(1,`rgba(${r},${g},${b},0)`);
    return gr;
  };
  const gGrimeLight=softUnit(72,94,122);
  const gGrimeDark=softUnit(2,3,5);
  const gMote=softUnit(172,198,230);
  const gEnergized=softUnit(150,196,246);
  const blob=(grad:CanvasGradient,x:number,y:number,rad:number,alpha:number,comp:GlobalCompositeOperation)=>{
    if(!(rad>0)||!(alpha>0)) return;
    ctx.save();
    ctx.globalCompositeOperation=comp;
    ctx.globalAlpha=alpha<1?alpha:1;
    ctx.translate(x,y);
    ctx.scale(rad,rad);
    ctx.fillStyle=grad;
    ctx.beginPath();
    ctx.arc(0,0,1,0,TAU);
    ctx.fill();
    ctx.restore();
  };

  // Atmospheric tint over the pre-painted steel-dark field
  const atmo=ctx.createLinearGradient(0,0,0,h);
  atmo.addColorStop(0,"rgba(20,29,42,0.55)");
  atmo.addColorStop(0.5,"rgba(8,12,19,0.16)");
  atmo.addColorStop(1,"rgba(3,4,6,0.78)");
  ctx.fillStyle=atmo;
  ctx.fillRect(0,0,w,h);

  // Soft, round volumetric bloom (no rays / no beams) — top glow eased so the header column stays legible
  ctx.globalCompositeOperation="lighter";
  softGlow(ctx,w*0.5,h*0.30,Math.max(w,h)*0.62,"rgba(52,70,96,0.18)","transparent");
  softGlow(ctx,w*0.5,-h*0.05,w*0.66,"rgba(120,150,190,0.09)","transparent");
  ctx.globalCompositeOperation="source-over";

  // Grime: gentle round light/dark blooms for steel texture (cached gradient, zero per-blob alloc)
  for(let i=0;i<CFG.grime.length;i++){
    const g=CFG.grime[i];
    const gx=(g.x+Math.sin(t*g.sp+g.s)*0.012)*w;
    const gy=(g.y+Math.cos(t*g.sp*0.8+g.s)*0.012)*h;
    const f=fbm(g.x*3+t*0.02,g.y*3,3);
    const a=0.04+(f*0.5+0.5)*0.08;
    if(f>0){
      blob(gGrimeLight,gx,gy,minWH*g.r,a,"lighter");
    }else{
      blob(gGrimeDark,gx,gy,minWH*g.r,a+0.05,"source-over");
    }
  }

  // === HEX-ARMOR LATTICE — the dominant read ===
  // radius from sqrt(area) keeps the cell count ~constant across any aspect ratio.
  const radius=Math.max(30,Math.sqrt(w*h)/20);
  const stepX=radius*1.6, stepY=radius*1.4;
  const bevel=ctx.createLinearGradient(0,-radius,0,radius);
  // tamed top-stop (0.55 alpha) so the per-hex sheen band no longer clips to white under the HD bloom
  bevel.addColorStop(0,"rgba(186,207,230,0.55)");
  bevel.addColorStop(0.16,"rgba(108,131,158,0.5)");
  bevel.addColorStop(0.5,"rgba(34,45,60,0.10)");
  bevel.addColorStop(0.84,"rgba(6,9,14,0.58)");
  bevel.addColorStop(1,"rgba(2,3,5,0.92)");
  const rows=Math.ceil(h/stepY)+2, cols=Math.ceil(w/stepX)+2;
  const mbR=radius*2.4;

  for(let row=-1;row<rows;row++){
    const cy=row*stepY;
    if(cy<-radius||cy>h+radius) continue;
    for(let col=-1;col<cols;col++){
      const cx=col*stepX+(row%2===0?0:stepX*0.5);
      if(cx<-radius||cx>w+radius) continue;
      const nz=noise2D(cx*0.012+t*0.045,cy*0.012-t*0.028);
      const pulse=0.5+0.5*Math.sin(t*0.9+col*0.4+row*0.35);
      const wave=Math.sin(t*1.15-(cx*0.010+cy*0.007));
      // sharpen the crest -> stronger, cleaner traveling seam-energy band
      const seamEnergy=wave>0?wave*wave:0;
      const dist=Math.hypot(cx-px,cy-py);
      const mb=dist<mbR?1-dist/mbR:0;
      const ohc=cy<h?Math.max(0,1-cy/h*1.1):0;
      const bright=0.30+(nz*0.5+0.5)*0.36+ohc*0.10+mb*0.30+pulse*0.06+seamEnergy*0.14;

      ctx.save();
      ctx.translate(cx,cy);
      // Base plate — capped lightness range keeps highlights from blooming to white
      hexPath(radius*0.94);
      const bl=6+(nz*0.5+0.5)*13+ohc*4+mb*8+seamEnergy*7;
      ctx.fillStyle=`hsla(${210+nz*10},${20+mb*10}%,${bl}%,0.94)`;
      ctx.fill();
      // Beveled armor sheen — capped alpha so the highlight band stops fighting overlaid text
      ctx.globalAlpha=Math.min(0.52,0.30+bright*0.34);
      ctx.fillStyle=bevel;
      ctx.fill();
      ctx.globalAlpha=1;
      // Seam energy — traveling wave + gentle pointer lift, clamped below pure white
      const seamA=0.12+pulse*0.05+mb*0.18+seamEnergy*0.32;
      const sr=Math.min(230,(160+seamEnergy*52+mb*28)|0);
      const sg=Math.min(236,(178+seamEnergy*48+mb*28)|0);
      const sb=Math.min(244,(196+seamEnergy*44+mb*28)|0);
      ctx.strokeStyle=`rgba(${sr},${sg},${sb},${seamA})`;
      ctx.lineWidth=1.2;
      ctx.stroke();

      // Energized cells: inner ring + soft round core glow (cached gradient; raised threshold => far fewer)
      if(pulse>0.9||mb>0.3||seamEnergy>0.88){
        let hot=mb;
        if(pulse>0.9){const v=(pulse-0.9)/0.10; if(v>hot)hot=v;}
        if(seamEnergy>0.88){const v=(seamEnergy-0.88)/0.12; if(v>hot)hot=v;}
        hexPath(radius*0.56);
        ctx.strokeStyle=`rgba(200,224,250,${0.09+hot*0.24})`;
        ctx.lineWidth=0.9;
        ctx.stroke();
        blob(gEnergized,0,0,radius*0.85,0.07+hot*0.22,"lighter");
      }
      ctx.restore();
    }
  }

  // Tactical sweeps — soft wide atmospheric bands only (no bright center core)
  ctx.globalCompositeOperation="lighter";
  for(let i=0;i<CFG.sweeps.length;i++){
    const s=CFG.sweeps[i];
    const prog=(t*s.sp+s.ph)%1;
    const cs=(-0.3+prog*1.6)*w;
    ctx.save();
    ctx.translate(cs+cxp*40,h*0.5);
    ctx.rotate(s.tilt);
    const band=s.band*w;
    const g=ctx.createLinearGradient(-band,0,band,0);
    g.addColorStop(0,"rgba(0,0,0,0)");
    g.addColorStop(0.5,`rgba(150,190,240,${s.intensity})`);
    g.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=g;
    ctx.fillRect(-band,-h*1.2,band*2,h*2.4);
    ctx.restore();
  }
  ctx.globalCompositeOperation="source-over";

  // Motes — few, low-alpha soft round embers drifting over the lattice (cached gradient)
  for(let i=0;i<CFG.motes.length;i++){
    const m=CFG.motes[i];
    // wrap intrinsic drift only (parallax added after) + fade at the seam — no teleport pop
    const wx=wrapSoft(m.x+Math.sin(t*m.sp+m.ph)*m.amp,1,0.05);
    const wy=wrapSoft(m.y+Math.cos(t*m.sp*0.9+m.ph)*m.amp,1,0.05);
    const x=(wx.u+cxp*0.06*m.depth)*w;
    const y=(wy.u+cyp*0.06*m.depth)*h;
    const tw=0.5+0.5*Math.sin(t*m.tw+m.ph*3);
    blob(gMote,x,y,m.r*(1.6+1.0*tw),(0.05+0.09*tw)*m.depth*wx.alpha*wy.alpha,"lighter");
  }

  // Pointer focus — a soft round glow, calmed so the pointer-centred rest frame isn't brightest where content sits
  ctx.globalCompositeOperation="lighter";
  softGlow(ctx,px,py,radius*2.4,"rgba(150,190,240,0.06)","transparent");
  softGlow(ctx,px,py,radius*0.75,"rgba(185,212,240,0.08)","transparent");
  ctx.globalCompositeOperation="source-over";

  // Vignette to seat the field
  const vig=ctx.createRadialGradient(w*0.5,h*0.46,minWH*0.2,w*0.5,h*0.5,Math.max(w,h)*0.78);
  vig.addColorStop(0,"rgba(0,0,0,0)");
  vig.addColorStop(0.7,"rgba(0,0,0,0)");
  vig.addColorStop(1,"rgba(2,3,5,0.72)");
  ctx.fillStyle=vig;
  ctx.fillRect(0,0,w,h);
};
