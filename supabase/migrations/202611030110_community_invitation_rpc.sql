begin;

-- PostgREST executes STABLE RPCs in a read-only transaction. Invitation
-- resolution consumes a durable rate-limit bucket, so it must be VOLATILE.
create or replace function public.resolve_group_invitee(target_group uuid, input_email text)
returns table(user_id uuid, display_name text)
language plpgsql volatile security definer set search_path='' as $$
begin
  if not public.can_manage_group(target_group) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  if not public.consume_rate_limit(lpad(md5('group-invite:' || auth.uid()::text),64,'0'),10,60) then
    raise exception 'rate_limited' using errcode='42901';
  end if;
  return query
    select p.id, p.display_name
    from public.profiles p
    join auth.users u on u.id=p.id
    where lower(u.email)=lower(trim(input_email))
      and p.approved
      and not p.suspended
    limit 1;
end $$;

revoke all on function public.resolve_group_invitee(uuid,text) from public,anon,authenticated;
grant execute on function public.resolve_group_invitee(uuid,text) to authenticated,service_role;
notify pgrst, 'reload schema';

commit;
