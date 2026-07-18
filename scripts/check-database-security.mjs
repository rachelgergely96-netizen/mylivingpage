import nextEnv from "@next/env";
import pg from "pg";
import { getVerifiedDatabaseClientConfig } from "./database-connection.mjs";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required to verify database security.");
  process.exit(1);
}

const checks = [
  {
    label: "browser roles lack table-level pages SELECT",
    query: `
      select not has_table_privilege('anon', 'public.pages', 'select')
         and not has_table_privilege('authenticated', 'public.pages', 'select') as ok
    `,
  },
  {
    label: "browser roles cannot select page content columns",
    query: `
      select not has_column_privilege('anon', 'public.pages', 'resume_data', 'select')
         and not has_column_privilege('authenticated', 'public.pages', 'resume_data', 'select')
         and not has_column_privilege('anon', 'public.pages', 'raw_resume', 'select')
         and not has_column_privilege('authenticated', 'public.pages', 'raw_resume', 'select')
         and not has_column_privilege('anon', 'public.pages', 'page_config', 'select')
         and not has_column_privilege('authenticated', 'public.pages', 'page_config', 'select') as ok
    `,
  },
  {
    label: "safe page policy columns remain available",
    query: `
      select has_column_privilege('anon', 'public.pages', 'id', 'select')
         and has_column_privilege('anon', 'public.pages', 'status', 'select')
         and has_column_privilege('anon', 'public.pages', 'visibility', 'select')
         and not has_column_privilege('anon', 'public.pages', 'owner_id', 'select')
         and has_column_privilege('authenticated', 'public.pages', 'user_id', 'select') as ok
    `,
  },
  {
    label: "public entry and image policies require coherent live/public state",
    query: `
      select count(*) = 3 as ok
      from pg_policies
      where (schemaname, tablename, policyname) in (
        ('public', 'pages', 'pages_select_public'),
        ('public', 'page_entries', 'page_entries_select_public_page'),
        ('storage', 'objects', 'storage_page_images_select_public')
      )
        and lower(qual) like '%status%live%'
        and lower(qual) like '%visibility%public%'
    `,
  },
  {
    label: "browser roles cannot insert server-owned records",
    query: `
      select not has_table_privilege('anon', 'public.events', 'insert')
         and not has_table_privilege('authenticated', 'public.events', 'insert')
         and not has_table_privilege('anon', 'public.waitlist', 'insert')
         and not has_table_privilege('authenticated', 'public.waitlist', 'insert')
         and not has_table_privilege('anon', 'public.page_archives', 'insert')
         and not has_table_privilege('authenticated', 'public.page_archives', 'insert') as ok
    `,
  },
  {
    label: "service role can read and write events",
    query: `
      select has_table_privilege('service_role', 'public.events', 'select')
         and has_table_privilege('service_role', 'public.events', 'insert') as ok
    `,
  },
  {
    label: "permissive insert policies are absent",
    query: `
      select not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and (
            (tablename = 'events' and policyname = 'events_insert_service_role')
            or (tablename = 'waitlist' and policyname = 'Allow waitlist insert')
            or (tablename = 'page_archives' and policyname = 'archives_insert_service')
          )
      ) as ok
    `,
  },
  {
    label: "privileged RPCs are service-role-only",
    query: `
      select not has_function_privilege('anon', 'public.increment_page_views(uuid)', 'execute')
         and not has_function_privilege('authenticated', 'public.increment_page_views(uuid)', 'execute')
         and has_function_privilege('service_role', 'public.increment_page_views(uuid)', 'execute')
         and not has_function_privilege('anon', 'public.increment_sign_in_count(uuid)', 'execute')
         and not has_function_privilege('authenticated', 'public.increment_sign_in_count(uuid)', 'execute')
         and has_function_privilege('service_role', 'public.increment_sign_in_count(uuid)', 'execute')
         and not has_function_privilege(
           'anon',
           'public.enforce_rate_limit(text,text,text,text,uuid,integer,integer)',
           'execute'
         )
         and not has_function_privilege(
           'authenticated',
           'public.enforce_rate_limit(text,text,text,text,uuid,integer,integer)',
           'execute'
         )
         and has_function_privilege(
           'service_role',
           'public.enforce_rate_limit(text,text,text,text,uuid,integer,integer)',
           'execute'
         )
         and not has_function_privilege(
           'anon',
           'public.rotate_page_share_token(uuid)',
           'execute'
         )
         and not has_function_privilege(
           'authenticated',
           'public.rotate_page_share_token(uuid)',
           'execute'
         )
         and has_function_privilege(
           'service_role',
           'public.rotate_page_share_token(uuid)',
           'execute'
         )
         and not has_function_privilege(
           'anon',
           'public.revoke_page_share_token(uuid,boolean)',
           'execute'
         )
         and not has_function_privilege(
           'authenticated',
           'public.revoke_page_share_token(uuid,boolean)',
           'execute'
         )
         and has_function_privilege(
           'service_role',
           'public.revoke_page_share_token(uuid,boolean)',
           'execute'
         )
         and not has_function_privilege(
           'anon',
           'public.get_link_page_with_entries(uuid,text,text)',
           'execute'
         )
         and not has_function_privilege(
           'authenticated',
           'public.get_link_page_with_entries(uuid,text,text)',
           'execute'
         )
         and has_function_privilege(
           'service_role',
           'public.get_link_page_with_entries(uuid,text,text)',
           'execute'
         ) as ok
    `,
  },
  {
    label: "source resume storage is empty and constrained",
    query: `
      select not exists (
        select 1 from public.pages where raw_resume is not null and raw_resume <> ''
      )
      and not exists (
        select 1
        from public.page_archives
        where metadata ? 'duplicate_raw_resume'
      )
      and exists (
        select 1
        from pg_constraint
        where conname = 'pages_raw_resume_not_stored_chk'
          and conrelid = 'public.pages'::regclass
      )
      and exists (
        select 1
        from pg_constraint
        where conname = 'page_archives_raw_resume_not_stored_chk'
          and conrelid = 'public.page_archives'::regclass
      ) as ok
    `,
  },
  {
    label: "rate-limit lookup index exists",
    query: `
      select exists (
        select 1
        from pg_indexes
        where schemaname = 'public'
          and tablename = 'events'
          and indexname = 'events_rate_limit_lookup_idx'
      ) as ok
    `,
  },
  {
    label: "blocked rate-limit logging is bounded and indexed",
    query: `
      select exists (
        select 1
        from pg_indexes
        where schemaname = 'public'
          and tablename = 'events'
          and indexname = 'events_rate_limit_blocked_lookup_idx'
      )
      and lower(
        pg_get_functiondef(
          'public.enforce_rate_limit(text,text,text,text,uuid,integer,integer)'::regprocedure
        )
      ) like '%pg_catalog.min(e.created_at)%'
      and lower(
        pg_get_functiondef(
          'public.enforce_rate_limit(text,text,text,text,uuid,integer,integer)'::regprocedure
        )
      ) like '%if not exists%security.rate_limit.blocked%' as ok
    `,
  },
  {
    label: "reported mutable search paths are fixed",
    query: `
      with expected(signature) as (
        values
          ('public.set_updated_at()'),
          ('public.handle_updated_at()'),
          ('public.sha256_hex(text)'),
          ('public.storage_object_page_id(text)'),
          ('public.increment_page_views(uuid)'),
          ('public.increment_sign_in_count(uuid)'),
          ('public.generate_unique_username(text)'),
          ('public.handle_new_user()'),
          ('public.enforce_pages_integrity()'),
          ('public.enforce_page_entries_integrity()'),
          ('public.prevent_owner_collaborator_row()'),
          ('public.sync_page_slug_from_profile()'),
          ('public.rotate_page_share_token(uuid)'),
          ('public.revoke_page_share_token(uuid,boolean)'),
          ('public.get_link_page_with_entries(uuid,text,text)'),
          ('public.enforce_rate_limit(text,text,text,text,uuid,integer,integer)')
      )
      select bool_and(
        to_regprocedure(signature) is not null
        and exists (
          select 1
          from pg_proc p
          cross join lateral unnest(coalesce(p.proconfig, array[]::text[])) setting
          where p.oid = to_regprocedure(signature)
            and setting in (
              'search_path=""',
              'search_path=pg_catalog',
              'search_path=pg_catalog, extensions'
            )
        )
      ) as ok
      from expected
    `,
  },
];

const client = new Client(getVerifiedDatabaseClientConfig(databaseUrl));

try {
  await client.connect();
  const failures = [];

  for (const check of checks) {
    const result = await client.query(check.query);
    const ok = Boolean(result.rows[0]?.ok);
    console.log(`${ok ? "OK" : "FAIL"} ${check.label}`);
    if (!ok) {
      failures.push(check.label);
    }
  }

  if (failures.length > 0) {
    console.error("");
    console.error("Database security verification failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    console.error(
      "- Apply and verify the 20260718160000 database hardening and 20260718170000 rate-limit hardening migrations in the target environment.",
    );
    process.exit(1);
  }

  console.log("");
  console.log("Database security verification passed.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Database security verification failed.");
  process.exit(1);
} finally {
  await client.end().catch(() => undefined);
}
