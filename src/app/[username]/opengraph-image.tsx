import { ImageResponse } from "next/og";
import qrcode from "qrcode-generator";
import { createClient } from "@supabase/supabase-js";
import { fetchPublicLivePage } from "@/lib/pages/fetchPublicLivePage";
import type { ResumeData } from "@/types/resume";

export const runtime = "edge";
export const revalidate = 60;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "MyLivingPage share card";

interface ThemeVisual {
  accent: string;
  glow: string;
  gradientFrom: string;
  gradientMid: string;
  gradientTo: string;
}

type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: "normal";
};

const DEFAULT_THEME_VISUAL: ThemeVisual = {
  accent: "#3B82F6",
  glow: "rgba(59,130,246,0.30)",
  gradientFrom: "#09152B",
  gradientMid: "#0A1024",
  gradientTo: "#13071E",
};

const THEME_VISUALS: Record<string, ThemeVisual> = {
  cosmic: { accent: "#6B5CE7", glow: "rgba(107,92,231,0.32)", gradientFrom: "#070C1B", gradientMid: "#0C1231", gradientTo: "#1B0E31" },
  fluid: { accent: "#3B82F6", glow: "rgba(59,130,246,0.30)", gradientFrom: "#071325", gradientMid: "#091C34", gradientTo: "#0B1230" },
  ember: { accent: "#EF6C35", glow: "rgba(239,108,53,0.33)", gradientFrom: "#180906", gradientMid: "#2A110A", gradientTo: "#17090C" },
  monolith: { accent: "#A1A1AA", glow: "rgba(161,161,170,0.28)", gradientFrom: "#0A0A0D", gradientMid: "#16161A", gradientTo: "#0B0B0E" },
  aurora: { accent: "#34D399", glow: "rgba(52,211,153,0.28)", gradientFrom: "#07142A", gradientMid: "#0A2540", gradientTo: "#0B1027" },
  terracotta: { accent: "#C2703E", glow: "rgba(194,112,62,0.30)", gradientFrom: "#180E09", gradientMid: "#27150E", gradientTo: "#16100C" },
  prism: { accent: "#A855F7", glow: "rgba(168,85,247,0.32)", gradientFrom: "#0E0A1A", gradientMid: "#1A1030", gradientTo: "#11091F" },
  biolume: { accent: "#06B6A4", glow: "rgba(6,182,164,0.30)", gradientFrom: "#061816", gradientMid: "#0A2624", gradientTo: "#071612" },
  circuit: { accent: "#10B981", glow: "rgba(16,185,129,0.30)", gradientFrom: "#06140F", gradientMid: "#0A2018", gradientTo: "#07120D" },
  sakura: { accent: "#EC4899", glow: "rgba(236,72,153,0.30)", gradientFrom: "#140A12", gradientMid: "#241126", gradientTo: "#180A14" },
  glacier: { accent: "#60A5FA", glow: "rgba(96,165,250,0.28)", gradientFrom: "#06101B", gradientMid: "#0B1B2F", gradientTo: "#080E1D" },
  verdant: { accent: "#4ADE80", glow: "rgba(74,222,128,0.28)", gradientFrom: "#07130B", gradientMid: "#0E2013", gradientTo: "#08110C" },
  neon: { accent: "#22D3EE", glow: "rgba(34,211,238,0.32)", gradientFrom: "#0B0818", gradientMid: "#17102E", gradientTo: "#0A0A1C" },
  topo: { accent: "#93C5FD", glow: "rgba(147,197,253,0.28)", gradientFrom: "#0A0E12", gradientMid: "#121924", gradientTo: "#0B0E14" },
  luxe: { accent: "#F59E0B", glow: "rgba(245,158,11,0.30)", gradientFrom: "#140F09", gradientMid: "#241A11", gradientTo: "#120D09" },
  dusk: { accent: "#F472B6", glow: "rgba(244,114,182,0.30)", gradientFrom: "#120A17", gradientMid: "#251030", gradientTo: "#130917" },
  matrix: { accent: "#22C55E", glow: "rgba(34,197,94,0.30)", gradientFrom: "#051007", gradientMid: "#0A1B0D", gradientTo: "#060E08" },
  coral: { accent: "#2DD4BF", glow: "rgba(45,212,191,0.30)", gradientFrom: "#071116", gradientMid: "#0C2128", gradientTo: "#081116" },
  stardust: { accent: "#818CF8", glow: "rgba(129,140,248,0.32)", gradientFrom: "#070816", gradientMid: "#101335", gradientTo: "#0C0720" },
  ink: { accent: "#94A3B8", glow: "rgba(148,163,184,0.28)", gradientFrom: "#090D16", gradientMid: "#121827", gradientTo: "#0A0D17" },
  bloom: { accent: "#C084FC", glow: "rgba(192,132,252,0.30)", gradientFrom: "#130A19", gradientMid: "#231033", gradientTo: "#150A1E" },
  silk: { accent: "#7DD3FC", glow: "rgba(125,211,252,0.30)", gradientFrom: "#080A17", gradientMid: "#101A32", gradientTo: "#0A0B18" },
  tempest: { accent: "#38BDF8", glow: "rgba(56,189,248,0.30)", gradientFrom: "#06080F", gradientMid: "#0E1323", gradientTo: "#070911" },
  obsidian: { accent: "#FB7185", glow: "rgba(251,113,133,0.30)", gradientFrom: "#080404", gradientMid: "#1A0C0C", gradientTo: "#090405" },
};

function normalizeAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://mylivingpage.com").replace(/\/+$/, "");
}

function truncate(value: string | null | undefined, maxChars: number): string {
  if (!value) return "";
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`;
}

function getThemeVisual(themeId: string): ThemeVisual {
  return THEME_VISUALS[themeId] ?? DEFAULT_THEME_VISUAL;
}

function toDisplayDomainUrl(url: string, slug: string): string {
  const host = url.replace(/^https?:\/\//, "");
  return `${host}/${slug}`;
}

function toLivePageUrl(appUrl: string, slug: string): string {
  return `${appUrl}/${slug}`;
}

function buildQrDataUrl(value: string): string | null {
  try {
    const qr = qrcode(0, "M");
    qr.addData(value, "Byte");
    qr.make();

    const moduleCount = qr.getModuleCount();
    const cellSize = 4;
    const margin = 2;
    const side = (moduleCount + margin * 2) * cellSize;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${side}" height="${side}" viewBox="0 0 ${side} ${side}" fill="none">`;
    svg += `<rect width="${side}" height="${side}" fill="#FFFFFF"/>`;
    svg += `<g fill="#0A1628">`;

    for (let row = 0; row < moduleCount; row += 1) {
      for (let col = 0; col < moduleCount; col += 1) {
        if (!qr.isDark(row, col)) continue;
        const x = (col + margin) * cellSize;
        const y = (row + margin) * cellSize;
        svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" />`;
      }
    }

    svg += "</g></svg>";
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  } catch {
    return null;
  }
}

async function fetchFont(url: string): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.arrayBuffer();
  } catch {
    return null;
  }
}

function getPrimaryExperience(resume: ResumeData): { title: string; company: string; dates: string } | null {
  const item = resume.experience?.[0];
  if (!item) return null;
  return {
    title: truncate(item.title, 44),
    company: truncate(item.company, 34),
    dates: truncate(item.dates, 20),
  };
}

function getPublicSafeSummary(resume: ResumeData): string {
  return truncate(resume.summary, 180);
}

function getSafeName(resume: ResumeData): string {
  return truncate(resume.name || "MyLivingPage User", 44);
}

function getSafeHeadline(resume: ResumeData): string {
  return truncate(resume.headline || "Professional profile", 72);
}

function getSafeLocation(resume: ResumeData): string {
  return truncate(resume.location || "", 42);
}

function getVisibleStats(resume: ResumeData): Array<{ value: string; label: string }> {
  return (resume.stats ?? [])
    .slice(0, 4)
    .filter((s) => Boolean(s?.value) && Boolean(s?.label))
    .map((s) => ({
      value: truncate(s.value, 14),
      label: truncate(s.label, 18),
    }));
}

function createEdgeSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function renderFallbackCard(fonts: OgFont[], playfairLoaded: boolean, dmSansLoaded: boolean) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0A1628 0%, #0F0519 100%)",
          color: "#F0F4FF",
          fontFamily: playfairLoaded ? "Playfair" : "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", fontSize: 48, fontWeight: 700 }}>
          my<span style={{ color: "#3B82F6" }}>living</span>page
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 22,
            color: "rgba(240,244,255,0.62)",
            fontFamily: dmSansLoaded ? "DM Sans" : "sans-serif",
          }}
        >
          Your resume, alive.
        </div>
      </div>
    ),
    {
      ...size,
      fonts,
    },
  );
}

export default async function OGImage({ params }: { params: { username: string } }) {
  const [playfairFont, dmSansFont] = await Promise.all([
    fetchFont("https://fonts.gstatic.com/s/playfairdisplay/v40/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKeiukDQ.ttf"),
    fetchFont("https://fonts.gstatic.com/s/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAopxhTg.ttf"),
  ]);

  const fonts = [
    playfairFont ? { name: "Playfair", data: playfairFont, weight: 700 as const, style: "normal" as const } : null,
    dmSansFont ? { name: "DM Sans", data: dmSansFont, weight: 400 as const, style: "normal" as const } : null,
  ].filter((font): font is OgFont => Boolean(font));

  const supabase = createEdgeSupabaseClient();
  const page = supabase ? await fetchPublicLivePage(supabase, params.username) : null;
  if (!page) {
    return renderFallbackCard(fonts, Boolean(playfairFont), Boolean(dmSansFont));
  }

  const appUrl = normalizeAppUrl();
  const livePageUrl = toLivePageUrl(appUrl, page.slug);
  const displayUrl = truncate(toDisplayDomainUrl(appUrl, page.slug), 48);
  const qrDataUrl = buildQrDataUrl(livePageUrl);
  const resume = page.resume_data;
  const visual = getThemeVisual(page.theme_id);
  const safeName = getSafeName(resume);
  const safeHeadline = getSafeHeadline(resume);
  const safeLocation = getSafeLocation(resume);
  const summary = getPublicSafeSummary(resume);
  const stats = getVisibleStats(resume);
  const primaryExperience = getPrimaryExperience(resume);
  const initial = safeName.slice(0, 1).toUpperCase() || "?";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "46px 54px 34px",
          background: `linear-gradient(138deg, ${visual.gradientFrom} 0%, ${visual.gradientMid} 52%, ${visual.gradientTo} 100%)`,
          color: "#F0F4FF",
          fontFamily: dmSansFont ? "DM Sans" : "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -160,
            right: -130,
            width: 520,
            height: 520,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${visual.glow} 0%, rgba(0,0,0,0) 72%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -120,
            bottom: -220,
            width: 520,
            height: 520,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${visual.glow} 0%, rgba(0,0,0,0) 76%)`,
            opacity: 0.55,
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 860 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                letterSpacing: "0.18em",
                color: "rgba(240,244,255,0.58)",
                textTransform: "uppercase",
              }}
            >
              <span style={{ width: 22, height: 2, background: visual.accent, borderRadius: 99 }} />
              Live Page Snapshot
            </div>
            <div
              style={{
                marginTop: 12,
                fontFamily: playfairFont ? "Playfair" : "serif",
                fontSize: 56,
                lineHeight: 1.02,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                textShadow: "0 2px 20px rgba(0,0,0,0.5)",
              }}
            >
              {safeName}
            </div>
            <div style={{ marginTop: 10, fontSize: 26, color: "rgba(240,244,255,0.86)", maxWidth: 820 }}>{safeHeadline}</div>
            {safeLocation ? <div style={{ marginTop: 8, fontSize: 18, color: "rgba(240,244,255,0.56)" }}>{safeLocation}</div> : null}
          </div>

          {resume.avatar_url ? (
            <img
              src={resume.avatar_url}
              alt=""
              width={98}
              height={98}
              style={{
                borderRadius: "50%",
                objectFit: "cover",
                border: `3px solid ${visual.accent}`,
                boxShadow: `0 0 32px ${visual.glow}`,
              }}
            />
          ) : (
            <div
              style={{
                width: 98,
                height: 98,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: playfairFont ? "Playfair" : "serif",
                fontSize: 42,
                fontWeight: 700,
                color: "#0A1628",
                background: `linear-gradient(135deg, ${visual.accent}, #E2E8F0)`,
                boxShadow: `0 0 32px ${visual.glow}`,
              }}
            >
              {initial}
            </div>
          )}
        </div>

        {summary ? (
          <div
            style={{
              marginTop: 22,
              padding: "14px 18px",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 14,
              background: "rgba(10,22,40,0.38)",
              fontSize: 19,
              lineHeight: 1.4,
              color: "rgba(240,244,255,0.80)",
              zIndex: 1,
            }}
          >
            {summary}
          </div>
        ) : null}

        {stats.length ? (
          <div style={{ display: "flex", marginTop: 18, gap: 10, zIndex: 1 }}>
            {stats.map((stat) => (
              <div
                key={`${stat.label}-${stat.value}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  minWidth: 136,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(10,22,40,0.44)",
                }}
              >
                <span style={{ fontSize: 24, lineHeight: 1.1, color: visual.accent, fontWeight: 700 }}>{stat.value}</span>
                <span style={{ marginTop: 4, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(240,244,255,0.52)" }}>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {primaryExperience ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 16,
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(6,14,28,0.52)",
              zIndex: 1,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: visual.accent }}>
                Featured Experience
              </span>
              <span style={{ fontSize: 20, color: "#F0F4FF" }}>
                {primaryExperience.title} <span style={{ color: "rgba(240,244,255,0.62)" }}>- {primaryExperience.company}</span>
              </span>
            </div>
            <span style={{ fontSize: 15, color: "rgba(240,244,255,0.50)" }}>{primaryExperience.dates}</span>
          </div>
        ) : null}

        <div style={{ flex: 1 }} />

        <div
          style={{
            width: "100%",
            height: 1,
            marginBottom: 14,
            background: `linear-gradient(90deg, ${visual.accent}, rgba(255,255,255,0.06))`,
            zIndex: 1,
          }}
        />

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", zIndex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "baseline", fontSize: 28, fontWeight: 700, fontFamily: playfairFont ? "Playfair" : "serif" }}>
              my<span style={{ color: visual.accent }}>living</span>page
            </div>
            <div style={{ marginTop: 5, fontSize: 16, color: "rgba(240,244,255,0.58)" }}>{displayUrl}</div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(10,22,40,0.58)",
              minWidth: 268,
            }}
          >
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt=""
                width={88}
                height={88}
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "#FFFFFF",
                }}
              />
            ) : (
              <div
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.08)",
                }}
              />
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#F0F4FF" }}>Scan to view</span>
              <span style={{ fontSize: 12, color: "rgba(240,244,255,0.56)", maxWidth: 150 }}>{truncate(displayUrl, 30)}</span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts,
    },
  );
}
