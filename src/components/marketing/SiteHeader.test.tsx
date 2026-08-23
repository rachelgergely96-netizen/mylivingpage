import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SiteHeader from "@/components/marketing/SiteHeader";

describe("SiteHeader", () => {
  it("renders the mobile navigation as a nonmodal disclosure", () => {
    const markup = renderToStaticMarkup(
      <SiteHeader
        cta={{ href: "/signup", label: "Start free" }}
        links={[
          { href: "/examples", label: "Examples" },
          { href: "/guides", label: "Guides" },
        ]}
      />,
    );

    expect(markup).toContain('aria-label="Open navigation"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain("aria-controls=");
    expect(markup).toContain("data-site-desktop-navigation");
    expect(markup).not.toContain('role="dialog"');
    expect(markup).not.toContain('aria-modal="true"');
  });
});
