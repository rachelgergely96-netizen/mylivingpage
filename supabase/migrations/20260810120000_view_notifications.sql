-- View notifications: per-user delivery preferences, and the per-view record of
-- what was already sent so a later engagement beacon can never re-fire an alert.

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_view_email boolean not null default true,
  repeat_visitor_email boolean not null default true,
  weekly_digest_email boolean not null default true,
  unsubscribe_token uuid not null default gen_random_uuid(),
  last_digest_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_notification_preferences_unsubscribe_token
  on public.notification_preferences(unsubscribe_token);

-- Notification state lives on the view row itself: page_views is already
-- deduped to one row per hashed IP per page per 24h, so "one notification per
-- row" inherits that bound for free.
alter table public.page_views
  add column if not exists notified_at timestamptz,
  add column if not exists notification_kind text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'page_views_notification_kind_chk'
      and conrelid = 'public.page_views'::regclass
  ) then
    alter table public.page_views
      add constraint page_views_notification_kind_chk
      check (
        notification_kind is null
        or notification_kind in ('first_view', 'repeat_visitor')
      );
  end if;
end $$;

-- Claim index: the dispatcher selects unnotified rows for a page, so keep the
-- partial index narrow.
create index if not exists idx_page_views_unnotified
  on public.page_views(page_id, viewed_at)
  where notified_at is null;

-- Digest window scan.
create index if not exists idx_page_views_page_id_viewed_at
  on public.page_views(page_id, viewed_at desc);

alter table public.notification_preferences enable row level security;

drop policy if exists "Users read own notification preferences" on public.notification_preferences;
create policy "Users read own notification preferences"
  on public.notification_preferences
  for select
  using (user_id = auth.uid());

drop policy if exists "Users update own notification preferences" on public.notification_preferences;
create policy "Users update own notification preferences"
  on public.notification_preferences
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users insert own notification preferences" on public.notification_preferences;
create policy "Users insert own notification preferences"
  on public.notification_preferences
  for insert
  with check (user_id = auth.uid());

-- The unsubscribe token is a bearer secret delivered in email; browser roles
-- must never be able to read it back out of the table.
revoke select (unsubscribe_token) on public.notification_preferences from anon, authenticated;

create or replace function public.touch_notification_preferences_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_notification_preferences_updated_at on public.notification_preferences;
create trigger trg_notification_preferences_updated_at
  before update on public.notification_preferences
  for each row
  execute function public.touch_notification_preferences_updated_at();
