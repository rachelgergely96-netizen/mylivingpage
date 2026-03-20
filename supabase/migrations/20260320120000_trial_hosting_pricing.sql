alter table public.profiles
  add column if not exists billing_cohort text;

alter table public.profiles
  add column if not exists hosting_trial_started_at timestamptz;

update public.profiles
set billing_cohort = 'legacy_freemium'
where billing_cohort is null;

alter table public.profiles
  alter column billing_cohort set default 'trial_hosting_v1';

alter table public.profiles
  alter column billing_cohort set not null;

alter table public.profiles
  drop constraint if exists profiles_billing_cohort_check;

alter table public.profiles
  add constraint profiles_billing_cohort_check
  check (billing_cohort in ('legacy_freemium', 'trial_hosting_v1'));
