import { describe, expect, it } from "vitest";
import { getDashboardPrimaryAction } from "@/components/dashboard/DashboardSignalDesk";

describe("getDashboardPrimaryAction", () => {
  it("prioritizes publishing whenever the public page is unavailable", () => {
    expect(getDashboardPrimaryAction("active", false)).toEqual({
      kind: "publish",
      label: "Publish page",
    });
  });

  it("turns pre-view proof states into a direct sharing action", () => {
    expect(getDashboardPrimaryAction("ready_to_share", true)).toEqual({
      kind: "copy",
      label: "Copy live link",
    });
    expect(getDashboardPrimaryAction("awaiting_views", true)).toEqual({
      kind: "copy",
      label: "Copy link again",
    });
  });

  it("routes landed and active proof to analytics", () => {
    for (const status of ["proof_landed", "active"] as const) {
      expect(getDashboardPrimaryAction(status, true)).toEqual({
        kind: "analytics",
        label: "Read the signal",
      });
    }
  });
});
