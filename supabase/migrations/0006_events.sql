-- =============================================================================
-- 0006_events.sql — registration, cancellation and attendance
--
-- Capacity and deadlines cannot be expressed as a row policy: RLS decides
-- whether a row may be written, not how many rows already exist. Registration
-- therefore goes through a function that takes the decision server-side, and
-- the student INSERT policy stays as a floor rather than the mechanism.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Register
--
-- Returns the resulting status so the caller can tell a student they are on the
-- waitlist rather than silently registering them.
-- -----------------------------------------------------------------------------
create or replace function public.register_for_event(p_event_id uuid)
returns public.registration_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_event public.events%rowtype;
  v_taken integer;
  v_status public.registration_status;
begin
  if v_user_id is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  select * into v_event from public.events e where e.id = p_event_id;

  if v_event.id is null or v_event.status <> 'published' then
    raise exception 'That event is not open for registration' using errcode = 'check_violation';
  end if;

  if not v_event.registration_open then
    raise exception 'Registration for that event is closed' using errcode = 'check_violation';
  end if;

  if v_event.registration_deadline is not null and now() > v_event.registration_deadline then
    raise exception 'The deadline for that event has passed' using errcode = 'check_violation';
  end if;

  if v_event.starts_at < now() then
    raise exception 'That event has already started' using errcode = 'check_violation';
  end if;

  -- Counted inside the same statement as the insert below so two students
  -- racing for the last place cannot both be told they got it.
  select count(*) into v_taken
  from public.event_registrations r
  where r.event_id = p_event_id and r.status = 'registered';

  v_status := case
                when v_event.capacity is null then 'registered'
                when v_taken < v_event.capacity then 'registered'
                else 'waitlisted'
              end;

  insert into public.event_registrations (event_id, user_id, status)
  values (p_event_id, v_user_id, v_status)
  on conflict (event_id, user_id) do update
    set status = case
                   -- Re-registering after cancelling re-enters at the back.
                   when public.event_registrations.status = 'cancelled' then v_status
                   else public.event_registrations.status
                 end
  returning status into v_status;

  return v_status;
end;
$$;

-- -----------------------------------------------------------------------------
-- Cancel
--
-- Cancelling frees a place, so the first waitlisted student is promoted in the
-- same transaction. Ordered by registration time: whoever waited longest goes first.
-- -----------------------------------------------------------------------------
create or replace function public.cancel_event_registration(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_capacity integer;
  v_taken integer;
  v_next uuid;
begin
  if v_user_id is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  update public.event_registrations
  set status = 'cancelled'
  where event_id = p_event_id and user_id = v_user_id;

  select e.capacity into v_capacity from public.events e where e.id = p_event_id;
  if v_capacity is null then
    return;
  end if;

  select count(*) into v_taken
  from public.event_registrations r
  where r.event_id = p_event_id and r.status = 'registered';

  if v_taken < v_capacity then
    select r.id into v_next
    from public.event_registrations r
    where r.event_id = p_event_id and r.status = 'waitlisted'
    order by r.registered_at
    limit 1;

    if v_next is not null then
      update public.event_registrations set status = 'registered' where id = v_next;
    end if;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Attendance
--
-- Event managers only, checked here rather than trusted from the caller.
-- Awards the attendance points and is idempotent on the points side.
-- -----------------------------------------------------------------------------
create or replace function public.mark_event_attendance(
  p_event_id uuid,
  p_user_id uuid,
  p_attended boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_registration uuid;
begin
  if not public.has_any_role(array['event_manager']::public.app_role[]) then
    raise exception 'You cannot mark attendance' using errcode = 'insufficient_privilege';
  end if;

  update public.event_registrations
  set attended = p_attended
  where event_id = p_event_id and user_id = p_user_id
  returning id into v_registration;

  if v_registration is null then
    return;
  end if;

  if p_attended then
    insert into public.points_transactions (user_id, points, reason, ref_table, ref_id)
    values (p_user_id, 30, 'event_attended', 'event_registrations', v_registration)
    on conflict do nothing;
  else
    delete from public.points_transactions
    where user_id = p_user_id
      and reason = 'event_attended'
      and ref_table = 'event_registrations'
      and ref_id = v_registration;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- How full an event is
--
-- Registration counts are not readable by a student under the RLS policy (they
-- see only their own row), but "12 of 40 places taken" is not private. Exposed
-- as a count only — never the list of who registered.
-- -----------------------------------------------------------------------------
create or replace function public.event_registration_count(p_event_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.event_registrations r
  join public.events e on e.id = r.event_id
  where r.event_id = p_event_id
    and r.status = 'registered'
    and e.status in ('published', 'completed');
$$;

revoke all on function public.register_for_event(uuid) from public, anon;
grant execute on function public.register_for_event(uuid) to authenticated;

revoke all on function public.cancel_event_registration(uuid) from public, anon;
grant execute on function public.cancel_event_registration(uuid) to authenticated;

revoke all on function public.mark_event_attendance(uuid, uuid, boolean) from public, anon;
grant execute on function public.mark_event_attendance(uuid, uuid, boolean) to authenticated;

revoke all on function public.event_registration_count(uuid) from public, anon;
grant execute on function public.event_registration_count(uuid) to authenticated;
