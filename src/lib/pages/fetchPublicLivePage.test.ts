import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  fetchPublicLivePage,
} from "@/lib/pages/fetchPublicLivePage";
import type { PageRecord } from "@/types/resume";

interface SupabaseScenario {
  profile?: {
    id: string;
    plan?: string | null;
    billing_cohort?: string | null;
    hosting_trial_started_at?: string | null;
  } | null;
  publicPage?: PageRecord | null;
  legacyPage?: PageRecord | null;
  onPageUpdate?: (values: Record<string, unknown>) => void;
}

function buildPageRecord(id: string, slug: string): PageRecord {
  return {
    id,
    owner_id: "user-1",
    user_id: "user-1",
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

      if (table === "pages") {
        return {
          select() {
            return this;
          },
          eq(field: string, value: unknown) {
            filters[field] = value;
            return this;
          },
          order() {
            return this;
          },
          limit() {
            return this;
          },
          update(values: Record<string, unknown>) {
            scenario.onPageUpdate?.(values);
            return {
              eq: vi.fn().mockResolvedValue({
                error: null,
              }),
            };
          },
          async maybeSingle() {
            if (
              filters.owner_id === scenario.profile?.id &&
              filters.visibility === "public"
            ) {
              return { data: scenario.publicPage ?? null, error: null };
            }

            if (
              filters.user_id === scenario.profile?.id &&
              filters.status === "live"
            ) {
              return { data: scenario.legacyPage ?? null, error: null };
            }

            return { data: null, error: null };
          },
        };
      }

      if (table === "profiles") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          async maybeSingle() {
            return { data: scenario.profile ?? null, error: null };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
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
      profile: {
        id: "user-1",
        plan: "spark",
        billing_cohort: "legacy_freemium",
      },
      publicPage,
      legacyPage: buildPageRecord("legacy-1", "legacy-ray"),
    });

    await expect(fetchPublicLivePage(supabase, "ray")).resolves.toEqual(publicPage);
  });

  it("falls back to the legacy live page when no owner-based public page exists", async () => {
    const legacyPage = buildPageRecord("legacy-1", "legacy-ray");
    const supabase = createSupabaseMock({
      profile: {
        id: "user-1",
        plan: "spark",
        billing_cohort: "legacy_freemium",
      },
      publicPage: null,
      legacyPage,
    });

    await expect(fetchPublicLivePage(supabase, "ray")).resolves.toEqual(legacyPage);
  });

  it("returns null and unpublishes expired new-cohort pages", async () => {
    const updates = vi.fn();
    const supabase = createSupabaseMock({
      profile: {
        id: "user-1",
        plan: "spark",
        billing_cohort: "trial_hosting_v1",
        hosting_trial_started_at: "2026-01-01T00:00:00.000Z",
      },
      publicPage: buildPageRecord("page-1", "ray"),
      onPageUpdate: updates,
    });

    await expect(fetchPublicLivePage(supabase, "ray")).resolves.toBeNull();
    expect(updates).toHaveBeenCalledWith({
      status: "draft",
      visibility: "private",
    });
  });
});
