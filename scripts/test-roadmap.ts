/**
 * Roadmap engine tests.
 *
 * Run with: npm run test:roadmap
 *
 * The guarantees ROADMAP_ENGINE.md makes: generation is deterministic, never
 * exceeds three habits, never puts two habits from one category in a cycle,
 * starts the furthest-behind student at the smallest step, and prefers a habit
 * the student has not been given before.
 */

import assert from "node:assert/strict";
import type { HabitTemplateRow } from "../src/lib/supabase/database.types";
import {
  MAX_HABITS,
  START_DIFFICULTY,
  completionRate,
  cycleEnd,
  selectHabits,
  stepDown,
  stepUp,
  weeklyOutcome,
  type PriorityInput,
} from "../src/lib/wellness/roadmap";

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

let seq = 0;
function template(over: Partial<HabitTemplateRow> = {}): HabitTemplateRow {
  seq += 1;
  return {
    id: `t${String(seq).padStart(3, "0")}`,
    category: "sleep",
    title: `Habit ${seq}`,
    description: "Do the thing",
    difficulty: "basic",
    frequency: "daily",
    target_value: 1,
    target_unit: "times",
    points: 10,
    source_id: null,
    approval_status: "approved",
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

const LIBRARY: HabitTemplateRow[] = [
  template({ category: "sleep", difficulty: "basic", title: "Sleep basic" }),
  template({ category: "sleep", difficulty: "intermediate", title: "Sleep intermediate" }),
  template({ category: "sleep", difficulty: "advanced", title: "Sleep advanced" }),
  template({ category: "hydration", difficulty: "basic", title: "Water basic" }),
  template({ category: "hydration", difficulty: "intermediate", title: "Water intermediate" }),
  template({ category: "diet", difficulty: "basic", title: "Diet basic" }),
  template({ category: "stress", difficulty: "basic", title: "Stress basic" }),
];

const THREE: PriorityInput[] = [
  { category: "sleep", status: "priority" },
  { category: "hydration", status: "attention" },
  { category: "diet", status: "fair" },
];

// ------------------------------------------------------------------ Selection

test("never assigns more than MAX_HABITS", () => {
  const many: PriorityInput[] = [
    ...THREE,
    { category: "stress", status: "priority" },
  ];
  assert.equal(selectHabits(many, LIBRARY).length, MAX_HABITS);
});

test("never assigns two habits from the same category", () => {
  const dupes: PriorityInput[] = [
    { category: "sleep", status: "priority" },
    { category: "sleep", status: "attention" },
    { category: "hydration", status: "attention" },
  ];
  const picked = selectHabits(dupes, LIBRARY);
  assert.equal(new Set(picked.map((p) => p.category)).size, picked.length);
});

test("a flagged category starts at the smallest step", () => {
  const picked = selectHabits([{ category: "sleep", status: "priority" }], LIBRARY);
  assert.equal(picked[0].difficulty, START_DIFFICULTY.priority);
  assert.equal(picked[0].difficulty, "basic");
});

test("a category that is merely fair starts higher", () => {
  const picked = selectHabits([{ category: "sleep", status: "fair" }], LIBRARY);
  assert.equal(picked[0].difficulty, "intermediate");
});

test("generation is deterministic", () => {
  const a = selectHabits(THREE, LIBRARY);
  const b = selectHabits(THREE, LIBRARY.slice().reverse());
  assert.deepEqual(
    a.map((x) => x.template.id),
    b.map((x) => x.template.id),
  );
});

test("prefers a habit the student has not had before", () => {
  const first = selectHabits([{ category: "sleep", status: "fair" }], LIBRARY);
  const used = new Set([first[0].template.id]);
  const second = selectHabits([{ category: "sleep", status: "fair" }], LIBRARY, used);
  assert.notEqual(second[0].template.id, first[0].template.id);
});

test("skips a category with no approved habit rather than substituting another", () => {
  const picked = selectHabits([{ category: "sitting", status: "priority" }], LIBRARY);
  assert.equal(picked.length, 0);
});

test("ignores unapproved and inactive templates", () => {
  const library = [
    template({ category: "sitting", difficulty: "basic", approval_status: "pending_review" }),
    template({ category: "sitting", difficulty: "basic", is_active: false }),
  ];
  assert.equal(selectHabits([{ category: "sitting", status: "priority" }], library).length, 0);
});

test("falls back within the category when the wanted difficulty is missing", () => {
  const picked = selectHabits([{ category: "diet", status: "fair" }], LIBRARY);
  assert.equal(picked.length, 1);
  assert.equal(picked[0].difficulty, "basic");
});

test("positions are sequential from zero", () => {
  const picked = selectHabits(THREE, LIBRARY);
  assert.deepEqual(
    picked.map((p) => p.position),
    picked.map((_, i) => i),
  );
});

// ------------------------------------------------------------------ Cycle

test("a 28-day cycle ends 28 days later", () => {
  assert.equal(cycleEnd("2026-01-01", 28), "2026-01-29");
});

test("cycle end crosses a month boundary correctly", () => {
  assert.equal(cycleEnd("2026-02-20", 28), "2026-03-20");
});

// ------------------------------------------------------------------ Adaptation

test("difficulty ladder stops at both ends", () => {
  assert.equal(stepUp("advanced"), null);
  assert.equal(stepDown("basic"), null);
  assert.equal(stepUp("basic"), "intermediate");
  assert.equal(stepDown("advanced"), "intermediate");
});

test("a strong week steps up", () => {
  assert.equal(weeklyOutcome(0.85, false), "step_up");
});

test("a middling week holds", () => {
  assert.equal(weeklyOutcome(0.5, true), "hold");
});

test("one poor week alone does not step down", () => {
  assert.equal(weeklyOutcome(0.2, false), "hold");
});

test("two poor weeks in a row step down", () => {
  assert.equal(weeklyOutcome(0.2, true), "step_down");
});

test("a partial check-in counts as half", () => {
  assert.equal(completionRate({ yes: 0, partial: 2, expected: 4 }), 0.25);
  assert.equal(completionRate({ yes: 2, partial: 0, expected: 4 }), 0.5);
});

test("completion rate is zero when nothing was expected", () => {
  assert.equal(completionRate({ yes: 0, partial: 0, expected: 0 }), 0);
});

// ------------------------------------------------------------------ Report

if (failures.length > 0) {
  console.error(`\n✗ ${failures.length} failing, ${passed} passing\n`);
  for (const f of failures) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(`\n✓ ${passed} roadmap tests passed\n`);
