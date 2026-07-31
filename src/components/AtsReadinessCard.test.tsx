import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AtsReadinessCard from "@/components/AtsReadinessCard";
import { DEMO_PAGES } from "@/lib/demo-data";

describe("AtsReadinessCard", () => {
  it("keeps the job comparison visible while clearly defaulting to a general check", () => {
    const markup = renderToStaticMarkup(
      <AtsReadinessCard resumeData={DEMO_PAGES[0].data} />,
    );

    expect(markup).toContain("Check your résumé—and compare one specific job");
    expect(markup).toContain("Job context · Optional");
    expect(markup).toContain("Target job title");
    expect(markup).toContain("Job description");
    expect(markup).toContain("General ATS check");
    expect(markup).toContain("Run general ATS check");
    expect(markup).toContain("Used only for this check and not stored");
    expect(markup).not.toContain("<details");
  });
});
