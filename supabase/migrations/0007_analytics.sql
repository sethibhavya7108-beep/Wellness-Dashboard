-- =============================================================================
-- 0007_analytics.sql — aggregate reporting for organisers
--
-- Administrators hold no row access to assessments, wellness scores or
-- check-ins, and 0003_rls.sql keeps it that way. This file is the alternative:
-- SECURITY DEFINER functions that return aggregates and never individual rows.
--
-- Every function suppresses its result below a minimum cohort size. An average
-- over three students is not anonymous — with a batch filter it can identify
-- someone — so a small cohort returns nothing rather than a number.
-- =============================================================================

-- Below this many students, aggregates are withheld entirely.
create or replace function public.min_cohort_size()
returns integer
language sql
immutable
set search_path = ''
as $$ select 5 $$;

-- -----------------------------------------------------------------------------
-- Participation — counts of behaviour, no health values at all
-- -----------------------------------------------------------------------------
create or replace function public.get_participation_stats()
returns table (
  students_onboarded integer,
  baselines_completed integer,
  endlines_completed integer,
  active_roadmaps integer,
  checkins_last_7_days integer,
  events_published integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Not permitted' using errcode = 'insufficient_privilege';
  end if;

  return query
  select
    (select count(*)::integer from public.profiles p where p.profile_completed_at is not null),
    (select count(*)::integer from public.assessments a
      where a.status = 'completed' and a.kind = 'baseline'),
    (select count(*)::integer from public.assessments a
      where a.status = 'completed' and a.kind = 'endline'),
    (select count(*)::integer from public.roadmaps r where r.status = 'active'),
    (select count(*)::integer from public.habit_checkins c
      where c.checkin_date >= (now() at time zone 'Asia/Kolkata')::date - 7),
    (select count(*)::integer from public.events e where e.status = 'published');
end;
$$;

-- -----------------------------------------------------------------------------
-- Campus wellness by category
--
-- Returns an average and a flagged count per category, withheld when the cohort
-- is too small to be anonymous.
-- -----------------------------------------------------------------------------
create or replace function public.get_category_averages(p_kind public.assessment_kind default 'baseline')
returns table (
  category public.wellness_category,
  student_count integer,
  average_score numeric,
  flagged_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cohort integer;
begin
  if not public.is_admin() then
    raise exception 'Not permitted' using errcode = 'insufficient_privilege';
  end if;

  select count(distinct s.user_id) into v_cohort
  from public.wellness_scores s
  join public.assessments a on a.id = s.assessment_id
  where a.kind = p_kind and a.status = 'completed';

  if v_cohort < public.min_cohort_size() then
    return;
  end if;

  return query
  select
    cs.category,
    count(*)::integer,
    round(avg(cs.normalized_score), 1),
    count(*) filter (where cs.status in ('attention', 'priority'))::integer
  from public.wellness_category_scores cs
  join public.wellness_scores s on s.id = cs.wellness_score_id
  join public.assessments a on a.id = s.assessment_id
  where a.kind = p_kind and a.status = 'completed'
  group by cs.category
  order by cs.category;
end;
$$;

-- -----------------------------------------------------------------------------
-- Overall score distribution, in bands rather than values
-- -----------------------------------------------------------------------------
create or replace function public.get_score_distribution()
returns table (band text, student_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cohort integer;
begin
  if not public.is_admin() then
    raise exception 'Not permitted' using errcode = 'insufficient_privilege';
  end if;

  select count(*) into v_cohort from public.wellness_scores;

  if v_cohort < public.min_cohort_size() then
    return;
  end if;

  return query
  select b.label, count(s.id)::integer
  from (values
    ('0-39', 0, 40),
    ('40-59', 40, 60),
    ('60-77', 60, 78),
    ('78-100', 78, 101)
  ) as b(label, lo, hi)
  left join public.wellness_scores s
    on s.overall_score >= b.lo and s.overall_score < b.hi
  group by b.label, b.lo
  order by b.lo;
end;
$$;

-- -----------------------------------------------------------------------------
-- Baseline versus endline
--
-- The whole point of the project: did anything change? Requires a cohort of
-- students who completed BOTH checks, so the comparison is within-subject
-- rather than between two different groups of people.
-- -----------------------------------------------------------------------------
create or replace function public.get_baseline_endline_comparison()
returns table (
  category public.wellness_category,
  student_count integer,
  baseline_average numeric,
  endline_average numeric,
  change numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cohort integer;
begin
  if not public.is_admin() then
    raise exception 'Not permitted' using errcode = 'insufficient_privilege';
  end if;

  select count(*) into v_cohort
  from (
    select a.user_id
    from public.assessments a
    where a.status = 'completed'
    group by a.user_id
    having count(*) filter (where a.kind = 'baseline') > 0
       and count(*) filter (where a.kind = 'endline') > 0
  ) paired;

  if v_cohort < public.min_cohort_size() then
    return;
  end if;

  return query
  with paired as (
    select a.user_id
    from public.assessments a
    where a.status = 'completed'
    group by a.user_id
    having count(*) filter (where a.kind = 'baseline') > 0
       and count(*) filter (where a.kind = 'endline') > 0
  ),
  scored as (
    select
      cs.category,
      a.kind,
      s.user_id,
      cs.normalized_score
    from public.wellness_category_scores cs
    join public.wellness_scores s on s.id = cs.wellness_score_id
    join public.assessments a on a.id = s.assessment_id
    join paired p on p.user_id = s.user_id
    where a.status = 'completed' and a.kind in ('baseline', 'endline')
  )
  select
    sc.category,
    count(distinct sc.user_id)::integer,
    round(avg(sc.normalized_score) filter (where sc.kind = 'baseline'), 1),
    round(avg(sc.normalized_score) filter (where sc.kind = 'endline'), 1),
    round(
      coalesce(avg(sc.normalized_score) filter (where sc.kind = 'endline'), 0)
        - coalesce(avg(sc.normalized_score) filter (where sc.kind = 'baseline'), 0),
      1
    )
  from scored sc
  group by sc.category
  order by sc.category;
end;
$$;

-- -----------------------------------------------------------------------------
-- Habit engagement — behaviour only
-- -----------------------------------------------------------------------------
create or replace function public.get_habit_engagement()
returns table (
  category public.wellness_category,
  habits_assigned integer,
  checkins_logged integer,
  completion_rate numeric
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Not permitted' using errcode = 'insufficient_privilege';
  end if;

  return query
  select
    rh.category,
    count(distinct rh.id)::integer,
    count(c.id)::integer,
    case
      when count(c.id) = 0 then 0
      else round(
        (count(*) filter (where c.status = 'yes')
          + count(*) filter (where c.status = 'partial') * 0.5)
        / count(c.id)::numeric, 2)
    end
  from public.roadmap_habits rh
  left join public.habit_checkins c on c.roadmap_habit_id = rh.id
  group by rh.category
  order by rh.category;
end;
$$;

revoke all on function public.min_cohort_size() from public, anon;
grant execute on function public.min_cohort_size() to authenticated;

revoke all on function public.get_participation_stats() from public, anon;
grant execute on function public.get_participation_stats() to authenticated;

revoke all on function public.get_category_averages(public.assessment_kind) from public, anon;
grant execute on function public.get_category_averages(public.assessment_kind) to authenticated;

revoke all on function public.get_score_distribution() from public, anon;
grant execute on function public.get_score_distribution() to authenticated;

revoke all on function public.get_baseline_endline_comparison() from public, anon;
grant execute on function public.get_baseline_endline_comparison() to authenticated;

revoke all on function public.get_habit_engagement() from public, anon;
grant execute on function public.get_habit_engagement() to authenticated;
