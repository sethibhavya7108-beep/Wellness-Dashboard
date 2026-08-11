"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseAssessment } from "@/lib/wellness/assessment-schema";
import type { FieldName } from "@/lib/wellness/assessment-fields";
import type { AssessmentKind, AssessmentRow } from "@/lib/supabase/database.types";
import { scoreAssessment } from "@/lib/wellness/scoring";
import { MIN_PRIORITIES } from "@/lib/wellness/rules";

export type SaveResult =
  | { ok: true; savedAt: string }
  | { ok: false; error: string; fieldErrors?: Partial<Record<FieldName, string>> };

const KINDS: AssessmentKind[] = ["baseline", "endline", "checkpoint"];

function normalizeKind(kind: string): AssessmentKind {
  return KINDS.includes(kind as AssessmentKind) ? (kind as AssessmentKind) : "baseline";
}

/**
 * Find the student's open draft for this kind, creating one on first use.
 *
 * Only one row is ever in progress per kind: a stray second draft would let a
 * student complete two baselines, which the partial unique index would then
 * reject at the worst possible moment.
 */
async function openDraftId(kind: AssessmentKind, userId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("assessments")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", kind)
    .eq("status", "in_progress")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created } = await supabase
    .from("assessments")
    .insert({ user_id: userId, kind, status: "in_progress" })
    .select("id")
    .single();

  return created?.id ?? null;
}

/**
 * Autosave. Writes only the fields present in `values`, so moving through the
 * form never blanks an answer given in a section that is not on screen.
 */
export async function saveAssessmentDraft(
  kind: string,
  values: Record<string, string>,
): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again to keep your answers." };

  const parsed = parseAssessment(values);
  if (!parsed.ok) {
    return { ok: false, error: "Some answers need a look.", fieldErrors: parsed.fieldErrors };
  }

  const assessmentKind = normalizeKind(kind);
  const id = await openDraftId(assessmentKind, user.id);
  if (!id) return { ok: false, error: "We could not save just now. Your answers are still on screen." };

  const { error } = await supabase
    .from("assessments")
    .update(parsed.values)
    .eq("id", id)
    .eq("status", "in_progress");

  if (error) {
    return { ok: false, error: "We could not save just now. Your answers are still on screen." };
  }

  return { ok: true, savedAt: new Date().toISOString() };
}

/**
 * Finish the check.
 *
 * Completion is refused when too few categories were answered to rank anything:
 * `selectPriorities` needs at least MIN_PRIORITIES to produce a roadmap worth
 * showing, and a summary built from one answer would be noise dressed as insight.
 */
export async function completeAssessment(
  kind: string,
  values: Record<string, string>,
): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again to keep your answers." };

  const parsed = parseAssessment(values);
  if (!parsed.ok) {
    return { ok: false, error: "Some answers need a look.", fieldErrors: parsed.fieldErrors };
  }

  const assessmentKind = normalizeKind(kind);
  const id = await openDraftId(assessmentKind, user.id);
  if (!id) return { ok: false, error: "We could not finish just now. Please try again." };

  const { data: saved, error: saveError } = await supabase
    .from("assessments")
    .update(parsed.values)
    .eq("id", id)
    .eq("status", "in_progress")
    .select("*")
    .single();

  if (saveError || !saved) {
    return { ok: false, error: "We could not finish just now. Please try again." };
  }

  const result = scoreAssessment(saved as AssessmentRow);
  if (result.categories.length < MIN_PRIORITIES) {
    return {
      ok: false,
      error: `Answer at least ${MIN_PRIORITIES} of the seven sections and we can build you something useful.`,
    };
  }

  const { error: completeError } = await supabase
    .from("assessments")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "in_progress");

  if (completeError) {
    return {
      ok: false,
      error:
        "It looks like this check was already submitted. Refresh the page to see your summary.",
    };
  }

  await supabase.from("analytics_events").insert({
    user_id: user.id,
    name: "assessment_completed",
    properties: { kind: assessmentKind, answered: result.categories.length },
  });

  revalidatePath("/dashboard");
  revalidatePath("/assessment");
  redirect("/dashboard");
}
