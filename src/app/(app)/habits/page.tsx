import type { Metadata } from "next";
import Link from "next/link";
import { Flame, ListChecks } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/layout";
import { EmptyState } from "@/components/ui/feedback";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getActiveRoadmap } from "@/lib/wellness/roadmap-service";
import { CATEGORY_RULES } from "@/lib/wellness/rules";
import { formatDate, isoDate } from "@/lib/utils";
import { CheckinRow } from "./checkin-row";

export const metadata: Metadata = { title: "Today" };

export default async function HabitsPage() {
  const ctx = await requireOnboardedUser("/habits");
  const active = await getActiveRoadmap(ctx.userId);

  if (!active || active.habits.length === 0) {
    return (
      <Container width="narrow" className="py-12">
        <EmptyState
          icon={ListChecks}
          title="No habits to log yet"
          description="Your roadmap sets the two or three habits you check off each day."
          action={
            <Link href="/roadmap" className={buttonClasses()}>
              Go to your roadmap
            </Link>
          }
        />
      </Container>
    );
  }

  const supabase = await createClient();
  const today = isoDate();

  const [{ data: todayRows }, { data: streak }] = await Promise.all([
    supabase
      .from("habit_checkins")
      .select("roadmap_habit_id, status")
      .eq("user_id", ctx.userId)
      .eq("checkin_date", today),
    supabase.rpc("current_streak_days", { p_user_id: ctx.userId }),
  ]);

  const statusByHabit = new Map((todayRows ?? []).map((r) => [r.roadmap_habit_id, r.status]));
  const doneCount = (todayRows ?? []).filter((r) => r.status !== "no").length;

  return (
    <Container width="narrow" className="space-y-8 py-10">
      <header className="space-y-2">
        <p className="eyebrow">{formatDate(today, { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="text-3xl leading-tight">Today</h1>
        <p className="text-[0.9375rem] leading-relaxed text-muted">
          {doneCount} of {active.habits.length} logged. Partly counts — it is worth half the points
          and keeps your streak alive.
        </p>
      </header>

      {typeof streak === "number" && streak > 0 ? (
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <Flame className="size-5 text-accent" aria-hidden />
            <p className="text-sm text-ink">
              <span className="font-medium">{streak}-day streak.</span>{" "}
              <span className="text-muted">Logging anything but &ldquo;not today&rdquo; keeps it going.</span>
            </p>
          </CardContent>
        </Card>
      ) : null}

      <ul className="space-y-4">
        {active.habits.map((h) => (
          <li key={h.id}>
            <CheckinRow
              habitId={h.id}
              title={h.habit_templates?.title ?? "Habit"}
              description={h.habit_templates?.description ?? ""}
              categoryLabel={CATEGORY_RULES[h.category].label}
              points={h.points}
              initialStatus={statusByHabit.get(h.id) ?? null}
            />
          </li>
        ))}
      </ul>

      <p className="text-xs leading-relaxed text-muted">
        These are everyday behaviour targets written by the chapter, not medical instructions.
        Campus Wellness does not diagnose, treat or give medical advice.
      </p>
    </Container>
  );
}
