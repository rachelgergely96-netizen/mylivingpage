import { useState, useEffect, useRef } from "react";

const STEPS = [
  { id: "signup", label: "Create Account", icon: "✦" },
  { id: "upload", label: "Upload Resume", icon: "◈" },
  { id: "photo", label: "Profile Photo", icon: "◉" },
  { id: "portfolio", label: "Portfolio URL", icon: "△" },
  { id: "theme", label: "Pick Theme", icon: "⬡" },
  { id: "processing", label: "Generating", icon: "☉" },
  { id: "preview", label: "Your Living Page", icon: "✧" },
];

const THEMES = [
  {
    id: "cosmic",
    name: "Cosmic",
    desc: "Deep space, constellations, celestial motion",
    colors: ["#0A0A2E", "#D4A654", "#6366F1", "#F0D48A"],
    vibe: "Visionary & Bold",
  },
  {
    id: "fluid",
    name: "Fluid",
    desc: "Organic flow fields, soft gradients, liquid motion",
    colors: ["#0D1B2A", "#48CAE4", "#90E0EF", "#CAF0F8"],
    vibe: "Creative & Approachable",
  },
  {
    id: "ember",
    name: "Ember",
    desc: "Warm particles, glowing embers, firelight depth",
    colors: ["#1A0A0A", "#E8845C", "#F4A261", "#FFD6A5"],
    vibe: "Passionate & Driven",
  },
  {
    id: "monolith",
    name: "Monolith",
    desc: "Geometric wireframes, sharp edges, dark precision",
    colors: ["#0A0A0A", "#FFFFFF", "#888888", "#333333"],
    vibe: "Executive & Minimal",
  },
  {
    id: "aurora",
    name: "Aurora",
    desc: "Shimmering curtains, northern lights, ethereal glow",
    colors: ["#0B132B", "#5BC0BE", "#8338EC", "#3A86FF"],
    vibe: "Innovative & Fresh",
  },
  {
    id: "terracotta",
    name: "Terracotta",
    desc: "Earthy warmth, organic textures, natural motion",
    colors: ["#1A120B", "#D4A373", "#E9B872", "#FEFAE0"],
    vibe: "Grounded & Authentic",
  },
];

const PROCESSING_STAGES = [
  { label: "Extracting resume structure...", duration: 1800 },
  { label: "Identifying skills & experience...", duration: 1400 },
  { label: "Analyzing professional field...", duration: 1200 },
  { label: "Applying Cosmic theme...", duration: 1000 },
  { label: "Generating algorithmic background...", duration: 1600 },
  { label: "Composing your Living Page...", duration: 1400 },
  { label: "Finalizing interactive elements...", duration: 800 },
];

export default function MyLivingPageFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [processingStage, setProcessingStage] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [fileName, setFileName] = useState("");
  const [photoPreview, setPhotoPreview] = useState(false);
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [fadeIn, setFadeIn] = useState(true);
  const canvasRef = useRef(null);

  const step = STEPS[currentStep];

  // Step transition animation
  const goToStep = (idx) => {
    setFadeIn(false);
    setTimeout(() => {
      setCurrentStep(idx);
      setFadeIn(true);
    }, 300);
  };

  const next = () => {
    if (currentStep < STEPS.length - 1) goToStep(currentStep + 1);
  };

  const prev = () => {
    if (currentStep > 0) goToStep(currentStep - 1);
  };

  // Processing animation
  useEffect(() => {
    if (step?.id !== "processing") return;
    setProcessingStage(0);
    setProcessingProgress(0);

    let stageIdx = 0;
    let progress = 0;

    const totalDuration = PROCESSING_STAGES.reduce((s, st) => s + st.duration, 0);
    const progressInterval = setInterval(() => {
      progress += 1;
      setProcessingProgress(Math.min(progress, 100));
      if (progress >= 100) {
        clearInterval(progressInterval);
        setTimeout(() => goToStep(6), 600);
      }
    }, totalDuration / 100);

    let elapsed = 0;
    const advanceStage = () => {
      if (stageIdx >= PROCESSING_STAGES.length) return;
      setProcessingStage(stageIdx);
      const dur = PROCESSING_STAGES[stageIdx].duration;
      stageIdx++;
      setTimeout(advanceStage, dur);
    };
    advanceStage();

    return () => clearInterval(progressInterval);
  }, [currentStep]);

  // Mini particle canvas for preview
  useEffect(() => {
    if (step?.id !== "preview" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;

    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 3 + 1,
      speed: 0.3 + Math.random() * 0.5,
      angle: Math.random() * Math.PI * 2,
      hue: 35 + Math.random() * 20,
    }));

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const g = ctx.createRadialGradient(canvas.width * 0.3, canvas.height * 0.2, 0, canvas.width * 0.5, canvas.height * 0.5, canvas.width * 0.7);
      g.addColorStop(0, "rgba(212,166,84,0.06)");
      g.addColorStop(1, "rgba(26,10,46,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;
        p.angle += (Math.random() - 0.5) * 0.03;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 70%, 65%, 0.5)`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 70%, 65%, 0.07)`;
        ctx.fill();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          if (Math.sqrt(dx * dx + dy * dy) < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = "rgba(212,166,84,0.08)";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [currentStep]);

  const inputStyle = {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: "14px 18px",
    color: "#F5F0EB",
    fontSize: 15,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    outline: "none",
    transition: "border-color 0.3s",
  };

  const renderStepContent = () => {
    switch (step.id) {
      case "signup":
        return (
          <div style={{ maxWidth: 380, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✦</div>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, margin: 0, color: "#F5F0EB" }}>Create Your Account</h2>
              <p style={{ color: "rgba(245,240,235,0.5)", fontSize: 14, marginTop: 8, fontWeight: 300 }}>Start building your living digital presence</p>
            </div>
            <input style={inputStyle} placeholder="Full name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <input style={inputStyle} placeholder="Email address" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            <input style={inputStyle} placeholder="Create password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, border: "1px solid rgba(212,166,84,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#D4A654", cursor: "pointer" }}>✓</div>
              <span style={{ fontSize: 12, color: "rgba(245,240,235,0.4)" }}>I agree to the Terms of Service</span>
            </div>
            <button onClick={next} style={primaryBtnStyle}>
              Create Account & Continue
            </button>
            <p style={{ textAlign: "center", fontSize: 13, color: "rgba(245,240,235,0.35)", marginTop: 4 }}>
              Already have an account? <span style={{ color: "#D4A654", cursor: "pointer" }}>Sign in</span>
            </p>
          </div>
        );

      case "upload":
        return (
          <div style={{ maxWidth: 440, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>◈</div>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, margin: 0, color: "#F5F0EB" }}>Upload Your Resume</h2>
              <p style={{ color: "rgba(245,240,235,0.5)", fontSize: 14, marginTop: 8, fontWeight: 300 }}>We'll extract your experience, skills, and story</p>
            </div>
            <div
              onClick={() => setFileName("Ray_Resume_2026.pdf")}
              style={{
                border: `2px dashed ${fileName ? "#D4A654" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 16,
                padding: "48px 32px",
                textAlign: "center",
                cursor: "pointer",
                background: fileName ? "rgba(212,166,84,0.05)" : "rgba(255,255,255,0.02)",
                transition: "all 0.3s",
              }}
            >
              {fileName ? (
                <>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
                  <p style={{ color: "#D4A654", fontSize: 16, fontWeight: 500 }}>{fileName}</p>
                  <p style={{ color: "rgba(245,240,235,0.4)", fontSize: 12, marginTop: 4 }}>Ready to process</p>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>↑</div>
                  <p style={{ color: "rgba(245,240,235,0.6)", fontSize: 15 }}>Drop your resume here</p>
                  <p style={{ color: "rgba(245,240,235,0.3)", fontSize: 12, marginTop: 6 }}>PDF, DOCX, or TXT — max 10MB</p>
                </>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0", color: "rgba(245,240,235,0.25)", fontSize: 12 }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              OR
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>
            <button style={{ ...ghostBtnStyle, width: "100%" }} onClick={() => setFileName("LinkedIn Import")}>
              Import from LinkedIn
            </button>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button onClick={prev} style={{ ...ghostBtnStyle, flex: 1 }}>Back</button>
              <button onClick={next} disabled={!fileName} style={{ ...primaryBtnStyle, flex: 2, opacity: fileName ? 1 : 0.4 }}>Continue</button>
            </div>
          </div>
        );

      case "photo":
        return (
          <div style={{ maxWidth: 400, margin: "0 auto", textAlign: "center" }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>◉</div>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, margin: 0, color: "#F5F0EB" }}>Profile Photo</h2>
              <p style={{ color: "rgba(245,240,235,0.5)", fontSize: 14, marginTop: 8, fontWeight: 300 }}>Add a face to your Living Page</p>
            </div>
            <div
              onClick={() => setPhotoPreview(true)}
              style={{
                width: 160,
                height: 160,
                borderRadius: "50%",
                margin: "0 auto 24px",
                border: `2px dashed ${photoPreview ? "#D4A654" : "rgba(255,255,255,0.1)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                overflow: "hidden",
                background: photoPreview
                  ? "linear-gradient(135deg, #D4A654, #E8845C)"
                  : "rgba(255,255,255,0.02)",
                transition: "all 0.4s",
              }}
            >
              {photoPreview ? (
                <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 52, fontWeight: 700, color: "#1A0A2E" }}>R</span>
              ) : (
                <span style={{ fontSize: 36, opacity: 0.3 }}>+</span>
              )}
            </div>
            {photoPreview && (
              <p style={{ color: "#D4A654", fontSize: 13, marginBottom: 16 }}>Looking great! ✦</p>
            )}
            <p style={{ color: "rgba(245,240,235,0.3)", fontSize: 12, marginBottom: 24 }}>JPG or PNG, recommended 400×400px</p>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={prev} style={{ ...ghostBtnStyle, flex: 1 }}>Back</button>
              <button onClick={next} style={{ ...primaryBtnStyle, flex: 2 }}>
                {photoPreview ? "Continue" : "Skip for Now"}
              </button>
            </div>
          </div>
        );

      case "portfolio":
        return (
          <div style={{ maxWidth: 400, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>△</div>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, margin: 0, color: "#F5F0EB" }}>Portfolio URL</h2>
              <p style={{ color: "rgba(245,240,235,0.5)", fontSize: 14, marginTop: 8, fontWeight: 300 }}>Link to your work, GitHub, or personal site</p>
            </div>
            <input
              style={{ ...inputStyle, marginBottom: 16 }}
              placeholder="https://your-portfolio.com"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
            />
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 16, marginBottom: 24, border: "1px solid rgba(255,255,255,0.04)" }}>
              <p style={{ fontSize: 12, color: "rgba(245,240,235,0.4)", lineHeight: 1.6 }}>
                💡 This will appear as a prominent CTA button on your Living Page. Visitors can click directly to see your full body of work.
              </p>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={prev} style={{ ...ghostBtnStyle, flex: 1 }}>Back</button>
              <button onClick={next} style={{ ...primaryBtnStyle, flex: 2 }}>
                {portfolioUrl ? "Continue" : "Skip for Now"}
              </button>
            </div>
          </div>
        );

      case "theme":
        return (
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⬡</div>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, margin: 0, color: "#F5F0EB" }}>Pick Your Vibe</h2>
              <p style={{ color: "rgba(245,240,235,0.5)", fontSize: 14, marginTop: 8, fontWeight: 300 }}>Choose the living art that breathes behind your content</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {THEMES.map((theme) => (
                <div
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme.id)}
                  style={{
                    background: selectedTheme === theme.id ? "rgba(212,166,84,0.08)" : "rgba(255,255,255,0.02)",
                    border: `1.5px solid ${selectedTheme === theme.id ? "#D4A654" : "rgba(255,255,255,0.06)"}`,
                    borderRadius: 16,
                    padding: 20,
                    cursor: "pointer",
                    transition: "all 0.35s cubic-bezier(0.16,1,0.3,1)",
                    transform: selectedTheme === theme.id ? "translateY(-2px)" : "none",
                  }}
                >
                  <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
                    {theme.colors.map((c, i) => (
                      <div key={i} style={{ width: 20, height: 20, borderRadius: 6, background: c, border: "1px solid rgba(255,255,255,0.08)" }} />
                    ))}
                  </div>
                  <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 17, margin: "0 0 4px", color: "#F5F0EB" }}>{theme.name}</h3>
                  <p style={{ fontSize: 11, color: "rgba(245,240,235,0.4)", lineHeight: 1.5, margin: 0 }}>{theme.desc}</p>
                  <div style={{
                    marginTop: 10,
                    fontSize: 10,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    color: selectedTheme === theme.id ? "#D4A654" : "rgba(245,240,235,0.25)",
                    transition: "color 0.3s",
                  }}>
                    {theme.vibe}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
              <button onClick={prev} style={{ ...ghostBtnStyle, flex: 1 }}>Back</button>
              <button
                onClick={() => { if (selectedTheme) next(); }}
                style={{ ...primaryBtnStyle, flex: 2, opacity: selectedTheme ? 1 : 0.4 }}
              >
                Generate My Living Page
              </button>
            </div>
          </div>
        );

      case "processing":
        return (
          <div style={{ maxWidth: 460, margin: "0 auto", textAlign: "center" }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              border: "2px solid rgba(212,166,84,0.2)",
              borderTopColor: "#D4A654",
              margin: "0 auto 32px",
              animation: "spin 1.2s linear infinite",
            }} />
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, margin: "0 0 12px", color: "#F5F0EB" }}>
              Bringing You to Life
            </h2>
            <p style={{ color: "#D4A654", fontSize: 14, minHeight: 24, transition: "opacity 0.3s" }}>
              {PROCESSING_STAGES[processingStage]?.label}
            </p>
            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 100, height: 6, margin: "28px 0 16px", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                borderRadius: 100,
                background: "linear-gradient(90deg, #D4A654, #F0D48A)",
                width: `${processingProgress}%`,
                transition: "width 0.3s ease",
              }} />
            </div>
            <p style={{ fontSize: 12, color: "rgba(245,240,235,0.3)" }}>{processingProgress}% complete</p>
            <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
              {PROCESSING_STAGES.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, opacity: i <= processingStage ? 1 : 0.3, transition: "opacity 0.4s" }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%", fontSize: 10,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: i < processingStage ? "rgba(212,166,84,0.15)" : i === processingStage ? "rgba(212,166,84,0.1)" : "rgba(255,255,255,0.03)",
                    color: i <= processingStage ? "#D4A654" : "rgba(255,255,255,0.2)",
                    border: `1px solid ${i <= processingStage ? "rgba(212,166,84,0.3)" : "rgba(255,255,255,0.05)"}`,
                  }}>
                    {i < processingStage ? "✓" : i === processingStage ? "•" : ""}
                  </div>
                  <span style={{ fontSize: 13, color: i <= processingStage ? "rgba(245,240,235,0.7)" : "rgba(245,240,235,0.3)" }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case "preview":
        return (
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 14, color: "#D4A654", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>✦ Your Living Page is Ready</div>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, margin: 0, color: "#F5F0EB" }}>It's Alive</h2>
            </div>
            {/* Browser mockup */}
            <div style={{
              border: "1px solid rgba(212,166,84,0.15)",
              borderRadius: 16,
              overflow: "hidden",
              background: "rgba(15,5,25,0.95)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.5), 0 0 80px rgba(212,166,84,0.06)",
            }}>
              <div style={{ background: "rgba(26,10,46,0.9)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57" }} />
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FEBC2E" }} />
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840" }} />
                </div>
                <div style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: "5px 12px", fontFamily: "monospace", fontSize: 11, color: "rgba(245,240,235,0.5)" }}>
                  mylivingpage.com/<span style={{ color: "#F0D48A" }}>ray</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: "#28C840", letterSpacing: 1, textTransform: "uppercase" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#28C840" }} />
                  LIVE
                </div>
              </div>
              <div style={{ position: "relative", padding: 36, minHeight: 320 }}>
                <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.4 }} />
                <div style={{ position: "relative", zIndex: 2 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
                    <div>
                      <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 30, margin: 0, color: "#F5F0EB" }}>Ray</h3>
                      <p style={{ color: "#D4A654", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginTop: 4 }}>Attorney & Tech Founder</p>
                    </div>
                    <div style={{
                      width: 56, height: 56, borderRadius: "50%",
                      background: "linear-gradient(135deg, #D4A654, #E8845C)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700, color: "#1A0A2E",
                      boxShadow: "0 0 24px rgba(212,166,84,0.3)",
                    }}>R</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
                    {[["NY & FL", "Licensed"], ["5+", "Ventures"], ["275+", "Users"]].map(([num, label], i) => (
                      <div key={i} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 14, textAlign: "center" }}>
                        <div style={{ fontFamily: "monospace", fontSize: 20, color: "#F0D48A" }}>{num}</div>
                        <div style={{ fontSize: 10, color: "rgba(245,240,235,0.4)", letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {["Legal Tech", "SaaS", "EdTech", "Bar Prep", "UI/UX", "Gamification", "Canvas 2D"].map((s, i) => (
                      <span key={i} style={{ background: "rgba(212,166,84,0.08)", border: "1px solid rgba(212,166,84,0.2)", borderRadius: 100, padding: "4px 12px", fontSize: 11, color: "#F0D48A" }}>{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* Share actions */}
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button style={{ ...primaryBtnStyle, flex: 1 }}>Share Your Page ↗</button>
              <button style={{ ...ghostBtnStyle, flex: 1 }}>Edit Content</button>
              <button style={{ ...ghostBtnStyle, padding: "12px 20px" }} title="Download ATS PDF">PDF ↓</button>
            </div>
            <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "rgba(245,240,235,0.3)" }}>
              mylivingpage.com/ray — Your living, breathing digital identity
            </div>
          </div>
        );
    }
  };

  const primaryBtnStyle = {
    background: "linear-gradient(135deg, #D4A654, #F0D48A)",
    color: "#1A0A2E",
    border: "none",
    padding: "14px 32px",
    borderRadius: 100,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    transition: "all 0.3s",
  };

  const ghostBtnStyle = {
    background: "transparent",
    color: "rgba(245,240,235,0.6)",
    border: "1px solid rgba(255,255,255,0.1)",
    padding: "14px 24px",
    borderRadius: 100,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    transition: "all 0.3s",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@300;400&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(170deg, #1A0A2E 0%, #0F0519 50%, #120A20 100%)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        color: "#F5F0EB",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Top bar */}
        <div style={{ padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 700 }}>
            my<span style={{ color: "#D4A654" }}>living</span>page
          </div>
          {step.id !== "processing" && step.id !== "preview" && (
            <div style={{ fontSize: 12, color: "rgba(245,240,235,0.3)" }}>
              Step {currentStep + 1} of {STEPS.length}
            </div>
          )}
        </div>

        {/* Progress bar */}
        {step.id !== "processing" && (
          <div style={{ padding: "0 32px" }}>
            <div style={{ display: "flex", gap: 4, marginTop: 16 }}>
              {STEPS.map((s, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    borderRadius: 100,
                    background: i <= currentStep
                      ? "linear-gradient(90deg, #D4A654, #F0D48A)"
                      : "rgba(255,255,255,0.06)",
                    transition: "background 0.5s",
                  }}
                />
              ))}
            </div>
            {/* Step labels */}
            <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 16, flexWrap: "wrap" }}>
              {STEPS.filter(s => s.id !== "processing").map((s, i) => (
                <div key={i} style={{
                  fontSize: 10,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  color: STEPS.indexOf(s) <= currentStep ? "#D4A654" : "rgba(245,240,235,0.2)",
                  transition: "color 0.3s",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}>
                  <span style={{ fontSize: 8 }}>{s.icon}</span>
                  <span style={{ display: window.innerWidth < 600 ? "none" : "inline" }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main content */}
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px 60px",
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? "translateY(0)" : "translateY(16px)",
          transition: "all 0.35s cubic-bezier(0.16,1,0.3,1)",
        }}>
          {renderStepContent()}
        </div>
      </div>
    </>
  );
}
