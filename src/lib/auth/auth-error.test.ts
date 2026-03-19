import { describe, expect, it } from "vitest";
import {
  getAuthErrorMessage,
  getCallbackAuthErrorCode,
  getPasswordAuthErrorMessage,
} from "@/lib/auth/auth-error";

describe("auth error helpers", () => {
  it("maps PKCE callback failures to a stable user-facing error code", () => {
    expect(
      getCallbackAuthErrorCode(
        "PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser or device.",
      ),
    ).toBe("google_signin_expired");
  });

  it("returns friendly messages for known callback auth errors", () => {
    expect(getAuthErrorMessage("google_signin_expired")).toContain("same browser tab");
    expect(
      getAuthErrorMessage(
        "PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser or device.",
      ),
    ).toContain("same browser tab");
  });

  it("falls back to the raw message for unknown auth errors", () => {
    expect(getAuthErrorMessage("Something else broke")).toBe("Something else broke");
  });

  it("returns a friendlier message for invalid password sign-in attempts", () => {
    expect(getPasswordAuthErrorMessage("Invalid login credentials")).toContain("continue with Google");
    expect(getPasswordAuthErrorMessage("Something else broke")).toBe("Something else broke");
  });
});
