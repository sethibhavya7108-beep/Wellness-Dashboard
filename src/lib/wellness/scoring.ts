import type { AssessmentRow, ScoreStatus, WellnessCategory } from "@/lib/supabase/database.types";
import {
  BMI_BANDS,
  BMI_REVIEW_STATUS,
  CATEGORY_ORDER,
  CATEGORY_RULES,
  FLAGGED_STATUSES,
  MAX_PRIORITIES,
  MIN_PRIORITIES,
  OVERALL_BANDS,
  RULES_VERSION,
  STATUS_SEVERITY,
  type Band,
} from "./rules";

/**
 * Deterministic wellness scoring.
 *
 * Pure functions only: same input, same output, no clock, no network, no model.
 * This is what makes a student's score auditable and reproducible months later.
 * All thresholds come from ./rules.ts — none are written here.
 */

export type CategoryScore = {
  category: WellnessCategory;
  label: string;
  unit: string;
  /** The value actually fed to the bands, after any derivation. */
  rawValue: number | null;
  normalizedScore: number;
  status: ScoreStatus;
  flagCopy: string;
};

export type BmiResult = {
  value: number;
  label: string;
  reviewStatus: typeof BMI_REVIEW_STATUS;
};

export type WellnessResult = {
  engineVersion: string;
  overallScore: number;
  overallLabel: string;
  categories: CategoryScore[];
  /** Two or three flagged categories, most severe first. Never more. */
  priorities: CategoryScore[];
  bmi: BmiResult | null;
  /** Categories the student left blank, so the UI can invite them back. */
  missing: WellnessCategory[];
};

/** Find the band containing `value` (min <= value < max). */
function matchBand(bands: Band[], value: number): Band {
  for (const band of bands) {
    if (value >= band.min && value < band.max) return band;
  }
  // Bands are authored to be exhaustive; fall back to the worst rather than
  // throwing, so one odd input can never break a student's whole summary.
  return bands.reduce((worst, b) => (b.score < worst.score ? b : worst), bands[0]);
}

/** Weekly active minutes, the raw input for the movement category. */
export function computeExerciseRaw(a: Pick<AssessmentRow, "active_days_per_week" | "exercise_minutes_per_session" | "exercise_type">): number | null {
  if (a.exercise_type === "none") return 0;
  if (a.active_days_per_week == null || a.exercise_minutes_per_session == null) return null;
  return a.active_days_per_week * a.exercise_minutes_per_session;
}

/**
 * Diet quality as a 0-100 composite.
 *
 * Three equally weighted components, each a simple linear penalty:
 *   - eating a sensible number of meals per day
 *   - how often meals come from outside the mess or home
 *   - how often those meals are fried or packaged
 *
 * Deliberately crude and readable. It is a product heuristic for prioritising
 * habits, not a nutritional assessment.
 */
export function computeDietRaw(
  a: Pick<AssessmentRow, "meals_per_day" | "outside_meals_per_week" | "junk_meals_per_week">,
): number | null {
  const { meals_per_day: meals, outside_meals_per_week: outside, junk_meals_per_week: junk } = a;
  if (meals == null && outside == null && junk == null) return null;

  // 3 meals is the reference point; each meal away from it costs 25 points.
  const mealsScore = meals == null ? 60 : clamp(100 - Math.abs(meals - 3) * 25, 0, 100);
  // 0 outside meals scores 100; 14 or more scores 0.
  const outsideScore = outside == null ? 60 : clamp(100 - (outside / 14) * 100, 0, 100);
  // 0 junk meals scores 100; 10 or more scores 0.
  const junkScore = junk == null ? 60 : clamp(100 - (junk / 10) * 100, 0, 100);

  return round((mealsScore + outsideScore + junkScore) / 3);
}

/** The raw value each category is scored on, or null when unanswered. */
export function rawValueFor(category: WellnessCategory, a: AssessmentRow): number | null {
  switch (category) {
    case "sleep":
      return a.sleep_hours;
    case "hydration":
      return a.water_litres_per_day;
    case "exercise":
      return computeExerciseRaw(a);
    case "diet":
      return computeDietRaw(a);
    case "screen_time":
      return a.screen_hours_per_day;
    case "sitting":
      return a.sitting_hours_per_day;
    case "stress":
      return a.stress_level;
  }
}

export function computeBmi(heightCm: number | null, weightKg: number | null): BmiResult | null {
  if (!heightCm || !weightKg || heightCm <= 0) return null;
  const metres = heightCm / 100;
  const value = round(weightKg / (metres * metres), 1);
  const band = BMI_BANDS.find((b) => value >= b.min && value < b.max);
  return { value, label: band?.label ?? "Outside the usual range", reviewStatus: BMI_REVIEW_STATUS };
}

/**
 * Score one assessment.
 *
 * Unanswered categories are excluded from the overall score rather than scored
 * as zero — a student who skips a question is not penalised for it.
 */
export function scoreAssessment(assessment: AssessmentRow): WellnessResult {
  const categories: CategoryScore[] = [];
  const missing: WellnessCategory[] = [];

  for (const category of CATEGORY_ORDER) {
    const rule = CATEGORY_RULES[category];
    const rawValue = rawValueFor(category, assessment);

    if (rawValue == null) {
      missing.push(category);
      continue;
    }

    const band = matchBand(rule.bands, rawValue);
    categories.push({
      category,
      label: rule.label,
      unit: rule.unit,
      rawValue,
      normalizedScore: band.score,
      status: band.status,
      flagCopy: rule.flagCopy,
    });
  }

  const overallScore = weightedAverage(categories);

  return {
    engineVersion: RULES_VERSION,
    overallScore,
    overallLabel:
      OVERALL_BANDS.find((b) => overallScore >= b.min && overallScore < b.max)?.label ??
      "A few things to fix",
    categories,
    priorities: selectPriorities(categories),
    bmi: computeBmi(assessment.height_cm, assessment.weight_kg),
    missing,
  };
}

/** Overall score: weighted mean of answered categories. BMI is never included. */
export function weightedAverage(categories: CategoryScore[]): number {
  if (categories.length === 0) return 0;
  let weighted = 0;
  let weights = 0;
  for (const c of categories) {
    const w = CATEGORY_RULES[c.category].weight;
    weighted += c.normalizedScore * w;
    weights += w;
  }
  return round(weighted / weights);
}

/**
 * Choose the two or three areas to put in front of the student.
 *
 * Ranking: worse status first, then lower score, then higher category weight,
 * then a fixed category order so the result never depends on object iteration
 * order. If fewer than MIN_PRIORITIES categories are flagged, the next-weakest
 * categories are pulled in so a roadmap always has something to work on.
 */
export function selectPriorities(categories: CategoryScore[]): CategoryScore[] {
  const rank = (a: CategoryScore, b: CategoryScore) =>
    STATUS_SEVERITY[b.status] - STATUS_SEVERITY[a.status] ||
    a.normalizedScore - b.normalizedScore ||
    CATEGORY_RULES[b.category].weight - CATEGORY_RULES[a.category].weight ||
    CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);

  const flagged = categories.filter((c) => FLAGGED_STATUSES.includes(c.status)).sort(rank);

  if (flagged.length >= MIN_PRIORITIES) {
    return flagged.slice(0, MAX_PRIORITIES);
  }

  const rest = categories.filter((c) => !flagged.includes(c)).sort(rank);
  return [...flagged, ...rest].slice(0, Math.max(MIN_PRIORITIES, flagged.length));
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

function round(v: number, dp = 0) {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}
