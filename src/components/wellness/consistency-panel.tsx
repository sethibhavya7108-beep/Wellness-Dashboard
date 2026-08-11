import { Flame, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { ProgressBar } from "@/components/ui/progress";
import { CATEGORY_RULES } from "@/lib/wellness/rules";
import type { ConsistencySummary, HabitChart } from "@/lib/wellness/consistency";
import type { RoadmapHabitWithTemplate } from "@/lib/wellness/roadmap-service";
import { CompletionDial, ConsistencyStrip, WeeklyBars } from "./consistency-chart";

/**
 * Consistency and per-goal performance, for the student's own dashboard.
 *
 * Deliberately shows effort, not health status: the charts count days logged
 * and habits completed. Nothing here is derived from BMI, weight or a wellness
 * score.
 */
export function ConsistencyPanel({
  summary,
  habits,
  charts,
}: {
  summary: ConsistencySummary | null;
  habits: RoadmapHabitWithTemplate[];
  charts: Map<string, HabitChart>;
}) {
  if (!summary) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-3">
        <Card>
          <CardContent className="space-y-2 p-5">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">This week</p>
            <p className="text-2xl tabular-nums text-ink">
              {summary.daysThisWeek}
              <span className="text-sm text-muted"> / {summary.weeklyTarget} days</span>
            </p>
            <ProgressBar
              value={summary.daysThisWeek}
              max={summary.weeklyTarget}
              label="Days logged this week"
              tone={summary.daysThisWeek >= summary.weeklyTarget ? "forest" : "accent"}
            />
            <p className="text-xs text-muted">
              {summary.daysThisWeek >= summary.weeklyTarget
                ? "Weekly bonus earned."
                : `${summary.weeklyTarget - summary.daysThisWeek} more for the weekly bonus.`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-5">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">This month</p>
            <p className="text-2xl tabular-nums text-ink">
              {summary.daysThisMonth}
              <span className="text-sm text-muted"> / {summary.monthlyTarget} days</span>
            </p>
            <ProgressBar
              value={summary.daysThisMonth}
              max={summary.monthlyTarget}
              label="Days logged this month"
              tone={summary.daysThisMonth >= summary.monthlyTarget ? "forest" : "accent"}
            />
            <p className="text-xs text-muted">
              {summary.daysThisMonth >= summary.monthlyTarget
                ? "Monthly bonus earned."
                : `${summary.monthlyTarget - summary.daysThisMonth} more for the monthly bonus.`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-5">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">Streak</p>
            <p className="flex items-center gap-2 text-2xl tabular-nums text-ink">
              <Flame
                className={summary.currentStreak > 0 ? "size-5 text-accent" : "size-5 text-faint"}
                aria-hidden
              />
              {summary.currentStreak}
              <span className="text-sm text-muted">
                {summary.currentStreak === 1 ? "day" : "days"}
              </span>
            </p>
            <p className="text-xs leading-relaxed text-muted">
              Consecutive days you logged something. A partial counts.
            </p>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg leading-snug">Each goal</h2>

        {habits.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No active habits yet"
            description="Start a cycle and your per-goal charts appear here."
          />
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {habits.map((h) => {
              const chart = charts.get(h.id);
              return (
                <li key={h.id}>
                  <Card className="h-full">
                    <CardContent className="space-y-4 p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1.5">
                          <Badge tone="accent">{CATEGORY_RULES[h.category].label}</Badge>
                          <p className="font-medium text-ink">
                            {h.habit_templates?.title ?? "Habit"}
                          </p>
                        </div>
                        <CompletionDial
                          rate={chart?.completionRate ?? 0}
                          label={`${h.habit_templates?.title ?? "Habit"} completion`}
                        />
                      </div>

                      {chart && chart.days.some((d) => d.status) ? (
                        <>
                          <ConsistencyStrip days={chart.days} />
                          {chart.weeks.length > 1 ? (
                            <div className="space-y-1.5 border-t border-line pt-4">
                              <p className="text-xs font-medium tracking-wide text-muted uppercase">
                                Week by week
                              </p>
                              <WeeklyBars weeks={chart.weeks} />
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <p className="text-sm text-muted">
                          Nothing logged yet. Your chart fills in from your first check-in.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
