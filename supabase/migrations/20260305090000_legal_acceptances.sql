create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  source text not null check (source in ('signup', 'checkout')),
  accepted_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (user_id, source, terms_version, privacy_version)
);

create index if not exists idx_legal_acceptances_user_id
  on public.legal_acceptances(user_id);

create index if not exists idx_legal_acceptances_accepted_at
  on public.legal_acceptances(accepted_at desc);

alter table public.legal_acceptances enable row level security;

drop policy if exists "Users read own legal acceptances" on public.legal_acceptances;
create policy "Users read own legal acceptances"
  on public.legal_acceptances
  for select
  using (auth.uid() = user_id);
