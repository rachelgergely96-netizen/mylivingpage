import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { ShareCardArtwork } from "@/components/ShareCardArtwork";
import { fetchPublicLivePage } from "@/lib/pages/fetchPublicLivePage";
import {
  buildShareCardModel,
  getShareCardVisual,
  normalizeAppUrl,
} from "@/lib/share-card";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const revalidate = 60;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "MyLivingPage share card";

interface OgImageProps {
  params: Promise<{ username: string }>;
}

interface OgFont {
  data: ArrayBuffer;
  name: "DM Sans";
  style: "normal";
  weight: 400 | 700;
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

function createPublicPageClient() {
  const url = getSupabaseUrl();
  const secretKey = getSupabaseSecretKey();
  if (!url || !secretKey) {
    return null;
  }

  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function renderFallbackCard(fonts: OgFont[], dmSansLoaded: boolean) {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "linear-gradient(135deg, #0A1628 0%, #0F0519 100%)",
          color: "#F0F4FF",
          display: "flex",
          flexDirection: "column",
          fontFamily: dmSansLoaded ? "DM Sans" : "sans-serif",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "baseline",
            display: "flex",
            fontSize: 48,
            fontWeight: 700,
          }}
        >
          my<span style={{ color: "#3B82F6" }}>living</span>page
        </div>
        <div
          style={{
            color: "rgba(240,244,255,0.68)",
            fontFamily: dmSansLoaded ? "DM Sans" : "sans-serif",
            fontSize: 22,
            marginTop: 18,
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
  const dmSansFont = await fetchFont(
    "https://fonts.gstatic.com/s/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAopxhTg.ttf",
  );
  const fonts: OgFont[] = [];

  if (dmSansFont) {
    fonts.push(
      {
        data: dmSansFont,
        name: "DM Sans",
        style: "normal",
        weight: 400,
      },
      {
        data: dmSansFont.slice(0),
        name: "DM Sans",
        style: "normal",
        weight: 700,
      },
    );
  }

  // A social crawler should still receive a usable branded image when the
  // page store is temporarily unavailable. The interactive route surfaces the
  // failure through its retry boundary instead of misreporting a 404.
  const page = await fetchPublicLivePage(
    createPublicPageClient,
    username,
  ).catch(() => null);
  if (!page) {
    return renderFallbackCard(fonts, Boolean(dmSansFont));
  }

  const appUrl = normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL);
  const visual = getShareCardVisual(page.theme_id);
  const model = buildShareCardModel({
    appUrl,
    resume: page.resume_data,
    slug: page.slug,
  });
  const bodyFontFamily = dmSansFont ? "DM Sans" : "sans-serif";

  return new ImageResponse(
    (
      <ShareCardArtwork
        bodyFontFamily={bodyFontFamily}
        finish="holographic"
        model={model}
        visual={visual}
      />
    ),
    {
      ...size,
      fonts,
    },
  );
}
