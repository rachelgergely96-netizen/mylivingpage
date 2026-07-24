import { fbm } from "../shared/noise";
import { createSeededRandom } from "../shared/random";
import { softGlow } from "../shared/draw";
import type { ThemeRenderer } from "../types";

const TAU = Math.PI * 2;

const CFG = (function(){
  const rand = createSeededRandom(0x1a7c3f);
  const VW = 48, VH = 27;
  const ri = (a:number,b:number)=> a + Math.floor(rand()*(b-a+1));
  const rf = (a:number,b:number)=> a + rand()*(b-a);
  const dirs = [[1,0],[0,1],[-1,0],[0,-1]];

  const traces = [];
  const TRACE_COUNT = 30;
  for(let i=0;i<TRACE_COUNT;i++){
    let gx = ri(2, VW-2);
    let gy = ri(2, VH-2);
    const pts = [{x:gx,y:gy}];
    let d = ri(0,3);
    const segCount = ri(4,8);
    for(let s=0;s<segCount;s++){
      const len = ri(2,6);
      gx = Math.max(-2, Math.min(VW+2, gx + dirs[d][0]*len));
      gy = Math.max(-2, Math.min(VH+2, gy + dirs[d][1]*len));
      const last = pts[pts.length-1];
      if(gx!==last.x || gy!==last.y) pts.push({x:gx,y:gy});
      d = (d + (rand()>0.5?1:3)) & 3;
    }
    if(pts.length<2) pts.push({x:pts[0].x+3, y:pts[0].y});
    let total=0; const cum=[0];
    for(let k=1;k<pts.length;k++){ total += Math.abs(pts[k].x-pts[k-1].x)+Math.abs(pts[k].y-pts[k-1].y); cum.push(total); }
    if(total<=0) total=1;
    const lr = rand(); const layer = lr<0.42?0:(lr<0.75?1:2);
    traces.push({
      pts, cum, total, layer,
      hue: 156 + rand()*22,
      width: rf(0.7,1.8),
      speed: rf(2.4,5.2),
      phase: rand()*100,
      pulses: ri(1,2),
      dir: rand()<0.5?1:-1,
      breath: rand()*TAU,
      cold: rand()<0.22
    });
  }

  const comps = [];
  const COMP_COUNT = 26;
  const types = ["chip","cap","res","led","via","via"];
  for(let i=0;i<COMP_COUNT;i++){
    const ty = types[ri(0,types.length-1)];
    comps.push({
      x: rf(2, VW-2), y: rf(2, VH-2),
      type: ty, horiz: rand()<0.5,
      size: rf(0.7,1.5),
      hue: ty==="led" ? (rand()<0.5?150:172) : 160+rand()*14,
      phase: rand()*TAU,
      blink: rf(0.35,1.15),
      bright: rf(0.5,1),
      pins: 2 + 2*Math.floor(rand()*3)
    });
  }

  const pads = traces.map(tr=>({ p: tr.pts[tr.pts.length-1], phase: tr.phase, hue: tr.hue }));

  const dust = [];
  for(let i=0;i<14;i++){
    dust.push({ x: rand(), y: rand(), r: rf(0.03,0.08), hue: 160+rand()*16, phase: rand()*TAU, dx: rf(-0.03,0.03), dy: rf(-0.02,0.02), depth: rf(0.35,1) });
  }

  const specks = [];
  for(let i=0;i<130;i++){ specks.push({ x: rand(), y: rand(), n: rand(), s: rf(0.4,1.8), fx: rf(1.5,5) }); }

  const masses = [];
  const mh = [150,160,168,176,158];
  for(let i=0;i<5;i++){
    masses.push({ x: rf(0.12,0.88), y: rf(0.12,0.88), r: rf(0.28,0.44), hue: mh[i], amp: rf(0.5,0.9), dx: rf(0.03,0.06)*(rand()<0.5?-1:1), dy: rf(0.03,0.06)*(rand()<0.5?-1:1), phase: rand()*TAU, sp: rf(0.04,0.09) });
  }

  const rails = [];
  for(let i=0;i<3;i++){
    rails.push({ horiz: rand()<0.5, pos: rf(0.16,0.84), a: rf(0.02,0.28), b: rf(0.72,0.98), hue: 162+rand()*10, phase: rand()*TAU, speed: rf(0.5,1.1) });
  }

  return { VW, VH, traces, comps, pads, dust, specks, masses, rails };
})();

export const renderCircuit: ThemeRenderer = (
  ctx,
  w,
  h,
  time,
  mx,
  my,
  _deltaSeconds,
  motion,
) => {
  const t = motion?.reducedMotion ? 0 : time;
  const C = CFG;
  const VW=C.VW, VH=C.VH;
  const clamp=(v:number,a:number,b:number)=> v<a?a:(v>b?b:v);
  const X = (g:number) => g/VW*w;
  const Y = (g:number) => g/VH*h;
  const pxo = clamp(mx,0,1)-0.5, pyo = clamp(my,0,1)-0.5;
  const mpx = clamp(mx,0,1)*w, mpy = clamp(my,0,1)*h;
  const mind = Math.min(w,h);

  const ptAt = (tr:(typeof CFG.traces)[number],s:number)=>{
    const total=tr.total; s=((s%total)+total)%total;
    const cum=tr.cum, pts=tr.pts; let k=1;
    while(k<cum.length-1 && cum[k]<s) k++;
    const seg=(cum[k]-cum[k-1])||1; const f=clamp((s-cum[k-1])/seg,0,1);
    const a=pts[k-1], b=pts[k];
    return { x:a.x+(b.x-a.x)*f, y:a.y+(b.y-a.y)*f };
  };

  ctx.save();
  ctx.lineJoin="round"; ctx.lineCap="round";

  ctx.globalCompositeOperation="lighter";
  for(let i=0;i<C.masses.length;i++){
    const m=C.masses[i];
    const gx=(m.x + m.dx*Math.sin(t*m.sp + m.phase))*w;
    const gy=(m.y + m.dy*Math.cos(t*m.sp*0.8 + m.phase))*h;
    const R=m.r*mind*(0.92+0.08*Math.sin(t*0.3+m.phase));
    const a=0.055*m.amp*(0.72+0.28*Math.sin(t*0.22+m.phase*1.3));
    softGlow(ctx, gx, gy, R, `hsla(${m.hue|0},78%,44%,${a.toFixed(4)})`, "transparent");
  }
  softGlow(ctx, w*0.28, h*0.12, mind*0.5, "hsla(168,70%,40%,0.038)", "transparent");
  ctx.globalCompositeOperation="source-over";

  for(let i=0;i<C.specks.length;i++){
    const sp=C.specks[i];
    const n=fbm(sp.x*sp.fx + t*0.015, sp.y*sp.fx - t*0.01, 3);
    const a=0.015 + 0.05*(n*0.5+0.5)*sp.n;
    if(a<=0.006) continue;
    ctx.fillStyle=`hsla(166,45%,42%,${a.toFixed(4)})`;
    const s=sp.s*(0.6+0.4*(n*0.5+0.5));
    ctx.fillRect(sp.x*w, sp.y*h, s, s);
  }

  ctx.save();
  ctx.translate(-pxo*7, -pyo*7);
  const gbreath=0.6+0.4*Math.sin(t*0.4);
  for(let c=-1;c<=VW+1;c++){
    const major=(c%6===0);
    const av=(0.5+0.5*Math.sin(c*1.7+2.0));
    const a=(major?0.05:0.02)*av*(0.7+0.3*gbreath);
    ctx.strokeStyle=`hsla(168,42%,${major?38:32}%,${a.toFixed(4)})`;
    ctx.lineWidth=major?1.1:0.6;
    ctx.beginPath(); ctx.moveTo(X(c),-10); ctx.lineTo(X(c),h+10); ctx.stroke();
  }
  for(let r=-1;r<=VH+1;r++){
    const major=(r%6===0);
    const av=(0.5+0.5*Math.sin(r*2.1+1.0));
    const a=(major?0.05:0.02)*av*(0.7+0.3*gbreath);
    ctx.strokeStyle=`hsla(168,42%,${major?38:32}%,${a.toFixed(4)})`;
    ctx.lineWidth=major?1.1:0.6;
    ctx.beginPath(); ctx.moveTo(-10,Y(r)); ctx.lineTo(w+10,Y(r)); ctx.stroke();
  }
  ctx.restore();

  for(let i=0;i<C.rails.length;i++){
    const rl=C.rails[i];
    let x0,y0,x1,y1;
    if(rl.horiz){ y0=y1=rl.pos*h; x0=rl.a*w; x1=rl.b*w; }
    else { x0=x1=rl.pos*w; y0=rl.a*h; y1=rl.b*h; }
    ctx.globalCompositeOperation="lighter";
    ctx.strokeStyle=`hsla(${rl.hue|0},85%,45%,0.06)`;
    ctx.lineWidth=7;
    ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke();
    ctx.globalCompositeOperation="source-over";
    ctx.strokeStyle=`hsla(${rl.hue|0},68%,50%,0.11)`;
    ctx.lineWidth=1.6;
    ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke();
    const f=((t*rl.speed*0.12 + rl.phase)%1+1)%1;
    const ex=x0+(x1-x0)*f, ey=y0+(y1-y0)*f;
    ctx.globalCompositeOperation="lighter";
    softGlow(ctx, ex, ey, 16, `hsla(${rl.hue|0},90%,60%,0.10)`, "transparent");
    ctx.globalCompositeOperation="source-over";
  }

  const layerPar=[6,11,18];
  for(let li=0;li<3;li++){
    ctx.save();
    ctx.translate(-pxo*layerPar[li], -pyo*layerPar[li]);
    const lscale=[0.8,1,1.25][li];
    for(let i=0;i<C.traces.length;i++){
      const tr=C.traces[i];
      if(tr.layer!==li) continue;
      const pts=tr.pts;
      ctx.beginPath(); ctx.moveTo(X(pts[0].x),Y(pts[0].y));
      for(let k=1;k<pts.length;k++) ctx.lineTo(X(pts[k].x),Y(pts[k].y));
      const breath=0.55+0.45*Math.sin(t*0.7+tr.breath);
      const baseHue=tr.cold?176:tr.hue;
      ctx.globalCompositeOperation="lighter";
      ctx.strokeStyle=`hsla(${baseHue|0},90%,48%,${(0.05+0.05*breath).toFixed(4)})`;
      ctx.lineWidth=tr.width*lscale*3.4;
      ctx.stroke();
      ctx.globalCompositeOperation="source-over";
      ctx.strokeStyle=`hsla(${baseHue|0},82%,${(52+8*breath).toFixed(1)}%,${(0.12+0.14*breath*lscale).toFixed(4)})`;
      ctx.lineWidth=tr.width*lscale;
      ctx.stroke();
    }
    ctx.restore();
  }

  for(let i=0;i<C.traces.length;i++){
    const tr=C.traces[i];
    const lp=layerPar[tr.layer];
    const ox=-pxo*lp, oy=-pyo*lp;
    const hue=tr.cold?178:172;
    for(let p=0;p<tr.pulses;p++){
      const base=(t*tr.speed + tr.phase + p*tr.total/tr.pulses);
      const s=tr.dir>0? base : tr.total-base;
      const head=ptAt(tr,s);
      const hx=X(head.x)+ox, hy=Y(head.y)+oy;
      ctx.globalCompositeOperation="lighter";
      for(let q=1;q<=6;q++){
        const tp=ptAt(tr, s - tr.dir*q*0.55);
        const tx=X(tp.x)+ox, ty=Y(tp.y)+oy;
        const fa=(1-q/7);
        ctx.fillStyle=`hsla(${hue},95%,62%,${(0.18*fa).toFixed(4)})`;
        ctx.beginPath(); ctx.arc(tx,ty,2.1*fa+0.5,0,TAU); ctx.fill();
      }
      softGlow(ctx, hx, hy, 12, `hsla(${hue},96%,64%,0.4)`, "transparent");
      ctx.fillStyle=`hsla(${hue},92%,70%,0.55)`;
      ctx.beginPath(); ctx.arc(hx,hy,1.7,0,TAU); ctx.fill();
      ctx.globalCompositeOperation="source-over";
    }
  }

  ctx.save();
  ctx.translate(-pxo*18,-pyo*18);
  for(let i=0;i<C.pads.length;i++){
    const pd=C.pads[i];
    const x=X(pd.p.x), y=Y(pd.p.y);
    const b=0.5+0.5*Math.sin(t*0.9+pd.phase);
    ctx.strokeStyle=`hsla(${pd.hue|0},40%,30%,0.35)`; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(x,y,3.2,0,TAU); ctx.stroke();
    ctx.fillStyle=`hsla(${pd.hue|0},76%,${(50+8*b).toFixed(1)}%,${(0.12+0.16*b).toFixed(4)})`;
    ctx.beginPath(); ctx.arc(x,y,1.5,0,TAU); ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(-pxo*18,-pyo*18);
  for(let i=0;i<C.comps.length;i++){
    const cp=C.comps[i];
    const x=X(cp.x), y=Y(cp.y);
    const md=Math.hypot(x-mpx, y-mpy);
    const mouse=clamp(1-md/(mind*0.18),0,1);
    const bl=0.5+0.5*Math.sin(t*cp.blink+cp.phase);
    const act=clamp(bl*cp.bright + mouse*0.35, 0, 0.72);
    const S=cp.size;
    const hue=cp.hue|0;

    if(cp.type==="via"){
      ctx.strokeStyle=`hsla(${hue},35%,28%,0.5)`; ctx.lineWidth=1.4*S;
      ctx.beginPath(); ctx.arc(x,y,3.2*S,0,TAU); ctx.stroke();
      ctx.fillStyle=`hsla(${hue},18%,10%,0.6)`;
      ctx.beginPath(); ctx.arc(x,y,2.0*S,0,TAU); ctx.fill();
      ctx.fillStyle=`hsla(${hue},82%,${(54+10*act).toFixed(1)}%,${(0.16+0.18*act).toFixed(4)})`;
      ctx.beginPath(); ctx.arc(x,y,1.2*S,0,TAU); ctx.fill();
      if(act>0.55){ ctx.globalCompositeOperation="lighter"; softGlow(ctx,x,y,9*S,`hsla(${hue},90%,62%,${(0.12*act).toFixed(4)})`,"transparent"); ctx.globalCompositeOperation="source-over"; }
    } else if(cp.type==="chip"){
      const wch=(cp.horiz?9:6)*S, hch=(cp.horiz?6:9)*S;
      ctx.fillStyle=`hsla(${hue},22%,${(9+6*act).toFixed(1)}%,0.85)`;
      ctx.fillRect(x-wch/2,y-hch/2,wch,hch);
      ctx.strokeStyle=`hsla(${hue},60%,${(45+18*act).toFixed(1)}%,${(0.35+0.4*act).toFixed(4)})`; ctx.lineWidth=1;
      ctx.strokeRect(x-wch/2,y-hch/2,wch,hch);
      ctx.fillStyle=`hsla(${hue},50%,55%,${(0.3+0.3*act).toFixed(4)})`;
      const n=Math.min(4,cp.pins);
      for(let k=0;k<n;k++){
        const f=(k+0.5)/n;
        if(cp.horiz){ ctx.fillRect(x-wch/2+f*wch-0.8, y-hch/2-2.2, 1.6, 2.2); ctx.fillRect(x-wch/2+f*wch-0.8, y+hch/2, 1.6, 2.2); }
        else { ctx.fillRect(x-wch/2-2.2, y-hch/2+f*hch-0.8, 2.2, 1.6); ctx.fillRect(x+wch/2, y-hch/2+f*hch-0.8, 2.2, 1.6); }
      }
      ctx.fillStyle=`hsla(172,92%,66%,${(0.3+0.34*act).toFixed(4)})`;
      ctx.beginPath(); ctx.arc(x-wch/2+2.2*S, y-hch/2+2.2*S, 1.0*S, 0, TAU); ctx.fill();
      if(act>0.6){ ctx.globalCompositeOperation="lighter"; softGlow(ctx,x,y,Math.max(wch,hch)*1.3,`hsla(${hue},90%,60%,${(0.10*act).toFixed(4)})`,"transparent"); ctx.globalCompositeOperation="source-over"; }
    } else if(cp.type==="cap"){
      const wc=5*S, hc=7*S;
      ctx.fillStyle=`hsla(${hue},30%,${(14+8*act).toFixed(1)}%,0.85)`;
      ctx.fillRect(x-wc/2,y-hc/2,wc,hc);
      ctx.strokeStyle=`hsla(${hue},55%,50%,${(0.3+0.35*act).toFixed(4)})`; ctx.lineWidth=0.8;
      ctx.strokeRect(x-wc/2,y-hc/2,wc,hc);
      ctx.fillStyle=`hsla(${hue},66%,56%,${(0.34+0.32*act).toFixed(4)})`;
      ctx.fillRect(x-wc/2, y-hc/2, wc, 1.4);
    } else if(cp.type==="res"){
      const wr=8*S, hr=3*S;
      ctx.strokeStyle=`hsla(${hue},30%,40%,0.3)`; ctx.lineWidth=0.8;
      ctx.beginPath(); ctx.moveTo(x-wr/2-3,y); ctx.lineTo(x+wr/2+3,y); ctx.stroke();
      ctx.fillStyle=`hsla(${hue},28%,${(16+8*act).toFixed(1)}%,0.85)`;
      ctx.fillRect(x-wr/2,y-hr/2,wr,hr);
      for(let k=0;k<3;k++){ ctx.fillStyle=`hsla(${(hue+k*20)%360},60%,55%,${(0.3+0.3*act).toFixed(4)})`; ctx.fillRect(x-wr/2+1.5+k*2.2, y-hr/2, 1.1, hr); }
    } else {
      ctx.globalCompositeOperation="lighter";
      softGlow(ctx,x,y,9.5*S*(0.7+0.6*act),`hsla(${hue},96%,60%,${(0.08+0.16*act).toFixed(4)})`,"transparent");
      ctx.fillStyle=`hsla(${hue},94%,${(60+7*act).toFixed(1)}%,${(0.30+0.18*act).toFixed(4)})`;
      ctx.beginPath(); ctx.arc(x,y,1.9*S,0,TAU); ctx.fill();
      ctx.globalCompositeOperation="source-over";
    }
  }
  ctx.restore();

  ctx.globalCompositeOperation="lighter";
  for(let i=0;i<C.dust.length;i++){
    const d=C.dust[i];
    const dx=(d.x + d.dx*Math.sin(t*0.08+d.phase))*w - pxo*30*d.depth;
    const dy=(d.y + d.dy*Math.cos(t*0.06+d.phase))*h - pyo*30*d.depth;
    const a=(0.04+0.05*(0.5+0.5*Math.sin(t*0.5+d.phase)))*d.depth;
    softGlow(ctx, dx, dy, d.r*mind, `hsla(${d.hue|0},80%,60%,${a.toFixed(4)})`, "transparent");
  }
  ctx.globalCompositeOperation="source-over";

  const yb=(((t*0.05)%1.25)-0.12)*h;
  const sg=ctx.createLinearGradient(0,yb-h*0.09,0,yb+h*0.09);
  sg.addColorStop(0,"hsla(172,80%,58%,0)");
  sg.addColorStop(0.5,"hsla(172,82%,58%,0.028)");
  sg.addColorStop(1,"hsla(172,80%,58%,0)");
  ctx.globalCompositeOperation="lighter";
  ctx.fillStyle=sg; ctx.fillRect(0,yb-h*0.09,w,h*0.18);
  ctx.globalCompositeOperation="source-over";

  const vg=ctx.createRadialGradient(w*0.5,h*0.5,mind*0.2,w*0.5,h*0.5,mind*0.82);
  vg.addColorStop(0,"rgba(3,9,9,0.12)");
  vg.addColorStop(1,"rgba(2,6,6,0.62)");
  ctx.fillStyle=vg; ctx.fillRect(0,0,w,h);

  ctx.restore();
};
