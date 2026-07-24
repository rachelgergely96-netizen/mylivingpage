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
  return {NODES:NODES,EDGES:EDGES,STORY:STORY,SIBN:SIBN,NODE_PHASE:NODE_PHASE,EDGE_PHASE:EDGE_PHASE};
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

export const renderAxiom: ThemeRenderer = (ctx,w,h,timeValue,mx,my,_deltaSeconds,motion)=>{
  const R=CFG;
  const M=resolveThemeMotion(motion);
  const reduced=motion?.reducedMotion===true;
  const t=reduced?0:timeValue;
  const mxo=mx-0.5, myo=my-0.5;
  const diag=Math.hypot(w,h)||1;
  const cl=function(v: number){return v<0?0:(v>1?1:v);};

  /* ---- page-motion signals (all 0/safe at rest) ---- */
  const vel=reduced?0:finiteClamp(M.scrollVelocity/3,-1,1,0);
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

  /* ---- 2. single blueprint grid (faded field) ---- */
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
  ctx.lineWidth=1.0;
  ctx.strokeStyle="rgba(140,180,255,0.06)";
  ctx.beginPath();
  for(let x=-dX;x<=w;x+=major){ctx.moveTo(x,0);ctx.lineTo(x,h);}
  for(let y=-dY;y<=h;y+=major){ctx.moveTo(0,y);ctx.lineTo(w,y);}
  ctx.stroke();

  /* ---- 3. HERO: theorem lines with one active proof segment ---- */
  const fromNode=R.STORY[si];
  const toNode=R.STORY[si+1];
  ctx.globalCompositeOperation="lighter";
  for(let i=0;i<R.EDGES.length;i++){
    const e=R.EDGES[i];
    const A=nodes[e[0]], B=nodes[e[1]];
    const active=(e[0]===fromNode&&e[1]===toNode)||(e[1]===fromNode&&e[0]===toNode);
    ctx.strokeStyle=`rgba(90,140,235,${0.035+(active?0.055:0)})`;
    ctx.lineWidth=4;
    ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.stroke();
    const g=ctx.createLinearGradient(A.x,A.y,B.x,B.y);
    g.addColorStop(0,"rgba(135,175,248,0.08)");
    g.addColorStop(0.5,`rgba(172,206,255,${0.16+(active?0.12:0)})`);
    g.addColorStop(1,"rgba(135,175,248,0.08)");
    ctx.strokeStyle=g;
    ctx.lineWidth=1.2+(active?0.5:0);
    ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.stroke();
  }
  ctx.globalCompositeOperation="source-over";

  /* ---- 4. Static theorem nodes; focus belongs to the destination only. ---- */
  for(let i=0;i<N;i++){
    const p=nodes[i];
    const destination=i===toNode?1:0;
    const focusBoost=destination&&M.hasFocus
      ? 0.08+finiteClamp(M.interactionImpulse,0,1,0)*0.08
      : 0;
    const outerAlpha=0.28+chap[i]*0.06+destination*0.08+focusBoost*0.5;
    const innerAlpha=0.40+destination*0.08+focusBoost*0.4;
    ctx.fillStyle=`rgba(150,192,252,${outerAlpha})`;
    ctx.beginPath();ctx.arc(p.x,p.y,3.2+destination*0.8,0,TAU);ctx.fill();
    ctx.fillStyle=`rgba(216,234,255,${innerAlpha})`;
    ctx.beginPath();ctx.arc(p.x,p.y,1.5+destination*0.5,0,TAU);ctx.fill();
  }

  /* ---- 5. One travelling proof pointer. ---- */
  ctx.save();
  ctx.globalCompositeOperation="screen";
  softGlow(ctx,markX,markY,18,"rgba(160,200,255,0.16)","transparent");
  ctx.fillStyle="rgba(190,220,255,0.38)";
  ctx.beginPath();ctx.arc(markX,markY,4,0,TAU);ctx.fill();
  ctx.fillStyle="rgba(224,240,255,0.55)";
  ctx.beginPath();ctx.arc(markX,markY,1.8,0,TAU);ctx.fill();
  ctx.restore();

  /* ---- 6. color grade + vignette (cached gradients) ---- */
  ctx.fillStyle=GC.grade!;
  ctx.fillRect(0,0,w,h);
  ctx.fillStyle=GC.vig!;
  ctx.fillRect(0,0,w,h);
};
