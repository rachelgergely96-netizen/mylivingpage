import { describe, expect, it } from "vitest";
import {
  buildShareScenarioMessage,
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

  it("returns the human label for a recorded scenario", () => {
    expect(getShareScenarioLabel("recruiter_reply")).toBe("Reply to a recruiter");
    expect(getShareScenarioLabel(null)).toBeNull();
  });
});
