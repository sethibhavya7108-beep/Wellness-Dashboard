-- =============================================================================
-- 0005_habits_gamification.sql — check-ins, points and badges
--
-- Students hold no INSERT grant on points_transactions or user_badges: nobody
-- may mint their own points. This project also carries no service-role key, so
-- the award path is a SECURITY DEFINER function that validates ownership itself
-- rather than a privileged client. See /docs/SECURITY.md.
--
-- Every function here pins search_path = '' and fully qualifies identifiers.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Check-in + points, in one transaction
--
-- Idempotent twice over: the check-in unique key makes a repeat an update, and
-- the partial unique index on (user_id, reason, ref_table, ref_id) makes the
-- points award a no-op the second time. Re-logging the same day therefore
-- cannot inflate a total.
-- -----------------------------------------------------------------------------
create or replace function public.log_habit_checkin(
  p_roadmap_habit_id uuid,
  p_status public.checkin_status,
  p_mood smallint default null,
  p_energy smallint default null,
  p_note text default null,
  p_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner uuid;
  v_points smallint;
  v_cycle_start date;
  v_cycle_end date;
  v_date date := coalesce(p_date, (now() at time zone 'Asia/Kolkata')::date);
  v_checkin_id uuid;
  v_award smallint;
begin
  if v_user_id is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  -- Ownership is checked here, not assumed from the argument.
  select r.user_id, rh.points, r.cycle_start, r.cycle_end
    into v_owner, v_points, v_cycle_start, v_cycle_end
  from public.roadmap_habits rh
  join public.roadmaps r on r.id = rh.roadmap_id
  where rh.id = p_roadmap_habit_id
    and rh.status = 'active';

  if v_owner is null or v_owner <> v_user_id then
    raise exception 'That habit does not belong to you' using errcode = 'insufficient_privilege';
  end if;

  if v_date < v_cycle_start or v_date > v_cycle_end then
    raise exception 'That date is outside your current cycle' using errcode = 'check_violation';
  end if;

  insert into public.habit_checkins
    (roadmap_habit_id, user_id, checkin_date, status, mood, energy, note)
  values
    (p_roadmap_habit_id, v_user_id, v_date, p_status, p_mood, p_energy, p_note)
  on conflict (roadmap_habit_id, checkin_date) do update
    set status = excluded.status,
        mood   = excluded.mood,
        energy = excluded.energy,
        note   = excluded.note
  returning id into v_checkin_id;

  -- A partial day is worth half, rounded down. Nothing is awarded for 'no'.
  v_award := case p_status
               when 'yes' then v_points
               when 'partial' then floor(v_points / 2.0)::smallint
               else 0
             end;

  -- Changing an earlier answer must not leave stale points behind.
  delete from public.points_transactions
  where user_id = v_user_id
    and reason = 'habit_checkin'
    and ref_table = 'habit_checkins'
    and ref_id = v_checkin_id;

  if v_award > 0 then
    insert into public.points_transactions (user_id, points, reason, ref_table, ref_id)
    values (v_user_id, v_award, 'habit_checkin', 'habit_checkins', v_checkin_id)
    on conflict do nothing;
  end if;

  return v_checkin_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Points for completing an assessment
-- -----------------------------------------------------------------------------
create or replace function public.award_assessment_points(p_assessment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner uuid;
begin
  if v_user_id is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  select a.user_id into v_owner
  from public.assessments a
  where a.id = p_assessment_id and a.status = 'completed';

  if v_owner is null or v_owner <> v_user_id then
    return;
  end if;

  insert into public.points_transactions (user_id, points, reason, ref_table, ref_id)
  values (v_user_id, 50, 'assessment_completed', 'assessments', p_assessment_id)
  on conflict do nothing;
end;
$$;

-- -----------------------------------------------------------------------------
-- Longest run of consecutive days on which the student logged anything but 'no'
--
-- SECURITY DEFINER so evaluate_badges can use it, which means RLS is bypassed —
-- hence the explicit caller check. Without it this would read any student's
-- check-in history from an id alone.
-- -----------------------------------------------------------------------------
create or replace function public.current_streak_days(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with allowed as (
    select case when p_user_id = auth.uid() then p_user_id else null end as uid
  ),
  days as (
    select distinct c.checkin_date as d
    from public.habit_checkins c, allowed a
    where c.user_id = a.uid and c.status <> 'no'
  ),
  grouped as (
    select d, d - (row_number() over (order by d))::integer as run_key
    from days
  ),
  runs as (
    select run_key, count(*)::integer as len, max(d) as last_day
    from grouped
    group by run_key
  )
  select coalesce(
    (select r.len from runs r
      where r.last_day >= (now() at time zone 'Asia/Kolkata')::date - 1
      order by r.last_day desc
      limit 1),
    0
  );
$$;

-- -----------------------------------------------------------------------------
-- Badge evaluation
--
-- Behaviour and participation only. A badge may never reference BMI, weight,
-- stress or a wellness score — the criteria_type values below are the whole
-- vocabulary, and none of them describe health status.
-- -----------------------------------------------------------------------------
create or replace function public.evaluate_badges()
returns table (code text, name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  return query
  with metrics as (
    select
      (select count(*) from public.habit_checkins c
        where c.user_id = v_user_id and c.status <> 'no')::numeric as checkins_total,
      public.current_streak_days(v_user_id)::numeric as streak_days,
      (select count(*) from public.assessments a
        where a.user_id = v_user_id and a.status = 'completed')::numeric as assessments_completed,
      (select count(*) from public.assessments a
        where a.user_id = v_user_id and a.status = 'completed' and a.kind = 'endline')::numeric
        as endline_completed,
      (select count(*) from public.roadmaps r
        where r.user_id = v_user_id and r.status = 'completed')::numeric as roadmaps_completed,
      (select count(*) from public.event_registrations e
        where e.user_id = v_user_id and e.attended)::numeric as events_attended
  ),
  earned as (
    insert into public.user_badges (user_id, badge_id)
    select v_user_id, b.id
    from public.badges b, metrics m
    where b.is_active
      and case b.criteria_type
            when 'checkins_total'        then m.checkins_total
            when 'streak_days'           then m.streak_days
            when 'assessments_completed' then m.assessments_completed
            when 'endline_completed'     then m.endline_completed
            when 'roadmaps_completed'    then m.roadmaps_completed
            when 'events_attended'       then m.events_attended
            else null
          end >= coalesce(b.criteria_value, 0)
    on conflict (user_id, badge_id) do nothing
    returning badge_id
  )
  select b.code, b.name
  from earned e
  join public.badges b on b.id = e.badge_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Grants — signed-in students only. None of these are reachable anonymously.
-- -----------------------------------------------------------------------------
revoke all on function public.log_habit_checkin(uuid, public.checkin_status, smallint, smallint, text, date) from public, anon;
grant execute on function public.log_habit_checkin(uuid, public.checkin_status, smallint, smallint, text, date) to authenticated;

revoke all on function public.award_assessment_points(uuid) from public, anon;
grant execute on function public.award_assessment_points(uuid) to authenticated;

revoke all on function public.current_streak_days(uuid) from public, anon;
grant execute on function public.current_streak_days(uuid) to authenticated;

revoke all on function public.evaluate_badges() from public, anon;
grant execute on function public.evaluate_badges() to authenticated;
