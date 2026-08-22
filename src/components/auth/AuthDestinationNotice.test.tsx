import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AuthDestinationNotice, {
  getAuthDestinationLabel,
} from "@/components/auth/AuthDestinationNotice";

describe("AuthDestinationNotice", () => {
  it("turns sanitized internal destinations into clear continuity copy", () => {
    expect(getAuthDestinationLabel("/create?ref=homepage")).toBe(
      "Build your Living Page",
    );
    expect(getAuthDestinationLabel("/dashboard/analytics/page-id")).toBe(
      "Your dashboard",
    );
  });

  it("does not echo an unknown path or its query values", () => {
    const markup = renderToStaticMarkup(
      <AuthDestinationNotice
        action="signin"
        path="/somewhere?email=person@example.com"
      />,
    );

    expect(markup).toContain("Destination kept");
    expect(markup).toContain("The MyLivingPage screen you requested");
    expect(markup).not.toContain("person@example.com");
  });

  it("renders nothing when the URL did not carry a safe destination", () => {
    expect(
      renderToStaticMarkup(
        <AuthDestinationNotice action="verify" path={null} />,
      ),
    ).toBe("");
  });
});
