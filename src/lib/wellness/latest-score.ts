import "server-only";

import { createClient } from "@/lib/supabase/server";
import { CATEGORY_ORDER } from "./rules";
import type { StoredCategoryScore } from "@/components/wellness/score-display";

export type LatestScore = {
  id: string;
  assessmentId: string;
  overallScore: number;
  bmi: number | null;
  engineVersion: string;
  computedAt: string;
  categories: StoredCategoryScore[];
  priorities: StoredCategoryScore[];
};

/**
 * The student's most recent stored score, with its category rows.
 *
 * RLS restricts both tables to the owner, so no user filter is needed for
 * correctness — it is included anyway so the query reads honestly.
 */
export async function getLatestScore(userId: string): Promise<LatestScore | null> {
  const supabase = await createClient();

  const { data: score } = await supabase
    .from("wellness_scores")
    .select("id, assessment_id, overall_score, bmi, engine_version, computed_at")
    .eq("user_id", userId)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!score) return null;

  const { data: rows } = await supabase
    .from("wellness_category_scores")
    .select("category, raw_value, normalized_score, status, priority_rank")
    .eq("wellness_score_id", score.id);

  const categories = (rows ?? []).slice().sort(
    (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
  );

  const priorities = categories
    .filter((c) => c.priority_rank !== null)
    .sort((a, b) => (a.priority_rank ?? 0) - (b.priority_rank ?? 0));

  return {
    id: score.id,
    assessmentId: score.assessment_id,
    overallScore: score.overall_score,
    bmi: score.bmi,
    engineVersion: score.engine_version,
    computedAt: score.computed_at,
    categories,
    priorities,
  };
}
