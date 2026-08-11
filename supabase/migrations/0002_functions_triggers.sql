-- =============================================================================
-- 0002_functions_triggers.sql — helper functions, authorization helpers,
-- updated_at maintenance and new-user provisioning.
--
-- All functions pin `search_path = ''` and fully qualify identifiers so that a
-- malicious schema on the caller's search path cannot hijack them.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- updated_at maintenance
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'sources', 'recommendations', 'assessments', 'habit_templates',
    'roadmaps', 'roadmap_habits', 'habit_checkins', 'events',
    'event_registrations', 'content'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.set_updated_at()',
      't_' || t || '_updated_at', t
    );
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Authorization helpers
--
-- These are SECURITY DEFINER so that RLS policies on public.user_roles cannot
-- recurse into themselves when a policy asks "is this user an admin?".
-- -----------------------------------------------------------------------------
create or replace function public.has_role(check_user_id uuid, check_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = check_user_id and r.role = check_role
  );
$$;

-- Treats super_admin as implying admin.
create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = check_user_id
      and r.role in ('admin', 'super_admin')
  );
$$;

-- True when the current user holds any of the supplied roles, or is an admin.
create or replace function public.has_any_role(check_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid()
      and (r.role = any(check_roles) or r.role in ('admin', 'super_admin'))
  );
$$;

-- -----------------------------------------------------------------------------
-- Registration domain gate
-- -----------------------------------------------------------------------------
create or replace function public.is_email_domain_approved(check_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- Compared as text rather than citext on purpose: this function pins
  -- search_path = '', so an operator belonging to an extension type would not
  -- resolve. The allow-list is a handful of rows, so the seq scan is free.
  select exists (
    select 1 from public.approved_email_domains d
    where d.is_active
      and lower(d.domain::text) = lower(split_part(check_email, '@', 2))
  );
$$;

-- -----------------------------------------------------------------------------
-- New user provisioning
--
-- Runs inside the signup transaction. Raising here aborts account creation,
-- which is the last of three enforcement layers for the domain allow-list
-- (client hint -> server action -> this trigger). See /docs/AUTH.md.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_email_domain_approved(new.email) then
    raise exception 'Registration is restricted to approved college email domains.'
      using errcode = 'check_violation';
  end if;

  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'student')
  on conflict do nothing;

  return new;
end;
$$;

create trigger t_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Leaderboard
--
-- Exposed as a SECURITY DEFINER function rather than a view so the projection
-- is explicit: name, batch and points only. No health metric can leak through
-- this surface. Ranking is on behaviour (points earned), never health status.
-- -----------------------------------------------------------------------------
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

revoke all on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

revoke all on function public.is_admin(uuid) from public, anon;
grant execute on function public.is_admin(uuid) to authenticated;

revoke all on function public.has_any_role(public.app_role[]) from public, anon;
grant execute on function public.has_any_role(public.app_role[]) to authenticated;

-- Deliberately callable by anon: the login screen checks a typed domain before
-- sending an OTP. It reveals only whether a domain is on the allow-list.
grant execute on function public.is_email_domain_approved(text) to anon, authenticated;
