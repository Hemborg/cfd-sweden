-- Prototype schema only. Do not apply before the association approves retention,
-- data processor terms, access owners, and the server deployment configuration.
-- Requires PostgreSQL 13+ (built-in pg_catalog.gen_random_uuid).
begin;

create table if not exists public.contact_submissions (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null,
  first_name text,
  last_name text,
  city text,
  message text,
  category text not null check (category in ('general', 'event')),
  event_slug text,
  status text not null default 'received' check (status in ('received', 'notified')),
  idempotency_key uuid not null unique
);

create table if not exists public.newsletter_consents (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  email text not null unique,
  source text not null,
  consent_text_version text not null default 'unreviewed-prototype',
  status text not null check (status in ('pending', 'confirmed', 'withdrawn')),
  requested_at timestamptz not null,
  confirmed_at timestamptz,
  withdrawn_at timestamptz,
  confirm_token_hash text unique,
  confirm_token_expires_at timestamptz,
  unsubscribe_token_hash text not null unique
);

create table if not exists public.newsletter_consent_events (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  consent_id uuid not null references public.newsletter_consents(id),
  occurred_at timestamptz not null default now(),
  event_type text not null check (event_type in ('requested', 'confirmed', 'withdrawn')),
  source text not null,
  consent_text_version text not null default 'unreviewed-prototype'
);

-- This records notification intent; no production dispatcher is implemented.
-- A confirmation token is not recoverable from its hash. A production worker
-- needs reviewed token issuance/delivery, claiming/leases and provider sync.
create table if not exists public.form_notification_outbox (
  id uuid primary key,
  created_at timestamptz not null default now(),
  submission_id uuid not null,
  kind text not null check (kind in ('contact', 'newsletter-confirmation')),
  status text not null check (status in ('queued', 'sent', 'failed', 'superseded')),
  attempts integer not null default 0
);
create unique index if not exists one_contact_notification
  on public.form_notification_outbox(submission_id) where kind = 'contact';
create unique index if not exists one_pending_confirmation
  on public.form_notification_outbox(submission_id) where kind = 'newsletter-confirmation' and status = 'queued';

create or replace function public.request_newsletter_consent_with_outbox(consent jsonb, notification jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare saved public.newsletter_consents; did_create boolean := false;
begin
  -- Locks even a previously unseen address; two first requests cannot mint
  -- competing active tokens. Hash collisions only serialize unrelated requests.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(consent->>'email', 0));
  select * into saved from public.newsletter_consents where email = consent->>'email' for update;
  if found and (saved.status = 'confirmed' or (saved.status = 'pending' and saved.confirm_token_expires_at > (consent->>'requestedAt')::timestamptz)) then
    return jsonb_build_object('consent', to_jsonb(saved), 'created', false);
  end if;
  insert into public.newsletter_consents (id, email, source, consent_text_version, status, requested_at, confirmed_at, withdrawn_at, confirm_token_hash, confirm_token_expires_at, unsubscribe_token_hash)
  values ((consent->>'id')::uuid, consent->>'email', consent->>'source', coalesce(consent->>'consentTextVersion', 'unreviewed-prototype'), 'pending', (consent->>'requestedAt')::timestamptz, null, null, consent->>'confirmTokenHash', (consent->>'confirmTokenExpiresAt')::timestamptz, consent->>'unsubscribeTokenHash')
  on conflict (email) do update set source = excluded.source, consent_text_version = excluded.consent_text_version, status = 'pending', requested_at = excluded.requested_at, confirmed_at = null, withdrawn_at = null, confirm_token_hash = excluded.confirm_token_hash, confirm_token_expires_at = excluded.confirm_token_expires_at, unsubscribe_token_hash = excluded.unsubscribe_token_hash
  returning * into saved;
  did_create := true;
  update public.form_notification_outbox set status = 'superseded'
    where submission_id = saved.id and kind = 'newsletter-confirmation' and status = 'queued';
  insert into public.form_notification_outbox (id, created_at, submission_id, kind, status, attempts)
  values ((notification->>'id')::uuid, (notification->>'createdAt')::timestamptz, saved.id, notification->>'kind', notification->>'status', (notification->>'attempts')::integer);
  insert into public.newsletter_consent_events (consent_id, occurred_at, event_type, source, consent_text_version)
  values (saved.id, (consent->>'requestedAt')::timestamptz, 'requested', saved.source, saved.consent_text_version);
  return jsonb_build_object('consent', to_jsonb(saved), 'created', did_create);
end $$;

alter table public.contact_submissions enable row level security;
alter table public.newsletter_consents enable row level security;
alter table public.newsletter_consent_events enable row level security;
alter table public.form_notification_outbox enable row level security;

-- The API calls this function in one transaction so a retried contact cannot
-- create a record without its outbox notification. It returns created=false on
-- an idempotent retry. In production additionally compare a request digest if
-- a caller reuses a key with changed content.
create or replace function public.save_contact_submission_with_outbox(submission jsonb, notification jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare inserted public.contact_submissions; did_create boolean := false;
begin
  insert into public.contact_submissions (id, created_at, email, first_name, last_name, city, message, category, event_slug, status, idempotency_key)
  values ((submission->>'id')::uuid, (submission->>'createdAt')::timestamptz, submission->>'email', nullif(submission->>'firstName',''), nullif(submission->>'lastName',''), nullif(submission->>'city',''), nullif(submission->>'message',''), submission->>'category', nullif(submission->>'eventSlug',''), submission->>'status', (submission->>'idempotencyKey')::uuid)
  on conflict (idempotency_key) do nothing returning * into inserted;
  if found then
    did_create := true;
    insert into public.form_notification_outbox (id, created_at, submission_id, kind, status, attempts)
    values ((notification->>'id')::uuid, (notification->>'createdAt')::timestamptz, inserted.id, notification->>'kind', notification->>'status', (notification->>'attempts')::integer);
  else
    select * into inserted from public.contact_submissions where idempotency_key = (submission->>'idempotencyKey')::uuid;
  end if;
  return jsonb_build_object('record', to_jsonb(inserted), 'created', did_create);
end $$;

create or replace function public.consume_newsletter_confirmation(token_hash text, occurred_at timestamptz)
returns boolean language plpgsql security definer set search_path = '' as $$
declare affected public.newsletter_consents;
begin
  update public.newsletter_consents set status = 'confirmed', confirmed_at = occurred_at, confirm_token_hash = null, confirm_token_expires_at = null
  where status = 'pending' and confirm_token_hash = token_hash and confirm_token_expires_at > occurred_at returning * into affected;
  if not found then return false; end if;
  insert into public.newsletter_consent_events (consent_id, occurred_at, event_type, source, consent_text_version) values (affected.id, occurred_at, 'confirmed', affected.source, affected.consent_text_version);
  update public.form_notification_outbox set status = 'superseded' where submission_id = affected.id and kind = 'newsletter-confirmation' and status = 'queued';
  return true;
end $$;

create or replace function public.withdraw_newsletter_consent(token_hash text, occurred_at timestamptz)
returns boolean language plpgsql security definer set search_path = '' as $$
declare affected public.newsletter_consents;
begin
  update public.newsletter_consents set status = 'withdrawn', withdrawn_at = occurred_at, confirm_token_hash = null, confirm_token_expires_at = null
  where status <> 'withdrawn' and unsubscribe_token_hash = token_hash returning * into affected;
  if not found then return false; end if;
  insert into public.newsletter_consent_events (consent_id, occurred_at, event_type, source, consent_text_version) values (affected.id, occurred_at, 'withdrawn', affected.source, affected.consent_text_version);
  update public.form_notification_outbox set status = 'superseded' where submission_id = affected.id and kind = 'newsletter-confirmation' and status = 'queued';
  return true;
end $$;

revoke all on function public.request_newsletter_consent_with_outbox(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.save_contact_submission_with_outbox(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.consume_newsletter_confirmation(text, timestamptz) from public, anon, authenticated;
revoke all on function public.withdraw_newsletter_consent(text, timestamptz) from public, anon, authenticated;
grant execute on function public.save_contact_submission_with_outbox(jsonb, jsonb), public.consume_newsletter_confirmation(text, timestamptz), public.withdraw_newsletter_consent(text, timestamptz) to service_role;
grant execute on function public.request_newsletter_consent_with_outbox(jsonb, jsonb) to service_role;

-- No policies are intentionally created: anonymous and authenticated clients have
-- no table access. A future server-only adapter must use tightly scoped service
-- credentials, never a browser-exposed key.
revoke all on table public.contact_submissions, public.newsletter_consents,
  public.newsletter_consent_events, public.form_notification_outbox from public, anon, authenticated;
grant select, insert, update, delete on table public.contact_submissions, public.newsletter_consents,
  public.newsletter_consent_events, public.form_notification_outbox to service_role;
commit;
