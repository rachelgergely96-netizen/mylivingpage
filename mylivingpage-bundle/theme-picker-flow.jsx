import { useState, useEffect, useRef, useCallback } from "react";

// ─── THEME DEFINITIONS ───
const THEMES = [
  {
    id: "cosmic",
    name: "Cosmic",
    desc: "Deep space particles, golden constellations, celestial drift",
    vibe: "Visionary & Bold",
    bg: "#0A0A2E",
    colors: { primary: [42, 70, 65], accent: [262, 60, 55], particle: [42, 65, 70] },
  },
  {
    id: "fluid",
    name: "Fluid",
    desc: "Organic flow fields, ocean gradients, liquid motion",
    vibe: "Creative & Approachable",
    bg: "#0D1B2A",
    colors: { primary: [190, 75, 55], accent: [195, 85, 75], particle: [192, 70, 65] },
  },
  {
    id: "ember",
    name: "Ember",
    desc: "Warm floating particles, glowing embers, firelight depth",
    vibe: "Passionate & Driven",
    bg: "#1A0A0A",
    colors: { primary: [20, 75, 60], accent: [35, 80, 65], particle: [25, 70, 60] },
  },
  {
    id: "monolith",
    name: "Monolith",
    desc: "Geometric wireframes, sharp precision, dark minimalism",
    vibe: "Executive & Minimal",
    bg: "#080808",
    colors: { primary: [0, 0, 80], accent: [0, 0, 50], particle: [0, 0, 65] },
  },
  {
    id: "aurora",
    name: "Aurora",
    desc: "Shimmering curtains, spectral glow, ethereal light bands",
    vibe: "Innovative & Fresh",
    bg: "#0B132B",
    colors: { primary: [170, 60, 55], accent: [270, 65, 55], particle: [210, 70, 60] },
  },
  {
    id: "terracotta",
    name: "Terracotta",
    desc: "Earthy warmth, organic textures, slow natural motion",
    vibe: "Grounded & Authentic",
    bg: "#1A120B",
    colors: { primary: [28, 55, 60], accent: [42, 65, 70], particle: [30, 50, 55] },
  },
];

const SAMPLE_RESUME = {
  name: "Ray",
  headline: "Attorney & Tech Founder",
  location: "New York, NY",
  summary: "Licensed attorney building at the intersection of law and technology. Creator of BarPrepPlay, a gamified bar exam platform with 275+ users.",
  experience: [
    { title: "Founder & CEO", company: "BarPrepPlay", dates: "2024 – Present", highlights: ["275+ active users generating passive revenue", "Gamified bar exam prep with progression systems", "Built full-stack web app as a coding newcomer"] },
    { title: "Founder", company: "LiveCardStudio", dates: "2025 – Present", highlights: ["Living greeting card platform with procedural graphics", "Canvas 2D particle systems & synthesized audio", "NFC luxury print integration"] },
    { title: "Founder", company: "ReadyToClose", dates: "2024 – Present", highlights: ["Mortgage technology platform for professionals", "Streamlined closing workflow automation"] },
  ],
  education: [{ degree: "Juris Doctor", school: "Law School", year: "2023" }],
  skills: ["Legal Tech", "SaaS", "EdTech", "Bar Prep", "UI/UX", "Gamification", "Canvas 2D", "Product Design"],
  certifications: ["NY Bar (Licensed)", "FL Bar (Feb 2026)"],
};

// ─── THEME CANVAS RENDERER ───
function drawThemeCanvas(canvas, themeId, time) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const theme = THEMES.find((t) => t.id === themeId);
  if (!theme) return;

  ctx.clearRect(0, 0, w, h);

  // Background gradient
  const bg = ctx.createRadialGradient(w * 0.3, h * 0.3, 0, w * 0.5, h * 0.5, w * 0.8);
  bg.addColorStop(0, theme.bg + "FF");
  bg.addColorStop(1, theme.bg + "CC");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const { primary, accent, particle } = theme.colors;
  const t = time * 0.001;

  if (themeId === "cosmic") {
    // Stars + constellation lines
    for (let i = 0; i < 60; i++) {
      const seed = i * 137.508;
      const x = ((Math.sin(seed) * 0.5 + 0.5) * w + Math.sin(t * 0.3 + i * 0.1) * 4) % w;
      const y = ((Math.cos(seed * 1.3) * 0.5 + 0.5) * h + Math.cos(t * 0.2 + i * 0.15) * 3) % h;
      const r = 1 + Math.sin(t + i) * 0.5;
      const alpha = 0.3 + Math.sin(t * 0.8 + i * 0.5) * 0.2;

      ctx.beginPath();
      ctx.arc(x, y, r * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${particle[0] + Math.sin(i) * 15}, ${particle[1]}%, ${particle[2]}%, ${alpha})`;
      ctx.fill();

      // Glow
      ctx.beginPath();
      ctx.arc(x, y, r * 8, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${particle[0]}, ${particle[1]}%, ${particle[2]}%, ${alpha * 0.12})`;
      ctx.fill();

      // Connections
      for (let j = i + 1; j < Math.min(i + 5, 60); j++) {
        const seed2 = j * 137.508;
        const x2 = ((Math.sin(seed2) * 0.5 + 0.5) * w + Math.sin(t * 0.3 + j * 0.1) * 4) % w;
        const y2 = ((Math.cos(seed2 * 1.3) * 0.5 + 0.5) * h + Math.cos(t * 0.2 + j * 0.15) * 3) % h;
        const dist = Math.sqrt((x - x2) ** 2 + (y - y2) ** 2);
        if (dist < w * 0.2) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = `hsla(${particle[0]}, ${particle[1]}%, ${particle[2]}%, ${0.06 * (1 - dist / (w * 0.2))})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  } else if (themeId === "fluid") {
    // Flow field lines
    for (let i = 0; i < 25; i++) {
      ctx.beginPath();
      let x = (i / 25) * w;
      let y = h * 0.5;
      ctx.moveTo(x, y);
      for (let step = 0; step < 40; step++) {
        const angle = Math.sin(x * 0.008 + t * 0.5) * Math.cos(y * 0.006 + t * 0.3) * Math.PI;
        x += Math.cos(angle) * 5;
        y += Math.sin(angle) * 5;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `hsla(${primary[0] + i * 2}, ${primary[1]}%, ${primary[2]}%, 0.12)`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // Floating orbs
    for (let i = 0; i < 12; i++) {
      const x = (Math.sin(t * 0.2 + i * 1.5) * 0.4 + 0.5) * w;
      const y = (Math.cos(t * 0.15 + i * 1.2) * 0.4 + 0.5) * h;
      const r = 8 + Math.sin(t + i) * 3;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
      grad.addColorStop(0, `hsla(${primary[0] + i * 8}, ${primary[1]}%, ${primary[2]}%, 0.2)`);
      grad.addColorStop(1, `hsla(${primary[0]}, ${primary[1]}%, ${primary[2]}%, 0)`);
      ctx.beginPath();
      ctx.arc(x, y, r * 3, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }
  } else if (themeId === "ember") {
    // Rising embers
    for (let i = 0; i < 50; i++) {
      const seed = i * 97.3;
      const x = ((Math.sin(seed) * 0.5 + 0.5) * w + Math.sin(t * 0.5 + i) * 10) % w;
      const rawY = (seed * 3 + t * 20 * (0.5 + (i % 5) * 0.2)) % (h * 1.3);
      const y = h - rawY + h * 0.15;
      const r = 1.5 + Math.sin(t * 2 + i) * 1;
      const life = Math.max(0, 1 - rawY / (h * 1.3));
      const hue = primary[0] + Math.sin(i) * 15;

      ctx.beginPath();
      ctx.arc(x, y, r * 2, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, ${primary[1]}%, ${primary[2] + 10}%, ${life * 0.5})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, r * 6, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, ${primary[1]}%, ${primary[2]}%, ${life * 0.08})`;
      ctx.fill();
    }
    // Base glow
    const baseGrad = ctx.createLinearGradient(0, h, 0, h * 0.6);
    baseGrad.addColorStop(0, `hsla(${primary[0]}, ${primary[1]}%, 20%, 0.15)`);
    baseGrad.addColorStop(1, "transparent");
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, w, h);
  } else if (themeId === "monolith") {
    // Rotating wireframe geometry
    const cx = w / 2, cy = h / 2;
    const size = Math.min(w, h) * 0.3;
    ctx.strokeStyle = `hsla(0, 0%, 80%, 0.08)`;
    ctx.lineWidth = 0.8;
    for (let ring = 0; ring < 4; ring++) {
      const s = size * (0.4 + ring * 0.2);
      const rot = t * 0.2 * (ring % 2 === 0 ? 1 : -1);
      const sides = 4 + ring * 2;
      ctx.beginPath();
      for (let i = 0; i <= sides; i++) {
        const angle = (i / sides) * Math.PI * 2 + rot;
        const px = cx + Math.cos(angle) * s;
        const py = cy + Math.sin(angle) * s;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    // Grid dots
    for (let gx = 0; gx < w; gx += 30) {
      for (let gy = 0; gy < h; gy += 30) {
        const dist = Math.sqrt((gx - cx) ** 2 + (gy - cy) ** 2);
        const pulse = Math.sin(dist * 0.01 - t) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(gx, gy, 0.5 + pulse * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.05 + pulse * 0.05})`;
        ctx.fill();
      }
    }
  } else if (themeId === "aurora") {
    // Aurora curtains
    for (let band = 0; band < 5; band++) {
      ctx.beginPath();
      const baseY = h * (0.25 + band * 0.08);
      ctx.moveTo(0, baseY);
      for (let x = 0; x <= w; x += 4) {
        const wave = Math.sin(x * 0.005 + t * 0.4 + band * 0.8) * 30 +
          Math.sin(x * 0.01 + t * 0.6 + band) * 15;
        ctx.lineTo(x, baseY + wave);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      const hue = primary[0] + band * 25 + Math.sin(t * 0.3) * 10;
      ctx.fillStyle = `hsla(${hue}, ${primary[1]}%, ${primary[2]}%, 0.04)`;
      ctx.fill();
    }
    // Shimmer particles
    for (let i = 0; i < 30; i++) {
      const x = (Math.sin(i * 2.4 + t * 0.1) * 0.5 + 0.5) * w;
      const y = (Math.sin(i * 1.8 + t * 0.15) * 0.3 + 0.3) * h;
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${accent[0] + i * 8}, 70%, 70%, ${0.2 + Math.sin(t + i) * 0.15})`;
      ctx.fill();
    }
  } else if (themeId === "terracotta") {
    // Organic noise blobs
    for (let i = 0; i < 8; i++) {
      const cx2 = (Math.sin(t * 0.1 + i * 2) * 0.35 + 0.5) * w;
      const cy2 = (Math.cos(t * 0.08 + i * 1.5) * 0.35 + 0.5) * h;
      const r = 30 + Math.sin(t * 0.3 + i) * 10;
      const grad = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, r * 3);
      const hue = primary[0] + i * 5;
      grad.addColorStop(0, `hsla(${hue}, ${primary[1]}%, ${primary[2]}%, 0.1)`);
      grad.addColorStop(1, `hsla(${hue}, ${primary[1]}%, ${primary[2]}%, 0)`);
      ctx.beginPath();
      ctx.arc(cx2, cy2, r * 3, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }
    // Grain texture suggestion (fine dots)
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.beginPath();
      ctx.arc(x, y, 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${primary[0]}, 30%, 50%, 0.06)`;
      ctx.fill();
    }
  }
}

// ─── LIVE THEME PREVIEW COMPONENT ───
function ThemePreview({ themeId, size = "small" }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scale = 2;
    canvas.width = canvas.offsetWidth * scale;
    canvas.height = canvas.offsetHeight * scale;

    const startTime = performance.now();
    const animate = () => {
      drawThemeCanvas(canvas, themeId, performance.now() - startTime);
      animRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, [themeId]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: size === "large" ? 400 : size === "medium" ? 200 : 100,
        borderRadius: size === "large" ? 16 : 10,
        display: "block",
      }}
    />
  );
}

// ─── PROCESSING STAGES ───
const STAGES = [
  { label: "Extracting resume structure", icon: "◈" },
  { label: "Identifying skills & experience", icon: "✦" },
  { label: "Mapping professional field", icon: "△" },
  { label: "Applying theme configuration", icon: "⬡" },
  { label: "Generating algorithmic art layer", icon: "☉" },
  { label: "Composing interactive layout", icon: "◉" },
  { label: "Finalizing your Living Page", icon: "✧" },
];

// ─── MAIN APP ───
export default function MyLivingPageApp() {
  const [step, setStep] = useState("upload"); // upload | theme | processing | live
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [fileName, setFileName] = useState("");
  const [processingStage, setProcessingStage] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const [hoverTheme, setHoverTheme] = useState(null);
  const liveCanvasRef = useRef(null);
  const liveAnimRef = useRef(null);

  const transition = (newStep) => {
    setFadeIn(false);
    setTimeout(() => {
      setStep(newStep);
      setFadeIn(true);
    }, 300);
  };

  // Processing animation
  useEffect(() => {
    if (step !== "processing") return;
    setProcessingStage(0);
    setProcessingProgress(0);
    let p = 0;
    let stage = 0;
    const total = 8200;
    const interval = setInterval(() => {
      p += 1;
      setProcessingProgress(Math.min(p, 100));
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => transition("live"), 500);
      }
    }, total / 100);

    const stageTimings = [1200, 1000, 1000, 1000, 1500, 1200, 1300];
    let elapsed = 0;
    const advanceStage = (idx) => {
      if (idx >= STAGES.length) return;
      setProcessingStage(idx);
      setTimeout(() => advanceStage(idx + 1), stageTimings[idx] || 1000);
    };
    advanceStage(0);

    return () => clearInterval(interval);
  }, [step]);

  // Live page canvas
  useEffect(() => {
    if (step !== "live" || !liveCanvasRef.current || !selectedTheme) return;
    const canvas = liveCanvasRef.current;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    const start = performance.now();
    const animate = () => {
      drawThemeCanvas(canvas, selectedTheme, performance.now() - start);
      liveAnimRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(liveAnimRef.current);
  }, [step, selectedTheme]);

  const theme = THEMES.find((t) => t.id === selectedTheme);
  const previewTheme = hoverTheme || selectedTheme;

  const gold = "#D4A654";
  const goldLight = "#F0D48A";

  const primaryBtn = {
    background: `linear-gradient(135deg, ${gold}, ${goldLight})`,
    color: "#1A0A2E",
    border: "none",
    padding: "14px 36px",
    borderRadius: 100,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.3s",
  };

  const ghostBtn = {
    background: "transparent",
    color: "rgba(245,240,235,0.6)",
    border: "1px solid rgba(255,255,255,0.1)",
    padding: "14px 28px",
    borderRadius: 100,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.3s",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@300;400&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 20px rgba(212,166,84,0.15); } 50% { box-shadow: 0 0 40px rgba(212,166,84,0.3); } }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: #D4A654; color: #1A0A2E; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(170deg, #1A0A2E 0%, #0F0519 50%, #120A20 100%)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        color: "#F5F0EB",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 700 }}>
            my<span style={{ color: gold }}>living</span>page
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {step !== "processing" && step !== "live" && (
              <div style={{ display: "flex", gap: 6 }}>
                {["upload", "theme", "processing", "live"].map((s, i) => (
                  <div key={s} style={{
                    width: i <= ["upload", "theme", "processing", "live"].indexOf(step) ? 32 : 24,
                    height: 3,
                    borderRadius: 100,
                    background: i <= ["upload", "theme", "processing", "live"].indexOf(step)
                      ? `linear-gradient(90deg, ${gold}, ${goldLight})`
                      : "rgba(255,255,255,0.08)",
                    transition: "all 0.5s",
                  }} />
                ))}
              </div>
            )}
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: `linear-gradient(135deg, ${gold}, #E8845C)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Playfair Display', Georgia, serif", fontSize: 14, fontWeight: 700, color: "#1A0A2E",
            }}>R</div>
          </div>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: step === "theme" ? "24px 20px 40px" : "40px 20px 60px",
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? "translateY(0)" : "translateY(12px)",
          transition: "all 0.35s cubic-bezier(0.16,1,0.3,1)",
        }}>

          {/* ─── UPLOAD STEP ─── */}
          {step === "upload" && (
            <div style={{ maxWidth: 480, width: "100%", margin: "0 auto" }}>
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: gold, marginBottom: 12 }}>Step 1</div>
                <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 32, margin: 0, lineHeight: 1.2 }}>
                  Upload Your Resume
                </h1>
                <p style={{ color: "rgba(245,240,235,0.45)", fontSize: 15, marginTop: 10, fontWeight: 300, lineHeight: 1.6 }}>
                  We'll extract your experience, skills, and story to build your Living Page.
                </p>
              </div>

              <div
                onClick={() => setFileName("Ray_Resume_2026.pdf")}
                style={{
                  border: `2px dashed ${fileName ? gold : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 20,
                  padding: "52px 32px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: fileName ? "rgba(212,166,84,0.04)" : "rgba(255,255,255,0.015)",
                  transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
                }}
              >
                {fileName ? (
                  <div style={{ animation: "fadeSlideIn 0.4s ease" }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>📄</div>
                    <p style={{ color: gold, fontSize: 16, fontWeight: 500 }}>{fileName}</p>
                    <p style={{ color: "rgba(245,240,235,0.35)", fontSize: 12, marginTop: 6 }}>Ready to process · 248 KB</p>
                  </div>
                ) : (
                  <>
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(212,166,84,0.06)", border: `1px solid rgba(212,166,84,0.15)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 22 }}>↑</div>
                    <p style={{ color: "rgba(245,240,235,0.6)", fontSize: 16 }}>Drop your resume here</p>
                    <p style={{ color: "rgba(245,240,235,0.25)", fontSize: 12, marginTop: 8 }}>PDF, DOCX, or TXT · Max 10MB</p>
                  </>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "24px 0", color: "rgba(245,240,235,0.2)", fontSize: 11, letterSpacing: 1 }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                OR PASTE TEXT
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              </div>

              <div
                onClick={() => setFileName("Pasted Resume Text")}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 14,
                  padding: "16px 18px",
                  fontSize: 14,
                  color: "rgba(245,240,235,0.3)",
                  cursor: "text",
                  minHeight: 52,
                }}
              >
                Paste your resume content here...
              </div>

              <button
                onClick={() => { if (fileName) transition("theme"); }}
                style={{ ...primaryBtn, width: "100%", marginTop: 28, opacity: fileName ? 1 : 0.35, padding: "16px 36px" }}
              >
                Continue to Theme Selection →
              </button>
            </div>
          )}

          {/* ─── THEME PICKER ─── */}
          {step === "theme" && (
            <div style={{ maxWidth: 900, width: "100%", margin: "0 auto" }}>
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: gold, marginBottom: 10 }}>Step 2</div>
                <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 32, margin: 0, lineHeight: 1.2 }}>
                  Choose Your Living Theme
                </h1>
                <p style={{ color: "rgba(245,240,235,0.45)", fontSize: 15, marginTop: 10, fontWeight: 300 }}>
                  Each theme is a unique algorithmic art piece that breathes behind your content.
                </p>
              </div>

              <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
                {/* Theme grid */}
                <div style={{ flex: "1 1 340px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {THEMES.map((th) => (
                    <div
                      key={th.id}
                      onClick={() => setSelectedTheme(th.id)}
                      onMouseEnter={() => setHoverTheme(th.id)}
                      onMouseLeave={() => setHoverTheme(null)}
                      style={{
                        background: selectedTheme === th.id ? "rgba(212,166,84,0.06)" : "rgba(255,255,255,0.015)",
                        border: `1.5px solid ${selectedTheme === th.id ? gold : "rgba(255,255,255,0.05)"}`,
                        borderRadius: 16,
                        padding: 14,
                        cursor: "pointer",
                        transition: "all 0.35s cubic-bezier(0.16,1,0.3,1)",
                        transform: selectedTheme === th.id ? "translateY(-2px)" : "none",
                      }}
                    >
                      <div style={{ borderRadius: 10, overflow: "hidden", marginBottom: 12, position: "relative" }}>
                        <ThemePreview themeId={th.id} size="small" />
                        {selectedTheme === th.id && (
                          <div style={{
                            position: "absolute", top: 8, right: 8,
                            width: 22, height: 22, borderRadius: "50%",
                            background: gold, color: "#1A0A2E",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 700,
                          }}>✓</div>
                        )}
                      </div>
                      <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 16, margin: "0 0 3px" }}>{th.name}</h3>
                      <p style={{ fontSize: 11, color: "rgba(245,240,235,0.35)", lineHeight: 1.5, margin: 0 }}>{th.desc}</p>
                      <div style={{
                        marginTop: 8, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase",
                        color: selectedTheme === th.id ? gold : "rgba(245,240,235,0.2)",
                      }}>{th.vibe}</div>
                    </div>
                  ))}
                </div>

                {/* Live preview */}
                <div style={{
                  flex: "1 1 400px",
                  position: "sticky",
                  top: 24,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 20,
                  overflow: "hidden",
                }}>
                  <div style={{ padding: "10px 14px", background: "rgba(0,0,0,0.2)", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ display: "flex", gap: 5 }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#FF5F57" }} />
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#FEBC2E" }} />
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#28C840" }} />
                    </div>
                    <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 5, padding: "4px 10px", fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(245,240,235,0.4)" }}>
                      mylivingpage.com/<span style={{ color: goldLight }}>ray</span>
                    </div>
                  </div>

                  {previewTheme ? (
                    <div style={{ position: "relative" }}>
                      <ThemePreview themeId={previewTheme} size="large" />
                      <div style={{
                        position: "absolute", inset: 0,
                        background: "radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%)",
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        padding: 32,
                      }}>
                        <div style={{
                          width: 52, height: 52, borderRadius: "50%",
                          background: `linear-gradient(135deg, ${gold}, #E8845C)`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 700, color: "#1A0A2E",
                          boxShadow: `0 0 30px rgba(212,166,84,0.25)`,
                          marginBottom: 14,
                        }}>R</div>
                        <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>Ray</h3>
                        <p style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: goldLight, marginTop: 4, textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>Attorney & Tech Founder</p>
                        <div style={{ display: "flex", gap: 6, marginTop: 16, flexWrap: "wrap", justifyContent: "center" }}>
                          {["Legal Tech", "SaaS", "EdTech", "UI/UX"].map((s) => (
                            <span key={s} style={{
                              background: "rgba(212,166,84,0.1)",
                              border: "1px solid rgba(212,166,84,0.25)",
                              borderRadius: 100, padding: "3px 10px",
                              fontSize: 10, color: goldLight,
                            }}>{s}</span>
                          ))}
                        </div>
                        <div style={{
                          marginTop: 16, fontSize: 11, fontWeight: 500,
                          color: THEMES.find(t => t.id === previewTheme)?.vibe ? gold : "transparent",
                          letterSpacing: 1,
                        }}>
                          {THEMES.find(t => t.id === previewTheme)?.name} Theme
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(245,240,235,0.2)", fontSize: 14 }}>
                      Select a theme to preview
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 28, maxWidth: 400 }}>
                <button onClick={() => transition("upload")} style={{ ...ghostBtn, flex: 1 }}>← Back</button>
                <button
                  onClick={() => { if (selectedTheme) transition("processing"); }}
                  style={{ ...primaryBtn, flex: 2, opacity: selectedTheme ? 1 : 0.35, padding: "16px 36px" }}
                >
                  Generate My Living Page ✦
                </button>
              </div>
            </div>
          )}

          {/* ─── PROCESSING ─── */}
          {step === "processing" && (
            <div style={{ maxWidth: 480, width: "100%", margin: "0 auto", textAlign: "center" }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                border: "2px solid rgba(212,166,84,0.15)",
                borderTopColor: gold,
                margin: "0 auto 28px",
                animation: "spin 1s linear infinite, pulseGlow 2s ease infinite",
              }} />
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, margin: "0 0 10px" }}>
                Bringing You to Life
              </h2>
              <p style={{ color: gold, fontSize: 14, minHeight: 22 }}>
                {STAGES[processingStage]?.icon} {STAGES[processingStage]?.label}
              </p>

              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 100, height: 5, margin: "28px 0 14px", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 100,
                  background: `linear-gradient(90deg, ${gold}, ${goldLight})`,
                  width: `${processingProgress}%`,
                  transition: "width 0.3s ease",
                }} />
              </div>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "rgba(245,240,235,0.3)" }}>{processingProgress}%</p>

              <div style={{ marginTop: 32, textAlign: "left" }}>
                {STAGES.map((s, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "8px 0",
                    opacity: i <= processingStage ? 1 : 0.25,
                    transition: "opacity 0.4s ease",
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10,
                      background: i < processingStage ? "rgba(212,166,84,0.12)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${i < processingStage ? "rgba(212,166,84,0.25)" : i === processingStage ? "rgba(212,166,84,0.2)" : "rgba(255,255,255,0.05)"}`,
                      color: i <= processingStage ? gold : "rgba(255,255,255,0.2)",
                    }}>
                      {i < processingStage ? "✓" : s.icon}
                    </div>
                    <span style={{ fontSize: 13, color: i <= processingStage ? "rgba(245,240,235,0.7)" : "rgba(245,240,235,0.25)" }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── LIVE PAGE ─── */}
          {step === "live" && (
            <div style={{ maxWidth: 760, width: "100%", margin: "0 auto" }}>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: gold, marginBottom: 8 }}>✦ Your Living Page is Ready</div>
                <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 30, margin: 0 }}>It's Alive</h1>
              </div>

              {/* Browser frame */}
              <div style={{
                border: "1px solid rgba(212,166,84,0.12)",
                borderRadius: 18,
                overflow: "hidden",
                background: theme?.bg || "#0A0A2E",
                boxShadow: "0 40px 100px rgba(0,0,0,0.5), 0 0 100px rgba(212,166,84,0.05)",
              }}>
                <div style={{ background: "rgba(0,0,0,0.4)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57" }} />
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FEBC2E" }} />
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840" }} />
                  </div>
                  <div style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: "5px 12px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "rgba(245,240,235,0.5)" }}>
                    mylivingpage.com/<span style={{ color: goldLight }}>ray</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: "#28C840", letterSpacing: 1, textTransform: "uppercase" }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#28C840", animation: "pulseGlow 2s infinite" }} />
                    LIVE
                  </div>
                </div>

                <div style={{ position: "relative", padding: "36px 32px", minHeight: 440 }}>
                  <canvas ref={liveCanvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.5 }} />
                  <div style={{ position: "relative", zIndex: 2 }}>
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                      <div>
                        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 34, margin: 0, textShadow: "0 2px 16px rgba(0,0,0,0.5)" }}>{SAMPLE_RESUME.name}</h2>
                        <p style={{ color: gold, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginTop: 4 }}>{SAMPLE_RESUME.headline}</p>
                        <p style={{ color: "rgba(245,240,235,0.35)", fontSize: 12, marginTop: 4 }}>{SAMPLE_RESUME.location}</p>
                      </div>
                      <div style={{
                        width: 64, height: 64, borderRadius: "50%",
                        background: `linear-gradient(135deg, ${gold}, #E8845C)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "'Playfair Display', Georgia, serif", fontSize: 26, fontWeight: 700, color: "#1A0A2E",
                        boxShadow: `0 0 30px rgba(212,166,84,0.3)`,
                      }}>R</div>
                    </div>

                    {/* Summary */}
                    <p style={{ fontSize: 14, color: "rgba(245,240,235,0.55)", lineHeight: 1.7, fontWeight: 300, marginBottom: 24, textShadow: "0 1px 8px rgba(0,0,0,0.3)" }}>
                      {SAMPLE_RESUME.summary}
                    </p>

                    {/* Stats */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
                      {[["NY & FL", "Licensed"], ["5+", "Ventures"], ["275+", "Users"], ["2026", "FL Bar"]].map(([num, label], i) => (
                        <div key={i} style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: 12, padding: "14px 10px", textAlign: "center",
                          backdropFilter: "blur(8px)",
                        }}>
                          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, color: goldLight }}>{num}</div>
                          <div style={{ fontSize: 9, color: "rgba(245,240,235,0.4)", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 3 }}>{label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Experience */}
                    <div style={{ marginBottom: 20 }}>
                      <h3 style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: gold, marginBottom: 12 }}>Experience</h3>
                      {SAMPLE_RESUME.experience.map((exp, i) => (
                        <div key={i} style={{
                          background: "rgba(255,255,255,0.025)",
                          border: "1px solid rgba(255,255,255,0.04)",
                          borderRadius: 12, padding: 16, marginBottom: 8,
                          backdropFilter: "blur(8px)",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                            <div>
                              <span style={{ fontWeight: 500, fontSize: 14 }}>{exp.title}</span>
                              <span style={{ color: "rgba(245,240,235,0.35)", fontSize: 13 }}> · {exp.company}</span>
                            </div>
                            <span style={{ fontSize: 11, color: "rgba(245,240,235,0.25)", fontFamily: "'DM Mono', monospace" }}>{exp.dates}</span>
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                            {exp.highlights.map((h, j) => (
                              <span key={j} style={{ fontSize: 11, color: "rgba(245,240,235,0.4)", background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: "2px 8px" }}>{h}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Skills */}
                    <div>
                      <h3 style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: gold, marginBottom: 10 }}>Skills</h3>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {SAMPLE_RESUME.skills.map((s) => (
                          <span key={s} style={{
                            background: "rgba(212,166,84,0.07)",
                            border: "1px solid rgba(212,166,84,0.2)",
                            borderRadius: 100, padding: "4px 14px",
                            fontSize: 12, color: goldLight,
                          }}>{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                <button style={{ ...primaryBtn, flex: 1 }}>Share Your Page ↗</button>
                <button style={{ ...ghostBtn, flex: 1 }}>Edit Content</button>
                <button style={{ ...ghostBtn, padding: "14px 20px" }}>PDF ↓</button>
              </div>
              <p style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "rgba(245,240,235,0.25)" }}>
                mylivingpage.com/ray — Your living, breathing digital identity
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
