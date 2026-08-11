\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

-- ============================================================================
-- Functional tests against the applied migrations.
-- Each line prints PASS or FAIL.
-- ============================================================================

-- 1. Approved domain: signup provisions a profile and the student role.
insert into auth.users (id, email)
values ('11111111-1111-1111-1111-111111111111', 'alice@sscbs.du.ac.in');

insert into auth.users (id, email)
values ('22222222-2222-2222-2222-222222222222', 'bob@sscbs.du.ac.in');

select case when count(*) = 2 then 'PASS' else 'FAIL' end
  || ' 1. approved domain signup creates profiles'
from public.profiles;

select case when count(*) = 2 then 'PASS' else 'FAIL' end
  || ' 2. signup grants the student role'
from public.user_roles where role = 'student';

-- 3. Unapproved domain is rejected by the database trigger.
do $$
declare ok boolean := false;
begin
  begin
    insert into auth.users (id, email)
    values ('33333333-3333-3333-3333-333333333333', 'mallory@gmail.com');
  exception when others then
    ok := true;
  end;
  raise notice '% 3. unapproved domain is rejected at the database', case when ok then 'PASS' else 'FAIL' end;
end $$;

-- 4. Check constraints reject impossible health values.
do $$
declare ok boolean := false;
begin
  begin
    insert into public.assessments (user_id, sleep_hours)
    values ('11111111-1111-1111-1111-111111111111', 99);
  exception when check_violation then
    ok := true;
  end;
  raise notice '% 4. impossible sleep value rejected by constraint', case when ok then 'PASS' else 'FAIL' end;
end $$;

-- 5. status/completed_at must agree.
do $$
declare ok boolean := false;
begin
  begin
    insert into public.assessments (user_id, status)
    values ('11111111-1111-1111-1111-111111111111', 'completed');
  exception when check_violation then
    ok := true;
  end;
  raise notice '% 5. completed assessment without completed_at rejected', case when ok then 'PASS' else 'FAIL' end;
end $$;

-- 6. A recommendation cannot be approved without a source and a reviewer.
do $$
declare ok boolean := false;
begin
  begin
    insert into public.recommendations (category, recommendation, review_status)
    values ('sleep', 'Sleep more, obviously.', 'approved');
  exception when check_violation then
    ok := true;
  end;
  raise notice '% 6. medical claim cannot be approved without evidence', case when ok then 'PASS' else 'FAIL' end;
end $$;

-- Seed data owned by each student, written as the owner (bypasses RLS).
insert into public.assessments (id, user_id, kind, status, sleep_hours, water_litres_per_day, completed_at)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'baseline', 'completed', 5, 1.0, now()),
  ('aaaaaaaa-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'baseline', 'completed', 8, 3.0, now());

insert into public.points_transactions (user_id, points, reason)
values
  ('11111111-1111-1111-1111-111111111111', 50, 'habit_checkin'),
  ('22222222-2222-2222-2222-222222222222', 80, 'habit_checkin');

update public.profiles set profile_completed_at = now(), full_name = 'Alice', batch_year = 2028
  where id = '11111111-1111-1111-1111-111111111111';
update public.profiles set profile_completed_at = now(), full_name = 'Bob', batch_year = 2027
  where id = '22222222-2222-2222-2222-222222222222';

-- ---------------------------------------------------------------- as Alice
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);

select case when count(*) = 1 then 'PASS' else 'FAIL' end
  || ' 7. student reads their own assessment'
from public.assessments;

select case when count(*) = 0 then 'PASS' else 'FAIL' end
  || ' 8. student CANNOT read another student''s assessment'
from public.assessments where user_id = '22222222-2222-2222-2222-222222222222';

select case when count(*) = 1 then 'PASS' else 'FAIL' end
  || ' 9. student reads only their own profile'
from public.profiles;

select case when count(*) = 1 then 'PASS' else 'FAIL' end
  || ' 10. student reads only their own points'
from public.points_transactions;

do $$
declare ok boolean := false;
begin
  begin
    insert into public.points_transactions (user_id, points, reason)
    values ('11111111-1111-1111-1111-111111111111', 9999, 'manual_adjustment');
  exception when insufficient_privilege then
    ok := true;
  end;
  raise notice '% 11. student CANNOT mint their own points', case when ok then 'PASS' else 'FAIL' end;
end $$;

select case when count(*) = 0 then 'PASS' else 'FAIL' end
  || ' 12. unapproved medical recommendations are invisible to students'
from public.recommendations;

select case when count(*) = 21 then 'PASS' else 'FAIL' end
  || ' 13. approved habit library is readable by students'
from public.habit_templates;

-- Leaderboard: both students visible, but only safe columns exist.
select case when count(*) = 2 then 'PASS' else 'FAIL' end
  || ' 14. leaderboard ranks every student on points'
from public.get_leaderboard(50, 0);

select case when bool_and(is_self = (user_id = '11111111-1111-1111-1111-111111111111'))
            then 'PASS' else 'FAIL' end
  || ' 15. leaderboard marks the caller correctly'
from public.get_leaderboard(50, 0);
rollback;

-- Email is frozen after signup.
do $$
declare changed text;
begin
  update public.profiles set email = 'attacker@sscbs.du.ac.in'
    where id = '11111111-1111-1111-1111-111111111111';
  select email into changed from public.profiles
    where id = '11111111-1111-1111-1111-111111111111';
  raise notice '% 16. profile email cannot be changed after signup',
    case when changed = 'alice@sscbs.du.ac.in' then 'PASS' else 'FAIL' end;
end $$;

-- ---------------------------------------------------------------- as an admin
insert into public.user_roles (user_id, role)
values ('22222222-2222-2222-2222-222222222222', 'admin');

begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);

select case when count(*) = 2 then 'PASS' else 'FAIL' end
  || ' 17. admin reads all profiles (segmentation data)'
from public.profiles;

select case when count(*) = 1 then 'PASS' else 'FAIL' end
  || ' 18. admin CANNOT read student health data (own row only)'
from public.assessments;

select case when public.is_admin() then 'PASS' else 'FAIL' end
  || ' 19. is_admin() resolves without RLS recursion';
rollback;

-- An ordinary admin cannot grant themselves a higher role.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);
do $$
declare ok boolean := false;
begin
  begin
    insert into public.user_roles (user_id, role)
    values ('22222222-2222-2222-2222-222222222222', 'super_admin');
  exception when insufficient_privilege then
    ok := true;
  end;
  raise notice '% 20. ordinary admin CANNOT escalate to super_admin', case when ok then 'PASS' else 'FAIL' end;
end $$;
rollback;

-- ---------------------------------------------------------------- as anonymous
begin;
set local role anon;
select set_config('request.jwt.claims', '', true);

select case when count(*) = 0 then 'PASS' else 'FAIL' end
  || ' 21. anonymous visitor reads no profiles'
from public.profiles;

select case when count(*) = 0 then 'PASS' else 'FAIL' end
  || ' 22. anonymous visitor reads no assessments'
from public.assessments;

select case when public.is_email_domain_approved('someone@sscbs.du.ac.in')
             and not public.is_email_domain_approved('someone@gmail.com')
            then 'PASS' else 'FAIL' end
  || ' 23. domain check works for anonymous callers (login screen)';
rollback;

-- One completed baseline per student.
do $$
declare ok boolean := false;
begin
  begin
    insert into public.assessments (user_id, kind, status, completed_at)
    values ('11111111-1111-1111-1111-111111111111', 'baseline', 'completed', now());
  exception when unique_violation then
    ok := true;
  end;
  raise notice '% 24. only one completed baseline per student', case when ok then 'PASS' else 'FAIL' end;
end $$;

-- Points ledger idempotency.
do $$
declare ok boolean := false;
begin
  insert into public.points_transactions (user_id, points, reason, ref_table, ref_id)
  values ('11111111-1111-1111-1111-111111111111', 10, 'habit_checkin', 'habit_checkins',
          'bbbbbbbb-0000-0000-0000-000000000001');
  begin
    insert into public.points_transactions (user_id, points, reason, ref_table, ref_id)
    values ('11111111-1111-1111-1111-111111111111', 10, 'habit_checkin', 'habit_checkins',
            'bbbbbbbb-0000-0000-0000-000000000001');
  exception when unique_violation then
    ok := true;
  end;
  raise notice '% 25. the same check-in cannot be paid points twice', case when ok then 'PASS' else 'FAIL' end;
end $$;
