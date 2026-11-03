-- Follow-up communication safety: retain only delivery reconciliation metadata,
-- and project signed provider events onto the durable outbox.
begin;

alter table public.queue_mail add column if not exists delivery_status text
  check(delivery_status in ('accepted','delivered','bounced','complained'));
alter table public.queue_mail add column if not exists delivered_at timestamptz;
create index if not exists queue_mail_provider_id_idx on public.queue_mail(provider_id)
  where provider_id is not null;

create or replace function public.record_resend_webhook(event_id text,event_kind text,event_payload jsonb,event_recipient text)
returns boolean language plpgsql security definer set search_path='' as $$
declare consent uuid;
declare provider_message_id text := nullif(left(coalesce(event_payload->>'provider_message_id',''),200),'');
begin
  insert into public.resend_webhook_events(id,event_type,payload)
    values(event_id,event_kind,jsonb_build_object('provider_message_id',provider_message_id))
    on conflict(id) do nothing;
  if not found then return false; end if;

  if provider_message_id is not null then
    if event_kind='email.delivered' then
      update public.queue_mail set delivery_status='delivered',delivered_at=clock_timestamp(),updated_at=clock_timestamp()
        where provider_id=provider_message_id and delivery_transport='resend';
    elsif event_kind='email.bounced' then
      update public.queue_mail set delivery_status='bounced',updated_at=clock_timestamp()
        where provider_id=provider_message_id and delivery_transport='resend';
    elsif event_kind='email.complained' then
      update public.queue_mail set delivery_status='complained',updated_at=clock_timestamp()
        where provider_id=provider_message_id and delivery_transport='resend';
    end if;
  end if;

  if event_kind in ('email.bounced','email.complained') and event_recipient is not null then
    update public.newsletter_consents set suppressed_at=clock_timestamp(),suppression_reason=event_kind,updated_at=clock_timestamp()
      where email=lower(event_recipient) and status='confirmed' returning id into consent;
    if found then
      update public.queue_mail set status='superseded',updated_at=clock_timestamp(),last_error='Mottagaren har suppressats av leverantören.'
        where consent_id=consent and status in ('queued','retry','running');
    end if;
  end if;
  return true;
end $$;

commit;
