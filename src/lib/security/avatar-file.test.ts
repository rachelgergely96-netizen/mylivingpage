import { describe, expect, it } from "vitest";
import { detectAvatarMimeType } from "@/lib/security/avatar-file";

describe("detectAvatarMimeType", () => {
  it("recognizes supported image signatures", () => {
    expect(detectAvatarMimeType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(
      "image/jpeg",
    );
    expect(
      detectAvatarMimeType(
        Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe("image/png");
    expect(
      detectAvatarMimeType(
        Uint8Array.from([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]),
      ),
    ).toBe("image/webp");
  });

  it("rejects HTML and SVG content even when a client could claim an image MIME type", () => {
    expect(detectAvatarMimeType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(detectAvatarMimeType(new TextEncoder().encode("<!doctype html>"))).toBeNull();
  });
});
