import type { Metadata } from "next";
import Link from "next/link";
import { CalendarRange, Route } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/layout";
import { EmptyState } from "@/components/ui/feedback";
import { requireOnboardedUser } from "@/lib/auth/session";
import {
  getActiveRoadmap,
  type RoadmapHabitWithTemplate,
} from "@/lib/wellness/roadmap-service";
import { getLatestScore } from "@/lib/wellness/latest-score";
import { CATEGORY_RULES } from "@/lib/wellness/rules";
import { formatDate } from "@/lib/utils";
import { StartCycleButton } from "./start-cycle-button";

export const metadata: Metadata = { title: "Roadmap" };

const DIFFICULTY_LABEL: Record<string, string> = {
  basic: "Starting step",
  intermediate: "Building",
  advanced: "Stretch",
};

export default async function RoadmapPage() {
  const ctx = await requireOnboardedUser("/roadmap");
  const [active, score] = await Promise.all([
    getActiveRoadmap(ctx.userId),
    getLatestScore(ctx.userId),
  ]);

  if (!active) {
    return (
      <Container width="narrow" className="space-y-6 py-10">
        <header className="space-y-2">
          <p className="eyebrow">Roadmap</p>
          <h1 className="text-3xl leading-tight">Two or three habits, four weeks</h1>
        </header>

        {score ? (
          <Card>
            <CardContent className="space-y-4 p-7">
              <p className="text-sm leading-relaxed text-muted">
                Built from the areas your check flagged:{" "}
                {score.priorities.map((p) => CATEGORY_RULES[p.category].label).join(", ")}. One
                small habit each, starting at the easiest level. Nothing here is a medical
                instruction — they are everyday behaviour targets written by the chapter.
              </p>
              <StartCycleButton />
            </CardContent>
          </Card>
        ) : (
          <EmptyState
            icon={Route}
            title="Complete your baseline check first"
            description="The roadmap is built from what the check flags, so there is nothing to plan from yet."
            action={
              <Link href="/assessment" className={buttonClasses()}>
                Start the check
              </Link>
            }
          />
        )}
      </Container>
    );
  }

  const { roadmap, habits } = active;
  const daily = habits.filter((h) => h.habit_templates?.frequency !== "weekly");
  const weekly = habits.filter((h) => h.habit_templates?.frequency === "weekly");

  return (
    <Container width="wide" className="space-y-8 py-10">
      <header className="space-y-2">
        <p className="eyebrow">Roadmap</p>
        <h1 className="text-3xl leading-tight sm:text-4xl">Your current cycle</h1>
        <p className="flex items-center gap-2 text-sm text-muted">
          <CalendarRange className="size-4" aria-hidden />
          {formatDate(roadmap.cycle_start)} — {formatDate(roadmap.cycle_end)}
        </p>
      </header>

      {/* Daily and weekly habits are shown apart because they are asked of you
          differently: one is a thing you do today, the other a target you hit by
          Sunday. Mixing them in one list makes a weekly habit look overdue every
          day it has not been logged. */}
      {daily.length > 0 ? (
        <HabitGroup
          title="Every day"
          blurb="Log these as you go. Missing one day is not a broken cycle."
          habits={daily}
        />
      ) : null}

      {weekly.length > 0 ? (
        <HabitGroup
          title="Across the week"
          blurb="Hit the target by the end of the week — the day you do it does not matter."
          habits={weekly}
        />
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link href="/habits" className={buttonClasses()}>
          Log today
        </Link>
        <Link href="/progress" className={buttonClasses({ variant: "outline" })}>
          See your progress
        </Link>
      </div>
    </Container>
  );
}

function HabitGroup({
  title,
  blurb,
  habits,
}: {
  title: string;
  blurb: string;
  habits: RoadmapHabitWithTemplate[];
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg leading-snug">{title}</h2>
        <p className="text-sm text-muted">{blurb}</p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {habits.map((h) => (
          <li key={h.id}>
            <Card className="h-full">
              <CardContent className="flex h-full flex-col gap-3 p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="accent">{CATEGORY_RULES[h.category].label}</Badge>
                  <Badge tone="neutral">{DIFFICULTY_LABEL[h.difficulty] ?? h.difficulty}</Badge>
                </div>
                <p className="font-medium text-ink">{h.habit_templates?.title ?? "Habit"}</p>
                <p className="flex-1 text-sm leading-relaxed text-muted">
                  {h.habit_templates?.description}
                </p>
                <p className="text-xs text-muted">{h.points} points each time you log it</p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
