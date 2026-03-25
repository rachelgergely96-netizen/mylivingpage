alter table public.profiles
  add column if not exists stripe_subscription_status text;

alter table public.profiles
  add column if not exists stripe_trial_ends_at timestamptz;

alter table public.profiles
  alter column billing_cohort set default 'publish_cc_trial_v1';

alter table public.profiles
  drop constraint if exists profiles_billing_cohort_check;

alter table public.profiles
  add constraint profiles_billing_cohort_check
  check (billing_cohort in ('legacy_freemium', 'trial_hosting_v1', 'publish_cc_trial_v1'));
