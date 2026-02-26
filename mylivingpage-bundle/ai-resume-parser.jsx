import { useState, useEffect, useRef, useCallback } from "react";

// ─── NOISE ───
const PERM = new Uint8Array(512);
const GRAD = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
(function(){const p=[];for(let i=0;i<256;i++)p[i]=i;for(let i=255;i>0;i--){const j=Math.floor(Math.random()*(i+1));[p[i],p[j]]=[p[j],p[i]];}for(let i=0;i<512;i++)PERM[i]=p[i&255];})();
function noise2D(x,y){const X=Math.floor(x)&255,Y=Math.floor(y)&255,xf=x-Math.floor(x),yf=y-Math.floor(y),u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);const aa=PERM[PERM[X]+Y],ab=PERM[PERM[X]+Y+1],ba=PERM[PERM[X+1]+Y],bb=PERM[PERM[X+1]+Y+1];const g=(h,dx,dy)=>{const g2=GRAD[h&7];return g2[0]*dx+g2[1]*dy;};return(g(aa,xf,yf)+u*(g(ba,xf-1,yf)-g(aa,xf,yf)))+v*((g(ab,xf,yf-1)+u*(g(bb,xf-1,yf-1)-g(ab,xf,yf-1)))-(g(aa,xf,yf)+u*(g(ba,xf-1,yf)-g(aa,xf,yf))));}
function fbm(x,y,o=4){let v=0,a=0.5,f=1;for(let i=0;i<o;i++){v+=a*noise2D(x*f,y*f);a*=0.5;f*=2;}return v;}

// ─── THEMES ───
const THEMES = [
  { id:"cosmic", name:"Cosmic", vibe:"Visionary & Bold", bg:"#06061A" },
  { id:"fluid", name:"Fluid", vibe:"Creative & Approachable", bg:"#050E18" },
  { id:"ember", name:"Ember", vibe:"Passionate & Driven", bg:"#110605" },
  { id:"aurora", name:"Aurora", vibe:"Innovative & Fresh", bg:"#060D1F" },
  { id:"circuit", name:"Circuit", vibe:"Technical & Sharp", bg:"#050A0A" },
  { id:"sakura", name:"Sakura", vibe:"Elegant & Refined", bg:"#0F0A0D" },
];

// ─── THEME RENDERERS ───
function renderCosmic(ctx,w,h,t,mx,my){
  const neb=ctx.createRadialGradient(w*0.4+Math.sin(t*0.15)*w*0.1,h*0.35+Math.cos(t*0.12)*h*0.08,0,w*0.5,h*0.5,w*0.8);
  neb.addColorStop(0,"rgba(60,20,120,0.08)");neb.addColorStop(1,"transparent");ctx.fillStyle=neb;ctx.fillRect(0,0,w,h);
  const n2=ctx.createRadialGradient(w*0.7+Math.cos(t*0.1)*40,h*0.6,0,w*0.6,h*0.5,w*0.5);
  n2.addColorStop(0,"rgba(120,80,20,0.05)");n2.addColorStop(1,"transparent");ctx.fillStyle=n2;ctx.fillRect(0,0,w,h);
  const stars=[];
  for(let i=0;i<80;i++){const s=i*137.508,d=(i%3)+1,p=d*0.3;
    const px=((Math.sin(s)*0.5+0.5)*w+Math.sin(t*0.2*p+i*0.1)*6)%w;
    const py=((Math.cos(s*1.3)*0.5+0.5)*h+Math.cos(t*0.15*p+i*0.12)*5)%h;
    const r=(0.8+Math.sin(t*0.7+i*0.8)*0.4)*(4-d)*0.5;
    const tw=0.25+Math.sin(t*1.2+s)*0.2;const hue=42+Math.sin(i*0.3)*20;
    const dx=mx*w-px,dy=my*h-py,dist=Math.sqrt(dx*dx+dy*dy),mb=dist<120?(1-dist/120)*0.3:0;
    ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.fillStyle=`hsla(${hue},65%,${65+mb*30}%,${tw+mb})`;ctx.fill();
    ctx.beginPath();ctx.arc(px,py,r*5,0,Math.PI*2);ctx.fillStyle=`hsla(${hue},60%,60%,${tw*0.1+mb*0.15})`;ctx.fill();
    stars.push({x:px,y:py});}
  ctx.lineWidth=0.5;for(let i=0;i<stars.length;i++)for(let j=i+1;j<Math.min(i+6,stars.length);j++){
    const d=Math.hypot(stars[i].x-stars[j].x,stars[i].y-stars[j].y);
    if(d<w*0.12){ctx.beginPath();ctx.moveTo(stars[i].x,stars[i].y);ctx.lineTo(stars[j].x,stars[j].y);
    ctx.strokeStyle=`hsla(42,60%,65%,${(1-d/(w*0.12))*0.07})`;ctx.stroke();}}
}

function renderFluid(ctx,w,h,t,mx,my){
  const bg=ctx.createRadialGradient(w*(0.3+Math.sin(t*0.1)*0.1),h*(0.4+Math.cos(t*0.08)*0.1),0,w*0.5,h*0.5,w*0.8);
  bg.addColorStop(0,"rgba(10,40,60,0.15)");bg.addColorStop(1,"transparent");ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  for(let i=0;i<35;i++){ctx.beginPath();let px=((i*37.7+t*5)%w),py=((i*53.1+t*3)%h);ctx.moveTo(px,py);
    for(let s=0;s<60;s++){const n=fbm(px*0.006+t*0.05,py*0.006+t*0.03,3),a=n*Math.PI*3;
      const mdx=mx*w-px,mdy=my*h-py,md=Math.sqrt(mdx*mdx+mdy*mdy),ma=md<150?Math.atan2(mdy,mdx)*(1-md/150)*0.3:0;
      px+=Math.cos(a+ma)*4;py+=Math.sin(a+ma)*4;ctx.lineTo(px,py);}
    ctx.strokeStyle=`hsla(${195+(i%8)*5-15},75%,55%,${0.04+Math.sin(t*0.3+i*0.5)*0.02})`;ctx.lineWidth=1.5;ctx.stroke();}
  for(let i=0;i<10;i++){const ox=(Math.sin(t*0.12+i*1.8)*0.4+0.5)*w,oy=(Math.cos(t*0.1+i*1.4)*0.4+0.5)*h,or=6+Math.sin(t*0.4+i)*3;
    const g=ctx.createRadialGradient(ox,oy,0,ox,oy,or*6);g.addColorStop(0,`hsla(${195+i*10},80%,60%,0.15)`);g.addColorStop(1,"transparent");
    ctx.beginPath();ctx.arc(ox,oy,or*6,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();}
}

function renderEmber(ctx,w,h,t,mx,my){
  const haze=ctx.createLinearGradient(0,h,0,0);haze.addColorStop(0,`hsla(10,70%,12%,${0.15+Math.sin(t*0.3)*0.03})`);
  haze.addColorStop(0.3,"hsla(20,50%,6%,0.08)");haze.addColorStop(1,"transparent");ctx.fillStyle=haze;ctx.fillRect(0,0,w,h);
  for(let i=0;i<70;i++){const seed=i*73.7,sp=0.4+(i%7)*0.15,drift=Math.sin(t*0.3+seed)*30+Math.sin(t*0.7+i*0.5)*10;
    const windX=(mx-0.5)*40,rawX=(Math.sin(seed*1.7)*0.5+0.5)*w+drift+windX*sp;
    const cycle=(t*15*sp+seed*5)%(h*1.5),rawY=h+h*0.2-cycle,life=Math.max(0,Math.min(1,1-cycle/(h*1.5)));
    if(life<=0)continue;const x=((rawX%w)+w)%w,y=rawY,sz=(1+Math.sin(seed)*0.6)*life,hue=10+Math.sin(seed*0.5)*18+life*20;
    ctx.beginPath();ctx.arc(x,y,sz*2.5,0,Math.PI*2);ctx.fillStyle=`hsla(${hue},85%,${55+life*20}%,${life*0.6})`;ctx.fill();
    ctx.beginPath();ctx.arc(x,y,sz*10,0,Math.PI*2);ctx.fillStyle=`hsla(${hue},75%,50%,${life*0.06})`;ctx.fill();
    for(let tr=1;tr<4;tr++){ctx.beginPath();ctx.arc(x-drift*0.02*tr,y+tr*5*sp,sz*(1-tr*0.2),0,Math.PI*2);
      ctx.fillStyle=`hsla(${hue-tr*5},70%,45%,${life*0.2*(1-tr/4)})`;ctx.fill();}}
  const fire=ctx.createRadialGradient(w*0.5,h*1.1,0,w*0.5,h,w*0.6);
  fire.addColorStop(0,`hsla(20,80%,30%,${0.08+Math.sin(t*0.5)*0.03})`);fire.addColorStop(1,"transparent");
  ctx.fillStyle=fire;ctx.fillRect(0,0,w,h);
}

function renderAurora(ctx,w,h,t,mx,my){
  for(let band=0;band<7;band++){const baseY=h*(0.15+band*0.07),hue=160+band*22+Math.sin(t*0.2+band)*15;
    ctx.beginPath();ctx.moveTo(0,h);for(let x=0;x<=w;x+=3){const nVal=fbm(x*0.003+t*0.08+band*0.5,band*2+t*0.03,3);
      const mi=Math.exp(-Math.pow((x/w-mx),2)*8)*20*(my-0.5);ctx.lineTo(x,baseY+nVal*50+mi);}
    ctx.lineTo(w,h);ctx.closePath();const grad=ctx.createLinearGradient(0,baseY-40,0,h);
    grad.addColorStop(0,`hsla(${hue},65%,55%,0.06)`);grad.addColorStop(0.3,`hsla(${hue},55%,40%,0.03)`);
    grad.addColorStop(1,"transparent");ctx.fillStyle=grad;ctx.fill();}
  for(let i=0;i<40;i++){const seed=i*89.3,x=((Math.sin(seed*2.1)*0.5+0.5)*w+Math.sin(t*0.2+i)*15)%w;
    const fs=0.3+(i%5)*0.1,y=((t*10*fs+seed*7)%(h*1.2))-h*0.1;
    const alpha=0.15+Math.sin(t*1.5+seed)*0.1,hue=170+Math.sin(i*0.7)*50;
    ctx.beginPath();ctx.arc(x,y,1.2,0,Math.PI*2);ctx.fillStyle=`hsla(${hue},70%,70%,${alpha})`;ctx.fill();
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-8-Math.random()*4);ctx.strokeStyle=`hsla(${hue},60%,65%,${alpha*0.3})`;ctx.lineWidth=0.5;ctx.stroke();}
}

function renderCircuit(ctx,w,h,t,mx,my){
  const gs=40,cols=Math.ceil(w/gs)+1,rows=Math.ceil(h/gs)+1;
  for(let i=0;i<25;i++){const seed=i*127.3;ctx.beginPath();
    let cx=Math.floor((Math.sin(seed)*0.5+0.5)*cols)*gs,cy=Math.floor((Math.cos(seed*1.4)*0.5+0.5)*rows)*gs;
    ctx.moveTo(cx,cy);let dir=Math.floor(seed*10)%4;const dirs=[[1,0],[0,1],[-1,0],[0,-1]];
    for(let seg=0;seg<8;seg++){const len=gs*(1+Math.floor(Math.sin(seed+seg)*2+2));
      cx+=dirs[dir][0]*len;cy+=dirs[dir][1]*len;ctx.lineTo(cx,cy);dir=(dir+(Math.sin(seed+seg*3)>0?1:3))%4;}
    const pulse=(t*0.5+i*0.3)%3,alpha=pulse<1?0.02+pulse*0.06:pulse<2?0.08-(pulse-1)*0.06:0.02;
    ctx.strokeStyle=`hsla(165,70%,55%,${alpha})`;ctx.lineWidth=1;ctx.stroke();}
  for(let i=0;i<30;i++){const seed=i*97.1,nx=Math.floor((Math.sin(seed)*0.5+0.5)*cols)*gs,ny=Math.floor((Math.cos(seed*1.3)*0.5+0.5)*rows)*gs;
    const active=Math.sin(t*0.8+seed)>0.3,md=Math.hypot(nx-mx*w,ny-my*h),ma=md<80;
    if(active||ma){const br=ma?0.25:0.12;ctx.beginPath();ctx.arc(nx,ny,2,0,Math.PI*2);
      ctx.fillStyle=`hsla(165,75%,60%,${br})`;ctx.fill();ctx.beginPath();ctx.arc(nx,ny,ma?12:8,0,Math.PI*2);
      ctx.fillStyle=`hsla(165,70%,55%,${br*0.2})`;ctx.fill();}}
  for(let i=0;i<15;i++){const seed=i*61.7,pr=((t*0.4+i*0.7)%4)/4,px=(Math.sin(seed)*0.5+0.5)*w,py=pr*h;
    ctx.beginPath();ctx.arc(px,py,1.5,0,Math.PI*2);ctx.fillStyle="hsla(180,80%,65%,0.3)";ctx.fill();}
}

function renderSakura(ctx,w,h,t,mx,my){
  for(let i=0;i<6;i++){const cx=(Math.sin(t*0.04+i*3)*0.4+0.5)*w,cy=(Math.cos(t*0.035+i*2.2)*0.4+0.5)*h;
    const r=w*0.15+Math.sin(t*0.15+i)*w*0.03,hue=335+Math.sin(i*0.8)*15;
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,`hsla(${hue},50%,55%,0.04)`);g.addColorStop(1,"transparent");
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();}
  for(let i=0;i<30;i++){const seed=i*83.7,fs=0.15+(i%6)*0.05,wi=(mx-0.5)*30+Math.sin(t*0.3+seed)*20;
    const x=((Math.sin(seed*2.1)*0.5+0.5)*w+wi+Math.sin(t*0.2+i)*15)%w;
    const cycle=(t*8*fs+seed*5)%(h*1.4),y=cycle-h*0.2;
    const rot=t*0.5+seed+Math.sin(t*0.3+i)*0.5,life=Math.min(1,Math.max(0,1-Math.abs(y-h*0.5)/(h*0.6)));
    const hue=335+Math.sin(seed*0.3)*20,sz=3+Math.sin(seed)*1.5;
    ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.scale(1,0.6+Math.sin(t*0.8+i)*0.3);
    ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(sz*1.5,-sz,0,-sz*2.5);ctx.quadraticCurveTo(-sz*1.5,-sz,0,0);
    ctx.fillStyle=`hsla(${hue},55%,65%,${life*0.2})`;ctx.fill();ctx.restore();}
}

const RENDERERS = { cosmic:renderCosmic, fluid:renderFluid, ember:renderEmber, aurora:renderAurora, circuit:renderCircuit, sakura:renderSakura };

// ─── THEME CANVAS ───
function ThemeCanvas({ themeId, height=300, children, style:extraStyle }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const mouseRef = useRef({x:0.5,y:0.5});
  const theme = THEMES.find(t=>t.id===themeId);

  useEffect(()=>{
    const c=canvasRef.current; if(!c) return;
    const ctx=c.getContext("2d");
    const resize=()=>{c.width=c.offsetWidth*2;c.height=c.offsetHeight*2;};resize();
    const onMouse=(e)=>{const r=c.getBoundingClientRect();mouseRef.current={x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};};
    c.addEventListener("mousemove",onMouse);
    const start=performance.now(),render=RENDERERS[themeId];
    const animate=()=>{const t=(performance.now()-start)*0.001,w=c.width,h=c.height;
      ctx.fillStyle=theme?.bg||"#000";ctx.fillRect(0,0,w,h);
      if(render)render(ctx,w,h,t,mouseRef.current.x,mouseRef.current.y);
      animRef.current=requestAnimationFrame(animate);};
    animate();
    return ()=>{cancelAnimationFrame(animRef.current);c.removeEventListener("mousemove",onMouse);};
  },[themeId]);

  return (
    <div style={{position:"relative",borderRadius:14,overflow:"hidden",...extraStyle}}>
      <canvas ref={canvasRef} style={{width:"100%",height,display:"block",cursor:"crosshair"}} />
      {children && <div style={{position:"absolute",inset:0,zIndex:2}}>{children}</div>}
    </div>
  );
}

// ─── SAMPLE RESUME TEXT ───
const SAMPLE_RESUME = `RAY
Attorney & Technology Entrepreneur
New York, NY | ray@email.com | linkedin.com/in/ray

SUMMARY
Licensed attorney in New York building at the intersection of law and technology. Creator of multiple tech ventures including BarPrepPlay (275+ users), LiveCardStudio, and ReadyToClose. Passionate about making complex processes accessible through beautiful, gamified design.

EXPERIENCE

Founder & CEO — BarPrepPlay
2024 – Present
- Built gamified bar exam preparation platform from scratch as a coding newcomer
- Grew to 275+ active users generating passive revenue
- Designed progression systems, avatar rewards, and interactive study mechanics
- Developed comprehensive Florida and New York bar prep content

Founder — LiveCardStudio
2025 – Present
- Created living greeting card platform with procedural Canvas 2D graphics
- Engineered particle systems, synthesized audio, and animated themes
- Exploring NFC luxury print integration for physical-digital hybrid cards
- Built premium interactive card experiences with complex rendering

Founder — ReadyToClose
2024 – Present
- Developed mortgage technology platform for real estate professionals
- Streamlined closing workflow automation and document management
- Integrated compliance checking for RESPA and TILA requirements

Legal Practice
2023 – 2024
- Licensed attorney handling various legal matters
- Contract drafting, negotiation, and regulatory compliance
- Client counseling on business formation and IP protection

EDUCATION
Juris Doctor — Law School, 2023
Admitted to the New York State Bar

SKILLS
Legal Tech, SaaS Development, EdTech, UI/UX Design, Gamification, Canvas 2D, Product Design, Bar Exam Prep, Mortgage Technology, Business Strategy, AI Integration, Growth Marketing

CERTIFICATIONS
- New York State Bar (Licensed)
- Florida Bar (February 2026)`;

// ─── MAIN APP ───
export default function ResumeParser() {
  const [step, setStep] = useState("input"); // input | theme | generating | result
  const [resumeText, setResumeText] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("cosmic");
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [fadeIn, setFadeIn] = useState(true);

  const gold = "#D4A654", goldLight = "#F0D48A";

  const transition = (s) => { setFadeIn(false); setTimeout(()=>{setStep(s);setFadeIn(true);},280); };

  // ─── AI PARSE ───
  const parseResume = async () => {
    transition("generating");
    setProgress(0);
    setStage("Sending to AI...");
    setError(null);

    // Animate progress
    let p = 0;
    const progressInterval = setInterval(() => {
      p += 1;
      if (p <= 90) setProgress(p);
    }, 80);

    const stages = [
      { at: 10, label: "Analyzing resume structure..." },
      { at: 25, label: "Extracting experience data..." },
      { at: 45, label: "Identifying skills & certifications..." },
      { at: 65, label: "Structuring professional profile..." },
      { at: 80, label: "Finalizing JSON output..." },
    ];

    const stageInterval = setInterval(() => {
      const current = stages.find(s => s.at <= p && s.at > p - 3);
      if (current) setStage(current.label);
    }, 200);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [{
            role: "user",
            content: `Parse this resume into structured JSON. Return ONLY valid JSON with no markdown backticks, no preamble, no explanation. Just the raw JSON object.

The JSON must have exactly this structure:
{
  "name": "string",
  "headline": "string (professional title/tagline)",
  "location": "string",
  "email": "string or null",
  "linkedin": "string or null",
  "website": "string or null",
  "summary": "string (2-3 sentence professional summary)",
  "experience": [
    {
      "title": "string",
      "company": "string",
      "dates": "string",
      "highlights": ["string", "string"]
    }
  ],
  "education": [
    {
      "degree": "string",
      "school": "string",
      "year": "string"
    }
  ],
  "skills": ["string"],
  "certifications": ["string"],
  "stats": [
    { "value": "string", "label": "string" }
  ]
}

For "stats", extract 3-4 impressive quantitative highlights from the resume (like years of experience, number of users, number of ventures, etc). Make the "value" short and punchy.

RESUME TEXT:
${resumeText}`
          }]
        })
      });

      const data = await response.json();

      clearInterval(progressInterval);
      clearInterval(stageInterval);

      if (data.error) {
        throw new Error(data.error.message || "API error");
      }

      const text = data.content?.map(c => c.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();

      let parsed;
      try {
        parsed = JSON.parse(clean);
      } catch (e) {
        // Try to extract JSON from the response
        const match = clean.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          throw new Error("Could not parse AI response as JSON");
        }
      }

      setParsedData(parsed);
      setProgress(100);
      setStage("Done!");
      setTimeout(() => transition("result"), 600);

    } catch (err) {
      clearInterval(progressInterval);
      clearInterval(stageInterval);
      setError(err.message);
      setProgress(0);
      setStage("");
      transition("input");
    }
  };

  const primaryBtn = { background:`linear-gradient(135deg,${gold},${goldLight})`, color:"#1A0A2E", border:"none", padding:"14px 32px", borderRadius:100, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"all 0.3s" };
  const ghostBtn = { background:"transparent", color:"rgba(245,240,235,0.6)", border:"1px solid rgba(255,255,255,0.1)", padding:"14px 24px", borderRadius:100, fontSize:14, cursor:"pointer", fontFamily:"inherit" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@300;400&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 20px rgba(212,166,84,0.15); } 50% { box-shadow: 0 0 40px rgba(212,166,84,0.3); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: #D4A654; color: #1A0A2E; }
        textarea:focus, input:focus { outline: none; border-color: #D4A654 !important; }
      `}</style>
      <div style={{ minHeight:"100vh", background:"linear-gradient(170deg,#1A0A2E 0%,#0F0519 50%,#120A20 100%)", fontFamily:"'DM Sans',system-ui,sans-serif", color:"#F5F0EB", display:"flex", flexDirection:"column" }}>

        {/* Header */}
        <div style={{ padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:18, fontWeight:700 }}>my<span style={{color:gold}}>living</span>page</div>
          <div style={{ display:"flex", gap:6 }}>
            {["input","theme","generating","result"].map((s,i)=>(
              <div key={s} style={{ width: i<=["input","theme","generating","result"].indexOf(step)?28:20, height:3, borderRadius:100, background: i<=["input","theme","generating","result"].indexOf(step)?`linear-gradient(90deg,${gold},${goldLight})`:"rgba(255,255,255,0.06)", transition:"all 0.5s" }} />
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding: step==="result"?"20px 16px 40px":"40px 20px 60px", opacity:fadeIn?1:0, transform:fadeIn?"translateY(0)":"translateY(12px)", transition:"all 0.3s cubic-bezier(0.16,1,0.3,1)" }}>

          {/* ─── INPUT ─── */}
          {step==="input" && (
            <div style={{ maxWidth:560, width:"100%", margin:"0 auto" }}>
              <div style={{ textAlign:"center", marginBottom:28 }}>
                <div style={{ fontSize:11, letterSpacing:3, textTransform:"uppercase", color:gold, marginBottom:10 }}>Step 1</div>
                <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:30 }}>Paste Your Resume</h1>
                <p style={{ color:"rgba(245,240,235,0.4)", fontSize:14, marginTop:8, fontWeight:300 }}>Drop in your resume text and our AI will structure it instantly.</p>
              </div>

              {error && (
                <div style={{ background:"rgba(255,80,80,0.08)", border:"1px solid rgba(255,80,80,0.2)", borderRadius:12, padding:"12px 16px", marginBottom:16, fontSize:13, color:"#ff8888" }}>
                  ⚠ {error}. Please try again.
                </div>
              )}

              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your resume text here..."
                style={{
                  width:"100%", minHeight:240, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)",
                  borderRadius:16, padding:20, color:"#F5F0EB", fontSize:13, fontFamily:"'DM Mono',monospace",
                  lineHeight:1.6, resize:"vertical", transition:"border-color 0.3s",
                }}
              />

              <div style={{ display:"flex", alignItems:"center", gap:12, margin:"16px 0", color:"rgba(245,240,235,0.2)", fontSize:11, letterSpacing:1 }}>
                <div style={{flex:1,height:1,background:"rgba(255,255,255,0.06)"}} />
                OR TRY A SAMPLE
                <div style={{flex:1,height:1,background:"rgba(255,255,255,0.06)"}} />
              </div>

              <button onClick={()=>setResumeText(SAMPLE_RESUME)} style={{
                ...ghostBtn, width:"100%", fontSize:13,
                borderColor: resumeText===SAMPLE_RESUME ? "rgba(212,166,84,0.3)" : undefined,
                color: resumeText===SAMPLE_RESUME ? gold : undefined,
              }}>
                {resumeText===SAMPLE_RESUME ? "✦ Sample loaded" : "Load sample resume"}
              </button>

              <button onClick={()=>{if(resumeText.trim()) transition("theme");}} style={{
                ...primaryBtn, width:"100%", marginTop:16, opacity:resumeText.trim()?1:0.35, padding:"16px 32px",
              }}>
                Continue to Theme Selection →
              </button>

              <p style={{ textAlign:"center", fontSize:11, color:"rgba(245,240,235,0.2)", marginTop:12 }}>
                {resumeText.length > 0 ? `${resumeText.length} characters · ${resumeText.split(/\n/).length} lines` : "Waiting for input..."}
              </p>
            </div>
          )}

          {/* ─── THEME ─── */}
          {step==="theme" && (
            <div style={{ maxWidth:700, width:"100%", margin:"0 auto" }}>
              <div style={{ textAlign:"center", marginBottom:28 }}>
                <div style={{ fontSize:11, letterSpacing:3, textTransform:"uppercase", color:gold, marginBottom:10 }}>Step 2</div>
                <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:30 }}>Choose Your Vibe</h1>
                <p style={{ color:"rgba(245,240,235,0.4)", fontSize:14, marginTop:8, fontWeight:300 }}>Each theme renders unique living art behind your content. Hover to interact.</p>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:12 }}>
                {THEMES.map(th => (
                  <div key={th.id} onClick={()=>setSelectedTheme(th.id)} style={{
                    border:`1.5px solid ${selectedTheme===th.id?gold:"rgba(255,255,255,0.05)"}`,
                    borderRadius:16, overflow:"hidden", cursor:"pointer",
                    background: selectedTheme===th.id ? "rgba(212,166,84,0.04)" : "rgba(255,255,255,0.01)",
                    transition:"all 0.35s cubic-bezier(0.16,1,0.3,1)",
                    transform: selectedTheme===th.id ? "translateY(-2px)" : "none",
                  }}>
                    <div style={{position:"relative"}}>
                      <ThemeCanvas themeId={th.id} height={100} />
                      {selectedTheme===th.id && <div style={{ position:"absolute",top:6,right:6,width:20,height:20,borderRadius:"50%",background:gold,color:"#1A0A2E", display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700 }}>✓</div>}
                    </div>
                    <div style={{padding:"10px 12px 12px"}}>
                      <h3 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:15, marginBottom:2 }}>{th.name}</h3>
                      <p style={{ fontSize:9, letterSpacing:1.5, textTransform:"uppercase", color: selectedTheme===th.id?gold:"rgba(245,240,235,0.2)" }}>{th.vibe}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display:"flex", gap:12, marginTop:24 }}>
                <button onClick={()=>transition("input")} style={{...ghostBtn,flex:1}}>← Back</button>
                <button onClick={parseResume} style={{...primaryBtn,flex:2,padding:"16px 32px"}}>
                  Generate My Living Page ✦
                </button>
              </div>
            </div>
          )}

          {/* ─── GENERATING ─── */}
          {step==="generating" && (
            <div style={{ maxWidth:420, width:"100%", margin:"0 auto", textAlign:"center" }}>
              <div style={{ width:72, height:72, borderRadius:"50%", border:"2px solid rgba(212,166,84,0.15)", borderTopColor:gold, margin:"0 auto 28px", animation:"spin 1s linear infinite, pulseGlow 2s ease infinite" }} />
              <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:26, marginBottom:10 }}>Bringing You to Life</h2>
              <p style={{ color:gold, fontSize:14, minHeight:22 }}>{stage}</p>
              <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:100, height:5, margin:"24px 0 10px", overflow:"hidden" }}>
                <div style={{ height:"100%", borderRadius:100, background:`linear-gradient(90deg,${gold},${goldLight})`, width:`${progress}%`, transition:"width 0.3s ease" }} />
              </div>
              <p style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:"rgba(245,240,235,0.25)" }}>{progress}%</p>
            </div>
          )}

          {/* ─── RESULT ─── */}
          {step==="result" && parsedData && (
            <div style={{ maxWidth:780, width:"100%", margin:"0 auto" }}>
              <div style={{ textAlign:"center", marginBottom:16 }}>
                <div style={{ fontSize:11, letterSpacing:3, textTransform:"uppercase", color:gold, marginBottom:6 }}>✦ Your Living Page</div>
                <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:26 }}>It's Alive</h1>
              </div>

              {/* Browser frame with living page */}
              <div style={{ border:"1px solid rgba(212,166,84,0.12)", borderRadius:18, overflow:"hidden", boxShadow:"0 40px 100px rgba(0,0,0,0.5), 0 0 80px rgba(212,166,84,0.05)" }}>
                <div style={{ background:"rgba(0,0,0,0.4)", padding:"10px 16px", display:"flex", alignItems:"center", gap:10, borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{display:"flex",gap:6}}>
                    <span style={{width:10,height:10,borderRadius:"50%",background:"#FF5F57"}} />
                    <span style={{width:10,height:10,borderRadius:"50%",background:"#FEBC2E"}} />
                    <span style={{width:10,height:10,borderRadius:"50%",background:"#28C840"}} />
                  </div>
                  <div style={{ flex:1, background:"rgba(255,255,255,0.05)", borderRadius:6, padding:"5px 12px", fontFamily:"'DM Mono',monospace", fontSize:11, color:"rgba(245,240,235,0.5)" }}>
                    mylivingpage.com/<span style={{color:goldLight}}>{(parsedData.name||"you").toLowerCase().replace(/\s+/g,"-")}</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:9, color:"#28C840", letterSpacing:1, textTransform:"uppercase" }}>
                    <span style={{width:5,height:5,borderRadius:"50%",background:"#28C840"}} /> LIVE
                  </div>
                </div>

                <ThemeCanvas themeId={selectedTheme} height={520} style={{borderRadius:0}}>
                  <div style={{ padding:"32px 28px", height:"100%", overflowY:"auto",
                    background:"radial-gradient(ellipse at 30% 20%, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.4) 100%)" }}>

                    {/* Header */}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
                      <div>
                        <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:32, textShadow:"0 2px 16px rgba(0,0,0,0.5)" }}>{parsedData.name}</h2>
                        <p style={{ color:gold, fontSize:12, letterSpacing:2, textTransform:"uppercase", marginTop:3 }}>{parsedData.headline}</p>
                        {parsedData.location && <p style={{ color:"rgba(245,240,235,0.35)", fontSize:12, marginTop:3 }}>{parsedData.location}</p>}
                      </div>
                      <div style={{ width:60, height:60, borderRadius:"50%", background:`linear-gradient(135deg,${gold},#E8845C)`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Playfair Display',Georgia,serif", fontSize:24, fontWeight:700, color:"#1A0A2E", boxShadow:`0 0 30px rgba(212,166,84,0.3)`, flexShrink:0 }}>
                        {(parsedData.name||"?")[0]}
                      </div>
                    </div>

                    {/* Summary */}
                    {parsedData.summary && (
                      <p style={{ fontSize:13, color:"rgba(245,240,235,0.5)", lineHeight:1.7, fontWeight:300, marginBottom:20, textShadow:"0 1px 6px rgba(0,0,0,0.3)" }}>
                        {parsedData.summary}
                      </p>
                    )}

                    {/* Stats */}
                    {parsedData.stats?.length > 0 && (
                      <div style={{ display:"grid", gridTemplateColumns:`repeat(${Math.min(parsedData.stats.length,4)}, 1fr)`, gap:8, marginBottom:20 }}>
                        {parsedData.stats.slice(0,4).map((s,i) => (
                          <div key={i} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:"12px 8px", textAlign:"center", backdropFilter:"blur(8px)" }}>
                            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:18, color:goldLight }}>{s.value}</div>
                            <div style={{ fontSize:9, color:"rgba(245,240,235,0.4)", letterSpacing:1.5, textTransform:"uppercase", marginTop:2 }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Experience */}
                    {parsedData.experience?.length > 0 && (
                      <div style={{ marginBottom:18 }}>
                        <h3 style={{ fontSize:10, letterSpacing:2, textTransform:"uppercase", color:gold, marginBottom:8 }}>Experience</h3>
                        {parsedData.experience.map((exp,i) => (
                          <div key={i} style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.04)", borderRadius:12, padding:14, marginBottom:6, backdropFilter:"blur(8px)" }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", flexWrap:"wrap", gap:4 }}>
                              <div>
                                <span style={{ fontWeight:500, fontSize:13 }}>{exp.title}</span>
                                <span style={{ color:"rgba(245,240,235,0.35)", fontSize:12 }}> · {exp.company}</span>
                              </div>
                              <span style={{ fontSize:10, color:"rgba(245,240,235,0.25)", fontFamily:"'DM Mono',monospace" }}>{exp.dates}</span>
                            </div>
                            {exp.highlights?.length > 0 && (
                              <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:6 }}>
                                {exp.highlights.slice(0,3).map((h,j) => (
                                  <span key={j} style={{ fontSize:10, color:"rgba(245,240,235,0.4)", background:"rgba(255,255,255,0.03)", borderRadius:6, padding:"2px 8px" }}>{h}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Education */}
                    {parsedData.education?.length > 0 && (
                      <div style={{ marginBottom:18 }}>
                        <h3 style={{ fontSize:10, letterSpacing:2, textTransform:"uppercase", color:gold, marginBottom:8 }}>Education</h3>
                        {parsedData.education.map((ed,i) => (
                          <div key={i} style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.04)", borderRadius:10, padding:12, marginBottom:4 }}>
                            <span style={{fontWeight:500,fontSize:13}}>{ed.degree}</span>
                            <span style={{color:"rgba(245,240,235,0.35)",fontSize:12}}> · {ed.school}</span>
                            {ed.year && <span style={{fontSize:10,color:"rgba(245,240,235,0.25)",marginLeft:8,fontFamily:"'DM Mono',monospace"}}>{ed.year}</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Skills */}
                    {parsedData.skills?.length > 0 && (
                      <div style={{marginBottom:14}}>
                        <h3 style={{ fontSize:10, letterSpacing:2, textTransform:"uppercase", color:gold, marginBottom:8 }}>Skills</h3>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                          {parsedData.skills.map((s,i) => (
                            <span key={i} style={{ background:"rgba(212,166,84,0.07)", border:"1px solid rgba(212,166,84,0.2)", borderRadius:100, padding:"3px 12px", fontSize:11, color:goldLight }}>{s}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Certifications */}
                    {parsedData.certifications?.length > 0 && (
                      <div>
                        <h3 style={{ fontSize:10, letterSpacing:2, textTransform:"uppercase", color:gold, marginBottom:8 }}>Certifications</h3>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                          {parsedData.certifications.map((c,i) => (
                            <span key={i} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:100, padding:"3px 12px", fontSize:11, color:"rgba(245,240,235,0.5)" }}>{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ThemeCanvas>
              </div>

              {/* Actions */}
              <div style={{ display:"flex", gap:10, marginTop:20, flexWrap:"wrap" }}>
                <button style={{...primaryBtn, flex:"1 1 auto"}}>Share Your Page ↗</button>
                <button onClick={()=>{setSelectedTheme("cosmic");transition("theme");}} style={{...ghostBtn, flex:"1 1 auto"}}>Change Theme</button>
                <button onClick={()=>{setParsedData(null);transition("input");}} style={{...ghostBtn, flex:"1 1 auto"}}>New Resume</button>
                <button onClick={()=>{
                  const el=document.createElement("textarea");el.value=JSON.stringify(parsedData,null,2);
                  document.body.appendChild(el);el.select();document.execCommand("copy");document.body.removeChild(el);
                  alert("Parsed JSON copied to clipboard!");
                }} style={{...ghostBtn,padding:"14px 20px"}} title="Copy JSON">{ }</button>
              </div>

              {/* Raw JSON toggle */}
              <details style={{ marginTop:16 }}>
                <summary style={{ fontSize:12, color:"rgba(245,240,235,0.3)", cursor:"pointer", padding:"8px 0" }}>
                  View parsed JSON data
                </summary>
                <pre style={{
                  background:"rgba(0,0,0,0.3)", border:"1px solid rgba(255,255,255,0.05)",
                  borderRadius:12, padding:16, fontSize:11, color:"rgba(245,240,235,0.5)",
                  fontFamily:"'DM Mono',monospace", lineHeight:1.6, overflow:"auto", maxHeight:300,
                  whiteSpace:"pre-wrap", wordBreak:"break-word",
                }}>
                  {JSON.stringify(parsedData, null, 2)}
                </pre>
              </details>

              <p style={{ textAlign:"center", marginTop:14, fontSize:11, color:"rgba(245,240,235,0.2)" }}>
                mylivingpage.com/{(parsedData.name||"you").toLowerCase().replace(/\s+/g,"-")} — Your living, breathing digital identity
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
