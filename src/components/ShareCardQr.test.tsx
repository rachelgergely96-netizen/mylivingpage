import React from "react";
import { ImageResponse } from "next/og";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ShareCardQr } from "@/components/ShareCardQr";

const MATRIX = [
  [true, false],
  [false, true],
];

describe("ShareCardQr", () => {
  it("renders deterministic square modules with a four-module quiet zone", () => {
    const render = () =>
      renderToStaticMarkup(
        <ShareCardQr
          matrix={MATRIX}
          size={160}
          borderColor="#445566"
          title="QR code for Rachel's Living Page"
        />,
      );

    const firstMarkup = render();
    const secondMarkup = render();

    expect(firstMarkup).toBe(secondMarkup);
    expect(firstMarkup).toContain('data-share-card-qr-state="ready"');
    expect(firstMarkup).toContain('viewBox="0 0 10 10"');
    expect(firstMarkup).toContain(
      'd="M4 4h1v1h-1zM5 5h1v1h-1z"',
    );
    expect(firstMarkup).toContain('fill="#0A1628"');
    expect(firstMarkup).toContain('border:1px solid #445566');
    expect(firstMarkup).toContain(
      'aria-label="QR code for Rachel&#x27;s Living Page"',
    );
    expect(firstMarkup).not.toContain("rx=");
    expect(firstMarkup).not.toContain("border-radius");
  });

  it("renders a stable empty plate for an unavailable or malformed matrix", () => {
    const unavailableMarkup = renderToStaticMarkup(
      <ShareCardQr matrix={null} size={92} />,
    );
    const malformedMarkup = renderToStaticMarkup(
      <ShareCardQr matrix={[[true, false], [true]]} size={92} />,
    );

    for (const markup of [unavailableMarkup, malformedMarkup]) {
      expect(markup).toContain('data-share-card-qr-state="empty"');
      expect(markup).toContain('aria-hidden="true"');
      expect(markup).toContain('fill="#FFFFFF"');
      expect(markup).not.toContain("<path");
    }
  });

  it("renders through the Open Graph image engine", async () => {
    const response = new ImageResponse(
      (
        <div
          style={{
            alignItems: "center",
            background: "#07111C",
            display: "flex",
            height: "100%",
            justifyContent: "center",
            width: "100%",
          }}
        >
          <ShareCardQr
            matrix={MATRIX}
            size={112}
            borderColor="#75C7D4"
          />
        </div>
      ),
      { height: 160, width: 240 },
    );

    expect(response.headers.get("content-type")).toBe("image/png");
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(500);
  });
});
