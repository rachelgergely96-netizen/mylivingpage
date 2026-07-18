import nextEnv from "@next/env";
import pg from "pg";
import { getVerifiedDatabaseClientConfig } from "./database-connection.mjs";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required to verify the analytics schema.");
  process.exit(1);
}

const checks = [
  {
    label: "page_views.engaged_seconds column",
    query: `
      select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'page_views'
          and column_name = 'engaged_seconds'
      ) as ok
    `,
  },
  {
    label: "page_views.max_scroll_depth_pct column",
    query: `
      select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'page_views'
          and column_name = 'max_scroll_depth_pct'
      ) as ok
    `,
  },
  {
    label: "page_views.primary_section column",
    query: `
      select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'page_views'
          and column_name = 'primary_section'
      ) as ok
    `,
  },
  {
    label: "page_views.had_outbound_click column",
    query: `
      select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'page_views'
          and column_name = 'had_outbound_click'
      ) as ok
    `,
  },
  {
    label: "page_interactions table",
    query: `
      select to_regclass('public.page_interactions') is not null as ok
    `,
  },
  {
    label: "page views page_id index",
    query: `
      select exists (
        select 1
        from pg_indexes
        where schemaname = 'public'
          and tablename = 'page_views'
          and indexname = 'idx_page_views_page_id'
      ) as ok
    `,
  },
  {
    label: "page views primary_section index",
    query: `
      select exists (
        select 1
        from pg_indexes
        where schemaname = 'public'
          and tablename = 'page_views'
          and indexname = 'idx_page_views_primary_section'
      ) as ok
    `,
  },
  {
    label: "page_interactions page_id index",
    query: `
      select exists (
        select 1
        from pg_indexes
        where schemaname = 'public'
          and tablename = 'page_interactions'
          and indexname = 'idx_page_interactions_page_id'
      ) as ok
    `,
  },
  {
    label: "page_interactions page_view_id index",
    query: `
      select exists (
        select 1
        from pg_indexes
        where schemaname = 'public'
          and tablename = 'page_interactions'
          and indexname = 'idx_page_interactions_page_view_id'
      ) as ok
    `,
  },
  {
    label: "page_views RLS enabled",
    query: `
      select exists (
        select 1
        from pg_class
        where oid = to_regclass('public.page_views')
          and relrowsecurity
      ) as ok
    `,
  },
  {
    label: "page_interactions RLS enabled",
    query: `
      select exists (
        select 1
        from pg_class
        where oid = to_regclass('public.page_interactions')
          and relrowsecurity
      ) as ok
    `,
  },
  {
    label: "Users read own page views policy",
    query: `
      select exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'page_views'
          and policyname = 'Users read own page views'
      ) as ok
    `,
  },
  {
    label: "Users read own page interactions policy",
    query: `
      select exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'page_interactions'
          and policyname = 'Users read own page interactions'
      ) as ok
    `,
  },
  {
    label: "page_views primary section constraint includes proof",
    query: `
      select exists (
        select 1
        from pg_constraint
        where conname = 'page_views_primary_section_chk'
          and conrelid = to_regclass('public.page_views')
          and pg_get_constraintdef(oid) ilike '%proof%'
      ) as ok
    `,
  },
  {
    label: "page_views primary section constraint includes testimonials",
    query: `
      select exists (
        select 1
        from pg_constraint
        where conname = 'page_views_primary_section_chk'
          and conrelid = to_regclass('public.page_views')
          and pg_get_constraintdef(oid) ilike '%testimonials%'
      ) as ok
    `,
  },
  {
    label: "page_interactions target key constraint includes proof_item",
    query: `
      select exists (
        select 1
        from pg_constraint
        where conname = 'page_interactions_target_key_chk'
          and conrelid = to_regclass('public.page_interactions')
          and pg_get_constraintdef(oid) ilike '%proof_item%'
      ) as ok
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
    console.error("Analytics schema verification failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    console.error(
      "- Apply and verify supabase/migrations/20260313121500_analytics_engagement.sql in the target environment.",
    );
    console.error(
      "- Apply and verify supabase/migrations/20260325153000_proof_and_testimonial_analytics.sql in the target environment.",
    );
    process.exit(1);
  }

  console.log("");
  console.log("Analytics schema verification passed.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Analytics schema verification failed.");
  process.exit(1);
} finally {
  await client.end().catch(() => undefined);
}
