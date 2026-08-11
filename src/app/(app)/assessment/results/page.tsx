import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/layout";
import {
  BmiCard,
  CategoryBreakdown,
  PriorityList,
  ScoreOverview,
} from "@/components/wellness/score-display";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getLatestScore } from "@/lib/wellness/latest-score";
import { describeBmi } from "@/lib/wellness/scoring";
import { CATEGORY_ORDER, CATEGORY_RULES } from "@/lib/wellness/rules";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Your results" };

export default async function ResultsPage() {
  const ctx = await requireOnboardedUser("/assessment/results");
  const score = await getLatestScore(ctx.userId);

  if (!score) redirect("/assessment");

  const bmi = score.bmi === null ? null : describeBmi(score.bmi);
  const missing = CATEGORY_ORDER.filter(
    (c) => !score.categories.some((s) => s.category === c),
  );

  return (
    <Container width="wide" className="space-y-8 py-10">
      <header className="space-y-2">
        <p className="eyebrow">Baseline results</p>
        <h1 className="text-3xl leading-tight sm:text-4xl">Here is where you are starting</h1>
        <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-muted">
          Scored on {formatDate(score.computedAt)} using rules version {score.engineVersion}. This
          summary is stored as it was calculated, so it stays comparable with the check you take at
          the end of your cycle.
        </p>
      </header>

      <ScoreOverview
        score={score.overallScore}
        answered={score.categories.length}
        total={CATEGORY_ORDER.length}
      />

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-4">
          <h2 className="text-lg leading-snug">Every area</h2>
          <CategoryBreakdown categories={score.categories} />

          {missing.length > 0 ? (
            <Card>
              <CardContent className="space-y-2 p-5">
                <p className="text-sm font-medium text-ink">
                  You skipped {missing.map((c) => CATEGORY_RULES[c].label).join(", ")}
                </p>
                <p className="text-sm leading-relaxed text-muted">
                  Left out of the score rather than counted as zero. You can fill these in at your
                  next check.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg leading-snug">Start with these</h2>
          <p className="text-sm leading-relaxed text-muted">
            Two or three areas, never more. A roadmap of small daily habits is built from exactly
            this list.
          </p>
          <PriorityList priorities={score.priorities} />

          {bmi ? <BmiCard value={bmi.value} label={bmi.label} /> : null}

          <div className="pt-2">
            <Link href="/roadmap" className={buttonClasses()}>
              See your roadmap
            </Link>
          </div>
        </section>
      </div>
    </Container>
  );
}
