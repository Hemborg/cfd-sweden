-- Recreating claim_queue_mail after adding consent_epoch replaces its previous
-- grant. The worker uses the server-only service role only.
begin;
revoke all on function public.claim_queue_mail(uuid,integer) from public,anon,authenticated;
grant execute on function public.claim_queue_mail(uuid,integer) to service_role;
commit;
