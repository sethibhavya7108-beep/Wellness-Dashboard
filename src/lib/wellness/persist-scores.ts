import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssessmentRow, Database } from "@/lib/supabase/database.types";
import { scoreAssessment, type WellnessResult } from "./scoring";

/**
 * Store the result of scoring an assessment.
 *
 * Scores are written rather than recomputed on read. The rules file will change
 * as thresholds are reviewed, and a student's summary from March must still say
 * in September what it said in March — so every row carries the `engine_version`
 * that produced it and is never recalculated.
 *
 * Both writes are `on conflict do nothing`: the unique keys make a second
 * attempt a no-op rather than a duplicate, and neither table grants UPDATE to
 * students, so a real upsert would be rejected by RLS.
 */
export async function persistScores(
  supabase: SupabaseClient<Database>,
  assessment: AssessmentRow,
): Promise<WellnessResult | null> {
  const result = scoreAssessment(assessment);

  const { data: score, error } = await supabase
    .from("wellness_scores")
    .upsert(
      {
        assessment_id: assessment.id,
        user_id: assessment.user_id,
        overall_score: result.overallScore,
        bmi: result.bmi?.value ?? null,
        engine_version: result.engineVersion,
      },
      { onConflict: "assessment_id", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();

  // A null row means the score already existed, which is a success, not a fault.
  if (error) return null;

  const scoreId =
    score?.id ??
    (
      await supabase
        .from("wellness_scores")
        .select("id")
        .eq("assessment_id", assessment.id)
        .maybeSingle()
    ).data?.id;

  if (!scoreId) return null;

  const priorityRank = new Map(result.priorities.map((p, i) => [p.category, i + 1]));

  await supabase.from("wellness_category_scores").upsert(
    result.categories.map((c) => ({
      wellness_score_id: scoreId,
      category: c.category,
      raw_value: c.rawValue,
      normalized_score: c.normalizedScore,
      status: c.status,
      priority_rank: priorityRank.get(c.category) ?? null,
    })),
    { onConflict: "wellness_score_id,category", ignoreDuplicates: true },
  );

  return result;
}
