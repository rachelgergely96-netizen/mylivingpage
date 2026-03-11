import nextEnv from "@next/env";
import pg from "pg";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required to verify the single-page schema.");
  process.exit(1);
}

const checks = [
  {
    label: "unique owner_id index",
    query: `
      select exists (
        select 1
        from pg_indexes
        where schemaname = 'public'
          and tablename = 'pages'
          and indexname = 'pages_owner_id_single_page_uidx'
      ) as ok
    `,
  },
  {
    label: "unique user_id index",
    query: `
      select exists (
        select 1
        from pg_indexes
        where schemaname = 'public'
          and tablename = 'pages'
          and indexname = 'pages_user_id_single_page_uidx'
      ) as ok
    `,
  },
  {
    label: "unique slug index",
    query: `
      select exists (
        select 1
        from pg_indexes
        where schemaname = 'public'
          and tablename = 'pages'
          and indexname = 'pages_slug_single_page_uidx'
      ) as ok
    `,
  },
  {
    label: "owner/user match constraint",
    query: `
      select exists (
        select 1
        from pg_constraint
        where conname = 'pages_user_owner_match_chk'
          and conrelid = 'public.pages'::regclass
      ) as ok
    `,
  },
  {
    label: "pages integrity trigger",
    query: `
      select exists (
        select 1
        from pg_trigger
        where tgname = 'trg_pages_integrity'
          and tgrelid = 'public.pages'::regclass
          and not tgisinternal
      ) as ok
    `,
  },
  {
    label: "profile slug sync trigger",
    query: `
      select exists (
        select 1
        from pg_trigger
        where tgname = 'trg_profiles_sync_page_slug'
          and tgrelid = 'public.profiles'::regclass
          and not tgisinternal
      ) as ok
    `,
  },
];

const duplicateOwnersQuery = `
  select owner_id, count(*)::int as page_count
  from public.pages
  where owner_id is not null
  group by owner_id
  having count(*) > 1
  order by count(*) desc, owner_id asc
  limit 10
`;

const client = new Client({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

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

  const duplicateOwners = await client.query(duplicateOwnersQuery);
  if (duplicateOwners.rows.length > 0) {
    failures.push("duplicate owner_id rows");
    console.log("FAIL duplicate owner_id rows");
    duplicateOwners.rows.forEach((row) => {
      console.log(`  owner_id=${row.owner_id} page_count=${row.page_count}`);
    });
  } else {
    console.log("OK duplicate owner_id rows");
  }

  if (failures.length > 0) {
    console.error("");
    console.error("Single-page schema verification failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log("");
  console.log("Single-page schema verification passed.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Schema verification failed.");
  process.exit(1);
} finally {
  await client.end().catch(() => undefined);
}
