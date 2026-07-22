import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#07111f",
          color: "#f0f4ff",
          fontFamily: "sans-serif",
          fontSize: 96,
          fontWeight: 800,
        }}
      >
        m<span style={{ color: "#60a5fa" }}>l</span>p
      </div>
    ),
    size,
  );
}
