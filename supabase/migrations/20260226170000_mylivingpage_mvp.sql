create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text,
  email text,
  avatar_url text,
  plan text default 'spark',
  stripe_customer_id text,
  custom_domain text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  slug text not null,
  status text default 'draft',
  theme_id text not null,
  resume_data jsonb not null,
  raw_resume text,
  portfolio_url text,
  page_config jsonb default '{}'::jsonb,
  views integer default 0,
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, slug)
);

create table if not exists public.page_views (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references public.pages(id) on delete cascade,
  viewer_ip text,
  referrer text,
  user_agent text,
  country text,
  viewed_at timestamptz default now()
);

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  referral_code text,
  created_at timestamptz default now()
);

create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_pages_slug on public.pages(slug);
create index if not exists idx_pages_user_id on public.pages(user_id);
create index if not exists idx_pages_status on public.pages(status);
create index if not exists idx_page_views_page_id on public.page_views(page_id);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.handle_updated_at();

drop trigger if exists set_pages_updated_at on public.pages;
create trigger set_pages_updated_at
before update on public.pages
for each row execute function public.handle_updated_at();

create or replace function public.generate_unique_username(input_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate text;
  suffix integer := 0;
begin
  base_username := regexp_replace(split_part(lower(coalesce(input_email, 'member')), '@', 1), '[^a-z0-9_-]+', '-', 'g');
  base_username := trim(both '-' from base_username);
  if base_username = '' then
    base_username := 'member';
  end if;

  candidate := base_username;
  while exists(select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := base_username || '-' || suffix::text;
  end loop;

  return candidate;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name, email)
  values (
    new.id,
    public.generate_unique_username(new.email),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.pages enable row level security;
alter table public.page_views enable row level security;
alter table public.waitlist enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "Users manage own pages" on public.pages;
create policy "Users manage own pages"
  on public.pages
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Public reads live pages" on public.pages;
create policy "Public reads live pages"
  on public.pages
  for select
  using (status = 'live');

drop policy if exists "Users read own page views" on public.page_views;
create policy "Users read own page views"
  on public.page_views
  for select
  using (
    exists (
      select 1
      from public.pages
      where pages.id = page_views.page_id
      and pages.user_id = auth.uid()
    )
  );

drop policy if exists "Allow waitlist insert" on public.waitlist;
create policy "Allow waitlist insert"
  on public.waitlist
  for insert
  with check (true);
