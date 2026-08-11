-- =============================================================================
-- 0001_init.sql — extensions, enums, core tables, indexes
-- Campus Wellness Dashboard (NationBuilding Impact Chapter, SSCBS)
--
-- Design notes are in /docs/DATABASE.md. Keep this file and that document in
-- sync. All primary keys are UUIDs; all tables carry created_at; mutable
-- tables also carry updated_at maintained by a trigger (see 0002).
-- =============================================================================

create extension if not exists "pgcrypto";  -- gen_random_uuid()
create extension if not exists "citext";    -- case-insensitive email

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.app_role as enum (
  'student', 'admin', 'super_admin', 'reviewer', 'event_manager', 'content_manager'
);

create type public.living_situation as enum ('hostel', 'pg', 'day_scholar');

create type public.assessment_kind as enum ('baseline', 'endline', 'checkpoint');
create type public.assessment_status as enum ('in_progress', 'completed');

create type public.wellness_category as enum (
  'sleep', 'hydration', 'exercise', 'diet', 'screen_time', 'sitting', 'stress'
);

-- Ordered from healthiest to most in need of attention.
create type public.score_status as enum ('good', 'fair', 'attention', 'priority');

create type public.diet_type as enum ('vegetarian', 'eggetarian', 'non_vegetarian', 'vegan');
create type public.exercise_type as enum ('gym', 'sports', 'walking', 'yoga', 'other', 'none');

create type public.habit_difficulty as enum ('basic', 'intermediate', 'advanced');
create type public.habit_frequency as enum ('daily', 'weekly');
create type public.checkin_status as enum ('yes', 'partial', 'no');

create type public.approval_status as enum ('draft', 'pending_review', 'approved', 'rejected');
create type public.publish_status as enum ('draft', 'published', 'archived');

create type public.content_type as enum (
  'article', 'infographic', 'post', 'tip', 'challenge_result', 'event_highlight'
);

create type public.event_status as enum ('draft', 'published', 'cancelled', 'completed');
create type public.registration_status as enum ('registered', 'cancelled', 'waitlisted');

create type public.roadmap_status as enum ('active', 'completed', 'abandoned');
create type public.roadmap_habit_status as enum ('active', 'completed', 'swapped', 'dropped');

create type public.points_reason as enum (
  'habit_checkin', 'streak_bonus', 'challenge_completed', 'event_attended',
  'assessment_completed', 'badge_awarded', 'manual_adjustment'
);

-- -----------------------------------------------------------------------------
-- Registration control: approved college email domains
-- Configuration lives in the database so new DU colleges can be onboarded
-- without redeploying the application.
-- -----------------------------------------------------------------------------
create table public.approved_email_domains (
  id          uuid primary key default gen_random_uuid(),
  domain      citext not null unique,
  label       text   not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint approved_email_domains_domain_shape
    check (domain ~ '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$')
);

-- -----------------------------------------------------------------------------
-- Profiles — one row per authenticated student, 1:1 with auth.users
-- -----------------------------------------------------------------------------
create table public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  email              citext not null unique,
  full_name          text,
  batch_year         smallint,
  program            text,
  living_situation   public.living_situation,
  consent_accepted_at timestamptz,
  consent_version    text,
  profile_completed_at timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint profiles_batch_year_range
    check (batch_year is null or batch_year between 2000 and 2100),
  constraint profiles_full_name_len
    check (full_name is null or char_length(btrim(full_name)) between 2 and 80),
  constraint profiles_program_len
    check (program is null or char_length(btrim(program)) between 2 and 120)
);

create index profiles_batch_year_idx on public.profiles (batch_year);
create index profiles_living_situation_idx on public.profiles (living_situation);
create index profiles_created_at_idx on public.profiles (created_at desc);

-- -----------------------------------------------------------------------------
-- Roles — a user may hold more than one role
-- -----------------------------------------------------------------------------
create table public.user_roles (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       public.app_role not null,
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create index user_roles_role_idx on public.user_roles (role);

-- -----------------------------------------------------------------------------
-- Evidence library — sources and reviewed recommendations
-- -----------------------------------------------------------------------------
create table public.sources (
  id           uuid primary key default gen_random_uuid(),
  organization text not null,
  title        text not null,
  url          text,
  published_year smallint,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint sources_url_shape check (url is null or url ~* '^https?://')
);

create table public.recommendations (
  id             uuid primary key default gen_random_uuid(),
  category       public.wellness_category not null,
  recommendation text not null,
  detail         text,
  source_id      uuid references public.sources(id) on delete restrict,
  review_status  public.approval_status not null default 'draft',
  reviewed_by    uuid references public.profiles(id) on delete set null,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- An approved recommendation must cite a source and name its reviewer.
  constraint recommendations_approved_requires_evidence
    check (review_status <> 'approved' or (source_id is not null and reviewed_at is not null))
);

create index recommendations_category_idx on public.recommendations (category, review_status);

-- -----------------------------------------------------------------------------
-- Assessments — baseline / endline / checkpoint
-- Columns are explicit (not JSON) so aggregate analytics stay queryable.
-- -----------------------------------------------------------------------------
create table public.assessments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  kind          public.assessment_kind not null default 'baseline',
  status        public.assessment_status not null default 'in_progress',

  -- Body metrics
  height_cm     numeric(5,1),
  weight_kg     numeric(5,1),

  -- Sleep
  sleep_hours       numeric(3,1),
  usual_bedtime     time,
  usual_wake_time   time,

  -- Diet
  meals_per_day             smallint,
  mess_meals_per_week       smallint,
  outside_meals_per_week    smallint,
  junk_meals_per_week       smallint,
  diet_type                 public.diet_type,

  -- Hydration
  water_litres_per_day  numeric(3,1),

  -- Exercise
  active_days_per_week      smallint,
  exercise_type             public.exercise_type,
  exercise_minutes_per_session smallint,

  -- Screen and sitting
  screen_hours_per_day   numeric(3,1),
  sitting_hours_per_day  numeric(3,1),

  -- Stress (self-rated, 1 = very low, 5 = very high)
  stress_level  smallint,

  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint assessments_height_range  check (height_cm is null or height_cm between 100 and 250),
  constraint assessments_weight_range  check (weight_kg is null or weight_kg between 25 and 250),
  constraint assessments_sleep_range   check (sleep_hours is null or sleep_hours between 0 and 24),
  constraint assessments_meals_range   check (meals_per_day is null or meals_per_day between 0 and 10),
  constraint assessments_mess_range    check (mess_meals_per_week is null or mess_meals_per_week between 0 and 21),
  constraint assessments_outside_range check (outside_meals_per_week is null or outside_meals_per_week between 0 and 21),
  constraint assessments_junk_range    check (junk_meals_per_week is null or junk_meals_per_week between 0 and 21),
  constraint assessments_water_range   check (water_litres_per_day is null or water_litres_per_day between 0 and 10),
  constraint assessments_active_range  check (active_days_per_week is null or active_days_per_week between 0 and 7),
  constraint assessments_exercise_min_range
    check (exercise_minutes_per_session is null or exercise_minutes_per_session between 0 and 300),
  constraint assessments_screen_range  check (screen_hours_per_day is null or screen_hours_per_day between 0 and 24),
  constraint assessments_sitting_range check (sitting_hours_per_day is null or sitting_hours_per_day between 0 and 24),
  constraint assessments_stress_range  check (stress_level is null or stress_level between 1 and 5),
  constraint assessments_completed_shape
    check ((status = 'completed') = (completed_at is not null))
);

create index assessments_user_kind_idx on public.assessments (user_id, kind, created_at desc);
create index assessments_status_idx on public.assessments (status, completed_at desc);

-- Exactly one completed assessment per user per kind.
create unique index assessments_one_completed_per_kind_idx
  on public.assessments (user_id, kind)
  where status = 'completed';

-- -----------------------------------------------------------------------------
-- Wellness scores — derived, but stored because the rules file may change and
-- historical scores must remain reproducible for impact reporting.
-- -----------------------------------------------------------------------------
create table public.wellness_scores (
  id             uuid primary key default gen_random_uuid(),
  assessment_id  uuid not null unique references public.assessments(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  overall_score  smallint not null,
  bmi            numeric(4,1),
  engine_version text not null,
  computed_at    timestamptz not null default now(),
  constraint wellness_scores_overall_range check (overall_score between 0 and 100)
);

create index wellness_scores_user_idx on public.wellness_scores (user_id, computed_at desc);

create table public.wellness_category_scores (
  id                uuid primary key default gen_random_uuid(),
  wellness_score_id uuid not null references public.wellness_scores(id) on delete cascade,
  category          public.wellness_category not null,
  raw_value         numeric(6,2),
  normalized_score  smallint not null,
  status            public.score_status not null,
  priority_rank     smallint,
  unique (wellness_score_id, category),
  constraint wellness_category_scores_range check (normalized_score between 0 and 100)
);

create index wellness_category_scores_category_idx
  on public.wellness_category_scores (category, status);

-- -----------------------------------------------------------------------------
-- Habit templates — the approved library the roadmap engine draws from
-- -----------------------------------------------------------------------------
create table public.habit_templates (
  id              uuid primary key default gen_random_uuid(),
  category        public.wellness_category not null,
  title           text not null,
  description     text not null,
  difficulty      public.habit_difficulty not null,
  frequency       public.habit_frequency not null default 'daily',
  target_value    numeric(6,2),
  target_unit     text,
  points          smallint not null default 10,
  source_id       uuid references public.sources(id) on delete set null,
  approval_status public.approval_status not null default 'draft',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint habit_templates_points_range check (points between 0 and 100)
);

create index habit_templates_lookup_idx
  on public.habit_templates (category, difficulty, is_active, approval_status);

-- -----------------------------------------------------------------------------
-- Roadmaps — a 2-4 week cycle targeting 2-3 priority categories
-- -----------------------------------------------------------------------------
create table public.roadmaps (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  assessment_id  uuid references public.assessments(id) on delete set null,
  cycle_start    date not null,
  cycle_end      date not null,
  status         public.roadmap_status not null default 'active',
  engine_version text not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint roadmaps_cycle_order check (cycle_end > cycle_start)
);

create index roadmaps_user_idx on public.roadmaps (user_id, cycle_start desc);

-- Only one active roadmap per student at a time.
create unique index roadmaps_one_active_per_user_idx
  on public.roadmaps (user_id) where status = 'active';

create table public.roadmap_habits (
  id                uuid primary key default gen_random_uuid(),
  roadmap_id        uuid not null references public.roadmaps(id) on delete cascade,
  habit_template_id uuid not null references public.habit_templates(id) on delete restrict,
  category          public.wellness_category not null,
  difficulty        public.habit_difficulty not null,
  target_value      numeric(6,2),
  points            smallint not null default 10,
  position          smallint not null default 0,
  status            public.roadmap_habit_status not null default 'active',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index roadmap_habits_roadmap_idx on public.roadmap_habits (roadmap_id, position);

-- -----------------------------------------------------------------------------
-- Daily check-ins
-- -----------------------------------------------------------------------------
create table public.habit_checkins (
  id               uuid primary key default gen_random_uuid(),
  roadmap_habit_id uuid not null references public.roadmap_habits(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  checkin_date     date not null,
  status           public.checkin_status not null,
  mood             smallint,
  energy           smallint,
  note             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (roadmap_habit_id, checkin_date),
  constraint habit_checkins_mood_range   check (mood is null or mood between 1 and 5),
  constraint habit_checkins_energy_range check (energy is null or energy between 1 and 5),
  constraint habit_checkins_note_len     check (note is null or char_length(note) <= 280)
);

create index habit_checkins_user_date_idx on public.habit_checkins (user_id, checkin_date desc);

-- -----------------------------------------------------------------------------
-- Gamification — points and badges reward BEHAVIOUR, never health status.
-- -----------------------------------------------------------------------------
create table public.points_transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  points     smallint not null,
  reason     public.points_reason not null,
  ref_table  text,
  ref_id     uuid,
  created_at timestamptz not null default now(),
  constraint points_transactions_nonzero check (points <> 0)
);

create index points_transactions_user_idx on public.points_transactions (user_id, created_at desc);
create unique index points_transactions_unique_ref_idx
  on public.points_transactions (user_id, reason, ref_table, ref_id)
  where ref_id is not null;

create table public.badges (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  name          text not null,
  description   text not null,
  criteria_type text not null,
  criteria_value numeric(6,2),
  icon          text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create table public.user_badges (
  user_id   uuid not null references public.profiles(id) on delete cascade,
  badge_id  uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- -----------------------------------------------------------------------------
-- Events
-- -----------------------------------------------------------------------------
create table public.events (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique,
  title                text not null,
  description          text,
  starts_at            timestamptz not null,
  ends_at              timestamptz,
  location             text,
  banner_path          text,
  capacity             integer,
  registration_deadline timestamptz,
  registration_open    boolean not null default true,
  organizer            text,
  partner              text,
  status               public.event_status not null default 'draft',
  created_by           uuid references public.profiles(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint events_capacity_positive check (capacity is null or capacity > 0),
  constraint events_time_order check (ends_at is null or ends_at >= starts_at),
  constraint events_slug_shape check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index events_status_starts_idx on public.events (status, starts_at desc);

create table public.event_registrations (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  status        public.registration_status not null default 'registered',
  attended      boolean not null default false,
  registered_at timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (event_id, user_id)
);

create index event_registrations_event_idx on public.event_registrations (event_id, status);
create index event_registrations_user_idx on public.event_registrations (user_id, registered_at desc);

-- -----------------------------------------------------------------------------
-- Awareness content
-- -----------------------------------------------------------------------------
create table public.content (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  type         public.content_type not null default 'article',
  summary      text,
  body         text,
  cover_path   text,
  source_id    uuid references public.sources(id) on delete set null,
  status       public.publish_status not null default 'draft',
  published_at timestamptz,
  author_id    uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint content_slug_shape check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint content_published_shape
    check (status <> 'published' or published_at is not null)
);

create index content_feed_idx on public.content (status, published_at desc);

-- -----------------------------------------------------------------------------
-- Product analytics — kept generic so an external tool can be layered on later
-- without redesigning the schema.
-- -----------------------------------------------------------------------------
create table public.analytics_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete set null,
  name       text not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index analytics_events_name_idx on public.analytics_events (name, created_at desc);
create index analytics_events_user_idx on public.analytics_events (user_id, created_at desc);
