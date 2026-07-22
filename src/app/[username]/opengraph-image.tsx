/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { fetchPublicLivePage } from "@/lib/pages/fetchPublicLivePage";
import {
  buildQrMatrix,
  getFirstName,
  getShareCardTags,
  getShareCardVisual,
  normalizeAppUrl,
  toDisplayDomainUrl,
  toLivePageUrl,
  truncate,
} from "@/lib/share-card";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/env";
import type { ResumeData } from "@/types/resume";

export const runtime = "nodejs";
export const maxDuration = 15;
export const revalidate = 60;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "MyLivingPage share card";

interface OgImageProps {
  params: Promise<{ username: string }>;
}

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

let fontPromise: Promise<[ArrayBuffer | null, ArrayBuffer | null]> | null = null;

function getOgFonts() {
  fontPromise ??= Promise.all([
    fetchFont("https://fonts.gstatic.com/s/playfairdisplay/v40/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKeiukDQ.ttf"),
    fetchFont("https://fonts.gstatic.com/s/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAopxhTg.ttf"),
  ]);
  return fontPromise;
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

function createEdgeSupabaseClient() {
  const url = getSupabaseUrl();
  const secretKey = getSupabaseSecretKey();
  if (!url || !secretKey) {
    return null;
  }

  return createClient(url, secretKey, {
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

export default async function OGImage({ params }: OgImageProps) {
  const { username } = await params;
  const [playfairFont, dmSansFont] = await getOgFonts();

  const fonts = [
    playfairFont ? { name: "Playfair", data: playfairFont, weight: 700 as const, style: "normal" as const } : null,
    dmSansFont ? { name: "DM Sans", data: dmSansFont, weight: 400 as const, style: "normal" as const } : null,
  ].filter((font): font is OgFont => Boolean(font));

  const supabase = createEdgeSupabaseClient();
  const page = supabase ? await fetchPublicLivePage(supabase, username) : null;
  if (!page) {
    return renderFallbackCard(fonts, Boolean(playfairFont), Boolean(dmSansFont));
  }

  const appUrl = normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL);
  const livePageUrl = toLivePageUrl(appUrl, page.slug);
  const displayUrl = truncate(toDisplayDomainUrl(appUrl, page.slug), 48);
  const qrMatrix = buildQrMatrix(livePageUrl);
  const qrCellSize = qrMatrix?.length ? Math.max(3, Math.floor(148 / qrMatrix.length)) : 0;
  const qrRenderSize = qrMatrix?.length ? qrMatrix.length * qrCellSize : 0;
  const resume = page.resume_data;
  const visual = getShareCardVisual(page.theme_id);
  const safeName = getSafeName(resume);
  const safeHeadline = getSafeHeadline(resume);
  const safeLocation = getSafeLocation(resume);
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
          position: "relative",
          overflow: "hidden",
          padding: "32px",
          background: "linear-gradient(145deg, #030711 0%, #07111C 55%, #03060D 100%)",
          color: "#F0F4FF",
          fontFamily: dmSansFont ? "DM Sans" : "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -120,
            width: 480,
            height: 480,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${visual.glow} 0%, rgba(0,0,0,0) 72%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -140,
            bottom: -220,
            width: 520,
            height: 520,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${visual.glow} 0%, rgba(0,0,0,0) 76%)`,
            opacity: 0.48,
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            padding: "34px 36px 30px",
            borderRadius: 32,
            border: "1px solid rgba(255,255,255,0.09)",
            background: `linear-gradient(138deg, ${visual.gradientFrom} 0%, ${visual.gradientMid} 52%, ${visual.gradientTo} 100%)`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 70px ${visual.glow}`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -100,
              right: -40,
              width: 300,
              height: 300,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${visual.glow} 0%, rgba(0,0,0,0) 72%)`,
            }}
          />

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 28 }}>
            <div style={{ display: "flex", flexDirection: "column", maxWidth: 760 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 14,
                  letterSpacing: "0.18em",
                  color: "rgba(240,244,255,0.58)",
                  textTransform: "uppercase",
                }}
              >
                <span style={{ width: 28, height: 2, background: visual.accent, borderRadius: 99 }} />
                Personalized Share Card
              </div>
              <div
                style={{
                  marginTop: 16,
                  fontFamily: playfairFont ? "Playfair" : "serif",
                  fontSize: 66,
                  lineHeight: 0.98,
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  textShadow: "0 2px 22px rgba(0,0,0,0.35)",
                  maxWidth: 720,
                }}
              >
                {safeName}
              </div>
              <div style={{ marginTop: 16, fontSize: 24, color: "rgba(240,244,255,0.86)", maxWidth: 700 }}>
                {safeHeadline}
              </div>
              {safeLocation ? (
                <div style={{ marginTop: 14, fontSize: 18, color: "rgba(240,244,255,0.56)" }}>
                  {safeLocation}
                </div>
              ) : null}
              <div
                style={{
                  marginTop: 20,
                  display: "flex",
                  alignItems: "center",
                  alignSelf: "flex-start",
                  padding: "9px 16px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(10,22,40,0.38)",
                  fontSize: 18,
                  color: "#93C5FD",
                }}
              >
                @{page.slug}
              </div>
            </div>

            {resume.avatar_url ? (
              <img
                src={resume.avatar_url}
                alt=""
                width={128}
                height={128}
                style={{
                  width: 128,
                  height: 128,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: `3px solid ${visual.accent}`,
                  boxShadow: `0 0 36px ${visual.glow}`,
                }}
              />
            ) : (
              <div
                style={{
                  width: 128,
                  height: 128,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: playfairFont ? "Playfair" : "serif",
                  fontSize: 50,
                  fontWeight: 700,
                  color: "#0A1628",
                  background: `linear-gradient(135deg, ${visual.accent}, #E2E8F0)`,
                  boxShadow: `0 0 36px ${visual.glow}`,
                }}
              >
                {initial}
              </div>
            )}
          </div>

          {shareTags.length ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 22,
                maxWidth: 760,
              }}
            >
              {shareTags.map((tag) => (
                <div
                  key={tag}
                  style={{
                    padding: "9px 14px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(10,22,40,0.40)",
                    fontSize: 15,
                    color: "rgba(240,244,255,0.78)",
                    maxWidth: "100%",
                  }}
                >
                  {tag}
                </div>
              ))}
            </div>
          ) : null}

          <div style={{ flex: 1 }} />

          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              justifyContent: "space-between",
              gap: 22,
              padding: "22px 24px",
              borderRadius: 26,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(6,14,28,0.54)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", maxWidth: 520 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#F0F4FF" }}>
                Scan to visit {firstName}
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 16,
                  lineHeight: 1.45,
                  color: "rgba(240,244,255,0.58)",
                }}
              >
                This QR code is unique to @{page.slug} and opens {truncate(livePageUrl, 44)}.
              </div>
            </div>

            {qrMatrix?.length ? (
              <div
                style={{
                  width: 172,
                  height: 172,
                  borderRadius: 22,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "#FFFFFF",
                  padding: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: qrRenderSize,
                    height: qrRenderSize,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {qrMatrix.map((row, rowIndex) => (
                    <div
                      key={`row-${rowIndex}`}
                      style={{
                        display: "flex",
                        width: qrRenderSize,
                        height: qrCellSize,
                      }}
                    >
                      {row.map((isDark, cellIndex) => (
                        <div
                          key={`cell-${rowIndex}-${cellIndex}`}
                          style={{
                            width: qrCellSize,
                            height: qrCellSize,
                            background: isDark ? "#0A1628" : "#FFFFFF",
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div
                style={{
                  width: 172,
                  height: 172,
                  borderRadius: 22,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.08)",
                }}
              />
            )}
          </div>

          <div
            style={{
              marginTop: 18,
              fontSize: 18,
              color: "rgba(240,244,255,0.56)",
            }}
          >
            {displayUrl}
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
