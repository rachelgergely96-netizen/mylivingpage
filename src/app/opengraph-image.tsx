import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const maxDuration = 10;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "MyLivingPage — your resume, alive";

export default function OpenGraphImage() {
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
          background: "linear-gradient(135deg, #07111f 0%, #0a1628 48%, #130924 100%)",
          color: "#f0f4ff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 72, fontWeight: 800, letterSpacing: -3 }}>
          my<span style={{ color: "#60a5fa" }}>living</span>page
        </div>
        <div style={{ marginTop: 24, fontSize: 30, color: "rgba(240,244,255,0.72)" }}>
          Your resume, alive.
        </div>
        <div style={{ marginTop: 36, width: 120, height: 4, background: "#60a5fa" }} />
      </div>
    ),
    size,
  );
}
