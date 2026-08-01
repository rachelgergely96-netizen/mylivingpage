import { describe, expect, it } from "vitest";
import {
  getAuthErrorMessage,
  getCallbackAuthErrorCode,
  getPasswordAuthErrorMessage,
  getProviderCallbackErrorCode,
} from "@/lib/auth/auth-error";

describe("auth error helpers", () => {
  it("maps PKCE callback failures to a provider-neutral error code", () => {
    expect(
      getCallbackAuthErrorCode(
        "PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser or device.",
      ),
    ).toBe("signin_expired");
    expect(getCallbackAuthErrorCode("Something else broke")).toBe("signin_failed");
  });

  it("maps provider error params from code-less callbacks", () => {
    expect(
      getProviderCallbackErrorCode({ error: "access_denied", errorCode: "otp_expired" }),
    ).toBe("confirm_link_expired");
    expect(
      getProviderCallbackErrorCode({ error: "access_denied", errorCode: null }),
    ).toBe("signin_cancelled");
    expect(
      getProviderCallbackErrorCode({ error: "server_error", errorCode: null }),
    ).toBe("signin_failed");
    expect(getProviderCallbackErrorCode({ error: null, errorCode: null })).toBeNull();
  });

  it("returns friendly messages for known callback auth errors", () => {
    expect(getAuthErrorMessage("signin_expired")).toContain("expired before it finished");
    expect(getAuthErrorMessage("confirm_link_expired")).toContain("confirmation link has expired");
    expect(getAuthErrorMessage("signin_cancelled")).toContain("cancelled");
    expect(
      getAuthErrorMessage(
        "PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser or device.",
      ),
    ).toContain("expired before it finished");
  });

  it("still accepts the legacy Google-branded error codes", () => {
    expect(getAuthErrorMessage("google_signin_expired")).toContain("same browser tab");
    expect(getAuthErrorMessage("google_signin_failed")).toContain("Google sign-in");
  });

  it("never echoes unknown error values and falls back to a generic message", () => {
    expect(getAuthErrorMessage("Your account is suspended. Call 1-800-555-0199.")).toBe(
      "Sign-in could not be completed. Please try again.",
    );
    expect(getAuthErrorMessage("Something else broke")).toBe(
      "Sign-in could not be completed. Please try again.",
    );
  });

  it("returns a friendlier message for invalid password sign-in attempts", () => {
    expect(getPasswordAuthErrorMessage("Invalid login credentials")).toContain("continue with Google");
    expect(getPasswordAuthErrorMessage("Something else broke")).toBe("Something else broke");
  });
});
