-- A transport crash has different recovery semantics. SMTP has no durable
-- provider idempotency contract, while Resend may be retried with the same key
-- during its 24-hour idempotency window.
begin;

drop function public.claim_queue_mail(uuid,integer);
create function public.claim_queue_mail(worker_token uuid, maximum integer)
returns setof public.queue_mail language plpgsql security definer set search_path='' as $$
begin
  if maximum<1 or maximum>50 then raise exception 'invalid queue batch'; end if;
  update public.queue_mail set status='retry',due=clock_timestamp(),locked_at=null,lock_token=null,lease_expires_at=null,
    last_error='Resend-leasen gick ut före bekräftat utfall; återförsöks med samma idempotensnyckel.',updated_at=clock_timestamp()
    where status='running' and lease_expires_at<clock_timestamp() and delivery_transport='resend'
      and first_attempt_at>=clock_timestamp()-interval '24 hours'
      and (consent_epoch is null or exists(select 1 from public.newsletter_consents c where c.id=queue_mail.consent_id and c.delivery_epoch=queue_mail.consent_epoch and c.status='confirmed' and c.suppressed_at is null));
  update public.queue_mail set status='unknown',locked_at=null,lock_token=null,lease_expires_at=null,
    last_error='Transportresultatet är okänt; manuell avstämning krävs.',updated_at=clock_timestamp()
    where status='running' and lease_expires_at<clock_timestamp();
  return query with candidates as (
    select q.key from public.queue_mail q left join public.newsletter_consents c on c.id=q.consent_id
    where q.status in ('queued','retry') and q.due<=clock_timestamp()
      and (q.consent_epoch is null or (c.delivery_epoch=q.consent_epoch and c.status='confirmed' and c.suppressed_at is null))
    order by q.due,q.key for update of q skip locked limit maximum
  ), claimed as (
    update public.queue_mail q set status='running',locked_at=clock_timestamp(),lease_expires_at=clock_timestamp()+interval '10 minutes',lock_token=worker_token,
      attempts=q.attempts+1,first_attempt_at=coalesce(q.first_attempt_at,clock_timestamp()),updated_at=clock_timestamp()
    from candidates x where q.key=x.key returning q.*
  ) select * from claimed;
end $$;

revoke all on function public.claim_queue_mail(uuid,integer) from public,anon,authenticated;
grant execute on function public.claim_queue_mail(uuid,integer) to service_role;
commit;
