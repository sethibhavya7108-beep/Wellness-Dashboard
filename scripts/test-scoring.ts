/**
 * Scoring engine tests.
 *
 * Run with: npm run test:scoring
 *
 * These are the guarantees the rest of the product is built on: the bands cover
 * every possible input, scores move in the direction you would expect, BMI never
 * influences the wellness score, and the same answers always produce the same
 * result.
 */

import assert from "node:assert/strict";
import type { AssessmentRow, WellnessCategory } from "../src/lib/supabase/database.types";
import {
  CATEGORY_ORDER,
  CATEGORY_RULES,
  MAX_PRIORITIES,
  MIN_PRIORITIES,
} from "../src/lib/wellness/rules";
import {
  computeBmi,
  computeDietRaw,
  computeExerciseRaw,
  scoreAssessment,
} from "../src/lib/wellness/scoring";

let passed = 0;
const failures: string[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
  } catch (err) {
    failures.push(`${name}\n    ${(err as Error).message.split("\n")[0]}`);
  }
}

const HEALTHY: AssessmentRow = {
  id: "00000000-0000-0000-0000-000000000001",
  user_id: "00000000-0000-0000-0000-000000000002",
  kind: "baseline",
  status: "completed",
  height_cm: 170,
  weight_kg: 65,
  sleep_hours: 8,
  usual_bedtime: "23:00:00",
  usual_wake_time: "07:00:00",
  meals_per_day: 3,
  mess_meals_per_week: 12,
  outside_meals_per_week: 1,
  junk_meals_per_week: 1,
  diet_type: "vegetarian",
  water_litres_per_day: 3,
  active_days_per_week: 5,
  exercise_type: "gym",
  exercise_minutes_per_session: 45,
  screen_hours_per_day: 1.5,
  sitting_hours_per_day: 5,
  stress_level: 2,
  completed_at: "2026-08-01T00:00:00Z",
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
};

const make = (overrides: Partial<AssessmentRow>): AssessmentRow => ({ ...HEALTHY, ...overrides });

// ---------------------------------------------------------------- Band shape

test("every category's bands are contiguous and cover all values", () => {
  for (const category of CATEGORY_ORDER) {
    const bands = [...CATEGORY_RULES[category].bands].sort((a, b) => a.min - b.min);

    assert.ok(bands[0].min <= 1, `${category}: first band should start at or below 1`);

    for (let i = 0; i < bands.length - 1; i += 1) {
      assert.equal(
        bands[i].max,
        bands[i + 1].min,
        `${category}: gap or overlap between ${bands[i].max} and ${bands[i + 1].min}`,
      );
    }

    assert.equal(
      bands.at(-1)!.max,
      Number.POSITIVE_INFINITY,
      `${category}: last band must be open-ended`,
    );
  }
});

test("every band score is within 0-100 and has a status", () => {
  for (const category of CATEGORY_ORDER) {
    for (const band of CATEGORY_RULES[category].bands) {
      assert.ok(band.score >= 0 && band.score <= 100, `${category}: score out of range`);
      assert.ok(
        ["good", "fair", "attention", "priority"].includes(band.status),
        `${category}: bad status`,
      );
    }
  }
});

// ------------------------------------------------------------- Direction

function scoreFor(category: WellnessCategory, assessment: AssessmentRow) {
  return scoreAssessment(assessment).categories.find((c) => c.category === category)!.normalizedScore;
}

test("less screen time, sitting and stress never scores worse", () => {
  const cases: [WellnessCategory, keyof AssessmentRow, number[]][] = [
    ["screen_time", "screen_hours_per_day", [0, 1, 2, 3, 4, 5, 6, 8, 12]],
    ["sitting", "sitting_hours_per_day", [0, 2, 5, 7, 9, 11, 13, 16]],
    ["stress", "stress_level", [1, 2, 3, 4, 5]],
  ];

  for (const [category, field, values] of cases) {
    let previous = Number.POSITIVE_INFINITY;
    for (const v of values) {
      const score = scoreFor(category, make({ [field]: v } as Partial<AssessmentRow>));
      assert.ok(score <= previous, `${category}: score rose at ${v}`);
      previous = score;
    }
  }
});

test("more water and more activity never scores worse", () => {
  let previous = Number.NEGATIVE_INFINITY;
  for (const v of [0, 0.5, 1, 1.5, 2, 2.5, 3, 5]) {
    const score = scoreFor("hydration", make({ water_litres_per_day: v }));
    assert.ok(score >= previous, `hydration: score fell at ${v}L`);
    previous = score;
  }

  previous = Number.NEGATIVE_INFINITY;
  for (const days of [0, 1, 2, 3, 4, 5, 6, 7]) {
    const score = scoreFor(
      "exercise",
      make({ active_days_per_week: days, exercise_minutes_per_session: 30 }),
    );
    assert.ok(score >= previous, `exercise: score fell at ${days} days`);
    previous = score;
  }
});

test("sleep peaks in the 7-9.5 hour range and falls off both sides", () => {
  const best = scoreFor("sleep", make({ sleep_hours: 8 }));
  for (const v of [3, 5, 6, 6.5, 10, 12, 14]) {
    assert.ok(
      scoreFor("sleep", make({ sleep_hours: v })) < best,
      `sleep: ${v}h should score below 8h`,
    );
  }
});

// ------------------------------------------------------------- Derivations

test("exercise raw value is days x minutes, and zero when none", () => {
  assert.equal(
    computeExerciseRaw({
      active_days_per_week: 4,
      exercise_minutes_per_session: 30,
      exercise_type: "sports",
    }),
    120,
  );
  assert.equal(
    computeExerciseRaw({
      active_days_per_week: 5,
      exercise_minutes_per_session: 60,
      exercise_type: "none",
    }),
    0,
  );
  assert.equal(
    computeExerciseRaw({
      active_days_per_week: null,
      exercise_minutes_per_session: 30,
      exercise_type: "gym",
    }),
    null,
  );
});

test("diet composite rewards regular meals and penalises outside and junk food", () => {
  const good = computeDietRaw({
    meals_per_day: 3,
    outside_meals_per_week: 0,
    junk_meals_per_week: 0,
  })!;
  const poor = computeDietRaw({
    meals_per_day: 1,
    outside_meals_per_week: 14,
    junk_meals_per_week: 10,
  })!;

  assert.equal(good, 100);
  assert.ok(poor < 25, `expected a low composite, got ${poor}`);
  assert.equal(
    computeDietRaw({ meals_per_day: null, outside_meals_per_week: null, junk_meals_per_week: null }),
    null,
  );
});

// -------------------------------------------------------------------- BMI

test("BMI is computed correctly and carries a review flag", () => {
  const bmi = computeBmi(170, 65)!;
  assert.equal(bmi.value, 22.5);
  assert.equal(bmi.reviewStatus, "pending_medical_review");
  assert.equal(computeBmi(null, 65), null);
  assert.equal(computeBmi(170, null), null);
});

test("BMI never affects the wellness score or the priorities", () => {
  const light = scoreAssessment(make({ height_cm: 180, weight_kg: 55 }));
  const heavy = scoreAssessment(make({ height_cm: 155, weight_kg: 95 }));

  assert.equal(light.overallScore, heavy.overallScore);
  assert.deepEqual(
    light.priorities.map((p) => p.category),
    heavy.priorities.map((p) => p.category),
  );
  assert.notEqual(light.bmi!.value, heavy.bmi!.value);
});

// ------------------------------------------------------------- Priorities

test("a struggling student gets exactly three priorities, worst first", () => {
  const result = scoreAssessment(
    make({
      sleep_hours: 4.5,
      water_litres_per_day: 0.8,
      sitting_hours_per_day: 13,
      screen_hours_per_day: 3,
    }),
  );

  assert.equal(result.priorities.length, MAX_PRIORITIES);
  const categories = result.priorities.map((p) => p.category);
  for (const expected of ["sleep", "hydration", "sitting"] as const) {
    assert.ok(categories.includes(expected), `expected ${expected} in priorities`);
  }
  assert.equal(result.priorities[0].status, "priority");
});

test("a healthy student still gets the minimum number of priorities", () => {
  const result = scoreAssessment(HEALTHY);
  assert.equal(result.priorities.length, MIN_PRIORITIES);
  assert.ok(result.overallScore >= 90, `expected a high score, got ${result.overallScore}`);
});

test("priorities never exceed the configured maximum", () => {
  const result = scoreAssessment(
    make({
      sleep_hours: 3,
      water_litres_per_day: 0.2,
      sitting_hours_per_day: 15,
      screen_hours_per_day: 10,
      stress_level: 5,
      meals_per_day: 1,
      outside_meals_per_week: 14,
      junk_meals_per_week: 10,
      active_days_per_week: 0,
      exercise_minutes_per_session: 0,
    }),
  );
  assert.equal(result.priorities.length, MAX_PRIORITIES);
});

// ------------------------------------------------------ Missing answers

test("unanswered categories are reported, not scored as zero", () => {
  const result = scoreAssessment(
    make({ water_litres_per_day: null, sleep_hours: null, stress_level: null }),
  );

  assert.deepEqual(result.missing.sort(), ["hydration", "sleep", "stress"]);
  assert.equal(result.categories.length, CATEGORY_ORDER.length - 3);
  assert.ok(result.overallScore > 80, "skipped questions should not drag the score down");
});

// --------------------------------------------------------- Determinism

test("the same assessment always produces the same result", () => {
  const input = make({ sleep_hours: 6.2, water_litres_per_day: 1.4, sitting_hours_per_day: 9 });
  assert.deepEqual(scoreAssessment(input), scoreAssessment(input));
});

test("engine version is recorded on every result", () => {
  assert.match(scoreAssessment(HEALTHY).engineVersion, /^\d+\.\d+\.\d+$/);
});

// ------------------------------------------------------------------ Report

if (failures.length > 0) {
  console.error(`\n✗ ${failures.length} failing, ${passed} passing\n`);
  for (const f of failures) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(`\n✓ ${passed} scoring tests passed\n`);
