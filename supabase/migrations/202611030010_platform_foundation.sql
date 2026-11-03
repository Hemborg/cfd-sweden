begin;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check(length(display_name)<=100),
  approved boolean not null default false,
  suspended boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.user_roles (
  user_id uuid references public.profiles(id) on delete cascade,
  role text check(role in ('superadmin','administrator','editor','group_leader','moderator','member')),
  primary key(user_id,role)
);
create function public.create_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,display_name) values(new.id, left(coalesce(new.raw_user_meta_data->>'display_name',''),100));
  return new;
end $$;
create trigger auth_profile_created after insert on auth.users for each row execute function public.create_profile();
insert into public.profiles(id) select id from auth.users on conflict do nothing;

create function public.has_role(wanted text[]) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.user_roles r join public.profiles p on p.id=r.user_id
    where r.user_id=auth.uid() and p.approved and not p.suspended
    and (r.role=any(wanted) or r.role='superadmin')
    and (r.role='member' or coalesce(auth.jwt()->>'aal','aal1')='aal2'));
$$;
create function public.is_active_member() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=auth.uid() and approved and not suspended);
$$;

create table public.audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text
);
create function public.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
declare row_data jsonb;
begin
  row_data:=case when TG_OP='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.audit_log(actor_id,action,entity,entity_id) values(auth.uid(),TG_OP,TG_TABLE_NAME,coalesce(row_data->>'id',row_data->>'user_id'));
  return case when TG_OP='DELETE' then old else new end;
end $$;
create trigger profile_audit after insert or update or delete on public.profiles for each row execute function public.audit_change();
create trigger role_audit after insert or update or delete on public.user_roles for each row execute function public.audit_change();

create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
-- No retention or legal basis is invented; absent policy means no automatic deletion.
insert into public.platform_settings(key,value) values('retention', '{"approved":false}'),('legal','{"approved":false}');
create trigger settings_audit after insert or update or delete on public.platform_settings for each row execute function public.audit_change();
create table public.rate_limits(bucket text primary key, window_start timestamptz not null, hits integer not null check(hits>0));
create function public.consume_rate_limit(bucket_key text, maximum integer, window_seconds integer) returns boolean language plpgsql security definer set search_path='' as $$
declare used integer;
begin
  if maximum<1 or maximum>10000 or window_seconds<1 or window_seconds>86400 or length(bucket_key)<>64 then raise exception 'invalid limit'; end if;
  insert into public.rate_limits(bucket,window_start,hits) values(bucket_key,clock_timestamp(),1)
  on conflict(bucket) do update set
    hits=case when public.rate_limits.window_start + make_interval(secs=>window_seconds) <= clock_timestamp() then 1 else public.rate_limits.hits+1 end,
    window_start=case when public.rate_limits.window_start + make_interval(secs=>window_seconds) <= clock_timestamp() then clock_timestamp() else public.rate_limits.window_start end
  returning hits into used;
  return used<=maximum;
end $$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.audit_log enable row level security;
alter table public.platform_settings enable row level security;
alter table public.rate_limits enable row level security;
revoke all on public.profiles,public.user_roles,public.audit_log,public.platform_settings,public.rate_limits from anon,authenticated;
grant select on public.profiles,public.user_roles,public.audit_log,public.platform_settings to authenticated;
grant update(display_name) on public.profiles to authenticated;
grant insert,delete on public.user_roles to authenticated;
grant update on public.platform_settings to authenticated;
grant all on public.profiles,public.user_roles,public.audit_log,public.platform_settings,public.rate_limits to service_role;
grant usage,select on sequence public.audit_log_id_seq to service_role;
create policy profiles_read on public.profiles for select to authenticated using(id=auth.uid() or public.has_role(array['administrator']));
create policy profiles_name on public.profiles for update to authenticated using(id=auth.uid() and public.is_active_member()) with check(id=auth.uid() and public.is_active_member());
create policy roles_read on public.user_roles for select to authenticated using(user_id=auth.uid() or public.has_role(array['administrator']));
create policy roles_manage on public.user_roles for all to authenticated using(public.has_role(array['superadmin'])) with check(public.has_role(array['superadmin']));
create policy audit_read on public.audit_log for select to authenticated using(public.has_role(array['administrator']));
create policy settings_read on public.platform_settings for select to authenticated using(public.has_role(array['administrator']));
create policy settings_update on public.platform_settings for update to authenticated using(public.has_role(array['superadmin'])) with check(public.has_role(array['superadmin']));

-- Prevent accidental lockout of the final approved superadmin.
create function public.protect_last_superadmin() returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(8675309);
  if old.role='superadmin' and not exists(select 1 from public.user_roles r join public.profiles p on p.id=r.user_id where r.role='superadmin' and r.user_id<>old.user_id and p.approved and not p.suspended) then raise exception 'last superadmin'; end if;
  return old;
end $$;
create trigger last_superadmin before delete on public.user_roles for each row execute function public.protect_last_superadmin();

create function public.protect_admin_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(8675309);
  if (not new.approved or new.suspended) and exists(select 1 from public.user_roles where user_id=old.id and role='superadmin')
    and not exists(select 1 from public.user_roles r join public.profiles p on p.id=r.user_id where r.role='superadmin' and p.id<>old.id and p.approved and not p.suspended)
  then raise exception 'last active superadmin'; end if;
  return new;
end $$;
create trigger last_active_superadmin before update on public.profiles for each row execute function public.protect_admin_profile();
create function public.set_user_access(target uuid, allowed_roles text[], is_approved boolean, is_suspended boolean) returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.has_role(array['superadmin']) then raise exception 'forbidden' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(8675309);
  if cardinality(allowed_roles)<1 or cardinality(allowed_roles)>6 or not allowed_roles <@ array['superadmin','administrator','editor','group_leader','moderator','member'] then raise exception 'invalid roles'; end if;
  update public.profiles set approved=is_approved,suspended=is_suspended where id=target;
  if not found then raise exception 'unknown user'; end if;
  insert into public.user_roles(user_id,role) select target,unnest(allowed_roles) on conflict do nothing;
  delete from public.user_roles where user_id=target and not(role=any(allowed_roles));
end $$;

revoke all on function public.create_profile(),public.audit_change(),public.protect_last_superadmin(),public.consume_rate_limit(text,integer,integer) from public,anon,authenticated;
revoke all on function public.has_role(text[]),public.is_active_member() from public,anon;
revoke all on function public.protect_admin_profile(),public.set_user_access(uuid,text[],boolean,boolean) from public,anon,authenticated;
grant execute on function public.set_user_access(uuid,text[],boolean,boolean) to authenticated;
grant execute on function public.has_role(text[]),public.is_active_member() to anon,authenticated,service_role;
grant execute on function public.consume_rate_limit(text,integer,integer) to service_role;
commit;
