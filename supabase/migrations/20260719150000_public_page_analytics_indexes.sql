-- Bound the hottest public-view dedupe and dashboard range scans.
create index if not exists page_views_page_viewer_viewed_at_idx
  on public.page_views (page_id, viewer_ip, viewed_at desc);

create index if not exists page_views_page_viewed_at_idx
  on public.page_views (page_id, viewed_at desc);

create index if not exists events_created_at_idx
  on public.events (created_at desc);
