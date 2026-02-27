import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import type { ResumeData } from "@/types/resume";

export const runtime = "edge";
export const revalidate = 60;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "MyLivingPage share card";

const THEME_COLORS: Record<string, string> = {
  cosmic: "#6B5CE7",
  fluid: "#3B82F6",
  ember: "#EF6C35",
  monolith: "#71717A",
  aurora: "#34D399",
  terracotta: "#C2703E",
  prism: "#A855F7",
  biolume: "#06B6A4",
  circuit: "#10B981",
  sakura: "#EC4899",
};

interface PageRow {
  resume_data: ResumeData;
  theme_id: string;
  slug: string;
  user_id: string;
}

async function fetchPage(username: string): Promise<PageRow | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (!profile) return null;

  const { data: page } = await supabase
    .from("pages")
    .select("resume_data, theme_id, slug, user_id")
    .eq("user_id", profile.id)
    .eq("status", "live")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (page as PageRow | null) ?? null;
}

export default async function OGImage({ params }: { params: { username: string } }) {
  const [playfairFont, dmSansFont] = await Promise.all([
    fetch(
      "https://fonts.gstatic.com/s/playfairdisplay/v40/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKeiukDQ.ttf",
    ).then((res) => res.arrayBuffer()),
    fetch(
      "https://fonts.gstatic.com/s/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAopxhTg.ttf",
    ).then((res) => res.arrayBuffer()),
  ]);

  const page = await fetchPage(params.username);

  if (!page) {
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
            background: "linear-gradient(135deg, #1A0A2E 0%, #0F0519 100%)",
            fontFamily: "Playfair",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", fontSize: 48, fontWeight: 700, color: "#F5F0EB" }}>
            my<span style={{ color: "#D4A654" }}>living</span>page
          </div>
          <div style={{ marginTop: 20, fontSize: 22, color: "rgba(245,240,235,0.6)", fontFamily: "DM Sans" }}>
            Your resume, alive.
          </div>
        </div>
      ),
      {
        ...size,
        fonts: [
          { name: "Playfair", data: playfairFont, weight: 700, style: "normal" },
          { name: "DM Sans", data: dmSansFont, weight: 400, style: "normal" },
        ],
      },
    );
  }

  const resume = page.resume_data;
  const themeColor = THEME_COLORS[page.theme_id] ?? THEME_COLORS.cosmic;
  const initial = (resume.name || "?").slice(0, 1).toUpperCase();
  const summary = resume.summary
    ? resume.summary.length > 140
      ? resume.summary.slice(0, 137) + "..."
      : resume.summary
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(145deg, #1A0A2E 0%, #120A20 60%, #0F0519 100%)",
          padding: "60px 70px 50px",
          fontFamily: "DM Sans",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle radial glow */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${themeColor}15 0%, transparent 70%)`,
          }}
        />

        {/* Top section: avatar + name + headline */}
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {resume.avatar_url ? (
            <img
              src={resume.avatar_url}
              width={88}
              height={88}
              style={{
                borderRadius: "50%",
                objectFit: "cover",
                border: "3px solid #D4A654",
                boxShadow: "0 0 30px rgba(212,166,84,0.25)",
              }}
            />
          ) : (
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #D4A654, #E8845C)",
                fontSize: 38,
                fontWeight: 700,
                fontFamily: "Playfair",
                color: "#1A0A2E",
                boxShadow: "0 0 30px rgba(212,166,84,0.25)",
              }}
            >
              {initial}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div
              style={{
                fontSize: 42,
                fontWeight: 700,
                fontFamily: "Playfair",
                color: "#F5F0EB",
                lineHeight: 1.1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {resume.name}
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 20,
                color: "rgba(245,240,235,0.75)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {resume.headline}
            </div>
            {resume.location ? (
              <div style={{ marginTop: 4, fontSize: 16, color: "rgba(245,240,235,0.45)" }}>
                {resume.location}
              </div>
            ) : null}
          </div>
        </div>

        {/* Summary */}
        {summary ? (
          <div
            style={{
              marginTop: 36,
              fontSize: 19,
              lineHeight: 1.55,
              color: "rgba(245,240,235,0.58)",
              maxWidth: 900,
            }}
          >
            &ldquo;{summary}&rdquo;
          </div>
        ) : null}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Gold divider */}
        <div
          style={{
            width: "100%",
            height: 1,
            background: "linear-gradient(90deg, #D4A654, rgba(212,166,84,0.15))",
            marginBottom: 28,
          }}
        />

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline", fontSize: 24, fontWeight: 700, fontFamily: "Playfair", color: "#F5F0EB" }}>
            my<span style={{ color: "#D4A654" }}>living</span>page
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 18, color: "rgba(245,240,235,0.5)", fontFamily: "DM Sans" }}>
              mylivingpage.com/<span style={{ color: "#F0D48A" }}>{page.slug}</span>
            </div>
            {/* Theme accent bar */}
            <div
              style={{
                width: 40,
                height: 6,
                borderRadius: 3,
                background: themeColor,
                opacity: 0.8,
              }}
            />
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Playfair", data: playfairFont, weight: 700, style: "normal" },
        { name: "DM Sans", data: dmSansFont, weight: 400, style: "normal" },
      ],
    },
  );
}
