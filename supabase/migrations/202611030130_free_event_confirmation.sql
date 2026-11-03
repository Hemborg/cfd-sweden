begin;

-- A public free-registration request is intentionally not a registration. It
-- becomes one only after the recipient proves control of the mailbox.
create table public.free_event_confirmation_requests (
  id uuid primary key,
  event_id uuid not null references public.events(id) on delete cascade,
  email text not null,
  name text not null,
  token_hash text not null unique check(token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  registration_id uuid references public.event_registrations(id) on delete set null,
  mail_version integer not null default 1 check(mail_version > 0),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique(event_id,email)
);
create index free_event_confirmation_token_idx on public.free_event_confirmation_requests(token_hash);

alter table public.free_event_confirmation_requests enable row level security;
revoke all on table public.free_event_confirmation_requests from public,anon,authenticated;
grant select,insert,update,delete on table public.free_event_confirmation_requests to service_role;

alter table public.queue_mail drop constraint if exists queue_mail_template_check;
alter table public.queue_mail add constraint queue_mail_template_check check(template in (
  'contact-received','contact-owner-notification','newsletter-confirmation','newsletter-confirmed',
  'portal-invitation','account-recovery','welcome','event-confirmation','event-registration',
  'event-cancelled','event-waitlist','event-practical-info','group-invitation','task-assignment',
  'campaign-newsletter'
));

create function public.request_free_event_confirmation(
  p_event_slug text,
  p_email text,
  p_name text,
  p_token_hash text,
  p_expires_at timestamptz,
  p_mail_data jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare e public.events; request_id uuid:=pg_catalog.gen_random_uuid(); next_version integer;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' or p_expires_at<=clock_timestamp() or length(p_email)>254 or length(p_name)>160
    or jsonb_typeof(p_mail_data)<>'object' or not (p_mail_data ?& array['v','iv','ciphertext','tag']) then
    raise exception 'invalid_confirmation_request';
  end if;
  select * into e from public.events where slug=p_event_slug for update;
  if not found or not e.published or not e.registration_open or e.cancelled_at is not null
    or e.starts_at<=clock_timestamp() or e.price_ore<>0 then
    raise exception 'registration_closed';
  end if;

  insert into public.free_event_confirmation_requests(id,event_id,email,name,token_hash,expires_at)
  values(request_id,e.id,lower(p_email),p_name,p_token_hash,p_expires_at)
  on conflict(event_id,email) do update set
    name=excluded.name,
    token_hash=excluded.token_hash,
    expires_at=excluded.expires_at,
    consumed_at=null,
    registration_id=null,
    mail_version=public.free_event_confirmation_requests.mail_version+1,
    updated_at=clock_timestamp()
  returning id,mail_version into request_id,next_version;

  -- Previous, unsent links must not be delivered after a newer token replaces
  -- them. Sent mail cannot be recalled, but its token is invalidated above.
  update public.queue_mail set status='superseded',updated_at=clock_timestamp(),last_error='Ny bekräftelselänk har begärts.'
    where key like ('event-confirmation:'||request_id::text||':%') and status in ('queued','retry');
  perform public.enqueue_queue_mail(
    'event-confirmation:'||request_id::text||':'||next_version::text,
    'event-confirmation',lower(p_email),p_mail_data,clock_timestamp(),null
  );
  return request_id;
end $$;

create function public.confirm_free_event_registration(p_token_hash text,p_ticket_code text)
returns public.event_registrations language plpgsql security definer set search_path='' as $$
declare request_id uuid; requested_event_id uuid; e public.events; r public.free_event_confirmation_requests; registration public.event_registrations;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' or p_ticket_code !~ '^[A-Z0-9]{12}$' then return null; end if;
  select id,event_id into request_id,requested_event_id from public.free_event_confirmation_requests where token_hash=p_token_hash;
  if not found then return null; end if;
  -- Match the request path's lock order (event, then request) to avoid a
  -- request/confirmation deadlock for the same address.
  select * into e from public.events where id=requested_event_id for update;
  select * into r from public.free_event_confirmation_requests where id=request_id for update;
  if not found or r.token_hash<>p_token_hash or r.consumed_at is not null or r.expires_at<=clock_timestamp() then return null; end if;
  select * into registration from public.register_free_event(e.slug,r.email,r.name,p_ticket_code);
  update public.free_event_confirmation_requests
    set consumed_at=clock_timestamp(),registration_id=registration.id,updated_at=clock_timestamp()
    where id=r.id;
  return registration;
end $$;

revoke all on function public.request_free_event_confirmation(text,text,text,text,timestamptz,jsonb),public.confirm_free_event_registration(text,text) from public,anon,authenticated;
grant execute on function public.request_free_event_confirmation(text,text,text,text,timestamptz,jsonb),public.confirm_free_event_registration(text,text) to service_role;
commit;
