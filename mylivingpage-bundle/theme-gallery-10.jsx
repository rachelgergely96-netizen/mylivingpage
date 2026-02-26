import { useState, useEffect, useRef, useCallback } from "react";

// ─── SIMPLEX-ISH NOISE (compact implementation) ───
const PERM = new Uint8Array(512);
const GRAD = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
(function initNoise() {
  const p = [];
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
})();

function noise2D(x, y) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x), yf = y - Math.floor(y);
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const aa = PERM[PERM[X] + Y], ab = PERM[PERM[X] + Y + 1];
  const ba = PERM[PERM[X + 1] + Y], bb = PERM[PERM[X + 1] + Y + 1];
  const g = (h, dx, dy) => { const g2 = GRAD[h & 7]; return g2[0] * dx + g2[1] * dy; };
  const x1 = g(aa, xf, yf) + u * (g(ba, xf - 1, yf) - g(aa, xf, yf));
  const x2 = g(ab, xf, yf - 1) + u * (g(bb, xf - 1, yf - 1) - g(ab, xf, yf - 1));
  return x1 + v * (x2 - x1);
}

function fbm(x, y, octaves = 4) {
  let val = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * noise2D(x * freq, y * freq);
    amp *= 0.5; freq *= 2;
  }
  return val;
}

// ─── THEME DEFINITIONS ───
const THEMES = [
  { id: "cosmic", name: "Cosmic", desc: "Deep space constellation field with golden star-links drifting through nebula clouds. Particles breathe and connect.", vibe: "Visionary & Bold", bg: "#06061A", colors: { h1: 42, h2: 262, h3: 220 } },
  { id: "fluid", name: "Fluid", desc: "Noise-driven flow field with trailing particles that carve luminous rivers through a deep ocean canvas.", vibe: "Creative & Approachable", bg: "#050E18", colors: { h1: 195, h2: 175, h3: 210 } },
  { id: "ember", name: "Ember", desc: "Rising ember sparks with heat distortion, fading trails, and a molten base glow that shifts with the wind.", vibe: "Passionate & Driven", bg: "#110605", colors: { h1: 15, h2: 35, h3: 5 } },
  { id: "monolith", name: "Monolith", desc: "Rotating concentric wireframes pulse over a dot matrix grid. Minimalist geometry in perpetual motion.", vibe: "Executive & Minimal", bg: "#060606", colors: { h1: 0, h2: 0, h3: 0 } },
  { id: "aurora", name: "Aurora", desc: "Layered spectral curtains ripple with noise-driven displacement. Shimmer particles rain through the bands.", vibe: "Innovative & Fresh", bg: "#060D1F", colors: { h1: 160, h2: 270, h3: 210 } },
  { id: "terracotta", name: "Terracotta", desc: "Warm organic noise blobs drift like clay on water. Fine grain texture and earthy color evolution.", vibe: "Grounded & Authentic", bg: "#100C07", colors: { h1: 25, h2: 38, h3: 15 } },
  { id: "prism", name: "Prism", desc: "Refracting light shards rotate through spectral color splits. Rainbow caustics dance on a dark surface.", vibe: "Daring & Expressive", bg: "#08080F", colors: { h1: 0, h2: 120, h3: 240 } },
  { id: "biolume", name: "Biolume", desc: "Deep sea bioluminescent organisms pulse and drift. Jellyfish-like trails glow with cyan-green phosphorescence.", vibe: "Thoughtful & Unique", bg: "#030D0D", colors: { h1: 170, h2: 145, h3: 190 } },
  { id: "circuit", name: "Circuit", desc: "Data streams pulse along circuit traces. Nodes light up in sequence as information flows through the network.", vibe: "Technical & Sharp", bg: "#050A0A", colors: { h1: 165, h2: 180, h3: 150 } },
  { id: "sakura", name: "Sakura", desc: "Soft petals drift and tumble through gentle air currents. Watercolor washes bloom and dissolve in warm pinks.", vibe: "Elegant & Refined", bg: "#0F0A0D", colors: { h1: 335, h2: 320, h3: 15 } },
];

// ─── RENDER ENGINES ───

function renderCosmic(ctx, w, h, t, mx, my) {
  // Layer 1: Nebula gradient
  const nebX = w * 0.4 + Math.sin(t * 0.15) * w * 0.1;
  const nebY = h * 0.35 + Math.cos(t * 0.12) * h * 0.08;
  const neb = ctx.createRadialGradient(nebX, nebY, 0, w * 0.5, h * 0.5, w * 0.8);
  neb.addColorStop(0, "rgba(60, 20, 120, 0.08)");
  neb.addColorStop(0.4, "rgba(20, 10, 60, 0.04)");
  neb.addColorStop(1, "transparent");
  ctx.fillStyle = neb;
  ctx.fillRect(0, 0, w, h);

  // Second nebula
  const n2 = ctx.createRadialGradient(w * 0.7 + Math.cos(t * 0.1) * 40, h * 0.6, 0, w * 0.6, h * 0.5, w * 0.5);
  n2.addColorStop(0, "rgba(120, 80, 20, 0.05)");
  n2.addColorStop(1, "transparent");
  ctx.fillStyle = n2;
  ctx.fillRect(0, 0, w, h);

  // Layer 2: Stars with depth
  for (let i = 0; i < 80; i++) {
    const seed = i * 137.508;
    const depth = (i % 3) + 1; // 1-3 parallax layers
    const parallax = depth * 0.3;
    const px = ((Math.sin(seed) * 0.5 + 0.5) * w + Math.sin(t * 0.2 * parallax + i * 0.1) * 6) % w;
    const py = ((Math.cos(seed * 1.3) * 0.5 + 0.5) * h + Math.cos(t * 0.15 * parallax + i * 0.12) * 5) % h;
    const r = (0.8 + Math.sin(t * 0.7 + i * 0.8) * 0.4) * (4 - depth) * 0.5;
    const twinkle = 0.25 + Math.sin(t * 1.2 + seed) * 0.2 + Math.sin(t * 0.4 + i) * 0.1;
    const hue = 42 + Math.sin(i * 0.3) * 20;

    // Mouse proximity glow
    const dx = mx * w - px, dy = my * h - py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const mouseBoost = dist < 120 ? (1 - dist / 120) * 0.3 : 0;

    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 65%, ${65 + mouseBoost * 30}%, ${twinkle + mouseBoost})`;
    ctx.fill();

    // Star glow
    ctx.beginPath();
    ctx.arc(px, py, r * 5, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 60%, 60%, ${(twinkle * 0.1 + mouseBoost * 0.15)})`;
    ctx.fill();
  }

  // Layer 3: Constellation lines
  const stars = [];
  for (let i = 0; i < 80; i++) {
    const seed = i * 137.508;
    stars.push({
      x: ((Math.sin(seed) * 0.5 + 0.5) * w + Math.sin(t * 0.06 + i * 0.1) * 6) % w,
      y: ((Math.cos(seed * 1.3) * 0.5 + 0.5) * h + Math.cos(t * 0.045 + i * 0.12) * 5) % h,
    });
  }
  ctx.lineWidth = 0.5;
  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < Math.min(i + 6, stars.length); j++) {
      const d = Math.hypot(stars[i].x - stars[j].x, stars[i].y - stars[j].y);
      if (d < w * 0.12) {
        const alpha = (1 - d / (w * 0.12)) * 0.07;
        ctx.beginPath();
        ctx.moveTo(stars[i].x, stars[i].y);
        ctx.lineTo(stars[j].x, stars[j].y);
        ctx.strokeStyle = `hsla(42, 60%, 65%, ${alpha})`;
        ctx.stroke();
      }
    }
  }
}

function renderFluid(ctx, w, h, t, mx, my) {
  // Layer 1: Animated gradient background
  const bg = ctx.createRadialGradient(
    w * (0.3 + Math.sin(t * 0.1) * 0.1), h * (0.4 + Math.cos(t * 0.08) * 0.1), 0,
    w * 0.5, h * 0.5, w * 0.8
  );
  bg.addColorStop(0, "rgba(10, 40, 60, 0.15)");
  bg.addColorStop(1, "transparent");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Layer 2: Flow field trails
  const resolution = 0.006;
  for (let i = 0; i < 35; i++) {
    ctx.beginPath();
    let px = ((i * 37.7 + t * 5) % w);
    let py = ((i * 53.1 + t * 3) % h);
    ctx.moveTo(px, py);

    for (let step = 0; step < 60; step++) {
      const n = fbm(px * resolution + t * 0.05, py * resolution + t * 0.03, 3);
      const angle = n * Math.PI * 3;
      // Mouse deflection
      const mdx = mx * w - px, mdy = my * h - py;
      const md = Math.sqrt(mdx * mdx + mdy * mdy);
      const mouseAngle = md < 150 ? Math.atan2(mdy, mdx) * (1 - md / 150) * 0.3 : 0;

      px += Math.cos(angle + mouseAngle) * 4;
      py += Math.sin(angle + mouseAngle) * 4;
      ctx.lineTo(px, py);
    }
    const hue = 195 + (i % 8) * 5 - 15;
    const alpha = 0.04 + Math.sin(t * 0.3 + i * 0.5) * 0.02;
    ctx.strokeStyle = `hsla(${hue}, 75%, 55%, ${alpha})`;
    ctx.lineWidth = 1.5 + Math.sin(i) * 0.8;
    ctx.stroke();
  }

  // Layer 3: Luminous orbs
  for (let i = 0; i < 10; i++) {
    const ox = (Math.sin(t * 0.12 + i * 1.8) * 0.4 + 0.5) * w;
    const oy = (Math.cos(t * 0.1 + i * 1.4) * 0.4 + 0.5) * h;
    const or = 6 + Math.sin(t * 0.4 + i) * 3;
    const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, or * 6);
    g.addColorStop(0, `hsla(${195 + i * 10}, 80%, 60%, 0.15)`);
    g.addColorStop(0.5, `hsla(${195 + i * 10}, 70%, 50%, 0.04)`);
    g.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(ox, oy, or * 6, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }
}

function renderEmber(ctx, w, h, t, mx, my) {
  // Layer 1: Heat haze gradient
  const haze = ctx.createLinearGradient(0, h, 0, 0);
  haze.addColorStop(0, `hsla(10, 70%, 12%, ${0.15 + Math.sin(t * 0.3) * 0.03})`);
  haze.addColorStop(0.3, `hsla(20, 50%, 6%, 0.08)`);
  haze.addColorStop(1, "transparent");
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, w, h);

  // Layer 2: Rising embers with trails
  for (let i = 0; i < 70; i++) {
    const seed = i * 73.7;
    const speed = 0.4 + (i % 7) * 0.15;
    const drift = Math.sin(t * 0.3 + seed) * 30 + Math.sin(t * 0.7 + i * 0.5) * 10;
    const windX = (mx - 0.5) * 40;
    const rawX = (Math.sin(seed * 1.7) * 0.5 + 0.5) * w + drift + windX * speed;
    const cycle = (t * 15 * speed + seed * 5) % (h * 1.5);
    const rawY = h + h * 0.2 - cycle;
    const life = Math.max(0, Math.min(1, 1 - cycle / (h * 1.5)));
    if (life <= 0) continue;

    const x = ((rawX % w) + w) % w;
    const y = rawY;
    const size = (1 + Math.sin(seed) * 0.6) * life;
    const hue = 10 + Math.sin(seed * 0.5) * 18 + life * 20;

    // Core
    ctx.beginPath();
    ctx.arc(x, y, size * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 85%, ${55 + life * 20}%, ${life * 0.6})`;
    ctx.fill();

    // Glow
    ctx.beginPath();
    ctx.arc(x, y, size * 10, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 75%, 50%, ${life * 0.06})`;
    ctx.fill();

    // Tiny trail dots
    for (let tr = 1; tr < 4; tr++) {
      const trY = y + tr * 5 * speed;
      const trAlpha = life * 0.2 * (1 - tr / 4);
      ctx.beginPath();
      ctx.arc(x - drift * 0.02 * tr, trY, size * (1 - tr * 0.2), 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue - tr * 5}, 70%, 45%, ${trAlpha})`;
      ctx.fill();
    }
  }

  // Layer 3: Base fire glow
  const fire = ctx.createRadialGradient(w * 0.5, h * 1.1, 0, w * 0.5, h, w * 0.6);
  fire.addColorStop(0, `hsla(20, 80%, 30%, ${0.08 + Math.sin(t * 0.5) * 0.03})`);
  fire.addColorStop(1, "transparent");
  ctx.fillStyle = fire;
  ctx.fillRect(0, 0, w, h);
}

function renderMonolith(ctx, w, h, t, mx, my) {
  const cx = w / 2, cy = h / 2;

  // Layer 1: Pulsing dot grid
  const spacing = 28;
  for (let gx = spacing / 2; gx < w; gx += spacing) {
    for (let gy = spacing / 2; gy < h; gy += spacing) {
      const d = Math.hypot(gx - cx, gy - cy);
      const md = Math.hypot(gx - mx * w, gy - my * h);
      const wave = Math.sin(d * 0.015 - t * 0.8) * 0.5 + 0.5;
      const mouseWave = md < 100 ? (1 - md / 100) * 0.4 : 0;
      const r = 0.5 + wave * 0.8 + mouseWave * 2;
      const alpha = 0.04 + wave * 0.04 + mouseWave * 0.15;
      ctx.beginPath();
      ctx.arc(gx, gy, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();
    }
  }

  // Layer 2: Concentric rotating polygons
  for (let ring = 0; ring < 6; ring++) {
    const sides = 4 + ring;
    const radius = (w * 0.08) + ring * (w * 0.055);
    const rot = t * (0.15 + ring * 0.03) * (ring % 2 === 0 ? 1 : -1);
    const breathe = 1 + Math.sin(t * 0.4 + ring * 0.8) * 0.03;
    const alpha = 0.06 + Math.sin(t * 0.3 + ring) * 0.02;

    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const angle = (i / sides) * Math.PI * 2 + rot;
      const r = radius * breathe;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // Layer 3: Center pulse
  const pulseR = 3 + Math.sin(t * 0.6) * 1.5;
  const pulseG = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseR * 15);
  pulseG.addColorStop(0, `rgba(255,255,255,0.08)`);
  pulseG.addColorStop(1, "transparent");
  ctx.fillStyle = pulseG;
  ctx.beginPath();
  ctx.arc(cx, cy, pulseR * 15, 0, Math.PI * 2);
  ctx.fill();
}

function renderAurora(ctx, w, h, t, mx, my) {
  // Layer 1: Aurora curtain bands (noise-displaced)
  for (let band = 0; band < 7; band++) {
    const baseY = h * (0.15 + band * 0.07);
    const hue = 160 + band * 22 + Math.sin(t * 0.2 + band) * 15;
    ctx.beginPath();
    ctx.moveTo(0, h);

    for (let x = 0; x <= w; x += 3) {
      const nVal = fbm(x * 0.003 + t * 0.08 + band * 0.5, band * 2 + t * 0.03, 3);
      const mouseInfluence = Math.exp(-Math.pow((x / w - mx), 2) * 8) * 20 * (my - 0.5);
      const y = baseY + nVal * 50 + mouseInfluence;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, baseY - 40, 0, h);
    grad.addColorStop(0, `hsla(${hue}, 65%, 55%, 0.06)`);
    grad.addColorStop(0.3, `hsla(${hue}, 55%, 40%, 0.03)`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Layer 2: Shimmer particles raining through bands
  for (let i = 0; i < 40; i++) {
    const seed = i * 89.3;
    const x = ((Math.sin(seed * 2.1) * 0.5 + 0.5) * w + Math.sin(t * 0.2 + i) * 15) % w;
    const fallSpeed = 0.3 + (i % 5) * 0.1;
    const y = ((t * 10 * fallSpeed + seed * 7) % (h * 1.2)) - h * 0.1;
    const alpha = 0.15 + Math.sin(t * 1.5 + seed) * 0.1;
    const hue = 170 + Math.sin(i * 0.7) * 50;

    ctx.beginPath();
    ctx.arc(x, y, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 70%, 70%, ${alpha})`;
    ctx.fill();
    // Vertical trail
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 8 - Math.random() * 4);
    ctx.strokeStyle = `hsla(${hue}, 60%, 65%, ${alpha * 0.3})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Layer 3: Horizon glow
  const horizonG = ctx.createRadialGradient(w * 0.5, h * 0.2, 0, w * 0.5, h * 0.3, w * 0.6);
  horizonG.addColorStop(0, `hsla(${200 + Math.sin(t * 0.15) * 20}, 50%, 40%, 0.04)`);
  horizonG.addColorStop(1, "transparent");
  ctx.fillStyle = horizonG;
  ctx.fillRect(0, 0, w, h);
}

function renderTerracotta(ctx, w, h, t, mx, my) {
  // Layer 1: Drifting organic noise blobs
  for (let i = 0; i < 10; i++) {
    const cx2 = (Math.sin(t * 0.06 + i * 2.3) * 0.38 + 0.5) * w;
    const cy2 = (Math.cos(t * 0.05 + i * 1.7) * 0.38 + 0.5) * h;
    const baseR = 40 + i * 8;

    // Organic blob shape using noise-modulated circle
    ctx.beginPath();
    for (let a = 0; a <= 64; a++) {
      const angle = (a / 64) * Math.PI * 2;
      const nR = baseR * (1 + fbm(Math.cos(angle) + i + t * 0.04, Math.sin(angle) + i, 2) * 0.4);
      const px = cx2 + Math.cos(angle) * nR;
      const py = cy2 + Math.sin(angle) * nR;
      a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    const hue = 25 + i * 4 + Math.sin(t * 0.2 + i) * 5;
    ctx.fillStyle = `hsla(${hue}, 45%, 30%, 0.04)`;
    ctx.fill();
  }

  // Layer 2: Grain texture
  for (let i = 0; i < 150; i++) {
    const seed = i * 43.7;
    const x = (Math.sin(seed * 3.1) * 0.5 + 0.5) * w;
    const y = (Math.cos(seed * 2.7) * 0.5 + 0.5) * h;
    const drift = Math.sin(t * 0.1 + seed) * 2;
    ctx.beginPath();
    ctx.arc(x + drift, y, 0.6, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(30, 35%, 50%, 0.04)`;
    ctx.fill();
  }

  // Layer 3: Warm mouse-follow glow
  const mg = ctx.createRadialGradient(mx * w, my * h, 0, mx * w, my * h, 120);
  mg.addColorStop(0, "hsla(35, 60%, 45%, 0.06)");
  mg.addColorStop(1, "transparent");
  ctx.fillStyle = mg;
  ctx.fillRect(0, 0, w, h);
}

function renderPrism(ctx, w, h, t, mx, my) {
  const cx = w / 2, cy = h / 2;

  // Layer 1: Rotating light shards with spectral splits
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + t * 0.15;
    const len = w * 0.25 + Math.sin(t * 0.3 + i * 1.2) * w * 0.08;
    const spread = 0.06 + Math.sin(t * 0.2 + i) * 0.02;

    // RGB split - three lines per shard
    const offsets = [
      { hue: 0, offset: -spread },
      { hue: 120, offset: 0 },
      { hue: 240, offset: spread },
    ];

    offsets.forEach(({ hue, offset }) => {
      const a = angle + offset;
      const x1 = cx + Math.cos(a) * 20;
      const y1 = cy + Math.sin(a) * 20;
      const x2 = cx + Math.cos(a) * len;
      const y2 = cy + Math.sin(a) * len;

      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, `hsla(${hue + i * 30 + t * 10}, 80%, 55%, 0.12)`);
      grad.addColorStop(0.5, `hsla(${hue + i * 30 + t * 10 + 20}, 75%, 50%, 0.06)`);
      grad.addColorStop(1, "transparent");

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  // Layer 2: Caustic spots (rainbow reflections)
  for (let i = 0; i < 20; i++) {
    const seed = i * 67.3;
    const x = (Math.sin(t * 0.15 + seed) * 0.4 + 0.5) * w;
    const y = (Math.cos(t * 0.12 + seed * 1.3) * 0.4 + 0.5) * h;
    const r = 3 + Math.sin(t * 0.5 + i) * 2;
    const hue = (i * 36 + t * 15) % 360;

    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
    g.addColorStop(0, `hsla(${hue}, 80%, 60%, 0.12)`);
    g.addColorStop(0.5, `hsla(${hue + 30}, 70%, 50%, 0.04)`);
    g.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(x, y, r * 5, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }

  // Layer 3: Center prism
  const prismG = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30);
  prismG.addColorStop(0, `rgba(255,255,255,${0.06 + Math.sin(t * 0.4) * 0.02})`);
  prismG.addColorStop(1, "transparent");
  ctx.fillStyle = prismG;
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.fill();
}

function renderBiolume(ctx, w, h, t, mx, my) {
  // Layer 1: Deep water ambient gradient
  const deep = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.5, w * 0.7);
  deep.addColorStop(0, "rgba(5, 30, 35, 0.06)");
  deep.addColorStop(1, "transparent");
  ctx.fillStyle = deep;
  ctx.fillRect(0, 0, w, h);

  // Layer 2: Jellyfish-like organisms with trailing tentacles
  for (let i = 0; i < 8; i++) {
    const jx = (Math.sin(t * 0.08 + i * 2.5) * 0.35 + 0.5) * w;
    const jy = (Math.cos(t * 0.06 + i * 1.8) * 0.35 + 0.45) * h + Math.sin(t * 0.3 + i) * 10;
    const size = 12 + i * 3;
    const hue = 170 + Math.sin(i * 1.2) * 25;
    const pulse = 0.7 + Math.sin(t * 0.8 + i * 0.9) * 0.3;

    // Bell (dome shape)
    ctx.beginPath();
    ctx.ellipse(jx, jy, size * pulse, size * 0.6 * pulse, 0, Math.PI, 0);
    const bellG = ctx.createRadialGradient(jx, jy - size * 0.2, 0, jx, jy, size);
    bellG.addColorStop(0, `hsla(${hue}, 70%, 60%, ${0.12 * pulse})`);
    bellG.addColorStop(1, `hsla(${hue}, 60%, 40%, 0.02)`);
    ctx.fillStyle = bellG;
    ctx.fill();

    // Glow
    ctx.beginPath();
    ctx.arc(jx, jy, size * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 65%, 55%, ${0.03 * pulse})`;
    ctx.fill();

    // Tentacles
    for (let ten = 0; ten < 5; ten++) {
      ctx.beginPath();
      const tenX = jx + (ten - 2) * (size * 0.35);
      ctx.moveTo(tenX, jy + size * 0.3);
      for (let seg = 1; seg <= 8; seg++) {
        const sy = jy + size * 0.3 + seg * (size * 0.25);
        const sx = tenX + Math.sin(t * 0.6 + i + ten * 0.5 + seg * 0.4) * (3 + seg * 0.8);
        ctx.lineTo(sx, sy);
      }
      ctx.strokeStyle = `hsla(${hue + 10}, 65%, 60%, ${0.06 * pulse * (1 - 0)})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }

  // Layer 3: Floating plankton dots
  for (let i = 0; i < 50; i++) {
    const seed = i * 51.3;
    const x = ((Math.sin(seed * 2.3) * 0.5 + 0.5) * w + Math.sin(t * 0.15 + i) * 8) % w;
    const y = ((Math.cos(seed * 1.9) * 0.5 + 0.5) * h + Math.sin(t * 0.12 + i * 0.7) * 6) % h;
    const brightness = 0.1 + Math.sin(t * 1.2 + seed) * 0.08;
    ctx.beginPath();
    ctx.arc(x, y, 1, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${165 + Math.sin(i) * 20}, 65%, 60%, ${brightness})`;
    ctx.fill();
  }
}

function renderCircuit(ctx, w, h, t, mx, my) {
  // Layer 1: Circuit traces (horizontal + vertical paths with corners)
  const gridSize = 40;
  const cols = Math.ceil(w / gridSize) + 1;
  const rows = Math.ceil(h / gridSize) + 1;

  // Draw traces
  for (let i = 0; i < 25; i++) {
    const seed = i * 127.3;
    const startCol = Math.floor((Math.sin(seed) * 0.5 + 0.5) * cols);
    const startRow = Math.floor((Math.cos(seed * 1.4) * 0.5 + 0.5) * rows);

    ctx.beginPath();
    let cx2 = startCol * gridSize;
    let cy2 = startRow * gridSize;
    ctx.moveTo(cx2, cy2);

    let dir = Math.floor(seed * 10) % 4; // 0=right, 1=down, 2=left, 3=up
    for (let seg = 0; seg < 8; seg++) {
      const len = gridSize * (1 + Math.floor(Math.sin(seed + seg) * 2 + 2));
      const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
      cx2 += dirs[dir][0] * len;
      cy2 += dirs[dir][1] * len;
      ctx.lineTo(cx2, cy2);
      dir = (dir + (Math.sin(seed + seg * 3) > 0 ? 1 : 3)) % 4; // turn
    }

    const pulse = (t * 0.5 + i * 0.3) % 3;
    const alpha = pulse < 1 ? 0.02 + pulse * 0.06 : pulse < 2 ? 0.08 - (pulse - 1) * 0.06 : 0.02;
    ctx.strokeStyle = `hsla(165, 70%, 55%, ${alpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Layer 2: Nodes at intersections
  for (let i = 0; i < 30; i++) {
    const seed = i * 97.1;
    const nx = Math.floor((Math.sin(seed) * 0.5 + 0.5) * cols) * gridSize;
    const ny = Math.floor((Math.cos(seed * 1.3) * 0.5 + 0.5) * rows) * gridSize;
    const active = Math.sin(t * 0.8 + seed) > 0.3;
    const md = Math.hypot(nx - mx * w, ny - my * h);
    const mouseActive = md < 80;

    if (active || mouseActive) {
      const brightness = mouseActive ? 0.25 : 0.12;
      ctx.beginPath();
      ctx.arc(nx, ny, 2, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(165, 75%, 60%, ${brightness})`;
      ctx.fill();

      // Node glow
      ctx.beginPath();
      ctx.arc(nx, ny, mouseActive ? 12 : 8, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(165, 70%, 55%, ${brightness * 0.2})`;
      ctx.fill();
    }
  }

  // Layer 3: Data packets (moving dots along traces)
  for (let i = 0; i < 15; i++) {
    const seed = i * 61.7;
    const progress = ((t * 0.4 + i * 0.7) % 4) / 4;
    const pathX = (Math.sin(seed) * 0.5 + 0.5) * w;
    const pathY = progress * h;
    ctx.beginPath();
    ctx.arc(pathX, pathY, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(180, 80%, 65%, 0.3)`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(pathX, pathY, 6, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(180, 70%, 60%, 0.06)`;
    ctx.fill();
  }
}

function renderSakura(ctx, w, h, t, mx, my) {
  // Layer 1: Watercolor washes
  for (let i = 0; i < 6; i++) {
    const cx2 = (Math.sin(t * 0.04 + i * 3) * 0.4 + 0.5) * w;
    const cy2 = (Math.cos(t * 0.035 + i * 2.2) * 0.4 + 0.5) * h;
    const r = w * 0.15 + Math.sin(t * 0.15 + i) * w * 0.03;
    const hue = 335 + Math.sin(i * 0.8) * 15;

    const g = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, r);
    g.addColorStop(0, `hsla(${hue}, 50%, 55%, 0.04)`);
    g.addColorStop(0.6, `hsla(${hue}, 40%, 45%, 0.02)`);
    g.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(cx2, cy2, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }

  // Layer 2: Falling petals
  for (let i = 0; i < 30; i++) {
    const seed = i * 83.7;
    const fallSpeed = 0.15 + (i % 6) * 0.05;
    const windInfluence = (mx - 0.5) * 30 + Math.sin(t * 0.3 + seed) * 20;
    const x = ((Math.sin(seed * 2.1) * 0.5 + 0.5) * w + windInfluence + Math.sin(t * 0.2 + i) * 15) % w;
    const cycle = (t * 8 * fallSpeed + seed * 5) % (h * 1.4);
    const y = cycle - h * 0.2;
    const rotation = t * 0.5 + seed + Math.sin(t * 0.3 + i) * 0.5;
    const life = Math.min(1, Math.max(0, 1 - Math.abs(y - h * 0.5) / (h * 0.6)));
    const hue = 335 + Math.sin(seed * 0.3) * 20;
    const size = 3 + Math.sin(seed) * 1.5;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(1, 0.6 + Math.sin(t * 0.8 + i) * 0.3); // Tumble effect

    // Petal shape (two arcs)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(size * 1.5, -size, 0, -size * 2.5);
    ctx.quadraticCurveTo(-size * 1.5, -size, 0, 0);
    ctx.fillStyle = `hsla(${hue}, 55%, 65%, ${life * 0.2})`;
    ctx.fill();

    // Petal glow
    ctx.beginPath();
    ctx.arc(0, -size, size * 3, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 45%, 60%, ${life * 0.02})`;
    ctx.fill();

    ctx.restore();
  }

  // Layer 3: Gentle ambient light
  const ambient = ctx.createRadialGradient(w * 0.5, h * 0.3, 0, w * 0.5, h * 0.5, w * 0.5);
  ambient.addColorStop(0, `hsla(15, 40%, 50%, 0.03)`);
  ambient.addColorStop(1, "transparent");
  ctx.fillStyle = ambient;
  ctx.fillRect(0, 0, w, h);
}

const RENDERERS = {
  cosmic: renderCosmic, fluid: renderFluid, ember: renderEmber,
  monolith: renderMonolith, aurora: renderAurora, terracotta: renderTerracotta,
  prism: renderPrism, biolume: renderBiolume, circuit: renderCircuit, sakura: renderSakura,
};

// ─── THEME CANVAS COMPONENT ───
function ThemeCanvas({ themeId, height = 300, interactive = true }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const theme = THEMES.find((t) => t.id === themeId);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const scale = 2;

    const resize = () => {
      canvas.width = canvas.offsetWidth * scale;
      canvas.height = canvas.offsetHeight * scale;
    };
    resize();

    const handleMouse = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = (e.clientX - rect.left) / rect.width;
      mouseRef.current.y = (e.clientY - rect.top) / rect.height;
    };

    if (interactive) canvas.addEventListener("mousemove", handleMouse);

    const start = performance.now();
    const render = RENDERERS[themeId];

    const animate = () => {
      const t = (performance.now() - start) * 0.001;
      const w = canvas.width, h = canvas.height;

      // Clear with theme bg
      ctx.fillStyle = theme?.bg || "#000";
      ctx.fillRect(0, 0, w, h);

      if (render) render(ctx, w, h, t, mouseRef.current.x, mouseRef.current.y);

      animRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      if (interactive) canvas.removeEventListener("mousemove", handleMouse);
    };
  }, [themeId, interactive]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height,
        borderRadius: 14,
        display: "block",
        cursor: interactive ? "crosshair" : "default",
      }}
    />
  );
}

// ─── RESUME PREVIEW OVERLAY ───
function ResumeOverlay() {
  const gold = "#D4A654";
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "radial-gradient(ellipse at center, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 28, pointerEvents: "none",
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        background: `linear-gradient(135deg, ${gold}, #E8845C)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Playfair Display', Georgia, serif", fontSize: 19, fontWeight: 700, color: "#1A0A2E",
        boxShadow: "0 0 24px rgba(212,166,84,0.3)", marginBottom: 10,
      }}>R</div>
      <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>Ray</h3>
      <p style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#F0D48A", marginTop: 3, textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>Attorney & Tech Founder</p>
      <div style={{ display: "flex", gap: 5, marginTop: 12, flexWrap: "wrap", justifyContent: "center" }}>
        {["Legal Tech", "SaaS", "EdTech", "UI/UX"].map((s) => (
          <span key={s} style={{ background: "rgba(212,166,84,0.12)", border: "1px solid rgba(212,166,84,0.25)", borderRadius: 100, padding: "2px 9px", fontSize: 9, color: "#F0D48A" }}>{s}</span>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN GALLERY ───
export default function ThemeGallery() {
  const [selected, setSelected] = useState(null);
  const [showResume, setShowResume] = useState(true);
  const gold = "#D4A654";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@300;400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: #D4A654; color: #1A0A2E; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(170deg, #1A0A2E 0%, #0F0519 50%, #120A20 100%)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        color: "#F5F0EB",
        padding: "24px 20px 60px",
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32, padding: "0 16px" }}>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
            my<span style={{ color: gold }}>living</span>page
          </div>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: gold, marginBottom: 10 }}>Living Theme Engine</div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(28px, 5vw, 42px)", lineHeight: 1.15 }}>
            10 Themes. Each One <em style={{ color: gold, fontStyle: "italic" }}>Alive</em>.
          </h1>
          <p style={{ color: "rgba(245,240,235,0.4)", fontSize: 15, marginTop: 10, fontWeight: 300, maxWidth: 480, margin: "10px auto 0" }}>
            Move your cursor over each theme to interact with it. Every background is unique algorithmic art rendered in real-time.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
            <button onClick={() => setShowResume(!showResume)} style={{
              background: showResume ? "rgba(212,166,84,0.1)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${showResume ? "rgba(212,166,84,0.3)" : "rgba(255,255,255,0.08)"}`,
              color: showResume ? gold : "rgba(245,240,235,0.4)",
              borderRadius: 100, padding: "8px 20px", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.3s",
            }}>
              {showResume ? "✦ Resume Overlay On" : "○ Resume Overlay Off"}
            </button>
          </div>
        </div>

        {/* Selected theme full view */}
        {selected && (
          <div style={{
            maxWidth: 860, margin: "0 auto 36px",
            border: "1px solid rgba(212,166,84,0.15)", borderRadius: 20,
            overflow: "hidden", background: "#000",
            boxShadow: "0 40px 100px rgba(0,0,0,0.5), 0 0 80px rgba(212,166,84,0.06)",
          }}>
            <div style={{ background: "rgba(0,0,0,0.4)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ display: "flex", gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57", cursor: "pointer" }} onClick={() => setSelected(null)} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FEBC2E" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840" }} />
              </div>
              <div style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: "5px 12px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "rgba(245,240,235,0.5)" }}>
                mylivingpage.com/<span style={{ color: "#F0D48A" }}>ray</span> — <span style={{ color: "rgba(245,240,235,0.3)" }}>{THEMES.find(t => t.id === selected)?.name} theme</span>
              </div>
            </div>
            <div style={{ position: "relative" }}>
              <ThemeCanvas themeId={selected} height={460} interactive={true} />
              {showResume && <ResumeOverlay />}
            </div>
            <div style={{ padding: "14px 20px", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 16 }}>{THEMES.find(t => t.id === selected)?.name}</span>
                <span style={{ fontSize: 11, color: "rgba(245,240,235,0.3)", marginLeft: 10 }}>{THEMES.find(t => t.id === selected)?.vibe}</span>
              </div>
              <button onClick={() => setSelected(null)} style={{
                background: "transparent", border: `1px solid rgba(255,255,255,0.1)`, color: "rgba(245,240,235,0.5)",
                borderRadius: 100, padding: "6px 16px", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
              }}>Close Preview</button>
            </div>
          </div>
        )}

        {/* Theme grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
          maxWidth: 1100,
          margin: "0 auto",
        }}>
          {THEMES.map((theme) => (
            <div
              key={theme.id}
              onClick={() => setSelected(theme.id)}
              style={{
                background: selected === theme.id ? "rgba(212,166,84,0.05)" : "rgba(255,255,255,0.01)",
                border: `1px solid ${selected === theme.id ? "rgba(212,166,84,0.25)" : "rgba(255,255,255,0.04)"}`,
                borderRadius: 18,
                overflow: "hidden",
                cursor: "pointer",
                transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
              }}
            >
              <div style={{ position: "relative" }}>
                <ThemeCanvas themeId={theme.id} height={180} interactive={true} />
                {showResume && (
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "radial-gradient(ellipse at center, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.45) 100%)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    pointerEvents: "none",
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: `linear-gradient(135deg, ${gold}, #E8845C)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "'Playfair Display', Georgia, serif", fontSize: 14, fontWeight: 700, color: "#1A0A2E",
                    }}>R</div>
                    <div>
                      <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 15, textShadow: "0 1px 8px rgba(0,0,0,0.5)" }}>Ray</div>
                      <div style={{ fontSize: 9, color: "#F0D48A", letterSpacing: 1.5, textTransform: "uppercase" }}>Attorney & Tech Founder</div>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ padding: "14px 16px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 17 }}>{theme.name}</h3>
                  <span style={{ fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: selected === theme.id ? gold : "rgba(245,240,235,0.2)" }}>{theme.vibe}</span>
                </div>
                <p style={{ fontSize: 12, color: "rgba(245,240,235,0.35)", lineHeight: 1.55 }}>{theme.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
