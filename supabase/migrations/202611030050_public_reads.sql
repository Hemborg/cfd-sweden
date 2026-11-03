begin;
-- The anonymous client exercises the existing publication RLS policies.
-- Without table privileges PostgreSQL cannot evaluate those policies.
grant select on public.articles, public.events to anon;
commit;
