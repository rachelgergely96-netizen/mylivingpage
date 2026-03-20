import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  fetchProfileWithHostingAccess,
  isMissingHostingAccessSchemaError,
} from "@/lib/profile-access";

function createProfileSupabaseMock(options: {
  fullResult: { data: Record<string, unknown> | null; error: PostgrestError | null };
  legacyResult?: { data: Record<string, unknown> | null; error: PostgrestError | null };
}) {
  const selects: string[] = [];

  const supabase = {
    from(table: string) {
      if (table !== "profiles") {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select(select: string) {
          selects.push(select);
          return {
            eq() {
              return {
                maybeSingle: vi.fn().mockResolvedValue(
                  selects.length === 1 ? options.fullResult : options.legacyResult,
                ),
                single: vi.fn().mockResolvedValue(
                  selects.length === 1 ? options.fullResult : options.legacyResult,
                ),
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;

  return { supabase, selects };
}

describe("profile access helpers", () => {
  it("detects missing hosting schema errors", () => {
    expect(
      isMissingHostingAccessSchemaError({
        code: "PGRST204",
        message:
          "Could not find the 'billing_cohort' column of 'profiles' in the schema cache",
        details: "",
        hint: "",
      }),
    ).toBe(true);
  });

  it("falls back to the legacy profile shape when the hosting columns are unavailable", async () => {
    const { supabase, selects } = createProfileSupabaseMock({
      fullResult: {
        data: null,
        error: {
          code: "PGRST204",
          message:
            "Could not find the 'billing_cohort' column of 'profiles' in the schema cache",
          details: "",
          hint: "",
          name: "PostgrestError",
        },
      },
      legacyResult: {
        data: {
          id: "user-1",
          username: "rachel",
          plan: "spark",
        },
        error: null,
      },
    });

    const result = await fetchProfileWithHostingAccess<{
      id: string;
      username: string;
      plan: string | null;
    }>({
      supabase,
      select: "id, username, plan",
      matchField: "id",
      matchValue: "user-1",
    });

    expect(result.schema).toBe("legacy_fallback");
    expect(selects).toEqual([
      "id, username, plan, billing_cohort, hosting_trial_started_at",
      "id, username, plan",
    ]);
    expect(result.data).toEqual({
      id: "user-1",
      username: "rachel",
      plan: "spark",
      billing_cohort: null,
      hosting_trial_started_at: null,
    });
  });
});
