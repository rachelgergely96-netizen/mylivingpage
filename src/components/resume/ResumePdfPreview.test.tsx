import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ResumePdfPreview from "@/components/resume/ResumePdfPreview";
import { DEMO_PAGES } from "@/lib/demo-data";

describe("ResumePdfPreview", () => {
  it("starts idle without a ready event or embedded PDF", () => {
    const markup = renderToStaticMarkup(
      <ResumePdfPreview resumeData={DEMO_PAGES[0].data} />,
    );

    expect(markup).toContain("data-resume-pdf-preview");
    expect(markup).toContain("Show the PDF");
    expect(markup).not.toContain("resume.pdf.preview.ready");
    expect(markup).not.toContain('type="application/pdf"');
    expect(markup).not.toContain("data-motion-target=");
  });
});
