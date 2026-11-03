begin;
-- Editors manage public event content, never participant/payment data.
alter policy events_staff on public.events
  using(public.has_role(array['superadmin','administrator','editor']))
  with check(public.has_role(array['superadmin','administrator','editor']));
commit;
