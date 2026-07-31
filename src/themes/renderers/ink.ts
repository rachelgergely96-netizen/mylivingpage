import { fbm } from "../shared/noise";
import { finiteClamp, resolveThemeMotion } from "../shared/motion";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

export const renderInk: ThemeRenderer = (
  ctx,
  w,
  h,
  time,
  mx,
  my,
  _deltaSeconds,
  motion,
) => {
  // Uniform motion plumbing: resolve the page-motion contract once per frame.
  // Ink's approved composition predates page-level motion nuance, so the
  // resolved fields stay unread (keeping motion-active output identical to the
  // pre-upgrade renderer); only the reducedMotion gate below consumes the
  // contract, freezing time so the theme holds its canonical still frame.
  resolveThemeMotion(motion);
  const reduced = !!(motion && motion.reducedMotion);
  const t = reduced ? 0 : finiteClamp(time, 0, 1e6);
  const lightX=w*(0.94+Math.sin(t*TAU/38)*0.018);
  const lightY=h*0.12;

  const palette=[[220,60],[248,55],[190,58],[268,52],[205,60],[232,55],[178,58]];
  ctx.save(); ctx.globalCompositeOperation="screen";
  for (let i=0;i<7;i++){
    const seed=i*127.3;
    const baseX=(0.12+(Math.sin(seed*1.1)*0.5+0.5)*0.84)*w;
    const baseY=(0.08+(Math.cos(seed*0.9)*0.5+0.5)*0.84)*h;
    const drift=t*3+seed;
    const x=baseX+Math.sin(drift*0.15)*46+(mx-0.5)*40;
    const y=baseY+Math.cos(drift*0.12)*34+(my-0.5)*40;
    const R=(54+Math.sin(t*0.3+seed)*22+Math.sin(t*0.7+i)*12)*Math.max(1,Math.min(w,h)/600);
    const [hue,sat]=palette[i];
    // reading-column protection: mute the sharpest accents in the left third where resume text sits
    const colFade=finiteClamp((x-w*0.34)/(w*0.20),0.18,1,1);
    const sourceAngle=Math.atan2(lightY-y,lightX-x);
    const key=finiteClamp((x-w*0.52)/(w*0.24),0,1,0)*colFade;

    // luminous diffusion body — dense saturated ink core, capped so bright-pass bloom can't blow to white
    const gx=x+Math.cos(sourceAngle)*R*0.16;
    const gy=y+Math.sin(sourceAngle)*R*0.16;
    const body=ctx.createRadialGradient(gx,gy,0,x,y,R*1.15);
    body.addColorStop(0,`hsla(${hue+8},${Math.min(sat+8,72)}%,48%,${(0.18+0.09*key)*(0.55+0.45*colFade)})`);
    body.addColorStop(0.45,`hsla(${hue},${sat}%,40%,${(0.1+0.04*key)*(0.6+0.4*colFade)})`);
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
    ctx.strokeStyle=`hsla(${hue},${sat}%,54%,0.065)`; ctx.lineWidth=1; ctx.stroke();

    // Transmitted sidelight catches only the wet pigment boundary. The slow
    // directional shift keeps the effect tied to ink, not to the whole frame.
    const edgeX=Math.cos(sourceAngle)*R*1.5;
    const edgeY=Math.sin(sourceAngle)*R*1.5;
    const wetEdge=ctx.createLinearGradient(x-edgeX,y-edgeY,x+edgeX,y+edgeY);
    wetEdge.addColorStop(0,"transparent");
    wetEdge.addColorStop(0.58,"transparent");
    wetEdge.addColorStop(0.84,`hsla(${hue+14},${Math.min(sat+6,68)}%,68%,${0.1+0.14*key})`);
    wetEdge.addColorStop(1,"transparent");
    ctx.strokeStyle=wetEdge;
    ctx.lineWidth=2;
    ctx.stroke();

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
  ctx.save(); ctx.globalCompositeOperation="source-over";
  for (let i=0;i<40;i++){
    const seed=i*57.9;
    const x=(Math.sin(seed*1.5+t*0.08)*0.5+0.5)*w;
    const y=(Math.cos(seed*1.2+t*0.06)*0.5+0.5)*h;
    const size=1+Math.sin(seed)*0.9;
    const pulse=0.35+Math.sin(t*1.8+seed)*0.22;
    const mFade=finiteClamp((x-w*0.34)/(w*0.20),0.2,1,1);
    const hue=205+Math.sin(seed*0.6)*40;
    ctx.beginPath(); ctx.arc(x,y,size,0,TAU);
    ctx.fillStyle=`hsla(${hue},48%,46%,${Math.max(0,pulse)*0.10*mFade})`;
    ctx.fill();
  }
  ctx.restore();
};
