import { describe, expect, it } from "vitest";
import { getFriendlyAuthErrorMessage } from "./auth-errors";

const FALLBACK = "Something went wrong. Please try again.";

describe("getFriendlyAuthErrorMessage", () => {
  it("returns the fallback for empty or missing input", () => {
    expect(getFriendlyAuthErrorMessage(null, FALLBACK)).toBe(FALLBACK);
    expect(getFriendlyAuthErrorMessage(undefined, FALLBACK)).toBe(FALLBACK);
    expect(getFriendlyAuthErrorMessage("   ", FALLBACK)).toBe(FALLBACK);
  });

  it("maps duplicate-account errors", () => {
    expect(getFriendlyAuthErrorMessage("User already registered", FALLBACK)).toBe(
      "An account with this email already exists. Sign in instead.",
    );
  });

  it("maps weak-password errors", () => {
    expect(
      getFriendlyAuthErrorMessage("Password should be at least 6 characters.", FALLBACK),
    ).toBe("That password is too weak. Use at least eight characters.");
  });

  it("maps rate-limit errors", () => {
    expect(
      getFriendlyAuthErrorMessage(
        "For security purposes, you can only request this after 60 seconds.",
        FALLBACK,
      ),
    ).toBe("Too many attempts. Wait a minute and try again.");
    expect(getFriendlyAuthErrorMessage("Email rate limit exceeded", FALLBACK)).toBe(
      "Too many attempts. Wait a minute and try again.",
    );
  });

  it("maps invalid-credential errors", () => {
    expect(getFriendlyAuthErrorMessage("Invalid login credentials", FALLBACK)).toBe(
      "We couldn't match that email and password. If you usually use Google, continue with Google instead.",
    );
  });

  it("maps expired-link errors", () => {
    expect(
      getFriendlyAuthErrorMessage("Email link is invalid or has expired", FALLBACK),
    ).toBe("This link has expired. Request a new one and try again.");
  });

  it("falls back for unknown messages instead of echoing raw API text", () => {
    expect(getFriendlyAuthErrorMessage("Database error saving new user", FALLBACK)).toBe(
      FALLBACK,
    );
  });
});
