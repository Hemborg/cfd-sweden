begin;

create table public.work_groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(name) between 1 and 140),
  purpose text not null default '' check (length(purpose) <= 5000),
  public_summary text not null default '' check (length(public_summary) <= 1000),
  is_public boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((is_public and published_at is not null) or (not is_public and published_at is null))
);
create table public.work_group_memberships (
  group_id uuid not null references public.work_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  membership_role text not null check (membership_role in ('leader','participant')),
  joined_at timestamptz not null default now(),
  primary key(group_id,user_id)
);
create table public.group_updates (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.work_groups(id) on delete cascade,
  title text not null check(length(title) between 1 and 180),
  body text not null check(length(body) between 1 and 10000),
  is_public boolean not null default false,
  published_at timestamptz,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((is_public and published_at is not null) or (not is_public and published_at is null))
);
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.work_groups(id) on delete set null,
  slug text not null unique check(slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check(length(title) between 1 and 180),
  goal text not null default '' check(length(goal)<=5000),
  status text not null default 'draft' check(status in ('draft','active','paused','completed','archived')),
  is_public boolean not null default false,
  published_at timestamptz,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((is_public and published_at is not null) or (not is_public and published_at is null))
);
create table public.campaign_assignments (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  responsibility text not null default 'responsible' check(responsibility in ('responsible','contributor')),
  assigned_at timestamptz not null default now(),
  primary key(campaign_id,user_id)
);
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.work_groups(id) on delete restrict,
  campaign_id uuid references public.campaigns(id) on delete restrict,
  title text not null check(length(title) between 1 and 180),
  description text not null default '' check(length(description)<=10000),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(group_id is not null or campaign_id is not null)
);
create table public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check(length(title) between 1 and 240),
  description text not null default '' check(length(description)<=10000),
  status text not null default 'backlog' check(status in ('backlog','todo','in_progress','review','done')),
  priority text not null default 'normal' check(priority in ('low','normal','high','urgent')),
  position numeric(16,6) not null default 1000,
  due_at timestamptz,
  assignee_id uuid references public.profiles(id) on delete set null,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.project_tasks(id) on delete cascade,
  body text not null check(length(body) between 1 and 5000),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);
create table public.task_activity (
  id bigint generated always as identity primary key,
  task_id uuid not null references public.project_tasks(id) on delete cascade,
  actor_id uuid default auth.uid() references public.profiles(id),
  action text not null check(length(action)<=80),
  detail jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

-- Blog comments deliberately reference a stable news slug, so they work for file or DB-backed articles.
create table public.article_comments (
  id uuid primary key default gen_random_uuid(),
  post_slug text not null check(post_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  body text not null check(length(body) between 1 and 5000),
  status text not null default 'pending' check(status in ('pending','approved','rejected','hidden','deleted')),
  reporter_count integer not null default 0 check(reporter_count>=0),
  created_by uuid not null default auth.uid() references public.profiles(id),
  moderated_by uuid references public.profiles(id),
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.article_comments(id) on delete cascade,
  reporter_id uuid not null default auth.uid() references public.profiles(id),
  reason text not null check(length(reason) between 1 and 500),
  created_at timestamptz not null default now(),
  unique(comment_id,reporter_id)
);

-- This is the only public projection of a group. It intentionally omits purpose and membership data.
create view public.published_work_groups as
  select id, slug, name, public_summary, published_at
  from public.work_groups where is_public and published_at <= clock_timestamp();

create function public.is_group_member(target_group uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.has_role(array['administrator']) or (public.is_active_member() and exists(select 1 from public.work_group_memberships where group_id=target_group and user_id=auth.uid()));
$$;
create function public.can_manage_group(target_group uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.has_role(array['administrator']) or (public.has_role(array['group_leader']) and exists(select 1 from public.work_group_memberships where group_id=target_group and user_id=auth.uid() and membership_role='leader'));
$$;
create function public.can_manage_project(target_project uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.has_role(array['administrator']) or exists(
   select 1 from public.projects p where p.id=target_project and ((p.group_id is not null and public.can_manage_group(p.group_id)) or (p.campaign_id is not null and exists(select 1 from public.campaigns c where c.id=p.campaign_id and (c.group_id is null and public.has_role(array['administrator']) or c.group_id is not null and public.can_manage_group(c.group_id)))))
 );
$$;
create function public.can_view_project(target_project uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.can_manage_project(target_project) or exists(select 1 from public.projects p where p.id=target_project and ((p.group_id is not null and public.is_group_member(p.group_id)) or (p.campaign_id is not null and exists(select 1 from public.campaigns c where c.id=p.campaign_id and c.group_id is not null and public.is_group_member(c.group_id)))));
$$;
create function public.resolve_group_invitee(target_group uuid, input_email text) returns table(user_id uuid, display_name text) language plpgsql stable security definer set search_path='' as $$
begin
  if not public.can_manage_group(target_group) then raise exception 'forbidden' using errcode='42501'; end if;
  if not public.consume_rate_limit(lpad(md5('group-invite:' || auth.uid()::text),64,'0'),10,60) then raise exception 'rate_limited' using errcode='42901'; end if;
  return query select p.id,p.display_name from public.profiles p join auth.users u on u.id=p.id where lower(u.email)=lower(trim(input_email)) and p.approved and not p.suspended;
end $$;
create function public.updated_timestamp() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end $$;
create function public.task_activity_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if TG_OP='DELETE' then
    insert into public.task_activity(task_id,actor_id,action,detail) values(old.id,auth.uid(),TG_OP,jsonb_build_object('status',old.status,'assignee',old.assignee_id));
    return old;
  end if;
  insert into public.task_activity(task_id,actor_id,action,detail) values(new.id,auth.uid(),TG_OP,jsonb_build_object('status',new.status,'assignee',new.assignee_id));
  return new;
end $$;
create function public.count_comment_report() returns trigger language plpgsql security definer set search_path='' as $$ begin update public.article_comments set reporter_count=reporter_count+1 where id=new.comment_id; return new; end $$;
create function public.enforce_community_rate_limit() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if not public.consume_rate_limit(lpad(md5(TG_TABLE_NAME || ':' || coalesce(auth.uid()::text,'anonymous')),64,'0'),10,60) then
    raise exception 'rate_limited' using errcode='42901';
  end if;
  return new;
end $$;
create function public.enforce_task_assignee_membership() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.assignee_id is not null and not exists(
    select 1 from public.projects p
    left join public.campaigns c on c.id=p.campaign_id
    join public.work_group_memberships m on m.group_id=coalesce(p.group_id,c.group_id) and m.user_id=new.assignee_id
    where p.id=new.project_id
  ) then raise exception 'assignee_not_in_project_group' using errcode='42501'; end if;
  return new;
end $$;
create trigger work_groups_updated before update on public.work_groups for each row execute function public.updated_timestamp();
create trigger group_updates_updated before update on public.group_updates for each row execute function public.updated_timestamp();
create trigger campaigns_updated before update on public.campaigns for each row execute function public.updated_timestamp();
create trigger projects_updated before update on public.projects for each row execute function public.updated_timestamp();
create trigger tasks_updated before update on public.project_tasks for each row execute function public.updated_timestamp();
create trigger task_assignee_membership before insert or update of project_id,assignee_id on public.project_tasks for each row execute function public.enforce_task_assignee_membership();
create trigger comments_updated before update on public.article_comments for each row execute function public.updated_timestamp();
create trigger work_groups_audit after insert or update or delete on public.work_groups for each row execute function public.audit_change();
create trigger memberships_audit after insert or update or delete on public.work_group_memberships for each row execute function public.audit_change();
create trigger campaigns_audit after insert or update or delete on public.campaigns for each row execute function public.audit_change();
create trigger projects_audit after insert or update or delete on public.projects for each row execute function public.audit_change();
create trigger tasks_audit after insert or update or delete on public.project_tasks for each row execute function public.audit_change();
create trigger task_comments_audit after insert or update or delete on public.task_comments for each row execute function public.audit_change();
create trigger article_comments_audit after insert or update or delete on public.article_comments for each row execute function public.audit_change();
create trigger task_activity_after after insert or update on public.project_tasks for each row execute function public.task_activity_change();
create trigger comment_report_after after insert on public.comment_reports for each row execute function public.count_comment_report();
create trigger article_comment_rate_limit before insert on public.article_comments for each row execute function public.enforce_community_rate_limit();
create trigger comment_report_rate_limit before insert on public.comment_reports for each row execute function public.enforce_community_rate_limit();
create trigger group_membership_rate_limit before insert or update on public.work_group_memberships for each row execute function public.enforce_community_rate_limit();

alter table public.work_groups enable row level security;
alter table public.work_group_memberships enable row level security;
alter table public.group_updates enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_assignments enable row level security;
alter table public.projects enable row level security;
alter table public.project_tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_activity enable row level security;
alter table public.article_comments enable row level security;
alter table public.comment_reports enable row level security;
revoke all on public.work_groups,public.work_group_memberships,public.group_updates,public.campaigns,public.campaign_assignments,public.projects,public.project_tasks,public.task_comments,public.task_activity,public.article_comments,public.comment_reports from anon,authenticated;
grant select,insert,update,delete on public.work_groups,public.work_group_memberships,public.group_updates,public.campaigns,public.campaign_assignments,public.projects,public.project_tasks,public.task_comments,public.task_activity,public.article_comments,public.comment_reports to authenticated;
grant select on public.group_updates,public.campaigns,public.article_comments to anon;
grant select on public.published_work_groups to anon,authenticated;
grant all on public.work_groups,public.work_group_memberships,public.group_updates,public.campaigns,public.campaign_assignments,public.projects,public.project_tasks,public.task_comments,public.task_activity,public.article_comments,public.comment_reports to service_role;
grant usage,select on sequence public.task_activity_id_seq to authenticated,service_role;

create policy groups_private_or_member on public.work_groups for select using(public.is_group_member(id));
-- The directory exposes display names only through the base profile columns and only to people sharing a group. Auth email is never exposed.
create policy profiles_group_member_directory on public.profiles for select to authenticated using(public.is_active_member() and exists(select 1 from public.work_group_memberships mine join public.work_group_memberships theirs on theirs.group_id=mine.group_id where mine.user_id=auth.uid() and theirs.user_id=profiles.id));
create policy groups_manage on public.work_groups for all to authenticated using(public.has_role(array['administrator']) or public.can_manage_group(id)) with check(public.has_role(array['administrator']) or public.can_manage_group(id));
create policy memberships_read on public.work_group_memberships for select using(public.is_group_member(group_id));
create policy memberships_manage on public.work_group_memberships for all to authenticated using(public.can_manage_group(group_id)) with check(public.can_manage_group(group_id));
create policy updates_read on public.group_updates for select using(is_public or public.is_group_member(group_id));
create policy updates_manage on public.group_updates for all to authenticated using(public.can_manage_group(group_id)) with check(public.can_manage_group(group_id));
create policy campaigns_read on public.campaigns for select using(is_public or (group_id is not null and public.is_group_member(group_id)) or public.has_role(array['administrator']));
create policy campaigns_manage on public.campaigns for all to authenticated using(public.has_role(array['administrator']) or (group_id is not null and public.can_manage_group(group_id))) with check(public.has_role(array['administrator']) or (group_id is not null and public.can_manage_group(group_id)));
create policy campaign_assignments_read on public.campaign_assignments for select to authenticated using(exists(select 1 from public.campaigns c where c.id=campaign_id and (public.has_role(array['administrator']) or (c.group_id is not null and public.is_group_member(c.group_id)))));
create policy campaign_assignments_manage on public.campaign_assignments for all to authenticated using(exists(select 1 from public.campaigns c where c.id=campaign_id and (public.has_role(array['administrator']) or (c.group_id is not null and public.can_manage_group(c.group_id)))) ) with check(exists(select 1 from public.campaigns c where c.id=campaign_id and (public.has_role(array['administrator']) or (c.group_id is not null and public.can_manage_group(c.group_id)))));
create policy projects_read on public.projects for select using((group_id is not null and public.is_group_member(group_id)) or (campaign_id is not null and exists(select 1 from public.campaigns c where c.id=campaign_id and (c.group_id is null and public.has_role(array['administrator']) or c.group_id is not null and public.is_group_member(c.group_id)))) or public.has_role(array['administrator']));
create policy projects_manage on public.projects for all to authenticated using(public.can_manage_project(id)) with check((group_id is not null and public.can_manage_group(group_id)) or (campaign_id is not null and exists(select 1 from public.campaigns c where c.id=campaign_id and (c.group_id is null and public.has_role(array['administrator']) or c.group_id is not null and public.can_manage_group(c.group_id)))));
create policy tasks_read on public.project_tasks for select using(public.can_view_project(project_id));
create policy tasks_manage on public.project_tasks for all to authenticated using(public.can_manage_project(project_id)) with check(public.can_manage_project(project_id));
create policy task_comments_read on public.task_comments for select using(exists(select 1 from public.project_tasks t where t.id=task_id and public.can_view_project(t.project_id)));
create policy task_comments_create on public.task_comments for insert to authenticated with check(created_by=auth.uid() and exists(select 1 from public.project_tasks t where t.id=task_id and public.can_view_project(t.project_id)));
create policy task_comments_update on public.task_comments for update to authenticated using(created_by=auth.uid() or exists(select 1 from public.project_tasks t where t.id=task_id and public.can_manage_project(t.project_id))) with check(created_by=auth.uid() or exists(select 1 from public.project_tasks t where t.id=task_id and public.can_manage_project(t.project_id)));
create policy task_comments_delete on public.task_comments for delete to authenticated using(created_by=auth.uid() or exists(select 1 from public.project_tasks t where t.id=task_id and public.can_manage_project(t.project_id)));
create policy task_activity_read on public.task_activity for select using(exists(select 1 from public.project_tasks t where t.id=task_id and public.can_view_project(t.project_id)));
create policy public_comments_read on public.article_comments for select using(status='approved' or created_by=auth.uid() or public.has_role(array['moderator']));
create policy comment_create on public.article_comments for insert to authenticated with check(created_by=auth.uid() and status='pending' and public.is_active_member() and exists(select 1 from public.articles a where a.slug=post_slug and a.status='published' and a.published_at<=clock_timestamp()));
create policy comments_moderate on public.article_comments for update to authenticated using(public.has_role(array['moderator'])) with check(public.has_role(array['moderator']));
create policy comments_delete on public.article_comments for delete to authenticated using(public.has_role(array['moderator']));
create policy reports_create on public.comment_reports for insert to authenticated with check(reporter_id=auth.uid() and public.is_active_member());
create policy reports_read on public.comment_reports for select to authenticated using(public.has_role(array['moderator']));

revoke all on function public.is_group_member(uuid),public.can_manage_group(uuid),public.can_manage_project(uuid),public.can_view_project(uuid),public.resolve_group_invitee(uuid,text),public.updated_timestamp(),public.task_activity_change(),public.count_comment_report(),public.enforce_task_assignee_membership(),public.enforce_community_rate_limit() from public,anon,authenticated;
grant execute on function public.is_group_member(uuid) to anon,authenticated,service_role;
grant execute on function public.can_manage_group(uuid),public.can_manage_project(uuid),public.can_view_project(uuid) to authenticated,service_role;
grant execute on function public.resolve_group_invitee(uuid,text) to authenticated,service_role;
commit;
