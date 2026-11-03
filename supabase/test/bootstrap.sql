-- Runs only inside the isolated synthetic test database. Passwords are set by
-- scripts/platform-local.mjs using parameterized SQL before Auth/REST start.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role authenticator login noinherit;
create role supabase_auth_admin login createrole;
alter role supabase_auth_admin set search_path=auth,public;
grant anon,authenticated,service_role to authenticator;
grant all on database cfd_platform_test to supabase_auth_admin;
create schema auth authorization supabase_auth_admin;
grant usage on schema public,auth to anon,authenticated,service_role;
grant create on schema public to supabase_auth_admin;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims',true)::jsonb->>'sub','')::uuid;
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb;
$$;
grant execute on function auth.uid(),auth.jwt() to anon,authenticated,service_role;
alter function auth.uid() owner to supabase_auth_admin;
alter function auth.jwt() owner to supabase_auth_admin;
