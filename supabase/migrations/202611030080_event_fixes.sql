begin;
-- Administrative reconciliation needs a real RLS policy, not a service-role-only table.
create policy payment_attempts_admin on public.event_payment_attempts for select to authenticated using(public.has_role(array['administrator','superadmin']));
grant select on public.event_payment_attempts to authenticated;
alter policy events_public on public.events using(published);

-- A cancelled free registration is allowed to register again, while confirmed and
-- waitlisted records remain idempotent.
create or replace function public.register_free_event(p_event_slug text,p_email text,p_name text,p_ticket_code text) returns public.event_registrations language plpgsql security definer set search_path='' as $$
declare e public.events; r public.event_registrations; taken integer; exists_registration boolean:=false;
begin
 select * into e from public.events where slug=p_event_slug for update;
 if not found or not e.published or not e.registration_open or e.cancelled_at is not null or e.starts_at<=clock_timestamp() or e.price_ore<>0 then raise exception 'registration_closed'; end if;
 select * into r from public.event_registrations where event_id=e.id and email=lower(p_email) for update; exists_registration:=found;
 if exists_registration and r.status in('confirmed','waitlisted') then return r; end if;
 select count(*) into taken from public.event_registrations where event_id=e.id and status='confirmed';
 if exists_registration then
   update public.event_registrations set name=p_name,status=case when e.capacity is not null and taken>=e.capacity then 'waitlisted' else 'confirmed' end,ticket_code=case when e.capacity is not null and taken>=e.capacity then null else p_ticket_code end,cancelled_at=null,checked_in_at=null,created_at=clock_timestamp() where id=r.id returning * into r;
 else
   insert into public.event_registrations(event_id,email,name,status,ticket_code) values(e.id,lower(p_email),p_name,case when e.capacity is not null and taken>=e.capacity then 'waitlisted' else 'confirmed' end,case when e.capacity is not null and taken>=e.capacity then null else p_ticket_code end) returning * into r;
 end if;
 perform public.enqueue_event_mail('event:'||r.id::text||':'||r.status||':'||p_ticket_code,case when r.status='confirmed' then 'event-registration' else 'event-waitlist' end,r.email,e.title,e.slug);
 return r;
end $$;
revoke all on function public.register_free_event(text,text,text,text) from public,anon,authenticated;
grant execute on function public.register_free_event(text,text,text,text) to service_role;
-- Checkout gets 35 minutes plus a five-minute reconciliation buffer.
create or replace function public.begin_paid_event_registration(p_event_slug text,p_email text,p_name text) returns public.event_registrations language plpgsql security definer set search_path='' as $$ declare e public.events; r public.event_registrations; taken integer; attempt uuid:=pg_catalog.gen_random_uuid(); has_registration boolean:=false; begin select * into e from public.events where slug=p_event_slug for update; if not found or not e.published or not e.registration_open or e.cancelled_at is not null or e.starts_at<=clock_timestamp() or e.price_ore<=0 then raise exception 'registration_closed'; end if; update public.event_registrations set status='cancelled',cancelled_at=clock_timestamp() where event_id=e.id and status='payment_pending' and reservation_expires_at<=clock_timestamp(); select * into r from public.event_registrations where event_id=e.id and email=lower(p_email) for update; has_registration:=found; if has_registration and r.status='confirmed' then return r; end if; if has_registration and r.status='payment_pending' and r.reservation_expires_at>clock_timestamp() then return r; end if; select count(*) into taken from public.event_registrations where event_id=e.id and (status='confirmed' or(status='payment_pending' and reservation_expires_at>clock_timestamp())); if e.capacity is not null and taken>=e.capacity then if has_registration then update public.event_registrations set name=p_name,status='waitlisted',reservation_expires_at=null,reservation_attempt_id=null,checkout_session_id=null,payment_intent_id=null,cancelled_at=null where id=r.id returning * into r; else insert into public.event_registrations(event_id,email,name,status) values(e.id,lower(p_email),p_name,'waitlisted') returning * into r; end if; return r; end if; if has_registration then update public.event_registrations set name=p_name,status='payment_pending',reservation_expires_at=clock_timestamp()+interval '40 minutes',reservation_attempt_id=attempt,checkout_session_id=null,payment_intent_id=null,booking_price_ore=e.price_ore,booking_currency=e.currency,cancelled_at=null,refund_required=false where id=r.id returning * into r; else insert into public.event_registrations(event_id,email,name,status,reservation_expires_at,reservation_attempt_id,booking_price_ore,booking_currency) values(e.id,lower(p_email),p_name,'payment_pending',clock_timestamp()+interval '40 minutes',attempt,e.price_ore,e.currency) returning * into r; end if; insert into public.event_payment_attempts(registration_id,reservation_attempt_id,price_ore,currency,expires_at) values(r.id,attempt,r.booking_price_ore,r.booking_currency,r.reservation_expires_at-interval '5 minutes'); return r; end $$;
commit;
