import type { AssessmentRow } from "@/lib/supabase/database.types";

/**
 * The baseline check, described once.
 *
 * Both the form and the server action read this file, so a question cannot
 * drift between what a student is shown and what is validated. The numeric
 * bounds mirror the CHECK constraints in `0001_init.sql` exactly — if you widen
 * one, widen the other, or the database will reject a value the form accepted.
 *
 * No health threshold lives here. This file decides what may be *entered*;
 * `rules.ts` decides what a value *means*.
 */

export type NumberField = {
  kind: "number";
  name: NumericFieldName;
  label: string;
  hint?: string;
  suffix?: string;
  min: number;
  max: number;
  step: number;
};

export type SelectField = {
  kind: "select";
  name: EnumFieldName;
  label: string;
  hint?: string;
  options: { value: string; label: string }[];
};

export type TimeField = {
  kind: "time";
  name: TimeFieldName;
  label: string;
  hint?: string;
};

export type ScaleField = {
  kind: "scale";
  name: "stress_level";
  label: string;
  hint?: string;
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
};

export type Field = NumberField | SelectField | TimeField | ScaleField;

export type NumericFieldName =
  | "height_cm"
  | "weight_kg"
  | "sleep_hours"
  | "meals_per_day"
  | "mess_meals_per_week"
  | "outside_meals_per_week"
  | "junk_meals_per_week"
  | "water_litres_per_day"
  | "active_days_per_week"
  | "exercise_minutes_per_session"
  | "screen_hours_per_day"
  | "sitting_hours_per_day";

export type EnumFieldName = "diet_type" | "exercise_type";
export type TimeFieldName = "usual_bedtime" | "usual_wake_time";
export type FieldName = NumericFieldName | EnumFieldName | TimeFieldName | "stress_level";

export type Section = {
  id: string;
  title: string;
  /** Shown under the heading. Sets expectations, never gives health advice. */
  blurb: string;
  fields: Field[];
};

export const SECTIONS: Section[] = [
  {
    id: "about",
    title: "About you",
    blurb:
      "Height and weight are optional. They are used only to show your BMI back to you as context — they never affect your score, your roadmap or any leaderboard.",
    fields: [
      {
        kind: "number",
        name: "height_cm",
        label: "Height",
        suffix: "cm",
        min: 100,
        max: 250,
        step: 0.5,
      },
      {
        kind: "number",
        name: "weight_kg",
        label: "Weight",
        suffix: "kg",
        min: 25,
        max: 250,
        step: 0.5,
      },
    ],
  },
  {
    id: "sleep",
    title: "Sleep",
    blurb: "On a normal college night, not exam week.",
    fields: [
      {
        kind: "number",
        name: "sleep_hours",
        label: "Hours of sleep on a typical night",
        suffix: "hours",
        min: 0,
        max: 24,
        step: 0.5,
      },
      { kind: "time", name: "usual_bedtime", label: "Usual bedtime" },
      { kind: "time", name: "usual_wake_time", label: "Usual wake-up time" },
    ],
  },
  {
    id: "food",
    title: "Food",
    blurb: "Rough numbers are fine. Nobody is checking.",
    fields: [
      {
        kind: "number",
        name: "meals_per_day",
        label: "Proper meals on a typical day",
        hint: "Count meals, not snacks.",
        suffix: "meals",
        min: 0,
        max: 10,
        step: 1,
      },
      {
        kind: "number",
        name: "mess_meals_per_week",
        label: "Meals from the mess or home in a week",
        suffix: "meals",
        min: 0,
        max: 21,
        step: 1,
      },
      {
        kind: "number",
        name: "outside_meals_per_week",
        label: "Meals ordered in or eaten out in a week",
        suffix: "meals",
        min: 0,
        max: 21,
        step: 1,
      },
      {
        kind: "number",
        name: "junk_meals_per_week",
        label: "Fried or packaged meals in a week",
        hint: "Samosas, chips, instant noodles, fried snacks.",
        suffix: "meals",
        min: 0,
        max: 21,
        step: 1,
      },
      {
        kind: "select",
        name: "diet_type",
        label: "What you usually eat",
        options: [
          { value: "vegetarian", label: "Vegetarian" },
          { value: "eggetarian", label: "Eggetarian" },
          { value: "non_vegetarian", label: "Non-vegetarian" },
          { value: "vegan", label: "Vegan" },
        ],
      },
    ],
  },
  {
    id: "water",
    title: "Water",
    blurb: "A standard bottle is about one litre; a glass is roughly 250 ml.",
    fields: [
      {
        kind: "number",
        name: "water_litres_per_day",
        label: "Water on a typical day",
        suffix: "litres",
        min: 0,
        max: 10,
        step: 0.25,
      },
    ],
  },
  {
    id: "movement",
    title: "Movement",
    blurb: "Walking counts. Sport counts. Gym counts. Climbing to the fourth floor counts.",
    fields: [
      {
        kind: "select",
        name: "exercise_type",
        label: "What you mostly do",
        options: [
          { value: "none", label: "Nothing regular right now" },
          { value: "walking", label: "Walking" },
          { value: "gym", label: "Gym" },
          { value: "sports", label: "Sports" },
          { value: "yoga", label: "Yoga" },
          { value: "other", label: "Something else" },
        ],
      },
      {
        kind: "number",
        name: "active_days_per_week",
        label: "Active days in a week",
        suffix: "days",
        min: 0,
        max: 7,
        step: 1,
      },
      {
        kind: "number",
        name: "exercise_minutes_per_session",
        label: "Minutes in a typical session",
        suffix: "minutes",
        min: 0,
        max: 300,
        step: 5,
      },
    ],
  },
  {
    id: "screens",
    title: "Screens and sitting",
    blurb: "Leisure screens only — lectures, assignments and work do not count here.",
    fields: [
      {
        kind: "number",
        name: "screen_hours_per_day",
        label: "Non-academic screen time per day",
        hint: "Social media, streaming, gaming.",
        suffix: "hours",
        min: 0,
        max: 24,
        step: 0.5,
      },
      {
        kind: "number",
        name: "sitting_hours_per_day",
        label: "Hours sitting per day",
        hint: "Classes, studying, commuting, meals.",
        suffix: "hours",
        min: 0,
        max: 24,
        step: 0.5,
      },
    ],
  },
  {
    id: "stress",
    title: "Stress",
    blurb:
      "Your own read on academic pressure over the last two weeks. This is not a mental health assessment, and it is not shared with anyone.",
    fields: [
      {
        kind: "scale",
        name: "stress_level",
        label: "How much pressure have you felt lately?",
        min: 1,
        max: 5,
        minLabel: "Very little",
        maxLabel: "A great deal",
      },
    ],
  },
];

export const SECTION_TITLES = SECTIONS.map((s) => s.title);

/** Every field name the form may submit. */
export const FIELD_NAMES: FieldName[] = SECTIONS.flatMap((s) => s.fields.map((f) => f.name));

/** The subset of assessment columns this form writes. */
export type AssessmentDraft = Pick<AssessmentRow, FieldName>;

/** Form state is all-strings; "" means "not answered". */
export type DraftValues = Record<FieldName, string>;

export const EMPTY_DRAFT: DraftValues = Object.fromEntries(
  FIELD_NAMES.map((n) => [n, ""]),
) as DraftValues;

/** Turn a stored row into form values, treating null as unanswered. */
export function draftFromRow(row: Partial<AssessmentRow> | null | undefined): DraftValues {
  const out = { ...EMPTY_DRAFT };
  if (!row) return out;
  for (const name of FIELD_NAMES) {
    const value = row[name];
    if (value !== null && value !== undefined) out[name] = String(value);
  }
  return out;
}

/** How many sections have at least one answer. Drives the resume prompt. */
export function answeredSectionCount(values: DraftValues): number {
  return SECTIONS.filter((s) => s.fields.some((f) => values[f.name] !== "")).length;
}
