import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { fetchPublicLivePage } from "@/lib/pages/fetchPublicLivePage";
import type { PageRecord } from "@/types/resume";

interface SupabaseScenario {
  profileId?: string;
  publicPage?: PageRecord | null;
  legacyPage?: PageRecord | null;
}

function buildPageRecord(id: string, slug: string): PageRecord {
  return {
    id,
    owner_id: "user-1",
    slug,
    status: "live",
    visibility: "public",
    title: "Page",
    theme_id: "cosmic",
    resume_data: {
      name: "Ray Smith",
      headline: "Builder",
      location: "New York, NY",
      email: "ray@example.com",
      linkedin: null,
      github: null,
      website: null,
      avatar_url: null,
      summary: "Summary",
      experience: [],
      education: [],
      projects: [],
      skills: [],
      certifications: [],
      stats: [],
    },
    raw_resume: null,
    portfolio_url: null,
    page_config: null,
    views: 0,
    published_at: null,
    created_at: "2026-03-10T00:00:00.000Z",
    updated_at: "2026-03-10T00:00:00.000Z",
  };
}

function createSupabaseMock(scenario: SupabaseScenario): SupabaseClient {
  return {
    from(table: string) {
      const filters: Record<string, unknown> = {};

      const chain = {
        select() {
          return chain;
        },
        eq(field: string, value: unknown) {
          filters[field] = value;
          return chain;
        },
        order() {
          return chain;
        },
        limit() {
          return chain;
        },
        async maybeSingle() {
          if (table === "profiles") {
            return { data: scenario.profileId ? { id: scenario.profileId } : null, error: null };
          }

          if (table === "pages" && filters.owner_id === scenario.profileId && filters.visibility === "public") {
            return { data: scenario.publicPage ?? null, error: null };
          }

          if (table === "pages" && filters.user_id === scenario.profileId && filters.status === "live") {
            return { data: scenario.legacyPage ?? null, error: null };
          }

          return { data: null, error: null };
        },
      };

      return chain;
    },
  } as unknown as SupabaseClient;
}

describe("fetchPublicLivePage", () => {
  it("returns null for empty usernames", async () => {
    const supabase = createSupabaseMock({});
    await expect(fetchPublicLivePage(supabase, "")).resolves.toBeNull();
  });

  it("returns null when the username does not map to a profile", async () => {
    const supabase = createSupabaseMock({});
    await expect(fetchPublicLivePage(supabase, "missing-user")).resolves.toBeNull();
  });

  it("returns the current public page when one exists", async () => {
    const publicPage = buildPageRecord("page-1", "ray");
    const supabase = createSupabaseMock({
      profileId: "user-1",
      publicPage,
      legacyPage: buildPageRecord("legacy-1", "legacy-ray"),
    });

    await expect(fetchPublicLivePage(supabase, "ray")).resolves.toEqual(publicPage);
  });

  it("falls back to the legacy live page when no owner-based public page exists", async () => {
    const legacyPage = buildPageRecord("legacy-1", "legacy-ray");
    const supabase = createSupabaseMock({
      profileId: "user-1",
      publicPage: null,
      legacyPage,
    });

    await expect(fetchPublicLivePage(supabase, "ray")).resolves.toEqual(legacyPage);
  });
});
