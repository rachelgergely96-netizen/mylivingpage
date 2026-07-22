import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import EditorReadinessBriefing, {
  getReadinessSection,
} from "@/components/edit/EditorReadinessBriefing";
import type { DecisionReadinessState } from "@/types/resume";

const NEEDS_ATTENTION: DecisionReadinessState = {
  overallStatus: "needs_attention",
  readyCount: 1,
  totalChecks: 2,
  summary: "One check needs attention.",
  checks: [
    {
      id: "target_role",
      title: "Target role is clear",
      status: "ready",
      detail: "The role is clear.",
    },
    {
      id: "quantified_proof",
      title: "Proof includes real outcomes",
      status: "needs_attention",
      detail: "Add one concrete outcome.",
    },
  ],
  suggestions: [],
  lastEvaluatedAt: "2026-07-22T00:00:00.000Z",
};

describe("EditorReadinessBriefing", () => {
  it("routes the next readiness gap to its editor section", () => {
    const markup = renderToStaticMarkup(
      <EditorReadinessBriefing readiness={NEEDS_ATTENTION} />,
    );

    expect(markup).toContain("Next signal");
    expect(markup).toContain("Proof includes real outcomes");
    expect(markup).toContain('href="#editor-section-stats"');
    expect(markup).toContain("Improve Impact");
    expect(markup).toContain(
      'aria-label="1 of 2 decision-readiness checks are strong"',
    );
  });

  it("keeps every readiness check mapped to a stable editor stop", () => {
    expect(getReadinessSection("target_role")).toEqual({
      href: "#editor-section-profile",
      label: "Profile",
    });
    expect(getReadinessSection("mobile_readability")).toEqual({
      href: "#editor-section-summary",
      label: "Intro",
    });
  });
});
