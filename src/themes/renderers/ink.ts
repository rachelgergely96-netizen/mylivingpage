import { fbm } from "../shared/noise";
import { finiteClamp } from "../shared/motion";
import { softGlow } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

export const renderInk: ThemeRenderer = (ctx,w,h,t,mx,my) => {
  // Ambient depth washes — low-luminance, set the water tint (alphas cut so overlaps stay below white)
  ctx.save(); ctx.globalCompositeOperation="screen";
  softGlow(ctx,w*(0.4+Math.sin(t*0.04)*0.06),h*0.5,Math.max(w,h)*0.6,"hsla(220,45%,22%,0.07)","transparent");
  softGlow(ctx,w*0.7,h*0.35,Math.max(w,h)*0.45,"hsla(190,50%,24%,0.05)","transparent");
  ctx.restore();

  const palette=[[220,60],[248,55],[190,58],[268,52],[205,60],[232,55],[178,58]];
  ctx.save(); ctx.globalCompositeOperation="screen";
  for (let i=0;i<7;i++){
    const seed=i*127.3;
    const baseX=(Math.sin(seed*1.1)*0.5+0.5)*w;
    const baseY=(Math.cos(seed*0.9)*0.5+0.5)*h;
    const drift=t*3+seed;
    const x=baseX+Math.sin(drift*0.15)*46+(mx-0.5)*40;
    const y=baseY+Math.cos(drift*0.12)*34+(my-0.5)*40;
    const R=54+Math.sin(t*0.3+seed)*22+Math.sin(t*0.7+i)*12;
    const [hue,sat]=palette[i];
    // reading-column protection: mute the sharpest accents in the left third where resume text sits
    const colFade=finiteClamp((x-w*0.34)/(w*0.20),0.18,1,1);

    // luminous diffusion body — dense saturated ink core, capped so bright-pass bloom can't blow to white
    const body=ctx.createRadialGradient(x,y,0,x,y,R*1.15);
    body.addColorStop(0,`hsla(${hue+8},${Math.min(sat+8,72)}%,44%,0.085)`);
    body.addColorStop(0.45,`hsla(${hue},${sat}%,38%,0.05)`);
    body.addColorStop(1,"transparent");
    ctx.fillStyle=body; ctx.fillRect(x-R*1.2,y-R*1.2,R*2.4,R*2.4);

    // feathery diffusion edge — dimmed
    ctx.beginPath();
    for (let a=0;a<=64;a++){
      const ang=(a/64)*TAU;
      const nR=R*(1+fbm(Math.cos(ang)*2.4+i+t*0.03,Math.sin(ang)*2.4+i,3)*0.42);
      const px=x+Math.cos(ang)*nR, py=y+Math.sin(ang)*nR;
      if (a===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    ctx.closePath();
    ctx.strokeStyle=`hsla(${hue},${sat}%,52%,0.07)`; ctx.lineWidth=1; ctx.stroke();

    // gentle expansion ring — dimmed and faded out over the left reading column
    const rw=((t*0.25+seed)%1);
    const rr=R*(0.8+rw*1.4);
    ctx.beginPath(); ctx.arc(x,y,rr,0,TAU);
    ctx.strokeStyle=`hsla(${hue+8},${sat}%,55%,${(1-rw)*0.06*colFade})`;
    ctx.lineWidth=1.2*(1-rw); ctx.stroke();

    // fine filament tendrils — the ink-in-water signature, kept subtle
    for (let f=0;f<9;f++){
      const ang=(f/9)*TAU+t*0.08+seed;
      const len=R*(0.9+Math.sin(t*0.4+f+seed)*0.4);
      const tx=x+Math.cos(ang)*len, ty=y+Math.sin(ang)*len;
      ctx.beginPath(); ctx.moveTo(x,y);
      const c1x=x+Math.cos(ang)*len*0.4+Math.sin(t*0.6+f*2+seed)*18;
      const c1y=y+Math.sin(ang)*len*0.4+Math.cos(t*0.5+f*1.5+seed)*18;
      ctx.quadraticCurveTo(c1x,c1y,tx,ty);
      ctx.strokeStyle=`hsla(${hue},${sat}%,50%,${0.05+Math.sin(t*0.4+f)*0.015})`;
      ctx.lineWidth=1.4*(1-f/12); ctx.stroke();
    }
  }
  ctx.restore();

  // Suspended ink motes — dimmer, fewer, muted over the left reading column
  ctx.save(); ctx.globalCompositeOperation="screen";
  for (let i=0;i<40;i++){
    const seed=i*57.9;
    const x=(Math.sin(seed*1.5+t*0.08)*0.5+0.5)*w;
    const y=(Math.cos(seed*1.2+t*0.06)*0.5+0.5)*h;
    const size=1+Math.sin(seed)*0.9;
    const pulse=0.35+Math.sin(t*1.8+seed)*0.28;
    const mFade=finiteClamp((x-w*0.34)/(w*0.20),0.2,1,1);
    const hue=205+Math.sin(seed*0.6)*40;
    ctx.beginPath(); ctx.arc(x,y,size,0,TAU);
    ctx.fillStyle=`hsla(${hue},52%,52%,${pulse*0.32*mFade})`;
    ctx.fill();
  }
  ctx.restore();
};
