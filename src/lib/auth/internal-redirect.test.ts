import { describe, expect, it } from "vitest";
import { sanitizeInternalRedirectPath } from "@/lib/auth/internal-redirect";

describe("sanitizeInternalRedirectPath", () => {
  it.each([
    ["/dashboard", "/dashboard"],
    ["/create?ref=homepage#review", "/create?ref=homepage#review"],
    ["/guides/resume-pdf-check", "/guides/resume-pdf-check"],
  ])("keeps a valid internal destination", (value, expected) => {
    expect(sanitizeInternalRedirectPath(value)).toBe(expected);
  });

  it.each([
    null,
    "",
    "https://evil.example/steal",
    "//evil.example/steal",
    "/\\evil.example/steal",
    "/%5Cevil.example/steal",
    "%2F%2Fevil.example/steal",
    "%252F%252Fevil.example/steal",
    "/dashboard%0A@evil.example",
    "/dashboard\\evil",
    "/%E0%A4%A",
  ])("rejects an unsafe destination: %s", (value) => {
    expect(sanitizeInternalRedirectPath(value, "/create")).toBe("/create");
  });
});
