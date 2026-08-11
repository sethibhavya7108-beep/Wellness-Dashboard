import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressBar, ProgressRing } from "@/components/ui/progress";
import { CATEGORY_RULES, OVERALL_BANDS } from "@/lib/wellness/rules";
import type { ScoreStatus, WellnessCategory } from "@/lib/supabase/database.types";

/**
 * Rendering for a stored wellness score.
 *
 * Reads labels and copy from `rules.ts` rather than repeating them, so a
 * reviewed threshold change reaches the screen without a component edit. No
 * number in this file is a health threshold.
 */

export type StoredCategoryScore = {
  category: WellnessCategory;
  raw_value: number | null;
  normalized_score: number;
  status: ScoreStatus;
  priority_rank: number | null;
};

const STATUS_LABEL: Record<ScoreStatus, string> = {
  good: "On track",
  fair: "Fine for now",
  attention: "Worth a look",
  priority: "Start here",
};

export function overallLabel(score: number): string {
  return OVERALL_BANDS.find((b) => score >= b.min && score < b.max)?.label ?? "A few things to fix";
}

export function ScoreOverview({
  score,
  answered,
  total,
}: {
  score: number;
  answered: number;
  total: number;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-6 p-8 sm:flex-row sm:items-center sm:gap-8">
        <ProgressRing value={score} size={132} caption="out of 100" />
        <div className="space-y-2 text-center sm:text-left">
          <p className="eyebrow">Your wellness score</p>
          <h2 className="text-2xl leading-snug sm:text-3xl">{overallLabel(score)}</h2>
          <p className="max-w-lg text-sm leading-relaxed text-muted">
            A weighted average of the {answered} of {total} areas you answered. Skipped areas are
            left out rather than counted against you. This is a summary of everyday habits — it is
            not a medical assessment and it does not diagnose anything.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function CategoryBreakdown({ categories }: { categories: StoredCategoryScore[] }) {
  return (
    <ul className="space-y-3">
      {categories.map((c) => {
        const rule = CATEGORY_RULES[c.category];
        return (
          <li key={c.category}>
            <Card>
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-ink">{rule.label}</span>
                    <Badge tone={c.status}>{STATUS_LABEL[c.status]}</Badge>
                  </div>
                  <span className="text-sm tabular-nums text-muted">
                    {c.raw_value ?? "—"} {rule.unit}
                  </span>
                </div>
                <ProgressBar
                  value={c.normalized_score}
                  label={`${rule.label} score`}
                  tone={c.status === "good" ? "forest" : "accent"}
                />
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

export function PriorityList({ priorities }: { priorities: StoredCategoryScore[] }) {
  return (
    <ol className="space-y-3">
      {priorities.map((p, i) => {
        const rule = CATEGORY_RULES[p.category];
        return (
          <li key={p.category}>
            <Card>
              <CardContent className="flex gap-4 p-5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-accent-line bg-accent-soft text-xs font-medium text-accent">
                  {i + 1}
                </span>
                <div className="space-y-1">
                  <p className="font-medium text-ink">{rule.label}</p>
                  <p className="text-sm leading-relaxed text-muted">{rule.flagCopy}</p>
                </div>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * BMI, shown as context only.
 *
 * Carries its review status on screen because the bands are the general WHO
 * adult cut-offs and have not been reviewed for this population. It is excluded
 * from the score, from priorities, and from every points and badge rule.
 */
export function BmiCard({ value, label }: { value: number; label: string }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-6">
        <div className="flex items-baseline gap-3">
          <span className="text-2xl tabular-nums text-ink">{value}</span>
          <span className="text-sm text-muted">BMI</span>
        </div>
        <p className="text-sm text-ink-soft">{label}</p>
        <p className="text-xs leading-relaxed text-muted">
          Shown as context only. BMI does not affect your score, your roadmap, your points or any
          leaderboard. These are general adult cut-offs awaiting review by a qualified reviewer, so
          treat the wording as a rough band rather than a finding about you.
        </p>
      </CardContent>
    </Card>
  );
}
