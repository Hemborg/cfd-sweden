-- Communications production model. Apply only to an approved Supabase project.
-- It upgrades the prototype tables; it does not create a competing contact or consent model.
-- The old form_notification_outbox deliberately remains demo-only: it lacks a
-- recipient, payload, due time, provider identity, and lease so its historical
-- rows cannot be delivered safely. queue_mail is its durable successor and all
-- new contact/newsletter writes below use it in the same transaction.
begin;

alter table public.contact_submissions add column if not exists assigned_to uuid references public.profiles(id);
alter table public.contact_submissions add column if not exists inquiry_type text not null default 'contact' check(inquiry_type in ('join','contact'));
alter table public.contact_submissions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.contact_submissions add column if not exists updated_at timestamptz not null default now();
alter table public.contact_submissions drop constraint if exists contact_submissions_status_check;
update public.contact_submissions set status='new' where status in ('received','notified');
alter table public.contact_submissions add constraint contact_submissions_status_check check(status in ('new','in_progress','responded','closed'));
create index if not exists contact_submissions_status_created_idx on public.contact_submissions(status,created_at desc);
create index if not exists contact_submissions_assigned_idx on public.contact_submissions(assigned_to) where assigned_to is not null;

alter table public.newsletter_consents add column if not exists suppressed_at timestamptz;
alter table public.newsletter_consents add column if not exists suppression_reason text;
alter table public.newsletter_consents add column if not exists updated_at timestamptz not null default now();
alter table public.newsletter_consents add column if not exists unsubscribe_token_encrypted jsonb;
alter table public.newsletter_consent_events add column if not exists provider_event_id text unique;

-- A prototype intent has no recipient or recoverable token and must never be
-- delivered by the production worker. Retire it atomically when this durable
-- successor is installed; old RPCs/tests remain available only as regression
-- coverage for the pre-platform demo.
update public.form_notification_outbox set status='superseded' where status='queued';

create table if not exists public.queue_mail (
  key text primary key check(key ~ '^[A-Za-z0-9_:/.-]{8,200}$'),
  template text not null check(template in ('contact-received','contact-owner-notification','newsletter-confirmation','newsletter-confirmed','portal-invitation','account-recovery','welcome','event-registration','event-cancelled','event-waitlist','event-practical-info','group-invitation','task-assignment','campaign-newsletter')),
  recipient text not null,
  data jsonb not null,
  due timestamptz not null default now(),
  consent_id uuid references public.newsletter_consents(id),
  status text not null default 'queued' check(status in ('queued','running','sent','retry','unknown','failed','superseded')),
  attempts integer not null default 0 check(attempts >= 0),
  first_attempt_at timestamptz,
  locked_at timestamptz,
  lease_expires_at timestamptz,
  delivery_transport text check(delivery_transport in ('smtp','resend')),
  lock_token uuid,
  sent_at timestamptz,
  provider_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists queue_mail_claim_idx on public.queue_mail(due,key) where status in ('queued','retry');
create index if not exists queue_mail_consent_idx on public.queue_mail(consent_id) where consent_id is not null;

create table if not exists public.resend_webhook_events (
  id text primary key,
  received_at timestamptz not null default now(),
  event_type text not null,
  payload jsonb not null
);

-- Webhook receipt, suppression and cancellation of unsent deliveries are one
-- transaction. A replayed provider ID does nothing and cannot reapply state.
create function public.record_resend_webhook(event_id text,event_kind text,event_payload jsonb,event_recipient text)
returns boolean language plpgsql security definer set search_path='' as $$
declare consent uuid;
begin
  insert into public.resend_webhook_events(id,event_type,payload) values(event_id,event_kind,event_payload) on conflict(id) do nothing;
  if not found then return false; end if;
  if event_kind in ('email.bounced','email.complained') and event_recipient is not null then
    update public.newsletter_consents set suppressed_at=clock_timestamp(),suppression_reason=event_kind,updated_at=clock_timestamp()
      where email=lower(event_recipient) and status='confirmed' returning id into consent;
    if found then update public.queue_mail set status='superseded',updated_at=clock_timestamp(),last_error='Mottagaren har suppressats av leverantören.' where consent_id=consent and status in ('queued','retry','running'); end if;
  end if;
  return true;
end $$;

create table if not exists public.newsletter_campaigns (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  subject text not null check(length(subject)<=200),
  html text not null check(length(html)<=200000),
  text_body text not null check(length(text_body)<=100000),
  status text not null default 'draft' check(status in ('draft','scheduled','sending','queued','sent','cancelled','failed')),
  scheduled_for timestamptz,
  lock_token uuid,
  lease_expires_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.newsletter_campaign_recipients (
  campaign_id uuid not null references public.newsletter_campaigns(id) on delete cascade,
  consent_id uuid not null references public.newsletter_consents(id),
  email text not null,
  status text not null default 'pending' check(status in ('pending','running','queued','suppressed')),
  locked_at timestamptz,
  lease_expires_at timestamptz,
  lock_token uuid,
  attempts integer not null default 0 check(attempts>=0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(campaign_id,consent_id)
);
create function public.protect_newsletter_campaign() returns trigger language plpgsql set search_path='' as $$
begin
  if old.status not in ('draft','scheduled') and (new.subject,new.html,new.text_body,new.scheduled_for) is distinct from (old.subject,old.html,old.text_body,old.scheduled_for) then
    raise exception 'campaign content immutable after dispatch begins';
  end if;
  return new;
end $$;
create trigger newsletter_campaign_immutable before update on public.newsletter_campaigns for each row execute function public.protect_newsletter_campaign();
create index if not exists campaign_recipients_claim_idx on public.newsletter_campaign_recipients(campaign_id,status,created_at) where status in ('pending','running');

create function public.enqueue_queue_mail(mail_key text, mail_template text, mail_recipient text, mail_data jsonb, mail_due timestamptz, mail_consent uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if mail_key !~ '^[A-Za-z0-9_:/.-]{8,200}$' or length(mail_recipient)>254 then raise exception 'invalid mail queue input'; end if;
  -- Queue SQL can atomically emit only opaque event registration references.
  -- Every other payload must be an app-created AEAD envelope; in particular,
  -- SQL may not persist a URL, one-time token, message body, or title.
  if mail_data ? 'reference' then
    if mail_template not in ('event-registration','event-waitlist','event-cancelled')
       or mail_data <> jsonb_build_object('reference', jsonb_build_object('type', 'event-registration', 'id', mail_data->'reference'->>'id'))
       or coalesce(mail_data->'reference'->>'id','') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
    then raise exception 'invalid mail reference'; end if;
  elsif not (mail_data->>'v'='1' and mail_data ? 'iv' and mail_data ? 'ciphertext' and mail_data ? 'tag') then
    raise exception 'mail payload must be encrypted';
  end if;
  insert into public.queue_mail(key,template,recipient,data,due,consent_id)
  values(mail_key,mail_template,lower(mail_recipient),mail_data,mail_due,mail_consent)
  on conflict(key) do nothing;
end $$;

create function public.claim_queue_mail(worker_token uuid, maximum integer)
returns table(key text, template text, recipient text, data jsonb, attempts integer, consent_id uuid)
language plpgsql security definer set search_path='' as $$
begin
  if maximum < 1 or maximum > 50 then raise exception 'invalid batch size'; end if;
  -- A crashed worker may leave a lease behind. Before its provider-idempotency
  -- window ends it can be reclaimed with the exact same queue key; afterwards
  -- it is unknown rather than being retried blindly.
  update public.queue_mail
    set status='unknown', locked_at=null, lock_token=null, lease_expires_at=null,
        last_error='Arbetarlease löpte ut efter leverantörens idempotensfönster; manuell avstämning krävs.', updated_at=clock_timestamp()
    where status='running' and lease_expires_at < clock_timestamp()
      and first_attempt_at <= clock_timestamp()-interval '24 hours';
  update public.queue_mail set status='unknown',locked_at=null,lock_token=null,lease_expires_at=null,
      last_error='SMTP-lease löpte ut; leveransresultatet är okänt och återförsöks inte blint.',updated_at=clock_timestamp()
    where status='running' and delivery_transport='smtp' and lease_expires_at < clock_timestamp();
  return query
  with candidates as (
    select q.key from public.queue_mail q
    where (q.status in ('queued','retry') and q.due<=clock_timestamp()
      or q.status='running' and q.lease_expires_at < clock_timestamp() and q.first_attempt_at > clock_timestamp()-interval '24 hours' and coalesce(q.delivery_transport,'resend')<>'smtp')
      -- Double opt-in confirmation is the one consent-linked message that
      -- must run while consent is still pending. All later linked mail is
      -- blocked unless the recipient remains confirmed and unsuppressed.
      and (q.consent_id is null or q.template='newsletter-confirmation' or exists(select 1 from public.newsletter_consents c where c.id=q.consent_id and c.status='confirmed' and c.suppressed_at is null))
    order by q.due,q.key for update skip locked limit maximum
  ), claimed as (
    update public.queue_mail q set status='running', locked_at=clock_timestamp(), lease_expires_at=clock_timestamp()+interval '10 minutes', lock_token=worker_token,
      attempts=q.attempts+1, first_attempt_at=coalesce(q.first_attempt_at,clock_timestamp()), updated_at=clock_timestamp()
    from candidates c where q.key=c.key
    returning q.key,q.template,q.recipient,q.data,q.attempts,q.consent_id
  ) select * from claimed;
end $$;

create function public.mark_queue_mail_transport(mail_key text, worker_token uuid, transport_name text)
returns void language plpgsql security definer set search_path='' as $$
begin
  update public.queue_mail set delivery_transport=transport_name where key=mail_key and status='running' and lock_token=worker_token and transport_name in ('smtp','resend');
  if not found then raise exception 'mail lease lost'; end if;
end $$;

create function public.complete_queue_mail(mail_key text, worker_token uuid, outcome text, provider_message_id text, failure text)
returns void language plpgsql security definer set search_path='' as $$
declare age interval;
begin
  select clock_timestamp()-first_attempt_at into age from public.queue_mail where key=mail_key and status='running' and lock_token=worker_token for update;
  if not found then raise exception 'mail lease lost'; end if;
  if outcome='sent' then
    update public.queue_mail set status='sent',sent_at=clock_timestamp(),provider_id=provider_message_id,locked_at=null,lease_expires_at=null,lock_token=null,last_error=null,updated_at=clock_timestamp() where key=mail_key and lock_token=worker_token;
  elsif outcome='retry' and age < interval '24 hours' then
    update public.queue_mail set status='retry',due=clock_timestamp()+make_interval(secs=>least(3600,60*(2^least(attempts,6)))),locked_at=null,lease_expires_at=null,lock_token=null,last_error=failure,updated_at=clock_timestamp() where key=mail_key and lock_token=worker_token;
  elsif outcome in ('retry','unknown') then
    update public.queue_mail set status='unknown',locked_at=null,lease_expires_at=null,lock_token=null,last_error=coalesce(failure,'Providerresultat okänt; manuell avstämning krävs.'),updated_at=clock_timestamp() where key=mail_key and lock_token=worker_token;
  elsif outcome='failed' then
    update public.queue_mail set status='failed',locked_at=null,lease_expires_at=null,lock_token=null,last_error=failure,updated_at=clock_timestamp() where key=mail_key and lock_token=worker_token;
  else raise exception 'invalid queue outcome'; end if;
end $$;

create function public.record_worker_heartbeat(processed integer)
returns void language sql security definer set search_path='' as $$
  insert into public.platform_settings(key,value,updated_at) values('worker_heartbeat',jsonb_build_object('at',clock_timestamp(),'processed',processed),clock_timestamp())
  on conflict(key) do update set value=excluded.value,updated_at=excluded.updated_at
$$;

-- Retention is deliberately a no-op until an administrator has explicitly
-- approved a bounded contactDays policy. Consent evidence is not deleted here.
create function public.apply_communications_retention()
returns integer language plpgsql security definer set search_path='' as $$
declare policy jsonb; days integer; deleted integer;
begin
  select value into policy from public.platform_settings where key='retention' for update;
  if coalesce((policy->>'approved')::boolean,false) is not true then return 0; end if;
  begin days := (policy->>'contactDays')::integer; exception when others then return 0; end;
  if days<1 or days>3650 then return 0; end if;
  delete from public.contact_submissions where created_at < clock_timestamp()-make_interval(days=>days);
  get diagnostics deleted=row_count; return deleted;
end $$;

create function public.claim_due_newsletter_campaigns(worker_token uuid, maximum integer)
returns table(id uuid,subject text,html text,text_body text)
language plpgsql security definer set search_path='' as $$
begin
  if maximum<1 or maximum>10 then raise exception 'invalid campaign batch'; end if;
  return query with candidates as (
    select c.id from public.newsletter_campaigns c
    where (c.status='scheduled' and c.scheduled_for<=clock_timestamp())
       or (c.status='sending' and c.lease_expires_at<clock_timestamp())
    order by c.scheduled_for,c.id for update skip locked limit maximum
  ), claimed as (
    update public.newsletter_campaigns c set status='sending',lock_token=worker_token,lease_expires_at=clock_timestamp()+interval '10 minutes',updated_at=clock_timestamp()
    from candidates x where c.id=x.id returning c.id,c.subject,c.html,c.text_body
  ) select * from claimed;
end $$;

create function public.snapshot_campaign_recipients(campaign uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  insert into public.newsletter_campaign_recipients(campaign_id,consent_id,email)
  select campaign,c.id,c.email from public.newsletter_consents c
  where c.status='confirmed' and c.suppressed_at is null and c.unsubscribe_token_encrypted is not null
  on conflict(campaign_id,consent_id) do nothing;
end $$;

create function public.claim_campaign_recipients(campaign uuid,worker_token uuid,maximum integer)
returns table(consent_id uuid,email text)
language plpgsql security definer set search_path='' as $$
begin
  if maximum<1 or maximum>100 then raise exception 'invalid recipient batch'; end if;
  return query with candidates as (
    select r.consent_id from public.newsletter_campaign_recipients r
    join public.newsletter_consents c on c.id=r.consent_id
    where r.campaign_id=campaign and r.status in ('pending','running')
      and (r.status='pending' or r.lease_expires_at<clock_timestamp())
      and c.status='confirmed' and c.suppressed_at is null
    order by r.created_at for update of r skip locked limit maximum
  ), claimed as (
    update public.newsletter_campaign_recipients r set status='running',locked_at=clock_timestamp(),lease_expires_at=clock_timestamp()+interval '10 minutes',lock_token=worker_token,attempts=r.attempts+1,updated_at=clock_timestamp()
    from candidates x where r.campaign_id=campaign and r.consent_id=x.consent_id
    returning r.consent_id,r.email
  ) select * from claimed;
end $$;

create function public.complete_campaign_recipient(campaign uuid,consent uuid,worker_token uuid,outcome text)
returns void language plpgsql security definer set search_path='' as $$
begin
  update public.newsletter_campaign_recipients set status=outcome,locked_at=null,lease_expires_at=null,lock_token=null,updated_at=clock_timestamp()
  where campaign_id=campaign and consent_id=consent and lock_token=worker_token and outcome in ('queued','suppressed');
  if not found then raise exception 'campaign recipient lease lost'; end if;
end $$;

create function public.finish_campaign_expansion(campaign uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.newsletter_campaign_recipients where campaign_id=campaign and status in ('pending','running')) then
    update public.newsletter_campaigns set status='queued',lock_token=null,lease_expires_at=null,updated_at=clock_timestamp() where id=campaign and status='sending';
  end if;
end $$;

create function public.cancel_newsletter_campaign(campaign uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  update public.newsletter_campaigns set status='cancelled',lock_token=null,lease_expires_at=null,updated_at=clock_timestamp()
    where id=campaign and status in ('draft','scheduled','sending','queued');
  if not found then return false; end if;
  update public.newsletter_campaign_recipients set status='suppressed',locked_at=null,lease_expires_at=null,lock_token=null,updated_at=clock_timestamp()
    where campaign_id=campaign and status in ('pending','running');
  update public.queue_mail set status='superseded',updated_at=clock_timestamp(),last_error='Kampanjen avbröts av administratör.'
    where key like ('campaign:'||campaign::text||':%') and status in ('queued','retry','running');
  return true;
end $$;

create function public.resolve_unknown_mail(mail_key text,resolution text,provider_message_id text,evidence text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if resolution not in ('sent','superseded') or length(coalesce(evidence,''))<5 then raise exception 'invalid reconciliation'; end if;
  update public.queue_mail set status=resolution,sent_at=case when resolution='sent' then clock_timestamp() else sent_at end,provider_id=coalesce(provider_message_id,provider_id),last_error='Manuellt avstämd: '||left(evidence,400),updated_at=clock_timestamp()
    where key=mail_key and status='unknown';
  if not found then raise exception 'unknown mail missing'; end if;
end $$;

create function public.create_contact_and_queue(submission jsonb, receipt jsonb, owner_notice jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare saved public.contact_submissions;
begin
  insert into public.contact_submissions(id,created_at,email,first_name,last_name,city,message,metadata,category,inquiry_type,event_slug,status,idempotency_key)
  values((submission->>'id')::uuid,(submission->>'createdAt')::timestamptz,lower(submission->>'email'),nullif(submission->>'firstName',''),nullif(submission->>'lastName',''),nullif(submission->>'city',''),nullif(submission->>'message',''),coalesce(submission->'metadata','{}'::jsonb),submission->>'category',coalesce(submission->>'inquiryType','contact'),nullif(submission->>'eventSlug',''),'new',(submission->>'idempotencyKey')::uuid)
  on conflict(idempotency_key) do nothing returning * into saved;
  if not found then
    select * into saved from public.contact_submissions where idempotency_key=(submission->>'idempotencyKey')::uuid;
    return jsonb_build_object('submission',to_jsonb(saved),'created',false);
  end if;
  perform public.enqueue_queue_mail(receipt->>'key',receipt->>'template',receipt->>'recipient',receipt->'data',(receipt->>'due')::timestamptz,null);
  perform public.enqueue_queue_mail(owner_notice->>'key',owner_notice->>'template',owner_notice->>'recipient',owner_notice->'data',(owner_notice->>'due')::timestamptz,null);
  return jsonb_build_object('submission',to_jsonb(saved),'created',true);
end $$;

create function public.request_newsletter_with_queue(consent jsonb, mail jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare saved public.newsletter_consents;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(lower(consent->>'email'),0));
  select * into saved from public.newsletter_consents where email=lower(consent->>'email') for update;
  if found and saved.status='confirmed' and saved.suppressed_at is null then return jsonb_build_object('consent',to_jsonb(saved),'created',false,'state','confirmed'); end if;
  if found and saved.status='pending' and saved.confirm_token_expires_at>clock_timestamp() then return jsonb_build_object('consent',to_jsonb(saved),'created',false,'state','pending'); end if;
  insert into public.newsletter_consents(id,email,source,consent_text_version,status,requested_at,confirmed_at,withdrawn_at,confirm_token_hash,confirm_token_expires_at,unsubscribe_token_hash,unsubscribe_token_encrypted,suppressed_at,suppression_reason,updated_at)
  values((consent->>'id')::uuid,lower(consent->>'email'),consent->>'source',consent->>'consentTextVersion','pending',clock_timestamp(),null,null,consent->>'confirmTokenHash',(consent->>'confirmTokenExpiresAt')::timestamptz,consent->>'unsubscribeTokenHash',consent->'unsubscribeTokenEncrypted',null,null,clock_timestamp())
  on conflict(email) do update set source=excluded.source,consent_text_version=excluded.consent_text_version,status='pending',requested_at=excluded.requested_at,confirmed_at=null,withdrawn_at=null,confirm_token_hash=excluded.confirm_token_hash,confirm_token_expires_at=excluded.confirm_token_expires_at,suppressed_at=null,suppression_reason=null,updated_at=clock_timestamp()
  returning * into saved;
  insert into public.newsletter_consent_events(consent_id,event_type,source,consent_text_version) values(saved.id,'requested',saved.source,saved.consent_text_version);
  update public.queue_mail set status='superseded',updated_at=clock_timestamp() where consent_id=saved.id and template='newsletter-confirmation' and status in ('queued','retry','running');
  perform public.enqueue_queue_mail(mail->>'key',mail->>'template',mail->>'recipient',mail->'data',(mail->>'due')::timestamptz,saved.id);
  return jsonb_build_object('consent',to_jsonb(saved),'created',true,'state','requested');
end $$;

-- Confirmation is a single transaction: it consumes the one-time hash,
-- records immutable consent evidence and queues the post-confirmation mail.
-- The caller reads/decrypts the unsubscribe token before this RPC and supplies
-- only an encrypted queue payload, so neither raw token is persisted.
create function public.confirm_newsletter_and_queue(token_hash text, occurred_at timestamptz, mail jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare affected public.newsletter_consents;
begin
  update public.newsletter_consents set status='confirmed',confirmed_at=occurred_at,confirm_token_hash=null,confirm_token_expires_at=null,updated_at=clock_timestamp()
  where status='pending' and confirm_token_hash=token_hash and confirm_token_expires_at>occurred_at returning * into affected;
  if not found then return false; end if;
  insert into public.newsletter_consent_events(consent_id,occurred_at,event_type,source,consent_text_version) values(affected.id,occurred_at,'confirmed',affected.source,affected.consent_text_version);
  update public.queue_mail set status='superseded',updated_at=clock_timestamp() where consent_id=affected.id and template='newsletter-confirmation' and status in ('queued','retry','running');
  perform public.enqueue_queue_mail(mail->>'key',mail->>'template',mail->>'recipient',mail->'data',(mail->>'due')::timestamptz,affected.id);
  return true;
end $$;

create or replace function public.withdraw_newsletter_consent(token_hash text, occurred_at timestamptz)
returns boolean language plpgsql security definer set search_path='' as $$
declare affected public.newsletter_consents;
begin
  update public.newsletter_consents set status='withdrawn',withdrawn_at=occurred_at,confirm_token_hash=null,confirm_token_expires_at=null,suppressed_at=occurred_at,suppression_reason='unsubscribe',updated_at=clock_timestamp()
  where status<>'withdrawn' and unsubscribe_token_hash=token_hash returning * into affected;
  if not found then return false; end if;
  insert into public.newsletter_consent_events(consent_id,occurred_at,event_type,source,consent_text_version) values(affected.id,occurred_at,'withdrawn',affected.source,affected.consent_text_version);
  update public.form_notification_outbox set status='superseded' where submission_id=affected.id and kind='newsletter-confirmation' and status='queued';
  update public.queue_mail set status='superseded',updated_at=clock_timestamp() where consent_id=affected.id and status in ('queued','retry','running');
  return true;
end $$;

alter table public.queue_mail enable row level security;
alter table public.resend_webhook_events enable row level security;
alter table public.newsletter_campaigns enable row level security;
alter table public.newsletter_campaign_recipients enable row level security;
revoke all on public.queue_mail,public.resend_webhook_events,public.newsletter_campaigns,public.newsletter_campaign_recipients from public,anon,authenticated;
grant all on public.queue_mail,public.resend_webhook_events,public.newsletter_campaigns,public.newsletter_campaign_recipients to service_role;
grant select,update,delete on public.contact_submissions to authenticated; grant select on public.newsletter_consents,public.newsletter_consent_events to authenticated; grant select,insert,update,delete on public.newsletter_campaigns to authenticated;
create policy contacts_admin on public.contact_submissions for all to authenticated using(public.has_role(array['administrator'])) with check(public.has_role(array['administrator']));
create policy consents_admin on public.newsletter_consents for select to authenticated using(public.has_role(array['administrator']));
create policy consent_events_admin on public.newsletter_consent_events for select to authenticated using(public.has_role(array['administrator']));
create policy campaigns_admin on public.newsletter_campaigns for all to authenticated using(public.has_role(array['administrator'])) with check(public.has_role(array['administrator']));

revoke all on function public.enqueue_queue_mail(text,text,text,jsonb,timestamptz,uuid),public.claim_queue_mail(uuid,integer),public.mark_queue_mail_transport(text,uuid,text),public.complete_queue_mail(text,uuid,text,text,text),public.record_worker_heartbeat(integer),public.claim_due_newsletter_campaigns(uuid,integer),public.snapshot_campaign_recipients(uuid),public.claim_campaign_recipients(uuid,uuid,integer),public.complete_campaign_recipient(uuid,uuid,uuid,text),public.finish_campaign_expansion(uuid),public.cancel_newsletter_campaign(uuid),public.resolve_unknown_mail(text,text,text,text) from public,anon,authenticated;
revoke all on function public.create_contact_and_queue(jsonb,jsonb,jsonb),public.request_newsletter_with_queue(jsonb,jsonb),public.confirm_newsletter_and_queue(text,timestamptz,jsonb) from public,anon,authenticated;
revoke all on function public.record_resend_webhook(text,text,jsonb,text) from public,anon,authenticated;
revoke all on function public.apply_communications_retention() from public,anon,authenticated;
grant execute on function public.enqueue_queue_mail(text,text,text,jsonb,timestamptz,uuid),public.claim_queue_mail(uuid,integer),public.mark_queue_mail_transport(text,uuid,text),public.complete_queue_mail(text,uuid,text,text,text),public.record_worker_heartbeat(integer),public.claim_due_newsletter_campaigns(uuid,integer),public.snapshot_campaign_recipients(uuid),public.claim_campaign_recipients(uuid,uuid,integer),public.complete_campaign_recipient(uuid,uuid,uuid,text),public.finish_campaign_expansion(uuid),public.cancel_newsletter_campaign(uuid),public.resolve_unknown_mail(text,text,text,text),public.create_contact_and_queue(jsonb,jsonb,jsonb),public.request_newsletter_with_queue(jsonb,jsonb),public.confirm_newsletter_and_queue(text,timestamptz,jsonb) to service_role;
grant execute on function public.record_resend_webhook(text,text,jsonb,text) to service_role;
grant execute on function public.apply_communications_retention() to service_role;
commit;
