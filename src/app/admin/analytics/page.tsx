import type { Metadata } from "next";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/layout";
import { EmptyState } from "@/components/ui/feedback";
import { ProgressBar } from "@/components/ui/progress";
import { StatCard } from "@/components/app/stat-card";
import { requireArea } from "@/lib/auth/admin-area";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_RULES } from "@/lib/wellness/rules";

export const metadata: Metadata = { title: "Analytics" };

export default async function AdminAnalyticsPage() {
  await requireArea("analytics");
  const supabase = await createClient();

  // Aggregates only. Admins hold no row access to assessments, scores or
  // check-ins — these functions are the entire reporting surface, and each
  // withholds its result below the minimum cohort size.
  const [stats, categories, distribution, comparison, engagement] = await Promise.all([
    supabase.rpc("get_participation_stats"),
    supabase.rpc("get_category_averages", { p_kind: "baseline" }),
    supabase.rpc("get_score_distribution"),
    supabase.rpc("get_baseline_endline_comparison"),
    supabase.rpc("get_habit_engagement"),
  ]);

  const s = stats.data?.[0];
  const categoryRows = categories.data ?? [];
  const distributionRows = distribution.data ?? [];
  const comparisonRows = comparison.data ?? [];
  const engagementRows = engagement.data ?? [];

  return (
    <Container width="wide" className="space-y-8 py-10">
      <header className="space-y-2">
        <p className="eyebrow">Admin</p>
        <h1 className="text-3xl leading-tight sm:text-4xl">Analytics</h1>
        <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-muted">
          Campus-level aggregates. No individual student&rsquo;s health data is readable from this
          page, or from any admin account — that is enforced by row policies, not by this screen.
        </p>
      </header>

      {s ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Students onboarded" value={s.students_onboarded} />
          <StatCard label="Baselines completed" value={s.baselines_completed} />
          <StatCard label="Endlines completed" value={s.endlines_completed} />
          <StatCard label="Active roadmaps" value={s.active_roadmaps} />
          <StatCard
            label="Check-ins"
            value={s.checkins_last_7_days}
            note="Last seven days"
          />
          <StatCard label="Published events" value={s.events_published} />
        </div>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg leading-snug">Where the campus stands</h2>
        {categoryRows.length > 0 ? (
          <ul className="space-y-3">
            {categoryRows.map((row) => (
              <li key={row.category}>
                <Card>
                  <CardContent className="space-y-2 p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium text-ink">
                        {CATEGORY_RULES[row.category].label}
                      </span>
                      <span className="text-sm tabular-nums text-muted">
                        average {row.average_score} · {row.flagged_count} of {row.student_count}{" "}
                        flagged
                      </span>
                    </div>
                    <ProgressBar value={row.average_score} label={row.category} />
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <SuppressedNotice />
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-4">
          <h2 className="text-lg leading-snug">Score distribution</h2>
          {distributionRows.length > 0 ? (
            <Card>
              <CardContent className="space-y-3 p-6">
                {distributionRows.map((row) => (
                  <div key={row.band} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-ink">{row.band}</span>
                      <span className="tabular-nums text-muted">{row.student_count}</span>
                    </div>
                    <ProgressBar
                      value={row.student_count}
                      max={Math.max(...distributionRows.map((r) => r.student_count), 1)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <SuppressedNotice />
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg leading-snug">Habit engagement</h2>
          {engagementRows.length > 0 ? (
            <Card>
              <CardContent className="space-y-3 p-6">
                {engagementRows.map((row) => (
                  <div key={row.category} className="flex justify-between text-sm">
                    <span className="text-ink">{CATEGORY_RULES[row.category].label}</span>
                    <span className="tabular-nums text-muted">
                      {row.checkins_logged} logged · {Math.round(row.completion_rate * 100)}%
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              title="No check-ins yet"
              description="This fills in once students start logging habits."
            />
          )}
        </section>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg leading-snug">Baseline versus endline</h2>
          <Badge tone="accent">The impact measure</Badge>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Within-subject: only students who completed both checks are counted, so this compares
          people against themselves rather than one group against another.
        </p>

        {comparisonRows.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left">
                    <th className="px-5 py-3 font-medium text-muted">Area</th>
                    <th className="px-5 py-3 text-right font-medium text-muted">Students</th>
                    <th className="px-5 py-3 text-right font-medium text-muted">Baseline</th>
                    <th className="px-5 py-3 text-right font-medium text-muted">Endline</th>
                    <th className="px-5 py-3 text-right font-medium text-muted">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.category} className="border-b border-line last:border-b-0">
                      <td className="px-5 py-3 text-ink">{CATEGORY_RULES[row.category].label}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-muted">
                        {row.student_count}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-muted">
                        {row.baseline_average}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-muted">
                        {row.endline_average}
                      </td>
                      <td
                        className={
                          row.change > 0
                            ? "px-5 py-3 text-right tabular-nums text-forest"
                            : row.change < 0
                              ? "px-5 py-3 text-right tabular-nums text-status-priority"
                              : "px-5 py-3 text-right tabular-nums text-muted"
                        }
                      >
                        {row.change > 0 ? "+" : ""}
                        {row.change}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ) : (
          <SuppressedNotice comparison />
        )}
      </section>

      <Card>
        <CardContent className="flex gap-3 p-5">
          <Lock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
          <p className="text-sm leading-relaxed text-muted">
            Every figure here is an aggregate produced by a database function. Results are withheld
            entirely below a cohort of five, because an average over three people is not anonymous
            once a batch filter is applied.
          </p>
        </CardContent>
      </Card>
    </Container>
  );
}

function SuppressedNotice({ comparison = false }: { comparison?: boolean }) {
  return (
    <EmptyState
      icon={Lock}
      title="Not enough data yet"
      description={
        comparison
          ? "Shown once at least five students have completed both a baseline and an endline check."
          : "Shown once at least five students have completed a check. Smaller cohorts are withheld rather than averaged."
      }
    />
  );
}
