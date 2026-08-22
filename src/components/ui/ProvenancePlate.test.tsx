import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ProvenancePlate from "@/components/ui/ProvenancePlate";

describe("ProvenancePlate", () => {
  it("renders a named, sharp evidence surface without authored motion", () => {
    const markup = renderToStaticMarkup(
      <ProvenancePlate
        title="Evidence boundary"
        headingLevel="h3"
        items={[
          { label: "Source", value: "Reviewed information" },
          { label: "Scope", value: "This page only" },
        ]}
      />,
    );

    expect(markup).toContain('data-provenance-plate="true"');
    expect(markup).toContain('aria-label="Evidence boundary"');
    expect(markup).toContain("<h3");
    expect(markup).toContain("Reviewed information");
    expect(markup).not.toContain("data-motion-event");
    expect(markup).not.toContain("rounded-");
  });
});
