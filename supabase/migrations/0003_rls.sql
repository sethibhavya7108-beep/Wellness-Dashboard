-- =============================================================================
-- 0003_rls.sql — Row Level Security
--
-- Posture: deny by default. Every table has RLS enabled; a table with no
-- matching policy for an operation denies that operation. Rationale for the
-- stricter choices is in /docs/SECURITY.md.
--
-- Key decision: administrators have NO direct row access to assessments,
-- wellness scores, check-ins or badges. Individual health data is readable only
-- by the student it belongs to. Admin reporting is served by aggregate
-- SECURITY DEFINER functions added in the analytics phase.
--
-- Every policy names its target role with `to anon` / `to authenticated`.
-- This is not decoration. A policy without a role clause is evaluated for every
-- role, so an anonymous visitor reading a public table would still execute the
-- admin-check function in a sibling policy — and, since those functions are not
-- granted to `anon`, the query fails with "permission denied for function"
-- instead of simply returning no rows. Naming the role keeps anonymous reads on
-- the public policies only.
-- =============================================================================

alter table public.approved_email_domains   enable row level security;
alter table public.profiles                 enable row level security;
alter table public.user_roles               enable row level security;
alter table public.sources                  enable row level security;
alter table public.recommendations          enable row level security;
alter table public.assessments              enable row level security;
alter table public.wellness_scores          enable row level security;
alter table public.wellness_category_scores enable row level security;
alter table public.habit_templates          enable row level security;
alter table public.roadmaps                 enable row level security;
alter table public.roadmap_habits           enable row level security;
alter table public.habit_checkins           enable row level security;
alter table public.points_transactions      enable row level security;
alter table public.badges                   enable row level security;
alter table public.user_badges              enable row level security;
alter table public.events                   enable row level security;
alter table public.event_registrations      enable row level security;
alter table public.content                  enable row level security;
alter table public.analytics_events         enable row level security;

-- -----------------------------------------------------------------------------
-- approved_email_domains — readable by anonymous visitors so the sign-in screen
-- can state which addresses are accepted; writable only by super admins.
-- -----------------------------------------------------------------------------
create policy "domains readable by everyone"
  on public.approved_email_domains for select
  to anon, authenticated
  using (is_active);

create policy "domains managed by super admins"
  on public.approved_email_domains for all
  to authenticated
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

-- -----------------------------------------------------------------------------
-- profiles — a student reads and edits only their own row. Admins may read
-- profile rows (name, batch, course, living situation) for user management and
-- segmentation; these are not health metrics.
-- -----------------------------------------------------------------------------
create policy "profiles readable by owner"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles readable by admins"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

create policy "profiles insertable by owner"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles updatable by owner"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Email is the identity key: it is set once at signup and never client-editable.
create or replace function public.protect_profile_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.id := old.id;
  new.email := old.email;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger t_profiles_protect_identity
  before update on public.profiles
  for each row execute function public.protect_profile_identity();

-- -----------------------------------------------------------------------------
-- user_roles — everyone sees their own roles; admins see all; only super admins
-- may grant or revoke. This prevents an ordinary admin escalating themselves.
-- -----------------------------------------------------------------------------
create policy "roles readable by owner"
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid());

create policy "roles readable by admins"
  on public.user_roles for select
  to authenticated
  using (public.is_admin());

create policy "roles managed by super admins"
  on public.user_roles for all
  to authenticated
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

-- -----------------------------------------------------------------------------
-- Evidence library — citations are public-facing credibility, so anyone may read
-- them. Only reviewers and admins may write.
-- -----------------------------------------------------------------------------
create policy "sources readable by everyone"
  on public.sources for select
  to anon, authenticated
  using (true);

create policy "sources managed by reviewers"
  on public.sources for all
  to authenticated
  using (public.has_any_role(array['reviewer']::public.app_role[]))
  with check (public.has_any_role(array['reviewer']::public.app_role[]));

create policy "approved recommendations readable"
  on public.recommendations for select
  to anon, authenticated
  using (review_status = 'approved');

create policy "recommendations managed by reviewers"
  on public.recommendations for all
  to authenticated
  using (public.has_any_role(array['reviewer']::public.app_role[]))
  with check (public.has_any_role(array['reviewer']::public.app_role[]));

-- -----------------------------------------------------------------------------
-- Health data — owner only. There is deliberately no admin read policy.
-- -----------------------------------------------------------------------------
create policy "assessments owned by student"
  on public.assessments for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "wellness scores readable by owner"
  on public.wellness_scores for select
  to authenticated
  using (user_id = auth.uid());

create policy "wellness scores insertable by owner"
  on public.wellness_scores for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "category scores readable by owner"
  on public.wellness_category_scores for select
  to authenticated
  using (exists (
    select 1 from public.wellness_scores s
    where s.id = wellness_score_id and s.user_id = auth.uid()
  ));

create policy "category scores insertable by owner"
  on public.wellness_category_scores for insert
  to authenticated
  with check (exists (
    select 1 from public.wellness_scores s
    where s.id = wellness_score_id and s.user_id = auth.uid()
  ));

-- -----------------------------------------------------------------------------
-- Habit library and roadmaps
-- -----------------------------------------------------------------------------
create policy "approved habits readable"
  on public.habit_templates for select
  to authenticated
  using (is_active and approval_status = 'approved');

create policy "habits managed by admins"
  on public.habit_templates for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "roadmaps owned by student"
  on public.roadmaps for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "roadmap habits owned by student"
  on public.roadmap_habits for all
  to authenticated
  using (exists (
    select 1 from public.roadmaps r
    where r.id = roadmap_id and r.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.roadmaps r
    where r.id = roadmap_id and r.user_id = auth.uid()
  ));

create policy "checkins owned by student"
  on public.habit_checkins for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Gamification — points are awarded server-side only. There is deliberately no
-- INSERT policy for students, so nobody can mint their own points.
-- -----------------------------------------------------------------------------
create policy "points readable by owner"
  on public.points_transactions for select
  to authenticated
  using (user_id = auth.uid());

create policy "points managed by admins"
  on public.points_transactions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "badges readable by everyone"
  on public.badges for select
  to authenticated
  using (is_active);

create policy "badges managed by admins"
  on public.badges for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "earned badges readable by owner"
  on public.user_badges for select
  to authenticated
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Events — published events are readable by anonymous visitors so they can be
-- shown on the public site.
-- -----------------------------------------------------------------------------
create policy "published events readable"
  on public.events for select
  to anon, authenticated
  using (status in ('published', 'completed'));

create policy "events managed by event managers"
  on public.events for all
  to authenticated
  using (public.has_any_role(array['event_manager']::public.app_role[]))
  with check (public.has_any_role(array['event_manager']::public.app_role[]));

create policy "registrations owned by student"
  on public.event_registrations for select
  to authenticated
  using (user_id = auth.uid());

create policy "registrations created by student"
  on public.event_registrations for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "registrations updated by student"
  on public.event_registrations for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "registrations visible to event managers"
  on public.event_registrations for all
  to authenticated
  using (public.has_any_role(array['event_manager']::public.app_role[]))
  with check (public.has_any_role(array['event_manager']::public.app_role[]));

-- -----------------------------------------------------------------------------
-- Awareness content
-- -----------------------------------------------------------------------------
create policy "published content readable"
  on public.content for select
  to anon, authenticated
  using (status = 'published');

create policy "content managed by content managers"
  on public.content for all
  to authenticated
  using (public.has_any_role(array['content_manager']::public.app_role[]))
  with check (public.has_any_role(array['content_manager']::public.app_role[]));

-- -----------------------------------------------------------------------------
-- Product analytics — append-only from the client, readable only by admins.
-- Properties must never contain health values; see /docs/SECURITY.md.
-- -----------------------------------------------------------------------------
create policy "analytics insertable by self"
  on public.analytics_events for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "analytics readable by admins"
  on public.analytics_events for select
  to authenticated
  using (public.is_admin());
