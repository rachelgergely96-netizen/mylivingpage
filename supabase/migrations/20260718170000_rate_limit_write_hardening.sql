-- Keep rejected-request auditing bounded and report the actual sliding-window
-- reset time. This follows 20260718160000_database_security_hardening.sql so an
-- already-applied migration remains immutable.

create index if not exists events_rate_limit_blocked_lookup_idx
on public.events (
  (metadata ->> 'policy'),
  (metadata ->> 'identifier_hash'),
  created_at desc
)
where event_name = 'security.rate_limit.blocked';

create or replace function public.enforce_rate_limit(
  p_policy text,
  p_identifier_hash text,
  p_scope text,
  p_route text,
  p_user_id uuid,
  p_max_requests integer,
  p_window_ms integer
)
returns table (
  allowed boolean,
  request_count integer,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_window_start timestamptz;
  v_reset_at timestamptz;
  v_recent_count integer;
  v_oldest_request timestamptz;
  v_metadata jsonb;
begin
  if p_policy is null or p_policy !~ '^[a-z0-9_]{1,80}$' then
    raise exception 'invalid rate-limit policy';
  end if;

  if p_identifier_hash is null or p_identifier_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid rate-limit identifier';
  end if;

  if p_scope is null or p_scope not in ('ip', 'user') then
    raise exception 'invalid rate-limit scope';
  end if;

  if p_route is not null and pg_catalog.char_length(p_route) > 240 then
    raise exception 'invalid rate-limit route';
  end if;

  if p_max_requests is null or p_max_requests < 1 or p_max_requests > 10000 then
    raise exception 'invalid rate-limit maximum';
  end if;

  if p_window_ms is null or p_window_ms < 1000 or p_window_ms > 604800000 then
    raise exception 'invalid rate-limit window';
  end if;

  v_window_start := v_now - (p_window_ms * interval '1 millisecond');

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_policy || ':' || p_identifier_hash, 0)
  );

  select pg_catalog.count(*)::integer, pg_catalog.min(e.created_at)
  into v_recent_count, v_oldest_request
  from public.events e
  where e.event_name = 'security.rate_limit.request'
    and e.created_at >= v_window_start
    and e.metadata ->> 'policy' = p_policy
    and e.metadata ->> 'identifier_hash' = p_identifier_hash;

  -- Capacity returns when the oldest counted request leaves the window. Do not
  -- move reset_at forward on every rejected poll.
  v_reset_at := coalesce(v_oldest_request, v_now)
    + (p_window_ms * interval '1 millisecond');

  v_metadata := pg_catalog.jsonb_build_object(
    'policy', p_policy,
    'identifier_hash', p_identifier_hash,
    'scope', p_scope,
    'route', p_route,
    'max_requests', p_max_requests,
    'window_ms', p_window_ms,
    'reset_at', v_reset_at
  );

  if v_recent_count >= p_max_requests then
    -- A rejected flood must not turn the limiter itself into an unbounded write
    -- path. Keep at most one blocked audit row per identifier/window.
    if not exists (
      select 1
      from public.events e
      where e.event_name = 'security.rate_limit.blocked'
        and e.created_at >= v_window_start
        and e.metadata ->> 'policy' = p_policy
        and e.metadata ->> 'identifier_hash' = p_identifier_hash
    ) then
      insert into public.events (user_id, event_name, metadata, created_at)
      values (p_user_id, 'security.rate_limit.blocked', v_metadata, v_now);
    end if;

    return query
    select false, v_recent_count, 0, v_reset_at;
    return;
  end if;

  insert into public.events (user_id, event_name, metadata, created_at)
  values (p_user_id, 'security.rate_limit.request', v_metadata, v_now);

  return query
  select
    true,
    v_recent_count + 1,
    greatest(0, p_max_requests - v_recent_count - 1),
    v_reset_at;
end;
$$;

revoke all on function public.enforce_rate_limit(
  text, text, text, text, uuid, integer, integer
) from public, anon, authenticated;
grant execute on function public.enforce_rate_limit(
  text, text, text, text, uuid, integer, integer
) to service_role;

-- These legacy share-token SECURITY DEFINER RPCs have no application callers
-- and the live database has no link-shared pages. Keep the functions available
-- to trusted server code without exposing their elevated execution context to
-- browser roles.
revoke all on function public.rotate_page_share_token(uuid)
from public, anon, authenticated;
grant execute on function public.rotate_page_share_token(uuid) to service_role;

revoke all on function public.revoke_page_share_token(uuid, boolean)
from public, anon, authenticated;
grant execute on function public.revoke_page_share_token(uuid, boolean) to service_role;

revoke all on function public.get_link_page_with_entries(uuid, text, text)
from public, anon, authenticated;
grant execute on function public.get_link_page_with_entries(uuid, text, text) to service_role;

do $$
begin
  if pg_catalog.has_function_privilege(
       'anon',
       'public.enforce_rate_limit(text,text,text,text,uuid,integer,integer)',
       'execute'
     )
     or pg_catalog.has_function_privilege(
       'authenticated',
       'public.enforce_rate_limit(text,text,text,text,uuid,integer,integer)',
       'execute'
     )
     or pg_catalog.has_function_privilege(
       'anon',
       'public.rotate_page_share_token(uuid)',
       'execute'
     )
     or pg_catalog.has_function_privilege(
       'authenticated',
       'public.rotate_page_share_token(uuid)',
       'execute'
     )
     or pg_catalog.has_function_privilege(
       'anon',
       'public.revoke_page_share_token(uuid,boolean)',
       'execute'
     )
     or pg_catalog.has_function_privilege(
       'authenticated',
       'public.revoke_page_share_token(uuid,boolean)',
       'execute'
     )
     or pg_catalog.has_function_privilege(
       'anon',
       'public.get_link_page_with_entries(uuid,text,text)',
       'execute'
     )
     or pg_catalog.has_function_privilege(
       'authenticated',
       'public.get_link_page_with_entries(uuid,text,text)',
       'execute'
     ) then
    raise exception 'privileged RPCs must remain service-role-only';
  end if;
end;
$$;
