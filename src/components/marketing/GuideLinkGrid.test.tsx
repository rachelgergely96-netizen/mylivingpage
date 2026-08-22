import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import GuideLinkGrid from "@/components/marketing/GuideLinkGrid";

describe("GuideLinkGrid", () => {
  it("expresses the three guides as one static decision path", () => {
    const markup = renderToStaticMarkup(
      <GuideLinkGrid
        eyebrow="Start here"
        title="Three decisions"
        description="Use them in order."
      />,
    );

    expect(markup).toContain("data-guide-decision-path");
    expect(markup).toContain("Résumé PDF");
    expect(markup).toContain("Recruiter language");
    expect(markup).toContain("Living Page");
    const pathMarkup = markup.slice(markup.indexOf("<ol"));
    expect(pathMarkup.indexOf("01 / Résumé PDF")).toBeLessThan(
      pathMarkup.indexOf("02 / Recruiter language"),
    );
    expect(pathMarkup.indexOf("02 / Recruiter language")).toBeLessThan(
      pathMarkup.indexOf("03 / Living Page"),
    );
    expect(markup).not.toContain("data-motion-event");
  });
});
