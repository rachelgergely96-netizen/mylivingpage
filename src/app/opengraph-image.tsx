import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "MyLivingPage — turn your résumé into a page you can share";

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

export default async function OGImage() {
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

  const fontFamily = dmSansFont ? "DM Sans" : "sans-serif";

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "linear-gradient(135deg, #060E1C 0%, #0A1628 55%, #0F0519 100%)",
          color: "#F0F4FF",
          display: "flex",
          flexDirection: "column",
          fontFamily,
          height: "100%",
          justifyContent: "center",
          padding: "0 120px",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "baseline",
            display: "flex",
            fontSize: 44,
            fontWeight: 700,
          }}
        >
          my<span style={{ color: "#3B82F6" }}>living</span>page
        </div>
        <div
          style={{
            backgroundColor: "#3B82F6",
            height: 3,
            marginTop: 34,
            width: 72,
          }}
        />
        <div
          style={{
            fontSize: 54,
            fontWeight: 700,
            lineHeight: 1.25,
            marginTop: 34,
            maxWidth: 900,
            textAlign: "center",
          }}
        >
          Turn your résumé into a page you can share
        </div>
        <div
          style={{
            color: "rgba(240,244,255,0.68)",
            fontSize: 24,
            marginTop: 26,
            maxWidth: 900,
            textAlign: "center",
          }}
        >
          Build one living professional page. Shape it for the moment. Share it anywhere.
        </div>
      </div>
    ),
    {
      ...size,
      fonts,
    },
  );
}
