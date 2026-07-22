import { fbm } from "../shared/noise";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

export const renderTerracotta: ThemeRenderer = (ctx,w,h,t,mx,my) => {
  const mxp=mx*w, myp=my*h;
  // Warm kiln glow rising from below
  const kiln=ctx.createRadialGradient(w*0.5,h*1.05,0,w*0.5,h*0.9,Math.max(1,w*0.7)); kiln.addColorStop(0,"hsla(28,60%,26%,0.14)"); kiln.addColorStop(1,"transparent"); ctx.fillStyle=kiln; ctx.fillRect(0,0,w,h);
  // Clay-on-water: overlapping warm blobs with upper-left rim light + inner slip rings
  for (let i=0;i<12;i++){
    let cx=(Math.sin(t*0.05+i*2.3)*0.4+0.5)*w; let cy=(Math.cos(t*0.042+i*1.7)*0.4+0.5)*h; const R=46+i*9;
    const dx=cx-mxp, dy=cy-myp, dist=Math.hypot(dx,dy);
    if (dist<200&&dist>0){ const push=(1-dist/200)*30; cx+=(dx/dist)*push; cy+=(dy/dist)*push; }
    const hue=22+i*3.5+Math.sin(t*0.2+i)*6;
    // body with radial warm-core -> dark-rim gradient (core alpha capped so overlaps stay legible under the bloom)
    ctx.beginPath();
    const pts=[];
    for (let a=0;a<=72;a++){ const ang=(a/72)*TAU; const nR=R*(1+fbm(Math.cos(ang)+i+t*0.035,Math.sin(ang)+i,2)*0.36); const px=cx+Math.cos(ang)*nR; const py=cy+Math.sin(ang)*nR; pts.push([px,py,ang]); if (a===0) ctx.moveTo(px,py); else ctx.lineTo(px,py); }
    ctx.closePath();
    const bg=ctx.createRadialGradient(cx-R*0.25,cy-R*0.25,0,cx,cy,Math.max(1,R*1.15));
    bg.addColorStop(0,`hsla(${hue+8},52%,34%,0.08)`); bg.addColorStop(0.7,`hsla(${hue},48%,24%,0.06)`); bg.addColorStop(1,`hsla(${hue-6},40%,12%,0.02)`);
    ctx.fillStyle=bg; ctx.fill();
    // rim light on upper-left (L58, low alpha — on-identity, stays under the bright pass)
    ctx.save(); ctx.clip(); ctx.lineWidth=2.4; ctx.strokeStyle=`hsla(${hue+18},70%,58%,0.10)`;
    ctx.beginPath(); pts.forEach(([px,py,ang],k)=>{ if (Math.cos(ang+2.2)>0){ if (k===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);} }); ctx.stroke(); ctx.restore();
    // slip rings inside
    for (let ring=1;ring<=2;ring++){ ctx.beginPath(); const rr=R*(0.32*ring); for (let a=0;a<=40;a++){ const ang=(a/40)*TAU; const nr=rr*(1+fbm(Math.cos(ang)+i+ring+t*0.05,Math.sin(ang)+i,2)*0.22); const px=cx+Math.cos(ang)*nr, py=cy+Math.sin(ang)*nr; if (a===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);} ctx.closePath(); ctx.strokeStyle=`hsla(${hue+10},46%,40%,0.05)`; ctx.lineWidth=1; ctx.stroke(); }
  }
  // Dust sediment drifting (heat peak trimmed so pointer-centred specks can't bloom into bright dots)
  for (let i=0;i<70;i++){ const seed=i*43.7; const baseX=(Math.sin(seed*3.1)*0.5+0.5)*w; const baseY=(Math.cos(seed*2.7)*0.5+0.5)*h; const n=fbm(baseX*0.004+t*0.04,baseY*0.004+t*0.03,2); const ang=n*Math.PI*3; const x=baseX+Math.cos(ang)*(10+Math.sin(t*0.2+seed)*5); const y=baseY+Math.sin(ang)*(10+Math.cos(t*0.15+seed)*5); const md=Math.hypot(x-mxp,y-myp); const heat=md<140?(1-md/140):0; const hue=30+heat*18; ctx.beginPath(); ctx.arc(x,y,0.7+heat*0.7,0,TAU); ctx.fillStyle=`hsla(${hue},${40+heat*25}%,${52+heat*12}%,${0.05+heat*0.12})`; ctx.fill(); }
  // Crazing / crackle network
  ctx.lineWidth=0.6;
  for (let i=0;i<30;i++){ const seed=i*157.3; let px=(Math.sin(seed*2.3)*0.5+0.5)*w, py=(Math.cos(seed*1.8)*0.5+0.5)*h; ctx.beginPath(); ctx.moveTo(px,py); const len=18+Math.sin(seed)*14; for (let s=0;s<7;s++){ const n2=fbm(px*0.01+seed,py*0.01,2); px+=Math.cos(n2*Math.PI*4)*(len/7); py+=Math.sin(n2*Math.PI*4)*(len/7); ctx.lineTo(px,py); } ctx.strokeStyle=`hsla(22,34%,42%,${0.05+Math.sin(t*0.4+seed)*0.015})`; ctx.stroke(); }
  // Cursor warmth (alpha softened so the frozen pointer-centred frame keeps contrast where a heading sits)
  const mg=ctx.createRadialGradient(mxp,myp,0,mxp,myp,180); mg.addColorStop(0,"hsla(36,66%,48%,0.06)"); mg.addColorStop(0.6,"hsla(26,52%,36%,0.02)"); mg.addColorStop(1,"transparent"); ctx.fillStyle=mg; ctx.fillRect(0,0,w,h);
};
