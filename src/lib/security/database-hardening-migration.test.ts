import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL(
    "../../../supabase/migrations/20260718160000_database_security_hardening.sql",
    import.meta.url,
  ),
);
const migration = readFileSync(migrationPath, "utf8").toLowerCase();

describe("database security hardening migration", () => {
  it("removes stored source resumes and prevents content-bearing replacements", () => {
    expect(migration).toContain("set raw_resume = null");
    expect(migration).toContain("metadata = metadata - 'duplicate_raw_resume'");
    expect(migration).toContain("pages_raw_resume_not_stored_chk");
    expect(migration).toContain("page_archives_raw_resume_not_stored_chk");
    expect(migration).toContain("check (raw_resume is null or raw_resume = '')");
  });

  it("replaces broad page grants with non-content column access", () => {
    expect(migration).toContain(
      "revoke all privileges on table public.pages from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant select (id, status, visibility)\non public.pages to anon",
    );
    expect(migration).toContain(
      "grant select (id, owner_id, user_id, status, visibility)\non public.pages to authenticated",
    );

    const pageGrants = migration.matchAll(
      /grant select \(([^)]+)\)\s+on public\.pages to (?:anon|authenticated)/g,
    );
    for (const pageGrant of pageGrants) {
      expect(pageGrant[1]).not.toMatch(/resume_data|raw_resume|page_config|title|slug/);
    }
  });

  it("requires coherent live/public state in every anonymous content policy", () => {
    expect(migration.match(/(?:p\.)?status = 'live'\s+and (?:p\.)?visibility = 'public'/g)?.length)
      .toBeGreaterThanOrEqual(3);
    expect(migration).toContain("create policy page_entries_select_public_page");
    expect(migration).toContain("create policy storage_page_images_select_public");
    expect(migration).toContain(
      "create policy page_entries_select_private_page on public.page_entries\nfor select to authenticated",
    );
  });

  it("removes direct browser inserts for server-owned records", () => {
    expect(migration).toContain("drop policy if exists events_insert_service_role");
    expect(migration).toContain('drop policy if exists "allow waitlist insert"');
    expect(migration).toContain("drop policy if exists archives_insert_service");
    expect(migration).toContain(
      "revoke all privileges on table public.events from public, anon, authenticated",
    );
    expect(migration).toContain(
      "revoke all privileges on table public.waitlist from public, anon, authenticated",
    );
  });

  it("makes privileged counters service-role-only with fixed search paths", () => {
    for (const signature of ["increment_page_views(uuid)", "increment_sign_in_count(uuid)"]) {
      expect(migration).toContain(
        `revoke all on function public.${signature}\nfrom public, anon, authenticated`,
      );
      expect(migration).toContain(
        `grant execute on function public.${signature} to service_role`,
      );
    }

    expect(migration.match(/set search_path = ''/g)?.length).toBeGreaterThanOrEqual(3);
    expect(migration).toContain("from auth.users as auth_user");
    expect(migration).toContain(
      "profile.last_sign_in_at < auth_user.last_sign_in_at",
    );
  });

  it("defines an atomic service-role rate-limit RPC", () => {
    expect(migration).toContain("create or replace function public.enforce_rate_limit(");
    expect(migration).toContain("pg_catalog.pg_advisory_xact_lock(");
    expect(migration).toContain("events_rate_limit_lookup_idx");
    expect(migration).toContain(
      "text, text, text, text, uuid, integer, integer\n) to service_role",
    );
  });

  it("keeps generated usernames away from top-level application routes", () => {
    for (const reserved of ["examples", "guides", "homepage-preview", "theme-review"]) {
      expect(migration).toContain(`'${reserved}'`);
    }
    expect(migration).toContain("base_username := base_username || '-member'");
  });

  it("fails migration application if a critical negative privilege regresses", () => {
    expect(migration).toContain("pg_catalog.has_table_privilege('anon', 'public.pages', 'select')");
    expect(migration).toContain(
      "pg_catalog.has_column_privilege('authenticated', 'public.pages', 'resume_data', 'select')",
    );
    expect(migration).toContain(
      "pg_catalog.has_function_privilege('anon', 'public.increment_page_views(uuid)', 'execute')",
    );
  });
});
