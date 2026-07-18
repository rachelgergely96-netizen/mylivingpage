import { describe, expect, it } from "vitest";
import {
  isReservedUsernameSlug,
  normalizeUsernameSlug,
  slugifyUsername,
  usernameFromEmail,
  validateUsernameSlug,
} from "@/lib/usernames";

describe("username helpers", () => {
  it("normalizes user input without falling back to member", () => {
    expect(normalizeUsernameSlug("  Jane Doe  ")).toBe("jane-doe");
    expect(normalizeUsernameSlug(".__Jane__." )).toBe("jane");
  });

  it("reserves every top-level product and marketing route", () => {
    for (const slug of ["examples", "guides", "homepage-preview", "theme-review"]) {
      expect(isReservedUsernameSlug(slug)).toBe(true);
    }
    expect(isReservedUsernameSlug("avery-morgan")).toBe(false);
    expect(usernameFromEmail("guides@example.com")).toBe("guides-member");
  });

  it("treats blank usernames as invalid", () => {
    expect(validateUsernameSlug("   ")).toEqual({
      slug: "",
      error: "URL is required.",
    });
  });

  it("enforces the minimum length after normalization", () => {
    expect(validateUsernameSlug("a!")).toEqual({
      slug: "a",
      error: "URL must be at least 3 characters.",
    });
  });

  it("allows valid usernames with supported characters", () => {
    expect(validateUsernameSlug("Jane_Doe.dev")).toEqual({
      slug: "jane_doe.dev",
      error: null,
    });
  });

  it("keeps fallback generation separate from validation", () => {
    expect(slugifyUsername("")).toBe("member");
    expect(usernameFromEmail("Founder+Jobs@example.com")).toBe("founder-jobs");
  });
});
