-- Secure schema + RLS for pages, entries, collaborators, and token-gated sharing.
create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'page_visibility' and n.nspname = 'public'
  ) then
    create type public.page_visibility as enum ('private', 'link', 'public');
  end if;
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'collaborator_role' and n.nspname = 'public'
  ) then
    create type public.collaborator_role as enum ('viewer', 'editor');
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- pages: create/upgrade for compatibility with existing repo schema.
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  visibility public.page_visibility not null default 'private',
  share_token_hash text,
  share_token_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pages add column if not exists owner_id uuid;
alter table public.pages add column if not exists title text;
alter table public.pages add column if not exists visibility public.page_visibility;
alter table public.pages add column if not exists share_token_hash text;
alter table public.pages add column if not exists share_token_created_at timestamptz;
alter table public.pages add column if not exists created_at timestamptz;
alter table public.pages add column if not exists updated_at timestamptz;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pages' and column_name = 'user_id'
  ) then
    execute 'update public.pages set owner_id = user_id where owner_id is null and user_id is not null';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pages' and column_name = 'status'
  ) then
    execute $sql$
      update public.pages
      set visibility = case when status = 'live' then 'public'::public.page_visibility else 'private'::public.page_visibility end
      where visibility is null
    $sql$;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pages' and column_name = 'slug'
  ) then
    execute $sql$
      update public.pages
      set title = coalesce(nullif(title, ''), coalesce(slug, 'Untitled Page'))
      where title is null or btrim(title) = ''
    $sql$;
  else
    update public.pages
    set title = 'Untitled Page'
    where title is null or btrim(title) = '';
  end if;
end $$;
update public.pages set visibility = 'private'::public.page_visibility where visibility is null;
update public.pages set created_at = now() where created_at is null;
update public.pages set updated_at = now() where updated_at is null;

alter table public.pages alter column owner_id set not null;
alter table public.pages alter column title set not null;
alter table public.pages alter column visibility set not null;
alter table public.pages alter column visibility set default 'private';
alter table public.pages alter column created_at set not null;
alter table public.pages alter column created_at set default now();
alter table public.pages alter column updated_at set not null;
alter table public.pages alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pages_owner_id_fkey' and conrelid = 'public.pages'::regclass
  ) then
    alter table public.pages
      add constraint pages_owner_id_fkey foreign key (owner_id) references auth.users(id) on delete cascade;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'pages_title_length_chk' and conrelid = 'public.pages'::regclass
  ) then
    alter table public.pages add constraint pages_title_length_chk check (char_length(title) between 1 and 200);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'pages_share_token_hash_format_chk' and conrelid = 'public.pages'::regclass
  ) then
    alter table public.pages add constraint pages_share_token_hash_format_chk check (
      share_token_hash is null or share_token_hash ~ '^[a-f0-9]{64}$'
    );
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'pages_link_requires_share_token_chk' and conrelid = 'public.pages'::regclass
  ) then
    alter table public.pages add constraint pages_link_requires_share_token_chk check (
      visibility <> 'link' or share_token_hash is not null
    );
  end if;
end $$;

create index if not exists pages_owner_id_idx on public.pages(owner_id);
create index if not exists pages_visibility_idx on public.pages(visibility);
create unique index if not exists pages_share_token_hash_uidx on public.pages(share_token_hash)
  where share_token_hash is not null;

create or replace function public.enforce_pages_integrity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.share_token_hash is not null then
    new.share_token_hash := lower(new.share_token_hash);
    if new.share_token_hash !~ '^[a-f0-9]{64}$' then
      raise exception 'share_token_hash must be lowercase sha256 hex';
    end if;
  end if;

  if tg_op = 'insert' then
    if current_user not in ('postgres', 'supabase_admin') and coalesce(auth.role(), '') <> 'service_role' then
      if auth.uid() is null then
        raise exception 'authentication required';
      end if;
      if new.owner_id is null then
        new.owner_id := auth.uid();
      end if;
      if new.owner_id <> auth.uid() then
        raise exception 'owner_id must match auth.uid()';
      end if;
    end if;
  elsif tg_op = 'update' then
    if new.owner_id <> old.owner_id
       and current_user not in ('postgres', 'supabase_admin')
       and coalesce(auth.role(), '') <> 'service_role' then
      raise exception 'owner_id is immutable';
    end if;
  end if;

  if new.visibility = 'link' and new.share_token_hash is null then
    raise exception 'link visibility requires share_token_hash';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pages_updated_at on public.pages;
create trigger trg_pages_updated_at before update on public.pages
for each row execute function public.set_updated_at();

drop trigger if exists trg_pages_integrity on public.pages;
create trigger trg_pages_integrity before insert or update on public.pages
for each row execute function public.enforce_pages_integrity();

create table if not exists public.page_entries (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'page_entries_type_chk' and conrelid = 'public.page_entries'::regclass
  ) then
    alter table public.page_entries add constraint page_entries_type_chk check (type in ('text', 'link', 'photo', 'note'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'page_entries_content_object_chk' and conrelid = 'public.page_entries'::regclass
  ) then
    alter table public.page_entries add constraint page_entries_content_object_chk check (jsonb_typeof(content) = 'object');
  end if;
end $$;

create index if not exists page_entries_page_id_idx on public.page_entries(page_id);
create index if not exists page_entries_owner_id_idx on public.page_entries(owner_id);

create or replace function public.enforce_page_entries_integrity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_page_owner uuid;
begin
  select p.owner_id into v_page_owner
  from public.pages p
  where p.id = new.page_id;

  if v_page_owner is null then
    raise exception 'invalid page_id';
  end if;
  if new.owner_id is null then
    new.owner_id := v_page_owner;
  end if;
  if new.owner_id <> v_page_owner then
    raise exception 'entry owner_id must match page owner_id';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_page_entries_updated_at on public.page_entries;
create trigger trg_page_entries_updated_at before update on public.page_entries
for each row execute function public.set_updated_at();

drop trigger if exists trg_page_entries_integrity on public.page_entries;
create trigger trg_page_entries_integrity before insert or update on public.page_entries
for each row execute function public.enforce_page_entries_integrity();

create table if not exists public.page_collaborators (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.collaborator_role not null default 'viewer',
  created_at timestamptz not null default now(),
  constraint page_collaborators_page_user_unique unique (page_id, user_id)
);

create index if not exists page_collaborators_page_id_idx on public.page_collaborators(page_id);
create index if not exists page_collaborators_user_id_idx on public.page_collaborators(user_id);

create or replace function public.prevent_owner_collaborator_row()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select p.owner_id into v_owner from public.pages p where p.id = new.page_id;
  if v_owner is null then
    raise exception 'invalid page_id';
  end if;
  if new.user_id = v_owner then
    raise exception 'page owner cannot be collaborator';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_owner_collaborator_row on public.page_collaborators;
create trigger trg_prevent_owner_collaborator_row before insert or update on public.page_collaborators
for each row execute function public.prevent_owner_collaborator_row();

create table if not exists public.access_logs (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_ip_hash text,
  action text not null,
  created_at timestamptz not null default now(),
  constraint access_logs_actor_ip_hash_chk check (actor_ip_hash is null or actor_ip_hash ~ '^[a-f0-9]{64}$'),
  constraint access_logs_action_length_chk check (char_length(action) between 1 and 80)
);

create index if not exists access_logs_page_id_created_at_idx on public.access_logs(page_id, created_at desc);
create index if not exists access_logs_actor_user_id_idx on public.access_logs(actor_user_id);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.pages enable row level security;
alter table public.page_entries enable row level security;
alter table public.page_collaborators enable row level security;
alter table public.access_logs enable row level security;

drop policy if exists "Users manage own pages" on public.pages;
drop policy if exists "Public reads live pages" on public.pages;

-- pages: owner read/write, public read, collaborator read.
-- link visibility is intentionally NOT exposed via direct table select; use get_link_page_with_entries().
drop policy if exists pages_select_owner on public.pages;
create policy pages_select_owner on public.pages
for select to authenticated
using (owner_id = auth.uid());

drop policy if exists pages_select_public on public.pages;
create policy pages_select_public on public.pages
for select to anon, authenticated
using (visibility = 'public');

drop policy if exists pages_select_collaborator on public.pages;
create policy pages_select_collaborator on public.pages
for select to authenticated
using (
  exists (
    select 1
    from public.page_collaborators pc
    where pc.page_id = pages.id
      and pc.user_id = auth.uid()
  )
);

drop policy if exists pages_insert_owner on public.pages;
create policy pages_insert_owner on public.pages
for insert to authenticated
with check (owner_id = auth.uid());

drop policy if exists pages_update_owner on public.pages;
create policy pages_update_owner on public.pages
for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists pages_delete_owner on public.pages;
create policy pages_delete_owner on public.pages
for delete to authenticated
using (owner_id = auth.uid());

-- page_entries: public pages readable by anon; owner/collaborator readable by auth.
drop policy if exists page_entries_select_readable_page on public.page_entries;
create policy page_entries_select_readable_page on public.page_entries
for select to anon, authenticated
using (
  exists (
    select 1
    from public.pages p
    where p.id = page_entries.page_id
      and (
        p.visibility = 'public'
        or p.owner_id = auth.uid()
        or exists (
          select 1
          from public.page_collaborators pc
          where pc.page_id = p.id
            and pc.user_id = auth.uid()
        )
      )
  )
);

-- page_entries: only owners and editor collaborators can mutate entries.
drop policy if exists page_entries_insert_owner_or_editor on public.page_entries;
create policy page_entries_insert_owner_or_editor on public.page_entries
for insert to authenticated
with check (
  exists (
    select 1
    from public.pages p
    where p.id = page_entries.page_id
      and p.owner_id = page_entries.owner_id
      and (
        p.owner_id = auth.uid()
        or exists (
          select 1
          from public.page_collaborators pc
          where pc.page_id = p.id
            and pc.user_id = auth.uid()
            and pc.role = 'editor'
        )
      )
  )
);

drop policy if exists page_entries_update_owner_or_editor on public.page_entries;
create policy page_entries_update_owner_or_editor on public.page_entries
for update to authenticated
using (
  exists (
    select 1
    from public.pages p
    where p.id = page_entries.page_id
      and (
        p.owner_id = auth.uid()
        or exists (
          select 1
          from public.page_collaborators pc
          where pc.page_id = p.id
            and pc.user_id = auth.uid()
            and pc.role = 'editor'
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.pages p
    where p.id = page_entries.page_id
      and p.owner_id = page_entries.owner_id
      and (
        p.owner_id = auth.uid()
        or exists (
          select 1
          from public.page_collaborators pc
          where pc.page_id = p.id
            and pc.user_id = auth.uid()
            and pc.role = 'editor'
        )
      )
  )
);

drop policy if exists page_entries_delete_owner_or_editor on public.page_entries;
create policy page_entries_delete_owner_or_editor on public.page_entries
for delete to authenticated
using (
  exists (
    select 1
    from public.pages p
    where p.id = page_entries.page_id
      and (
        p.owner_id = auth.uid()
        or exists (
          select 1
          from public.page_collaborators pc
          where pc.page_id = p.id
            and pc.user_id = auth.uid()
            and pc.role = 'editor'
        )
      )
  )
);

-- collaborators: owner manages rows; users can read their own membership row.
drop policy if exists page_collaborators_select_owner on public.page_collaborators;
create policy page_collaborators_select_owner on public.page_collaborators
for select to authenticated
using (
  exists (
    select 1
    from public.pages p
    where p.id = page_collaborators.page_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists page_collaborators_select_self on public.page_collaborators;
create policy page_collaborators_select_self on public.page_collaborators
for select to authenticated
using (user_id = auth.uid());

drop policy if exists page_collaborators_insert_owner on public.page_collaborators;
create policy page_collaborators_insert_owner on public.page_collaborators
for insert to authenticated
with check (
  exists (
    select 1
    from public.pages p
    where p.id = page_collaborators.page_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists page_collaborators_update_owner on public.page_collaborators;
create policy page_collaborators_update_owner on public.page_collaborators
for update to authenticated
using (
  exists (
    select 1
    from public.pages p
    where p.id = page_collaborators.page_id
      and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.pages p
    where p.id = page_collaborators.page_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists page_collaborators_delete_owner on public.page_collaborators;
create policy page_collaborators_delete_owner on public.page_collaborators
for delete to authenticated
using (
  exists (
    select 1
    from public.pages p
    where p.id = page_collaborators.page_id
      and p.owner_id = auth.uid()
  )
);

-- access logs: page owner can read; only service-role can insert directly.
drop policy if exists access_logs_select_owner on public.access_logs;
create policy access_logs_select_owner on public.access_logs
for select to authenticated
using (
  exists (
    select 1
    from public.pages p
    where p.id = access_logs.page_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists access_logs_insert_service_role on public.access_logs;
create policy access_logs_insert_service_role on public.access_logs
for insert to public
with check (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- Token functions: raw tokens never stored in tables.
-- -----------------------------------------------------------------------------
create or replace function public.sha256_hex(p_input text)
returns text
language sql
immutable
strict
as $$
  select encode(digest(p_input, 'sha256'), 'hex');
$$;

-- Owner-only rotation. Returns raw token once; stores only hash.
create or replace function public.rotate_page_share_token(p_page_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if not exists (
    select 1
    from public.pages p
    where p.id = p_page_id and p.owner_id = auth.uid()
  ) then
    raise exception 'not allowed';
  end if;

  v_token := regexp_replace(translate(encode(gen_random_bytes(32), 'base64'), '+/', '-_'), '=+$', '');

  update public.pages
  set visibility = 'link',
      share_token_hash = public.sha256_hex(v_token),
      share_token_created_at = now()
  where id = p_page_id;

  insert into public.access_logs(page_id, actor_user_id, action)
  values (p_page_id, auth.uid(), 'share_token_rotated');

  return v_token;
end;
$$;

-- Owner-only revoke/reset.
create or replace function public.revoke_page_share_token(
  p_page_id uuid,
  p_make_private boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if not exists (
    select 1
    from public.pages p
    where p.id = p_page_id and p.owner_id = auth.uid()
  ) then
    raise exception 'not allowed';
  end if;

  update public.pages
  set share_token_hash = null,
      share_token_created_at = null,
      visibility = case when p_make_private then 'private'::public.page_visibility else visibility end
  where id = p_page_id;

  insert into public.access_logs(page_id, actor_user_id, action)
  values (p_page_id, auth.uid(), 'share_token_revoked');
end;
$$;

-- Link-read RPC: validates token hash and returns scoped page + entries payload.
create or replace function public.get_link_page_with_entries(
  p_page_id uuid,
  p_share_token text,
  p_actor_ip text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_page record;
  v_entries jsonb;
  v_ip_hash text;
begin
  if p_share_token is null or char_length(p_share_token) < 20 then
    raise exception 'invalid token';
  end if;

  select p.id, p.owner_id, p.title, p.visibility, p.created_at, p.updated_at
  into v_page
  from public.pages p
  where p.id = p_page_id
    and p.visibility = 'link'
    and p.share_token_hash = public.sha256_hex(p_share_token);

  if not found then
    raise exception 'page not found or token invalid';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'page_id', e.page_id,
        'owner_id', e.owner_id,
        'type', e.type,
        'content', e.content,
        'created_at', e.created_at,
        'updated_at', e.updated_at
      )
      order by e.created_at
    ),
    '[]'::jsonb
  )
  into v_entries
  from public.page_entries e
  where e.page_id = p_page_id;

  if p_actor_ip is not null and btrim(p_actor_ip) <> '' then
    v_ip_hash := public.sha256_hex(p_actor_ip);
  end if;

  insert into public.access_logs(page_id, actor_user_id, actor_ip_hash, action)
  values (p_page_id, auth.uid(), v_ip_hash, 'link_token_read');

  return jsonb_build_object(
    'page', jsonb_build_object(
      'id', v_page.id,
      'owner_id', v_page.owner_id,
      'title', v_page.title,
      'visibility', v_page.visibility,
      'created_at', v_page.created_at,
      'updated_at', v_page.updated_at
    ),
    'entries', v_entries
  );
end;
$$;

revoke all on function public.rotate_page_share_token(uuid) from public, anon, authenticated;
grant execute on function public.rotate_page_share_token(uuid) to authenticated;

revoke all on function public.revoke_page_share_token(uuid, boolean) from public, anon, authenticated;
grant execute on function public.revoke_page_share_token(uuid, boolean) to authenticated;

revoke all on function public.get_link_page_with_entries(uuid, text, text) from public, anon, authenticated;
grant execute on function public.get_link_page_with_entries(uuid, text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Storage policy patterns (if using Supabase Storage for photos).
-- Bucket convention: bucket_id = 'page-images', object name = <page_id>/<filename>
-- Link-shared images should be served with short-lived signed URLs after token RPC validation.
-- -----------------------------------------------------------------------------
create or replace function public.storage_object_page_id(p_name text)
returns uuid
language plpgsql
immutable
as $$
declare
  v_first_segment text;
begin
  v_first_segment := split_part(p_name, '/', 1);
  if v_first_segment ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return v_first_segment::uuid;
  end if;
  return null;
end;
$$;

drop policy if exists storage_page_images_select on storage.objects;
create policy storage_page_images_select on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'page-images'
  and exists (
    select 1
    from public.pages p
    where p.id = public.storage_object_page_id(name)
      and (
        p.visibility = 'public'
        or p.owner_id = auth.uid()
        or exists (
          select 1
          from public.page_collaborators pc
          where pc.page_id = p.id
            and pc.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists storage_page_images_insert on storage.objects;
create policy storage_page_images_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'page-images'
  and exists (
    select 1
    from public.pages p
    where p.id = public.storage_object_page_id(name)
      and (
        p.owner_id = auth.uid()
        or exists (
          select 1
          from public.page_collaborators pc
          where pc.page_id = p.id
            and pc.user_id = auth.uid()
            and pc.role = 'editor'
        )
      )
  )
);

drop policy if exists storage_page_images_update on storage.objects;
create policy storage_page_images_update on storage.objects
for update to authenticated
using (
  bucket_id = 'page-images'
  and exists (
    select 1
    from public.pages p
    where p.id = public.storage_object_page_id(name)
      and (
        p.owner_id = auth.uid()
        or exists (
          select 1
          from public.page_collaborators pc
          where pc.page_id = p.id
            and pc.user_id = auth.uid()
            and pc.role = 'editor'
        )
      )
  )
)
with check (
  bucket_id = 'page-images'
  and exists (
    select 1
    from public.pages p
    where p.id = public.storage_object_page_id(name)
      and (
        p.owner_id = auth.uid()
        or exists (
          select 1
          from public.page_collaborators pc
          where pc.page_id = p.id
            and pc.user_id = auth.uid()
            and pc.role = 'editor'
        )
      )
  )
);

drop policy if exists storage_page_images_delete on storage.objects;
create policy storage_page_images_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'page-images'
  and exists (
    select 1
    from public.pages p
    where p.id = public.storage_object_page_id(name)
      and (
        p.owner_id = auth.uid()
        or exists (
          select 1
          from public.page_collaborators pc
          where pc.page_id = p.id
            and pc.user_id = auth.uid()
            and pc.role = 'editor'
        )
      )
  )
);

-- Optional one-time tokens (alternative model)
-- create table public.page_share_tokens (
--   id uuid primary key default gen_random_uuid(),
--   page_id uuid not null references public.pages(id) on delete cascade,
--   token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
--   created_by uuid not null references auth.users(id) on delete cascade,
--   expires_at timestamptz,
--   used_at timestamptz,
--   revoked_at timestamptz,
--   created_at timestamptz not null default now()
-- );

grant select on public.pages to anon, authenticated;
grant insert, update, delete on public.pages to authenticated;

grant select on public.page_entries to anon, authenticated;
grant insert, update, delete on public.page_entries to authenticated;

grant select on public.page_collaborators to authenticated;
grant insert, update, delete on public.page_collaborators to authenticated;

grant select on public.access_logs to authenticated;
grant insert on public.access_logs to service_role;
