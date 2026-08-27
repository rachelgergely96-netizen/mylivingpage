import { describe, expect, it } from "vitest";
import {
  buildPasswordRecoveryHref,
  resolvePasswordRecoveryDestination,
} from "@/lib/auth/password-recovery";

describe("password recovery destinations", () => {
  it("preserves a safe deep link through each recovery route", () => {
    const next = "/dashboard/settings?tab=profile#security";

    expect(buildPasswordRecoveryHref("/forgot-password", next)).toBe(
      "/forgot-password?next=%2Fdashboard%2Fsettings%3Ftab%3Dprofile%23security",
    );
    expect(buildPasswordRecoveryHref("/reset-password", next)).toBe(
      "/reset-password?next=%2Fdashboard%2Fsettings%3Ftab%3Dprofile%23security",
    );
    expect(resolvePasswordRecoveryDestination(next)).toBe(next);
  });

  it("keeps the existing bare-route and dashboard defaults", () => {
    expect(buildPasswordRecoveryHref("/forgot-password", null)).toBe(
      "/forgot-password",
    );
    expect(buildPasswordRecoveryHref("/login", "")).toBe("/login");
    expect(resolvePasswordRecoveryDestination(null)).toBe("/dashboard");
  });

  it.each([
    "https://evil.example/steal",
    "//evil.example/steal",
    "/\\evil.example/steal",
    "%2F%2Fevil.example/steal",
    "%252F%252Fevil.example/steal",
  ])("drops an unsafe destination instead of creating an open redirect: %s", (next) => {
    expect(buildPasswordRecoveryHref("/forgot-password", next)).toBe(
      "/forgot-password",
    );
    expect(buildPasswordRecoveryHref("/reset-password", next)).toBe(
      "/reset-password",
    );
    expect(resolvePasswordRecoveryDestination(next)).toBe("/dashboard");
  });
});
