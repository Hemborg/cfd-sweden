begin;
-- Every accepted rate window is <=24 hours. Expired hashes are operational
-- counters, not consent evidence, and must not grow indefinitely.
create function public.prune_rate_limits() returns integer
language plpgsql security definer set search_path='' as $$
declare removed integer;
begin
  delete from public.rate_limits where bucket in (
    select bucket from public.rate_limits
    where window_start < clock_timestamp() - interval '2 days'
    order by window_start limit 10000 for update skip locked
  );
  get diagnostics removed = row_count;
  return removed;
end $$;
revoke all on function public.prune_rate_limits() from public, anon, authenticated;
grant execute on function public.prune_rate_limits() to service_role;
create index rate_limits_expiry on public.rate_limits(window_start);
commit;
