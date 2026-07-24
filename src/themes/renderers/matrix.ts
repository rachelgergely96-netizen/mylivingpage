import { finiteClamp } from "../shared/motion";
import type { ThemeRenderer } from "../types";

// ---- Glyph atlas -----------------------------------------------------------
// fillText for every trail character was the hottest path in this renderer
// (~3k glyphs per frame at DPR 2). The katakana set is pre-rendered once per
// layer into an atlas of lightness buckets; the rain loop then blits sprites
// with globalAlpha, which rasterizes an order of magnitude faster while
// producing the same phosphor-green ramp.
const GLYPH_COUNT = 96;
const LIGHT_MIN = 36;
const LIGHT_STEP = 7;
const LIGHT_BUCKETS = 7; // 36..78% lightness; the top bucket doubles as heads

interface GlyphLayerSpec {
  fontSize: number;
  cell: number;
  hue: number;
}

const GLYPH_LAYERS: GlyphLayerSpec[] = [
  { fontSize: 12, cell: 18, hue: 150 },
  { fontSize: 18, cell: 26, hue: 137 },
];

const glyphAtlases: Array<HTMLCanvasElement | null> = [null, null];

function getGlyphAtlas(layerIndex: number): HTMLCanvasElement | null {
  const cached = glyphAtlases[layerIndex];
  if (cached) return cached;
  if (typeof document === "undefined") return null;
  const spec = GLYPH_LAYERS[layerIndex];
  const atlas = document.createElement("canvas");
  atlas.width = GLYPH_COUNT * spec.cell;
  atlas.height = LIGHT_BUCKETS * spec.cell;
  const actx = atlas.getContext("2d");
  if (!actx) return null;
  actx.font = spec.fontSize + 'px "SF Mono", ui-monospace, monospace';
  actx.textBaseline = "middle";
  actx.textAlign = "center";
  for (let bucket = 0; bucket < LIGHT_BUCKETS; bucket += 1) {
    const lightness = LIGHT_MIN + bucket * LIGHT_STEP;
    // Heads render desaturated (sat 62) exactly like the original fillStyle.
    const saturation = lightness >= 71 ? 62 : 85;
    actx.fillStyle = `hsla(${spec.hue},${saturation}%,${lightness}%,1)`;
    for (let g = 0; g < GLYPH_COUNT; g += 1) {
      actx.fillText(
        String.fromCharCode(0x30a0 + g),
        g * spec.cell + spec.cell * 0.5,
        bucket * spec.cell + spec.cell * 0.5,
      );
    }
  }
  glyphAtlases[layerIndex] = atlas;
  return atlas;
}

function lightnessBucket(lightness: number): number {
  const bucket = Math.round((lightness - LIGHT_MIN) / LIGHT_STEP);
  return bucket < 0 ? 0 : bucket >= LIGHT_BUCKETS ? LIGHT_BUCKETS - 1 : bucket;
}

// Scanlines as a repeating 1×3 pattern: one fill instead of h/3 fillRects.
let scanTile: HTMLCanvasElement | null = null;
function getScanPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (!scanTile) {
    if (typeof document === "undefined") return null;
    scanTile = document.createElement("canvas");
    scanTile.width = 1;
    scanTile.height = 3;
    const sctx = scanTile.getContext("2d");
    if (!sctx) {
      scanTile = null;
      return null;
    }
    sctx.fillStyle = "rgba(0,0,0,1)";
    sctx.fillRect(0, 0, 1, 1);
  }
  return ctx.createPattern(scanTile, "repeat");
}

export const renderMatrix: ThemeRenderer = (ctx,w,h,t,mx,my) => {
  const MX=finiteClamp(mx,0,1,0.5), MY=finiteClamp(my,0,1,0.5);
  const invW=w>0?1/w:0;
  const glyphIndex=(seed: number,r: number)=>Math.floor(((seed*17+r*31+Math.floor(t*2+r*0.35))%96+96)%96);
  const pdev=Math.min(1,(Math.abs(MX-0.5)+Math.abs(MY-0.5))*2);
  const mdyG=Math.abs(0.5-MY);
  const layers=[
    {cw:24,fs:12,sp:22,al:0.55,hue:150,glowR:18,trailL:37},
    {cw:16,fs:18,sp:16,al:0.82,hue:137,glowR:28,trailL:44}
  ];
  for(let li=0;li<layers.length;li++){
    const L=layers[li];
    const atlas=getGlyphAtlas(li);
    const cell=GLYPH_LAYERS[li].cell;
    const cols=Math.floor(w/L.cw);
    const charH=L.sp;
    const range=h+charH*22;
    const glow=ctx.createRadialGradient(0,0,0,0,0,L.glowR);
    glow.addColorStop(0,"hsla("+L.hue+",80%,66%,0.55)");
    glow.addColorStop(0.45,"hsla("+L.hue+",82%,58%,0.18)");
    glow.addColorStop(1,"transparent");
    ctx.save();
    for(let c=0;c<cols;c++){
      const seed=c*47.3+li*191.7;
      const speed=(0.5+(Math.sin(seed*1.7)*0.5+0.5)*0.9)*(0.6+li*0.4);
      const colX=c*L.cw+L.cw*0.5;
      const mdx=Math.abs(colX*invW-MX);
      const speedMod=mdx<0.16?1+(1-mdx/0.16)*mdyG*0.9:1;
      const offset=(t*40*speed*speedMod+seed*100)%range;
      const boost=Math.max(0,1-mdx*3.5)*pdev;
      const chars=14+Math.floor(Math.sin(seed*2.3)*4);
      const cipher=Math.sin(seed*3.1+Math.floor(t*0.5))>0.93;
      for(let r=0;r<chars;r++){
        const y=offset-r*charH;
        if(y<-charH||y>h+charH) continue;
        const life=1-r/chars;
        let alpha;
        let lightness;
        if(r===0){
          ctx.globalAlpha=Math.min(0.85,(0.3+boost*0.32)*(0.7+L.al*0.3));
          ctx.translate(colX,y);
          ctx.fillStyle=glow;
          ctx.fillRect(-L.glowR,-L.glowR,L.glowR*2,L.glowR*2);
          ctx.translate(-colX,-y);
          alpha=Math.min(0.9,life*L.al*(0.6+boost*0.5)+0.38);
          lightness=cipher?78:73;
        } else {
          alpha=life*L.al*(0.55+boost*0.45);
          // Deep-tail glyphs fade below visibility on the dark ground; skip
          // rasterizing them at all.
          if(alpha<0.04) continue;
          lightness=(cipher?L.trailL+8:L.trailL)+life*14;
        }
        if(atlas){
          ctx.globalAlpha=alpha;
          ctx.drawImage(
            atlas,
            glyphIndex(seed,r)*cell,
            lightnessBucket(lightness)*cell,
            cell,
            cell,
            colX-cell*0.5,
            y-cell*0.5,
            cell,
            cell,
          );
        } else {
          ctx.globalAlpha=1;
          ctx.font=L.fs+'px "SF Mono", ui-monospace, monospace';
          ctx.textBaseline="middle";
          ctx.textAlign="center";
          ctx.fillStyle="hsla("+L.hue+",85%,"+lightness+"%,"+alpha+")";
          ctx.fillText(String.fromCharCode(0x30a0+glyphIndex(seed,r)),colX,y);
        }
      }
    }
    ctx.restore();
  }
  ctx.save();
  ctx.globalCompositeOperation="screen";
  for(let i=0;i<6;i++){
    const seed=i*193.7;
    const streamY=(Math.sin(seed*1.3)*0.5+0.5)*h;
    const streamX=((t*(18+i*6)+seed*50)%(w*1.5))-w*0.25;
    const streamLen=80+Math.sin(seed)*40;
    const g=ctx.createLinearGradient(streamX,streamY,streamX+streamLen,streamY);
    g.addColorStop(0,"transparent");
    g.addColorStop(0.5,"hsla(146,72%,50%,"+(0.045+Math.sin(t*0.3+seed)*0.015)+")");
    g.addColorStop(1,"transparent");
    ctx.fillStyle=g;
    ctx.fillRect(streamX,streamY-1,streamLen,2);
  }
  ctx.restore();
  const gp=Math.sin(t*0.9+7.3);
  if(gp>0.9){
    const inten=gp-0.9;
    const by=(Math.sin(Math.floor(t*3)*137.5)*0.5+0.5)*h;
    const hgt=24+inten*160;
    ctx.save();
    ctx.globalCompositeOperation="screen";
    const gg=ctx.createLinearGradient(0,by,0,by+hgt);
    gg.addColorStop(0,"transparent");
    gg.addColorStop(0.35,"hsla(150,80%,56%,"+(inten*3.2)+")");
    gg.addColorStop(0.65,"hsla(172,78%,58%,"+(inten*3.2)+")");
    gg.addColorStop(1,"transparent");
    ctx.fillStyle=gg;
    ctx.fillRect(0,by,w,hgt);
    ctx.restore();
  }
  const bg=ctx.createLinearGradient(0,h,0,h*0.78);
  bg.addColorStop(0,"hsla(140,55%,20%,0.10)");
  bg.addColorStop(1,"transparent");
  ctx.fillStyle=bg;
  ctx.fillRect(0,0,w,h);
  const cx=w*0.4, cy=h*0.42;
  const cg=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(w,h)*0.55);
  cg.addColorStop(0,"rgba(1,6,3,0.4)");
  cg.addColorStop(0.65,"rgba(1,6,3,0.12)");
  cg.addColorStop(1,"rgba(1,6,3,0)");
  ctx.fillStyle=cg;
  ctx.fillRect(0,0,w,h);
  const scanA=0.11+Math.sin(t*2)*0.02;
  const scanPattern=getScanPattern(ctx);
  if(scanPattern){
    ctx.save();
    ctx.globalAlpha=scanA;
    ctx.fillStyle=scanPattern;
    ctx.fillRect(0,0,w,h);
    ctx.restore();
  } else {
    ctx.fillStyle="rgba(0,0,0,"+scanA+")";
    for(let y=0;y<h;y+=3){ ctx.fillRect(0,y,w,1); }
  }
  const vg=ctx.createRadialGradient(w*0.5,h*0.5,Math.min(w,h)*0.28,w*0.5,h*0.5,Math.max(w,h)*0.72);
  vg.addColorStop(0,"transparent");
  vg.addColorStop(1,"rgba(0,4,1,0.55)");
  ctx.fillStyle=vg;
  ctx.fillRect(0,0,w,h);
};
