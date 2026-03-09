import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { fetchPublicLivePage } from "@/lib/pages/fetchPublicLivePage";
import {
  buildQrDataUrl,
  getFirstName,
  getShareCardTags,
  getShareCardVisual,
  normalizeAppUrl,
  toDisplayDomainUrl,
  toLivePageUrl,
  truncate,
} from "@/lib/share-card";
import type { ResumeData } from "@/types/resume";

export const runtime = "edge";
export const revalidate = 60;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "MyLivingPage share card";

type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: "normal";
};

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

  const appUrl = normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL);
  const livePageUrl = toLivePageUrl(appUrl, page.slug);
  const displayUrl = truncate(toDisplayDomainUrl(appUrl, page.slug), 48);
  const qrDataUrl = buildQrDataUrl(livePageUrl);
  const resume = page.resume_data;
  const visual = getShareCardVisual(page.theme_id);
  const safeName = getSafeName(resume);
  const safeHeadline = getSafeHeadline(resume);
  const safeLocation = getSafeLocation(resume);
  const summary = getPublicSafeSummary(resume);
  const stats = getVisibleStats(resume);
  const primaryExperience = getPrimaryExperience(resume);
  const shareTags = getShareCardTags(resume);
  const firstName = getFirstName(safeName);
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
              Personalized Share Card
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
            <div
              style={{
                marginTop: 14,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  padding: "7px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(10,22,40,0.38)",
                  fontSize: 13,
                  color: visual.accent,
                }}
              >
                @{page.slug}
              </div>
              <div style={{ fontSize: 14, color: "rgba(240,244,255,0.52)" }}>
                Unique QR code opens this exact living page
              </div>
            </div>
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

        {shareTags.length ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 18,
              zIndex: 1,
            }}
          >
            {shareTags.map((tag) => (
              <div
                key={tag}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(10,22,40,0.36)",
                  fontSize: 13,
                  color: "rgba(240,244,255,0.78)",
                }}
              >
                {tag}
              </div>
            ))}
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
              <span style={{ fontSize: 14, fontWeight: 700, color: "#F0F4FF" }}>Scan to visit {firstName}</span>
              <span style={{ fontSize: 12, color: "rgba(240,244,255,0.56)", maxWidth: 150 }}>
                Opens {truncate(displayUrl, 30)}
              </span>
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
