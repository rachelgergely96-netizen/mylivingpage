import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import AuthShell from "@/components/auth/AuthShell";
import { getLegalSiteConfig } from "@/lib/legal/site-config";

vi.mock("@/components/privacy/CookieSettingsButton", () => ({
  default: () => (
    <button type="button">Cookie settings</button>
  ),
}));

describe("AuthShell", () => {
  it("shows a static three-step account trust rail for MyLivingPage", () => {
    const markup = renderToStaticMarkup(
      <AuthShell site={getLegalSiteConfig("mylivingpage")}>
        <main id="main-content">Auth form</main>
      </AuthShell>,
    );

    expect(markup).toContain("data-auth-progress");
    expect(markup).toContain("Account");
    expect(markup).toContain("Verify");
    expect(markup).toContain("Return / build");
    expect(markup).not.toContain("animate-");
  });
});
