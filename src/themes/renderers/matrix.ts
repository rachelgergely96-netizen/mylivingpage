import { finiteClamp } from "../shared/motion";
import type { ThemeRenderer } from "../types";

export const renderMatrix: ThemeRenderer = (ctx,w,h,t,mx,my) => {
  const MX=finiteClamp(mx,0,1,0.5), MY=finiteClamp(my,0,1,0.5);
  const invW=w>0?1/w:0;
  const glyph=(seed: number,r: number)=>String.fromCharCode(0x30A0+Math.floor(((seed*17+r*31+Math.floor(t*2+r*0.35))%96+96)%96));
  const pdev=Math.min(1,(Math.abs(MX-0.5)+Math.abs(MY-0.5))*2);
  const mdyG=Math.abs(0.5-MY);
  ctx.textBaseline="middle";
  ctx.textAlign="center";
  const layers=[
    {cw:24,fs:12,sp:22,al:0.55,hue:150,glowR:18,trailL:37},
    {cw:16,fs:18,sp:16,al:0.82,hue:137,glowR:28,trailL:44}
  ];
  for(let li=0;li<layers.length;li++){
    const L=layers[li];
    const cols=Math.floor(w/L.cw);
    const charH=L.sp;
    const range=h+charH*22;
    ctx.font=L.fs+'px "SF Mono", ui-monospace, monospace';
    const glow=ctx.createRadialGradient(0,0,0,0,0,L.glowR);
    glow.addColorStop(0,"hsla("+L.hue+",80%,66%,0.55)");
    glow.addColorStop(0.45,"hsla("+L.hue+",82%,58%,0.18)");
    glow.addColorStop(1,"transparent");
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
        if(r===0){
          ctx.save();
          ctx.globalAlpha=Math.min(0.85,(0.3+boost*0.32)*(0.7+L.al*0.3));
          ctx.translate(colX,y);
          ctx.fillStyle=glow;
          ctx.fillRect(-L.glowR,-L.glowR,L.glowR*2,L.glowR*2);
          ctx.restore();
          const la=Math.min(0.9,life*L.al*(0.6+boost*0.5)+0.38);
          ctx.fillStyle="hsla("+L.hue+",62%,"+(cipher?78:73)+"%,"+la+")";
        } else {
          const a=life*L.al*(0.55+boost*0.45);
          ctx.fillStyle="hsla("+L.hue+",85%,"+((cipher?L.trailL+8:L.trailL)+life*14)+"%,"+a+")";
        }
        ctx.fillText(glyph(seed,r),colX,y);
      }
    }
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
  ctx.fillStyle="rgba(0,0,0,"+scanA+")";
  for(let y=0;y<h;y+=3){ ctx.fillRect(0,y,w,1); }
  const vg=ctx.createRadialGradient(w*0.5,h*0.5,Math.min(w,h)*0.28,w*0.5,h*0.5,Math.max(w,h)*0.72);
  vg.addColorStop(0,"transparent");
  vg.addColorStop(1,"rgba(0,4,1,0.55)");
  ctx.fillStyle=vg;
  ctx.fillRect(0,0,w,h);
};
