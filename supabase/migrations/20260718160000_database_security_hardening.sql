-- Database boundary hardening
--
-- Public Living Pages are rendered by the application with the server-only
-- service-role client. Browser roles retain only the narrow page columns needed
-- by existing ownership/count and storage-policy checks; resume/profile content
-- is no longer directly selectable from the base table.

-- -----------------------------------------------------------------------------
-- Pages: remove stored source resumes and close the base-table data surface.
-- -----------------------------------------------------------------------------

alter table public.pages disable trigger set_pages_updated_at;
alter table public.pages disable trigger trg_pages_updated_at;

update public.pages
set raw_resume = null
where raw_resume is not null;

-- The single-page migration preserved legacy source text inside archive
-- metadata. Remove that copy as well so the retention boundary covers every
-- known location, not only the current page row.
update public.page_archives
set metadata = metadata - 'duplicate_raw_resume'
where metadata ? 'duplicate_raw_resume';

alter table public.page_archives
  drop constraint if exists page_archives_raw_resume_not_stored_chk;

alter table public.page_archives
  add constraint page_archives_raw_resume_not_stored_chk
  check (not (metadata ? 'duplicate_raw_resume'));

alter table public.pages enable trigger set_pages_updated_at;
alter table public.pages enable trigger trg_pages_updated_at;

alter table public.pages
  drop constraint if exists pages_raw_resume_not_stored_chk;

alter table public.pages
  add constraint pages_raw_resume_not_stored_chk
  check (raw_resume is null or raw_resume = '');

revoke all privileges on table public.pages from public, anon, authenticated;

-- These non-content columns keep authenticated page-count checks and the RLS
-- subqueries used by page-entry/storage policies working. A browser role cannot
-- select resume_data, raw_resume, page_config, title, slug, or any other content.
grant select (id, status, visibility)
on public.pages to anon;
grant select (id, owner_id, user_id, status, visibility)
on public.pages to authenticated;

drop policy if exists pages_select_public on public.pages;
create policy pages_select_public on public.pages
for select to anon, authenticated
using (status = 'live' and visibility = 'public');

drop policy if exists page_entries_select_readable_page on public.page_entries;
drop policy if exists page_entries_select_public_page on public.page_entries;
drop policy if exists page_entries_select_private_page on public.page_entries;

-- Keep the anonymous policy independent of collaborator tables. The anon role
-- intentionally has no page_collaborators grant, so combining these branches
-- in one policy can turn otherwise-public reads into permission errors.
create policy page_entries_select_public_page on public.page_entries
for select to anon, authenticated
using (
  exists (
    select 1
    from public.pages p
    where p.id = page_entries.page_id
      and p.status = 'live'
      and p.visibility = 'public'
  )
);

create policy page_entries_select_private_page on public.page_entries
for select to authenticated
using (
  exists (
    select 1
    from public.pages p
    where p.id = page_entries.page_id
      and (
        p.owner_id = (select auth.uid())
        or exists (
          select 1
          from public.page_collaborators pc
          where pc.page_id = p.id
            and pc.user_id = (select auth.uid())
        )
      )
  )
);

drop policy if exists storage_page_images_select on storage.objects;
drop policy if exists storage_page_images_select_public on storage.objects;
drop policy if exists storage_page_images_select_private on storage.objects;

create policy storage_page_images_select_public on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'page-images'
  and exists (
    select 1
    from public.pages p
    where p.id = public.storage_object_page_id(name)
      and p.status = 'live'
      and p.visibility = 'public'
  )
);

create policy storage_page_images_select_private on storage.objects
for select to authenticated
using (
  bucket_id = 'page-images'
  and exists (
    select 1
    from public.pages p
    where p.id = public.storage_object_page_id(name)
      and (
        p.owner_id = (select auth.uid())
        or exists (
          select 1
          from public.page_collaborators pc
          where pc.page_id = p.id
            and pc.user_id = (select auth.uid())
        )
      )
  )
);

-- -----------------------------------------------------------------------------
-- Server-owned writes: event, waitlist, and archive inserts must pass through
-- rate-limited/validated application routes using the service-role client.
-- -----------------------------------------------------------------------------

drop policy if exists events_insert_service_role on public.events;
revoke all privileges on table public.events from public, anon, authenticated;
grant select on table public.events to authenticated;
grant select, insert on table public.events to service_role;

drop policy if exists "Allow waitlist insert" on public.waitlist;
revoke all privileges on table public.waitlist from public, anon, authenticated;
grant select, insert on table public.waitlist to service_role;

drop policy if exists archives_insert_service on public.page_archives;
drop policy if exists archives_select_owner on public.page_archives;
drop policy if exists archives_delete_owner on public.page_archives;

revoke all privileges on table public.page_archives from public, anon, authenticated;
grant select, delete on table public.page_archives to authenticated;
grant select, insert, delete on table public.page_archives to service_role;

create policy archives_select_owner on public.page_archives
for select to authenticated
using (owner_id = (select auth.uid()));

create policy archives_delete_owner on public.page_archives
for delete to authenticated
using (owner_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Counter RPCs: callers must use the server-only service role. An empty, fixed
-- search_path plus fully-qualified relations prevents object-shadowing attacks.
-- -----------------------------------------------------------------------------

create or replace function public.increment_page_views(page_id uuid)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.pages
  set views = coalesce(public.pages.views, 0) + 1
  where public.pages.id = $1;
$$;

revoke all on function public.increment_page_views(uuid)
from public, anon, authenticated;
grant execute on function public.increment_page_views(uuid) to service_role;

create or replace function public.increment_sign_in_count(uid uuid)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.profiles as profile
  set sign_in_count = coalesce(profile.sign_in_count, 0) + 1,
      last_sign_in_at = auth_user.last_sign_in_at
  from auth.users as auth_user
  where profile.id = $1
    and auth_user.id = $1
    and auth_user.last_sign_in_at is not null
    and (
      profile.last_sign_in_at is null
      or profile.last_sign_in_at < auth_user.last_sign_in_at
    );
$$;

revoke all on function public.increment_sign_in_count(uuid)
from public, anon, authenticated;
grant execute on function public.increment_sign_in_count(uuid) to service_role;

create or replace function public.generate_unique_username(input_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_username text;
  candidate text;
  suffix integer := 0;
  reserved text[] := array[
    'acceptable-use', 'admin', 'api', 'callback', 'cookies', 'create',
    'dashboard', 'delete-account', 'disclaimer', 'dmca', 'examples',
    'forgot-password', 'guides', 'homepage-preview', 'legal', 'login',
    'pricing', 'privacy', 'reset-password', 'security', 'signup', 'terms',
    'theme-review', 'about', 'blog', 'docs', 'help', 'profile', 'settings',
    'support'
  ];
begin
  base_username := pg_catalog.regexp_replace(
    pg_catalog.split_part(pg_catalog.lower(coalesce(input_email, 'member')), '@', 1),
    '[^a-z0-9_-]+',
    '-',
    'g'
  );
  base_username := pg_catalog.btrim(base_username, '-');
  if base_username = '' then
    base_username := 'member';
  end if;
  if base_username = any(reserved) then
    base_username := base_username || '-member';
  end if;

  candidate := base_username;
  while exists(select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := base_username || '-' || suffix::text;
  end loop;

  return candidate;
end;
$$;

-- Trigger-only SECURITY DEFINER functions must not be exposed as REST RPCs.
revoke all on function public.generate_unique_username(text)
from public, anon, authenticated;
revoke all on function public.handle_new_user()
from public, anon, authenticated;

-- Fix every mutable function search_path reported by Supabase's security
-- advisor, plus related trigger/token helpers. Only trusted system/extension
-- schemas are searchable; application relations are schema-qualified.
alter function public.set_updated_at() set search_path = pg_catalog;
alter function public.handle_updated_at() set search_path = pg_catalog;
alter function public.sha256_hex(text) set search_path = pg_catalog, extensions;
alter function public.storage_object_page_id(text) set search_path = pg_catalog;
alter function public.generate_unique_username(text) set search_path = pg_catalog;
alter function public.handle_new_user() set search_path = pg_catalog;
alter function public.enforce_pages_integrity() set search_path = pg_catalog;
alter function public.enforce_page_entries_integrity() set search_path = pg_catalog;
alter function public.prevent_owner_collaborator_row() set search_path = pg_catalog;
alter function public.sync_page_slug_from_profile() set search_path = pg_catalog;
alter function public.rotate_page_share_token(uuid) set search_path = pg_catalog, extensions;
alter function public.revoke_page_share_token(uuid, boolean) set search_path = pg_catalog;
alter function public.get_link_page_with_entries(uuid, text, text) set search_path = pg_catalog;

-- Trigger functions are invoked by their triggers and need no browser-facing
-- EXECUTE grant. Revoking the default PUBLIC grant prevents accidental RPC use.
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_updated_at() from public, anon, authenticated;
revoke all on function public.enforce_pages_integrity() from public, anon, authenticated;
revoke all on function public.enforce_page_entries_integrity() from public, anon, authenticated;
revoke all on function public.prevent_owner_collaborator_row() from public, anon, authenticated;
revoke all on function public.sync_page_slug_from_profile() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Atomic rate limiting: serialize requests for one policy/identifier, count the
-- existing sliding-window events, and write the request/block event in the same
-- transaction. This removes the count-then-insert race in application code.
-- -----------------------------------------------------------------------------

create index if not exists events_rate_limit_lookup_idx
on public.events (
  event_name,
  (metadata ->> 'policy'),
  (metadata ->> 'identifier_hash'),
  created_at desc
)
where event_name = 'security.rate_limit.request';

create or replace function public.enforce_rate_limit(
  p_policy text,
  p_identifier_hash text,
  p_scope text,
  p_route text,
  p_user_id uuid,
  p_max_requests integer,
  p_window_ms integer
)
returns table (
  allowed boolean,
  request_count integer,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_window_start timestamptz;
  v_reset_at timestamptz;
  v_recent_count integer;
  v_metadata jsonb;
begin
  if p_policy is null or p_policy !~ '^[a-z0-9_]{1,80}$' then
    raise exception 'invalid rate-limit policy';
  end if;

  if p_identifier_hash is null or p_identifier_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid rate-limit identifier';
  end if;

  if p_scope is null or p_scope not in ('ip', 'user') then
    raise exception 'invalid rate-limit scope';
  end if;

  if p_route is not null and pg_catalog.char_length(p_route) > 240 then
    raise exception 'invalid rate-limit route';
  end if;

  if p_max_requests is null or p_max_requests < 1 or p_max_requests > 10000 then
    raise exception 'invalid rate-limit maximum';
  end if;

  if p_window_ms is null or p_window_ms < 1000 or p_window_ms > 604800000 then
    raise exception 'invalid rate-limit window';
  end if;

  v_window_start := v_now - (p_window_ms * interval '1 millisecond');
  v_reset_at := v_now + (p_window_ms * interval '1 millisecond');

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_policy || ':' || p_identifier_hash, 0)
  );

  select pg_catalog.count(*)::integer
  into v_recent_count
  from public.events e
  where e.event_name = 'security.rate_limit.request'
    and e.created_at >= v_window_start
    and e.metadata ->> 'policy' = p_policy
    and e.metadata ->> 'identifier_hash' = p_identifier_hash;

  v_metadata := pg_catalog.jsonb_build_object(
    'policy', p_policy,
    'identifier_hash', p_identifier_hash,
    'scope', p_scope,
    'route', p_route,
    'max_requests', p_max_requests,
    'window_ms', p_window_ms,
    'reset_at', v_reset_at
  );

  if v_recent_count >= p_max_requests then
    insert into public.events (user_id, event_name, metadata, created_at)
    values (p_user_id, 'security.rate_limit.blocked', v_metadata, v_now);

    return query
    select false, v_recent_count, 0, v_reset_at;
    return;
  end if;

  insert into public.events (user_id, event_name, metadata, created_at)
  values (p_user_id, 'security.rate_limit.request', v_metadata, v_now);

  return query
  select
    true,
    v_recent_count + 1,
    greatest(0, p_max_requests - v_recent_count - 1),
    v_reset_at;
end;
$$;

revoke all on function public.enforce_rate_limit(
  text, text, text, text, uuid, integer, integer
) from public, anon, authenticated;
grant execute on function public.enforce_rate_limit(
  text, text, text, text, uuid, integer, integer
) to service_role;

-- -----------------------------------------------------------------------------
-- Transactional safety assertions. If a future edit weakens a critical grant,
-- applying this migration fails instead of silently publishing the regression.
-- -----------------------------------------------------------------------------

do $$
begin
  if pg_catalog.has_table_privilege('anon', 'public.pages', 'select')
     or pg_catalog.has_table_privilege('authenticated', 'public.pages', 'select') then
    raise exception 'pages must not have table-level browser SELECT grants';
  end if;

  if pg_catalog.has_column_privilege('anon', 'public.pages', 'resume_data', 'select')
     or pg_catalog.has_column_privilege('authenticated', 'public.pages', 'resume_data', 'select')
     or pg_catalog.has_column_privilege('anon', 'public.pages', 'raw_resume', 'select')
     or pg_catalog.has_column_privilege('authenticated', 'public.pages', 'raw_resume', 'select')
     or pg_catalog.has_column_privilege('anon', 'public.pages', 'page_config', 'select')
     or pg_catalog.has_column_privilege('authenticated', 'public.pages', 'page_config', 'select') then
    raise exception 'browser roles must not select page content columns';
  end if;

  if pg_catalog.has_table_privilege('anon', 'public.events', 'insert')
     or pg_catalog.has_table_privilege('authenticated', 'public.events', 'insert')
     or pg_catalog.has_table_privilege('anon', 'public.waitlist', 'insert')
     or pg_catalog.has_table_privilege('authenticated', 'public.waitlist', 'insert')
     or pg_catalog.has_table_privilege('anon', 'public.page_archives', 'insert')
     or pg_catalog.has_table_privilege('authenticated', 'public.page_archives', 'insert') then
    raise exception 'browser roles must not insert server-owned records';
  end if;

  if pg_catalog.has_function_privilege('anon', 'public.increment_page_views(uuid)', 'execute')
     or pg_catalog.has_function_privilege('authenticated', 'public.increment_page_views(uuid)', 'execute')
     or pg_catalog.has_function_privilege('anon', 'public.increment_sign_in_count(uuid)', 'execute')
     or pg_catalog.has_function_privilege('authenticated', 'public.increment_sign_in_count(uuid)', 'execute')
     or pg_catalog.has_function_privilege(
       'anon',
       'public.enforce_rate_limit(text,text,text,text,uuid,integer,integer)',
       'execute'
     )
     or pg_catalog.has_function_privilege(
       'authenticated',
       'public.enforce_rate_limit(text,text,text,text,uuid,integer,integer)',
       'execute'
     ) then
    raise exception 'privileged RPCs must be service-role-only';
  end if;

  if exists (
    select 1
    from public.pages
    where raw_resume is not null and raw_resume <> ''
  ) then
    raise exception 'raw resume content remains stored';
  end if;

  if exists (
    select 1
    from public.page_archives
    where metadata ? 'duplicate_raw_resume'
  ) then
    raise exception 'archived raw resume content remains stored';
  end if;
end;
$$;
