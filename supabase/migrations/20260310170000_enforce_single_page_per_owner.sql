-- Enforce the v1 product model: one living page per owner account.
-- This migration preserves legacy duplicate pages as archives before removing them.

alter table public.page_archives
  add column if not exists source_page_id uuid;

alter table public.page_archives
  add column if not exists archive_reason text not null default 'edit';

alter table public.page_archives
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_page_archives_source_page_id on public.page_archives(source_page_id);
create index if not exists idx_page_archives_archive_reason on public.page_archives(archive_reason);
create unique index if not exists page_archives_single_page_migration_uidx
  on public.page_archives(source_page_id, archive_reason)
  where source_page_id is not null and archive_reason = 'single_page_migration';

update public.pages
set owner_id = coalesce(owner_id, user_id),
    user_id = coalesce(user_id, owner_id)
where owner_id is distinct from coalesce(owner_id, user_id)
   or user_id is distinct from coalesce(user_id, owner_id);

update public.pages p
set slug = profiles.username
from public.profiles
where profiles.id = coalesce(p.owner_id, p.user_id)
  and profiles.username is not null
  and btrim(profiles.username) <> ''
  and p.slug is distinct from profiles.username;

drop table if exists tmp_page_owner_dedup_map;
create temporary table tmp_page_owner_dedup_map
on commit drop
as
with ranked_pages as (
  select
    p.id,
    p.owner_id,
    row_number() over (
      partition by p.owner_id
      order by
        case when p.visibility = 'public' or p.status = 'live' then 0 else 1 end asc,
        p.published_at desc nulls last,
        p.updated_at desc nulls last,
        p.created_at desc nulls last,
        p.id desc
    ) as row_num
  from public.pages p
),
canonical_pages as (
  select owner_id, id as canonical_page_id
  from ranked_pages
  where row_num = 1
)
select
  ranked_pages.id as duplicate_page_id,
  ranked_pages.owner_id,
  canonical_pages.canonical_page_id
from ranked_pages
join canonical_pages on canonical_pages.owner_id = ranked_pages.owner_id
where ranked_pages.row_num > 1;

insert into public.page_archives (
  page_id,
  source_page_id,
  owner_id,
  resume_data,
  theme_id,
  slug,
  archive_reason,
  metadata,
  archived_at
)
select
  dedup.canonical_page_id,
  duplicate_page.id,
  duplicate_page.owner_id,
  duplicate_page.resume_data,
  duplicate_page.theme_id,
  duplicate_page.slug,
  'single_page_migration',
  jsonb_build_object(
    'duplicate_page_id', duplicate_page.id,
    'duplicate_title', duplicate_page.title,
    'duplicate_visibility', duplicate_page.visibility,
    'duplicate_status', duplicate_page.status,
    'duplicate_raw_resume', duplicate_page.raw_resume,
    'duplicate_page_config', coalesce(duplicate_page.page_config, '{}'::jsonb),
    'duplicate_views', coalesce(duplicate_page.views, 0),
    'migrated_to_page_id', dedup.canonical_page_id
  ),
  coalesce(duplicate_page.updated_at, duplicate_page.created_at, now())
from tmp_page_owner_dedup_map dedup
join public.pages duplicate_page on duplicate_page.id = dedup.duplicate_page_id
where not exists (
  select 1
  from public.page_archives archives
  where archives.source_page_id = duplicate_page.id
    and archives.archive_reason = 'single_page_migration'
);

insert into public.page_collaborators (page_id, user_id, role, created_at)
select
  dedup.canonical_page_id,
  collaborators.user_id,
  case
    when bool_or(collaborators.role = 'editor'::public.collaborator_role)
      then 'editor'::public.collaborator_role
    else 'viewer'::public.collaborator_role
  end,
  min(collaborators.created_at)
from tmp_page_owner_dedup_map dedup
join public.page_collaborators collaborators on collaborators.page_id = dedup.duplicate_page_id
group by dedup.canonical_page_id, collaborators.user_id
on conflict (page_id, user_id)
do update
set role = case
  when excluded.role = 'editor'::public.collaborator_role
    or public.page_collaborators.role = 'editor'::public.collaborator_role
      then 'editor'::public.collaborator_role
  else 'viewer'::public.collaborator_role
end;

update public.page_entries page_entries
set page_id = dedup.canonical_page_id
from tmp_page_owner_dedup_map dedup
where page_entries.page_id = dedup.duplicate_page_id;

update public.page_views page_views
set page_id = dedup.canonical_page_id
from tmp_page_owner_dedup_map dedup
where page_views.page_id = dedup.duplicate_page_id;

update public.access_logs access_logs
set page_id = dedup.canonical_page_id
from tmp_page_owner_dedup_map dedup
where access_logs.page_id = dedup.duplicate_page_id;

update public.pages canonical_page
set views = coalesce(canonical_page.views, 0) + duplicate_views.total_duplicate_views
from (
  select
    dedup.canonical_page_id,
    sum(coalesce(duplicate_page.views, 0))::integer as total_duplicate_views
  from tmp_page_owner_dedup_map dedup
  join public.pages duplicate_page on duplicate_page.id = dedup.duplicate_page_id
  group by dedup.canonical_page_id
) duplicate_views
where canonical_page.id = duplicate_views.canonical_page_id
  and duplicate_views.total_duplicate_views > 0;

delete from public.pages pages
using tmp_page_owner_dedup_map dedup
where pages.id = dedup.duplicate_page_id;

alter table public.pages
  drop constraint if exists pages_user_id_slug_key;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pages_user_owner_match_chk'
      and conrelid = 'public.pages'::regclass
  ) then
    alter table public.pages
      add constraint pages_user_owner_match_chk
      check (user_id is null or user_id = owner_id);
  end if;
end $$;

create unique index if not exists pages_owner_id_single_page_uidx on public.pages(owner_id);
create unique index if not exists pages_user_id_single_page_uidx
  on public.pages(user_id)
  where user_id is not null;
create unique index if not exists pages_slug_single_page_uidx on public.pages(slug);

create or replace function public.enforce_pages_integrity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_profile_username text;
begin
  if new.owner_id is null and new.user_id is not null then
    new.owner_id := new.user_id;
  end if;

  if new.user_id is null and new.owner_id is not null then
    new.user_id := new.owner_id;
  end if;

  if new.owner_id is not null and new.user_id is not null and new.owner_id <> new.user_id then
    raise exception 'user_id must match owner_id';
  end if;

  if new.owner_id is not null then
    select username
    into v_profile_username
    from public.profiles
    where id = new.owner_id;

    if v_profile_username is not null and btrim(v_profile_username) <> '' then
      new.slug := v_profile_username;
    end if;
  end if;

  if new.share_token_hash is not null then
    new.share_token_hash := lower(new.share_token_hash);
    if new.share_token_hash !~ '^[a-f0-9]{64}$' then
      raise exception 'share_token_hash must be lowercase sha256 hex';
    end if;
  end if;

  if tg_op = 'insert' then
    if current_user not in ('postgres', 'supabase_admin') and coalesce(auth.role(), '') <> 'service_role' then
      if auth.uid() is null then
        raise exception 'authentication required';
      end if;
      if new.owner_id is null then
        new.owner_id := auth.uid();
      end if;
      if new.user_id is null then
        new.user_id := new.owner_id;
      end if;
      if new.owner_id <> auth.uid() or new.user_id <> auth.uid() then
        raise exception 'owner_id and user_id must match auth.uid()';
      end if;
    end if;
  elsif tg_op = 'update' then
    if (new.owner_id <> old.owner_id or new.user_id is distinct from old.user_id)
       and current_user not in ('postgres', 'supabase_admin')
       and coalesce(auth.role(), '') <> 'service_role' then
      raise exception 'owner_id and user_id are immutable';
    end if;
  end if;

  if new.visibility = 'link' and new.share_token_hash is null then
    raise exception 'link visibility requires share_token_hash';
  end if;

  return new;
end;
$$;

create or replace function public.sync_page_slug_from_profile()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.username is null or btrim(new.username) = '' then
    return new;
  end if;

  update public.pages
  set slug = new.username,
      owner_id = new.id,
      user_id = new.id
  where owner_id = new.id
     or user_id = new.id;

  return new;
end;
$$;

drop trigger if exists trg_profiles_sync_page_slug on public.profiles;
create trigger trg_profiles_sync_page_slug
after insert or update of username on public.profiles
for each row execute function public.sync_page_slug_from_profile();
