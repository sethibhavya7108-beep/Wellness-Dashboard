import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { CheckinStatus, WellnessCategory } from "@/lib/supabase/database.types";
import type { DayCell } from "@/components/wellness/consistency-chart";

/**
 * Consistency data for the dashboard charts.
 *
 * The thresholds behind these numbers live in `consistency_rules()` in the
 * database, not here — one source, reachable from both SQL and the app.
 */

export type ConsistencySummary = {
  weekStart: string;
  daysThisWeek: number;
  weeklyTarget: number;
  monthStart: string;
  daysThisMonth: number;
  monthlyTarget: number;
  currentStreak: number;
};

export async function getConsistencySummary(): Promise<ConsistencySummary | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("consistency_summary");
  const row = data?.[0];
  if (!row) return null;

  return {
    weekStart: row.week_start,
    daysThisWeek: row.days_this_week,
    weeklyTarget: row.weekly_target,
    monthStart: row.month_start,
    daysThisMonth: row.days_this_month,
    monthlyTarget: row.monthly_target,
    currentStreak: row.current_streak,
  };
}

export type HabitChart = {
  roadmapHabitId: string;
  category: WellnessCategory;
  days: DayCell[];
  /** `partial` counts as half, matching the roadmap engine's own rule. */
  completionRate: number;
  weeks: { label: string; rate: number }[];
};

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Per-habit history over the window, shaped for the charts.
 *
 * Every day in the window gets a cell, including days with no entry — a gap is
 * information, and a chart that silently skips missed days would overstate how
 * consistent someone has been.
 */
export async function getHabitCharts(days = 28): Promise<Map<string, HabitChart>> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("habit_history", { p_days: days });

  const byHabit = new Map<string, HabitChart>();
  if (!data) return byHabit;

  const statusByHabitAndDay = new Map<string, CheckinStatus>();
  const categories = new Map<string, WellnessCategory>();

  for (const row of data) {
    statusByHabitAndDay.set(`${row.roadmap_habit_id}|${row.checkin_date}`, row.status);
    categories.set(row.roadmap_habit_id, row.category);
  }

  const today = new Date();
  const window: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    window.push(isoDay(d));
  }

  for (const [habitId, category] of categories) {
    const cells: DayCell[] = window.map((date) => ({
      date,
      status: statusByHabitAndDay.get(`${habitId}|${date}`) ?? null,
    }));

    const logged = cells.filter((c) => c.status !== null);
    const scored = logged.reduce(
      (sum, c) => sum + (c.status === "yes" ? 1 : c.status === "partial" ? 0.5 : 0),
      0,
    );

    byHabit.set(habitId, {
      roadmapHabitId: habitId,
      category,
      days: cells,
      completionRate: logged.length > 0 ? scored / logged.length : 0,
      weeks: weeklyRates(cells),
    });
  }

  return byHabit;
}

/** Group cells into calendar weeks, oldest first. */
function weeklyRates(cells: DayCell[]): { label: string; rate: number }[] {
  const weeks: { label: string; rate: number }[] = [];

  for (let i = 0; i < cells.length; i += 7) {
    const chunk = cells.slice(i, i + 7);
    if (chunk.length === 0) continue;

    const logged = chunk.filter((c) => c.status !== null);
    const scored = logged.reduce(
      (sum, c) => sum + (c.status === "yes" ? 1 : c.status === "partial" ? 0.5 : 0),
      0,
    );

    weeks.push({
      label: `W${Math.floor(i / 7) + 1}`,
      // Rate is against days actually logged, not the full seven — a week the
      // student was not yet enrolled for should not read as a failed week.
      rate: logged.length > 0 ? scored / logged.length : 0,
    });
  }

  return weeks;
}
