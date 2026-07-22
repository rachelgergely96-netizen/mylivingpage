-- Bound analytics lookup cost and provide a safe, explicit retention operation.
create index if not exists page_views_page_viewer_viewed_idx
  on public.page_views (page_id, viewer_ip, viewed_at desc);

create index if not exists page_views_page_viewed_idx
  on public.page_views (page_id, viewed_at desc);

create index if not exists events_created_at_idx
  on public.events (created_at desc);

create or replace function public.prune_expired_operational_data(
  rate_limit_retention interval default interval '7 days',
  product_event_retention interval default interval '180 days',
  page_view_retention interval default interval '180 days'
)
returns table (deleted_rate_limits bigint, deleted_product_events bigint, deleted_page_views bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  rate_limit_count bigint;
  product_event_count bigint;
  page_view_count bigint;
begin
  delete from public.events
   where event_name like 'security.rate_limit.%'
     and created_at < now() - rate_limit_retention;
  get diagnostics rate_limit_count = row_count;

  delete from public.events
   where event_name not like 'security.rate_limit.%'
     and created_at < now() - product_event_retention;
  get diagnostics product_event_count = row_count;

  delete from public.page_views
   where viewed_at < now() - page_view_retention;
  get diagnostics page_view_count = row_count;

  return query select rate_limit_count, product_event_count, page_view_count;
end;
$$;

revoke all on function public.prune_expired_operational_data(interval, interval, interval) from public, anon, authenticated;
grant execute on function public.prune_expired_operational_data(interval, interval, interval) to service_role;

comment on function public.prune_expired_operational_data(interval, interval, interval) is
  'Service-role maintenance operation. Schedule daily in Supabase after reviewing retention policy.';
