import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL(
    "../../../supabase/migrations/20260718170000_rate_limit_write_hardening.sql",
    import.meta.url,
  ),
);
const migration = readFileSync(migrationPath, "utf8").toLowerCase();

describe("rate-limit write hardening migration", () => {
  it("uses the oldest active request for the real reset time", () => {
    expect(migration).toContain("pg_catalog.min(e.created_at)");
    expect(migration).toContain("coalesce(v_oldest_request, v_now)");
  });

  it("stores at most one blocked audit row per identifier and window", () => {
    expect(migration).toContain("events_rate_limit_blocked_lookup_idx");
    expect(migration).toContain("if not exists (");
    expect(migration).toContain("e.event_name = 'security.rate_limit.blocked'");
    expect(migration).toContain("e.created_at >= v_window_start");
    expect(migration).toContain("at most one blocked audit row per identifier/window");
  });

  it("preserves atomic serialization and service-role-only execution", () => {
    expect(migration).toContain("pg_catalog.pg_advisory_xact_lock(");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain(
      "text, text, text, text, uuid, integer, integer\n) to service_role",
    );
    expect(migration).toContain("privileged rpcs must remain service-role-only");
  });

  it("removes unused share-token security-definer RPCs from browser roles", () => {
    for (const signature of [
      "rotate_page_share_token(uuid)",
      "revoke_page_share_token(uuid, boolean)",
      "get_link_page_with_entries(uuid, text, text)",
    ]) {
      expect(migration).toContain(
        `revoke all on function public.${signature}\nfrom public, anon, authenticated`,
      );
      expect(migration).toContain(
        `grant execute on function public.${signature} to service_role`,
      );
    }
  });
});
