import { describe, expect, it } from "vitest";
import { assessBotRisk } from "@/lib/bot-risk";

const NOW = new Date("2026-03-17T16:00:00.000Z");

describe("assessBotRisk", () => {
  it("flags reserved-domain timestamp signups as suspicious", () => {
    const result = assessBotRisk(
      {
        email: "signup-1773191243705@example.com",
        fullName: "signup-1773191243705",
        username: "signup-1773191243705",
        createdAt: "2026-03-17T15:30:00.000Z",
        emailConfirmedAt: null,
        signInCount: 0,
        lastSignInAt: null,
      },
      NOW,
    );

    expect(result.botRiskScore).toBe(100);
    expect(result.botDisposition).toBe("suspicious");
    expect(result.botSignals.map((signal) => signal.id)).toEqual([
      "reserved_or_disposable_domain",
      "timestamp_local_part",
    ]);
  });

  it("flags automation keywords and internal-domain usage", () => {
    const result = assessBotRisk(
      {
        email: "playwright-smoke@mylivingpage.com",
        fullName: "Playwright Smoke",
        username: "playwright-smoke",
        createdAt: "2026-03-17T15:30:00.000Z",
        emailConfirmedAt: null,
        signInCount: 0,
        lastSignInAt: null,
      },
      NOW,
    );

    expect(result.botRiskScore).toBe(60);
    expect(result.botDisposition).toBe("suspicious");
    expect(result.botSignals.map((signal) => signal.id)).toEqual([
      "automation_keyword",
      "internal_domain_non_admin",
    ]);
  });

  it("tracks dormant unconfirmed accounts without over-classifying them", () => {
    const result = assessBotRisk(
      {
        email: "person@realmail.com",
        fullName: "Person Example",
        username: "person-example",
        createdAt: "2026-03-15T10:00:00.000Z",
        emailConfirmedAt: null,
        signInCount: 0,
        lastSignInAt: null,
      },
      NOW,
    );

    expect(result.botRiskScore).toBe(30);
    expect(result.botDisposition).toBe("clean");
    expect(result.isUnconfirmedPastGrace).toBe(true);
    expect(result.botSignals.map((signal) => signal.id)).toEqual([
      "unconfirmed_past_grace",
      "zero_signins_past_grace",
    ]);
  });

  it("keeps confirmed email users clean", () => {
    const result = assessBotRisk(
      {
        email: "jane@company.com",
        fullName: "Jane Doe",
        username: "jane-doe",
        createdAt: "2026-03-15T10:00:00.000Z",
        emailConfirmedAt: "2026-03-15T10:03:00.000Z",
        signInCount: 2,
        lastSignInAt: "2026-03-17T14:30:00.000Z",
      },
      NOW,
    );

    expect(result.botRiskScore).toBe(0);
    expect(result.botDisposition).toBe("clean");
    expect(result.botSignals).toEqual([]);
  });

  it("keeps confirmed Google users clean", () => {
    const result = assessBotRisk(
      {
        email: "alex@gmail.com",
        fullName: "Alex Parker",
        username: "alex-parker",
        createdAt: "2026-03-15T10:00:00.000Z",
        emailConfirmedAt: "2026-03-15T10:01:00.000Z",
        signInCount: 1,
        lastSignInAt: "2026-03-17T14:30:00.000Z",
      },
      NOW,
    );

    expect(result.botRiskScore).toBe(0);
    expect(result.botDisposition).toBe("clean");
    expect(result.botSignals).toEqual([]);
  });
});
