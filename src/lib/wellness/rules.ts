import type { ScoreStatus, WellnessCategory } from "@/lib/supabase/database.types";

/**
 * THE RULES FILE.
 *
 * Every wellness threshold in the product lives here and nowhere else. No React
 * component, route or SQL query may hard-code a health number. Changing a
 * threshold is a one-file edit followed by a version bump.
 *
 * These bands are INITIAL PRODUCT LOGIC chosen to be conservative and
 * behaviour-oriented. They are not medical criteria and have not been through
 * medical review. Nothing here diagnoses anything. See /docs/SCORING_ENGINE.md
 * and /docs/MEDICAL_EVIDENCE.md.
 */

/** Bump on any threshold, weight or band change. Stored with every score row. */
export const RULES_VERSION = "1.0.0";

/** A half-open band: matches when min <= value < max. */
export type Band = {
  min: number;
  max: number;
  score: number;
  status: ScoreStatus;
};

export type CategoryRule = {
  label: string;
  /** Short description of the raw input, for display next to the score. */
  unit: string;
  /**
   * Relative importance in the overall score. Higher means a poor score in this
   * category pulls the overall figure down harder.
   */
  weight: number;
  /** Evaluated in order; the first band containing the value wins. */
  bands: Band[];
  /** Shown to the student alongside a flagged result. Never a medical claim. */
  flagCopy: string;
};

export const CATEGORY_RULES: Record<WellnessCategory, CategoryRule> = {
  sleep: {
    label: "Sleep",
    unit: "hours per night",
    weight: 1.2,
    // Both tails matter: too little and unusually long both score below the middle.
    bands: [
      { min: 7, max: 9.5, score: 100, status: "good" },
      { min: 6.5, max: 7, score: 78, status: "fair" },
      { min: 9.5, max: 11, score: 75, status: "fair" },
      { min: 6, max: 6.5, score: 58, status: "attention" },
      { min: 11, max: Number.POSITIVE_INFINITY, score: 55, status: "attention" },
      { min: 5, max: 6, score: 38, status: "priority" },
      { min: 0, max: 5, score: 18, status: "priority" },
    ],
    flagCopy: "Short or irregular sleep is the single habit most students say they want back.",
  },

  hydration: {
    label: "Hydration",
    unit: "litres per day",
    weight: 1,
    bands: [
      { min: 2.5, max: Number.POSITIVE_INFINITY, score: 100, status: "good" },
      { min: 2, max: 2.5, score: 85, status: "good" },
      { min: 1.5, max: 2, score: 62, status: "fair" },
      { min: 1, max: 1.5, score: 40, status: "attention" },
      { min: 0, max: 1, score: 18, status: "priority" },
    ],
    flagCopy: "Water intake is the easiest thing on this list to change this week.",
  },

  exercise: {
    label: "Movement",
    unit: "active minutes per week",
    weight: 1.2,
    // Raw value is active_days_per_week x minutes_per_session.
    bands: [
      { min: 150, max: Number.POSITIVE_INFINITY, score: 100, status: "good" },
      { min: 90, max: 150, score: 78, status: "fair" },
      { min: 45, max: 90, score: 55, status: "attention" },
      { min: 15, max: 45, score: 33, status: "priority" },
      { min: 0, max: 15, score: 15, status: "priority" },
    ],
    flagCopy: "Any activity counts, including walking between classes.",
  },

  diet: {
    label: "Diet",
    unit: "diet quality score",
    weight: 1.2,
    // Raw value is a 0-100 composite; see computeDietRaw in scoring.ts.
    bands: [
      { min: 80, max: Number.POSITIVE_INFINITY, score: 100, status: "good" },
      { min: 62, max: 80, score: 78, status: "fair" },
      { min: 42, max: 62, score: 55, status: "attention" },
      { min: 0, max: 42, score: 30, status: "priority" },
    ],
    flagCopy: "Small swaps beat overhauls — one fried snack replaced is a real change.",
  },

  screen_time: {
    label: "Screen time",
    unit: "non-academic hours per day",
    weight: 0.8,
    bands: [
      { min: 0, max: 2, score: 100, status: "good" },
      { min: 2, max: 3.5, score: 78, status: "fair" },
      { min: 3.5, max: 5, score: 52, status: "attention" },
      { min: 5, max: 7, score: 32, status: "priority" },
      { min: 7, max: Number.POSITIVE_INFINITY, score: 15, status: "priority" },
    ],
    flagCopy: "This counts leisure screens only, not lectures or assignments.",
  },

  sitting: {
    label: "Sitting",
    unit: "hours per day",
    weight: 1,
    bands: [
      { min: 0, max: 6, score: 100, status: "good" },
      { min: 6, max: 8, score: 76, status: "fair" },
      { min: 8, max: 10, score: 50, status: "attention" },
      { min: 10, max: 12, score: 30, status: "priority" },
      { min: 12, max: Number.POSITIVE_INFINITY, score: 15, status: "priority" },
    ],
    flagCopy: "Breaking up long sitting stretches matters as much as total time.",
  },

  stress: {
    label: "Stress",
    unit: "self-rated, 1 to 5",
    weight: 1.2,
    bands: [
      { min: 1, max: 2, score: 100, status: "good" },
      { min: 2, max: 3, score: 80, status: "good" },
      { min: 3, max: 4, score: 58, status: "fair" },
      { min: 4, max: 5, score: 36, status: "attention" },
      { min: 5, max: Number.POSITIVE_INFINITY, score: 20, status: "priority" },
    ],
    flagCopy:
      "This is your own rating of academic pressure, not an assessment of your mental health.",
  },
};

export const CATEGORY_ORDER: WellnessCategory[] = [
  "sleep",
  "diet",
  "exercise",
  "hydration",
  "sitting",
  "screen_time",
  "stress",
];

/** How severe each status is when ranking priorities. Higher wins. */
export const STATUS_SEVERITY: Record<ScoreStatus, number> = {
  good: 0,
  fair: 1,
  attention: 2,
  priority: 3,
};

/** Statuses that make a category eligible to become a roadmap priority. */
export const FLAGGED_STATUSES: ScoreStatus[] = ["attention", "priority"];

/** Never put more than this many priorities in front of a student at once. */
export const MAX_PRIORITIES = 3;
export const MIN_PRIORITIES = 2;

/**
 * BMI bands.
 *
 * BMI is displayed as context only. It is deliberately excluded from the
 * wellness score, from priority selection and from every points and badge rule,
 * because it describes health STATUS rather than health BEHAVIOUR.
 *
 * These are the general WHO adult cut-offs. Cut-offs for South Asian
 * populations are debated and differ; this table must be reviewed by a
 * qualified reviewer before the app presents any interpretation to students.
 */
export const BMI_REVIEW_STATUS = "pending_medical_review" as const;

export const BMI_BANDS: { min: number; max: number; label: string }[] = [
  { min: 0, max: 18.5, label: "Below the typical adult range" },
  { min: 18.5, max: 25, label: "Within the typical adult range" },
  { min: 25, max: 30, label: "Above the typical adult range" },
  { min: 30, max: Number.POSITIVE_INFINITY, label: "Well above the typical adult range" },
];

/** Overall wellness score bands, used only for the summary sentence. */
export const OVERALL_BANDS: { min: number; max: number; label: string }[] = [
  { min: 0, max: 40, label: "A lot to work with" },
  { min: 40, max: 60, label: "A few things to fix" },
  { min: 60, max: 78, label: "A solid base" },
  { min: 78, max: 101, label: "Strong across the board" },
];
