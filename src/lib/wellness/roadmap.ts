import type {
  HabitDifficulty,
  HabitTemplateRow,
  ScoreStatus,
  WellnessCategory,
} from "@/lib/supabase/database.types";

/**
 * Roadmap generation — pure functions only.
 *
 * The same score and the same habit library must always produce the same
 * roadmap, so nothing here reads a clock, a random number or the network. The
 * caller supplies the cycle start date. See /docs/ROADMAP_ENGINE.md.
 */

/** Bump when selection or adaptation logic changes. Stored on every roadmap. */
export const ROADMAP_ENGINE_VERSION = "1.0.0";

/** Default cycle length. The document allows 2–4 weeks; 4 is the default. */
export const CYCLE_DAYS = 28;

/** Never put more than this many habits in front of a student at once. */
export const MAX_HABITS = 3;

/**
 * Where a student starts depends on how far they are from the target.
 * Someone furthest away starts with the smallest possible step — that is the
 * entire point of the roadmap.
 */
export const START_DIFFICULTY: Record<ScoreStatus, HabitDifficulty> = {
  priority: "basic",
  attention: "basic",
  fair: "intermediate",
  good: "intermediate",
};

export const DIFFICULTY_LADDER: HabitDifficulty[] = ["basic", "intermediate", "advanced"];

export function stepUp(d: HabitDifficulty): HabitDifficulty | null {
  const i = DIFFICULTY_LADDER.indexOf(d);
  return i < DIFFICULTY_LADDER.length - 1 ? DIFFICULTY_LADDER[i + 1] : null;
}

export function stepDown(d: HabitDifficulty): HabitDifficulty | null {
  const i = DIFFICULTY_LADDER.indexOf(d);
  return i > 0 ? DIFFICULTY_LADDER[i - 1] : null;
}

export type PriorityInput = {
  category: WellnessCategory;
  status: ScoreStatus;
};

export type SelectedHabit = {
  template: HabitTemplateRow;
  category: WellnessCategory;
  difficulty: HabitDifficulty;
  position: number;
};

/**
 * Deterministic ordering for candidate templates.
 *
 * Title is the final tiebreak so the choice never depends on the order Postgres
 * happened to return rows in.
 */
function byStableOrder(a: HabitTemplateRow, b: HabitTemplateRow): number {
  return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
}

/**
 * Choose one habit per priority category.
 *
 * Rules that must hold: never more than MAX_HABITS, never two habits from the
 * same category, and prefer a template the student has not been given before.
 * A category with no usable template is skipped rather than filled with one
 * from somewhere else — an unrelated habit is worse than one fewer habit.
 */
export function selectHabits(
  priorities: PriorityInput[],
  library: HabitTemplateRow[],
  previouslyUsedTemplateIds: ReadonlySet<string> = new Set(),
): SelectedHabit[] {
  const usable = library.filter((t) => t.is_active && t.approval_status === "approved");
  const selected: SelectedHabit[] = [];
  const seenCategories = new Set<WellnessCategory>();

  for (const priority of priorities) {
    if (selected.length >= MAX_HABITS) break;
    if (seenCategories.has(priority.category)) continue;

    const wanted = START_DIFFICULTY[priority.status];
    const inCategory = usable
      .filter((t) => t.category === priority.category)
      .slice()
      .sort(byStableOrder);
    if (inCategory.length === 0) continue;

    const atDifficulty = inCategory.filter((t) => t.difficulty === wanted);
    const unused = (list: HabitTemplateRow[]) =>
      list.filter((t) => !previouslyUsedTemplateIds.has(t.id));

    // Preference order: an unseen habit at the right difficulty, then any
    // unseen habit in the category, then a repeat. A habit at the wrong
    // difficulty still beats handing back one the student has already done,
    // and repeating beats dropping the priority entirely.
    const template =
      unused(atDifficulty)[0] ?? unused(inCategory)[0] ?? atDifficulty[0] ?? inCategory[0];

    selected.push({
      template,
      category: priority.category,
      difficulty: template.difficulty,
      position: selected.length,
    });
    seenCategories.add(priority.category);
  }

  return selected;
}

/** Cycle end, exclusive of nothing — simply `days` after the start. */
export function cycleEnd(startIso: string, days = CYCLE_DAYS): string {
  const start = new Date(`${startIso}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() + days);
  return start.toISOString().slice(0, 10);
}

export type WeeklyOutcome = "step_up" | "hold" | "step_down";

/**
 * What to do with a habit after a week, from its completion rate.
 *
 * Thresholds come straight from ROADMAP_ENGINE.md. A single bad week does
 * nothing; it takes two in a row to make anything easier, because one exam week
 * is not evidence that a habit was pitched wrong.
 */
export function weeklyOutcome(completionRate: number, previousWeekWasPoor: boolean): WeeklyOutcome {
  if (completionRate >= 0.8) return "step_up";
  if (completionRate < 0.4 && previousWeekWasPoor) return "step_down";
  return "hold";
}

/** `partial` counts as half a completion. */
export function completionRate(counts: { yes: number; partial: number; expected: number }): number {
  if (counts.expected <= 0) return 0;
  return (counts.yes + counts.partial * 0.5) / counts.expected;
}
