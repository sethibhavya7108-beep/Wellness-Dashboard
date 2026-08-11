-- =============================================================================
-- 0009_leaderboard_optin_consistency.sql
--
-- Three additions:
--   1. Leaderboard participation becomes opt-in, captured at onboarding.
--   2. Consistency points — rewarding days logged per week and per month.
--   3. Campus-wide activity aggregates for the admin dashboard.
--
-- Consistency rewards SHOWING UP, not health status. A student with poor sleep
-- who logs every day out-earns a student with perfect sleep who logs nothing.
-- That is deliberate and matches the leaderboard rule in the PRD.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Leaderboard opt-in
--
-- Defaults to FALSE. A ranking is a public statement about a person, so it is
-- something a student chooses, not something they have to discover and switch
-- off. Existing rows keep the safe default.
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists leaderboard_opt_in boolean not null default false;

comment on column public.profiles.leaderboard_opt_in is
  'Student has chosen to appear on the campus leaderboard. Opt-in, never assumed.';

-- Rewritten to honour the opt-in. Still projects name, batch and points only —
-- no health metric can pass through this surface.
create or replace function public.get_leaderboard(
  result_limit integer default 50,
  result_offset integer default 0
)
returns table (
  rank         bigint,
  user_id      uuid,
  full_name    text,
  batch_year   smallint,
  total_points bigint,
  is_self      boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with totals as (
    select
      p.id,
      coalesce(p.full_name, 'Student') as full_name,
      p.batch_year,
      coalesce(sum(pt.points), 0)::bigint as total_points
    from public.profiles p
    left join public.points_transactions pt on pt.user_id = p.id
    where p.profile_completed_at is not null
      -- The caller always sees their own row so their rank is meaningful,
      -- even while they are opted out of appearing to everyone else.
      and (p.leaderboard_opt_in or p.id = auth.uid())
    group by p.id, p.full_name, p.batch_year
  )
  select
    rank() over (order by t.total_points desc) as rank,
    t.id as user_id,
    t.full_name,
    t.batch_year,
    t.total_points,
    t.id = auth.uid() as is_self
  from totals t
  where auth.uid() is not null
  order by t.total_points desc, t.full_name asc
  limit least(coalesce(result_limit, 50), 200)
  offset greatest(coalesce(result_offset, 0), 0);
$$;

revoke all on function public.get_leaderboard(integer, integer) from public, anon;
grant execute on function public.get_leaderboard(integer, integer) to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Consistency
--
-- Thresholds live here and are referenced by the UI through
-- consistency_summary() rather than being repeated in TypeScript.
-- -----------------------------------------------------------------------------
create or replace function public.consistency_rules()
returns table (
  weekly_days_required  integer,
  weekly_points         integer,
  monthly_days_required integer,
  monthly_points        integer
)
language sql
immutable
set search_path = ''
as $$
  select 5, 25, 20, 100;
$$;

-- Days on which the student logged at least one habit as 'yes' or 'partial'.
-- A 'no' is an honest answer, but it is not a day of doing the thing.
create or replace function public.consistency_summary(p_user_id uuid default auth.uid())
returns table (
  week_start        date,
  days_this_week    integer,
  weekly_target     integer,
  month_start       date,
  days_this_month   integer,
  monthly_target    integer,
  current_streak    integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    -- Resolves to null for anyone asking about someone else, so this cannot
    -- read another student's activity from an id alone.
    select case when p_user_id = auth.uid() then p_user_id else null end as uid
  ),
  logged as (
    select distinct c.checkin_date
    from public.habit_checkins c, me
    where c.user_id = me.uid and c.status in ('yes', 'partial')
  )
  select
    date_trunc('week', current_date)::date,
    (select count(*) from logged where checkin_date >= date_trunc('week', current_date)::date)::integer,
    (select weekly_days_required from public.consistency_rules()),
    date_trunc('month', current_date)::date,
    (select count(*) from logged where checkin_date >= date_trunc('month', current_date)::date)::integer,
    (select monthly_days_required from public.consistency_rules()),
    public.current_streak_days(p_user_id);
$$;

-- Award for any COMPLETED period that met its target.
--
-- Only completed periods count: awarding mid-week would mean paying for a
-- result that has not happened yet. Idempotency comes from the existing unique
-- index on (user_id, reason, ref_table, ref_id) — ref_id is derived
-- deterministically from the period, so a second call inserts nothing.
create or replace function public.award_consistency_points()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_rules record;
  v_period record;
begin
  if v_user_id is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  select * into v_rules from public.consistency_rules();

  -- Completed weeks
  for v_period in
    select
      date_trunc('week', c.checkin_date)::date as period_start,
      count(distinct c.checkin_date) as days
    from public.habit_checkins c
    where c.user_id = v_user_id
      and c.status in ('yes', 'partial')
      and date_trunc('week', c.checkin_date) < date_trunc('week', current_date)
    group by 1
    having count(distinct c.checkin_date) >= v_rules.weekly_days_required
  loop
    insert into public.points_transactions (user_id, points, reason, ref_table, ref_id)
    values (
      v_user_id,
      v_rules.weekly_points,
      'streak_bonus',
      'consistency_week',
      md5('week:' || v_user_id::text || ':' || v_period.period_start::text)::uuid
    )
    on conflict do nothing;
  end loop;

  -- Completed months
  for v_period in
    select
      date_trunc('month', c.checkin_date)::date as period_start,
      count(distinct c.checkin_date) as days
    from public.habit_checkins c
    where c.user_id = v_user_id
      and c.status in ('yes', 'partial')
      and date_trunc('month', c.checkin_date) < date_trunc('month', current_date)
    group by 1
    having count(distinct c.checkin_date) >= v_rules.monthly_days_required
  loop
    insert into public.points_transactions (user_id, points, reason, ref_table, ref_id)
    values (
      v_user_id,
      v_rules.monthly_points,
      'streak_bonus',
      'consistency_month',
      md5('month:' || v_user_id::text || ':' || v_period.period_start::text)::uuid
    )
    on conflict do nothing;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Per-habit history, for the dashboard charts
--
-- Returns one row per habit per day over the window, so the client can draw a
-- consistency chart without a second round trip per habit.
-- -----------------------------------------------------------------------------
create or replace function public.habit_history(p_days integer default 28)
returns table (
  roadmap_habit_id uuid,
  category         public.wellness_category,
  checkin_date     date,
  status           public.checkin_status
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.roadmap_habit_id, rh.category, c.checkin_date, c.status
  from public.habit_checkins c
  join public.roadmap_habits rh on rh.id = c.roadmap_habit_id
  where c.user_id = auth.uid()
    and c.checkin_date >= current_date - least(greatest(coalesce(p_days, 28), 1), 365)
  order by c.checkin_date;
$$;

-- -----------------------------------------------------------------------------
-- 3. Campus activity, for the admin dashboard
--
-- Counts of accounts and active students per day. These are participation
-- figures, not health data — no assessment answer or score is readable here.
-- Admin-gated like every other reporting function.
-- -----------------------------------------------------------------------------
create or replace function public.get_daily_activity(p_days integer default 30)
returns table (
  day            date,
  accounts_made  integer,
  signed_in      integer,
  checked_in     integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days integer := least(greatest(coalesce(p_days, 30), 1), 365);
begin
  if not public.is_admin() then
    raise exception 'Not permitted' using errcode = 'insufficient_privilege';
  end if;

  return query
  with days as (
    select generate_series(current_date - v_days + 1, current_date, interval '1 day')::date as day
  )
  select
    d.day,
    (select count(*) from public.profiles p
      where p.created_at::date = d.day)::integer,
    (select count(distinct a.user_id) from public.analytics_events a
      where a.name = 'signed_in' and a.created_at::date = d.day)::integer,
    (select count(distinct c.user_id) from public.habit_checkins c
      where c.checkin_date = d.day)::integer
  from days d
  order by d.day;
end;
$$;

revoke all on function public.consistency_rules() from public, anon;
grant execute on function public.consistency_rules() to authenticated;

revoke all on function public.consistency_summary(uuid) from public, anon;
grant execute on function public.consistency_summary(uuid) to authenticated;

revoke all on function public.award_consistency_points() from public, anon;
grant execute on function public.award_consistency_points() to authenticated;

revoke all on function public.habit_history(integer) from public, anon;
grant execute on function public.habit_history(integer) to authenticated;

revoke all on function public.get_daily_activity(integer) from public, anon;
grant execute on function public.get_daily_activity(integer) to authenticated;
