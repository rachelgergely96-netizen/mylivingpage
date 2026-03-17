alter table public.page_views
  add column if not exists engaged_seconds integer,
  add column if not exists max_scroll_depth_pct integer,
  add column if not exists primary_section text,
  add column if not exists had_outbound_click boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'page_views_engaged_seconds_chk'
      and conrelid = 'public.page_views'::regclass
  ) then
    alter table public.page_views
      add constraint page_views_engaged_seconds_chk
      check (engaged_seconds is null or engaged_seconds between 0 and 1800);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'page_views_scroll_depth_chk'
      and conrelid = 'public.page_views'::regclass
  ) then
    alter table public.page_views
      add constraint page_views_scroll_depth_chk
      check (
        max_scroll_depth_pct is null
        or max_scroll_depth_pct between 0 and 100
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'page_views_primary_section_chk'
      and conrelid = 'public.page_views'::regclass
  ) then
    alter table public.page_views
      add constraint page_views_primary_section_chk
      check (
        primary_section is null
        or primary_section in (
          'summary',
          'experience',
          'projects',
          'education',
          'skills',
          'certifications'
        )
      );
  end if;
end $$;

create table if not exists public.page_interactions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  page_view_id uuid not null references public.page_views(id) on delete cascade,
  target_key text not null,
  target_label text,
  click_count integer not null default 1,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'page_interactions_target_key_chk'
      and conrelid = 'public.page_interactions'::regclass
  ) then
    alter table public.page_interactions
      add constraint page_interactions_target_key_chk
      check (
        target_key in (
          'email',
          'linkedin',
          'github',
          'website',
          'experience_company',
          'project'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'page_interactions_click_count_chk'
      and conrelid = 'public.page_interactions'::regclass
  ) then
    alter table public.page_interactions
      add constraint page_interactions_click_count_chk
      check (click_count between 1 and 50);
  end if;
end $$;

create index if not exists idx_page_interactions_page_id
  on public.page_interactions(page_id);
create index if not exists idx_page_interactions_page_view_id
  on public.page_interactions(page_view_id);
create index if not exists idx_page_views_primary_section
  on public.page_views(primary_section)
  where primary_section is not null;

alter table public.page_interactions enable row level security;

drop policy if exists "Users read own page interactions" on public.page_interactions;
create policy "Users read own page interactions"
  on public.page_interactions
  for select
  using (
    exists (
      select 1
      from public.pages
      where pages.id = page_interactions.page_id
        and pages.owner_id = auth.uid()
    )
  );
