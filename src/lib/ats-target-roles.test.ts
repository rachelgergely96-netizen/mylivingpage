import { describe, expect, it } from "vitest";
import {
  EMPTY_ATS_TARGETING,
  MAX_SAVED_TARGET_ROLES,
  createTargetRole,
  getActiveTargetRole,
  removeTargetRole,
  sanitizeAtsTargeting,
  selectTargetRole,
  upsertTargetRole,
} from "@/lib/ats-target-roles";

function roleFixture(title: string) {
  return createTargetRole({ title, jobDescription: `${title} description` });
}

describe("sanitizeAtsTargeting", () => {
  it("returns the empty shape for anything unrecognisable", () => {
    expect(sanitizeAtsTargeting(null)).toEqual(EMPTY_ATS_TARGETING);
    expect(sanitizeAtsTargeting("nope")).toEqual(EMPTY_ATS_TARGETING);
    expect(sanitizeAtsTargeting([])).toEqual(EMPTY_ATS_TARGETING);
  });

  it("keeps the job description from the legacy single-role snapshot", () => {
    const result = sanitizeAtsTargeting({
      targeting: {
        primaryTitle: "Staff Engineer",
        jobDescription: "Build and operate distributed systems.",
      },
      score: { overall: 80 },
      candidateResumeData: { name: "dropped" },
    });

    expect(result.savedRoles).toHaveLength(1);
    expect(result.savedRoles[0]).toMatchObject({
      title: "Staff Engineer",
      jobDescription: "Build and operate distributed systems.",
    });
    expect(result.activeRoleId).toBe(result.savedRoles[0].id);
  });

  it("drops legacy snapshots that never had a role", () => {
    expect(
      sanitizeAtsTargeting({ targeting: { primaryTitle: "", jobDescription: "" } })
        .savedRoles,
    ).toEqual([]);
  });

  it("discards roles with neither a title nor a description", () => {
    const result = sanitizeAtsTargeting({
      savedRoles: [
        { id: "a", title: "", jobDescription: "", savedAt: "2026-01-01T00:00:00.000Z" },
        { id: "b", title: "Designer", jobDescription: "", savedAt: "2026-01-01T00:00:00.000Z" },
      ],
    });

    expect(result.savedRoles.map((role) => role.id)).toEqual(["b"]);
  });

  it("repairs an activeRoleId that points at nothing", () => {
    const result = sanitizeAtsTargeting({
      savedRoles: [
        { id: "a", title: "Designer", jobDescription: "", savedAt: "2026-01-01T00:00:00.000Z" },
      ],
      activeRoleId: "missing",
    });

    expect(result.activeRoleId).toBe("a");
  });

  it("caps the stored roles", () => {
    const result = sanitizeAtsTargeting({
      savedRoles: Array.from({ length: MAX_SAVED_TARGET_ROLES + 4 }, (_, index) => ({
        id: `role-${index}`,
        title: `Role ${index}`,
        jobDescription: "text",
        savedAt: "2026-01-01T00:00:00.000Z",
      })),
    });

    expect(result.savedRoles).toHaveLength(MAX_SAVED_TARGET_ROLES);
  });
});

describe("role list operations", () => {
  it("adds a new role at the front and makes it active", () => {
    const first = roleFixture("First");
    const second = roleFixture("Second");

    const withFirst = upsertTargetRole(EMPTY_ATS_TARGETING, first);
    const withSecond = upsertTargetRole(withFirst, second);

    expect(withSecond.savedRoles.map((role) => role.title)).toEqual([
      "Second",
      "First",
    ]);
    expect(withSecond.activeRoleId).toBe(second.id);
  });

  it("updates in place rather than duplicating an existing role", () => {
    const role = roleFixture("Engineer");
    const saved = upsertTargetRole(EMPTY_ATS_TARGETING, role);
    const edited = upsertTargetRole(saved, { ...role, title: "Senior Engineer" });

    expect(edited.savedRoles).toHaveLength(1);
    expect(edited.savedRoles[0].title).toBe("Senior Engineer");
  });

  it("moves the active selection when the active role is removed", () => {
    const first = roleFixture("First");
    const second = roleFixture("Second");
    const saved = upsertTargetRole(upsertTargetRole(EMPTY_ATS_TARGETING, first), second);

    const afterRemoval = removeTargetRole(saved, second.id);

    expect(afterRemoval.activeRoleId).toBe(first.id);
    expect(getActiveTargetRole(afterRemoval)?.title).toBe("First");
  });

  it("clears the active selection when the last role goes", () => {
    const only = roleFixture("Only");
    const saved = upsertTargetRole(EMPTY_ATS_TARGETING, only);

    expect(removeTargetRole(saved, only.id).activeRoleId).toBeNull();
  });

  it("ignores a selection that names an unknown role", () => {
    const role = roleFixture("Known");
    const saved = upsertTargetRole(EMPTY_ATS_TARGETING, role);

    expect(selectTargetRole(saved, "unknown").activeRoleId).toBe(role.id);
  });

  it("allows clearing the selection back to the base résumé", () => {
    const role = roleFixture("Known");
    const saved = upsertTargetRole(EMPTY_ATS_TARGETING, role);

    expect(selectTargetRole(saved, null).activeRoleId).toBeNull();
  });
});
