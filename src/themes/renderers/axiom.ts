import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { finiteClamp, resolveThemeMotion, storyStepWeight } from "../shared/motion";
import { softGlow } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

export const AXIOM_STORY_PATH = [0, 1, 2, 3, 7, 6, 5, 4] as const;

const STORY_INDEX_BY_NODE = AXIOM_STORY_PATH.reduce<number[]>((indices, node, index) => {
  indices[node] = index;
  return indices;
}, []);

export interface AxiomStoryPosition {
  fromNode: number;
  toNode: number;
  segmentProgress: number;
}

/** Locates a continuous page-story position along Axiom's connected graph path. */
export function resolveAxiomStoryPosition(
  storyProgress: number,
): AxiomStoryPosition {
  const position =
    finiteClamp(storyProgress, 0, 1) * (AXIOM_STORY_PATH.length - 1);
  const segmentIndex = Math.min(
    AXIOM_STORY_PATH.length - 2,
    Math.floor(position),
  );
  return {
    fromNode: AXIOM_STORY_PATH[segmentIndex],
    toNode: AXIOM_STORY_PATH[segmentIndex + 1],
    segmentProgress: position - segmentIndex,
  };
}

export function nodeForSection(section: string | null): number | null {
  switch (section) {
    case "summary":
      return 0;
    case "proof":
      return 1;
    case "testimonials":
      return 2;
    case "experience":
      return 3;
    case "projects":
      return 7;
    case "education":
      return 6;
    case "skills":
      return 5;
    case "certifications":
      return 4;
    default:
      return null;
  }
}

const CFG=(function(){
  const rand=createSeededRandom(0x4a10c2);
  const NODES=[
    {x:0.16,y:0.26,d:0.9},
    {x:0.34,y:0.20,d:0.4},
    {x:0.58,y:0.24,d:0.7},
    {x:0.78,y:0.18,d:0.3},
    {x:0.22,y:0.56,d:0.8},
    {x:0.46,y:0.48,d:0.55},
    {x:0.70,y:0.58,d:0.65},
    {x:0.86,y:0.42,d:0.35}
  ];
  const EDGES=[[0,1],[1,2],[2,3],[0,4],[1,5],[2,5],[2,6],[3,7],[4,5],[5,6],[6,7]];
  const STORY=[0,1,2,3,7,6,5,4];
  const SIBN=STORY_INDEX_BY_NODE;
  const NODE_PHASE=NODES.map(function(){return rand()*TAU;});
  const EDGE_PHASE=EDGES.map(function(){return rand()*TAU;});
  const ARCS=[
    {a:0,b:2,bulge:-0.34,phase:rand()},
    {a:1,b:6,bulge:0.30,phase:rand()},
    {a:4,b:7,bulge:-0.24,phase:rand()},
    {a:3,b:5,bulge:0.28,phase:rand()},
    {a:0,b:6,bulge:0.20,phase:rand()},
    {a:2,b:7,bulge:-0.26,phase:rand()}
  ];
  /* unified blueprint-blue depth pools (shrunk radius; centre pool dimmed under the reading column) */
  const POOLS=[
    {x:0.22,y:0.30,r:0.48,col:"70,120,220",spd:0.028,phase:0.0,par:0.05,ab:0.034,as:0.038},
    {x:0.74,y:0.28,r:0.42,col:"92,140,236",spd:0.022,phase:2.1,par:0.06,ab:0.040,as:0.045},
    {x:0.52,y:0.66,r:0.46,col:"60,108,206",spd:0.017,phase:4.3,par:0.04,ab:0.024,as:0.028}
  ];
  const LATTICE=[];
  for(let i=0;i<12;i++){
    LATTICE.push({x:rand(),y:rand(),phase:rand()*TAU,spd:0.2+rand()*0.5,amp:3+rand()*7,size:0.6+rand()*1.4,depth:0.15+rand()*0.7,tw:rand()*TAU,twSpd:0.3+rand()*1.0});
  }
  const MOTES=[];
  for(let i=0;i<30;i++){
    MOTES.push({x:rand(),y:rand(),layer:i%3,phase:rand()*TAU,spd:0.08+rand()*0.32,tw:rand()*TAU,twSpd:0.4+rand()*1.3,size:0.5+rand()*1.5,drift:0.006+rand()*0.02});
  }
  return {NODES:NODES,EDGES:EDGES,STORY:STORY,SIBN:SIBN,NODE_PHASE:NODE_PHASE,EDGE_PHASE:EDGE_PHASE,ARCS:ARCS,POOLS:POOLS,LATTICE:LATTICE,MOTES:MOTES};
})();
/* per-frame framing gradients cached here; rebuilt only when size/context changes */
interface GradientCache {
  ctx: CanvasRenderingContext2D | null;
  w: number;
  h: number;
  wash: CanvasGradient | null;
  grade: CanvasGradient | null;
  vig: CanvasGradient | null;
}

const GC: GradientCache={ctx:null,w:0,h:0,wash:null,grade:null,vig:null};

export const renderAxiom: ThemeRenderer = (ctx,w,h,t,mx,my,_deltaSeconds,motion)=>{
  const R=CFG;
  const M=resolveThemeMotion(motion);
  const mxo=mx-0.5, myo=my-0.5;
  const diag=Math.hypot(w,h)||1;
  const cl=function(v: number){return v<0?0:(v>1?1:v);};

  /* ---- page-motion signals (all 0/safe at rest) ---- */
  const vel=finiteClamp(M.scrollVelocity/3,-1,1,0);
  const auto=((((t*0.05)%1)+1)%1);
  const hasStory=M.sectionCount>0;
  const storyProgress=finiteClamp(hasStory?M.storyProgress:auto,0,1,auto);

  /* ---- node positions (drift + parallax; velocity adds gentle sway) ---- */
  const N=R.NODES.length;
  const nodes: Array<{ x: number; y: number }>=new Array(N);
  const swing=11+vel*4;
  for(let i=0;i<N;i++){
    const n=R.NODES[i], ph=R.NODE_PHASE[i], dep=0.6+n.d*0.8;
    nodes[i]={
      x:w*n.x+Math.sin(t*(0.22+i*0.017)+ph)*swing+mxo*(10+dep*16),
      y:h*n.y+Math.cos(t*(0.19+i*0.023)+ph)*(swing*0.82)+myo*(8+dep*12)
    };
  }

  /* ---- per-node story/chapter weight (active section lights up) ---- */
  const PL=R.STORY.length;
  const chap: number[]=new Array(N);
  for(let i=0;i<N;i++){chap[i]=cl(storyStepWeight(storyProgress,R.SIBN[i],PL));}

  /* ---- travelling proof pointer driven by page story (auto-advance fallback) ---- */
  const sp=storyProgress*(PL-1);
  const si=Math.min(PL-2,Math.max(0,Math.floor(sp)));
  const sfrac=sp-si;
  const na=nodes[R.STORY[si]], nb=nodes[R.STORY[si+1]];
  const markX=na.x+(nb.x-na.x)*sfrac;
  const markY=na.y+(nb.y-na.y)*sfrac;

  /* ---- cached framing gradients (rebuilt only on size/context change) ---- */
  if(GC.ctx!==ctx||GC.w!==w||GC.h!==h){
    GC.ctx=ctx;GC.w=w;GC.h=h;
    const wg=ctx.createLinearGradient(0,0,w*0.35,h);
    wg.addColorStop(0,"rgba(12,22,42,0.52)");
    wg.addColorStop(0.5,"rgba(7,14,27,0.30)");
    wg.addColorStop(1,"rgba(2,5,12,0.58)");
    GC.wash=wg;
    const gg=ctx.createLinearGradient(0,0,0,h);
    gg.addColorStop(0,"rgba(22,44,86,0.10)");
    gg.addColorStop(0.6,"rgba(6,14,30,0.06)");
    gg.addColorStop(1,"rgba(2,4,12,0.30)");
    GC.grade=gg;
    const vg=ctx.createRadialGradient(w*0.5,h*0.46,Math.min(w,h)*0.22,w*0.5,h*0.5,diag*0.64);
    vg.addColorStop(0,"rgba(0,0,0,0)");
    vg.addColorStop(1,"rgba(0,2,7,0.55)");
    GC.vig=vg;
  }

  /* ---- 1. atmospheric depth wash ---- */
  ctx.fillStyle=GC.wash!;
  ctx.fillRect(0,0,w,h);

  /* ---- 2. blueprint-blue depth pools (shrunk radius; centre pool dimmed for text) ---- */
  ctx.globalCompositeOperation="lighter";
  for(let i=0;i<R.POOLS.length;i++){
    const p=R.POOLS[i], dr=t*p.spd;
    const cx=(p.x+Math.sin(dr+p.phase)*0.04+mxo*p.par)*w;
    const cy=(p.y+Math.cos(dr*0.8+p.phase)*0.04+myo*p.par)*h;
    const br=cl(0.5+0.5*fbm(p.x*3+t*0.05,p.y*3-t*0.03,3)+vel*0.05);
    softGlow(ctx,cx,cy,p.r*diag*(0.66+br*0.24),"rgba("+p.col+","+(p.ab+br*p.as).toFixed(3)+")","transparent");
  }
  ctx.globalCompositeOperation="source-over";

  /* ---- 3. single blueprint grid (faded field) ---- */
  const step=44;
  const dX=(((t*3-mxo*30)%step)+step)%step;
  const dY=(((t*2-myo*24)%step)+step)%step;
  ctx.lineWidth=0.8;
  ctx.strokeStyle="rgba(120,155,215,0.035)";
  ctx.beginPath();
  for(let x=-dX;x<=w;x+=step){ctx.moveTo(x,0);ctx.lineTo(x,h);}
  for(let y=-dY;y<=h;y+=step){ctx.moveTo(0,y);ctx.lineTo(w,y);}
  ctx.stroke();
  const major=step*4;
  /* major lines need their own wrap period — reusing the minor-step phase made them jump a full step at every wrap */
  const dXM=(((t*3-mxo*30)%major)+major)%major;
  const dYM=(((t*2-myo*24)%major)+major)%major;
  ctx.lineWidth=1.0;
  ctx.strokeStyle="rgba(140,180,255,0.06)";
  ctx.beginPath();
  for(let x=-dXM;x<=w;x+=major){ctx.moveTo(x,0);ctx.lineTo(x,h);}
  for(let y=-dYM;y<=h;y+=major){ctx.moveTo(0,y);ctx.lineTo(w,y);}
  ctx.stroke();

  /* ---- 4. far motes (parallax depth, dim) ---- */
  for(let i=0;i<R.MOTES.length;i++){
    const m=R.MOTES[i];
    if(m.layer!==0)continue;
    const x=(m.x+Math.sin(t*m.spd+m.phase)*m.drift+mxo*0.02)*w;
    const y=(m.y+Math.cos(t*m.spd*0.9+m.phase)*m.drift+myo*0.02)*h;
    const tw=0.35+0.65*(0.5+0.5*Math.sin(t*m.twSpd+m.tw));
    ctx.fillStyle="rgba(180,210,255,"+(0.06*tw).toFixed(3)+")";
    ctx.beginPath();ctx.arc(x,y,m.size*0.8,0,TAU);ctx.fill();
  }

  /* ---- 5. secondary lattice nodes (subordinate) ---- */
  ctx.globalCompositeOperation="lighter";
  for(let i=0;i<R.LATTICE.length;i++){
    const s=R.LATTICE[i];
    const par=0.02+s.depth*0.05;
    const x=(s.x+mxo*par)*w+Math.sin(t*s.spd+s.phase)*s.amp;
    const y=(s.y+myo*par)*h+Math.cos(t*s.spd*0.8+s.phase)*s.amp;
    const tw=0.4+0.6*(0.5+0.5*Math.sin(t*s.twSpd+s.tw));
    ctx.fillStyle="rgba(150,185,250,"+(0.05*tw*s.depth).toFixed(3)+")";
    ctx.beginPath();ctx.arc(x,y,s.size*2.2,0,TAU);ctx.fill();
    ctx.fillStyle="rgba(196,222,255,"+(0.24*tw).toFixed(3)+")";
    ctx.beginPath();ctx.arc(x,y,s.size*0.65,0,TAU);ctx.fill();
  }
  ctx.globalCompositeOperation="source-over";

  /* ---- 6. HERO: proof arcs (compass sweeps; travelling proof dot) ---- */
  ctx.globalCompositeOperation="lighter";
  for(let i=0;i<R.ARCS.length;i++){
    const ar=R.ARCS[i];
    const A=nodes[ar.a], B=nodes[ar.b];
    const aw=chap[ar.a]>chap[ar.b]?chap[ar.a]:chap[ar.b];
    const mX=(A.x+B.x)/2, mY=(A.y+B.y)/2;
    const dx=B.x-A.x, dy=B.y-A.y;
    const len=Math.hypot(dx,dy)||1;
    const nx=-dy/len, ny=dx/len;
    const sgn=ar.bulge<0?-1:1;
    const bul=len*ar.bulge;
    const cx=mX+nx*bul, cy=mY+ny*bul;
    const breath=0.5+0.5*fbm(i*2.3+t*0.15,ar.phase*6,2);
    const g=ctx.createLinearGradient(A.x,A.y,B.x,B.y);
    g.addColorStop(0,"rgba(120,160,240,0)");
    g.addColorStop(0.5,"rgba(158,198,255,"+(0.17+breath*0.16+aw*0.10).toFixed(3)+")");
    g.addColorStop(1,"rgba(120,160,240,0)");
    ctx.strokeStyle=g;
    ctx.lineWidth=1.7+aw*0.7;
    ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.quadraticCurveTo(cx,cy,B.x,B.y);ctx.stroke();
    for(let k=1;k<=2;k++){
      const cx2=mX+nx*(bul+sgn*k*7), cy2=mY+ny*(bul+sgn*k*7);
      ctx.strokeStyle="rgba(120,165,240,"+(0.05/k).toFixed(3)+")";
      ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.quadraticCurveTo(cx2,cy2,B.x,B.y);ctx.stroke();
    }
    const u=((((t*0.1+ar.phase)%1)+1)%1);
    const iu=1-u;
    const bx=iu*iu*A.x+2*iu*u*cx+u*u*B.x;
    const by=iu*iu*A.y+2*iu*u*cy+u*u*B.y;
    ctx.fillStyle="rgba(150,192,252,"+(0.26+aw*0.14).toFixed(3)+")";
    ctx.beginPath();ctx.arc(bx,by,4.4,0,TAU);ctx.fill();
    ctx.fillStyle="rgba(206,228,255,"+(0.52+aw*0.16).toFixed(3)+")";
    ctx.beginPath();ctx.arc(bx,by,1.7,0,TAU);ctx.fill();
  }
  ctx.globalCompositeOperation="source-over";

  /* ---- 7. HERO: theorem lines (edges): glow underlay + gradient core + spark ---- */
  ctx.globalCompositeOperation="lighter";
  for(let i=0;i<R.EDGES.length;i++){
    const e=R.EDGES[i];
    const A=nodes[e[0]], B=nodes[e[1]];
    const ew=chap[e[0]]>chap[e[1]]?chap[e[0]]:chap[e[1]];
    const pulse=0.5+0.5*Math.sin(t*0.7+R.EDGE_PHASE[i]);
    ctx.strokeStyle="rgba(90,140,235,"+(0.06+ew*0.05).toFixed(3)+")";
    ctx.lineWidth=5;
    ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.stroke();
    const g=ctx.createLinearGradient(A.x,A.y,B.x,B.y);
    g.addColorStop(0,"rgba(135,175,248,0.10)");
    g.addColorStop(0.5,"rgba(172,206,255,"+(0.24+pulse*0.13+ew*0.12).toFixed(3)+")");
    g.addColorStop(1,"rgba(135,175,248,0.10)");
    ctx.strokeStyle=g;
    ctx.lineWidth=1.5+ew*0.6;
    ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.stroke();
    const s=((((t*0.16+R.EDGE_PHASE[i]*0.16)%1)+1)%1);
    const sx=A.x+(B.x-A.x)*s, sy=A.y+(B.y-A.y)*s;
    ctx.fillStyle="rgba(155,198,252,"+(0.28+ew*0.14).toFixed(3)+")";
    ctx.beginPath();ctx.arc(sx,sy,4.1,0,TAU);ctx.fill();
    ctx.fillStyle="rgba(208,230,255,"+(0.54+ew*0.16).toFixed(3)+")";
    ctx.beginPath();ctx.arc(sx,sy,1.6,0,TAU);ctx.fill();
  }
  ctx.globalCompositeOperation="source-over";

  /* ---- 8. HERO: luminous node pulses (rings + halo + core) ---- */
  ctx.globalCompositeOperation="lighter";
  for(let i=0;i<N;i++){
    const p=nodes[i], ph=R.NODE_PHASE[i];
    const dm=Math.hypot(p.x-markX,p.y-markY);
    const prox=cl(1-dm/(diag*0.20));
    const cw=chap[i];
    const breathe=0.5+0.5*Math.sin(t*1.2+i*1.4);
    for(let k=0;k<2;k++){
      const rp=((((t*0.32+ph*0.16+k*0.5)%1)+1)%1);
      const rr=6+rp*(30+prox*22+cw*10);
      const aa=(1-rp)*(0.13+prox*0.17+cw*0.10);
      ctx.strokeStyle="rgba(150,192,255,"+aa.toFixed(3)+")";
      ctx.lineWidth=(1.4*(1-rp)+0.3);
      ctx.beginPath();ctx.arc(p.x,p.y,rr,0,TAU);ctx.stroke();
    }
    softGlow(ctx,p.x,p.y,17+prox*18+cw*8,"rgba(148,188,255,"+(0.10+breathe*0.05+prox*0.15+cw*0.07).toFixed(3)+")","transparent");
  }
  ctx.globalCompositeOperation="source-over";
  for(let i=0;i<N;i++){
    const p=nodes[i];
    const dm=Math.hypot(p.x-markX,p.y-markY);
    const prox=cl(1-dm/(diag*0.20));
    const cw=chap[i];
    ctx.fillStyle="rgba(150,192,252,"+(0.42+prox*0.20+cw*0.12).toFixed(3)+")";
    ctx.beginPath();ctx.arc(p.x,p.y,3.2+prox*1.6+cw*0.8,0,TAU);ctx.fill();
    ctx.fillStyle="rgba(216,234,255,"+(0.52+prox*0.14+cw*0.10).toFixed(3)+")";
    ctx.beginPath();ctx.arc(p.x,p.y,1.5+prox*0.7,0,TAU);ctx.fill();
  }

  /* ---- 9. near motes (subtle foreground depth, dim) ---- */
  ctx.globalCompositeOperation="lighter";
  for(let i=0;i<R.MOTES.length;i++){
    const m=R.MOTES[i];
    if(m.layer===0)continue;
    const par=m.layer===2?0.06:0.035;
    const x=(m.x+Math.sin(t*m.spd+m.phase)*m.drift+mxo*par)*w;
    const y=(m.y+Math.cos(t*m.spd*0.9+m.phase)*m.drift+myo*par)*h;
    const tw=0.35+0.65*(0.5+0.5*Math.sin(t*m.twSpd+m.tw));
    ctx.fillStyle="rgba(180,210,255,"+((m.layer===2?0.13:0.09)*tw).toFixed(3)+")";
    ctx.beginPath();ctx.arc(x,y,m.size*(m.layer===2?1.0:0.85),0,TAU);ctx.fill();
  }
  ctx.globalCompositeOperation="source-over";

  /* ---- 10. travelling theorem marker (rotating nested compass squares) ---- */
  ctx.globalCompositeOperation="lighter";
  softGlow(ctx,markX,markY,30,"rgba(160,200,255,0.26)","transparent");
  const rot=t*0.6;
  ctx.save();
  ctx.translate(markX,markY);
  ctx.rotate(rot);
  ctx.strokeStyle="rgba(180,214,255,0.52)";
  ctx.lineWidth=1.2;
  ctx.beginPath();ctx.rect(-8,-8,16,16);ctx.stroke();
  ctx.rotate(Math.PI*0.25);
  ctx.strokeStyle="rgba(150,193,255,0.38)";
  ctx.beginPath();ctx.rect(-11,-11,22,22);ctx.stroke();
  ctx.restore();
  ctx.globalCompositeOperation="source-over";
  ctx.fillStyle="rgba(224,240,255,0.70)";
  ctx.beginPath();ctx.arc(markX,markY,2.6,0,TAU);ctx.fill();

  /* ---- 10b. focus connector + echo (only on genuine pointer focus; off at rest) ---- */
  if(M.hasFocus){
    const fx=finiteClamp(M.focusX,0,1,0.5)*w;
    const fy=finiteClamp(M.focusY,0,1,0.5)*h;
    const imp=finiteClamp(M.interactionImpulse,0,1,0);
    ctx.strokeStyle="rgba(150,190,250,"+(0.10+imp*0.18).toFixed(3)+")";
    ctx.lineWidth=1.0;
    ctx.beginPath();ctx.moveTo(markX,markY);ctx.lineTo(fx,fy);ctx.stroke();
    ctx.fillStyle="rgba(198,222,255,"+(0.26+imp*0.20).toFixed(3)+")";
    ctx.beginPath();ctx.arc(fx,fy,2.2,0,TAU);ctx.fill();
    if(imp>0.01){
      const es=8+(1-imp)*26;
      ctx.strokeStyle="rgba(150,193,255,"+(imp*0.34).toFixed(3)+")";
      ctx.lineWidth=1.0;
      ctx.strokeRect(fx-es*0.5,fy-es*0.5,es,es);
    }
  }

  /* ---- 11. color grade + vignette (cached gradients) ---- */
  ctx.fillStyle=GC.grade!;
  ctx.fillRect(0,0,w,h);
  ctx.fillStyle=GC.vig!;
  ctx.fillRect(0,0,w,h);
};
