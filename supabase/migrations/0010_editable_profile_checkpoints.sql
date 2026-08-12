-- =============================================================================
-- 0010_editable_profile_checkpoints.sql
--
-- Two changes, both about letting a student change their mind:
--   1. Repeatable checkpoint assessments, so health status and goals can be
--      updated at any time.
--   2. A role-granting function so a super admin can appoint other admins from
--      the interface rather than from the SQL editor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Repeatable checkpoints
--
-- Baseline and endline stay one-each: they are the before-and-after that the
-- whole impact measure rests on, and a second baseline would make the
-- comparison meaningless. A checkpoint is different — it is a student saying
-- "this is where I am now", which they may do as often as they like.
-- -----------------------------------------------------------------------------
drop index if exists public.assessments_one_completed_per_kind_idx;

create unique index assessments_one_completed_per_kind_idx
  on public.assessments (user_id, kind)
  where status = 'completed' and kind in ('baseline', 'endline');

-- -----------------------------------------------------------------------------
-- 2. Granting roles from the admin interface
--
-- Writes to user_roles are restricted to super admins by RLS. This function
-- exists so the app can grant a role by email address without first exposing a
-- lookup from email to user id, and so the "never remove the last super admin"
-- rule is enforced in one place rather than in whichever screen calls it.
-- -----------------------------------------------------------------------------
create or replace function public.set_user_role(
  p_email text,
  p_role public.app_role,
  p_grant boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_target uuid;
  v_super_count integer;
begin
  if v_actor is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  if not public.has_role(v_actor, 'super_admin') then
    raise exception 'Only a super admin can change roles' using errcode = 'insufficient_privilege';
  end if;

  select p.id into v_target
  from public.profiles p
  where lower(p.email::text) = lower(btrim(p_email));

  if v_target is null then
    raise exception 'No account with that email. They must sign in once first.'
      using errcode = 'no_data_found';
  end if;

  if p_grant then
    insert into public.user_roles (user_id, role, granted_by)
    values (v_target, p_role, v_actor)
    on conflict (user_id, role) do nothing;
  else
    -- Locking yourself out of role management is not recoverable from inside
    -- the app, so the last super admin cannot be removed.
    if p_role = 'super_admin' then
      select count(*) into v_super_count
      from public.user_roles where role = 'super_admin';

      if v_super_count <= 1 then
        raise exception 'That is the only super admin. Appoint another one first.'
          using errcode = 'check_violation';
      end if;
    end if;

    -- 'student' is granted automatically at signup and is not a privilege, so
    -- revoking it would only produce a confusing half-account.
    if p_role = 'student' then
      raise exception 'The student role cannot be removed' using errcode = 'check_violation';
    end if;

    delete from public.user_roles
    where user_id = v_target and role = p_role;
  end if;
end;
$$;

-- Listing who holds what. Admins may already read user_roles and profiles
-- through their own policies; this exists so one query returns the joined view
-- with a stable shape rather than the app stitching two together.
create or replace function public.list_team()
returns table (
  user_id     uuid,
  email       text,
  full_name   text,
  roles       public.app_role[],
  created_at  timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Not permitted' using errcode = 'insufficient_privilege';
  end if;

  return query
  select
    p.id,
    p.email::text,
    p.full_name,
    array_agg(r.role order by r.role),
    p.created_at
  from public.profiles p
  join public.user_roles r on r.user_id = p.id
  where r.role <> 'student'
  group by p.id, p.email, p.full_name, p.created_at
  order by p.created_at;
end;
$$;

revoke all on function public.set_user_role(text, public.app_role, boolean) from public, anon;
grant execute on function public.set_user_role(text, public.app_role, boolean) to authenticated;

revoke all on function public.list_team() from public, anon;
grant execute on function public.list_team() to authenticated;
