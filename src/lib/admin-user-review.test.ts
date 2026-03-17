import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";
import {
  buildAdminUserRows,
  summarizeAdminUserRisk,
  type AdminPageStatsRow,
  type AdminProfileRow,
} from "@/lib/admin-user-review";

const NOW = new Date("2026-03-17T16:00:00.000Z");

function makeAuthUser(input: Partial<User> & Pick<User, "id" | "created_at">): User {
  const {
    id,
    created_at,
    app_metadata,
    user_metadata,
    updated_at,
    ...rest
  } = input;

  return {
    id,
    aud: "authenticated",
    app_metadata: app_metadata ?? {},
    user_metadata: user_metadata ?? {},
    created_at,
    role: "authenticated",
    updated_at: updated_at ?? created_at,
    ...rest,
  };
}

describe("buildAdminUserRows", () => {
  it("merges auth users into admin rows and classifies suspicious accounts", () => {
    const profiles: AdminProfileRow[] = [
      {
        id: "user-bot",
        username: "signup-1773191243705",
        full_name: "signup-1773191243705",
        email: "signup-1773191243705@example.com",
        avatar_url: null,
        plan: "spark",
        created_at: "2026-03-16T10:00:00.000Z",
        auth_provider: "email",
        last_sign_in_at: null,
        sign_in_count: 0,
        signup_referrer: "landing_apply_nav",
      },
      {
        id: "user-real",
        username: "jane-doe",
        full_name: "Jane Doe",
        email: "jane@company.com",
        avatar_url: null,
        plan: "pro",
        created_at: "2026-03-10T10:00:00.000Z",
        auth_provider: "google",
        last_sign_in_at: "2026-03-17T09:00:00.000Z",
        sign_in_count: 3,
        signup_referrer: "pricing_nav",
      },
    ];

    const authUsers = [
      makeAuthUser({
        id: "user-bot",
        email: "signup-1773191243705@example.com",
        created_at: "2026-03-16T10:00:00.000Z",
      }),
      makeAuthUser({
        id: "user-real",
        email: "jane@company.com",
        created_at: "2026-03-10T10:00:00.000Z",
        email_confirmed_at: "2026-03-10T10:01:00.000Z",
        last_sign_in_at: "2026-03-17T09:00:00.000Z",
      }),
    ];

    const pages: AdminPageStatsRow[] = [
      { owner_id: "user-real", user_id: "user-real", views: 12 },
      { owner_id: "user-real", user_id: "user-real", views: 8 },
    ];

    const users = buildAdminUserRows({
      profiles,
      authUsers,
      pages,
      now: NOW,
    });

    expect(users[0]).toMatchObject({
      id: "user-bot",
      emailConfirmedAt: null,
      botDisposition: "suspicious",
      botRiskScore: 130,
      pageCount: 0,
      totalViews: 0,
    });
    expect(users[0].botSignals.map((signal) => signal.id)).toEqual([
      "reserved_or_disposable_domain",
      "timestamp_local_part",
      "unconfirmed_past_grace",
      "zero_signins_past_grace",
    ]);

    expect(users[1]).toMatchObject({
      id: "user-real",
      emailConfirmedAt: "2026-03-10T10:01:00.000Z",
      botDisposition: "clean",
      botRiskScore: 0,
      pageCount: 2,
      totalViews: 20,
    });
  });

  it("summarizes suspicious and unconfirmed counts for admin ops", () => {
    const profiles: AdminProfileRow[] = [
      {
        id: "user-bot",
        username: "signup-1773191243705",
        full_name: "signup-1773191243705",
        email: "signup-1773191243705@example.com",
        avatar_url: null,
        plan: "spark",
        created_at: "2026-03-16T10:00:00.000Z",
        auth_provider: "email",
        last_sign_in_at: null,
        sign_in_count: 0,
        signup_referrer: null,
      },
      {
        id: "user-dormant",
        username: "new-person",
        full_name: "New Person",
        email: "new@realmail.com",
        avatar_url: null,
        plan: "spark",
        created_at: "2026-03-14T10:00:00.000Z",
        auth_provider: "email",
        last_sign_in_at: null,
        sign_in_count: 0,
        signup_referrer: null,
      },
    ];

    const authUsers = [
      makeAuthUser({
        id: "user-bot",
        email: "signup-1773191243705@example.com",
        created_at: "2026-03-16T10:00:00.000Z",
      }),
      makeAuthUser({
        id: "user-dormant",
        email: "new@realmail.com",
        created_at: "2026-03-14T10:00:00.000Z",
      }),
    ];

    const users = buildAdminUserRows({
      profiles,
      authUsers,
      pages: [],
      now: NOW,
    });
    const summary = summarizeAdminUserRisk(users, NOW);

    expect(summary).toEqual({
      suspiciousSignupsLast7Days: 1,
      suspiciousTotal: 1,
      watchTotal: 0,
      unconfirmedTotal: 2,
      unconfirmedPastGrace: 2,
    });
  });
});
