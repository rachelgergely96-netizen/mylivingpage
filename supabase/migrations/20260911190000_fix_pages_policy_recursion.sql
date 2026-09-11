-- The Create screen's preflight counts the signed-in user's pages from the
-- browser. Under RLS that read failed for every account, admin and brand-new
-- alike, with:
--
--   42P17 infinite recursion detected in policy for relation "pages"
--
-- The loop: pages_select_collaborator reads page_collaborators; the
-- page_collaborators owner policies read pages; Postgres expands pages'
-- policies again and gives up. Any browser-side SELECT on pages, not just the
-- count, hits it.
--
-- Fix: check collaborator membership through a SECURITY DEFINER function that
-- reads page_collaborators without RLS. The cycle needs both edges; this
-- removes the pages -> page_collaborators one. The function only ever answers
-- "is the caller a collaborator on this page", so bypassing RLS leaks nothing.

create or replace function public.is_page_collaborator(target_page_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.page_collaborators pc
    where pc.page_id = target_page_id
      and pc.user_id = auth.uid()
  );
$$;

revoke all on function public.is_page_collaborator(uuid) from public, anon;
grant execute on function public.is_page_collaborator(uuid) to authenticated, service_role;

drop policy if exists pages_select_collaborator on public.pages;
create policy pages_select_collaborator on public.pages
for select to authenticated
using (public.is_page_collaborator(pages.id));

-- Prove the loop is gone before this migration commits. Run the exact
-- browser-side read as the authenticated role; the recursion error would
-- abort the transaction here rather than ship.
do $$
declare
  probe_count integer;
begin
  execute 'set local role authenticated';
  perform set_config(
    'request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}',
    true
  );
  select count(*) into probe_count
  from public.pages
  where owner_id = '00000000-0000-0000-0000-000000000000'
     or user_id = '00000000-0000-0000-0000-000000000000';
  execute 'reset role';
end
$$;
