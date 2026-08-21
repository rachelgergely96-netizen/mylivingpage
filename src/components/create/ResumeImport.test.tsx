import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ResumeImport from "@/components/create/ResumeImport";

describe("ResumeImport", () => {
  it("presents upload and paste options with the privacy boundary", () => {
    const markup = renderToStaticMarkup(
      <ResumeImport hasExistingData={false} onImported={vi.fn()} />,
    );

    expect(markup).toContain("Start with your résumé");
    expect(markup).toContain("Choose a résumé");
    expect(markup).toContain("Paste résumé text");
    expect(markup).toContain("PDF, DOCX, TXT, or MD");
    expect(markup).toContain("up to 3.5 MB");
    expect(markup).toContain("not sent to an AI provider");
    expect(markup).toContain("Autofill my page");
    expect(markup).not.toContain("data-motion-event");
  });

  it("warns before replacing fields already in the draft", () => {
    const markup = renderToStaticMarkup(
      <ResumeImport hasExistingData onImported={vi.fn()} />,
    );

    expect(markup).toContain(
      "Importing another résumé will replace the fields currently in this draft.",
    );
  });
});
