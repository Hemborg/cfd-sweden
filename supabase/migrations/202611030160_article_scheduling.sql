-- Preserve a Git source date in published_at for drafts without making them public.
-- The public RLS policy still requires status='published' and a passed date.
begin;
do $$
declare old_constraint text;
begin
  select conname into old_constraint
  from pg_constraint
  where conrelid = 'public.articles'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%status%'
    and pg_get_constraintdef(oid) like '%published_at%'
  limit 1;
  if old_constraint is null then
    raise exception 'articles draft/published_at constraint not found';
  end if;
  execute format('alter table public.articles drop constraint %I', old_constraint);
end $$;
commit;
