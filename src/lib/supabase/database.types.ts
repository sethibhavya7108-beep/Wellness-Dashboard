/**
 * Database types, hand-maintained to mirror /supabase/migrations.
 *
 * Once your Supabase project is live you can regenerate this file exactly:
 *   npm run db:types
 * Until then, keep it in step with the migrations by hand — the app's type
 * safety depends on it.
 */

export type AppRole =
  | "student"
  | "admin"
  | "super_admin"
  | "reviewer"
  | "event_manager"
  | "content_manager";

export type LivingSituation = "hostel" | "pg" | "day_scholar";
export type AssessmentKind = "baseline" | "endline" | "checkpoint";
export type AssessmentStatus = "in_progress" | "completed";
export type WellnessCategory =
  | "sleep"
  | "hydration"
  | "exercise"
  | "diet"
  | "screen_time"
  | "sitting"
  | "stress";
export type ScoreStatus = "good" | "fair" | "attention" | "priority";
export type DietType = "vegetarian" | "eggetarian" | "non_vegetarian" | "vegan";
export type ExerciseType = "gym" | "sports" | "walking" | "yoga" | "other" | "none";
export type HabitDifficulty = "basic" | "intermediate" | "advanced";
export type HabitFrequency = "daily" | "weekly";
export type CheckinStatus = "yes" | "partial" | "no";
export type ApprovalStatus = "draft" | "pending_review" | "approved" | "rejected";
export type PublishStatus = "draft" | "published" | "archived";
export type ContentType =
  | "article"
  | "infographic"
  | "post"
  | "tip"
  | "challenge_result"
  | "event_highlight";
export type EventStatus = "draft" | "published" | "cancelled" | "completed";
export type RegistrationStatus = "registered" | "cancelled" | "waitlisted";
export type RoadmapStatus = "active" | "completed" | "abandoned";
export type RoadmapHabitStatus = "active" | "completed" | "swapped" | "dropped";
export type PointsReason =
  | "habit_checkin"
  | "streak_bonus"
  | "challenge_completed"
  | "event_attended"
  | "assessment_completed"
  | "badge_awarded"
  | "manual_adjustment";

/** Row plus the subset of columns required when inserting. */
type TableDef<Row, InsertRequired extends keyof Row = never> = {
  Row: Row;
  Insert: Pick<Row, InsertRequired> & Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  batch_year: number | null;
  program: string | null;
  living_situation: LivingSituation | null;
  consent_accepted_at: string | null;
  consent_version: string | null;
  profile_completed_at: string | null;
  /** Opt-in, never assumed: a ranking is a public statement about a person. */
  leaderboard_opt_in: boolean;
  created_at: string;
  updated_at: string;
};

export type UserRoleRow = {
  user_id: string;
  role: AppRole;
  granted_by: string | null;
  granted_at: string;
};

export type ApprovedDomainRow = {
  id: string;
  domain: string;
  label: string;
  is_active: boolean;
  created_at: string;
};

export type SourceRow = {
  id: string;
  organization: string;
  title: string;
  url: string | null;
  published_year: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type RecommendationRow = {
  id: string;
  category: WellnessCategory;
  recommendation: string;
  detail: string | null;
  source_id: string | null;
  review_status: ApprovalStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AssessmentRow = {
  id: string;
  user_id: string;
  kind: AssessmentKind;
  status: AssessmentStatus;
  height_cm: number | null;
  weight_kg: number | null;
  sleep_hours: number | null;
  usual_bedtime: string | null;
  usual_wake_time: string | null;
  meals_per_day: number | null;
  mess_meals_per_week: number | null;
  outside_meals_per_week: number | null;
  junk_meals_per_week: number | null;
  diet_type: DietType | null;
  water_litres_per_day: number | null;
  active_days_per_week: number | null;
  exercise_type: ExerciseType | null;
  exercise_minutes_per_session: number | null;
  screen_hours_per_day: number | null;
  sitting_hours_per_day: number | null;
  stress_level: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WellnessScoreRow = {
  id: string;
  assessment_id: string;
  user_id: string;
  overall_score: number;
  bmi: number | null;
  engine_version: string;
  computed_at: string;
};

export type WellnessCategoryScoreRow = {
  id: string;
  wellness_score_id: string;
  category: WellnessCategory;
  raw_value: number | null;
  normalized_score: number;
  status: ScoreStatus;
  priority_rank: number | null;
};

export type HabitTemplateRow = {
  id: string;
  category: WellnessCategory;
  title: string;
  description: string;
  difficulty: HabitDifficulty;
  frequency: HabitFrequency;
  target_value: number | null;
  target_unit: string | null;
  points: number;
  source_id: string | null;
  approval_status: ApprovalStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type RoadmapRow = {
  id: string;
  user_id: string;
  assessment_id: string | null;
  cycle_start: string;
  cycle_end: string;
  status: RoadmapStatus;
  engine_version: string;
  created_at: string;
  updated_at: string;
};

export type RoadmapHabitRow = {
  id: string;
  roadmap_id: string;
  habit_template_id: string;
  category: WellnessCategory;
  difficulty: HabitDifficulty;
  target_value: number | null;
  points: number;
  position: number;
  status: RoadmapHabitStatus;
  created_at: string;
  updated_at: string;
};

export type HabitCheckinRow = {
  id: string;
  roadmap_habit_id: string;
  user_id: string;
  checkin_date: string;
  status: CheckinStatus;
  mood: number | null;
  energy: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type PointsTransactionRow = {
  id: string;
  user_id: string;
  points: number;
  reason: PointsReason;
  ref_table: string | null;
  ref_id: string | null;
  created_at: string;
};

export type BadgeRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  criteria_type: string;
  criteria_value: number | null;
  icon: string | null;
  is_active: boolean;
  created_at: string;
};

export type UserBadgeRow = {
  user_id: string;
  badge_id: string;
  earned_at: string;
};

export type EventRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  banner_path: string | null;
  capacity: number | null;
  registration_deadline: string | null;
  registration_open: boolean;
  organizer: string | null;
  partner: string | null;
  status: EventStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type EventRegistrationRow = {
  id: string;
  event_id: string;
  user_id: string;
  status: RegistrationStatus;
  attended: boolean;
  registered_at: string;
  updated_at: string;
};

export type ContentRow = {
  id: string;
  slug: string;
  title: string;
  type: ContentType;
  summary: string | null;
  body: string | null;
  cover_path: string | null;
  source_id: string | null;
  status: PublishStatus;
  published_at: string | null;
  author_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AnalyticsEventRow = {
  id: string;
  user_id: string | null;
  name: string;
  properties: Record<string, unknown>;
  created_at: string;
};

export type LeaderboardEntry = {
  rank: number;
  user_id: string;
  full_name: string;
  batch_year: number | null;
  total_points: number;
  is_self: boolean;
};

/**
 * Aggregate reporting shapes (migration 0007).
 *
 * Admins hold no row access to health data; these are the only figures they
 * ever see, and each is suppressed below a minimum cohort size.
 */
export type ParticipationStats = {
  students_onboarded: number;
  baselines_completed: number;
  endlines_completed: number;
  active_roadmaps: number;
  checkins_last_7_days: number;
  events_published: number;
};

export type CategoryAverage = {
  category: WellnessCategory;
  student_count: number;
  average_score: number;
  flagged_count: number;
};

export type BaselineEndlineRow = {
  category: WellnessCategory;
  student_count: number;
  baseline_average: number;
  endline_average: number;
  change: number;
};

export type HabitEngagementRow = {
  category: WellnessCategory;
  habits_assigned: number;
  checkins_logged: number;
  completion_rate: number;
};

export type Database = {
  public: {
    Tables: {
      approved_email_domains: TableDef<ApprovedDomainRow, "domain" | "label">;
      profiles: TableDef<ProfileRow, "id" | "email">;
      user_roles: TableDef<UserRoleRow, "user_id" | "role">;
      sources: TableDef<SourceRow, "organization" | "title">;
      recommendations: TableDef<RecommendationRow, "category" | "recommendation">;
      assessments: TableDef<AssessmentRow, "user_id">;
      wellness_scores: TableDef<
        WellnessScoreRow,
        "assessment_id" | "user_id" | "overall_score" | "engine_version"
      >;
      wellness_category_scores: TableDef<
        WellnessCategoryScoreRow,
        "wellness_score_id" | "category" | "normalized_score" | "status"
      >;
      habit_templates: TableDef<
        HabitTemplateRow,
        "category" | "title" | "description" | "difficulty"
      >;
      roadmaps: TableDef<RoadmapRow, "user_id" | "cycle_start" | "cycle_end" | "engine_version">;
      roadmap_habits: TableDef<
        RoadmapHabitRow,
        "roadmap_id" | "habit_template_id" | "category" | "difficulty"
      >;
      habit_checkins: TableDef<
        HabitCheckinRow,
        "roadmap_habit_id" | "user_id" | "checkin_date" | "status"
      >;
      points_transactions: TableDef<PointsTransactionRow, "user_id" | "points" | "reason">;
      badges: TableDef<BadgeRow, "code" | "name" | "description" | "criteria_type">;
      user_badges: TableDef<UserBadgeRow, "user_id" | "badge_id">;
      events: TableDef<EventRow, "slug" | "title" | "starts_at">;
      event_registrations: TableDef<EventRegistrationRow, "event_id" | "user_id">;
      content: TableDef<ContentRow, "slug" | "title">;
      analytics_events: TableDef<AnalyticsEventRow, "name">;
    };
    Views: Record<never, never>;
    Functions: {
      is_email_domain_approved: {
        Args: { check_email: string };
        Returns: boolean;
      };
      is_admin: {
        Args: { check_user_id?: string };
        Returns: boolean;
      };
      has_role: {
        Args: { check_user_id: string; check_role: AppRole };
        Returns: boolean;
      };
      has_any_role: {
        Args: { check_roles: AppRole[] };
        Returns: boolean;
      };
      get_leaderboard: {
        Args: { result_limit?: number; result_offset?: number };
        Returns: LeaderboardEntry[];
      };
      log_habit_checkin: {
        Args: {
          p_roadmap_habit_id: string;
          p_status: CheckinStatus;
          p_mood?: number | null;
          p_energy?: number | null;
          p_note?: string | null;
          p_date?: string | null;
        };
        Returns: string;
      };
      award_assessment_points: {
        Args: { p_assessment_id: string };
        Returns: void;
      };
      current_streak_days: {
        Args: { p_user_id: string };
        Returns: number;
      };
      consistency_rules: {
        Args: Record<never, never>;
        Returns: {
          weekly_days_required: number;
          weekly_points: number;
          monthly_days_required: number;
          monthly_points: number;
        }[];
      };
      consistency_summary: {
        Args: { p_user_id?: string };
        Returns: {
          week_start: string;
          days_this_week: number;
          weekly_target: number;
          month_start: string;
          days_this_month: number;
          monthly_target: number;
          current_streak: number;
        }[];
      };
      award_consistency_points: {
        Args: Record<never, never>;
        Returns: void;
      };
      habit_history: {
        Args: { p_days?: number };
        Returns: {
          roadmap_habit_id: string;
          category: WellnessCategory;
          checkin_date: string;
          status: CheckinStatus;
        }[];
      };
      get_daily_activity: {
        Args: { p_days?: number };
        Returns: {
          day: string;
          accounts_made: number;
          signed_in: number;
          checked_in: number;
        }[];
      };
      evaluate_badges: {
        Args: Record<never, never>;
        Returns: { code: string; name: string }[];
      };
      register_for_event: {
        Args: { p_event_id: string };
        Returns: RegistrationStatus;
      };
      cancel_event_registration: {
        Args: { p_event_id: string };
        Returns: void;
      };
      mark_event_attendance: {
        Args: { p_event_id: string; p_user_id: string; p_attended: boolean };
        Returns: void;
      };
      event_registration_count: {
        Args: { p_event_id: string };
        Returns: number;
      };
      get_participation_stats: {
        Args: Record<never, never>;
        Returns: ParticipationStats[];
      };
      get_category_averages: {
        Args: { p_kind?: AssessmentKind };
        Returns: CategoryAverage[];
      };
      get_score_distribution: {
        Args: Record<never, never>;
        Returns: { band: string; student_count: number }[];
      };
      get_baseline_endline_comparison: {
        Args: Record<never, never>;
        Returns: BaselineEndlineRow[];
      };
      get_habit_engagement: {
        Args: Record<never, never>;
        Returns: HabitEngagementRow[];
      };
    };
    Enums: {
      app_role: AppRole;
      living_situation: LivingSituation;
      assessment_kind: AssessmentKind;
      assessment_status: AssessmentStatus;
      wellness_category: WellnessCategory;
      score_status: ScoreStatus;
      diet_type: DietType;
      exercise_type: ExerciseType;
      habit_difficulty: HabitDifficulty;
      habit_frequency: HabitFrequency;
      checkin_status: CheckinStatus;
      approval_status: ApprovalStatus;
      publish_status: PublishStatus;
      content_type: ContentType;
      event_status: EventStatus;
      registration_status: RegistrationStatus;
      roadmap_status: RoadmapStatus;
      roadmap_habit_status: RoadmapHabitStatus;
      points_reason: PointsReason;
    };
    CompositeTypes: Record<never, never>;
  };
};
