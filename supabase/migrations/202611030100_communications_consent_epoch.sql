-- A withdrawn consent can later be re-requested. Old campaign snapshots must
-- never become valid again merely because the same email has a new consent.
begin;

alter table public.newsletter_consents add column if not exists delivery_epoch uuid not null default pg_catalog.gen_random_uuid();
alter table public.newsletter_campaign_recipients add column if not exists consent_epoch uuid;
update public.newsletter_campaign_recipients r set consent_epoch=c.delivery_epoch from public.newsletter_consents c where c.id=r.consent_id and r.consent_epoch is null;
alter table public.newsletter_campaign_recipients alter column consent_epoch set not null;
alter table public.queue_mail add column if not exists consent_epoch uuid;

create or replace function public.rotate_newsletter_consent_epoch() returns trigger language plpgsql set search_path='' as $$
begin
  if new.status is distinct from old.status or new.suppressed_at is distinct from old.suppressed_at then
    new.delivery_epoch=pg_catalog.gen_random_uuid();
  end if;
  return new;
end $$;
drop trigger if exists newsletter_consent_epoch on public.newsletter_consents;
create trigger newsletter_consent_epoch before update on public.newsletter_consents for each row execute function public.rotate_newsletter_consent_epoch();

create or replace function public.snapshot_campaign_recipients(campaign uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  insert into public.newsletter_campaign_recipients(campaign_id,consent_id,email,consent_epoch)
  select campaign,c.id,c.email,c.delivery_epoch from public.newsletter_consents c
  where c.status='confirmed' and c.suppressed_at is null and c.unsubscribe_token_encrypted is not null
  on conflict(campaign_id,consent_id) do nothing;
end $$;

create or replace function public.claim_campaign_recipients(campaign uuid,worker_token uuid,maximum integer)
returns table(consent_id uuid,email text)
language plpgsql security definer set search_path='' as $$
begin
  if maximum<1 or maximum>100 then raise exception 'invalid recipient batch'; end if;
  return query with candidates as (
    select r.consent_id from public.newsletter_campaign_recipients r
    join public.newsletter_consents c on c.id=r.consent_id
    where r.campaign_id=campaign and r.status in ('pending','running')
      and (r.status='pending' or r.lease_expires_at<clock_timestamp())
      and c.status='confirmed' and c.suppressed_at is null and c.delivery_epoch=r.consent_epoch
    order by r.created_at for update of r skip locked limit maximum
  ), claimed as (
    update public.newsletter_campaign_recipients r set status='running',locked_at=clock_timestamp(),lease_expires_at=clock_timestamp()+interval '10 minutes',lock_token=worker_token,attempts=r.attempts+1,updated_at=clock_timestamp()
    from candidates x where r.campaign_id=campaign and r.consent_id=x.consent_id
    returning r.consent_id,r.email
  ) select * from claimed;
end $$;

create function public.enqueue_campaign_mail(campaign uuid,consent uuid,worker_token uuid,mail jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare epoch uuid;
begin
  select c.delivery_epoch into epoch
  from public.newsletter_campaign_recipients r
  join public.newsletter_consents c on c.id=r.consent_id
  join public.newsletter_campaigns n on n.id=r.campaign_id
  where r.campaign_id=campaign and r.consent_id=consent and r.status='running' and r.lock_token=worker_token
    and n.status='sending' and c.status='confirmed' and c.suppressed_at is null and c.delivery_epoch=r.consent_epoch
  for update of r,c,n;
  if not found then
    update public.newsletter_campaign_recipients set status='suppressed',locked_at=null,lease_expires_at=null,lock_token=null,updated_at=clock_timestamp()
      where campaign_id=campaign and consent_id=consent and lock_token=worker_token;
    return false;
  end if;
  insert into public.queue_mail(key,template,recipient,data,due,consent_id,consent_epoch)
  values(mail->>'key',mail->>'template',lower(mail->>'recipient'),mail->'data',(mail->>'due')::timestamptz,consent,epoch)
  on conflict(key) do nothing;
  update public.newsletter_campaign_recipients set status='queued',locked_at=null,lease_expires_at=null,lock_token=null,updated_at=clock_timestamp()
    where campaign_id=campaign and consent_id=consent and lock_token=worker_token;
  return true;
end $$;

create function public.refresh_campaign_delivery_status(mail_key text)
returns void language plpgsql security definer set search_path='' as $$
declare campaign uuid;
begin
  if split_part(mail_key,':',1) <> 'campaign' then return; end if;
  begin campaign := split_part(mail_key,':',2)::uuid; exception when others then return; end;
  if exists(select 1 from public.newsletter_campaigns where id=campaign and status='cancelled') then return; end if;
  if exists(select 1 from public.queue_mail where key like ('campaign:'||campaign::text||':%') and status in ('queued','retry','running')) then return; end if;
  if exists(select 1 from public.queue_mail where key like ('campaign:'||campaign::text||':%') and status in ('failed','unknown')) then
    update public.newsletter_campaigns set status='failed',updated_at=clock_timestamp() where id=campaign and status='queued';
  elsif exists(select 1 from public.queue_mail where key like ('campaign:'||campaign::text||':%')) then
    update public.newsletter_campaigns set status='sent',updated_at=clock_timestamp() where id=campaign and status='queued';
  end if;
end $$;

create or replace function public.complete_queue_mail(mail_key text, worker_token uuid, outcome text, provider_message_id text, failure text)
returns void language plpgsql security definer set search_path='' as $$
declare age interval;
begin
  select clock_timestamp()-first_attempt_at into age from public.queue_mail where key=mail_key and status='running' and lock_token=worker_token for update;
  if not found then raise exception 'mail lease lost'; end if;
  if outcome='sent' then
    update public.queue_mail set status='sent',delivery_status=case when delivery_transport='resend' then 'accepted' else delivery_status end,sent_at=clock_timestamp(),provider_id=provider_message_id,locked_at=null,lease_expires_at=null,lock_token=null,last_error=null,updated_at=clock_timestamp() where key=mail_key and lock_token=worker_token;
  elsif outcome='retry' and age < interval '24 hours' then
    update public.queue_mail set status='retry',due=clock_timestamp()+make_interval(secs=>least(3600,60*(2^least(attempts,6)))),locked_at=null,lease_expires_at=null,lock_token=null,last_error=failure,updated_at=clock_timestamp() where key=mail_key and lock_token=worker_token;
  elsif outcome in ('retry','unknown') then
    update public.queue_mail set status='unknown',locked_at=null,lease_expires_at=null,lock_token=null,last_error=coalesce(failure,'Providerresultat okänt; manuell avstämning krävs.'),updated_at=clock_timestamp() where key=mail_key and lock_token=worker_token;
  elsif outcome='failed' then
    update public.queue_mail set status='failed',locked_at=null,lease_expires_at=null,lock_token=null,last_error=failure,updated_at=clock_timestamp() where key=mail_key and lock_token=worker_token;
  else raise exception 'invalid queue outcome'; end if;
  perform public.refresh_campaign_delivery_status(mail_key);
end $$;

drop function public.claim_queue_mail(uuid,integer);
create function public.claim_queue_mail(worker_token uuid, maximum integer)
returns setof public.queue_mail language plpgsql security definer set search_path='' as $$
begin
  if maximum<1 or maximum>50 then raise exception 'invalid queue batch'; end if;
  update public.queue_mail set status='unknown',locked_at=null,lock_token=null,lease_expires_at=null,
    last_error='Tidigare transportresultat är okänt; manuell avstämning krävs.',updated_at=clock_timestamp()
    where status='running' and lease_expires_at<clock_timestamp() and first_attempt_at<clock_timestamp()-interval '24 hours';
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

revoke all on function public.rotate_newsletter_consent_epoch(),public.enqueue_campaign_mail(uuid,uuid,uuid,jsonb),public.refresh_campaign_delivery_status(text) from public,anon,authenticated;
grant execute on function public.enqueue_campaign_mail(uuid,uuid,uuid,jsonb),public.complete_queue_mail(text,uuid,text,text,text) to service_role;

commit;
