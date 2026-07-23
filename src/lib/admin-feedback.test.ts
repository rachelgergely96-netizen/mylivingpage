import { describe, expect, it } from "vitest";
import {
  buildAdminFeedbackItems,
  countFeedbackByType,
  normalizeFeedbackType,
} from "@/lib/admin-feedback";

describe("admin feedback formatting", () => {
  it("joins sender details and normalizes event metadata", () => {
    const items = buildAdminFeedbackItems({
      events: [
        {
          id: "feedback-1",
          user_id: "user-1",
          metadata: {
            message: "  The preview is hard to close.  ",
            type: "bug",
            page: " /dashboard/edit/page-1 ",
          },
          created_at: "2026-07-23T12:00:00.000Z",
        },
      ],
      profiles: [
        {
          id: "user-1",
          username: "avery",
          full_name: "Avery Sample",
          email: "avery@example.com",
        },
      ],
    });

    expect(items).toEqual([
      {
        id: "feedback-1",
        userId: "user-1",
        message: "The preview is hard to close.",
        type: "bug",
        page: "/dashboard/edit/page-1",
        createdAt: "2026-07-23T12:00:00.000Z",
        sender: {
          displayName: "Avery Sample",
          username: "avery",
          email: "avery@example.com",
        },
      },
    ]);
  });

  it("uses safe fallbacks for malformed or deleted-user event data", () => {
    const [item] = buildAdminFeedbackItems({
      events: [
        {
          id: "feedback-2",
          user_id: null,
          metadata: { message: 42, type: "unknown", page: null },
          created_at: "2026-07-23T12:00:00.000Z",
        },
      ],
      profiles: [],
    });

    expect(item.message).toBe("(No message)");
    expect(item.type).toBe("general");
    expect(item.page).toBeNull();
    expect(item.sender.displayName).toBe("Unknown user");
  });

  it("normalizes blank sender details and rejects unsafe historical page paths", () => {
    const [item] = buildAdminFeedbackItems({
      events: [
        {
          id: "feedback-unsafe-page",
          user_id: "user-blank-profile",
          metadata: {
            message: "Please open this",
            page: "//attacker.example/phishing",
          },
          created_at: "2026-07-23T12:00:00.000Z",
        },
      ],
      profiles: [
        {
          id: "user-blank-profile",
          username: "  ",
          full_name: "",
          email: " user@example.com ",
        },
      ],
    });

    expect(item.page).toBeNull();
    expect(item.sender).toEqual({
      displayName: "user@example.com",
      username: null,
      email: "user@example.com",
    });
  });

  it("counts the plain-language feedback categories", () => {
    const items = buildAdminFeedbackItems({
      events: [
        {
          id: "1",
          user_id: null,
          metadata: { message: "A", type: "bug" },
          created_at: "2026-07-23T12:00:00.000Z",
        },
        {
          id: "2",
          user_id: null,
          metadata: { message: "B", type: "feature" },
          created_at: "2026-07-23T12:00:00.000Z",
        },
        {
          id: "3",
          user_id: null,
          metadata: { message: "C", type: "other" },
          created_at: "2026-07-23T12:00:00.000Z",
        },
      ],
      profiles: [],
    });

    expect(countFeedbackByType(items)).toEqual({
      bug: 1,
      feature: 1,
      general: 1,
    });
    expect(normalizeFeedbackType("feature")).toBe("feature");
  });
});
