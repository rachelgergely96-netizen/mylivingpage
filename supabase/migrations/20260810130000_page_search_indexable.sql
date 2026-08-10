-- "Link only": a page that is live at its username URL but withheld from search
-- engines.
--
-- This deliberately does NOT reuse visibility = 'link'. That value already means
-- something else here — a page shared through a secret token, enforced by
-- pages_link_requires_share_token_chk and read back by the token-matching RPC in
-- 20260227163000. Overloading it would both violate that constraint and blur two
-- unrelated sharing models.
--
-- So indexability becomes its own axis. Link-only pages stay visibility='public'
-- and keep every existing RLS and storage policy working unchanged.

alter table public.pages
  add column if not exists search_indexable boolean not null default true;

-- Sitemap and robots reads filter on this, so index the rows they exclude.
create index if not exists idx_pages_search_indexable
  on public.pages(search_indexable)
  where search_indexable = false;
