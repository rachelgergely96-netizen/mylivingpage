import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = readFileSync(fileURLToPath(new URL(
  "../../../supabase/migrations/20260720193000_analytics_retention_and_abuse_indexes.sql",
  import.meta.url,
)), "utf8").toLowerCase();

describe("analytics retention migration", () => {
  it("adds the view-deduplication and chronological indexes", () => {
    expect(migration).toContain("page_views_page_viewer_viewed_idx");
    expect(migration).toContain("page_views_page_viewed_idx");
    expect(migration).toContain("events_created_at_idx");
  });

  it("keeps pruning service-role-only", () => {
    expect(migration).toContain("create or replace function public.prune_expired_operational_data");
    expect(migration).toContain("revoke all on function public.prune_expired_operational_data");
    expect(migration).toContain("grant execute on function public.prune_expired_operational_data(interval, interval, interval) to service_role");
  });
});
