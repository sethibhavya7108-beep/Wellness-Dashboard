import type { Metadata } from "next";
import Link from "next/link";
import { Award, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/layout";
import { EmptyState } from "@/components/ui/feedback";
import { ProgressBar } from "@/components/ui/progress";
import { StatCard } from "@/components/app/stat-card";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getActiveRoadmap } from "@/lib/wellness/roadmap-service";
import { completionRate } from "@/lib/wellness/roadmap";
import { CATEGORY_RULES } from "@/lib/wellness/rules";
import { daysAgoIso, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Progress" };

export default async function ProgressPage() {
  const ctx = await requireOnboardedUser("/progress");
  const supabase = await createClient();
  const active = await getActiveRoadmap(ctx.userId);

  const weekStart = daysAgoIso(6);

  const [{ data: weekRows }, { data: points }, { data: badges }, { data: streak }] =
    await Promise.all([
      supabase
        .from("habit_checkins")
        .select("roadmap_habit_id, status, checkin_date")
        .eq("user_id", ctx.userId)
        .gte("checkin_date", weekStart),
      supabase.from("points_transactions").select("points").eq("user_id", ctx.userId),
      supabase
        .from("user_badges")
        .select("badge_id, earned_at")
        .eq("user_id", ctx.userId)
        .order("earned_at", { ascending: false }),
      supabase.rpc("current_streak_days", { p_user_id: ctx.userId }),
    ]);

  const totalPoints = (points ?? []).reduce((sum, p) => sum + p.points, 0);
  const rows = weekRows ?? [];

  // Joined here rather than embedded: see the note in roadmap-service.ts.
  const { data: badgeRows } = await supabase
    .from("badges")
    .select("id, name, description")
    .in("id", (badges ?? []).map((b) => b.badge_id));

  const badgeById = new Map((badgeRows ?? []).map((b) => [b.id, b]));
  const earnedBadges = (badges ?? []).map((b) => ({
    earnedAt: b.earned_at,
    badge: badgeById.get(b.badge_id) ?? null,
  }));

  // Seven days per active habit is what a full week looks like.
  const expected = (active?.habits.length ?? 0) * 7;
  const rate = completionRate({
    yes: rows.filter((r) => r.status === "yes").length,
    partial: rows.filter((r) => r.status === "partial").length,
    expected,
  });

  return (
    <Container width="wide" className="space-y-8 py-10">
      <header className="space-y-2">
        <p className="eyebrow">Progress</p>
        <h1 className="text-3xl leading-tight sm:text-4xl">The last seven days</h1>
        <p className="text-[0.9375rem] leading-relaxed text-muted">
          Everything here counts what you did, never what your body is. Points come from habits
          logged, checks completed and events attended.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Points" value={totalPoints} note="From habits, checks and events" />
        <StatCard label="Current streak" value={`${streak ?? 0} days`} note="Consecutive days logged" />
        <StatCard label="Badges" value={badges?.length ?? 0} note="Earned by doing, not by measuring" />
      </div>

      {active && expected > 0 ? (
        <Card>
          <CardContent className="space-y-4 p-7">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg leading-snug">This week</h2>
              <span className="text-sm tabular-nums text-muted">
                {Math.round(rate * 100)}% of {expected} possible check-ins
              </span>
            </div>
            <ProgressBar value={rate * 100} label="Weekly completion" tone="forest" />

            <ul className="space-y-3 pt-2">
              {active.habits.map((h) => {
                const forHabit = rows.filter((r) => r.roadmap_habit_id === h.id);
                const habitRate = completionRate({
                  yes: forHabit.filter((r) => r.status === "yes").length,
                  partial: forHabit.filter((r) => r.status === "partial").length,
                  expected: 7,
                });
                return (
                  <li key={h.id} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-ink">{h.habit_templates?.title ?? "Habit"}</span>
                      <span className="tabular-nums text-muted">
                        {Math.round(habitRate * 100)}%
                      </span>
                    </div>
                    <ProgressBar value={habitRate * 100} label={CATEGORY_RULES[h.category].label} />
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={TrendingUp}
          title="Nothing to chart yet"
          description="Start a cycle and log a few days — this fills in as you go."
          action={
            <Link href="/roadmap" className={buttonClasses()}>
              Go to your roadmap
            </Link>
          }
        />
      )}

      <section className="space-y-4">
        <h2 className="text-lg leading-snug">Badges</h2>
        {earnedBadges.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {earnedBadges.map((b) => (
              <li key={b.badge?.id ?? b.earnedAt}>
                <Card>
                  <CardContent className="space-y-1.5 p-5">
                    <Badge tone="forest">{formatDate(b.earnedAt)}</Badge>
                    <p className="font-medium text-ink">{b.badge?.name}</p>
                    <p className="text-sm text-muted">{b.badge?.description}</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Award}
            title="No badges yet"
            description="Every badge is earned by doing something — logging habits, finishing a cycle, showing up to an event. None of them measure your body."
          />
        )}
      </section>
    </Container>
  );
}
