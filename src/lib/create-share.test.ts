import { describe, expect, it } from "vitest";
import {
  buildShareScenarioMessage,
  buildTrackedSharePath,
  getShareScenarioLabel,
  SHARE_SCENARIO_OPTIONS,
} from "@/lib/create-share";

describe("create-share helpers", () => {
  it("exposes the three fixed activation scenarios", () => {
    expect(SHARE_SCENARIO_OPTIONS.map((option) => option.id)).toEqual([
      "application_follow_up",
      "recruiter_reply",
      "connection",
    ]);
  });

  it("builds a lightweight share message for each scenario", () => {
    expect(
      buildShareScenarioMessage(
        "application_follow_up",
        "https://www.mylivingpage.com/rachel",
      ),
    ).toContain("cleaner version of my background");
    expect(
      buildShareScenarioMessage(
        "recruiter_reply",
        "https://www.mylivingpage.com/rachel",
      ),
    ).toContain("cleaner view of my background");
    expect(
      buildShareScenarioMessage("connection", "https://www.mylivingpage.com/rachel"),
    ).toContain("easier to scan");
  });

  it("builds tracked share paths for targeted versions", () => {
    expect(
      buildTrackedSharePath("/rachel", "recruiter_reply", {
        variant: {
          id: "variant-1",
          slug: "staff-pm",
          label: "Staff PM version",
          roleTitle: "Staff Product Manager",
          headline: null,
          summary: null,
          featuredStatLabels: [],
          featuredProjectNames: [],
          sectionOrder: [
            "summary",
            "stats",
            "experience",
            "projects",
            "skills",
            "education",
            "certifications",
          ],
          ctaEmphasis: null,
        },
        shareLinkId: "share-1",
      }),
    ).toBe("/rachel?v=variant-1&s=recruiter_reply&sl=share-1");
  });

  it("returns the human label for a recorded scenario", () => {
    expect(getShareScenarioLabel("recruiter_reply")).toBe("Reply to a recruiter");
    expect(getShareScenarioLabel(null)).toBeNull();
  });
});
