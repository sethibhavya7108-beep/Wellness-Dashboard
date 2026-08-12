import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/layout";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { answeredSectionCount, draftFromRow } from "@/lib/wellness/assessment-fields";
import { AssessmentForm } from "../assessment-form";

export const metadata: Metadata = { title: "Update your status" };

/**
 * A repeatable check.
 *
 * Stored as kind 'checkpoint', which can be completed any number of times. The
 * baseline is deliberately left alone: it is one half of the before-and-after
 * the chapter reports on, and overwriting it would quietly rewrite the result.
 */
export default async function UpdateAssessmentPage() {
  const ctx = await requireOnboardedUser("/assessment/update");
  const supabase = await createClient();

  const { data: baseline } = await supabase
    .from("assessments")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("kind", "baseline")
    .eq("status", "completed")
    .maybeSingle();

  // Without a baseline there is nothing to update from — send them there first.
  if (!baseline) redirect("/assessment");

  const { data: rows } = await supabase
    .from("assessments")
    .select("*")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false });

  const draft = rows?.find((r) => r.kind === "checkpoint" && r.status === "in_progress");
  // Pre-fill from the most recent completed check so a student edits what they
  // said last time rather than starting from an empty form.
  const lastCompleted = rows?.find((r) => r.status === "completed");

  const values = draftFromRow(draft ?? lastCompleted);

  return (
    <Container width="narrow" className="space-y-8 py-10">
      <header className="space-y-2">
        <p className="eyebrow">Update</p>
        <h1 className="text-3xl leading-tight">Where are you now?</h1>
        <p className="text-[0.9375rem] leading-relaxed text-muted">
          Your last answers are filled in — change whatever has moved. Your score and roadmap
          priorities update from this, and your original baseline stays as it was.
        </p>
      </header>

      <AssessmentForm
        kind="checkpoint"
        initialValues={values}
        startStep={draft ? answeredSectionCount(draftFromRow(draft)) : 0}
      />
    </Container>
  );
}
